// import React, { useState, useEffect } from 'react';
// import TradingViewWidget from 'react-tradingview-widget';

// const TradingViewChart = ({ symbol = 'BTCUSD', timeframe = '1H', data = [], onTimeframeChange }) => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [hasError, setHasError] = useState(false);

//   // Add timeout to prevent infinite loading
//   useEffect(() => {
//     const timeout = setTimeout(() => {
//       if (isLoading) {
//         console.warn('⚠️ TradingView chart loading timeout, forcing load completion');
//         setIsLoading(false);
//       }
//     }, 15000); // 15 second timeout

//     return () => clearTimeout(timeout);
//   }, [isLoading]);

//   // Reset loading state when symbol or timeframe changes
//   useEffect(() => {
//     console.log('🔄 TradingView props changed:', { symbol, timeframe });
//     setIsLoading(true);
//     setHasError(false);
//   }, [symbol, timeframe]);

//   // Convert symbol format for TradingView (e.g., BTC/USD -> BTCUSD)
//   const formatSymbol = (sym) => {
//     return sym.replace('/', '').replace('-', '');
//   };

//   // Convert timeframe for TradingView
//   const formatTimeframe = (tf) => {
//     const timeframes = {
//       '1H': '60',  // TradingView expects string format
//       '4H': '240',
//       '1D': '1D',
//       '1W': '1W',
//       '1M': '1M',
//     };
//     return timeframes[tf] || '1D';
//   };

//   const handleChartLoad = () => {
//     console.log('✅ TradingView chart loaded successfully');
//     setIsLoading(false);
//     setHasError(false);
    
//     // Set up interval change listener if callback is provided
//     if (onTimeframeChange) {
//       // Note: TradingView widget doesn't provide a direct callback for interval changes
//       // The widget handles this internally, but we can listen for changes
//       console.log('📊 TradingView chart ready - timeframe controls should be functional');
//     }
//   };

//   const handleChartError = () => {
//     console.error('❌ TradingView chart failed to load');
//     setIsLoading(false);
//     setHasError(true);
//   };

//   // Add error boundary effect
//   useEffect(() => {
//     const handleError = (error) => {
//       console.error('Global error caught:', error);
//       // Only handle TradingView related errors
//       if (error.message && (
//         error.message.includes('TradingView') || 
//         error.message.includes('tradingview') ||
//         error.message.includes('Cannot read properties of undefined')
//       )) {
//         console.error('TradingView widget error:', error);
//         setHasError(true);
//         setIsLoading(false);
//       }
//     };

//     const handleUnhandledRejection = (event) => {
//       console.error('Unhandled promise rejection:', event.reason);
//       // Only handle TradingView related rejections
//       if (event.reason && (
//         event.reason.message?.includes('TradingView') ||
//         event.reason.message?.includes('tradingview') ||
//         event.reason.message?.includes('Cannot read properties of undefined')
//       )) {
//         console.error('TradingView widget unhandled rejection:', event.reason);
//         setHasError(true);
//         setIsLoading(false);
//       }
//     };

//     window.addEventListener('error', handleError);
//     window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
//     return () => {
//       window.removeEventListener('error', handleError);
//       window.removeEventListener('unhandledrejection', handleUnhandledRejection);
//     };
//   }, []);

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
        
//         {hasError ? (
//           <div className="h-96 flex items-center justify-center bg-gray-50">
//             <div className="text-center">
//               <div className="text-4xl mb-4">📈</div>
//               <h3 className="text-lg font-medium text-gray-900 mb-2">Chart Loading Error</h3>
//               <p className="text-sm text-gray-500">Unable to load TradingView chart</p>
//               <p className="text-xs text-gray-400 mt-2">Symbol: {symbol} | Timeframe: {timeframe}</p>
//               <button 
//                 onClick={() => {
//                   setHasError(false);
//                   setIsLoading(true);
//                   window.location.reload();
//                 }}
//                 className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//               >
//                 Retry
//               </button>
//             </div>
//           </div>
//         ) : (
//           <div className="h-96">
//             {(() => {
//               try {
//                 console.log('🔄 Initializing TradingView widget for:', { symbol, timeframe });
//                 console.log('🔄 Formatted symbol:', formatSymbol(symbol));
//                 console.log('🔄 Formatted timeframe:', formatTimeframe(timeframe));
                
//                 return (
//                   <TradingViewWidget
//                     key={`${symbol}-${timeframe}-${Date.now()}`}
//                     symbol={formatSymbol(symbol)}
//                     interval={formatTimeframe(timeframe)}
//                     timezone="Asia/Ho_Chi_Minh"
//                     theme="Light"
//                     style="1"
//                     locale="en"
//                     toolbar_bg="#f1f3f6"
//                     enable_publishing={false}
//                     allow_symbol_change={true}
//                     autosize={true}
//                     hide_top_toolbar={true}
//                     container_id={`tradingview_chart_${symbol}_${timeframe}_${Date.now()}`}
//                     onChartReady={handleChartLoad}
//                     width={800}
//                     height={400}
//                     studies={[
//                       "RSI@tv-basicstudies",
//                       "MACD@tv-basicstudies",
//                       "BB@tv-basicstudies"
//                     ]}
//                     show_popup_button={true}
//                     popup_width={1000}
//                     popup_height={650}
//                     disabled_features={[
//                       "use_localstorage_for_settings"
//                     ]}
//                     enabled_features={[
//                       "study_templates"
//                     ]}
//                     overrides={{
//                       "mainSeriesProperties.candleStyle.upColor": "#26a69a",
//                       "mainSeriesProperties.candleStyle.downColor": "#ef5350",
//                       "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
//                       "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350"
//                     }}
//                   />
//                 );
//               } catch (error) {
//                 console.error('TradingView widget initialization error:', error);
//                 setHasError(true);
//                 setIsLoading(false);
//                 return (
//                   <div className="h-96 flex items-center justify-center bg-gray-50">
//                     <div className="text-center">
//                       <div className="text-4xl mb-4">📈</div>
//                       <h3 className="text-lg font-medium text-gray-900 mb-2">Chart Initialization Error</h3>
//                       <p className="text-sm text-gray-500">Unable to initialize TradingView chart</p>
//                     </div>
//                   </div>
//                 );
//               }
//             })()}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default TradingViewChart;