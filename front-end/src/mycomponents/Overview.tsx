import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import SymbolSection from './SymbolSection';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import TradeTable from './TradeTable';
import SQQQPortfolioSummary from './SQQQPortfolioSummary';
import PortfolioSummary from './PortfolioSummary';
import { Trade as ImportedTrade } from './types';

export interface Trade extends ImportedTrade {
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

const Overview: React.FC = () => {
    const [shortTrades, setShortTrades] = useState<Trade[]>([]);
    const [longTrades, setLongTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [portfolioMetrics, setPortfolioMetrics] = useState<{
        symbolPositions: Map<string, {
            quantity: number;
            totalCost: number;
            averagePrice: number;
            trades: Trade[];
            lastPrice: number;
        }>;
    }>({ symbolPositions: new Map() });
    const fetchShortTrades = async () => {
        try {
            //console.log("Overview: Fetching trades for other components");
            const { data } = await axios.get('https://sqqq-tracker-a7f625a4e2b8.herokuapp.com/get_short_trades');

            //console.log("Overview: Fetched trades:", data);
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            //console.log("Overview: Parsed data:", parsedData["trades"]);
            const tradesData = parsedData["short trades"]
            console.log("Overview: Fetched trades:", tradesData);
            setShortTrades([...tradesData]);
        } catch (err) {
            setError(axios.isAxiosError(err) 
                ? err.response?.data?.message || err.message 
                : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };
    const fetchLongTrades = async () => {
        try {
            //console.log("Overview: Fetching trades for other components");
            const { data } = await axios.get('https://sqqq-tracker-a7f625a4e2b8.herokuapp.com/get_long_trades');

            //console.log("Overview: Fetched trades:", data);
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            //console.log("Overview: Parsed data:", parsedData["trades"]);
            const tradesData = parsedData["long trades"]
            console.log("Overview: Fetched trades:", tradesData);
            setLongTrades([...tradesData]);
        } catch (err) {
            setError(axios.isAxiosError(err) 
                ? err.response?.data?.message || err.message 
                : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };
    // Fetch trades for other components (not for SymbolSection)
    useEffect(() => {
        fetchLongTrades();
        fetchShortTrades();
    }, []);

    if (loading) return <div>Loading trades...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <SQQQPortfolioSummary shortPositions={shortTrades} longPositions={longTrades} />
            </div>
        </div>
    );
};

export default Overview;
