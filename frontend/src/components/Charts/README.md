# Multi-Chart Dashboard Components

Dự án này đã được tách thành các component nhỏ để dễ quản lý và bảo trì.

## Cấu trúc Components

### 1. MultiChartDashboard.js (Component chính)
- **Chức năng**: Component chính quản lý toàn bộ dashboard
- **Props**: Không có
- **State**: 
  - `charts`: Danh sách các chart
  - `showMultiChartModal`: Trạng thái hiển thị modal
  - `multiChartConfig`: Cấu hình cho multi chart

### 2. TradingChart.js (Component biểu đồ)
- **Chức năng**: Hiển thị biểu đồ trading với LightweightCharts
- **Props**:
  - `chartConfig`: Cấu hình chart (symbol, timeframe, indicators)
  - `onRemove`: Callback xóa chart
  - `onConfigChange`: Callback thay đổi cấu hình
  - `height`: Chiều cao chart
- **State**:
  - `candles`: Dữ liệu nến
  - `isLoading`: Trạng thái loading
  - `error`: Lỗi nếu có

### 3. ChartHeader.js (Header của chart)
- **Chức năng**: Hiển thị header với controls và thông tin giá
- **Props**:
  - `chartConfig`: Cấu hình chart
  - `onConfigChange`: Callback thay đổi cấu hình
  - `onRemove`: Callback xóa chart
  - `isLoading`: Trạng thái loading
  - `error`: Lỗi
  - `currentPrice`: Giá hiện tại
  - `priceChange`: Thay đổi giá
  - `priceChangePercent`: Phần trăm thay đổi

### 4. IndicatorsPanel.js (Panel indicators)
- **Chức năng**: Hiển thị danh sách indicators đã thêm
- **Props**:
  - `indicators`: Danh sách indicators
  - `onConfigChange`: Callback thay đổi cấu hình
  - `chartConfig`: Cấu hình chart

### 5. DashboardHeader.js (Header của dashboard)
- **Chức năng**: Header chính của dashboard với các nút điều khiển
- **Props**:
  - `onAddChart`: Callback thêm chart
  - `onOpenMultiChartModal`: Callback mở modal multi chart

### 6. ChartsContainer.js (Container chứa charts)
- **Chức năng**: Container chứa tất cả các chart
- **Props**:
  - `charts`: Danh sách charts
  - `onRemoveChart`: Callback xóa chart
  - `onUpdateChart`: Callback cập nhật chart

### 7. MultiChartModal.js (Modal cấu hình multi chart)
- **Chức năng**: Modal để cấu hình nhiều chart cùng lúc
- **Props**:
  - `isOpen`: Trạng thái mở/đóng modal
  - `onClose`: Callback đóng modal
  - `multiChartConfig`: Cấu hình multi chart
  - `setMultiChartConfig`: Setter cho cấu hình
  - `onConfirm`: Callback xác nhận

### 8. EmptyState.js (Trạng thái trống)
- **Chức năng**: Hiển thị khi không có chart nào
- **Props**:
  - `onAddChart`: Callback thêm chart

## Luồng dữ liệu

1. **MultiChartDashboard** quản lý state chính
2. **DashboardHeader** cung cấp các nút điều khiển
3. **ChartsContainer** render danh sách charts
4. **TradingChart** xử lý logic biểu đồ và API calls
5. **ChartHeader** và **IndicatorsPanel** xử lý UI controls
6. **MultiChartModal** cho phép cấu hình nhiều chart
7. **EmptyState** hiển thị khi không có chart

## Lợi ích của việc tách component

- **Dễ bảo trì**: Mỗi component có trách nhiệm riêng biệt
- **Tái sử dụng**: Các component có thể được sử dụng ở nơi khác
- **Dễ test**: Có thể test từng component riêng lẻ
- **Dễ debug**: Lỗi được giới hạn trong phạm vi component
- **Performance**: Chỉ re-render component cần thiết
- **Code readability**: Code dễ đọc và hiểu hơn
