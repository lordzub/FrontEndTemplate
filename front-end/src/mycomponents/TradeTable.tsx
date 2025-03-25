import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { ChevronDown, ChevronUp, ChevronsUpDown, Pencil, Trash2, Eye, FileText, Plus } from "lucide-react";
import { format, isValid, parse } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "../components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import axios from 'axios';

// Updated interface to match the API data structure
interface Trade {
    'Date of Trade': string;
    'Action': string;
    'Symbol': string;
    'Description': string;
    'Type': string;
    'Quantity': number;
    'Price ($)': number;
    'Commission ($)': number;
    'Fees ($)': number;
    'Accrued Interest ($)': number;
    'Amount ($)': number;
    'Cash Balance ($)': number;
    'Settlement Date': string;
    'Trade Confirmation': string | null;
    [key: string]: any; // Allow for dynamic properties
}

interface TradeTableProps {
    initialTrades?: Trade[];
    onTradeUpdate?: () => void;
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

const API_BASE_URL = 'https://port-tracker-a42556a33892.herokuapp.com/'; // Adjust based on your Flask server port

const TradeTable = ({ initialTrades = [], onTradeUpdate }: TradeTableProps): JSX.Element => {
    const [trades, setTrades] = useState<Trade[]>(initialTrades);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newTrade, setNewTrade] = useState<Partial<Trade>>({});
    const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

    // State to manage column visibility
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
        'Date of Trade': true,
        'Symbol': true,
        'Action': false,
        'Quantity': true,
        'Price ($)': true,
        'Amount ($)': true,
        'Settlement Date': false,
        'Commission ($)': false,
        'Fees ($)': false,
        'Accrued Interest ($)': false,
        'Cash Balance ($)': true,
        'Description': false,
        'Type': true,
        'Trade Confirmation': true,
        'split_adjustment_factor': true,
        'unadjusted_price': true,
        'unadjusted_quantity': true,
    });

    const ITEMS_PER_PAGE = 50;

    // Fetch trades from API
    useEffect(() => {
        const fetchTrades = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/get_trades`);
                if (response.data.trades) {
                    setTrades(response.data.trades);
                } else {
                    setError('Unexpected API response format');
                }
            } catch (err) {
                setError('Failed to fetch trades');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTrades();
    }, []);

    // Sorting logic
    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Add this helper function
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
            return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : dateStr;
        } catch (error) {
            console.error("Error formatting date:", error);
            return dateStr; // Return the original string if parsing fails
        }
    };

    // Apply filters and sorting
    const filteredAndSortedTrades = trades
        .filter(trade => {
            // Search across all fields
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return Object.values(trade).some(value => 
                    String(value).toLowerCase().includes(searchLower)
                );
            }
            
            return true;
        })
        .sort((a, b) => {
            if (!sortConfig) return 0;
            
            const { key, direction } = sortConfig;
            const aValue = a[key];
            const bValue = b[key];

            // Add special handling for dates
            if (key === 'Date of Trade' || key === 'Settlement Date') {
                // Parse date strings in YYYY-MM-DD format
                const aDate = aValue ? new Date(aValue.split('T')[0]) : new Date(0);
                const bDate = bValue ? new Date(bValue.split('T')[0]) : new Date(0);
                
                // Compare timestamps
                return direction === 'asc' 
                    ? aDate.getTime() - bDate.getTime()
                    : bDate.getTime() - aDate.getTime();
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return direction === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return direction === 'asc' 
                    ? aValue - bValue
                    : bValue - aValue;
            }

            return 0;
        });

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) return <ChevronsUpDown className="h-4 w-4" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />;
    };

    // Paginate trades
    const paginatedTrades = filteredAndSortedTrades.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(filteredAndSortedTrades.length / ITEMS_PER_PAGE);

    const handleEdit = (trade: Trade) => {
        // Format dates for the edit form
        const formattedTrade = {
            ...trade,
            'Date of Trade': trade['Date of Trade']?.split('T')[0] || '',
            'Settlement Date': trade['Settlement Date']?.split('T')[0] || ''
        };
        setEditingTrade(formattedTrade);
        setIsEditDialogOpen(true);
    };

    const handleDelete = (trade: Trade) => {
        setTradeToDelete(trade);
        setIsDeleteDialogOpen(true);
    };

    const handleUpdateTrade = async (updatedTrade: Trade) => {
        try {
            await axios.put(`${API_BASE_URL}/update_trade`, {
                ...updatedTrade,
                original_trade_date: editingTrade?.['Date of Trade'],
                original_symbol: editingTrade?.['Symbol']
            });
            
            const response = await axios.get(`${API_BASE_URL}/get_trades`);
            if (response.data.trades) {
                setTrades(response.data.trades);
                if (onTradeUpdate) onTradeUpdate();
            }
            
            setIsEditDialogOpen(false);
            setEditingTrade(null);
        } catch (err) {
            setError('Failed to update trade');
            console.error(err);
        }
    };

    const handleConfirmDelete = async () => {
        if (!tradeToDelete) return;
        
        try {
            await axios.delete(`${API_BASE_URL}/delete_trade`, {
                data: tradeToDelete  // Send the entire trade object instead of just date and symbol
            });
            
            const response = await axios.get(`${API_BASE_URL}/get_trades`);
            if (response.data.trades) {
                setTrades(response.data.trades);
                if (onTradeUpdate) onTradeUpdate();
            }
            
            setIsDeleteDialogOpen(false);
            setTradeToDelete(null);
        } catch (err) {
            setError('Failed to delete trade');
            console.error(err);
        }
    };

    const handleAddTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const formData = new FormData(e.target as HTMLFormElement);
            const tradeData = {
                'Date of Trade': formData.get('new-date'),
                'Symbol': formData.get('new-symbol'),
                'Action': formData.get('new-action'),
                'Type': formData.get('new-type'),
                'Quantity': Number(formData.get('new-quantity')),
                'Price ($)': Number(formData.get('new-price')),
                'Commission ($)': Number(formData.get('new-commission')) || 0,
                'Fees ($)': Number(formData.get('new-fees')) || 0,
                'Settlement Date': formData.get('new-settlement'),
                'Description': formData.get('new-description'),
                'Trade Confirmation': formData.get('new-confirmation') || null,
                'Accrued Interest ($)': 0,
                'Amount ($)': Number(formData.get('new-quantity')) * Number(formData.get('new-price')),
            };

            await axios.post(`${API_BASE_URL}/add_trade`, tradeData);
            
            // Refresh the trades list
            const response = await axios.get(`${API_BASE_URL}/get_trades`);
            if (response.data.trades) {
                setTrades(response.data.trades);
                if (onTradeUpdate) onTradeUpdate();
            }
            
            setIsAddDialogOpen(false);
        } catch (err) {
            setError('Failed to add trade');
            console.error(err);
        }
    };

    // Define columns to display
    const displayColumns = [
        { key: 'Date of Trade', label: 'TRADE DATE' },
        { key: 'Symbol', label: 'SYMBOL' },
        { key: 'Action', label: 'ACTION' },
        { key: 'Quantity', label: 'SIZE' },
        { key: 'Price ($)', label: 'PRICE PER LOT' },
        { key: 'Amount ($)', label: 'PRINCIPAL AMOUNT' },
        { key: 'Settlement Date', label: 'SETTLEMENT DATE' },
        { key: 'Commission ($)', label: 'COMMISSION' },
        { key: 'Fees ($)', label: 'FEES' },
        { key: 'Accrued Interest ($)', label: 'ACCRUED INTEREST' },
        { key: 'Cash Balance ($)', label: 'CASH BALANCE' },
        { key: 'Description', label: 'DESCRIPTION' },
        { key: 'Type', label: 'TYPE' },
        
        { key: 'split_adjustment_factor', label: 'SPLIT ADJUSTMENT FACTOR' },
        { key: 'unadjusted_price', label: 'UNADJUSTED PRICE' },
        { key: 'unadjusted_quantity', label: 'UNADJUSTED QUANTITY' },
        { key: 'Trade Confirmation', label: 'CONFIRMATION' },
    ];

    // Function to toggle column visibility
    const toggleColumnVisibility = (key: string) => {
        setColumnVisibility(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const ColumnVisibilityPanel = ({ columnVisibility, toggleColumnVisibility }: { columnVisibility: Record<string, boolean>, toggleColumnVisibility: (key: string) => void }) => (
        <div className="flex flex-col gap-2 p-2 border rounded shadow-md bg-white">
            {Object.keys(columnVisibility).map(key => (
                <label key={key} className="flex items-center gap-1">
                    <input
                        type="checkbox"
                        checked={columnVisibility[key]}
                        onChange={() => toggleColumnVisibility(key)}
                    />
                    {key}
                </label>
            ))}
        </div>
    );

    // UI for toggling column visibility
    const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false);

    const renderColumnVisibilityToggles = () => {
        return (
            <div className="relative">
                <Button variant="ghost" onClick={() => setIsColumnPanelOpen(!isColumnPanelOpen)}>
                    <Eye className="h-6 w-6" />
                </Button>
                {isColumnPanelOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50">
                        <ColumnVisibilityPanel 
                            columnVisibility={columnVisibility} 
                            toggleColumnVisibility={toggleColumnVisibility} 
                        />
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="text-center py-4">Loading trades...</div>;
    if (error) return <div className="text-center py-4 text-red-500">{error}</div>;

    return (
        <div className="space-y-4 w-full">
            {/* Column visibility toggles */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search trades..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm rounded-xl"
                    />
                    <Button 
                        variant="ghost" 
                        className="flex items-center gap-2 border border-black rounded-xl py-1 w-64"
                        onClick={() => setIsAddDialogOpen(true)}
                    >
                        <Plus className="h-5" />
                        <span>Add Trade</span>
                    </Button>
                </div>
                <div className="relative">
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsColumnPanelOpen(!isColumnPanelOpen)}
                        className="p-2"
                    >
                        <Eye className="h-6 w-6" />
                    </Button>
                    {isColumnPanelOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50">
                            <ColumnVisibilityPanel 
                                columnVisibility={columnVisibility} 
                                toggleColumnVisibility={toggleColumnVisibility} 
                            />
                        </div>
                    )}
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {displayColumns.map((column) => (
                            columnVisibility[column.key] && (
                                <TableHead key={column.key}>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleSort(column.key)}
                                        className="flex items-center gap-1"
                                    >
                                        {column.label}
                                        {getSortIcon(column.key)}
                                    </Button>
                                </TableHead>
                            )
                        ))}
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTrades.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={displayColumns.length + 1} className="text-center py-4">
                                No trades found
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedTrades.map((trade, index) => (
                            <TableRow key={index}>
                                {displayColumns.map((column) => (
                                    columnVisibility[column.key] && (
                                        <TableCell key={column.key} className={column.key === 'Action' ? 'max-w-xs overflow-hidden text-ellipsis whitespace-nowrap' : 'align-middle text-center' }>
                                            {column.key === 'Trade Confirmation' ? (
                                                trade[column.key] ? (
                                                    <div className="flex items-center justify-center">
                                                    <a href={trade[column.key] || ''} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                                                    </a>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center">
                                                    <FileText className="h-4 w-4 text-gray-300 align-middle" />
                                                    </div>
                                                )
                                            ) : column.key === 'Date of Trade' || column.key === 'Settlement Date' ? (
                                                formatDate(trade[column.key])
                                            ) : column.key === 'Quantity' || column.key === 'Price ($)' ? (
                                                Number(trade[column.key]).toFixed(2)
                                            ) : (
                                                trade[column.key]
                                            )}
                                        </TableCell>
                                    )
                                ))}
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(trade)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(trade)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Edit Trade</DialogTitle>
                        <DialogDescription>
                            Make changes to the trade details below.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTrade && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdateTrade(editingTrade);
                        }}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date">Date of Trade</Label>
                                    <Input
                                        id="date"
                                        type="text"
                                        placeholder="YYYY-MM-DD"
                                        value={editingTrade['Date of Trade']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Date of Trade': e.target.value
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="symbol">Symbol</Label>
                                    <Input
                                        id="symbol"
                                        value={editingTrade['Symbol']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Symbol': e.target.value
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="action">Action</Label>
                                    <Input
                                        id="action"
                                        value={editingTrade['Action']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Action': e.target.value
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type">Type</Label>
                                    <Input
                                        id="type"
                                        value={editingTrade['Type']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Type': e.target.value
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="quantity">Quantity</Label>
                                    <Input
                                        id="quantity"
                                        type="number"
                                        step="0.01"
                                        value={editingTrade['Quantity']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Quantity': Number(e.target.value)
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="price">Price ($)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        step="0.01"
                                        value={editingTrade['Price ($)']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Price ($)': Number(e.target.value)
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="commission">Commission ($)</Label>
                                    <Input
                                        id="commission"
                                        type="number"
                                        step="0.01"
                                        value={editingTrade['Commission ($)']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Commission ($)': Number(e.target.value)
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="fees">Fees ($)</Label>
                                    <Input
                                        id="fees"
                                        type="number"
                                        step="0.01"
                                        value={editingTrade['Fees ($)']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Fees ($)': Number(e.target.value)
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="settlement">Settlement Date</Label>
                                    <Input
                                        id="settlement"
                                        type="text"
                                        placeholder="YYYY-MM-DD"
                                        value={editingTrade['Settlement Date']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Settlement Date': e.target.value
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        value={editingTrade['Description']}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Description': e.target.value
                                        })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="tradeConfirmation">Trade Confirmation URL</Label>
                                    <Input
                                        id="tradeConfirmation"
                                        type="url"
                                        value={editingTrade['Trade Confirmation'] || ''}
                                        onChange={(e) => setEditingTrade({
                                            ...editingTrade,
                                            'Trade Confirmation': e.target.value
                                        })}
                                        placeholder="https://..."
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Confirm Delete</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this trade? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Trade Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="bg-white">
                    <DialogHeader>
                        <DialogTitle>Add New Trade</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new trade.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTrade}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-date">Date of Trade</Label>
                                <Input
                                    id="new-date"
                                    name="new-date"
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-symbol">Symbol</Label>
                                <Input
                                    id="new-symbol"
                                    name="new-symbol"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-action">Action</Label>
                                <Input
                                    id="new-action"
                                    name="new-action"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-type">Type</Label>
                                <Input
                                    id="new-type"
                                    name="new-type"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-quantity">Quantity</Label>
                                <Input
                                    id="new-quantity"
                                    name="new-quantity"
                                    type="number"
                                    step="0.01"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-price">Price ($)</Label>
                                <Input
                                    id="new-price"
                                    name="new-price"
                                    type="number"
                                    step="0.01"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-commission">Commission ($)</Label>
                                <Input
                                    id="new-commission"
                                    name="new-commission"
                                    type="number"
                                    step="0.01"
                                    defaultValue="0.00"
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-fees">Fees ($)</Label>
                                <Input
                                    id="new-fees"
                                    name="new-fees"
                                    type="number"
                                    step="0.01"
                                    defaultValue="0.00"
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-settlement">Settlement Date</Label>
                                <Input
                                    id="new-settlement"
                                    name="new-settlement"
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    required
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-description">Description</Label>
                                <Input
                                    id="new-description"
                                    name="new-description"
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-confirmation">Trade Confirmation URL</Label>
                                <Input
                                    id="new-confirmation"
                                    name="new-confirmation"
                                    type="url"
                                    placeholder="https://..."
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Add Trade</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Pagination controls */}
            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-gray-500">
                    Showing {filteredAndSortedTrades.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTrades.length)} of {filteredAndSortedTrades.length} trades
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TradeTable; 