import React from 'react';
import { Plus, BarChart3 } from 'lucide-react';

const DashboardHeader = ({ onAddChart, onOpenMultiChartModal }) => {
  return (
    <div className="bg-white p-4 border-b sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Multi-Chart Dashboard</h1>
        <div className="flex space-x-2">
          <button 
            onClick={onOpenMultiChartModal}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <BarChart3 size={14} />
            <span>Multi Chart</span>
          </button>
          <button 
            onClick={onAddChart}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <Plus size={14} />
            <span>Add Chart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
