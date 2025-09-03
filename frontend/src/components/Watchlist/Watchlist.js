import React, { useEffect, useState } from 'react';
import { priceService } from '../../services/api';

const Watchlist = ({ selectedSymbol, onSelect }) => {
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await priceService.getAvailableSymbols();
        const list = res?.data?.data?.symbols || [];
        if (isMounted) setSymbols(list);
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load symbols');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Đang tải danh sách...</div>;
  if (error) return <div className="text-sm text-red-600">Lỗi: {error}</div>;

  return (
    <div className="space-y-2">
      {symbols.map((sym) => (
        <div
          key={sym}
          className={`flex justify-between items-center p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${selectedSymbol === sym ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
          onClick={() => onSelect(sym)}
        >
          <div>
            <div className="font-medium text-sm">{sym}</div>
          </div>
          <div className="text-xs text-gray-500">Select</div>
        </div>
      ))}
    </div>
  );
};

export default Watchlist;


