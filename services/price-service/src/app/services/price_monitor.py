# =========================
# src/app/services/price_monitor.py
# =========================
import asyncio
import logging
from typing import Dict, List
from datetime import datetime, timedelta
from app.services.price_service import price_service
from app.services.email_service import email_service
from app.config import SYMBOL_WHITELIST

logger = logging.getLogger(__name__)


class PriceMonitor:
    """
    Service theo dõi giá realtime và gửi email thông báo khi giá đạt ngưỡng
    Code cứng các thông tin theo dõi
    """
    
    def __init__(self):
        # Code cứng các ngưỡng giá cần theo dõi
        self.price_alerts = {
            # Format: "SYMBOL": {
            #     "above": [{"price": target_price, "email": "user@email.com", "name": "User Name"}],
            #     "below": [{"price": target_price, "email": "user@email.com", "name": "User Name"}]
            # }
            "BTCUSDT": {
                "above": [
                    {"price": 112112.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"},
                    {"price": 112135.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"},
                    {"price": 112100.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"},

                ],
                "below": [
                    {"price": 112119.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"}
                ]
            },
            "ETHUSDT": {
                "above": [
                    {"price": 4000.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"}
                ],
                "below": [
                    {"price": 3000.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"}
                ]
            },
            "SOLUSDT": {
                "above": [
                    {"price": 200.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"}
                ],
                "below": [
                    {"price": 120.0, "email": "kindinh903@gmail.com", "name": "Kin Dinh"}
                ]
            }
        }
        
        # Lưu trữ giá cuối cùng để so sánh
        self.last_prices: Dict[str, float] = {}
        
        # Lưu trữ thời gian gửi email cuối cùng để tránh spam
        self.last_email_sent: Dict[str, datetime] = {}
        
        # Thời gian cooldown giữa các email (phút)
        self.email_cooldown_minutes = 15
        
        # Interval kiểm tra giá (giây)
        self.check_interval = 10
        
        # Flag để dừng monitoring
        self.is_running = False
        
    async def start_monitoring(self):
        """Bắt đầu theo dõi giá"""
        logger.info("Starting price monitoring service...")
        self.is_running = True
        
        # Test gửi email để đảm bảo cấu hình đúng
        await self._test_email_config()
        
        # Khởi tạo giá ban đầu
        await self._initialize_prices()
        
        # Bắt đầu loop theo dõi
        while self.is_running:
            try:
                await self._check_all_prices()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                await asyncio.sleep(5)  # Wait before retry
                
    async def stop_monitoring(self):
        """Dừng theo dõi giá"""
        logger.info("Stopping price monitoring service...")
        self.is_running = False
        
    async def _test_email_config(self):
        """Test cấu hình email"""
        try:
            logger.info("Testing email configuration...")
            success = await email_service.send_test_email("kindinh903@gmail.com")
            if success:
                logger.info("Email configuration test successful")
            else:
                logger.warning("Email configuration test failed")
        except Exception as e:
            logger.error(f"Email test error: {str(e)}")
            
    async def _initialize_prices(self):
        """Khởi tạo giá ban đầu cho tất cả symbols"""
        logger.info("Initializing current prices...")
        
        for symbol in self.price_alerts.keys():
            try:
                price_data = await price_service.get_realtime_price(symbol)
                if price_data and 'price' in price_data:
                    current_price = float(price_data['price'])
                    self.last_prices[symbol] = current_price
                    logger.info(f"{symbol}: ${current_price:,.4f}")
                else:
                    logger.warning(f"Could not get initial price for {symbol}")
            except Exception as e:
                logger.error(f"Error getting initial price for {symbol}: {str(e)}")
                
    async def _check_all_prices(self):
        """Kiểm tra giá của tất cả symbols"""
        for symbol in self.price_alerts.keys():
            try:
                await self._check_symbol_price(symbol)
            except Exception as e:
                logger.error(f"Error checking price for {symbol}: {str(e)}")
                
    async def _check_symbol_price(self, symbol: str):
        """Kiểm tra giá của một symbol cụ thể"""
        try:
            # Lấy giá hiện tại
            price_data = await price_service.get_realtime_price(symbol)
            if not price_data or 'price' not in price_data:
                return
                
            current_price = float(price_data['price'])
            last_price = self.last_prices.get(symbol, 0)
            
            # Log giá hiện tại (mỗi 30 giây log 1 lần để không spam)
            now = datetime.now()
            log_key = f"log_{symbol}"
            if (log_key not in self.last_email_sent or 
                now - self.last_email_sent.get(log_key, datetime.min) > timedelta(seconds=30)):
                logger.info(f"{symbol}: ${current_price:,.4f} (prev: ${last_price:,.4f})")
                self.last_email_sent[log_key] = now
            
            # Kiểm tra alerts nếu có giá trước đó
            if last_price > 0:
                await self._check_price_alerts(symbol, current_price, last_price)
            
            # Cập nhật giá cuối cùng
            self.last_prices[symbol] = current_price
            
        except Exception as e:
            logger.error(f"Error in _check_symbol_price for {symbol}: {str(e)}")
            
    async def _check_price_alerts(self, symbol: str, current_price: float, last_price: float):
        """Kiểm tra và gửi alerts cho một symbol"""
        alerts = self.price_alerts.get(symbol, {})
        
        # Kiểm tra alerts "above" (giá vượt lên trên)
        for alert in alerts.get("above", []):
            target_price = alert["price"]
            if last_price <= target_price < current_price:
                await self._send_price_alert(
                    symbol=symbol,
                    current_price=current_price,
                    target_price=target_price,
                    alert_type="above",
                    email=alert["email"],
                    name=alert["name"]
                )
                
        # Kiểm tra alerts "below" (giá giảm xuống dưới)
        for alert in alerts.get("below", []):
            target_price = alert["price"]
            if last_price >= target_price > current_price:
                await self._send_price_alert(
                    symbol=symbol,
                    current_price=current_price,
                    target_price=target_price,
                    alert_type="below",
                    email=alert["email"],
                    name=alert["name"]
                )
                
    async def _send_price_alert(self, symbol: str, current_price: float, target_price: float, 
                               alert_type: str, email: str, name: str):
        """Gửi email thông báo giá"""
        try:
            # Kiểm tra cooldown để tránh spam
            alert_key = f"{symbol}_{target_price}_{alert_type}_{email}"
            now = datetime.now()
            
            if (alert_key in self.last_email_sent and 
                now - self.last_email_sent[alert_key] < timedelta(minutes=self.email_cooldown_minutes)):
                logger.info(f"Skipping alert for {symbol} due to cooldown")
                return
                
            # Gửi email
            logger.info(f"ALERT TRIGGERED: {symbol} {alert_type} ${target_price:,.4f} (current: ${current_price:,.4f})")
            
            success = await email_service.send_price_alert_email(
                to_email=email,
                symbol=symbol,
                current_price=current_price,
                target_price=target_price,
                alert_type=alert_type,
                user_name=name
            )
            
            if success:
                logger.info(f"Alert email sent successfully to {email}")
                self.last_email_sent[alert_key] = now
            else:
                logger.error(f"Failed to send alert email to {email}")
                
        except Exception as e:
            logger.error(f"Error sending price alert: {str(e)}")
            
    def add_alert(self, symbol: str, price: float, alert_type: str, email: str, name: str):
        """Thêm alert mới (runtime)"""
        if symbol not in self.price_alerts:
            self.price_alerts[symbol] = {"above": [], "below": []}
            
        alert = {"price": price, "email": email, "name": name}
        self.price_alerts[symbol][alert_type].append(alert)
        
        logger.info(f"Added alert: {symbol} {alert_type} ${price:,.4f} for {email}")
        
    def remove_alert(self, symbol: str, price: float, alert_type: str, email: str):
        """Xóa alert (runtime)"""
        if symbol in self.price_alerts and alert_type in self.price_alerts[symbol]:
            alerts = self.price_alerts[symbol][alert_type]
            self.price_alerts[symbol][alert_type] = [
                a for a in alerts 
                if not (a["price"] == price and a["email"] == email)
            ]
            logger.info(f"Removed alert: {symbol} {alert_type} ${price:,.4f} for {email}")
            
    def get_current_alerts(self) -> Dict:
        """Lấy danh sách alerts hiện tại"""
        return self.price_alerts.copy()
        
    def get_current_prices(self) -> Dict[str, float]:
        """Lấy giá hiện tại của tất cả symbols"""
        return self.last_prices.copy()


# Global instance
price_monitor = PriceMonitor()
