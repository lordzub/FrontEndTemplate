import React, { lazy, Suspense, useMemo, useCallback, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
// import { ErrorBoundary } from 'react-error-boundary';

// Types
interface TradeData {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  'Stock Splits': number;
  'Capital Gains': number;
  Dividends: number;
  signal?: 'short';
}

interface Trade {
  action: 'Buy' | 'Sell';
  trade_date: string;
  price: string;
  size: number;
  principal_amount: string;
}

interface CandlestickChartProps {
  trades: Trade[];
  symbolData: TradeData[];
  stockSplits: Array<{
    date: string;
    stock_split: number;
  }>;
}

// Replace the dynamic import with lazy
// const ReactApexChart = lazy(() => import('react-apexcharts'));

// Modify data processing to only use Close price
const processChartData = (data: TradeData[]) => {
  return data.map(item => ({
    x: new Date(item.Date).getTime(),
    y: item.Close
  }));
};

// Replace the ApexCharts import with Recharts components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer
} from 'recharts';

const TradeChart: React.FC<CandlestickChartProps> = React.memo(({ trades, symbolData, stockSplits }) => {
  // Add debug logging
  console.log('Received symbolData:', symbolData);
  console.log('Received trades:', trades);
  console.log('Received stockSplits:', stockSplits);
  // Validate data before processing
  if (!symbolData?.length) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Price Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate initial visible range based on trade dates
  const [visibleRange] = useState(() => {
    if (!trades.length) return {
      min: new Date().getTime() - (86400000 * 90), // fallback to 90 days
      max: new Date().getTime()
    };

    const tradeDates = trades.map(trade => new Date(trade.trade_date).getTime());
    const minTradeDate = Math.min(...tradeDates);
    const maxTradeDate = Math.max(...tradeDates);
    console.log(new Date(minTradeDate), new Date(maxTradeDate));
    // Add some padding (7 days before first trade and after last trade)
    return {
      min: minTradeDate - (86400000 * 7),
      max: maxTradeDate + (86400000 * 7)
    };
  });

  // Update chart data processing to include trades and splits
  const chartData = useMemo(() => {
    try {
      return symbolData.map(item => {
        const date = new Date(item.Date).getTime();
        const trade = trades.find(t => new Date(t.trade_date).getTime() === date);
        const split = stockSplits.find(s => new Date(s.date).getTime() === date);
        
        return {
          date,
          price: Number(item.Close),
          trade: trade ? {
            action: trade.action,
            price: parseFloat(trade.price),
            size: trade.size
          } : undefined,
          split: split?.stock_split
        };
      });
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [];
    }
  }, [symbolData, trades, stockSplits]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const date = new Date(label);
    const trade = trades.find(t => 
      new Date(t.trade_date).getTime() === date.getTime()
    );
    const split = payload[0]?.payload?.split;

    return (
      <div className="bg-[#ffffff] border border-[#2A2E39] rounded p-3">
        <p className="text-[#000000]">
          {date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        <p className="text-sm font-medium">
          Price: ${payload[0].value.toFixed(2)}
        </p>
        {split && (
          <p className="mt-2 text-yellow-500">
            Stock Split: {split}:1
          </p>
        )}
        {trade && (
          <div className="mt-2 pt-2 border-t border-[#2A2E39]">
            <p className={trade.action === 'Buy' ? 'text-[#089981]' : 'text-[#F23645]'}>
              {trade.action} Trade
            </p>
            <p>Size: {Math.round(trade.size).toLocaleString()}</p>
            <p>Price: ${parseFloat(trade.price).toFixed(2)}</p>
            <p>Value: ${parseFloat(trade.principal_amount).toLocaleString()}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[500px] w-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" />
          <XAxis 
            dataKey="date"
            type="number"
            domain={[visibleRange.min, visibleRange.max]}
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
            stroke="#000000"
          />
          <YAxis 
            stroke="#000000"
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone"
            dataKey="price"
            stroke="#000000"
            dot={(props: any) => {
              const trade = props.payload.trade;
              if (!trade) return null;
              
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill={trade.action === 'Buy' ? '#089981' : '#F23645'}
                  stroke="none"
                />
              );
            }}
            strokeWidth={2}
          />
          {/* Add split markers with descriptive labels */}
          {stockSplits.map((split, index) => (
            <ReferenceLine
              key={index}
              x={new Date(split.date).getTime()}
              stroke={split.stock_split > 1 ? '#FFD700' : '#000000'}
              strokeDasharray="3 3"
              label={{
                value: `${split.stock_split > 1 ? split.stock_split + ':1' : '1:' + (1/split.stock_split)} ${split.stock_split > 1 ? 'Split' : 'Reverse Split'}`,
                position: "insideTopLeft",
                fill: split.stock_split > 1 ? '#FFD700' : '#000000',
                fontSize: 12,
                offset: 10
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TradeChart;