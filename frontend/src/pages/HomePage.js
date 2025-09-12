import React from 'react';
import Header from '../components/Layout/Header';
import MultiChartDashboard from '../components/Charts/MultiChartDashboard';

const HomePage = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Chart Section - Section 3 */}
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm flex flex-col">
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