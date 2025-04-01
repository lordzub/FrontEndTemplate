import axios from 'axios';
import { Trade, PortfolioMetrics, StockSplit } from '../types';

const API_BASE_URL = 'https://port-tracker-a42556a33892.herokuapp.com/;

export const fetchTrades = async (): Promise<Trade[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/get_trades`);
    if (response.data.trades) {
      return response.data.trades;
    }
    return [];
  } catch (error) {
    console.error('Error fetching trades:', error);
    throw new Error('Failed to fetch trades');
  }
};

export const fetchSymbolData = async (symbol: string): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/get_symbol_data?symbol=${symbol}`);
    if (Array.isArray(response.data)) {
      return response.data;
    }
    throw new Error('Unexpected response format');
  } catch (error: any) {
    console.error('Error fetching symbol data:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch symbol data');
  }
};

export const fetchStockSplits = async (symbol: string): Promise<StockSplit[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/get_stock_splits?symbol=${symbol}`);
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching stock splits:', error);
    return [];
  }
};

export const buildPortfolioMetrics = (trades: Trade[]): PortfolioMetrics => {
  const symbolPositions = new Map();
  
  trades.forEach((trade: Trade) => {
    const symbol = trade['Symbol'];
    if (!symbolPositions.has(symbol)) {
      symbolPositions.set(symbol, {
        quantity: 0,
        totalCost: 0,
        averagePrice: 0,
        trades: [],
        lastPrice: 0
      });
    }
    
    const position = symbolPositions.get(symbol);
    const quantity = Number(trade['Quantity']);
    const price = Number(trade['Price ($)']);
    const amount = Number(trade['Amount ($)']);
    
    // Update position based on trade action
    if (trade['Action'].toLowerCase().includes('buy')) {
      position.quantity += quantity;
      position.totalCost += amount;
    } else if (trade['Action'].toLowerCase().includes('sell')) {
      position.quantity -= quantity;
      position.totalCost -= amount;
    }
    
    // Calculate average price
    position.averagePrice = position.quantity !== 0 ? 
      Math.abs(position.totalCost / position.quantity) : 0;
    
    // Add trade to position's trade list
    position.trades.push(trade);
    
    // Update the map
    symbolPositions.set(symbol, position);
  });
  
  return { symbolPositions };
}; 