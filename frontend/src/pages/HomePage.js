import React from 'react';
import Header from '../components/Layout/Header';
import MultiChartDashboard from '../components/Charts/MultiChartDashboard';

const HomePage = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Section - Section 3 */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="bg-white rounded-lg h-full shadow-sm flex flex-col">
              <div className="p-4 border-b flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold">Multi-Chart Dashboard</h2>
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-600">Real-time data from API</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              </div>
              
              {/* Multi-Chart Dashboard */}
              <div className="flex-1 overflow-hidden">
                <MultiChartDashboard/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;