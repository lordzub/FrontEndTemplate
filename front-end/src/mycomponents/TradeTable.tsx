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
import { ChevronDown, ChevronUp, ChevronsUpDown, FileText } from "lucide-react";
import { format, isValid, parse } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "../components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import axios from 'axios';

// Updated interface to match the provided example object
interface Trade {
    'Date of Trade': string;
    'Symbol': string;
    'Quantity': number;
    'Price ($)': number;
    'Amount ($)': number;
    'Current Price'?: number; // Added based on example, marked as optional
    [key: string]: any; // Keep for flexibility if other fields might exist
}

interface TradeTableProps {
    initialTrades?: Trade[];
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

const API_BASE_URL = 'https://port-tracker-a42556a33892.herokuapp.com//'; // Adjust based on your Flask server port

const TradeTable = ({ initialTrades = [] }: TradeTableProps): JSX.Element => {
    const [trades, setTrades] = useState<Trade[]>(initialTrades);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 50;

    // Sorting logic
    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Add this helper function
    const formatDate = (dateStr: string) => {
        // Attempt to parse the new format MM/DD/YYYY
        if (!dateStr) return '';
        try {
            // First, try parsing MM/DD/YYYY
            let parsed = parse(dateStr, 'MM/dd/yyyy', new Date());
            if (isValid(parsed)) {
                return format(parsed, 'MMM d, yyyy');
            }
            // Fallback to YYYY-MM-DD if the first parse failed
            parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
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
            if (key === 'Date of Trade') { // Removed 'Settlement Date'
                // Attempt to handle both potential date formats
                const parseDate = (val: string) => {
                    if (!val) return new Date(0);
                    let date = parse(val, 'MM/dd/yyyy', new Date());
                    if (!isValid(date)) {
                        date = new Date(val.split('T')[0]); // Handle YYYY-MM-DD format
                    }
                    return isValid(date) ? date : new Date(0);
                };
                const aDate = parseDate(aValue);
                const bDate = parseDate(bValue);
                
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

    // Define columns to display - Use keys as labels
    const displayColumns = [
        { key: 'Date of Trade', label: 'Date of Trade' },
        { key: 'Symbol', label: 'Symbol' },
        { key: 'Quantity', label: 'Quantity' }, // Changed label
        { key: 'Price ($)', label: 'Price ($)' }, // Changed label
        { key: 'Amount ($)', label: 'Amount ($)' }, // Changed label
        { key: 'Current Price', label: 'Current Price' }, // Changed label
    ];

    return (
        <div className="space-y-4 w-full">
            {/* Column visibility toggles removed */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search trades..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm rounded-xl border-gray-300"
                    />
                </div>
                {/* Removed the visibility toggle button and panel */}
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {/* Removed check for columnVisibility */}
                        {displayColumns.map((column) => (
                            <TableHead key={column.key} className="text-center">
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort(column.key)}
                                    className="flex items-center justify-center gap-1 mx-auto"
                                >
                                    {/* Use the column key directly as the header */}
                                    {column.key}
                                    {getSortIcon(column.key)}
                                </Button>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedTrades.length === 0 ? (
                        <TableRow>
                            <TableCell
                                // Set colSpan to the fixed number of columns
                                colSpan={displayColumns.length}
                                className="text-center py-4"
                            >
                                No trades found
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedTrades.map((trade, index) => (
                            <TableRow key={index}>
                                {/* Removed check for columnVisibility */}
                                {displayColumns.map((column) => (
                                    <TableCell key={column.key} className="text-center align-middle">
                                        {column.key === 'Date of Trade' ? (
                                            formatDate(trade[column.key])
                                        ) : column.key === 'Quantity' || column.key === 'Price ($)' || column.key === 'Amount ($)' || column.key === 'Current Price' ? (
                                            typeof trade[column.key] === 'number' ? trade[column.key].toFixed(2) : trade[column.key]
                                        ) : (
                                            trade[column.key]
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

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