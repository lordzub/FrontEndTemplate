import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Symbol: React.FC = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const symbolObj = location.state?.symbolObj;

  const [symbol_data, setSymbolData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "Date",
    "NAV",
    "NAV Change ($)",
    "NAV Change (%)",
    "Actual Shares Outstanding",
    "Daily Issuance-Redemption",
    "Daily Shares Change",
    "Daily Shares Change Pct",
  ]);
  
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "Date",
    "ProShares Name",
    "Ticker",
    "NAV",
    "NAV Change ($)",
    "NAV Change (%)",
    "Prior NAV",
    "Actual Shares Outstanding",
    "Daily Shares Change",
    "Assets Under Management",
    "Daily Issuance-Redemption",

    "Daily Shares Change Pct",
    "Shares Outstanding (000)"
  ]);
  const itemsPerPage = 100;

  // Add this column name mapping
  const columnNameMap: { [key: string]: string } = {
    "Date": "Date",
    "NAV": "Net Asset Value",
    "NAV Change ($)": "Value Change ($)",
    "NAV Change (%)": "Value Change (%)",
    "Actual Shares Outstanding": "Outstanding Shares",
    "Daily Issuance-Redemption": "Daily Share Change Value",
    "Daily Shares Change": "Daily Share Change",
    "Daily Shares Change Pct": "Daily Share Change %",
    "ProShares Name": "Fund Name",
    "Ticker": "Symbol",
    "Prior NAV": "Previous NAV",
    "Assets Under Management": "AUM",
    "Shares Outstanding (000)": "Shares (000s)"
  };

  const [progressiveShares, setProgressiveShares] = useState<any[]>([]);

  // Add new state variables for metrics
  const [metrics, setMetrics] = useState({
    totalReturn: 0,
    annualizedReturn: 0,
    volatility: 0,
    sharpeRatio: 0,
    maxDrawdown: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [symbolDataRes] = await Promise.all([
          axios.get(`https://day-late-dollar-f3f068eb8581.herokuapp.com/get_symbol_nav`, {params: {symbol: symbol}})
        ]);
        setSymbolData(symbolDataRes.data);
        
        // Calculate metrics from the data - INVERT the percentage changes for short strategy
        const percentChanges = symbolDataRes.data.map((item: any) => -(item['NAV Change (%)'] || 0));
        const dates = symbolDataRes.data.map((item: any) => item['Date']);
        
        // Sort the data chronologically
        const sortedIndices = dates.map((_, i) => i)
          .sort((a, b) => new Date(dates[a]).getTime() - new Date(dates[b]).getTime());
        
        let returnSum = 0;
        const progressiveData = sortedIndices.map((index) => {
          returnSum += percentChanges[index]/100;
          return {
            date: dates[index],
            returnValue: (returnSum * 100)
          };
        });
        
        // Calculate financial metrics
        const totalReturn = progressiveData[progressiveData.length - 1].returnValue;
        
        // Calculate annualized return - Modified to handle negative returns
        const firstDate = new Date(dates[sortedIndices[0]]);
        const lastDate = new Date(dates[sortedIndices[sortedIndices.length - 1]]);
        const yearsFraction = (lastDate.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
        
        // Handle negative returns differently
        const annualizedReturn = totalReturn < 0
          ? -((Math.pow(1 + Math.abs(totalReturn/100), 1/yearsFraction) - 1) * 100)
          : ((Math.pow(1 + totalReturn/100, 1/yearsFraction) - 1) * 100);
        
        // Calculate volatility (standard deviation of returns)
        const mean = percentChanges.reduce((a, b) => a + b, 0) / percentChanges.length;
        const variance = percentChanges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / percentChanges.length;
        const volatility = Math.sqrt(variance * 252); // Annualized volatility
        
        // Calculate Sharpe ratio (assuming risk-free rate of 2%)
        const riskFreeRate = 2;
        const sharpeRatio = (annualizedReturn - riskFreeRate) / volatility;

        setMetrics({
          totalReturn,
          annualizedReturn,
          volatility,
          sharpeRatio,
          maxDrawdown: 0
        });
        
        setProgressiveShares(progressiveData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [symbol]);

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev =>
      prev.includes(column)
        ? prev.filter(col => col !== column)
        : [...prev, column]
    );
  };

  const moveColumn = (column: string, direction: 'left' | 'right') => {
    const currentIndex = columnOrder.indexOf(column);
    if (
      (direction === 'left' && currentIndex > 0) ||
      (direction === 'right' && currentIndex < columnOrder.length - 1)
    ) {
      const newOrder = [...columnOrder];
      const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
      setColumnOrder(newOrder);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = symbol_data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(symbol_data.length / itemsPerPage);

  const Pagination = () => (
    <div className="mt-4 flex justify-center gap-2">
      <button
        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-white text-green-600 rounded hover:bg-green-600 hover:text-white disabled:opacity-50"
      >
        Previous
      </button>
      <span className="px-4 py-2">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-white text-green-600 rounded hover:bg-green-600 hover:text-white disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex flex-row items-start mb-4">
        <div className='flex flex-row items-start w-full'>
          {symbolObj && (
            <div className="bg-white rounded-lg shadow-md p-6 w-full">
              <div className="flex items-center gap-4 mb-6">
                <button 
                  onClick={() => navigate('/')}
                  className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-600 hover:text-white transition-colors"
                >
                  ←
                </button>
                <h1 className="text-3xl font-bold">{symbol}</h1>
              </div>
              
              <div className="border-b border-gray-200 pb-6 mb-6">
              <p className="text-2xl text-gray-500 mt-1">Total Amount</p>
                <p className={`text-3xl font-semibold ${symbolObj.total_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${symbolObj.total_amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Fund Name</h3>
                  <p className="text-lg font-semibold">{symbolObj["Fund Name"]}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Asset Class</h3>
                  <p className="text-lg font-semibold">{symbolObj["Asset Class"]}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Daily Objective</h3>
                  <p className="text-lg font-semibold">{symbolObj["Daily Objective"]}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Index/Benchmark</h3>
                  <p className="text-lg font-semibold">{symbolObj["Index/Benchmark"]}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Return</h3>
            <p className="text-lg font-semibold">{metrics.totalReturn.toFixed(2)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Annualized Return</h3>
            <p className="text-lg font-semibold">{metrics.annualizedReturn.toFixed(2)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Volatility</h3>
            <p className="text-lg font-semibold">{metrics.volatility.toFixed(2)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Sharpe Ratio</h3>
            <p className="text-lg font-semibold">{metrics.sharpeRatio.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* <ColumnManager /> */}

      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Progressive Changes Over Time</h2>
        <div className="w-full h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={progressiveShares}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="returnValue"
                name="Cumulative Return"
                stroke="#2563eb"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>


      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {columnOrder
                .filter(header => visibleColumns.includes(header))
                .map((header) => (
                  <th 
                    key={header} 
                    className={`px-4 py-2 border-b text-center ${
                      header === "Date" ? "w-40" : ""
                    }`}
                  >
                    {columnNameMap[header] || header}
                  </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columnOrder
                  .filter(column => visibleColumns.includes(column))
                  .map((column) => (
                    <td key={column} className="px-4 py-2 border-b">
                      {typeof row[column] === 'number' 
                        ? row[column].toLocaleString() 
                        : row[column]}
                    </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination />
    </div>
  );
};

export default Symbol; 