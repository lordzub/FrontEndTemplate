import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";

interface Position {
    "% Total Gain/Loss": number;
    "Acquired": string;
    "Average Cost Basis": number;
    "Current Price": number;
    "Quantity": number;
}

interface SQQQPortfolioSummaryProps {
    shortPositions: Position[];
    longPositions: Position[];
}

const SQQQPortfolioSummary: React.FC<SQQQPortfolioSummaryProps> = ({ shortPositions, longPositions }) => {
  

    const formatCurrency = (value: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const formatDate = (dateString: string): string => {
        // Split on "T" and take the date part
        const datePart = dateString.split('T')[0];
        
        // Create a date from the date part
        const date = new Date(datePart);
        

        // Format the date as YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    };

    const formatPercent = (value: number): string => {
        return `${value.toFixed(2)}%`;
    };

    const formatPercentTable = (value: number): string => {
        return `${(value*100).toFixed(2)}%`
    };


    // Calculate long positions summary
    const longSummary = {
        totalQuantity: longPositions.reduce((sum, pos) => sum + pos.Quantity, 0),
        totalValue: longPositions.reduce((sum, pos) => sum + (pos.Quantity * pos["Current Price"]), 0),
        totalCost: longPositions.reduce((sum, pos) => sum + (pos.Quantity * pos["Average Cost Basis"]), 0),
        averageCost: longPositions.length > 0 
            ? longPositions.reduce((sum, pos) => sum + (pos.Quantity * pos["Average Cost Basis"]), 0) / 
              longPositions.reduce((sum, pos) => sum + pos.Quantity, 0)
            : 0,
        totalGainLoss: longPositions.reduce((sum, pos) => {
            return sum + ((pos["Current Price"] - pos["Average Cost Basis"]) * pos.Quantity);
        }, 0),
    };

    // Calculate short positions summary
    const shortSummary = {
        totalQuantity: shortPositions.reduce((sum, pos) => sum + pos.Quantity, 0), // Already negative
        totalValue: shortPositions.reduce((sum, pos) => sum + (Math.abs(pos.Quantity) * pos["Current Price"]), 0),
        totalCost: shortPositions.reduce((sum, pos) => sum + (Math.abs(pos.Quantity) * pos["Average Cost Basis"]), 0),
        averageCost: shortPositions.length > 0
            ? shortPositions.reduce((sum, pos) => sum + (Math.abs(pos.Quantity) * pos["Average Cost Basis"]), 0) / 
              shortPositions.reduce((sum, pos) => sum + Math.abs(pos.Quantity), 0)
            : 0,
        totalGainLoss: shortPositions.reduce((sum, pos) => {
            // For shorts, profit is made when price goes down
            return sum + ((pos["Average Cost Basis"] - pos["Current Price"]) * Math.abs(pos.Quantity));
        }, 0),
    };

    // Overall portfolio metrics
    const overallSummary = {
        netQuantity: longSummary.totalQuantity + shortSummary.totalQuantity,
        totalValue: Math.abs(longSummary.totalQuantity + shortSummary.totalQuantity) * 33.52, // Using current price
        totalGainLoss: longSummary.totalGainLoss + shortSummary.totalGainLoss,
        rateOfReturn: ((longSummary.totalGainLoss + shortSummary.totalGainLoss) / 
            (Math.abs(longSummary.totalCost) + Math.abs(shortSummary.totalCost))) * 100
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold">SQQQ Day Late Dollar Richer</h2>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Price: {formatCurrency(33.52)}</p>
                    <p className="text-2xl font-semibold">
                        Overall P&L: <span className={overallSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(overallSummary.totalGainLoss)}
                        </span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                {/* Overall Summary Card */}
                <Card className="col-span-full">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
                        <CardTitle>Overall Portfolio Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Net Position</p>
                                <p className="text-2xl font-bold">{overallSummary.netQuantity}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Total Value</p>
                                <p className="text-2xl font-bold">{formatCurrency(overallSummary.totalValue)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Total P&L</p>
                                <p className={`text-2xl font-bold ${overallSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(overallSummary.totalGainLoss)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Rate of Return</p>
                                <p className={`text-2xl font-bold ${overallSummary.rateOfReturn >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {formatPercent(overallSummary.rateOfReturn)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Long and Short Summary Cards */}
                <Card className="col-span-1 md:col-span-3">
                    <CardHeader className="bg-green-600 text-white rounded-t-lg">
                        <CardTitle>Long Positions</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Shares</p>
                                    <p className="text-xl font-semibold">{longSummary.totalQuantity}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Average Cost</p>
                                    <p className="text-xl font-semibold">{formatCurrency(longSummary.averageCost)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Value</p>
                                    <p className="text-xl font-semibold">{formatCurrency(longSummary.totalValue)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total P&L</p>
                                    <p className={`text-xl font-semibold ${longSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(longSummary.totalGainLoss)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-3">
                    <CardHeader className="bg-red-600 text-white rounded-t-lg">
                        <CardTitle>Short Positions</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Shares</p>
                                    <p className="text-xl font-semibold">{shortSummary.totalQuantity}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Average Cost</p>
                                    <p className="text-xl font-semibold">{formatCurrency(shortSummary.averageCost)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Value</p>
                                    <p className="text-xl font-semibold">{formatCurrency(shortSummary.totalValue)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total P&L</p>
                                    <p className={`text-xl font-semibold ${shortSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {formatCurrency(shortSummary.totalGainLoss)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 md:col-span-6">
                    <Tabs defaultValue="long" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger 
                                value="long"
                                className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-md transition-all duration-200"
                            >
                                Long Positions
                            </TabsTrigger>
                            <TabsTrigger 
                                value="short"
                                className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:font-bold data-[state=active]:shadow-md transition-all duration-200"
                            >
                                Short Positions
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="long" className="p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">Acquired</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead className="text-center">Cost Basis</TableHead>
                                        <TableHead className="text-center">Current Price</TableHead>
                                        <TableHead className="text-center">Market Value</TableHead>
                                        <TableHead className="text-center">Gain/Loss</TableHead>
                                        <TableHead className="text-center">% G/L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {longPositions.map((position, index) => {
                                        const marketValue = position.Quantity * position["Current Price"];
                                        const costBasis = position.Quantity * position["Average Cost Basis"];
                                        const gainLoss = marketValue - costBasis;
                                        
                                        return (
                                            <TableRow key={index}>
                                                <TableCell className="text-center">{position.Acquired}</TableCell>
                                                <TableCell className="text-center">{position.Quantity}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(position["Average Cost Basis"])}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(position["Current Price"])}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(marketValue)}</TableCell>
                                                <TableCell className={`text-center ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {formatCurrency(gainLoss)}
                                                </TableCell>
                                                <TableCell className={`text-center ${position["% Total Gain/Loss"] >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {formatPercentTable(position["% Total Gain/Loss"])}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TabsContent>
                        <TabsContent value="short" className="p-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center">Acquired</TableHead>
                                        <TableHead className="text-center">Quantity</TableHead>
                                        <TableHead className="text-center">Cost Basis</TableHead>
                                        <TableHead className="text-center">Current Price</TableHead>
                                        <TableHead className="text-center">Market Value</TableHead>
                                        <TableHead className="text-center">Gain/Loss</TableHead>
                                        <TableHead className="text-center">% G/L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shortPositions.map((position, index) => {
                                        const marketValue = Math.abs(position.Quantity) * position["Current Price"];
                                        const costBasis = Math.abs(position.Quantity) * position["Average Cost Basis"];
                                        // For shorts, profit is made when price goes down
                                        const gainLoss = (position["Average Cost Basis"] - position["Current Price"]) * Math.abs(position.Quantity);
                                        
                                        return (
                                            <TableRow key={index}>
                                                <TableCell className="text-center">{formatDate(position.Acquired)}</TableCell>
                                                <TableCell className="text-center">{position.Quantity}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(position["Average Cost Basis"])}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(position["Current Price"])}</TableCell>
                                                <TableCell className="text-center">{formatCurrency(marketValue)}</TableCell>
                                                <TableCell className={`text-center ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {formatCurrency(gainLoss)}
                                                </TableCell>
                                                <TableCell className={`text-center ${position["% Total Gain/Loss"] >= 0 ? "text-green-600" : "text-red-600"}`}>
                                                    {formatPercentTable(position["% Total Gain/Loss"])}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TabsContent>
                    </Tabs>
                </Card>
            </div>
        </div>
    );
};

export default SQQQPortfolioSummary; 