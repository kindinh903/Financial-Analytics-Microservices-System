# =========================
# src/app/services/price_service.py
# =========================
import asyncio
import json
import logging
from typing import Dict, List, Set
import websockets
import aiohttp
from datetime import datetime, timedelta
import redis.asyncio as redis
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

logger = logging.getLogger(__name__)

class PriceService:
    def __init__(self, redis_client: redis.Redis, influx_client: InfluxDBClient):
        self.redis_client = redis_client
        self.influx_client = influx_client
        self.write_api = influx_client.write_api(write_options=SYNCHRONOUS)
        
        # WebSocket connections for different trading pairs
        self.binance_ws_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.client_subscriptions: Dict[str, Set[str]] = {}  # client_id -> set of trading_pairs
        self.trading_pair_clients: Dict[str, Set[str]] = {}  # trading_pair -> set of client_ids
        
        # Binance WebSocket URLs
        self.binance_ws_url = "wss://stream.binance.com:9443/ws/"
        self.binance_rest_url = "https://api.binance.com/api/v3"
        
        # Supported trading pairs
        self.supported_pairs = [
            "BTCUSDT", "ETHUSDT", "ADAUSDT", "BNBUSDT", "XRPUSDT",
            "SOLUSDT", "DOTUSDT", "MATICUSDT", "LINKUSDT", "UNIUSDT"
        ]
        
        # Price cache
        self.price_cache: Dict[str, Dict] = {}
        
    async def start_binance_streams(self):
        """Start WebSocket connections to Binance for all supported pairs"""
        for pair in self.supported_pairs:
            await self.start_pair_stream(pair)
    
    async def start_pair_stream(self, trading_pair: str):
        """Start WebSocket stream for a specific trading pair"""
        try:
            # Create stream URL for the trading pair
            stream_name = f"{trading_pair.lower()}@kline_1m"
            ws_url = f"{self.binance_ws_url}{stream_name}"
            
            # Connect to Binance WebSocket
            async with websockets.connect(ws_url) as websocket:
                logger.info(f"Connected to Binance stream for {trading_pair}")
                
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        await self.process_binance_data(trading_pair, data)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse message for {trading_pair}")
                    except Exception as e:
                        logger.error(f"Error processing {trading_pair} data: {e}")
                        
        except Exception as e:
            logger.error(f"Failed to start stream for {trading_pair}: {e}")
            # Retry after delay
            await asyncio.sleep(5)
            await self.start_pair_stream(trading_pair)
    
    async def process_binance_data(self, trading_pair: str, data: Dict):
        """Process incoming Binance data and broadcast to subscribed clients"""
        try:
            if 'k' in data:  # Kline data
                kline = data['k']
                
                # Extract price information
                price_data = {
                    'symbol': trading_pair,
                    'timestamp': kline['t'],
                    'open': float(kline['o']),
                    'high': float(kline['h']),
                    'low': float(kline['l']),
                    'close': float(kline['c']),
                    'volume': float(kline['v']),
                    'close_time': kline['T'],
                    'quote_volume': float(kline['q']),
                    'trades': kline['n'],
                    'taker_buy_base': float(kline['V']),
                    'taker_buy_quote': float(kline['Q'])
                }
                
                # Update price cache
                self.price_cache[trading_pair] = price_data
                
                # Store in InfluxDB
                await self.store_price_data(price_data)
                
                # Cache in Redis for quick access
                await self.redis_client.setex(
                    f"price:{trading_pair}",
                    300,  # 5 minutes TTL
                    json.dumps(price_data)
                )
                
                # Broadcast to subscribed clients
                await self.broadcast_price_update(trading_pair, price_data)
                
        except Exception as e:
            logger.error(f"Error processing {trading_pair} data: {e}")
    
    async def store_price_data(self, price_data: Dict):
        """Store price data in InfluxDB"""
        try:
            point = Point("price_data") \
                .tag("symbol", price_data['symbol']) \
                .field("open", price_data['open']) \
                .field("high", price_data['high']) \
                .field("low", price_data['low']) \
                .field("close", price_data['close']) \
                .field("volume", price_data['volume']) \
                .field("quote_volume", price_data['quote_volume']) \
                .field("trades", price_data['trades']) \
                .time(price_data['timestamp'], write_precision='ms')
            
            self.write_api.write(bucket="PriceServiceDB", record=point)
            
        except Exception as e:
            logger.error(f"Failed to store price data in InfluxDB: {e}")
    
    async def broadcast_price_update(self, trading_pair: str, price_data: Dict):
        """Broadcast price update to all subscribed clients"""
        if trading_pair in self.trading_pair_clients:
            message = {
                'type': 'price_update',
                'symbol': trading_pair,
                'data': price_data,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to all subscribed clients
            for client_id in self.trading_pair_clients[trading_pair]:
                await self.send_to_client(client_id, message)
    
    async def send_to_client(self, client_id: str, message: Dict):
        """Send message to a specific client"""
        try:
            # This will be implemented in the WebSocket manager
            # For now, we'll use Redis pub/sub as a fallback
            await self.redis_client.publish(
                f"client:{client_id}",
                json.dumps(message)
            )
        except Exception as e:
            logger.error(f"Failed to send message to client {client_id}: {e}")
    
    async def get_historical_data(self, trading_pair: str, interval: str = '1m', limit: int = 1000):
        """Get historical kline data from Binance"""
        try:
            url = f"{self.binance_rest_url}/klines"
            params = {
                'symbol': trading_pair,
                'interval': interval,
                'limit': limit
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Transform data to match our format
                        historical_data = []
                        for kline in data:
                            historical_data.append({
                                'timestamp': kline[0],
                                'open': float(kline[1]),
                                'high': float(kline[2]),
                                'low': float(kline[3]),
                                'close': float(kline[4]),
                                'volume': float(kline[5]),
                                'close_time': kline[6],
                                'quote_volume': float(kline[7]),
                                'trades': int(kline[8]),
                                'taker_buy_base': float(kline[9]),
                                'taker_buy_quote': float(kline[10])
                            })
                        
                        return historical_data
                else:
                        logger.error(f"Failed to get historical data: {response.status}")
                        return []
                        
        except Exception as e:
            logger.error(f"Error getting historical data for {trading_pair}: {e}")
            return []
    
    async def subscribe_client(self, client_id: str, trading_pairs: List[str]):
        """Subscribe a client to specific trading pairs"""
        try:
            # Initialize client subscriptions if not exists
            if client_id not in self.client_subscriptions:
                self.client_subscriptions[client_id] = set()
            
            # Add trading pairs to client subscriptions
            for pair in trading_pairs:
                if pair in self.supported_pairs:
                    self.client_subscriptions[client_id].add(pair)
                    
                    # Initialize trading pair clients if not exists
                    if pair not in self.trading_pair_clients:
                        self.trading_pair_clients[pair] = set()
                    
                    # Add client to trading pair subscribers
                    self.trading_pair_clients[pair].add(client_id)
                    
                    # Send current price if available
                    if pair in self.price_cache:
                        await self.send_to_client(client_id, {
                            'type': 'price_update',
                            'symbol': pair,
                            'data': self.price_cache[pair],
                            'timestamp': datetime.now().isoformat()
                        })
            
            logger.info(f"Client {client_id} subscribed to {trading_pairs}")
            
        except Exception as e:
            logger.error(f"Error subscribing client {client_id}: {e}")
    
    async def unsubscribe_client(self, client_id: str, trading_pairs: List[str] = None):
        """Unsubscribe a client from trading pairs"""
        try:
            if trading_pairs is None:
                # Unsubscribe from all pairs
                trading_pairs = list(self.client_subscriptions.get(client_id, set()))
            
            for pair in trading_pairs:
                if pair in self.trading_pair_clients:
                    self.trading_pair_clients[pair].discard(client_id)
                
                if client_id in self.client_subscriptions:
                    self.client_subscriptions[client_id].discard(pair)
            
            logger.info(f"Client {client_id} unsubscribed from {trading_pairs}")
            
        except Exception as e:
            logger.error(f"Error unsubscribing client {client_id}: {e}")
    
    async def get_supported_pairs(self):
        """Get list of supported trading pairs"""
        return self.supported_pairs
    
    async def get_current_price(self, trading_pair: str):
        """Get current price for a trading pair"""
        try:
            # Try Redis cache first
            cached_price = await self.redis_client.get(f"price:{trading_pair}")
            if cached_price:
                return json.loads(cached_price)
            
            # Fallback to price cache
            if trading_pair in self.price_cache:
                return self.price_cache[trading_pair]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting current price for {trading_pair}: {e}")
            return None
