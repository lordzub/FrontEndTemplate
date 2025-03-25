import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import TradeChart from "./TradeChart";
import { FormattedTrade } from './PortfolioSummary';

interface PriceChartProps {
  symbolData: any[];
  trades: FormattedTrade[];
  stockSplits: Array<{ date: string; stock_split: number }>;
}

const PriceChart = ({ symbolData, trades, stockSplits }: PriceChartProps) => {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Price History</CardTitle>
      </CardHeader>
      <CardContent className="h-[600px]">
        <TradeChart 
          symbolData={symbolData} 
          trades={trades || []} 
          stockSplits={stockSplits}
        />
      </CardContent>
    </Card>
  );
};

export default PriceChart; 