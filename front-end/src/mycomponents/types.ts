export interface Trade {
  symbol: string;
  price_per_lot: number;
  action: string;
  size: number;
  trade_date: string;
  reference?: string;
  activity_assessment_fee?: number;
  principal_amount: number;
  settlement_date: string;
}

export interface SymbolPosition {
  quantity: number;
  totalCost: number;
  averagePrice: number;
  trades: import("../mycomponents/Overview").Trade[];
  lastPrice: number;
}

export interface PortfolioMetrics {
  symbolPositions: Map<string, SymbolPosition>;
}

export interface PositionMetrics {
  quantity: number;
  totalCost: number;
  lastTradePrice: number;
  isShort: boolean;
}

export interface StockSplit {
  date: string;
  stock_split: number;
} 