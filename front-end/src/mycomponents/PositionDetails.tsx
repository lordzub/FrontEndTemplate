import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { SymbolPosition, Trade, PositionMetrics } from "./types";

interface PositionDetailsProps {
  symbol: string;
  position: SymbolPosition | undefined;
}

const PositionDetails = ({ symbol, position }: PositionDetailsProps) => {
  if (!position) return null;

  // Calculate position metrics from trades with corrected logic for short positions
  const metrics = position.trades.reduce((acc: PositionMetrics, trade: Trade, index: number) => {


    const quantity = Number(trade['unadjusted_quantity'],);
    const price = Number(trade['unadjusted_price']);
    const amount = quantity * price;
    const action = trade['Action'].toLowerCase();

 if (action.includes('sold short')) {
      //console.log('Processing SOLD SHORT action');
      acc.quantity += quantity; // Makes position negative for shorts
      acc.totalCost += Math.abs(amount); // Record proceeds from short sale
      acc.isShort = true;
    } else if (action.includes('bought short')) {
      //console.log('Processing BOUGHT SHORT action');
      acc.quantity -= quantity; // Reduce short position by subtracting a negative (same as adding)
      acc.totalCost -= Math.abs(amount); // Record cost to close short
    }
    
    acc.lastTradePrice = price;
    
    //console.log('Updated acc state:', { 
      quantity: acc.quantity,
      totalCost: acc.totalCost,
      lastTradePrice: acc.lastTradePrice,
      isShort: acc.isShort,
      action: action,
      tradeQuantity: quantity,
      tradeAmount: amount
    });
    
    return acc;
  }, { 
    quantity: 0, 
    totalCost: 0,
    lastTradePrice: 0,
    isShort: false
  });

  //console.log('\n--- Final Position Calculations ---');
  const isShortPosition = metrics.isShort || metrics.quantity < 0;
  //console.log('Is Short Position:', isShortPosition);
  
  const currentValue = metrics.quantity * metrics.lastTradePrice;
  //console.log('Current Value Calculation:', {
    quantity: metrics.quantity,
    lastTradePrice: metrics.lastTradePrice,
    currentValue: currentValue
  });
  
  const averagePrice = metrics.quantity !== 0 ? 
    Math.abs(metrics.totalCost / Math.abs(metrics.quantity)) : 0;
  //console.log('Average Price Calculation:', {
    totalCost: metrics.totalCost,
    quantity: metrics.quantity,
    averagePrice: averagePrice
  });
  
  let profitLoss = 0;
  
  if (isShortPosition) {
    // For shorts: P&L = Initial proceeds (totalCost) - Current value of position
    // Note: quantity is negative for shorts, so we use abs
    const currentPositionValue = Math.abs(metrics.quantity) * metrics.lastTradePrice;
    profitLoss = metrics.totalCost - currentPositionValue;
    //console.log('Short Position P/L Calculation:', {
      totalCost: metrics.totalCost,
      currentPositionValue,
      quantity: metrics.quantity,
      lastTradePrice: metrics.lastTradePrice,
      profitLoss: profitLoss
    });
  } else {
    profitLoss = currentValue - metrics.totalCost;
    //console.log('Long Position P/L Calculation:', {
      currentValue: currentValue,
      totalCost: metrics.totalCost,
      profitLoss: profitLoss
    });
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>{symbol} Position Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 w-full">
            <div>
              <p className="text-sm text-muted-foreground">Position Type</p>
              <p className="text-lg font-semibold">{isShortPosition ? 'Short' : 'Long'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="text-lg font-semibold">{Math.abs(metrics.quantity).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Price</p>
              <p className="text-lg font-semibold">
                ${averagePrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Trade Price</p>
              <p className="text-lg font-semibold">
                ${metrics.lastTradePrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-lg font-semibold">
                ${Math.abs(metrics.totalCost).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-lg font-semibold">
                ${Math.abs(currentValue).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Profit/Loss</p>
              <p className={`text-lg font-semibold ${profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${profitLoss.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PositionDetails; 