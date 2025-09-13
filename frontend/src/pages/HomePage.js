import React from 'react';
import Header from '../components/Layout/Header';
import MultiChartDashboard from '../components/Charts/MultiChartDashboard';

const HomePage = () => {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Section - Section 3 */}
          <div className="p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col transition-colors duration-200">
              {/* Multi-Chart Dashboard */}
              <div className="w-full">
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