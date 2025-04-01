import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ChevronDown, ChevronRight } from 'lucide-react';
import PriceChart from './PriceChart';
import TradeHistory from './TradeHistory';

// Making the Trade interface more flexible to work with both data structures
interface PortfolioTrade {
  // Fields from the API/CSV
  'Date of Trade'?: string;
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
  totalCost: number; // Represents the net cost basis of open positions
  totalProfitLoss: number; // Represents the unrealized P/L of open positions
  profitLossPercentage: number; // Overall portfolio unrealized P/L %
  positions: Array<{
    symbol: string;
    quantity: number;
    value: number; // Current market value (always positive)
    profitLoss: number; // Unrealized P/L for this position
    profitLossPercentage: number; // Unrealized P/L % for this position
    allocation: number;
    totalCost: number; // Net cost basis for this position
    averagePrice: number; // Average entry price
    lastTradePrice: number; // Last actual trade price (informational)
    currentPrice: number; // Current market price used for valuation
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
  'Symbol': string;
  'Quantity': number;
  'Price ($)': number;
  'Amount ($)': number;
  'Current Price'?: number;
}

// Interface for the accumulator in the reduce function
interface SymbolMetricsAccumulator {
  quantity: number;
  totalCost: number; // Net cost/proceeds. Positive for net cost (longs), negative for net proceeds (shorts).
  lastTradePrice: number; // Store the last actual trade price
  currentPrice: number; // Store the fetched current market price
  isShort: boolean; // Tracks if the position is currently short
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ trades, refreshData }) => {
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'value', direction: 'desc' }); // Default sort by value
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  useEffect(() => {
    if (trades && trades.length > 0) {
      calculatePortfolioMetrics(trades);
    } else {
      setLoading(false); // No trades, stop loading
      setPortfolioMetrics(null); // Reset metrics
    }
  }, [trades]);

  // Helper function to get the appropriate field from the trade object
  const getTradeField = (trade: PortfolioTrade | undefined, field: string, defaultValue: any = 0) => {
    if (!trade) return defaultValue; // Handle case where trade might be undefined

    // Prioritize specific API/CSV fields
    const specificFields: Record<string, string> = {
        'Symbol': 'Symbol',
        'Quantity': 'Quantity',
        'Price ($)': 'Price ($)',
        'Amount ($)': 'Amount ($)',
        'Date of Trade': 'Date of Trade',
        'Current Price': 'Current Price' // Added explicit check for 'Current Price'
    };

    if (specificFields[field] && trade[specificFields[field]] !== undefined) {
        // Ensure numeric fields are returned as numbers
        if (['Quantity', 'Price ($)', 'Amount ($)', 'Current Price'].includes(field)) {
            const value = Number(trade[specificFields[field]]);
            return isNaN(value) ? defaultValue : value;
        }
        return trade[specificFields[field]];
    }


    // Try alternative field mappings (e.g., from a different local structure)
    const fieldMappings: Record<string, string[]> = {
      'Symbol': ['symbol'],
      'Quantity': ['size'],
      'Price ($)': ['price_per_lot'],
      'Amount ($)': ['principal_amount'],
      'Action': ['action'],
      'Date of Trade': ['trade_date'],
      'Current Price': ['current_price'] // Map alternative current price field
    };

    const alternateFields = fieldMappings[field] || [];
    for (const altField of alternateFields) {
      if (trade[altField] !== undefined) {
         // Ensure numeric fields are returned as numbers
         if (['Quantity', 'Price ($)', 'Amount ($)', 'Current Price'].includes(field)) {
            const value = Number(trade[altField]);
            return isNaN(value) ? defaultValue : value;
         }
        return trade[altField];
      }
    }

    // Check if the field exists directly (case-sensitive might matter)
    if (trade[field] !== undefined) {
       // Ensure numeric fields are returned as numbers
       if (['Quantity', 'Price ($)', 'Amount ($)', 'Current Price'].includes(field)) {
            const value = Number(trade[field]);
            return isNaN(value) ? defaultValue : value;
        }
      return trade[field];
    }


    return defaultValue;
  };

  // Helper function to convert trades to the format expected by PriceChart and TradeHistory
  const formatTradesForComponents = (trades: PortfolioTrade[]): FormattedTrade[] => {
    // Assuming trades always contain the specific keys:
    // 'Date of Trade', 'Symbol', 'Quantity', 'Price ($)', 'Amount ($)', 'Current Price'
    return trades.map(trade => {
      // Direct access, ensuring numeric types
      const quantity = Number(trade['Quantity'] ?? 0);
      const price = Number(trade['Price ($)'] ?? 0);
      const amount = Number(trade['Amount ($)'] ?? 0);
      const currentPrice = Number(trade['Current Price'] ?? 0);
      const dateOfTrade = String(trade['Date of Trade'] ?? '');
      const symbol = String(trade['Symbol'] ?? '');

      return {
        'Date of Trade': dateOfTrade,
        'Symbol': symbol,
        'Quantity': quantity,
        'Price ($)': price,
        'Amount ($)': amount,
        'Current Price': currentPrice
      };
    });
  };

  const calculatePortfolioMetrics = (trades: PortfolioTrade[]) => {
    try {
        setLoading(true);
        setError(null); // Clear previous errors
      // Group trades by symbol
      const symbolsMap = new Map<string, PortfolioTrade[]>();

      trades.forEach(trade => {
        const symbol = getTradeField(trade, 'Symbol', '').toString();
        if (!symbol) return; // Skip trades without symbol

        // Ensure 'Current Price' exists and is treated as a number before adding
        const currentPrice = Number(getTradeField(trade, 'Current Price', 0));
        trade['Current Price'] = currentPrice; // Standardize access

        if (!symbolsMap.has(symbol)) {
          symbolsMap.set(symbol, []);
        }
        symbolsMap.get(symbol)?.push(trade);
      });

      // Calculate metrics for each symbol
      const positions: PortfolioMetrics['positions'] = [];

      let totalPortfolioValue = 0;
      let totalPortfolioNetCostBasis = 0; // Tracks the sum of net cost bases
      let totalPortfolioProfitLoss = 0; // Tracks the sum of unrealized P/L

      // Process each symbol's trades
      symbolsMap.forEach((symbolTrades, symbol) => {
        // Sort trades by date to process chronologically
        const sortedSymbolTrades = [...symbolTrades].sort((a, b) =>
          new Date(getTradeField(a, 'Date of Trade', 0)).getTime() - new Date(getTradeField(b, 'Date of Trade', 0)).getTime()
        );

        // Find the MOST RECENT trade for this symbol to get the LATEST Current Price.
        // We assume the latest trade object will have the most up-to-date Current Price.
        const latestTrade = sortedSymbolTrades[sortedSymbolTrades.length - 1];
        // Pass latestTrade (which could be undefined if sortedSymbolTrades is empty) to getTradeField
        const currentPrice = Number(getTradeField(latestTrade, 'Current Price', 0));


        // Initialize the accumulator for this symbol
        const initialAccumulator: SymbolMetricsAccumulator = {
          quantity: 0,
          totalCost: 0, // Represents the net cost basis
          lastTradePrice: 0,
          currentPrice: currentPrice, // Use the latest fetched current price
          isShort: false // Will be determined by the final quantity sign
        };

        // Calculate position metrics by reducing through sorted trades
        const metrics = sortedSymbolTrades.reduce((acc: SymbolMetricsAccumulator, trade: PortfolioTrade) => {
          const quantity = Number(getTradeField(trade, 'Quantity', 0));
          // Use the specific price from THIS trade for cost basis adjustment
          const price = Number(getTradeField(trade, 'Price ($)', 0));
          const action = getTradeField(trade, 'Action', '').toString().toLowerCase();

          // --- Refined Cost Basis & Quantity Logic ---
          let costChange = quantity * price; // Cost impact of this specific trade

          // Determine if it's opening/closing long/short based on action AND quantity sign
          // Note: quantity from trade data is positive for buys/covers, negative for sells/shorts


          if (  acc.quantity >= 0) { // Buy to open/add Long
              acc.totalCost += costChange; // Add cost (quantity * price)
              acc.quantity += quantity;
          } else if ( acc.quantity > 0) { // Sell to close/reduce Long
              if (acc.quantity !== 0) { // Avoid division by zero
                  const avgCost = acc.totalCost / acc.quantity;
                  // quantity here is negative from trade data, costChange is negative
                  acc.totalCost += quantity * avgCost; // Reduce cost basis proportionally (add negative adjustment)
              }
              acc.quantity += quantity; // Add negative quantity
          } else if (acc.quantity <= 0) { // Sell to open/add Short
              // Selling short adds proceeds (decreases cost basis / makes it more negative)
              // quantity is negative, price is positive, costChange is negative
              acc.totalCost += costChange; // Adding a negative number decreases cost basis
              acc.quantity += quantity; // Add negative quantity
          } else if (acc.quantity < 0) { // Buy to cover/reduce Short
              // Buying to cover short reduces proceeds (increases cost basis / makes it less negative)
               if (acc.quantity !== 0) {
                  const avgProceedsPrice = acc.totalCost / acc.quantity; // Should be positive (negative cost / negative qty)
                  // quantity is positive from trade data, costChange is positive
                  acc.totalCost += quantity * avgProceedsPrice; // Increase cost basis proportionally (add positive adjustment)
              }
              acc.quantity += quantity; // Add positive quantity towards zero
          } else {
               console.warn(`Unrecognized trade action/combination for ${symbol}: Action='${action}', Qty=${quantity}, Current Acc Qty=${acc.quantity}`);
          }


          // Correct quantity if it's extremely close to zero after adjustments
          if (Math.abs(acc.quantity) < 1e-9) {
              acc.quantity = 0;
          }
          // Reset totalCost if quantity becomes zero to avoid residual small numbers
          if (acc.quantity === 0) {
              acc.totalCost = 0;
          }


          acc.lastTradePrice = price; // Track the price of the last trade processed
          acc.isShort = acc.quantity < 0;

          return acc;
        }, initialAccumulator);

        // --- Post-Reduction Calculations ---

        // If quantity is zero, the position is closed, skip adding to open positions
        if (metrics.quantity === 0) {
            return; // Skip to next symbol
        }

        // *** STRICTLY use the currentPrice obtained from the LATEST trade data for valuation ***
        const priceForValuation = metrics.currentPrice;

        // Check if Current Price is valid before proceeding
        if (priceForValuation <= 0) {
          console.warn(`Symbol ${symbol}: Missing or invalid Current Price (${priceForValuation}) from latest trade data. Cannot calculate P/L accurately. Skipping position.`);
          // DO NOT FALL BACK TO LAST TRADE PRICE FOR VALUATION/PNL
          return; // Skip this position
        }

        const currentValue = metrics.quantity * priceForValuation; // Can be negative if short
        const marketValue = Math.abs(currentValue); // Always positive value for display

        // Average price calculation
        // For Longs (qty > 0, cost > 0): cost / qty = positive avg price
        // For Shorts (qty < 0, cost < 0): cost / qty = positive avg price (avg proceeds price)
        const averagePrice = metrics.quantity !== 0
            ? metrics.totalCost / metrics.quantity
            : 0;

        // Calculate Unrealized P/L = Current Value - Net Cost Basis
        const profitLoss = currentValue - metrics.totalCost;

        // Calculate P/L Percentage = P/L / Absolute Basis
        // Basis for longs is totalCost (positive net cost)
        // Basis for shorts is abs(totalCost) (positive net proceeds)
        const basisForPercent = Math.abs(metrics.totalCost);
        // Handle case where basis is zero (e.g., assignments, though unlikely with cost tracking)
        const profitLossPercentage = basisForPercent !== 0 ? (profitLoss / basisForPercent) * 100 : (profitLoss === 0 ? 0 : Infinity * Math.sign(profitLoss));


        // Add to positions array
        positions.push({
          symbol,
          quantity: metrics.quantity,
          totalCost: metrics.totalCost, // Net cost basis
          value: marketValue, // Current market value (positive)
          profitLoss, // Unrealized P/L
          profitLossPercentage, // Unrealized P/L %
          allocation: 0, // Calculate later
          averagePrice: averagePrice, // Average entry/proceeds price
          lastTradePrice: metrics.lastTradePrice, // Informational only
          currentPrice: metrics.currentPrice, // The CURRENT price used for valuation
          isShort: metrics.isShort,
        });

        // Add to portfolio totals
        totalPortfolioValue += marketValue; // Sum of absolute market values
        totalPortfolioNetCostBasis += metrics.totalCost; // Sum of net cost bases (can be negative)
        totalPortfolioProfitLoss += profitLoss; // Sum of unrealized P/L
      });

      // Calculate allocation percentages
      positions.forEach(position => {
        position.allocation = totalPortfolioValue > 0 ? (position.value / totalPortfolioValue) * 100 : 0;
      });

      // Sort positions (default by value descending, respects user selection)
      // Sorting logic is now handled by useMemo below, using the `positions` data calculated here.

      // Calculate overall portfolio P&L percentage = Total P/L / Total Absolute Basis
      // Total Absolute Basis is the sum of the absolute net cost basis of each position
      const totalAbsoluteBasis = positions.reduce((sum, p) => sum + Math.abs(p.totalCost), 0);
      const portfolioProfitLossPercentage = totalAbsoluteBasis > 0
        ? (totalPortfolioProfitLoss / totalAbsoluteBasis) * 100
        : (totalPortfolioProfitLoss === 0 ? 0 : Infinity * Math.sign(totalPortfolioProfitLoss));


      setPortfolioMetrics({
        totalValue: totalPortfolioValue,
        totalCost: totalPortfolioNetCostBasis, // Net cost basis of all open positions
        totalProfitLoss: totalPortfolioProfitLoss, // Total unrealized P/L
        profitLossPercentage: portfolioProfitLossPercentage, // Overall unrealized P/L %
        positions: positions // Includes all necessary calculated fields per position
      });

      setLoading(false);
    } catch (err) {
       console.error('Error calculating portfolio metrics:', err);
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
       setError(`Failed to calculate portfolio metrics: ${errorMessage}`);
       setLoading(false);
       setPortfolioMetrics(null); // Ensure metrics are cleared on error
    }
  };


  // Sorting logic using useMemo
  const sortedPositions = React.useMemo(() => {
    if (!portfolioMetrics?.positions) return []; // Return empty array if no positions

    const sortablePositions = [...portfolioMetrics.positions];

    if (!sortConfig.key) return sortablePositions; // No sort key, return as is

    sortablePositions.sort((a, b) => {
      const aValue = a[sortConfig.key!]; // Add non-null assertion
      const bValue = b[sortConfig.key!]; // Add non-null assertion

      // Handle non-numeric or potentially undefined values gracefully
      if (typeof aValue === 'number' && typeof bValue === 'number') {
          // Handle Infinity cases for percentage
          if (!isFinite(aValue) && isFinite(bValue)) return sortConfig.direction === 'asc' ? 1 : -1;
          if (isFinite(aValue) && !isFinite(bValue)) return sortConfig.direction === 'asc' ? -1 : 1;
          if (!isFinite(aValue) && !isFinite(bValue)) { // Both infinite
              if (aValue > 0 && bValue < 0) return sortConfig.direction === 'asc' ? 1 : -1; // +inf vs -inf
              if (aValue < 0 && bValue > 0) return sortConfig.direction === 'asc' ? -1 : 1; // -inf vs +inf
              return 0; // Both +inf or both -inf
          }
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Basic string comparison (case-sensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      // Add more type handling if needed (booleans, dates etc.)

      // Fallback for incomparable types or undefined values
       if (aValue < bValue) {
         return sortConfig.direction === 'asc' ? -1 : 1;
       }
       if (aValue > bValue) {
         return sortConfig.direction === 'asc' ? 1 : -1;
       }
       return 0;
    });

    return sortablePositions;
  }, [portfolioMetrics?.positions, sortConfig]);

  // Sort handler
  const handleSort = (key: keyof PortfolioMetrics['positions'][0]) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get the filtered trades for the expanded symbol
  const getSymbolTrades = (symbol: string | null) => {
    if (!symbol || !trades) return [];
    return trades.filter(trade => getTradeField(trade, 'Symbol', '') === symbol);
  };

  if (loading) return <div className="p-4 text-center">Loading portfolio metrics...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  // Updated message to be more informative if no positions are calculable
  if (!portfolioMetrics || portfolioMetrics.positions.length === 0) return <div className="p-4 text-center">No open positions found or calculable from the provided data (check for trades with valid 'Current Price').</div>;


  return (
    <Card className="col-span-3 shadow-md text-base">

      <CardContent className="p-4">
        {/* Improved Summary Cards: Total Value and Total P/L */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Total Market Value</h3>
            <p className="text-3xl font-bold">
              ${portfolioMetrics.totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>

          <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Total Unrealized P/L</h3>
            <p className={`text-3xl font-bold ${portfolioMetrics.totalProfitLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              ${portfolioMetrics.totalProfitLoss.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
              <span className="text-base ml-1 font-medium">
                ({isFinite(portfolioMetrics.profitLossPercentage) ? portfolioMetrics.profitLossPercentage.toFixed(2) + '%' : (portfolioMetrics.profitLossPercentage > 0 ? '+∞%' : '-∞%')})
              </span>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Open Positions ({sortedPositions.length})</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-base">
              <thead>
                <tr className="bg-green-600 text-white dark:bg-green-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-2 text-center w-8"></th> {/* Expander */}
                  {[
                    { key: 'symbol', label: 'Symbol', align: 'center' },
                    { key: 'quantity', label: 'Quantity', align: 'center' },
                    { key: 'value', label: 'Market Value', align: 'center' },
                    { key: 'profitLoss', label: 'Unrealized P/L', align: 'center' },
                    { key: 'profitLossPercentage', label: 'P/L %', align: 'center' },
                    { key: 'allocation', label: 'Allocation', align: 'center' }
                  ].map(({ key, label, align }) => (
                    <th
                      key={key}
                      className={`py-3 px-4 text-center font-medium cursor-pointer hover:bg-green-700 transition-colors`}
                      onClick={() => handleSort(key as keyof PortfolioMetrics['positions'][0])}
                    >
                      <div className={`flex items-center justify-center gap-1`}>
                        {label}
                        {sortConfig.key === key && (
                          <span className="text-sm ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPositions.length === 0 && (
                   <tr><td colSpan={7} className="text-center py-6 text-gray-500">No open positions.</td></tr>
                )}
                {sortedPositions.map((position) => (
                  <React.Fragment key={position.symbol}>
                    <tr
                      className="border-b cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                      onClick={() => setExpandedSymbol(expandedSymbol === position.symbol ? null : position.symbol)}
                    >
                      <td className="py-3 px-2 text-center">
                        {expandedSymbol === position.symbol ? (
                          <ChevronDown className="w-4 h-4 inline-block text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 inline-block text-gray-500" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{position.symbol}</td>
                       <td className={`text-center py-3 px-4 ${position.isShort ? 'text-red-600 dark:text-red-500' : ''}`}>
                           {position.quantity.toLocaleString()}
                       </td>
                      <td className="text-center py-3 px-4">${position.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</td>
                      <td className={`text-center py-3 px-4 ${position.profitLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        ${position.profitLoss.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                       <td className={`text-center py-3 px-4 ${position.profitLossPercentage >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                           {isFinite(position.profitLossPercentage) ? position.profitLossPercentage.toFixed(2) + '%' : (position.profitLossPercentage > 0 ? '+∞%' : '-∞%')}
                       </td>
                      <td className="text-center py-3 px-4">{position.allocation.toFixed(1)}%</td>
                    </tr>
                    {/* Expanded Row Details - Removed background color */}
                    {expandedSymbol === position.symbol && (
                      <tr>
                        <td colSpan={7} className="py-5 px-5 text-base">
                          <div className="space-y-6">
                            {/* Position Details Card */}
                            <Card className="shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <CardHeader className="bg-green-600 text-white dark:bg-green-900 py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                                <CardTitle className="text-lg font-medium">{position.symbol} Position Details</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                                  <DetailItem label="Position Type" value={position.isShort ? 'Short' : 'Long'} />
                                  <DetailItem label="Quantity" value={position.quantity.toLocaleString()} className={position.isShort ? 'text-red-600 dark:text-red-500' : ''}/>
                                  <DetailItem label="Average Price" value={position.averagePrice} format="currency" tooltip="Average price per share for longs, average proceeds per share for shorts." />
                                  <DetailItem label="Current Price" value={position.currentPrice} format="currency" />
                                  <DetailItem label="Market Value" value={position.value} format="currency" />
                                  <DetailItem label="Net Cost Basis" value={position.totalCost} format="currency" tooltip="Net amount spent (longs, positive value) or received (shorts, negative value) to acquire the current position." />
                                  <DetailItem label="Unrealized P/L" value={position.profitLoss} format="currency" colored />
                                  <DetailItem label="Unrealized P/L %" value={position.profitLossPercentage} format="percent" colored />
                                  <DetailItem label="Last Trade Price" value={position.lastTradePrice} format="currency" />
                                </div>
                              </CardContent>
                            </Card>

                            {/* Trade History Card */}
                            <Card className="shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <CardHeader className="bg-green-600 text-white dark:bg-green-900 py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                                <CardTitle className="text-lg font-medium">{position.symbol} Trade History</CardTitle>
                              </CardHeader>
                              <CardContent className="p-0">
                                <TradeHistory
                                  trades={formatTradesForComponents(getSymbolTrades(expandedSymbol))}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Improved helper component for displaying details cleanly
const DetailItem: React.FC<{label: string, value: string | number, format?: 'currency' | 'percent', colored?: boolean, className?: string, tooltip?: string}> =
 ({ label, value, format, colored, className, tooltip }) => {
    let displayValue: string | number = value;
    // Increase base text size for the value to large
    let valueClassName = `text-lg font-medium text-gray-900 dark:text-gray-100 ${className || ''}`;

    if (typeof value === 'number') {
        if (format === 'currency') {
            displayValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (format === 'percent') {
            if (isFinite(value)) {
                 displayValue = `${value.toFixed(2)}%`;
            } else {
                 displayValue = value > 0 ? '+∞%' : '-∞%'; // Display Infinity cleanly
            }
        } else {
             displayValue = value.toLocaleString(); // Default number formatting
        }

        if (colored) {
             // Color based on the sign of the number, including infinity
             const numberValue = typeof value === 'number' ? value : 0;
            valueClassName += numberValue >= 0 ? ' text-green-600 dark:text-green-500' : ' text-red-600 dark:text-red-500';
        }
    }


    return (
        <div className="py-1.5" title={tooltip}>
            {/* Increase label size to base */}
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={valueClassName}>{displayValue}</p>
        </div>
    );
 }


export default PortfolioSummary; 