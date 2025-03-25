import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PortfolioMetrics } from "./types";

interface SymbolSelectorProps {
  portfolioMetrics: PortfolioMetrics;
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string) => void;
}

const SymbolSelector = ({ 
  portfolioMetrics, 
  selectedSymbol, 
  setSelectedSymbol 
}: SymbolSelectorProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>Symbol Selection</CardTitle>
      </CardHeader>
      <CardContent>
        <select
          value={selectedSymbol || ''}
          onChange={(e) => {
            setSelectedSymbol(e.target.value);
          }}
          className="w-full p-2 rounded bg-secondary hover:bg-secondary/80"
        >
          <option value="">Select a symbol</option>
          {portfolioMetrics?.symbolPositions && 
            Array.from(portfolioMetrics.symbolPositions.keys())
              .sort()
              .map((symbol, index) => (
                <option key={`${symbol}-${index}`} value={symbol}>
                  {symbol}
                </option>
              ))}
        </select>
        
        <div className="mt-2 text-xs text-muted-foreground">
          {portfolioMetrics?.symbolPositions ? 
            `Available symbols: ${Array.from(portfolioMetrics.symbolPositions.keys()).length}` : 
            'No symbols available - check portfolioMetrics data'}
        </div>
      </CardContent>
    </Card>
  );
};

export default SymbolSelector; 