import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import PriceChart from './PriceChart';
import TradeHistory from './TradeHistory';
import ClosedHistoryTable, { ClosedPositionData, SortConfig } from './ClosedHistoryTable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

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
  // Flag to mark synthesized trades
  isSyntheticBuy?: boolean;
}

// Interface for Closed Positions data
interface ClosedPosition {
    'Symbol': string;
    'Quantity': number;
    'Acquired': string; // Assuming date string
    'Date Sold': string; // Assuming date string
    'Proceeds': number;
    'Cost Basis': number;
    'Gain/Loss': number;
    'Cost Basis Per Share'?: number; // Optional
    'Proceeds Per Share'?: number; // Optional
}

interface PortfolioSummaryProps {
  trades: PortfolioTrade[];
  closedPositions?: ClosedPosition[]; // Add closedPositions prop
  sp500Data?: SP500Data | null; // Add sp500Data prop
}

// Representing the calculated open position metrics
interface OpenPositionMetrics {
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
}

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number; // Represents the net cost basis of open positions
  totalProfitLoss: number; // Represents the unrealized P/L of open positions
  profitLossPercentage: number; // Overall portfolio unrealized P/L %
  // We'll store open positions in a map for easier lookup
  openPositionsMap: Map<string, OpenPositionMetrics>;
}

// Combined data structure for each symbol shown in the main table
interface SymbolSummaryData {
    symbol: string;
    openPosition: OpenPositionMetrics | null; // Details if currently open
    closedLots: ClosedPosition[]; // List of closed lots for this symbol
    allTrades: FormattedTrade[]; // All trades (buy/sell) for this symbol
    // Add fields needed for sorting the main table
    currentQuantity: number; // Could be 0 if closed
    marketValue: number; // 0 if closed
    unrealizedPL: number; // 0 if closed
    realizedPL: number; // Sum of Gain/Loss for this symbol's closed lots
    allocation: number; // Add allocation field for sorting/display
    hasTradeToday: boolean; // Flag for recent trade activity
}

// Sorting config for the main unified table
interface UnifiedSortConfig {
    key: keyof Pick<SymbolSummaryData, 'symbol' | 'currentQuantity' | 'marketValue' | 'unrealizedPL' | 'realizedPL' | 'allocation' | 'hasTradeToday'> | null;
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

// Interface for sorting closed positions within the tab
interface ClosedPositionSortConfig {
    key: keyof ClosedPositionData | null;
    direction: 'asc' | 'desc';
}

// Define an interface for the S&P 500 data structure (assuming keys are strings, values numbers)
interface SP500Data {
    [key: string]: number;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ trades = [], closedPositions = [], sp500Data }) => {
  const [processedData, setProcessedData] = useState<Map<string, SymbolSummaryData>>(new Map());
  const [portfolioTotals, setPortfolioTotals] = useState<{ totalValue: number; totalUnrealizedPL: number; totalRealizedPL: number; unrealizedPLPercentage: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<UnifiedSortConfig>({ key: 'hasTradeToday', direction: 'desc' }); // Default sort by today's trade activity
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  // Keep closed position sorting config for the tab table
  const [closedSortConfig, setClosedSortConfig] = useState<ClosedPositionSortConfig>({ key: 'Date Sold', direction: 'desc' });

  // Helper: getTradeField (keep existing)
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

  // Helper: formatTradesForComponents (keep existing)
  const formatTradesForComponents = (symbolTrades: PortfolioTrade[]): FormattedTrade[] => {
    // Exclude synthetic buys from the history displayed to the user
    return symbolTrades
      .filter(trade => !trade.isSyntheticBuy)
      .map(trade => {
        const quantity = Number(getTradeField(trade, 'Quantity', 0));
        const price = Number(getTradeField(trade, 'Price ($)', 0));
        const amount = Number(getTradeField(trade, 'Amount ($)', 0));
        const currentPrice = Number(getTradeField(trade, 'Current Price', 0)); // Use helper
        const dateOfTrade = String(getTradeField(trade, 'Date of Trade', '')); // Use helper
        const symbol = String(getTradeField(trade, 'Symbol', '')); // Use helper

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

  // Main processing logic effect
  useEffect(() => {
    setLoading(true);
    setError(null);
    console.log("--- PortfolioSummary Recalculating ---"); // DEBUG
    console.log("Input Trades:", JSON.stringify(trades)); // DEBUG
    console.log("Input Closed Positions:", JSON.stringify(closedPositions)); // DEBUG
    try {
      // --- START: Synthesize Full Trade History ---
      const synthesizedTrades: PortfolioTrade[] = [...trades]; // Start with actual trades (sells, open position buys/sells)
      const synthesizedBuysLog: any[] = []; // DEBUG

      closedPositions.forEach(closedPos => {
        const symbol = closedPos.Symbol;
        const quantity = closedPos.Quantity;
        const costBasis = closedPos['Cost Basis'];
        const acquiredDate = closedPos.Acquired;

        if (!symbol || !quantity || !costBasis || !acquiredDate) {
          console.warn('Skipping closed position due to missing data:', closedPos);
          return;
        }

        // Calculate price per share for the buy
        const pricePerShare = quantity !== 0 ? costBasis / quantity : 0;

        // Create a synthetic "buy" trade record
        const syntheticBuyTrade: PortfolioTrade = {
          'Date of Trade': acquiredDate,
          'Symbol': symbol,
          'Quantity': quantity, // Positive quantity for buy
          'Price ($)': pricePerShare,
          'Amount ($)': costBasis,
          isSyntheticBuy: true, // Mark this trade as synthesized
          // We don't have current price info for this historical buy
        };
        synthesizedTrades.push(syntheticBuyTrade);
        synthesizedBuysLog.push({ symbol, date: acquiredDate, qty: quantity }); // DEBUG
      });
      console.log("Synthesized Buys Created:", synthesizedBuysLog); // DEBUG
      console.log("Combined Raw Trades (Before Grouping):", JSON.stringify(synthesizedTrades)); // DEBUG
      // --- END: Synthesize Full Trade History ---


      // 1. Group ALL trades (actual + synthesized buys) by symbol
      const tradesBySymbol = new Map<string, PortfolioTrade[]>();
      synthesizedTrades.forEach(trade => {
          const symbol = getTradeField(trade, 'Symbol', '').toString();
          if (!symbol) return;
          if (!tradesBySymbol.has(symbol)) tradesBySymbol.set(symbol, []);
          tradesBySymbol.get(symbol)?.push(trade);
      });

      // 2. Calculate Open Position Metrics using the COMBINED trade list
      const openPositionsMap = new Map<string, OpenPositionMetrics>();
      let totalPortfolioValue = 0;
      let totalPortfolioNetCostBasis = 0; // For open positions only
      let totalPortfolioUnrealizedPL = 0;

      tradesBySymbol.forEach((allSymbolTrades, symbol) => {
          // --- DEBUG LOG for specific symbol ---
          if (symbol === 'SOXL') {
              console.log(`--- Processing SOXL ---`);
              console.log(`SOXL Raw Combined Trades (Before Sort):`, JSON.stringify(allSymbolTrades));
          }

          // Sort the COMBINED list chronologically
          // Robust Date Parsing Function
          const parseDate = (dateString: string | number | undefined): number => {
              if (!dateString) return 0; // Treat missing date as earliest
              const s = String(dateString).trim();
              let timestamp = NaN;

              // Try YYYY-MM-DD (most reliable)
              if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                  timestamp = new Date(s).getTime();
              }

              // Try MM/DD/YYYY
              if (isNaN(timestamp)) {
                  const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                  if (parts) {
                      timestamp = new Date(`${parts[3]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}T00:00:00Z`).getTime();
                  }
              }

              // Try DD/MM/YYYY
              if (isNaN(timestamp)) {
                   const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                   if (parts) {
                       // Check if day > 12 to differentiate from MM/DD
                       if (parseInt(parts[1], 10) > 12) {
                           timestamp = new Date(`${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}T00:00:00Z`).getTime();
                       }
                       // If day <= 12, it's ambiguous without more context, MM/DD was likely tried above.
                       // We could make an assumption or require a specific format. Sticking with MM/DD priority.
                   }
               }


              // Fallback to direct parsing attempt (less reliable for non-standard formats)
              if (isNaN(timestamp)) {
                  timestamp = new Date(s).getTime();
              }

              // If still invalid, return 0 or a very large number depending on desired sort order for errors
              if (isNaN(timestamp)) {
                  console.warn(`Could not parse date: "${dateString}". Treating as earliest.`);
                  return 0;
              }
              return timestamp;
          };


          const sortedSymbolTrades = [...allSymbolTrades].sort((a, b) => {
            const dateA = parseDate(getTradeField(a, 'Date of Trade'));
            const dateB = parseDate(getTradeField(b, 'Date of Trade'));
            // Add secondary sort by synthetic flag? Maybe process actual trades first on same day?
            // For now, just date sort.
            return dateA - dateB; // Sorts ascending (earliest first)
          });

          // --- DEBUG LOG for specific symbol ---
          if (symbol === 'SOXL') {
              console.log(`SOXL Sorted Combined Trades (Before Reduce):`, JSON.stringify(sortedSymbolTrades));
          }


          // Find the latest *actual* trade with current price information
          let currentPrice = 0;
          for (let i = sortedSymbolTrades.length - 1; i >= 0; i--) {
              if (!sortedSymbolTrades[i].isSyntheticBuy) {
                   const price = Number(getTradeField(sortedSymbolTrades[i], 'Current Price', 0));
                   if (price > 0) {
                       currentPrice = price;
                       break;
                   }
              }
          }
          // Fallback: If no trade has current price, maybe fetch it? For now, use 0.
          if (currentPrice === 0) {
             // Try finding price on the last trade regardless of type if previous loop failed
             const lastTrade = sortedSymbolTrades[sortedSymbolTrades.length - 1];
             if (lastTrade) { // Check if lastTrade exists
                currentPrice = Number(getTradeField(lastTrade, 'Current Price', 0)); // May still be 0
             }
             if(currentPrice === 0 && sortedSymbolTrades.length > 0) {
                console.warn(`Symbol ${symbol}: Could not find a valid 'Current Price' in recent trades. Calculations might be inaccurate.`);
             }
          }


          const initialAccumulator: SymbolMetricsAccumulator = {
            quantity: 0, totalCost: 0, lastTradePrice: 0, currentPrice: currentPrice, isShort: false
          };

           // --- DEBUG LOG for specific symbol ---
           let soxlLog: string[] | null = symbol === 'SOXL' ? [] : null;


          // --- Apply the EXISTING average cost calculation logic ---
          // --- to the NEW `sortedSymbolTrades` list ---
          const metrics = sortedSymbolTrades.reduce((acc: SymbolMetricsAccumulator, trade: PortfolioTrade, index: number) => {
            const quantity = Number(getTradeField(trade, 'Quantity', 0));
            const price = Number(getTradeField(trade, 'Price ($)', 0));
            let costChange = quantity * price;

            // --- DEBUG Log before step ---
            if (soxlLog) soxlLog.push(`Step ${index}: Before - Qty=${acc.quantity.toFixed(4)}, Cost=${acc.totalCost.toFixed(4)}. Trade: ${quantity > 0 ? 'BUY' : 'SELL'} ${Math.abs(quantity)} @ ${price.toFixed(4)} (Synth: ${!!trade.isSyntheticBuy}) Date: ${getTradeField(trade, 'Date of Trade')}`);

            // --- Averaging Logic (Unchanged) ---
            if (acc.quantity >= 0 && quantity > 0) { // Buy to open/add Long
                if (soxlLog) soxlLog.push(` -> Case: Buy Long`);
                acc.totalCost += costChange;
            } else if (acc.quantity > 0 && quantity < 0) { // Sell to close/reduce Long
                if (acc.quantity !== 0) {
                    const avgCost = acc.totalCost / acc.quantity;
                    if (soxlLog) soxlLog.push(` -> Case: Sell Long (AvgCost: ${avgCost.toFixed(4)})`);
                    acc.totalCost += quantity * avgCost; // Reduce cost basis proportionally
                } else {
                     // Selling when quantity is zero? Could happen with synthetic trades if order is imperfect.
                     // Assume this opens a short position
                     console.warn(`Symbol ${symbol}: Selling from zero quantity. Assuming short opening.`);
                     if (soxlLog) soxlLog.push(` -> Case: Sell from Zero Qty (WARN)`);
                     acc.totalCost += costChange; // Add negative proceeds
                }
            } else if (acc.quantity <= 0 && quantity < 0) { // Sell to open/add Short
                if (soxlLog) soxlLog.push(` -> Case: Sell Short`);
                acc.totalCost += costChange; // Add negative proceeds (costChange is negative)
            } else if (acc.quantity < 0 && quantity > 0) { // Buy to cover/reduce Short
                if (acc.quantity !== 0) {
                    // For shorts, cost basis is negative (proceeds). Average price is proceeds/qty.
                    const avgProceedsPrice = acc.totalCost / acc.quantity; // This should be positive
                    if (soxlLog) soxlLog.push(` -> Case: Buy Cover (AvgProceeds: ${avgProceedsPrice.toFixed(4)})`);
                    acc.totalCost += quantity * avgProceedsPrice; // Reduce the absolute value of proceeds proportionally
                } else {
                     // Buying when quantity is zero?
                     console.warn(`Symbol ${symbol}: Buying from zero quantity. Assuming long opening.`);
                     if (soxlLog) soxlLog.push(` -> Case: Buy from Zero Qty (WARN)`);
                     acc.totalCost += costChange;
                }
            }
            // --- End Averaging Logic ---

            acc.quantity += quantity;
            // Correct near-zero quantities due to floating point math
            if (Math.abs(acc.quantity) < 1e-9) {
                if (soxlLog && acc.quantity !== 0) soxlLog.push(` -> Correcting near-zero qty: ${acc.quantity}`);
                acc.quantity = 0;
            }
            // If quantity becomes exactly zero, reset cost basis
            if (acc.quantity === 0) {
                 if (soxlLog && acc.totalCost !== 0) soxlLog.push(` -> Qty is zero, resetting cost: ${acc.totalCost}`);
                acc.totalCost = 0;
            }

            acc.lastTradePrice = price; // Store the price of this specific trade
            acc.isShort = acc.quantity < 0;
            // Update current price if available on this trade (prefer non-synthetic)
            const tradeCurrentPrice = Number(getTradeField(trade, 'Current Price', 0));
            if (tradeCurrentPrice > 0 && !trade.isSyntheticBuy) {
                acc.currentPrice = tradeCurrentPrice;
            }

             // --- DEBUG Log after step ---
             if (soxlLog) soxlLog.push(`Step ${index}: After - Qty=${acc.quantity.toFixed(4)}, Cost=${acc.totalCost.toFixed(4)}, isShort=${acc.isShort}`);

            return acc;
          }, initialAccumulator);

          // --- DEBUG Log final metrics ---
          if (soxlLog) {
              console.log(`--- SOXL Reduce Calculation Log ---`);
              soxlLog.forEach(line => console.log(line));
              console.log(`SOXL Final Metrics: Qty=${metrics.quantity}, Cost=${metrics.totalCost}, AvgPx=${metrics.quantity !== 0 ? (metrics.totalCost / metrics.quantity) : 0}, CurPx=${metrics.currentPrice}`);
              console.log(`--- End SOXL Log ---`);
          }


          // --- Continue with existing logic using the calculated metrics ---
          if (metrics.quantity === 0) {
              if(symbol === 'SOXL') console.log("SOXL resulted in zero quantity, skipping open position."); // DEBUG
              // If it's zero, still create an entry in processedData maybe? Or ensure it's handled later.
              // The current logic returns, so it won't be in openPositionsMap
              // We need to ensure it still appears in the table if there are closed lots.
              // Let's handle this later when combining data.
               return; // Skip adding to openPositionsMap
          };

          const priceForValuation = metrics.currentPrice;
          if (priceForValuation <= 0) {
            console.warn(`Symbol ${symbol}: Missing or zero Current Price (${priceForValuation}) after processing all trades. Skipping open position valuation.`);
            // Still create an entry, but P/L etc will be zero/invalid
            const openPosition: OpenPositionMetrics = {
                symbol, quantity: metrics.quantity, totalCost: metrics.totalCost,
                value: 0, profitLoss: 0, profitLossPercentage: 0, allocation: 0,
                averagePrice: metrics.quantity !== 0 ? metrics.totalCost / metrics.quantity : 0,
                lastTradePrice: metrics.lastTradePrice, currentPrice: 0, isShort: metrics.isShort,
            };
            openPositionsMap.set(symbol, openPosition);
            totalPortfolioNetCostBasis += metrics.totalCost; // Still track cost basis
             if(symbol === 'SOXL') console.log("SOXL valuation skipped due to missing current price."); // DEBUG
            // Don't return here, let it flow through so it can be added to finalProcessedData later
            // return; // Cannot calculate value or P/L
          } else {

              const currentValue = metrics.quantity * priceForValuation;
              // Market value is always positive, representing the absolute value of the position
              const marketValue = Math.abs(currentValue);
              // Average price: For longs, cost/qty. For shorts, proceeds/qty (totalCost is negative, qty is negative -> positive price)
              const averagePrice = metrics.quantity !== 0 ? metrics.totalCost / metrics.quantity : 0;
              // P/L: Current Value - Total Cost Basis
              // Longs: (Qty * CurrentPx) - (Qty * AvgCost)
              // Shorts: (Qty * CurrentPx) - (Qty * AvgProceeds) -> (negative * current) - (negative)
              const profitLoss = currentValue - metrics.totalCost;
              // Basis for Percentage calculation should be the absolute cost/proceeds
              const basisForPercent = Math.abs(metrics.totalCost);
              const profitLossPercentage = basisForPercent !== 0 ? (profitLoss / basisForPercent) * 100 : (profitLoss === 0 ? 0 : Infinity * Math.sign(profitLoss));


              const openPosition: OpenPositionMetrics = {
                symbol, quantity: metrics.quantity, totalCost: metrics.totalCost,
                value: marketValue, profitLoss, profitLossPercentage, allocation: 0, // Allocation calculated later
                averagePrice: averagePrice,
                lastTradePrice: metrics.lastTradePrice, // Last actual trade price from loop
                currentPrice: metrics.currentPrice, // Best current price found
                isShort: metrics.isShort,
              };
              openPositionsMap.set(symbol, openPosition);

              // Accumulate portfolio totals based on MARKET VALUE and calculated P/L
              totalPortfolioValue += marketValue; // Use absolute market value for total portfolio size
              totalPortfolioNetCostBasis += metrics.totalCost; // Sum of net costs/proceeds of open positions
              totalPortfolioUnrealizedPL += profitLoss; // Sum of unrealized P/L of open positions
          }
      });

      // Calculate allocation for open positions (using updated totalPortfolioValue)
      openPositionsMap.forEach(pos => {
          // Ensure value is positive for allocation calculation
        pos.allocation = totalPortfolioValue > 0 && pos.value > 0 ? (pos.value / totalPortfolioValue) * 100 : 0;
      });

      // Calculate overall portfolio P/L percentage based on the sum of absolute cost bases
      const totalAbsoluteBasis = Array.from(openPositionsMap.values()).reduce((sum, p) => sum + Math.abs(p.totalCost), 0);
      const portfolioUnrealizedPLPercentage = totalAbsoluteBasis > 0
        ? (totalPortfolioUnrealizedPL / totalAbsoluteBasis) * 100
        : (totalPortfolioUnrealizedPL === 0 ? 0 : Infinity * Math.sign(totalPortfolioUnrealizedPL));


      // --- The rest of the logic remains largely the same ---

      // Helper function to get YYYY-MM-DD string from various date inputs
      // Using UTC methods to prevent timezone offsets from affecting the date comparison
      const getYYYYMMDD = (dateInput: string | number | Date | undefined): string | null => {
          if (!dateInput) return null;

          let date: Date;
          if (dateInput instanceof Date) {
              date = dateInput;
          } else {
              const s = String(dateInput).trim();
              let parsedTimestamp = NaN;

              // Prioritize YYYY-MM-DD
              if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                  // Attempt to parse directly, assuming local time if no TZD, or respecting TZD if present
                  parsedTimestamp = Date.parse(s);
                  if (isNaN(parsedTimestamp) && s.length === 10) {
                      // If direct parse failed and it looks like YYYY-MM-DD, treat as UTC midnight
                       parsedTimestamp = Date.parse(s + 'T00:00:00Z');
                  }
              }

              // Try MM/DD/YYYY
              if (isNaN(parsedTimestamp)) {
                  const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                  if (parts) {
                      // Treat as UTC midnight
                      parsedTimestamp = Date.parse(`${parts[3]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}T00:00:00Z`);
                  }
              }

              // Try DD/MM/YYYY (less common in US context, but check heuristic)
              if (isNaN(parsedTimestamp)) {
                  const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                  if (parts && parseInt(parts[1], 10) > 12) { // Heuristic: if first part > 12, it's likely the day
                       // Treat as UTC midnight
                       parsedTimestamp = Date.parse(`${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}T00:00:00Z`);
                  }
              }

              // Fallback direct parse (might catch other formats but less reliable)
              if (isNaN(parsedTimestamp)) {
                  parsedTimestamp = Date.parse(s);
              }

              if (isNaN(parsedTimestamp)) {
                  console.warn(`Could not parse date for YYYYMMDD: "${dateInput}"`);
                  return null;
              }
              date = new Date(parsedTimestamp); // Create Date object from timestamp
          }

          // Extract UTC date parts to ensure consistency regardless of local timezone
          const year = date.getUTCFullYear();
          const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
          const day = date.getUTCDate().toString().padStart(2, '0');

          return `${year}-${month}-${day}`;
      };

      // Get today's date in YYYY-MM-DD format (UTC)
      const todayString = getYYYYMMDD(new Date());


      // 3. Group Original Closed Positions by Symbol (for display)
      const closedLotsBySymbol = new Map<string, ClosedPosition[]>();
      let totalPortfolioRealizedPL = 0;
      closedPositions.forEach(pos => {
        const symbol = pos.Symbol;
        if (!symbol) return;
        if (!closedLotsBySymbol.has(symbol)) closedLotsBySymbol.set(symbol, []);
        closedLotsBySymbol.get(symbol)?.push(pos);
        totalPortfolioRealizedPL += pos['Gain/Loss'] || 0;
      });

      // 4. Combine Data for All Symbols for the final display structure
      // Use all unique symbols from the combined trades map AND closed lots map
      // Ensure symbols processed to zero quantity are still included if they have closed lots
      const allSymbols = new Set([...tradesBySymbol.keys(), ...closedLotsBySymbol.keys()]);
      const finalProcessedData = new Map<string, SymbolSummaryData>();

      allSymbols.forEach(symbol => {
        const openPos = openPositionsMap.get(symbol) || null; // Get calculated open position (might be null if qty is 0 or price is missing)
        const closedLots = closedLotsBySymbol.get(symbol) || []; // Get original closed lots for display
        const allSymbolTradesRaw = tradesBySymbol.get(symbol) || []; // Get the combined trades list
        // --- Check for trade today ---
        let symbolHasTradeToday = false;
        if (todayString) { // Only check if we could format today's date
            for (const trade of allSymbolTradesRaw) {
                // Exclude synthetic buys from this check? Or include them? Let's include all for now.
                const tradeDateStr = getTradeField(trade, 'Date of Trade', '');
                const tradeYYYYMMDD = getYYYYMMDD(tradeDateStr);
                if (tradeYYYYMMDD === todayString) {
                    symbolHasTradeToday = true;
                    break; // Found one, no need to check more for this symbol
                }
            }
        }
        // --- End check for trade today ---
        // Format trades for display (filtering out synthetic ones)
        const allSymbolTradesFormatted = formatTradesForComponents(allSymbolTradesRaw);
        const symbolRealizedPL = closedLots.reduce((sum, lot) => sum + (lot['Gain/Loss'] || 0), 0);

         // Determine current quantity - use openPos if available, otherwise 0
         const currentQuantity = openPos?.quantity ?? 0;
         // Determine market value - use openPos if available, otherwise 0
         const marketValue = openPos?.value ?? 0;
         // Determine unrealized P/L - use openPos if available, otherwise 0
         const unrealizedPL = openPos?.profitLoss ?? 0;
         // Determine allocation - use openPos if available, otherwise 0
         const allocation = openPos?.allocation ?? 0;


        finalProcessedData.set(symbol, {
          symbol,
          openPosition: openPos, // Store the calculated open position object (or null)
          closedLots, // Keep original closed lots for the tab
          allTrades: allSymbolTradesFormatted, // Use formatted trades (no synthetic buys) for history tab
          // Fields for main table display & sorting
          currentQuantity: currentQuantity, // Explicitly calculated
          marketValue: marketValue, // Explicitly calculated
          unrealizedPL: unrealizedPL, // Explicitly calculated
          realizedPL: symbolRealizedPL, // Use sum from original closed lots data
          allocation: allocation, // Explicitly store allocation
          hasTradeToday: symbolHasTradeToday, // Store the flag
        });

         if(symbol === 'SOXL') { // DEBUG
             console.log(`SOXL Final Processed Data Entry:`, JSON.stringify(finalProcessedData.get(symbol)));
         }
      });

      setProcessedData(finalProcessedData);
      setPortfolioTotals({
        totalValue: totalPortfolioValue,
        totalUnrealizedPL: totalPortfolioUnrealizedPL,
        totalRealizedPL: totalPortfolioRealizedPL, // From original closed data
        unrealizedPLPercentage: portfolioUnrealizedPLPercentage
      });
       console.log("--- PortfolioSummary Recalculation Complete ---"); // DEBUG

    } catch (err) {
      console.error('Error processing portfolio data:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to process portfolio data: ${errorMessage}`);
      setProcessedData(new Map());
      setPortfolioTotals(null);
       console.log("--- PortfolioSummary Recalculation FAILED ---"); // DEBUG
    } finally {
      setLoading(false);
    }

  }, [trades, closedPositions]); // Recalculate when trades or closed positions change

  // Calculate S&P 500 performance
  const sp500Performance = useMemo(() => {
    if (!sp500Data) return null;

    const keys = Object.keys(sp500Data);
    if (keys.length < 2) return null; // Need at least two data points

    // Assume first key is start (e.g., "31st March"), second is current
    const startKey = keys[0];
    const currentKey = keys[1];
    const startValue = sp500Data[startKey];
    const currentValue = sp500Data[currentKey];

    if (typeof startValue !== 'number' || typeof currentValue !== 'number' || startValue === 0) {
      return null; // Invalid data or cannot calculate percentage
    }

    const percentageChange = ((currentValue - startValue) / startValue) * 100;

    return {
      startKey,
      startValue,
      currentKey,
      currentValue,
      percentageChange,
    };
  }, [sp500Data]);

  // --- Sorting Logic ---

  // Sorting for the main unified table
  const sortedSymbolList = useMemo(() => {
    const dataArray = Array.from(processedData.values());
    if (!sortConfig.key) return dataArray;

    // Ensure sorting handles potentially null/undefined openPosition values gracefully
    dataArray.sort((a, b) => {
        let aValue: any, bValue: any; // Use 'any' for flexibility, or create a more specific union type

        // Handle direct properties vs properties within openPosition
        if (sortConfig.key === 'symbol' || sortConfig.key === 'realizedPL' || sortConfig.key === 'hasTradeToday') {
             aValue = a[sortConfig.key!];
             bValue = b[sortConfig.key!];
        } else if (sortConfig.key === 'currentQuantity') {
            aValue = a.currentQuantity; // Use pre-calculated value
            bValue = b.currentQuantity;
        } else if (sortConfig.key === 'marketValue') {
            aValue = a.marketValue; // Use pre-calculated value
            bValue = b.marketValue;
        } else if (sortConfig.key === 'unrealizedPL') {
             aValue = a.unrealizedPL; // Use pre-calculated value
             bValue = b.unrealizedPL;
        } else if (sortConfig.key === 'allocation') { // Handle sorting by allocation
             aValue = a.allocation; // Use pre-calculated value
             bValue = b.allocation;
        } else {
            // Should not happen with current config, but handle defensively
            aValue = 0;
            bValue = 0;
        }


        // Comparison logic (remains the same)
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            // Sort true before false in descending order
             const valA = aValue ? 1 : 0;
             const valB = bValue ? 1 : 0;
             return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            // Handle NaN values if they occur
             if (isNaN(aValue) && isNaN(bValue)) return 0;
             if (isNaN(aValue)) return 1; // Put NaN last
             if (isNaN(bValue)) return -1; // Put NaN last
            return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue);
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        // Basic fallback comparison for mixed types or other cases
        try {
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        } catch (e) {
             // Prevent errors during comparison of incompatible types
            console.warn("Comparison error during sort:", e);
        }
        return 0;
    });
    return dataArray;
  }, [processedData, sortConfig]);

  // Sorting for the closed positions tab table (Unchanged)
  const getSortedClosedLots = (symbol: string | null) => {
      if (!symbol) return [];
      const data = processedData.get(symbol);
      if (!data || !data.closedLots) return [];

      // Need to handle potential type issues with sorting
      const sortableClosed = [...data.closedLots];
      if (!closedSortConfig.key) return sortableClosed;

       // Use the same robust date parser
      const parseDateForSort = (dateString: string | number | undefined): number => {
           if (!dateString) return 0;
           const s = String(dateString).trim();
           let timestamp = NaN;
           if (/^\d{4}-\d{2}-\d{2}/.test(s)) timestamp = new Date(s).getTime();
           if (isNaN(timestamp)) { const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); if (parts) timestamp = new Date(`${parts[3]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}T00:00:00Z`).getTime(); } // MM/DD
            if (isNaN(timestamp)) { const parts = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); if (parts && parseInt(parts[1], 10) > 12) timestamp = new Date(`${parts[3]}-${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}T00:00:00Z`).getTime(); } // DD/MM
            if (isNaN(timestamp)) timestamp = new Date(s).getTime();
            return isNaN(timestamp) ? 0 : timestamp;
       };


      sortableClosed.sort((a, b) => {
        // Safe access to possibly undefined properties
        const aValue = a[closedSortConfig.key!] ?? undefined;
        const bValue = b[closedSortConfig.key!] ?? undefined;

        if (closedSortConfig.key === 'Acquired' || closedSortConfig.key === 'Date Sold') {
            // Safe date parsing using helper
            const dateA = parseDateForSort(aValue);
            const dateB = parseDateForSort(bValue);
            return closedSortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
             if (isNaN(aValue) && isNaN(bValue)) return 0;
             if (isNaN(aValue)) return 1;
             if (isNaN(bValue)) return -1;
            return closedSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue);
            return closedSortConfig.direction === 'asc' ? comparison : -comparison;
        }

        // Handle undefined values and fallback comparisons
        if (aValue === undefined && bValue !== undefined) return 1;
        if (aValue !== undefined && bValue === undefined) return -1;
        if (aValue === undefined && bValue === undefined) return 0;

        // Safe comparisons for remaining cases
         try {
            if (aValue && bValue && aValue < bValue) return closedSortConfig.direction === 'asc' ? -1 : 1;
            if (aValue && bValue && aValue > bValue) return closedSortConfig.direction === 'asc' ? 1 : -1;
         } catch(e) {
             console.warn("Comparison error during closed lot sort:", e);
         }
        return 0;
    });
      return sortableClosed;
  };

  // --- Handlers ---

  // Handler for main table sorting
  const handleSort = (key: UnifiedSortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Handler for closed lots table sorting (within tab)
  const handleClosedSort = (key: keyof ClosedPositionData) => {
    setClosedSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

   // --- Render Logic ---

  if (loading) return <div className="p-4 text-center">Processing portfolio data...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  // Use processedData.size which is derived from the combined list
  if (processedData.size === 0 && !sp500Performance) return <div className="p-4 text-center text-gray-500">No portfolio data available.</div>;


  return (
<>
        {/* --- Summary Cards --- */}
        {(portfolioTotals || sp500Performance) && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8"> {/* Adjusted grid columns */}
            {/* Market Value */}
            {portfolioTotals && portfolioTotals.totalValue > 0 && (
                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Total Market Value</h3>
                    <p className="text-3xl font-bold">
                    ${portfolioTotals.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            )}



            {/* Unrealized P/L */}
            {portfolioTotals && portfolioTotals.totalUnrealizedPL !== 0 && (
                 <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Total Unrealized P/L</h3>
                    <p className={`text-3xl font-bold ${portfolioTotals.totalUnrealizedPL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                    ${portfolioTotals.totalUnrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-base ml-1 font-medium">
                        ({isFinite(portfolioTotals.unrealizedPLPercentage) ? portfolioTotals.unrealizedPLPercentage.toFixed(2) + '%' : (portfolioTotals.unrealizedPLPercentage > 0 ? '+∞%' : '-∞%')})
                    </span>
                    </p>
                 </div>
            )}
            {/* Realized P/L */}
            {portfolioTotals && (
                 <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Total Realized P/L</h3>
                    <p className={`text-3xl font-bold ${portfolioTotals.totalRealizedPL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        ${portfolioTotals.totalRealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-base ml-1 font-medium">
                            ({((portfolioTotals.totalRealizedPL) / portfolioTotals.totalValue * 100).toFixed(2) + '%' })
                        </span>
                    </p>
                 </div>
            )}

            {/* Total PNL */}
            {portfolioTotals && (
                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">Total P/L</h3>
                    <p className={`text-3xl font-bold ${(portfolioTotals.totalUnrealizedPL + portfolioTotals.totalRealizedPL) >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        ${(portfolioTotals.totalUnrealizedPL + portfolioTotals.totalRealizedPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-base ml-1 font-medium">
                            ({portfolioTotals.totalValue > 0 ? ((portfolioTotals.totalUnrealizedPL + portfolioTotals.totalRealizedPL) / portfolioTotals.totalValue * 100).toFixed(2) + '%' : '0%'})
                        </span>
                    </p>
                </div>
            )}
            {/* S&P 500 Performance Card */}
            {sp500Performance && (
                <div className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center">
                        S&P 500 ({sp500Performance.startKey}) {/* Display the start key */}
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="w-4 h-4 ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-black text-white rounded-md shadow-lg p-2 text-xs">
                                <p>{sp500Performance.startKey}: {sp500Performance.startValue.toFixed(2)}</p>
                                <p>{sp500Performance.currentKey}: {sp500Performance.currentValue.toFixed(2)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </h3>
                    <p className={`text-3xl font-bold text-center ${sp500Performance.percentageChange >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                        {sp500Performance.percentageChange >= 0 ? '+' : ''}{sp500Performance.percentageChange.toFixed(2)}%
                    </p>
                </div>
            )}
            </div>
        )}

        {/* --- Main Unified Table --- */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Portfolio Holdings ({sortedSymbolList.length})</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="w-full text-base">
              {/* Table Header */}
              <thead>
                <tr className="bg-green-600 text-white dark:bg-green-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-2 text-center w-1/8"></th> {/* Expander */}
                  <th
                     className="py-3 px-1 text-center w-1/8 font-medium cursor-pointer hover:bg-green-700 transition-colors"
                     title="Green dot indicates trade activity today"
                     onClick={() => handleSort('hasTradeToday')}
                  >
                     <div className="flex items-center justify-center gap-1">
                        Today
                        {sortConfig.key === 'hasTradeToday' && (
                          <span className="text-sm ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                        )}
                     </div>
                  </th>
                  {[ // Define columns for the main table
                    { key: 'symbol', label: 'Symbol' },
                    { key: 'currentQuantity', label: 'Quantity' },
                    { key: 'marketValue', label: 'Market Value' },
                    
                    { key: 'unrealizedPL', label: 'Unrealized P/L' },
                    { key: 'realizedPL', label: 'Realized P/L (Symbol)' },
                    { key: 'allocation', label: 'Allocation %' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className={`py-3 px-4 text-center w-1/8 font-medium cursor-pointer hover:bg-green-700 transition-colors`}
                      onClick={() => handleSort(key as UnifiedSortConfig['key'])}
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
              {/* Table Body */}
              <tbody>
                {sortedSymbolList.length === 0 && (
                   <tr><td colSpan={8} className="text-center py-6 text-gray-500">No holdings found.</td></tr>
                )}
                {sortedSymbolList.map((item) => {
                  // Use the calculated openPosition from the state
                  const position = item.openPosition;
                  const isCurrentlyOpen = item.currentQuantity !== 0; // Use the calculated quantity
                  const symbol = item.symbol;
                  // Check if there are actual trades (non-synthetic) or closed lots to show in tabs
                  const hasDisplayableTrades = item.allTrades.length > 0;
                  const hasClosedLots = item.closedLots.length > 0;
                  const hasAdditionalData = hasDisplayableTrades || hasClosedLots;


                  return (
                    <React.Fragment key={symbol}>
                      {/* Main Row */}
                      <tr className="border-b hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        {/* Expander Cell */}
                        <td className="py-3 px-2 text-center">
                           {/* Show expander if there's an open position OR additional data (trades/closed lots) */}
                           {(position || hasAdditionalData) ? (
                             <button
                                onClick={() => setExpandedSymbol(expandedSymbol === symbol ? null : symbol)}
                                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                aria-label={expandedSymbol === symbol ? 'Collapse' : 'Expand'}
                             >
                               {expandedSymbol === symbol ? (
                                 <ChevronDown className="w-4 h-4 text-gray-500" />
                               ) : (
                                 <ChevronRight className="w-4 h-4 text-gray-500" />
                               )}
                             </button>
                           ) : null}
                        </td>
                        {/* Today's Trade Indicator Cell */}
                        <td className="py-3 px-1 text-center">
                          {item.hasTradeToday && (
                            <span
                               className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full"
                            ></span>
                          )}
                        </td>
                        {/* Data Cells - Use values from `item` which are derived from `openPosition` */}
                        <td className="py-3 px-4 text-center font-medium">{symbol}</td>
                        <td className={`text-center py-3 px-4 ${position?.isShort ? 'text-red-600 dark:text-red-500' : ''}`}>
                           {/* Display calculated quantity */}
                           {item.currentQuantity !== 0 ? `${item.currentQuantity.toLocaleString()} ${position?.isShort ? '(Short)' : ''}` : 'Closed'}
                        </td>
                        <td className="text-center py-3 px-4">
                          {item.marketValue > 0 ? `$${item.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (isCurrentlyOpen ? '$0.00' : '-')}
                        </td>

                        <td className={`text-center py-3 px-4 ${item.unrealizedPL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                           {/* Only show Unrealized P/L if the position is actually open */}
                           {isCurrentlyOpen ? `$${item.unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className={`text-center py-3 px-4 ${item.realizedPL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                           {/* Realized P/L comes from closedLots data, show if non-zero */}
                           {item.realizedPL !== 0 ? `$${item.realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="text-center py-3 px-4">
                            {isCurrentlyOpen && item.allocation > 0 ? `${item.allocation.toFixed(2)}%` : '-'}
                        </td>
                      </tr>

                      {/* --- Expanded Row (Unchanged structure, relies on `position` having correct data) --- */}
                      {expandedSymbol === symbol && (
                        <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                          {/* Make sure colspan matches number of columns in header + expander */}
                          <td colSpan={8} className="p-4"> {/* Slightly different bg removed */}
                            <div className="space-y-6">
                              {/* Position Details Section (Shows if 'position' exists) */}
                              {position ? (
                                // Display Open Position Details calculated earlier
                                <Card className="shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  {/* Updated header background and text color */}
                                  <CardHeader className="bg-green-600 text-white dark:bg-green-900 py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                                    <CardTitle className="text-lg font-medium">Current Open Position: {symbol}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                                      <DetailItem label="Position Type" value={position.isShort ? 'Short' : 'Long'} className={position.isShort ? 'text-red-600 dark:text-red-500' : ''}/>
                                      <DetailItem label="Quantity" value={position.quantity.toLocaleString()} className={position.isShort ? 'text-red-600 dark:text-red-500' : ''}/>
                                      <DetailItem label="Average Price" value={position.averagePrice} format="currency" tooltip="Average price per share for longs, average proceeds per share for shorts." />
                                      <DetailItem label="Current Price" value={position.currentPrice > 0 ? position.currentPrice : 'N/A'} format="currency" />
                                      <DetailItem label="Market Value" value={position.value} format="currency" />
                                      <DetailItem label="Net Cost Basis" value={position.totalCost} format="currency" tooltip="Net amount spent (longs, positive value) or received (shorts, negative value) to acquire the current position." />
                                      <DetailItem label="Unrealized P/L" value={position.profitLoss} format="currency" colored />
                                      <DetailItem label="Unrealized P/L %" value={position.profitLossPercentage} format="percent" colored />
                                      <DetailItem label="Allocation" value={position.allocation} format="percent" />
                                      {/* Optionally show Last Trade Price if needed */}
                                      {/* <DetailItem label="Last Trade Price" value={position.lastTradePrice} format="currency" /> */}
                                    </div>
                                  </CardContent>
                                </Card>
                              ) : (
                                // Display message if position is fully closed (openPosition is null)
                                <Card className="shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  {/* Updated header background and text color */}
                                  <CardHeader className="bg-green-600 text-white dark:bg-green-900 py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                                    <CardTitle className="text-lg font-medium">Position Status: {symbol}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4">
                                    <p className="text-gray-600 dark:text-gray-400">This position is currently closed.</p>
                                    {/* Show total realized P/L for this symbol if it's non-zero */}
                                    {item.realizedPL !== 0 && (
                                      <p className={`mt-2 font-medium ${item.realizedPL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                        Total Realized P/L for {symbol}: ${item.realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Tabs Section - only show tabs if there's displayable additional data */}
                              {hasAdditionalData && (
                                <div className="mt-4">
                                  {/* Default tab logic needs refinement if only closed lots exist */}
                                  <Tabs defaultValue={hasDisplayableTrades ? "history" : (hasClosedLots ? "closed" : undefined)} className="w-full">
                                    <TabsList className="w-full bg-gray-200 dark:bg-gray-700 p-1 rounded-md">
                                      {hasDisplayableTrades && (
                                        <TabsTrigger value="history" className="flex-1 py-2 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-950 data-[state=active]:shadow-sm">
                                          Trade History ({item.allTrades.length})
                                        </TabsTrigger>
                                      )}
                                      {hasClosedLots && (
                                        <TabsTrigger value="closed" className="flex-1 py-2 data-[state=active]:bg-white data-[state=active]:dark:bg-gray-950 data-[state=active]:shadow-sm">
                                          Closed Lots ({item.closedLots.length})
                                        </TabsTrigger>
                                      )}
                                    </TabsList>

                                    {/* Tab Content: Trade History (using filtered trades) */}
                                    {hasDisplayableTrades && (
                                      <TabsContent value="history" className="mt-3">
                                        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                          {/* Updated header background and text color */}
                                          <CardHeader className="bg-green-600 text-white dark:bg-green-900 py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                                            <CardTitle className="text-lg font-medium">Trade History: {symbol}</CardTitle>
                                          </CardHeader>
                                          <CardContent className="p-0">
                                              {/* Pass the formatted (non-synthetic) trades */}
                                            <TradeHistory trades={item.allTrades} />
                                          </CardContent>
                                        </Card>
                                      </TabsContent>
                                    )}

                                    {/* Tab Content: Closed Lots (using original closedPositions data, filtered by symbol) */}
                                    {hasClosedLots && (
                                      <TabsContent value="closed" className="mt-3">
                                        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                           {/* Updated header background and text color */}
                                          <CardHeader className="bg-green-600 text-white dark:bg-green-900 py-3 px-4 border-b border-gray-200 dark:border-gray-700">
                                            <CardTitle className="text-lg font-medium">Closed Lots: {symbol}</CardTitle>
                                          </CardHeader>
                                          <CardContent className="p-0">
                                            {/* Use the getSortedClosedLots helper which uses data.closedLots */}
                                            <ClosedHistoryTable
                                              positions={getSortedClosedLots(symbol) as ClosedPositionData[]}
                                              onSortChange={(key, direction) => {
                                                // Trigger re-sort for this specific table
                                                handleClosedSort(key as keyof ClosedPositionData);
                                              }}
                                              sortConfig={{
                                                key: closedSortConfig.key as keyof ClosedPositionData | null,
                                                direction: closedSortConfig.direction
                                              }}
                                            />
                                          </CardContent>
                                        </Card>
                                      </TabsContent>
                                    )}
                                  </Tabs>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
  );
};

// Helper component for displaying details cleanly (keep existing, add handling for N/A)
const DetailItem: React.FC<{label: string, value: string | number, format?: 'currency' | 'percent', colored?: boolean, className?: string, tooltip?: string}> =
 ({ label, value, format, colored, className, tooltip }) => {
    let displayValue: string | number = value;
    let valueClassName = `text-lg font-medium text-gray-900 dark:text-gray-100 ${className || ''}`;

    if (value === 'N/A') {
        displayValue = 'N/A';
        // Optional: style N/A differently
         valueClassName += ' text-gray-500 dark:text-gray-400'; // Style N/A
    } else if (typeof value === 'number') {
        if (format === 'currency') {
            displayValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (format === 'percent') {
            if (isFinite(value)) {
                 displayValue = `${value.toFixed(2)}%`;
            } else {
                 // Handle Infinity representation consistently
                 displayValue = value > 0 ? '+∞%' : (value < 0 ? '-∞%' : '0.00%');
            }
        } else {
             // Default number formatting
             displayValue = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 }); // Adjust decimals as needed
        }

        if (colored) {
             // Ensure consistent coloring even for Infinity
            const numberValue = typeof value === 'number' && isFinite(value) ? value : (value > 0 ? 1 : (value < 0 ? -1 : 0));
            valueClassName += numberValue >= 0 ? ' text-green-600 dark:text-green-500' : ' text-red-600 dark:text-red-500';
        }
    } else {
         // Handle string values (like 'Long'/'Short')
         displayValue = value;
    }


    return (
        <div className="py-1.5" title={tooltip}>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={valueClassName}>{displayValue}</p>
        </div>
    );
 };


export default PortfolioSummary; 