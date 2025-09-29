# =========================
# src/app/services/email_service.py
# ========================
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_server = settings.EMAIL_SMTP_SERVER
        self.smtp_port = settings.EMAIL_SMTP_PORT
        self.username = settings.EMAIL_USERNAME
        self.password = settings.EMAIL_PASSWORD
        self.from_email = settings.EMAIL_FROM
        self.use_tls = settings.EMAIL_USE_TLS

    async def send_price_alert_email(
        self, 
        to_email: str, 
        symbol: str, 
        current_price: float, 
        target_price: float, 
        alert_type: str,
        user_name: Optional[str] = None
    ) -> bool:
        """
        Gửi email thông báo khi giá đạt ngưỡng
        
        Args:
            to_email: Email người nhận
            symbol: Cặp giao dịch (VD: BTCUSDT)
            current_price: Giá hiện tại
            target_price: Giá ngưỡng được thiết lập
            alert_type: Loại alert ('above' hoặc 'below')
            user_name: Tên người dùng
        """
        try:
            subject = f"🚨 Price Alert: {symbol} has reached your target!"
            
            # Tạo nội dung email
            body = self._create_alert_email_body(
                symbol, current_price, target_price, alert_type, user_name
            )
            
            # Gửi email
            success = await self._send_email(to_email, subject, body)
            
            if success:
                logger.info(f"Price alert email sent successfully to {to_email} for {symbol}")
            else:
                logger.error(f"Failed to send price alert email to {to_email} for {symbol}")
                
            return success
            
        except Exception as e:
            logger.error(f"Error sending price alert email: {str(e)}")
            return False

    def _create_alert_email_body(
        self, 
        symbol: str, 
        current_price: float, 
        target_price: float, 
        alert_type: str,
        user_name: Optional[str] = None
    ) -> str:
        """Tạo nội dung email thông báo"""
        
        greeting = f"Hi {user_name}," if user_name else "Hi,"
        
        direction = "above" if alert_type == "above" else "below"
        trend_emoji = "📈" if alert_type == "above" else "📉"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px; }}
                .header {{ text-align: center; color: #333; margin-bottom: 30px; }}
                .alert-box {{ background-color: #fff; border-left: 5px solid #ff6b35; padding: 20px; margin: 20px 0; border-radius: 5px; }}
                .price-info {{ background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 30px; }}
                .symbol {{ font-weight: bold; color: #ff6b35; font-size: 18px; }}
                .price {{ font-weight: bold; color: #2e7d32; font-size: 16px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{trend_emoji} Price Alert Triggered!</h1>
                </div>
                
                <div class="alert-box">
                    <p>{greeting}</p>
                    <p>Your price alert for <span class="symbol">{symbol}</span> has been triggered!</p>
                    
                    <div class="price-info">
                        <p><strong>Symbol:</strong> {symbol}</p>
                        <p><strong>Current Price:</strong> <span class="price">${current_price:,.4f}</span></p>
                        <p><strong>Target Price:</strong> <span class="price">${target_price:,.4f}</span></p>
                        <p><strong>Alert Type:</strong> Price went {direction} target</p>
                    </div>
                    
                    <p>The current price of <strong>{symbol}</strong> is now <strong>${current_price:,.4f}</strong>, 
                    which has moved {direction} your target price of <strong>${target_price:,.4f}</strong>.</p>
                    
                    <p>Please check your trading platform for the most up-to-date information and consider your investment decisions carefully.</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated message from Financial Analytics System</p>
                    <p>Please do not reply to this email</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_body

    async def send_test_email(self, to_email: str) -> bool:
        """Gửi email test để kiểm tra cấu hình"""
        try:
            subject = "Test Email from Price Service"
            body = """
            <html>
            <body>
                <h2>Test Email</h2>
                <p>This is a test email to verify that the email configuration is working correctly.</p>
                <p>If you receive this email, the price alert system is ready to notify you about price changes.</p>
            </body>
            </html>
            """
            
            success = await self._send_email(to_email, subject, body)
            logger.info(f"Test email sent to {to_email}: {'Success' if success else 'Failed'}")
            return success
            
        except Exception as e:
            logger.error(f"Error sending test email: {str(e)}")
            return False

    async def _send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """
        Hàm chung để gửi email
        """
        try:
            logger.info(f"Attempting to send email to {to_email}")
            logger.info(f"SMTP Server: {self.smtp_server}:{self.smtp_port}")
            logger.info(f"Username: {self.username}")
            logger.info(f"Password: {self.password}")  # For debugging - remove in production!
            
            # Tạo message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.from_email
            message["To"] = to_email
            
            # Thêm HTML body
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)
            
            # Method 1: Try with STARTTLS on port 587
            try:
                logger.info("Trying STARTTLS method...")
                await aiosmtplib.send(
                    message,
                    hostname=self.smtp_server,
                    port=587,
                    username=self.username,
                    password=self.password,
                    start_tls=True
                )
                logger.info("Email sent successfully with STARTTLS!")
                return True
            except Exception as e1:
                logger.error(f"STARTTLS failed: {e1}")
                
                # Method 2: Try with SSL on port 465
                try:
                    logger.info("Trying SSL method...")
                    await aiosmtplib.send(
                        message,
                        hostname=self.smtp_server,
                        port=465,
                        username=self.username,
                        password=self.password,
                        use_tls=True
                    )
                    logger.info("Email sent successfully with SSL!")
                    return True
                except Exception as e2:
                    logger.error(f"SSL failed: {e2}")
                    raise e2
            
        except Exception as e:
            logger.error(f"All SMTP methods failed: {str(e)}")
            return False

    async def send_bulk_alerts(self, alerts: List[dict]) -> dict:
        """
        Gửi nhiều email alerts cùng lúc
        
        Args:
            alerts: List các dict chứa thông tin alert
                    [{"to_email": "...", "symbol": "...", "current_price": ..., ...}]
        
        Returns:
            {"success": int, "failed": int, "errors": []}
        """
        success_count = 0
        failed_count = 0
        errors = []
        
        for alert in alerts:
            try:
                result = await self.send_price_alert_email(
                    to_email=alert["to_email"],
                    symbol=alert["symbol"],
                    current_price=alert["current_price"],
                    target_price=alert["target_price"],
                    alert_type=alert["alert_type"],
                    user_name=alert.get("user_name")
                )
                
                if result:
                    success_count += 1
                else:
                    failed_count += 1
                    errors.append(f"Failed to send to {alert['to_email']}")
                    
            except Exception as e:
                failed_count += 1
                errors.append(f"Error sending to {alert.get('to_email', 'unknown')}: {str(e)}")
        
        return {
            "success": success_count,
            "failed": failed_count,
            "errors": errors
        }


# Global instance
email_service = EmailService()
