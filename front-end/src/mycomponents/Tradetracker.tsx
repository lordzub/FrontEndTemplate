import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import mockTrades from './MockTrades';
import SymbolSection from './SymbolSection';
import PortfolioOverview from './PortfolioOverview';

interface Trade {
  order_no: string;
  reference: string;
  trade_date: string;
  settlement_date: string;
  size: number;
  price_per_lot: number;
  action: 'Buy' | 'Sell';
  symbol: string;
  principal_amount: number;
  activity_assessment_fee: number;
  fileName: string;
  checked: string;
}

const TradeTracker = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const trades = mockTrades || [];
  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const metrics = {
      totalValue: 0,
      totalProfitLoss: 0,
      symbolPositions: new Map<string, {
        quantity: number,
        totalCost: number,
        averagePrice: number,
        trades: Trade[],
        lastPrice: number
      }>(),
      winRate: 0,
      largestGain: { amount: 0, symbol: '' },
      largestLoss: { amount: 0, symbol: '' }
    };

    if (!trades.length) return metrics;

    trades.forEach(trade => {
      const amount = trade.principal_amount;
      const position = metrics.symbolPositions.get(trade.symbol) || {
        quantity: 0,
        totalCost: 0,
        averagePrice: 0,
        trades: [],
        lastPrice: trade.price_per_lot
      };

      if (trade.action === 'Buy') {
        position.quantity += trade.size;
        position.totalCost += amount;
      } else {
        position.quantity -= trade.size;
        position.totalCost -= amount;
      }

      position.averagePrice = Math.abs(position.totalCost / position.quantity) || 0;
      position.lastPrice = trade.price_per_lot;
      position.trades.push(trade);
      metrics.symbolPositions.set(trade.symbol, position);

      // Track largest gains/losses
      const tradePL = trade.action === 'Sell' ? amount : -amount;
      if (tradePL > metrics.largestGain.amount) {
        metrics.largestGain = { amount: tradePL, symbol: trade.symbol };
      }
      if (tradePL < metrics.largestLoss.amount) {
        metrics.largestLoss = { amount: tradePL, symbol: trade.symbol };
      }
    });

    return metrics;
  }, [trades]);

  // Generate asset allocation data for pie chart
  const assetAllocationData = useMemo(() => {
    const data: { name: string; value: number }[] = [];
    portfolioMetrics.symbolPositions.forEach((position, symbol) => {
      if (position.quantity > 0) {
        data.push({
          name: symbol,
          value: Math.abs(position.totalCost)
        });
      }
    });
    return data;
  }, [portfolioMetrics]);

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="symbols">Symbols</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PortfolioOverview assetAllocationData={assetAllocationData} />
        </TabsContent>

        <TabsContent value="symbols">
          <SymbolSection 
            portfolioMetrics={portfolioMetrics}
            selectedSymbol={selectedSymbol}
            setSelectedSymbol={setSelectedSymbol}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradeTracker;
