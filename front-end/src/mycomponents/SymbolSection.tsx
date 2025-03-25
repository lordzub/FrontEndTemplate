import { useState, useEffect } from 'react';
import { Trade } from './Overview';
import { PortfolioMetrics, StockSplit } from './types';
import SymbolSelector from './SymbolSelector';
import PositionDetails from './PositionDetails';
import PriceChart from './PriceChart';
import TradeHistory from './TradeHistory';
import LoadingState from './LoadingState';
import ErrorDisplay from './ErrorDisplay';
import * as DataService from './services/DataService';

interface SymbolSectionProps {
  portfolioMetrics: PortfolioMetrics; // This is just a placeholder, we'll manage our own data
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string) => void;
}

const SymbolSection = ({ 
  selectedSymbol, 
  setSelectedSymbol 
}: SymbolSectionProps) => {
  const [symbolData, setSymbolData] = useState<any[]>([]);
  const [stockSplits, setStockSplits] = useState<StockSplit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  // Manage our own portfolioMetrics internally
  const [internalPortfolioMetrics, setInternalPortfolioMetrics] = useState<PortfolioMetrics>({
    symbolPositions: new Map()
  });
  
  // Fetch trades when component mounts
  useEffect(() => {
    const loadTradesData = async () => {
      try {
        setLoading(true);
        //console.log("SymbolSection: Fetching trades...");
        const trades = await DataService.fetchTrades();
        //console.log("SymbolSection: Trades fetched:", trades);
        setAllTrades(trades);
        
        // Build symbol positions map from trades
        const updatedPortfolioMetrics = DataService.buildPortfolioMetrics(trades);
        
        // Update our internal portfolioMetrics
        setInternalPortfolioMetrics({
          symbolPositions: updatedPortfolioMetrics.symbolPositions
        });
        //console.log("SymbolSection: Updated internal portfolio metrics");
      } catch (error) {
        console.error('Error fetching trades:', error);
        setError('Failed to fetch trades');
      } finally {
        setLoading(false);
      }
    };

    loadTradesData();
  }, []); // Run once when component mounts
  
  // Fetch symbol data when selected symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      const loadSymbolData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Fetch symbol data and stock splits in parallel
          const [symbolData, stockSplits] = await Promise.all([
            DataService.fetchSymbolData(selectedSymbol),
            DataService.fetchStockSplits(selectedSymbol)
          ]);
          
          setSymbolData(symbolData);
          setStockSplits(stockSplits);
        } catch (error: any) {
          console.error('Error fetching symbol data:', error);
          setError(error.message || 'Failed to fetch symbol data');
        } finally {
          setLoading(false);
        }
      };
      
      loadSymbolData();
    }
  }, [selectedSymbol]);
  
  // Get the selected position data from our internal state
  const selectedPosition = selectedSymbol 
    ? internalPortfolioMetrics.symbolPositions.get(selectedSymbol) 
    : undefined;
  
  // Check if we have symbols available
  const hasSymbols = internalPortfolioMetrics.symbolPositions.size > 0;
  
  if (loading && !hasSymbols) {
    return <div>Loading symbol data...</div>;
  }
  
  if (!hasSymbols && !loading) {
    return <div>No symbol data available</div>;
  }
    
  return (
    <div className="flex flex-col gap-4">
      {/* Symbol Selection Component */}
      <SymbolSelector 
        portfolioMetrics={internalPortfolioMetrics}
        selectedSymbol={selectedSymbol}
        setSelectedSymbol={setSelectedSymbol}
      />

      {/* Display error if any */}
      {error && <ErrorDisplay error={error} />}

      {/* Loading state */}
      {loading && <LoadingState />}

      {/* Symbol Details and Chart Layout */}
      {selectedSymbol && !loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Position Details Component */}
          <PositionDetails
            symbol={selectedSymbol}
            position={selectedPosition}
          />



          {/* Trade History Component */}
          <TradeHistory trades={selectedPosition?.trades} />
        </div>
      )}
    </div>
  );
};

export default SymbolSection; 