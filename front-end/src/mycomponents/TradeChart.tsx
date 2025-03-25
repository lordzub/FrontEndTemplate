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
  'Action': string;
  'Date of Trade': string;
  'Price ($)': number;
  'Quantity': number;
  'Amount ($)': number;
  Type?: string;
}

interface CandlestickChartProps {
  trades: Trade[];
  symbolData: TradeData[];
  stockSplits: Array<{
    date: string;
    stock_split: number;
  }>;
}


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
      min: new Date().getTime() - (86400000 * 90),
      max: new Date().getTime()
    };

    const tradeDates = trades.map(trade => new Date(trade['Date of Trade'].trim()).getTime());
    const minTradeDate = Math.min(...tradeDates);
    const maxTradeDate = Math.max(...tradeDates);
    
    return {
      min: minTradeDate - (86400000 * 7),
      max: maxTradeDate + (86400000 * 7)
    };
  });

  // Helper function to normalize dates
  const normalizeDate = (dateStr: string) => {
    // Remove leading/trailing spaces and handle various date formats
    const cleanDate = dateStr.trim();
    return new Date(cleanDate).setHours(0, 0, 0, 0);
  };

  // Update chart data processing
  const chartData = useMemo(() => {
    try {
      return symbolData
        .map(item => {
          const itemDate = normalizeDate(item.Date);
          const trade = trades.find(t => normalizeDate(t['Date of Trade']) === itemDate);
          const split = stockSplits.find(s => normalizeDate(s.date) === itemDate);
          
          return {
            date: itemDate,
            price: Number(item.Close),
            trade: trade ? {
              action: trade['Action'],
              price: Number(trade['Price ($)']),
              quantity: Number(trade['Quantity']),
              amount: Number(trade['Amount ($)']),
              type: trade['Type']
            } : undefined,
            split: split?.stock_split
          };
        })
        .sort((a, b) => a.date - b.date); // Sort by date in ascending order
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [];
    }
  }, [symbolData, trades, stockSplits]);

  // Custom tooltip with improved trade display
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const date = new Date(label);
    const trade = trades.find(t => normalizeDate(t['Date of Trade']) === normalizeDate(date.toISOString()));
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
            <p className={trade['Type'] === 'Short' ? 'text-[#F23645]' : 'text-[#089981]'}>
              {trade['Action']}
            </p>
            <p>Size: {Math.abs(Number(trade['Quantity'])).toLocaleString()}</p>
            <p>Price: ${Number(trade['Price ($)']).toFixed(2)}</p>
            <p>Value: ${Math.abs(Number(trade['Amount ($)'])).toLocaleString()}</p>
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
              
              // Make trade dots more visible
              return (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={trade.type === 'Short' ? '#F23645' : '#089981'}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              );
            }}
            strokeWidth={2}
            animationBegin={0}
            animationDuration={500}
            animationEasing="ease"
            isAnimationActive={false}
          />
          {/* Remove trade markers */}
          {/* {trades.map((trade, index) => (
            <ReferenceDot
              key={`trade-${index}`}
              x={normalizeDate(trade['Date of Trade'])}
              y={Number(trade['Price ($)'])}
              r={6}
              fill={trade['Type'] === 'Short' ? '#F23645' : '#089981'}
              stroke="#ffffff"
              strokeWidth={1}
            />
          ))} */}
          {/* Stock splits */}
          {stockSplits.map((split, index) => (
            <ReferenceLine
              key={`split-${index}`}
              x={normalizeDate(split.date)}
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