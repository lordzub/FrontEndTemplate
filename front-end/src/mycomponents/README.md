# Symbol Section Components

This directory contains components related to the Symbol Section of the application, which displays stock/trade data for selected symbols.

## File Structure

### Main Components
- `SymbolSection.tsx` - Main container component that manages state and orchestrates the other components
- `SymbolSelector.tsx` - Dropdown component for selecting a symbol
- `PositionDetails.tsx` - Displays position metrics like quantity, average price, P/L, etc.
- `PriceChart.tsx` - Wrapper for the TradeChart component
- `TradeHistory.tsx` - Displays table of trade history for the selected symbol
- `LoadingState.tsx` - Simple loading indicator
- `ErrorDisplay.tsx` - Displays error messages

### Utilities
- `types.ts` - Contains TypeScript interfaces used throughout the components
- `services/DataService.ts` - Contains functions for fetching and processing data

## Component Hierarchy

```
SymbolSection
├── SymbolSelector
├── ErrorDisplay (conditional)
├── LoadingState (conditional)
└── When symbol selected:
    ├── PositionDetails
    ├── PriceChart
    └── TradeHistory
```

## Usage

The `SymbolSection` component requires the following props:
- `portfolioMetrics`: Contains symbol positions data
- `selectedSymbol`: Currently selected symbol
- `setSelectedSymbol`: Function to update the selected symbol

## Data Flow

1. `SymbolSection` fetches trades on mount
2. User selects a symbol using `SymbolSelector`
3. `SymbolSection` fetches symbol data and stock splits
4. Data is passed to child components for rendering

## API Endpoints Used

- `/get_trades` - Fetches all trades
- `/get_symbol_data?symbol=XXX` - Fetches price history for a symbol
- `/get_stock_splits?symbol=XXX` - Fetches stock split history for a symbol 