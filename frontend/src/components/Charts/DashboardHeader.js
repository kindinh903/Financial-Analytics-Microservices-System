import React from 'react';
import { Plus, BarChart3, RotateCcw } from 'lucide-react';

const DashboardHeader = ({ onAddChart, onOpenMultiChartModal, onResetLayout }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Multi-Chart Dashboard</h1>
        <div className="flex space-x-2">
          {onResetLayout && (
            <button 
              onClick={onResetLayout}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded hover:bg-gray-600 dark:hover:bg-gray-500 text-sm transition-colors"
              title="Reset Layout"
            >
              <RotateCcw size={14} />
              <span>Reset Layout</span>
            </button>
          )}
          <button 
            onClick={onOpenMultiChartModal}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 text-sm transition-colors"
          >
            <BarChart3 size={14} />
            <span>Multi Chart</span>
          </button>
          <button 
            onClick={onAddChart}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 text-sm transition-colors"
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
