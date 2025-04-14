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
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { format, isValid, parse } from 'date-fns';

// Define the expected structure of a closed position object
interface ClosedPosition {
    'Symbol': string;
    'Quantity': number;
    'Acquired': string;
    'Date Sold': string;
    'Cost Basis': number;
    'Cost Basis Per Share': number;
    'Proceeds': number;
    'Proceeds Per Share': number;
    'Gain/Loss': number;
    [key: string]: any; // For flexibility
}

interface ClosedPositionsTableProps {
    closedPositions: ClosedPosition[];
    columnOrder?: string[]; // Optional array to control column order
}

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
} | null;

// Default column order based on the example provided
const DEFAULT_COLUMN_ORDER = [
    'Symbol',
    'Quantity',
    'Acquired',
    'Date Sold',
    'Cost Basis',
    'Cost Basis Per Share',
    'Proceeds',
    'Proceeds Per Share',
    'Gain/Loss'
];

const ClosedPositionsTable = ({ 
    closedPositions, 
    columnOrder = DEFAULT_COLUMN_ORDER 
}: ClosedPositionsTableProps): JSX.Element => {
    // Get all available columns from the data
    const availableColumns = closedPositions.length > 0 ? Object.keys(closedPositions[0]) : [];
    
    // Build display columns:
    // 1. First take all columns from columnOrder that exist in the data
    // 2. Then add any columns from the data that aren't in columnOrder
    const orderedColumns = [
        ...columnOrder.filter(col => availableColumns.includes(col)),
        ...availableColumns.filter(col => !columnOrder.includes(col))
    ];
    
    // State management
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

    // Helper to format dates
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

    // Helper to format values
    const formatValue = (key: string, value: any) => {
        if (!value && value !== 0) return '';
        
        // Format dates
        if (key.toLowerCase().includes('date') || key === 'Acquired') {
            return formatDate(value);
        }

        // Format currency
        if (key === 'Quantity' ) {
            return value;
        }
        
        // Format Gain/Loss with color
        if (key === 'Gain/Loss') {
            const formattedValue = '$' + Math.abs(value).toFixed(2);
            return (
                <span className={value >= 0 ? "text-green-600" : "text-red-600"}>
                    {value >= 0 ? "+" : "-"}{formattedValue}
                </span>
            );
        }
        
        // Format numbers
        if (typeof value === 'number') {
            return '$' + value.toFixed(2);
        }
        
        return String(value);
    };

    // Apply filters and sorting
    const filteredAndSortedPositions = closedPositions
        .filter(position => {
            // Search across all fields
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return Object.values(position).some(value => 
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
            if (key.toLowerCase().includes('date') || key === 'Acquired') {
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

    // Paginate positions
    const paginatedPositions = filteredAndSortedPositions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(filteredAndSortedPositions.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Search closed positions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm rounded-xl border-gray-300"
                    />
                </div>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        {orderedColumns.map((column) => (
                            <TableHead key={column}>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort(column)}
                                    className="flex items-center gap-1"
                                >
                                    {column}
                                    {getSortIcon(column)}
                                </Button>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedPositions.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={orderedColumns.length || 1}
                                className="text-center py-4"
                            >
                                No closed positions found
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedPositions.map((position, index) => (
                            <TableRow key={index}>
                                {orderedColumns.map((column) => (
                                    <TableCell key={column} className={'align-middle text-center'}>
                                        {formatValue(column, position[column])}
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
                    Showing {filteredAndSortedPositions.length > 0 ? ((currentPage - 1) * ITEMS_PER_PAGE) + 1 : 0} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedPositions.length)} of {filteredAndSortedPositions.length} positions
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

export default ClosedPositionsTable; 