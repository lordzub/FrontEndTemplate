import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trade } from './types'; // You'll need to move the Trade interface to a separate types file
import CandlestickChart from "./CandleStickChart";
import axios from 'axios';
import { useState, useEffect } from 'react';
import TradeChart from "./TradeChart";
interface SymbolSectionProps {
  portfolioMetrics: {
    symbolPositions: Map<string, {
      quantity: number;
      totalCost: number;
      averagePrice: number;
      trades: Trade[];
      lastPrice: number;
    }>;
  };
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string) => void;
}


const SymbolSection = ({ portfolioMetrics, selectedSymbol, setSelectedSymbol }: SymbolSectionProps) => 
  {

    const [trades, setTrades] = useState<Trade[]>([]);
    const [symbolData, setSymbolData] = useState<any>([]);
    const [stockSplits, setStockSplits] = useState<any>([]);
    useEffect(() => {
      if (selectedSymbol) {
        fetchSymbolData(selectedSymbol);
        fetchSymbolSplits(selectedSymbol);
      }
    }, [selectedSymbol]);


    
const fetchSymbolData = async (symbol: string) => {
  try {
    const response = await axios.get(`http://localhost:5000/get_symbol_data?symbol=${symbol}`);
    const data = response.data;
    setSymbolData([...data]);
    console.log(symbolData);
  } catch (error) {
    console.error('Error fetching symbol data:', error);
  }
};

const fetchSymbolSplits = async (symbol: string) => {
  try {
    const response = await axios.get(`http://localhost:5000/get_stock_splits?symbol=${symbol}`);
    const data = response.data;
    setStockSplits([...data]);
    console.log(data);
  } catch (error) {
    console.error('Error fetching symbol data:', error);
  }
};
  return (
    <div className="flex flex-col gap-4">
      {/* Symbol Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedSymbol || ''}
            onChange={(e) => {
              setSelectedSymbol(e.target.value);
              fetchSymbolData(e.target.value);
            }}
            className="w-full p-2 rounded bg-secondary hover:bg-secondary/80"
          >
            <option value="">Select a symbol</option>
            {Array.from(portfolioMetrics.symbolPositions.keys())
              .sort()
              .map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
          </select>
        </CardContent>
      </Card>

      {/* Symbol Details Card */}
      {selectedSymbol && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{selectedSymbol} Position Details</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const position = portfolioMetrics.symbolPositions.get(selectedSymbol);
                if (!position) return null;

                // Calculate position metrics from trades
                const metrics = position.trades.reduce((acc, trade) => {
                  const tradeAmount = parseInt(trade.size) * parseFloat(trade.price_per_lot);
                  if (trade.action.toLowerCase() === 'buy') {
                    acc.quantity += parseInt(trade.size);
                    acc.totalCost += tradeAmount;
                  } else if (trade.action.toLowerCase() === 'sell') {
                    acc.quantity -= parseInt(trade.size);
                    acc.totalCost -= tradeAmount;
                  }
                  return acc;
                }, { quantity: 0, totalCost: 0 });

                const currentValue = metrics.quantity * position.lastPrice;
                const averagePrice = metrics.quantity !== 0 ? Math.abs(metrics.totalCost / metrics.quantity) : 0;
                const profitLoss = metrics.totalCost - currentValue;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="text-lg font-semibold">{metrics.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Average Price</p>
                        <p className="text-lg font-semibold">${averagePrice.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-semibold">${Math.abs(metrics.totalCost).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Value</p>
                        <p className="text-lg font-semibold">${currentValue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Profit/Loss</p>
                        <p className={`text-lg font-semibold ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${profitLoss.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Charts Container */}
                    <div className="flex gap-4">
                      {/* Candlestick Chart */}
                      {/* <div className="w-full h-[800px]">
          <CandlestickChart symbolData={symbolData} trades={position.trades} stockSplits={stockSplits}/>
          </div> */}
          <div className="w-full h-[800px]">
          <TradeChart symbolData={symbolData} trades={position.trades} stockSplits={stockSplits}/>
          </div>

                   
   
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Trade History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-secondary">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Size</th>
                      <th className="px-6 py-3">Price</th>
                      <th className="px-6 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioMetrics.symbolPositions.get(selectedSymbol)?.trades?.map((trade, index) => (
                      <tr key={`${trade.order_no}-${index}`} className="border-b">
                        <td className="px-6 py-4">{trade.trade_date}</td>
                        <td className="px-6 py-4">{trade.action}</td>
                        <td className="px-6 py-4">{Number(trade.size).toLocaleString()}</td>
                        <td className="px-6 py-4">${Number(trade.price_per_lot).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</td>
                        <td className="px-6 py-4">${Number(trade.principal_amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
    </div>
  );
};

export default SymbolSection; 