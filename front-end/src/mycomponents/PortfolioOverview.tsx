import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import CandlestickChart from "./CandleStickChart";
interface PortfolioOverviewProps {
  assetAllocationData: { name: string; value: number }[];
  cumulativeReturnData: { date: string; return: number }[];
}

const PortfolioOverview = ({ assetAllocationData, cumulativeReturnData }: PortfolioOverviewProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             
      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent>
       
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetAllocationData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            <h3 className="text-2xl font-bold">$50,000</h3>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Profit/Loss</p>
            <h3 className="text-2xl font-bold text-green-600">+$5,000 (10%)</h3>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Average Return per Trade</p>
            <h3 className="text-2xl font-bold">$500</h3>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <h3 className="text-2xl font-bold">60%</h3>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Largest Gain/Loss</p>
            <div className="flex justify-between">
              <span className="text-green-600">+$2,000</span>
              <span className="text-red-600">-$1,000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Cumulative Return</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeReturnData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis 
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Line 
                type="monotone" 
                dataKey="return" 
                stroke="#8884d8" 
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioOverview; 