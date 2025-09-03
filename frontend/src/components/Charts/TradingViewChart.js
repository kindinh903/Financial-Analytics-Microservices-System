// import React, { useState } from 'react';
// import TradingViewWidget from 'react-tradingview-widget';

// const TradingViewChart = ({ symbol = 'BTCUSD', timeframe = '1D', data = [] }) => {
//   const [isLoading, setIsLoading] = useState(true);

//   // Convert symbol format for TradingView (e.g., BTC/USD -> BTCUSD)
//   const formatSymbol = (sym) => {
//     return sym.replace('/', '').replace('-', '');
//   };

//   // Convert timeframe for TradingView
//   const formatTimeframe = (tf) => {
//     const timeframes = {
//       '1H': '60',
//       '4H': '240',
//       '1D': '1D',
//       '1W': '1W',
//       '1M': '1M',
//     };
//     return timeframes[tf] || '1D';
//   };

//   const handleChartLoad = () => {
//     setIsLoading(false);
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-sm border border-gray-200">
//       <div className="px-6 py-4 border-b border-gray-200">
//         <div className="flex items-center justify-between">
//           <div>
//             <h3 className="text-lg font-medium text-gray-900">{symbol}</h3>
//             <p className="text-sm text-gray-500">{timeframe} Chart</p>
//           </div>
//           <div className="flex space-x-2">
//             <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
//               1H
//             </button>
//             <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
//               1D
//             </button>
//             <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
//               1W
//             </button>
//             <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
//               1M
//             </button>
//           </div>
//         </div>
//       </div>
      
//       <div className="relative">
//         {isLoading && (
//           <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
//           </div>
//         )}
        
//         <div className="h-96">
//           <TradingViewWidget
//             symbol={formatSymbol(symbol)}
//             interval={formatTimeframe(timeframe)}
//             timezone="Asia/Ho_Chi_Minh"
//             theme="light"
//             style="1"
//             locale="en"
//             toolbar_bg="#f1f3f6"
//             enable_publishing={false}
//             allow_symbol_change={true}
//             container_id="tradingview_chart"
//             onChartReady={handleChartLoad}
//             width="100%"
//             height="100%"
//             studies={[
//               "RSI@tv-basicstudies",
//               "MACD@tv-basicstudies",
//               "BB@tv-basicstudies"
//             ]}
//             show_popup_button={true}
//             popup_width="1000"
//             popup_height="650"
//             disabled_features={[
//               "use_localstorage_for_settings"
//             ]}
//             enabled_features={[
//               "study_templates"
//             ]}
//             overrides={{
//               "mainSeriesProperties.candleStyle.upColor": "#26a69a",
//               "mainSeriesProperties.candleStyle.downColor": "#ef5350",
//               "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
//               "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350"
//             }}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TradingViewChart; 