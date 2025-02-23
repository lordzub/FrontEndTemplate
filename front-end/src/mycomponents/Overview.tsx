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
import CreateTradeForm from './CreateTradeForm';

interface Trade {
    order_no: string;
    reference: string;
    trade_date: string;
    settlement_date: string;
    size: number;
    price_per_lot: number;
    action: 'Buy' | 'Sell';
    symbol: string;
    principal_amount: number;
    activity_assessment_fee: number | null;
    fileName: string;
    checked: string;
}

const Overview: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([]);
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

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/get_trades');
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                const tradesData = parsedData.trades.slice(1);
                console.log(tradesData);
                setTrades(tradesData);
                
                // Calculate portfolio metrics
                const symbolMap = new Map();
                tradesData.forEach((trade: Trade) => {
                    if (!symbolMap.has(trade.symbol)) {
                        symbolMap.set(trade.symbol, {
                            quantity: 0,
                            totalCost: 0,
                            trades: [],
                            lastPrice: trade.price_per_lot // Using last known price
                        });
                    }
                    
                    const position = symbolMap.get(trade.symbol);
                    const tradeQuantity = trade.action === 'Buy' ? trade.size : -trade.size;
                    position.quantity += tradeQuantity;
                    position.totalCost += tradeQuantity * trade.price_per_lot;
                    position.trades.push({
                        ...trade,
                        price: trade.price_per_lot
                    });
                    position.averagePrice = Math.abs(position.totalCost / position.quantity) || 0;
                });
                
                setPortfolioMetrics({ symbolPositions: symbolMap });
            } catch (err) {
                setError(axios.isAxiosError(err) 
                    ? err.response?.data?.message || err.message 
                    : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, []);

    const refreshTrades = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/get_trades');
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            const tradesData = parsedData.trades.slice(1);
            setTrades(tradesData);
            // Recalculate portfolio metrics
            // ... existing portfolio metrics calculation ...
        } catch (err) {
            setError(axios.isAxiosError(err) 
                ? err.response?.data?.message || err.message 
                : 'An error occurred');
        }
    };

    if (loading) return <div>Loading trades...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto p-4">
            <Tabs defaultValue="trades" className="w-full">
                <TabsList>
                    <TabsTrigger value="trades">Trades</TabsTrigger>
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                    <TabsTrigger value="create">Create Trade</TabsTrigger>
                </TabsList>

                <TabsContent value="trades">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Trades</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {trades.length === 0 ? (
                                <div>No trades found</div>
                            ) : (
                                <TradeTable trades={trades} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="positions">
                    <SymbolSection 
                        portfolioMetrics={portfolioMetrics}
                        selectedSymbol={selectedSymbol}
                        setSelectedSymbol={setSelectedSymbol}
                    />
                </TabsContent>

                <TabsContent value="create">
                    <CreateTradeForm onTradeCreated={refreshTrades} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Overview;
