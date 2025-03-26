import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PositionMetrics } from './types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import PriceChart from './PriceChart';
import TradeHistory from './TradeHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";

// Making the Trade interface more flexible to work with both data structures
interface PortfolioTrade {
  // Fields from the API/CSV
  'Date of Trade'?: string;
  'Action'?: string;
  'Symbol'?: string;
  'Quantity'?: number | string;
  'Price ($)'?: number | string;
  'Amount ($)'?: number | string;
  // Fields from the local interface
  trade_date?: string;
  action?: string;
  symbol?: string;
  size?: number;
  price_per_lot?: number;
  principal_amount?: number;
  settlement_date?: string;
  current_price?: number;
  // Allow any other properties
  [key: string]: any;
}

interface PortfolioSummaryProps {
  trades: PortfolioTrade[];
  refreshData?: () => Promise<void>;
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    value: number;
    profitLoss: number;
    profitLossPercentage: number;
    allocation: number;
    totalCost: number;
    averagePrice: number;
    lastTradePrice: number;
    currentPrice: number;
    isShort: boolean;
  }>;
}

// Add these interfaces near the top with other interfaces
interface SortConfig {
  key: keyof PortfolioMetrics['positions'][0] | null;
  direction: 'asc' | 'desc';
}

// Interface for PriceChart and TradeHistory components
export interface FormattedTrade {
  'Date of Trade': string;
  'Action': string;
  'Symbol': string;
  'Quantity': number;
  'Price ($)': number;
  'Amount ($)': number;
  'settlement_date': string;
  'Type': string;
  'Description': string;
  'Commission ($)': number;
  'Fees ($)': number;
  'Accrued Interest ($)': number;
  'Cash Balance ($)': number;
  'Settlement Date': string;
  'Trade Confirmation'?: string;
  'Trade_ID'?: string;
  'original_symbol'?: string;
  'original_trade_date'?: string;
  'split_adjustment_factor'?: number;
  'unadjusted_price'?: number;
  'unadjusted_quantity'?: number;
  'Current Price'?: number;
}

interface Position {
    "% Total Gain/Loss": number;
    "Acquired": string;
    "Average Cost Basis": number;
    "Current Price": number;
    "Quantity": number;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ trades, refreshData }) => {
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (trades && trades.length > 0) {
      calculatePortfolioMetrics(trades);
    }
  }, [trades]);

  // Helper function to get the appropriate field from the trade object
  const getTradeField = (trade: PortfolioTrade, field: string, defaultValue: any = 0) => {
    // Try standard CSV format first
    if (trade[field] !== undefined) {
      return trade[field];
    }

    // Try different field mappings based on the structure
    const fieldMappings: Record<string, string[]> = {
      'Symbol': ['symbol'],
      'Quantity': ['size'],
      'Price ($)': ['price_per_lot'],
      'Amount ($)': ['principal_amount'],
      'Action': ['action'],
      'Date of Trade': ['trade_date']
    };

    // Check alternative field names
    const alternateFields = fieldMappings[field] || [];
    for (const altField of alternateFields) {
      if (trade[altField] !== undefined) {
        return trade[altField];
      }
    }

    return defaultValue;
  };

  // Helper function to convert trades to the format expected by PriceChart and TradeHistory
  const formatTradesForComponents = (trades: PortfolioTrade[]): FormattedTrade[] => {
    return trades.map(trade => {
      const action = getTradeField(trade, 'Action', '').toString().toLowerCase();
      const isShort = action.includes('sold short');
      
      return {
        'Date of Trade': getTradeField(trade, 'Date of Trade', '').toString(),
        'Action': getTradeField(trade, 'Action', '').toString(),
        'Symbol': getTradeField(trade, 'Symbol', '').toString(),
        'Quantity': Number(getTradeField(trade, 'Quantity', 0)),
        'Price ($)': Number(getTradeField(trade, 'Price ($)', 0)),
        'Amount ($)': Number(getTradeField(trade, 'Amount ($)', 0)),
        'settlement_date': trade.settlement_date || trade['Settlement Date'] || '',
        'Type': trade['Type'] || (isShort ? 'Short' : 'Long'),
        'Description': trade['Description'] || '',
        'Commission ($)': Number(trade['Commission ($)'] || 0),
        'Fees ($)': Number(trade['Fees ($)'] || 0),
        'Accrued Interest ($)': Number(trade['Accrued Interest ($)'] || 0),
        'Cash Balance ($)': Number(trade['Cash Balance ($)'] || 0),
        'Settlement Date': trade['Settlement Date'] || trade.settlement_date || '',
        'Trade Confirmation': trade['Trade Confirmation'] || '',
        'Trade_ID': trade['Trade_ID'] || '',
        'original_symbol': trade['original_symbol'] || '',
        'original_trade_date': trade['original_trade_date'] || '',
        'split_adjustment_factor': Number(trade['split_adjustment_factor'] || 1),
        'unadjusted_price': Number(trade['unadjusted_price'] || trade['Price ($)'] || 0),
        'unadjusted_quantity': Number(trade['unadjusted_quantity'] || trade['Quantity'] || 0),
        'Current Price': Number(trade['Current Price'] || 0)
      };
    });
  };

  const calculatePortfolioMetrics = (trades: PortfolioTrade[]) => {
    try {
      // Group trades by symbol
      const symbolsMap = new Map<string, PortfolioTrade[]>();
      
      trades.forEach(trade => {
        const symbol = getTradeField(trade, 'Symbol', '').toString();
        if (!symbol) return; // Skip trades without symbol

        if (!symbolsMap.has(symbol)) {
          symbolsMap.set(symbol, []);
        }
        symbolsMap.get(symbol)?.push(trade);
      });

      // Calculate metrics for each symbol
      const positions: {
        symbol: string;
        quantity: number;
        totalCost: number;
        value: number;
        profitLoss: number;
        profitLossPercentage: number;
        allocation: number;
        averagePrice: number;
        lastTradePrice: number;
        currentPrice: number;
        isShort: boolean;
      }[] = [];

      let totalPortfolioValue = 0;
      let totalPortfolioCost = 0;
      let totalProfitLoss = 0;

      // Process each symbol's trades
      symbolsMap.forEach((symbolTrades, symbol) => {
        // Find the current price for this symbol (use the first trade with current_price if available)
        const currentPriceTrade = symbolTrades.find(trade => trade.current_price);
        const currentPrice = currentPriceTrade?.current_price || 0;
        
        // Calculate position metrics using logic from PositionDetails component
        const metrics = symbolTrades.reduce((acc: PositionMetrics, trade: PortfolioTrade) => {
          const quantity = Number(getTradeField(trade, 'Quantity', 0));
          const price = Number(getTradeField(trade, 'Price ($)', 0));
          const amount = Number(getTradeField(trade, 'Amount ($)', 0));
          const action = getTradeField(trade, 'Action', '').toString().toLowerCase();

          // Handle different types of actions
          if (action.includes('buy')) {
            // Regular buy (long position)
            acc.quantity += quantity;
            acc.totalCost += Math.abs(amount);
          } else if (action.includes('sell')) {
            // Regular sell (closing long position)
            acc.quantity -= quantity;
            acc.totalCost -= Math.abs(amount);
          } else if (action.includes('sold short')) {
            // Opening a short position
            acc.quantity -= quantity; // Negative quantity for shorts
            acc.totalCost -= quantity * price; // Record proceeds from short sale
            acc.isShort = true;
          } else if (action.includes('bought short')) {
            // Closing a short position
            acc.quantity += -quantity; // Reduce short position
            acc.totalCost += -quantity * price; // Record cost to close short
          }
          
          // Keep track of the latest trade price
          acc.lastTradePrice = price;
          // Store current price if available
          if (currentPrice > 0) {
            acc.currentPrice = currentPrice;
          }
          
          return acc;
        }, { 
          quantity: 0, 
          totalCost: 0,
          lastTradePrice: 0,
          currentPrice: currentPrice,
          isShort: false
        });

        const isShortPosition = metrics.isShort || metrics.quantity < 0;
        
        // Use current price for value calculation if available, otherwise fall back to last trade price
        const priceForValuation = metrics.currentPrice > 0 ? metrics.currentPrice : metrics.lastTradePrice;
        
        // Current value of the position
        const currentValue = metrics.quantity * priceForValuation;
        
        // Calculate average entry price
        const averagePrice = metrics.quantity !== 0 ? 
          Math.abs(metrics.totalCost / metrics.quantity) : 0;
        
        // Calculate P/L for short positions correctly
        let profitLoss = 0;
        let profitLossPercentage = 0;

        if (isShortPosition) {
          profitLoss = Math.abs(metrics.totalCost) - Math.abs(currentValue);
          profitLossPercentage = (profitLoss / Math.abs(metrics.totalCost)) * 100;
        } else {
          profitLoss = currentValue - metrics.totalCost;
          profitLossPercentage = (profitLoss / metrics.totalCost) * 100;
        }

        // Add to positions array
        if (metrics.quantity !== 0) {
          positions.push({
            symbol,
            quantity: metrics.quantity,
            totalCost: metrics.totalCost,
            value: Math.abs(currentValue),
            profitLoss,
            profitLossPercentage,
            allocation: 0,
            lastTradePrice: metrics.lastTradePrice,
            currentPrice: metrics.currentPrice,
            isShort: isShortPosition,
            averagePrice: averagePrice,
          });

          // Add to portfolio totals
          totalPortfolioValue += Math.abs(currentValue);
          totalPortfolioCost += Math.abs(metrics.totalCost);
          totalProfitLoss += profitLoss;
        }
      });

      // Calculate allocation percentages
      positions.forEach(position => {
        position.allocation = (position.value / totalPortfolioValue) * 100;
      });

      // Sort positions by allocation (descending)
      positions.sort((a, b) => b.allocation - a.allocation);

      // Calculate annualized return
      // Identify earliest trade date to calculate holding period
      let earliestDate = new Date();
      trades.forEach(trade => {
        const tradeDateStr = getTradeField(trade, 'Date of Trade', '').toString();
        if (tradeDateStr) {
          const tradeDate = new Date(tradeDateStr);
          if (tradeDate < earliestDate) {
            earliestDate = tradeDate;
          }
        }
      });

      const holdingPeriodInDays = Math.max(1, (new Date().getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
      const holdingPeriodInYears = holdingPeriodInDays / 365;
      
      // Calculate annualized return using the P&L based on current prices
      const totalReturn = totalProfitLoss / totalPortfolioCost;
      const annualizedReturn = Math.pow(1 + totalReturn, 1 / holdingPeriodInYears) - 1;

      // Calculate maximum drawdown (simplified version)
      const maxDrawdown = calculateMaxDrawdown(trades);

      // Calculate volatility based on daily returns
      const volatility = calculateVolatility(trades);
      
      // Calculate Sharpe Ratio (simplified)
      const riskFreeRate = 0.04; // Assume 4% risk-free rate
      const sharpeRatio = (annualizedReturn - riskFreeRate) / volatility;

      // Calculate portfolio P&L percentage using current values
      const profitLossPercentage = totalPortfolioCost > 0 ? (totalProfitLoss / totalPortfolioCost) * 100 : 0;

      setPortfolioMetrics({
        totalValue: totalPortfolioValue,
        totalCost: totalPortfolioCost,
        totalProfitLoss,
        profitLossPercentage,
        annualizedReturn: annualizedReturn * 100,
        maxDrawdown: maxDrawdown * 100,
        volatility: volatility * 100,
        sharpeRatio,
        positions: positions.map(p => ({
          symbol: p.symbol,
          quantity: p.quantity,
          value: p.value,
          profitLoss: p.profitLoss,
          profitLossPercentage: p.profitLossPercentage,
          allocation: p.allocation,
          totalCost: p.totalCost,
          averagePrice: p.averagePrice,
          lastTradePrice: p.lastTradePrice,
          currentPrice: p.currentPrice,
          isShort: p.isShort
        }))
      });

      setLoading(false);
    } catch (err) {
      console.error('Error calculating portfolio metrics:', err);
      setError('Failed to calculate portfolio metrics');
      setLoading(false);
    }
  };

  // Simplified calculation for maximum drawdown
  const calculateMaxDrawdown = (trades: PortfolioTrade[]): number => {
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(getTradeField(a, 'Date of Trade', '').toString()).getTime();
      const dateB = new Date(getTradeField(b, 'Date of Trade', '').toString()).getTime();
      return dateA - dateB;
    });
    
    // Calculate cumulative portfolio value over time
    const portfolioValues: number[] = [];
    let runningValue = 0;
    
    sortedTrades.forEach(trade => {
      const amount = Number(getTradeField(trade, 'Amount ($)', 0));
      runningValue += amount;
      portfolioValues.push(runningValue);
    });
    
    // Calculate maximum drawdown
    let maxValue = portfolioValues[0];
    let maxDrawdown = 0;
    
    portfolioValues.forEach(value => {
      if (value > maxValue) {
        maxValue = value;
      }
      
      const drawdown = (maxValue - value) / maxValue;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    return maxDrawdown;
  };

  // Add the calculateVolatility function before calculateMaxDrawdown
  const calculateVolatility = (trades: PortfolioTrade[]): number => {
    try {
      // Sort trades by date
      const sortedTrades = [...trades].sort((a, b) => {
        const dateA = new Date(getTradeField(a, 'Date of Trade', '').toString()).getTime();
        const dateB = new Date(getTradeField(b, 'Date of Trade', '').toString()).getTime();
        return dateA - dateB;
      });

      // Calculate daily portfolio values
      const dailyValues = new Map<string, number>();
      let runningValue = 0;

      sortedTrades.forEach(trade => {
        const dateStr = getTradeField(trade, 'Date of Trade', '').toString();
        const amount = Number(getTradeField(trade, 'Amount ($)', 0));
        const price = Number(getTradeField(trade, 'Price ($)', 0));
        const quantity = Number(getTradeField(trade, 'Quantity', 0));
        const action = getTradeField(trade, 'Action', '').toString().toLowerCase();

        // Update running value based on trade
        if (action.includes('buy') || action.includes('bought')) {
          runningValue += quantity * price;
        } else if (action.includes('sell') || action.includes('sold')) {
          runningValue -= quantity * price;
        }

        // Store end-of-day value
        dailyValues.set(dateStr, runningValue);
      });

      // Convert to array of daily values
      const values = Array.from(dailyValues.values());

      // Calculate daily returns
      const returns: number[] = [];
      for (let i = 1; i < values.length; i++) {
        const dailyReturn = (values[i] - values[i - 1]) / values[i - 1];
        returns.push(dailyReturn);
      }

      // Calculate standard deviation of returns
      if (returns.length < 2) return 0;

      const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
      const squaredDiffs = returns.map(val => Math.pow(val - mean, 2));
      const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (returns.length - 1);
      const dailyVolatility = Math.sqrt(variance);

      // Annualize volatility (multiply by sqrt of trading days)
      const annualizedVolatility = dailyVolatility * Math.sqrt(252); // 252 trading days in a year

      return annualizedVolatility;
    } catch (error) {
      console.error('Error calculating volatility:', error);
      return 0;
    }
  };

  // Add this sorting function with proper type assertions
  const sortedPositions = React.useMemo(() => {
    if (!portfolioMetrics?.positions || !sortConfig.key) return portfolioMetrics?.positions;

    return [...portfolioMetrics.positions].sort((a, b) => {
      if (sortConfig.key === null) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [portfolioMetrics?.positions, sortConfig]);

  // Add this sort handler
  const handleSort = (key: keyof PortfolioMetrics['positions'][0]) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  if (loading) return <div>Loading portfolio metrics...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!portfolioMetrics) return <div>No portfolio data available</div>;

  // Get the filtered trades for the expanded symbol
  const getSymbolTrades = (symbol: string | null) => {
    if (!symbol) return [];
    return trades.filter(trade => getTradeField(trade, 'Symbol', '') === symbol);
  };

  // Calculate long positions summary
  const longSummary = {
    totalQuantity: portfolioMetrics.positions.filter(p => !p.isShort).reduce((sum, pos) => sum + pos.quantity, 0),
    totalValue: portfolioMetrics.positions.filter(p => !p.isShort).reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0),
    totalCost: portfolioMetrics.positions.filter(p => !p.isShort).reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0),
    averageCost: portfolioMetrics.positions.filter(p => !p.isShort).length > 0 
        ? portfolioMetrics.positions.filter(p => !p.isShort).reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0) / 
          portfolioMetrics.positions.filter(p => !p.isShort).reduce((sum, pos) => sum + pos.quantity, 0)
        : 0,
    totalGainLoss: portfolioMetrics.positions.filter(p => !p.isShort).reduce((sum, pos) => {
        return sum + ((pos.currentPrice - pos.averagePrice) * pos.quantity);
    }, 0),
  };

  // Calculate short positions summary
  const shortSummary = {
    totalQuantity: portfolioMetrics.positions.filter(p => p.isShort).reduce((sum, pos) => sum + pos.quantity, 0), // Already negative
    totalValue: portfolioMetrics.positions.filter(p => p.isShort).reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0),
    totalCost: portfolioMetrics.positions.filter(p => p.isShort).reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0),
    averageCost: portfolioMetrics.positions.filter(p => p.isShort).length > 0
        ? portfolioMetrics.positions.filter(p => p.isShort).reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0) / 
          portfolioMetrics.positions.filter(p => p.isShort).reduce((sum, pos) => sum + pos.quantity, 0)
        : 0,
    totalGainLoss: portfolioMetrics.positions.filter(p => p.isShort).reduce((sum, pos) => {
        // For shorts, profit is made when price goes down
        return sum + ((pos.averagePrice - pos.currentPrice) * Math.abs(pos.quantity));
    }, 0),
  };

  // Overall portfolio metrics
  const overallSummary = {
    netQuantity: longSummary.totalQuantity + shortSummary.totalQuantity,
    totalValue: longSummary.totalValue + Math.abs(shortSummary.totalValue),
    totalGainLoss: longSummary.totalGainLoss + shortSummary.totalGainLoss,
    rateOfReturn: ((longSummary.totalGainLoss + shortSummary.totalGainLoss) / 
        (Math.abs(longSummary.totalCost) + Math.abs(shortSummary.totalCost))) * 100
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Portfolio Summary</h2>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Current Portfolio Value: {portfolioMetrics?.totalValue.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
          })}</p>
          <p className="text-2xl font-semibold">
            Overall P&L: <span className={overallSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}>
              {overallSummary.totalGainLoss.toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
              })}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Summary Card */}
        <Card className="col-span-full">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <CardTitle>Overall Portfolio Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net Position</p>
                <p className="text-2xl font-bold">{overallSummary.netQuantity}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{portfolioMetrics?.totalValue.toLocaleString(undefined, {
                  style: 'currency',
                  currency: 'USD',
                })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${overallSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {overallSummary.totalGainLoss.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rate of Return</p>
                <p className={`text-2xl font-bold ${overallSummary.rateOfReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {overallSummary.rateOfReturn.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Long and Short Summary Cards */}
        <Card>
          <CardHeader className="bg-green-600 text-white rounded-t-lg">
            <CardTitle>Long Positions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-xl font-semibold">{longSummary.totalQuantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Cost</p>
                  <p className="text-xl font-semibold">{longSummary.averageCost.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-semibold">{longSummary.totalValue.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <p className={`text-xl font-semibold ${longSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {longSummary.totalGainLoss.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-red-600 text-white rounded-t-lg">
            <CardTitle>Short Positions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shares</p>
                  <p className="text-xl font-semibold">{shortSummary.totalQuantity}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Cost</p>
                  <p className="text-xl font-semibold">{shortSummary.averageCost.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-xl font-semibold">{Math.abs(shortSummary.totalValue).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  <p className={`text-xl font-semibold ${shortSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {shortSummary.totalGainLoss.toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-3">
          <Tabs defaultValue="long" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="long">Long Positions</TabsTrigger>
              <TabsTrigger value="short">Short Positions</TabsTrigger>
            </TabsList>
            <TabsContent value="long" className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acquired</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost Basis</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>Gain/Loss</TableHead>
                    <TableHead>% G/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioMetrics.positions.filter(p => !p.isShort).map((position, index) => {
                    const marketValue = position.quantity * position.currentPrice;
                    const costBasis = position.quantity * position.averagePrice;
                    const gainLoss = marketValue - costBasis;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{new Date(position.settlement_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</TableCell>
                        <TableCell>{position.quantity}</TableCell>
                        <TableCell>{position.averagePrice.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}</TableCell>
                        <TableCell>{position.currentPrice.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}</TableCell>
                        <TableCell>{marketValue.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}</TableCell>
                        <TableCell className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                          {gainLoss.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </TableCell>
                        <TableCell className={position.profitLossPercentage >= 0 ? "text-green-600" : "text-red-600"}>
                          {position.profitLossPercentage.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="short" className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acquired</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost Basis</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Market Value</TableHead>
                    <TableHead>Gain/Loss</TableHead>
                    <TableHead>% G/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolioMetrics.positions.filter(p => p.isShort).map((position, index) => {
                    const marketValue = Math.abs(position.quantity) * position.currentPrice;
                    const costBasis = Math.abs(position.quantity) * position.averagePrice;
                    // For shorts, profit is made when price goes down
                    const gainLoss = (position.averagePrice - position.currentPrice) * Math.abs(position.quantity);
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{new Date(position.settlement_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}</TableCell>
                        <TableCell>{position.quantity}</TableCell>
                        <TableCell>{position.averagePrice.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}</TableCell>
                        <TableCell>{position.currentPrice.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}</TableCell>
                        <TableCell>{marketValue.toLocaleString(undefined, {
                          style: 'currency',
                          currency: 'USD',
                        })}</TableCell>
                        <TableCell className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                          {gainLoss.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </TableCell>
                        <TableCell className={position.profitLossPercentage >= 0 ? "text-green-600" : "text-red-600"}>
                          {position.profitLossPercentage.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default PortfolioSummary; 