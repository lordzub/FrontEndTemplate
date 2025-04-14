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
import PortfolioSummary from './PortfolioSummary';
import ClosedPositionsTable from './ClosedPositionsTable';

// Define an interface for the S&P 500 data structure
interface SP500Data {
    [key: string]: number;
}

const Overview: React.FC = () => {
    const [openTrades, setOpenTrades] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [closedPositions, setClosedPositions] = useState<any[]>([]);
    // Add state for S&P 500 data
    const [sp500Data, setSP500Data] = useState<SP500Data | null>(null);

    const fetchOpenTrades = async () => {
        try {
            console.log("Overview: Fetching open trades...");
            const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com/get_trades');
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            console.log("Overview: Parsed open trades:", parsedData["trades"]);
            const tradesData = parsedData.trades || [];
            setOpenTrades([...tradesData]);
        } catch (err) {
            setError(axios.isAxiosError(err)
                ? err.response?.data?.message || err.message
                : 'An error occurred while fetching open trades');
            // Re-throw the error so Promise.all in fetchData can catch it if needed
            throw err;
        }
    };

    const fetchClosedPositions = async () => {
        try {
            console.log("Overview: Fetching closed positions...");
            const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com/get_closed_positions');
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            console.log("Overview: Parsed closed positions:", parsedData["closed_positions"]);
            const closedPositionsData = parsedData.closed_positions || [];
            setClosedPositions([...closedPositionsData]);
        } catch (err) {
            setError(axios.isAxiosError(err)
                ? err.response?.data?.message || err.message
                : 'An error occurred while fetching closed positions');
            // Re-throw the error
            throw err;
        }
    };

    // Add the function to fetch S&P 500 data
    const fetchSP500Data = async () => {
        try {
            console.log("Overview: Fetching S&P 500 data...");
            const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com/get_sp500_data');
            // The backend response wraps the data in 'sp500_data' key
            const spData = data.sp500_data || null;
            console.log("Overview: Parsed S&P 500 data:", spData);
            setSP500Data(spData);
        } catch (err) {
            const errorMessage = axios.isAxiosError(err)
                ? err.response?.data?.error || err.message // Use 'error' key based on backend code
                : 'An error occurred while fetching S&P 500 data';
            setError(errorMessage);
             console.error("Error fetching S&P 500 data:", errorMessage);
             // Re-throw the error
             throw err;
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Add fetchSP500Data to Promise.all
            await Promise.all([fetchOpenTrades(), fetchClosedPositions(), fetchSP500Data()]);
        } catch (err) {
             // Errors are now primarily handled and logged in individual fetch functions,
             // but we catch here to ensure loading state is managed correctly.
             // The error state should already be set by the failing function.
            console.error("Error during data fetching: ", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return <div>Loading portfolio data...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="container mx-auto p-2 border-black-600 rounded-xl">
            <Tabs defaultValue="overview" className="w-full ">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger 
                        value="overview" 
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-lg font-medium"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger 
                        value="tables" 
                        className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-lg font-medium"
                    >
                        Tables
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                    <div className="mb-6">
                        {/* Pass sp500Data to PortfolioSummary */}
                        <PortfolioSummary 
                            trades={openTrades} 
                            closedPositions={closedPositions} 
                            sp500Data={sp500Data}
                        />
                    </div>
                </TabsContent>
                
                <TabsContent value="tables">
                    {/* Nested Tabs for Open and Closed Positions */}
                    <Tabs defaultValue="open" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger 
                                value="open" 
                                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-lg font-medium"
                            >
                                Open Positions
                            </TabsTrigger>
                            <TabsTrigger 
                                value="closed" 
                                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-lg font-medium"
                            >
                                Closed Positions
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="open">
                            {/* Pass openTrades as initialTrades */}
                            <TradeTable initialTrades={openTrades} />
                        </TabsContent>
                        <TabsContent value="closed">
                            {/* Display closed positions using the new component */}
                            <ClosedPositionsTable closedPositions={closedPositions} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Overview;
