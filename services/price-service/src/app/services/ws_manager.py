import asyncio
import json
import logging
import uuid
from typing import Dict, Set, Optional
import websockets
from websockets.server import WebSocketServerProtocol
from datetime import datetime
from app.config import settings, SYMBOL_WHITELIST
from app.storage.redis_client import redis_client
from app.storage.influx_client import influx_writer
from app.services.broadcast import price_stream, candle_stream


logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self, price_service):
        self.price_service = price_service
        self.active_connections: Dict[str, WebSocketServerProtocol] = {}
        self.client_subscriptions: Dict[str, Set[str]] = {}  # client_id -> set of trading_pairs
        self.trading_pair_clients: Dict[str, Set[str]] = {}  # trading_pair -> set of client_ids
        
    async def register_client(self, websocket: WebSocketServerProtocol) -> str:
        """Register a new client connection"""
        client_id = str(uuid.uuid4())
        self.active_connections[client_id] = websocket
        self.client_subscriptions[client_id] = set()
        
        logger.info(f"New client registered: {client_id}")
        
        # Send welcome message
        await self.send_to_client(client_id, {
            'type': 'connection_established',
            'client_id': client_id,
            'timestamp': datetime.now().isoformat(),
            'supported_pairs': await self.price_service.get_supported_pairs()
        })
        
        return client_id
    
    async def unregister_client(self, client_id: str):
        """Unregister a client connection"""
        try:
            # Unsubscribe from all trading pairs
            if client_id in self.client_subscriptions:
                trading_pairs = list(self.client_subscriptions[client_id])
                await self.price_service.unsubscribe_client(client_id, trading_pairs)
            
            # Remove from active connections
            if client_id in self.active_connections:
                del self.active_connections[client_id]
            
            # Clean up subscriptions
            if client_id in self.client_subscriptions:
                del self.client_subscriptions[client_id]
            
            logger.info(f"Client unregistered: {client_id}")
            
        except Exception as e:
            logger.error(f"Error unregistering client {client_id}: {e}")
    
    async def handle_message(self, client_id: str, message: Dict):
        """Handle incoming WebSocket messages from clients"""
        try:
            msg_type = message.get('type')
            
            if msg_type == 'subscribe':
                await self.handle_subscribe(client_id, message)
            elif msg_type == 'unsubscribe':
                await self.handle_unsubscribe(client_id, message)
            elif msg_type == 'get_historical':
                await self.handle_get_historical(client_id, message)
            elif msg_type == 'get_current_price':
                await self.handle_get_current_price(client_id, message)
            elif msg_type == 'ping':
                await self.send_to_client(client_id, {'type': 'pong', 'timestamp': datetime.now().isoformat()})
            else:
                await self.send_to_client(client_id, {
                    'type': 'error',
                    'message': f'Unknown message type: {msg_type}',
                    'timestamp': datetime.now().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error handling message from client {client_id}: {e}")
            await self.send_to_client(client_id, {
                'type': 'error',
                'message': 'Internal server error',
                'timestamp': datetime.now().isoformat()
            })
    
    async def handle_subscribe(self, client_id: str, message: Dict):
        """Handle client subscription to trading pairs"""
        try:
            trading_pairs = message.get('trading_pairs', [])
            if not trading_pairs:
                await self.send_to_client(client_id, {
                    'type': 'error',
                    'message': 'No trading pairs specified',
                    'timestamp': datetime.now().isoformat()
                })
                return
            
            # Subscribe client to trading pairs
            await self.price_service.subscribe_client(client_id, trading_pairs)
            
            # Update local subscription tracking
            for pair in trading_pairs:
                if pair not in self.trading_pair_clients:
                    self.trading_pair_clients[pair] = set()
                self.trading_pair_clients[pair].add(client_id)
                
                if client_id not in self.client_subscriptions:
                    self.client_subscriptions[client_id] = set()
                self.client_subscriptions[client_id].add(pair)
            
            # Send confirmation
            await self.send_to_client(client_id, {
                'type': 'subscription_confirmed',
                'trading_pairs': trading_pairs,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Client {client_id} subscribed to {trading_pairs}")
            
        except Exception as e:
            logger.error(f"Error handling subscribe for client {client_id}: {e}")
            await self.send_to_client(client_id, {
                'type': 'error',
                'message': 'Failed to subscribe',
                'timestamp': datetime.now().isoformat()
            })
    
    async def handle_unsubscribe(self, client_id: str, message: Dict):
        """Handle client unsubscription from trading pairs"""
        try:
            trading_pairs = message.get('trading_pairs', [])
            
            # Unsubscribe client from trading pairs
            await self.price_service.unsubscribe_client(client_id, trading_pairs)
            
            # Update local subscription tracking
            for pair in trading_pairs:
                if pair in self.trading_pair_clients:
                    self.trading_pair_clients[pair].discard(client_id)
                
                if client_id in self.client_subscriptions:
                    self.client_subscriptions[client_id].discard(pair)
            
            # Send confirmation
            await self.send_to_client(client_id, {
                'type': 'unsubscription_confirmed',
                'trading_pairs': trading_pairs,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Client {client_id} unsubscribed from {trading_pairs}")
            
        except Exception as e:
            logger.error(f"Error handling unsubscribe for client {client_id}: {e}")
            await self.send_to_client(client_id, {
                'type': 'error',
                'message': 'Failed to unsubscribe',
                'timestamp': datetime.now().isoformat()
            })
    
    async def handle_get_historical(self, client_id: str, message: Dict):
        """Handle historical data request"""
        try:
            trading_pair = message.get('trading_pair')
            interval = message.get('interval', '1m')
            limit = message.get('limit', 1000)
            
            if not trading_pair:
                await self.send_to_client(client_id, {
                    'type': 'error',
                    'message': 'Trading pair not specified',
                    'timestamp': datetime.now().isoformat()
                })
                return
            
            # Get historical data
            historical_data = await self.price_service.get_historical_data(trading_pair, interval, limit)
            
            # Send historical data
            await self.send_to_client(client_id, {
                'type': 'historical_data',
                'trading_pair': trading_pair,
                'interval': interval,
                'data': historical_data,
                'timestamp': datetime.now().isoformat()
            })
            
            logger.info(f"Sent {len(historical_data)} historical candles for {trading_pair} to client {client_id}")
            
        except Exception as e:
            logger.error(f"Error handling historical data request for client {client_id}: {e}")
            await self.send_to_client(client_id, {
                'type': 'error',
                'message': 'Failed to get historical data',
                'timestamp': datetime.now().isoformat()
            })
    
    async def handle_get_current_price(self, client_id: str, message: Dict):
        """Handle current price request"""
        try:
            trading_pair = message.get('trading_pair')
            
            if not trading_pair:
                await self.send_to_client(client_id, {
                    'type': 'error',
                    'message': 'Trading pair not specified',
                    'timestamp': datetime.now().isoformat()
                })
                return
            
            # Get current price
            current_price = await self.price_service.get_current_price(trading_pair)
            
            if current_price:
                await self.send_to_client(client_id, {
                    'type': 'current_price',
                    'trading_pair': trading_pair,
                    'data': current_price,
                    'timestamp': datetime.now().isoformat()
                })
            else:
                await self.send_to_client(client_id, {
                    'type': 'error',
                    'message': f'No price data available for {trading_pair}',
                    'timestamp': datetime.now().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Error handling current price request for client {client_id}: {e}")
            await self.send_to_client(client_id, {
                'type': 'error',
                'message': 'Failed to get current price',
                'timestamp': datetime.now().isoformat()
            })
    
    async def send_to_client(self, client_id: str, message: Dict):
        """Send message to a specific client"""
        try:
            if client_id in self.active_connections:
                websocket = self.active_connections[client_id]
                if websocket.open:
                    await websocket.send(json.dumps(message))
                else:
                    # WebSocket is closed, remove client
                    await self.unregister_client(client_id)
        except Exception as e:
            logger.error(f"Error sending message to client {client_id}: {e}")
            # Remove client if there's an error
            await self.unregister_client(client_id)
    
    async def broadcast_to_subscribers(self, trading_pair: str, message: Dict):
        """Broadcast message to all clients subscribed to a specific trading pair"""
        if trading_pair in self.trading_pair_clients:
            tasks = []
            for client_id in self.trading_pair_clients[trading_pair]:
                tasks.append(self.send_to_client(client_id, message))
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
    
    async def get_client_stats(self) -> Dict:
        """Get statistics about connected clients and subscriptions"""
        return {
            'total_clients': len(self.active_connections),
            'total_subscriptions': sum(len(subs) for subs in self.client_subscriptions.values()),
            'trading_pair_subscribers': {
                pair: len(clients) for pair, clients in self.trading_pair_clients.items()
            }
        }
    
    async def handle_websocket_connection(self, websocket: WebSocketServerProtocol, path: str):
        """Handle new WebSocket connection"""
        client_id = await self.register_client(websocket)
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(client_id, data)
                except json.JSONDecodeError:
                    await self.send_to_client(client_id, {
                        'type': 'error',
                        'message': 'Invalid JSON format',
                        'timestamp': datetime.now().isoformat()
                    })
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed for client {client_id}")
        except Exception as e:
            logger.error(f"Error in WebSocket connection for client {client_id}: {e}")
        finally:
            await self.unregister_client(client_id)
