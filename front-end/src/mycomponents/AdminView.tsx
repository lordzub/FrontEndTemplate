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

const AdminView: React.FC = () => {
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

    // Fetch trades for other components (not for SymbolSection)
    useEffect(() => {
        const fetchTrades = async () => {
            try {
                console.log("Overview: Fetching trades for other components");
                const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com//get_trades');
                const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                const tradesData = parsedData.trades.slice(1);
                console.log("Overview: Fetched trades:", tradesData);
                setTrades([...tradesData]);
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
            const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com//get_trades');
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            const tradesData = parsedData.trades.slice(1);
            setTrades(tradesData);
        } catch (err) {
            setError(axios.isAxiosError(err) 
                ? err.response?.data?.message || err.message 
                : 'An error occurred');
        }
    };

    // Convert trades to TradeTable format
    const convertToTradeTableFormat = (trades: Trade[]) => {
        return trades.map(trade => ({
            'Date of Trade': trade.trade_date,
            'Action': trade.action,
            'Symbol': trade.symbol,
            'Description': trade.reference || '',
            'Type': 'Stock', // Default type
            'Quantity': trade.size,
            'Price ($)': trade.price_per_lot,
            'Commission ($)': 0, // Default value
            'Fees ($)': trade.activity_assessment_fee || 0,
            'Accrued Interest ($)': 0, // Default value
            'Amount ($)': trade.principal_amount,
            'Cash Balance ($)': 0, // Default value
            'Settlement Date': trade.settlement_date
        }));
    };

    if (loading) return <div>Loading trades...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className=" w-full">




<Tabs defaultValue="trades" className="w-full">
                <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>

                    {/* <TabsTrigger value="positions">Positions</TabsTrigger> */}
     
                </TabsList>
                <TabsContent value="summary">
                <div className="mb-6">
                <PortfolioSummary trades={trades} refreshData={refreshTrades} />
            </div>
                </TabsContent>

                <TabsContent value="trades" className='w-full'>
                    <Card className='w-full'>

                        <CardContent className='w-full'>

                        </CardContent>
                    </Card>
                </TabsContent>

                {/* <TabsContent value="positions">
                    <SymbolSection 
                        portfolioMetrics={portfolioMetrics}
                        selectedSymbol={selectedSymbol}
                        setSelectedSymbol={setSelectedSymbol}
                    />
                </TabsContent> */}

                {/* <TabsContent value="create">
                    <CreateTradeForm onTradeCreated={refreshTrades} />
                </TabsContent> */}
            </Tabs>
        </div>
    );
};

export default AdminView;
