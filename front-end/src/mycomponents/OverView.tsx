import React, { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

interface SymbolTotal {
  [key: string]: number;
}

interface PortfolioStats {
  totalValue: number;
  totalProfitLoss: number;
  winRate: number;
  averageReturn: number;
  largestGain: { symbol: string; value: number };
  largestLoss: { symbol: string; value: number };
}

const Overview: React.FC = ({ symbols, total_value }) => {

  const [total_profit_loss, setTotalProfitLoss] = useState<number>(0);
  const navigate = useNavigate();

  const handleSymbolClick = (symbolObj: SymbolTotal) => {
    navigate(`/symbol/${symbolObj.symbol}`, { state: { symbolObj } });
  };

  return (
    <div className="grid gap-4 sm:p-1 md:p-4">
      {/* Portfolio Summary Cards */}
      <div className="w-full">
        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg bg-white shadow p-6">
            <p className="text-2xl text-black-600">Number Of Products</p>
            <p className="text-3xl font-semibold mt-2">{symbols.length}</p>
          </div>
          <div className="rounded-lg bg-white shadow p-6">
            <p className="text-2xl text-black-600">Total Profit</p>
            <p className="text-3xl font-semibold mt-2 text-green-600">${total_value.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Symbol Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {symbols.map((symbolObj, index) => {
          const symbol = symbolObj['symbol'];
          const total = symbolObj['total_amount'];

          return (
            <div 
              key={index} 
              className="rounded-lg bg-white shadow p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => handleSymbolClick(symbolObj)}
            >
              <p className="text-base font-semibold">{symbol}</p>
              <p className={`text-sm ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {total >= 0 ? '+' : ''}${total.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Overview;
