import React, { useState } from 'react';
import axios from 'axios';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

interface CreateTradeFormProps {
    onTradeCreated: () => void;
}

const CreateTradeForm: React.FC<CreateTradeFormProps> = ({ onTradeCreated }) => {
    const [error, setError] = useState<string | null>(null);
    const [newTrade, setNewTrade] = useState({
        order_no: '',
        reference: '',
        trade_date: '',
        settlement_date: '',
        size: '',
        price_per_lot: '',
        action: 'Buy',
        symbol: '',
        principal_amount: ''
    });

    const handleSubmitTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/add_trade', newTrade);
            // Reset form
            setNewTrade({
                order_no: '',
                reference: '',
                trade_date: '',
                settlement_date: '',
                size: '',
                price_per_lot: '',
                action: 'Buy',
                symbol: '',
                principal_amount: ''
            });
            onTradeCreated(); // Notify parent component to refresh trades
        } catch (err) {
            setError(axios.isAxiosError(err) 
                ? err.response?.data?.message || err.message 
                : 'Failed to create trade');
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create New Trade</CardTitle>
            </CardHeader>
            <CardContent>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                <form onSubmit={handleSubmitTrade} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="order_no" className="text-sm font-medium">Order Number</label>
                            <Input
                                id="order_no"
                                value={newTrade.order_no}
                                onChange={(e) => setNewTrade({...newTrade, order_no: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="reference" className="text-sm font-medium">Reference</label>
                            <Input
                                id="reference"
                                value={newTrade.reference}
                                onChange={(e) => setNewTrade({...newTrade, reference: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="trade_date" className="text-sm font-medium">Trade Date</label>
                            <Input
                                id="trade_date"
                                type="date"
                                value={newTrade.trade_date}
                                onChange={(e) => setNewTrade({...newTrade, trade_date: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="settlement_date" className="text-sm font-medium">Settlement Date</label>
                            <Input
                                id="settlement_date"
                                type="date"
                                value={newTrade.settlement_date}
                                onChange={(e) => setNewTrade({...newTrade, settlement_date: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="size" className="text-sm font-medium">Size</label>
                            <Input
                                id="size"
                                type="number"
                                value={newTrade.size}
                                onChange={(e) => setNewTrade({...newTrade, size: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="price_per_lot" className="text-sm font-medium">Price per Lot</label>
                            <Input
                                id="price_per_lot"
                                type="number"
                                step="0.01"
                                value={newTrade.price_per_lot}
                                onChange={(e) => setNewTrade({...newTrade, price_per_lot: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="action" className="text-sm font-medium">Action</label>
                            <Select 
                                value={newTrade.action} 
                                onValueChange={(value) => setNewTrade({...newTrade, action: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Buy">Buy</SelectItem>
                                    <SelectItem value="Sell">Sell</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="symbol" className="text-sm font-medium">Symbol</label>
                            <Input
                                id="symbol"
                                value={newTrade.symbol}
                                onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="principal_amount" className="text-sm font-medium">Principal Amount</label>
                            <Input
                                id="principal_amount"
                                type="number"
                                step="0.01"
                                value={newTrade.principal_amount}
                                onChange={(e) => setNewTrade({...newTrade, principal_amount: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full">Create Trade</Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default CreateTradeForm; 