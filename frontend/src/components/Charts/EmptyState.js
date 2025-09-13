import React from 'react';
import { Activity } from 'lucide-react';

const EmptyState = ({ onAddChart }) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Activity size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">No Charts Available</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first chart to start trading analysis</p>
        <button 
          onClick={onAddChart}
          className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          Add Chart
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
