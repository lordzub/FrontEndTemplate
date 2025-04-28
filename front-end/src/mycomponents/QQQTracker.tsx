import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import SymbolSection from './SymbolSection';
import TradeTable from './TradeTable';
import QQQPortfolioSummary from './QQQPortfolioSummary';
import ClosedPositionsTable from './ClosedPositionsTable';

// Define an interface for the S&P 500 data structure
interface SP500Data {
    [key: string]: number;
}

interface QQQTrackerProps {
    openTrades: any[];
    closedPositions: any[];
    sp500Data: SP500Data | null;
    loading: boolean;
    error: string | null;
}

const QQQTracker: React.FC<QQQTrackerProps> = ({ 
    openTrades, 
    closedPositions, 
    sp500Data, 
    loading, 
    error 
}) => {
    if (loading) return <div>Loading QQQ data...</div>;
    if (error) return <div>Error: {error}</div>;

    // Filter trades for TQQQ and SQQQ
    const filteredOpenTrades = openTrades.filter(trade => 
        trade.Symbol === 'TQQQ' || trade.Symbol === 'SQQQ'
    );
    
    const filteredClosedPositions = closedPositions.filter(position => 
        position.Symbol === 'TQQQ' || position.Symbol === 'SQQQ'
    );

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
                        <QQQPortfolioSummary 
                            trades={filteredOpenTrades} 
                            closedPositions={filteredClosedPositions} 
                            sp500Data={sp500Data}
                        />
                    </div>
                </TabsContent>
                
                <TabsContent value="tables">
                    <Tabs defaultValue="open" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger 
                                value="open" 
                                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-lg font-medium"
                            >
                                Open QQQ Positions
                            </TabsTrigger>
                            <TabsTrigger 
                                value="closed" 
                                className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-lg font-medium"
                            >
                                Closed QQQ Positions
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="open">
                            <TradeTable initialTrades={filteredOpenTrades} />
                        </TabsContent>
                        <TabsContent value="closed">
                            <ClosedPositionsTable closedPositions={filteredClosedPositions} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default QQQTracker; 