# Frontend Trading Platform

## Mô tả
Ứng dụng web trading platform với giao diện hiện đại, tích hợp TradingView charts và các tính năng phân tích thị trường.

## Tính năng chính

### 🚀 TradingInterface (Trang chính)
- **Biểu đồ giao dịch**: Tích hợp TradingView Widget với các chỉ số kỹ thuật
- **Danh sách theo dõi**: Theo dõi các cặp tiền điện tử phổ biến
- **Phân tích kỹ thuật**: RSI, MACD, Support/Resistance levels
- **Tin tức thị trường**: Cập nhật tin tức và phân tích thị trường real-time
- **Navigation**: Điều hướng dễ dàng giữa các trang

### 📊 Các trang khác
- **Dashboard**: Tổng quan thị trường
- **Charts**: Biểu đồ chi tiết
- **Portfolio**: Quản lý danh mục đầu tư
- **News**: Tin tức tài chính

## Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js 16+ 
- npm hoặc yarn

### Cài đặt dependencies
```bash
npm install
```

### Chạy ứng dụng
```bash
npm start
```

Ứng dụng sẽ chạy tại: http://localhost:3000

### Build production
```bash
npm run build
```

## Cấu trúc dự án

```
src/
├── components/          # Các component tái sử dụng
│   └── Layout/         # Layout chính của ứng dụng
├── pages/              # Các trang của ứng dụng
│   ├── TradingInterface.js  # Trang chính - Giao diện giao dịch
│   ├── Dashboard.js         # Trang tổng quan
│   ├── Charts.js            # Trang biểu đồ
│   ├── Portfolio.js         # Trang danh mục
│   └── News.js              # Trang tin tức
├── services/            # API services
├── App.js              # Component chính
└── index.js            # Entry point
```

## Dependencies chính

- **React 18**: Framework UI
- **React Router**: Điều hướng
- **TradingView Widget**: Biểu đồ giao dịch chuyên nghiệp
- **Tailwind CSS**: Styling framework
- **Axios**: HTTP client

## Tính năng TradingInterface

### 1. Header Navigation
- Logo và tên ứng dụng
- Menu điều hướng chính
- Icons thông báo, cài đặt, người dùng

### 2. Sidebar trái
- Danh sách theo dõi các cặp tiền
- Công cụ phân tích kỹ thuật
- Chọn cặp tiền để hiển thị

### 3. Khu vực biểu đồ chính
- TradingView Widget tích hợp
- Thông tin giá real-time
- Các chỉ số kỹ thuật cơ bản

### 4. Sidebar phải
- Tin tức thị trường trending
- Phân tích kỹ thuật
- Cảnh báo và thông tin rủi ro

## Lưu ý

- TradingView Widget yêu cầu kết nối internet để hoạt động
- Các dữ liệu giá và tin tức là demo, không phải dữ liệu thực
- Ứng dụng được thiết kế cho mục đích học tập và demo

## Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Node.js version
2. Dependencies đã được cài đặt đầy đủ
3. Kết nối internet
4. Console errors trong browser 