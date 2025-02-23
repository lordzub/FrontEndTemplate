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
const ReactApexChart = lazy(() => import('react-apexcharts'));

// Separate data processing logic
const processChartData = (data: TradeData[]) => {
  return data.map(item => ({
    x: new Date(item.Date).getTime(),
    y: [item.Open, item.High, item.Low, item.Close]
  }));
};



const CandlestickChart: React.FC<CandlestickChartProps> = React.memo(({ trades, symbolData, stockSplits }) => {
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
  // Add split adjustment function
const getAdjustedTrade = useCallback((trade: Trade) => {
  const tradeDate = new Date(trade.trade_date);
  
  // Find any splits that occurred after this trade
  const applicableSplits = stockSplits.filter(split => 
    new Date(split.date) > tradeDate
  );
  
  // Calculate the cumulative split factor
  const splitFactor = applicableSplits.reduce((factor, split) => 
    factor * (1 / split.stock_split), 1
  );
  
  // Adjust the trade values
  return {
    ...trade,
    size: trade.size * splitFactor,
    price: (parseFloat(trade.price) * splitFactor).toString(),
    principal_amount: (parseFloat(trade.principal_amount) / splitFactor).toString()
  };
}, [stockSplits]);

  // Calculate initial visible range based on trade dates
  const [visibleRange] = useState(() => {
    if (!trades.length) return {
      min: new Date().getTime() - (86400000 * 90), // fallback to 90 days
      max: new Date().getTime()
    };

    const tradeDates = trades.map(trade => new Date(trade.trade_date).getTime());
    const minTradeDate = Math.min(...tradeDates);
    const maxTradeDate = Math.max(...tradeDates);
    
    // Add some padding (7 days before first trade and after last trade)
    return {
      min: minTradeDate - (86400000 * 7),
      max: maxTradeDate + (86400000 * 7)
    };
  });

  // Process data with error handling
  const chartData = useMemo(() => {
    try {
      const processed = symbolData.map(item => ({
        x: new Date(item.Date).getTime(),
        y: [
          Number(item.Open),
          Number(item.High),
          Number(item.Low),
          Number(item.Close)
        ]
      }));
      console.log('Processed chart data:', processed);
      return processed;
    } catch (error) {
      console.error('Error processing chart data:', error);
      return [];
    }
  }, [symbolData]);

  // Memoize chart options
  const options = useMemo(() => ({
    chart: {
      type: 'candlestick',
      height: 800,
      animations: { enabled: false },
      background: '#131722',
      foreColor: '#B2B5BE',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: {
        enabled: true,
        type: 'x',  
        autoScaleYaxis: true
      },
    },
    grid: {
      show: true,
      borderColor: '#2A2E39',
      strokeDashArray: 1,
      position: 'back',
      xaxis: {
        lines: {
          show: true,
          color: '#2A2E39'
        }
      },
      yaxis: {
        lines: {
          show: true,
          color: '#2A2E39'
        }
      }
    },
    xaxis: {
      type: 'datetime',
      min: visibleRange.min,
      max: visibleRange.max,
      labels: {
        datetimeUTC: false,
        style: {
          colors: '#B2B5BE',
          fontSize: '12px',
          fontWeight: 500
        }
      },
      axisBorder: {
        show: true,
        color: '#2A2E39'
      },
      axisTicks: {
        show: true,
        color: '#2A2E39'
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        formatter: (value: number) => value.toFixed(2),
        style: {
          colors: '#B2B5BE',
          fontSize: '12px',
          fontWeight: 500
        }
      },
      floating: false,
      axisBorder: {
        show: true,
        color: '#2A2E39'
      },
      axisTicks: {
        show: true,
        color: '#2A2E39'
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#089981',
          downward: '#F23645'
        },
        wick: {
          useFillColor: true
        }
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif'
      },
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
        const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
        const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
        const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
        const date = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]);
        
        // Find and adjust trade if it exists
        const trade = trades.find(t => 
          new Date(t.trade_date).getTime() === date.getTime()
        );
        
        const adjustedTrade = trade ? getAdjustedTrade(trade) : null;

        const tradeInfo = adjustedTrade ? `
          <div style="margin-top: 8px; border-top: 1px solid #2A2E39; padding-top: 8px;">
            <div>${adjustedTrade.action} Trade</div>
            <div>Size: ${Math.round(adjustedTrade.size)}</div>
            <div>Price: $${adjustedTrade.price}</div>
            <div>Value: $${adjustedTrade.principal_amount}</div>
          </div>
        ` : '';

        return `
          <div class="apexcharts-tooltip-box" style="padding: 8px;">
            <div style="margin-bottom: 4px">${date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
            })}</div>
            <div>O: $${o.toFixed(2)}</div>
            <div>H: $${h.toFixed(2)}</div>
            <div>L: $${l.toFixed(2)}</div>
            <div>C: $${c.toFixed(2)}</div>
            ${tradeInfo}
          </div>
        `;
      }
    },
    annotations: {
      points: trades.map(trade => {
        const adjustedTrade = getAdjustedTrade(trade);
        return {
          x: new Date(trade.trade_date).getTime(),
          y: parseFloat(adjustedTrade.price),
          marker: {
            size: 5,
            fillColor: trade.action === 'Buy' ? '#089981' : '#F23645',
            strokeColor: '#fff',
            strokeWidth: 2,
          },
          label: {
            borderColor: '#c2c2c2',
            offsetY: 0,
            style: {
              color: '#fff',
              background: trade.action === 'Buy' ? '#089981' : '#F23645',
            },
            text: new Date(trade.trade_date).toLocaleDateString(),
            textAnchor: 'start',
            position: 'top',
            orientation: 'vertical'
          }
        };
      })
    },
  }), [trades, getAdjustedTrade]);

  const series = useMemo(() => [{
    data: chartData
  }], [chartData]);

  return (

        <div className="h-[500px] w-full">
          <Suspense fallback={<div>Loading chart...</div>}>
            <ReactApexChart
              options={options}
              series={series}
              type="candlestick"
              height="100%"
              width="100%"
            />
          </Suspense>
        </div>

  );
});

export default CandlestickChart;