import React, { useState, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import TradingChart from './TradingChart';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const ResizableChartsContainer = ({ charts, onRemoveChart, onUpdateChart, onResetLayout }) => {
  // Generate layout for charts
  const generateLayout = useCallback(() => {
    return charts.map((chart, index) => ({
      i: `chart-${chart.id}`,
      x: (index % 2) * 6, // 2 columns layout
      y: Math.floor(index / 2) * 6,
      w: 6, // width: 6 units (half screen)
      h: 5, // height: 4 units
      minW: 4, // minimum width
      minH: 3, // minimum height
      maxW: 12, // maximum width (full screen)
      maxH: 8, // maximum height
    }));
  }, [charts]);

  const [layouts, setLayouts] = useState({
    lg: generateLayout(),
    md: generateLayout(),
    sm: generateLayout(),
    xs: generateLayout(),
    xxs: generateLayout(),
  });

  // Reset layout function
  const resetLayout = useCallback(() => {
    const newLayout = generateLayout();
    setLayouts({
      lg: newLayout,
      md: newLayout,
      sm: newLayout,
      xs: newLayout,
      xxs: newLayout,
    });
    localStorage.removeItem('chartLayouts');
  }, [generateLayout]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layout, layouts) => {
    setLayouts(layouts);
    // You can save layouts to localStorage here
    localStorage.setItem('chartLayouts', JSON.stringify(layouts));
  }, []);

  // Load layouts from localStorage on mount
  React.useEffect(() => {
    const savedLayouts = localStorage.getItem('chartLayouts');
    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch (e) {
        console.warn('Failed to load saved layouts:', e);
      }
    }
  }, []);

  // Update layouts when charts change
  React.useEffect(() => {
    const newLayout = generateLayout();
    setLayouts(prev => ({
      ...prev,
      lg: newLayout,
      md: newLayout,
      sm: newLayout,
      xs: newLayout,
      xxs: newLayout,
    }));
  }, [charts.length, generateLayout]);

  // Expose reset function to parent
  React.useEffect(() => {
    if (onResetLayout) {
      onResetLayout.current = resetLayout;
    }
  }, [onResetLayout, resetLayout]);

  const breakpoints = {
    lg: 1200,
    md: 996,
    sm: 768,
    xs: 480,
    xxs: 0
  };

  const cols = {
    lg: 12,
    md: 10,
    sm: 6,
    xs: 4,
    xxs: 2
  };

  return (
    <div className="p-4">
      <div className="mb-3 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 dark:text-blue-400 text-sm">💡</span>
          <div>
            <strong className="text-xs">Hướng dẫn sử dụng:</strong>
            <ul className="mt-1 space-y-0.5 text-xs">
              <li>• <strong>Kéo thả:</strong> Click và kéo ở thanh header (có icon ⋮⋮)</li>
              <li>• <strong>Tương tác biểu đồ:</strong> Click và drag trong vùng biểu đồ</li>
              <li>• <strong>Thay đổi kích thước:</strong> Kéo góc dưới phải</li>
              <li>• <strong>Xóa:</strong> Click nút ✕ ở header</li>
            </ul>
          </div>
        </div>
      </div>
      
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        preventCollision={false}
        compactType="vertical"
        handle=".drag-handle"
        style={{ minHeight: '500px' }}
      >
        {charts.map(chart => {
          const layoutItem = layouts.lg?.find(item => item.i === `chart-${chart.id}`);
          const dynamicHeight = layoutItem ? layoutItem.h * 100 - 60 : 340; // Calculate height based on grid units
          
          return (
            <div 
              key={`chart-${chart.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200"
              style={{ overflow: 'hidden' }}
            >
              <TradingChart
                chartConfig={chart}
                onRemove={() => onRemoveChart(chart.id)}
                onConfigChange={(config) => onUpdateChart(chart.id, config)}
                height={Math.max(dynamicHeight, 200)} // Minimum height of 200px
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>

      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }
        
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        
        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }
        
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxnIGZpbGw9IiM0QTVBNjgiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PGNpcmNsZSBjeD0iNSIgY3k9IjUiIHI9IjEiLz48Y2lyY2xlIGN4PSIxIiBjeT0iNSIgcj0iMSIvPjxjaXJjbGUgY3g9IjUiIGN5PSIxIiByPSIxIi8+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48Y2lyY2xlIGN4PSIzIiBjeT0iMyIgcj0iMSIvPjxjaXJjbGUgY3g9IjMiIGN5PSIxIiByPSIxIi8+PGNpcmNsZSBjeD0iMSIgY3k9IjMiIHI9IjEiLz48Y2lyY2xlIGN4PSI1IiBjeT0iMyIgcj0iMSIvPjxjaXJjbGUgY3g9IjMiIGN5PSI1IiByPSIxIi8+PC9nPjwvc3ZnPg==') center center no-repeat;
          background-size: 12px 12px;
          cursor: se-resize;
          z-index: 100;
        }
        
        .react-grid-item > .react-resizable-handle:hover {
          background-color: rgba(59, 130, 246, 0.1);
          border-radius: 3px;
        }
        
        .react-grid-item.react-grid-placeholder {
          background: rgb(59, 130, 246, 0.2);
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          user-select: none;
          border-radius: 8px;
          border: 2px dashed #3b82f6;
        }
        
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 3;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .react-grid-item.resizing {
          z-index: 3;
        }
        
        /* Custom drag handle - ONLY this area can be dragged */
        .react-grid-item .drag-handle {
          cursor: move;
          padding: 6px 8px;
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 10;
          user-select: none;
          font-size: 12px;
        }
        
        .react-grid-item .drag-handle:hover {
          background: #e9ecef;
        }
        
        .react-grid-item .drag-handle:active {
          background: #dee2e6;
        }
        
        .react-grid-item .drag-handle::before {
          content: "⋮⋮";
          color: #6c757d;
          font-weight: bold;
          font-size: 12px;
          letter-spacing: 1px;
          margin-right: 6px;
        }
        
        /* Select boxes should not trigger drag */
        .react-grid-item .drag-handle select {
          pointer-events: auto !important;
          cursor: pointer !important;
          z-index: 1001;
          position: relative;
        }
        
        .react-grid-item .drag-handle select:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 1px;
        }
        
        /* Chart container should allow ALL interactions */
        .chart-interactive-area {
          pointer-events: auto !important;
          position: relative;
          cursor: default !important;
        }
        
        .chart-interactive-area * {
          pointer-events: auto !important;
        }
        
        /* Ensure TradingView chart interactions work */
        .tv-lightweight-charts {
          pointer-events: auto !important;
          cursor: crosshair !important;
        }
        
        .tv-lightweight-charts * {
          pointer-events: auto !important;
        }
        
        .tv-lightweight-charts canvas {
          pointer-events: auto !important;
        }
        
        /* All buttons in chart should be clickable */
        .react-grid-item button {
          pointer-events: auto !important;
          cursor: pointer !important;
          z-index: 1000;
          position: relative;
        }
        
        /* Chart header buttons should be fully interactive */
        .react-grid-item .chart-header button {
          pointer-events: auto !important;
          cursor: pointer !important;
          z-index: 1001;
        }
        
        /* Ensure all interactive elements work */
        .react-grid-item select,
        .react-grid-item input,
        .react-grid-item textarea {
          pointer-events: auto !important;
          cursor: auto !important;
          z-index: 1000;
        }
        
        /* Prevent event conflicts on buttons */
        .react-grid-item button:hover,
        .react-grid-item button:focus,
        .react-grid-item button:active {
          pointer-events: auto !important;
          cursor: pointer !important;
          z-index: 1002;
        }
        
        /* Specifically for chart header controls */
        .chart-header button,
        .chart-header select,
        .chart-header input {
          pointer-events: auto !important;
          cursor: pointer !important;
          z-index: 1001 !important;
          position: relative !important;
        }
        
        /* Fix for any interference with drag handle */
        .drag-handle button:not(.remove-chart-btn) {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        /* Remove button styling */
        .react-grid-item .drag-handle button {
          position: relative;
          z-index: 1000;
          pointer-events: auto !important;
          cursor: pointer !important;
          padding: 2px 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 16px;
          height: 16px;
          font-size: 12px;
          line-height: 1;
        }
        
        .react-grid-item .drag-handle button:hover {
          background-color: rgba(239, 68, 68, 0.1);
        }
        
        /* Modal and overlay fixes */
        .fixed[style*="z-index: 9999"] {
          pointer-events: auto !important;
        }
        
        .fixed[style*="z-index: 9999"] * {
          pointer-events: auto !important;
        }
        
        /* Ensure modals work properly */
        div[style*="z-index: 10000"] {
          pointer-events: auto !important;
        }
        
        div[style*="z-index: 10000"] * {
          pointer-events: auto !important;
          cursor: auto !important;
        }
        
        div[style*="z-index: 10000"] button {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        div[style*="z-index: 10000"] select {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        div[style*="z-index: 10000"] input {
          pointer-events: auto !important;
          cursor: text !important;
        }
      `}</style>
    </div>
  );
};

export default ResizableChartsContainer;
