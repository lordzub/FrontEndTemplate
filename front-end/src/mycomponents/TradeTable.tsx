import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Button } from "../components/ui/button";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { format, isValid, parse } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "../components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../components/ui/popover";
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

interface TradeTableProps {
    trades: Trade[];
}

type SortConfig = {
    key: keyof Trade;
    direction: 'asc' | 'desc';
} | null;

const TradeTable: React.FC<TradeTableProps> = ({ trades }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [filters, setFilters] = useState<Partial<Record<keyof Trade, string>>>({});
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: undefined,
        to: undefined
    });

    // Sorting logic
    const handleSort = (key: keyof Trade) => {
        setSortConfig(current => ({
            key,
            direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filter logic
    const handleFilterChange = (key: keyof Trade, value: string) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Add this helper function
    const formatDate = (dateStr: string) => {
        const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
        return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : dateStr;
    };

    // Apply filters and sorting
    const filteredAndSortedTrades = trades
        .filter(trade => {
            // Date range filter
            if (dateRange?.from || dateRange?.to) {
                const tradeDate = parse(trade.trade_date, 'yyyy-MM-dd', new Date());
                if (dateRange.from && tradeDate < dateRange.from) return false;
                if (dateRange.to && tradeDate > dateRange.to) return false;
            }

            // Search across all fields
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                return Object.values(trade).some(value => 
                    String(value).toLowerCase().includes(searchLower)
                );
            }
            
            // Apply column filters
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                const tradeValue = String(trade[key as keyof Trade]).toLowerCase();
                return tradeValue.includes(value.toLowerCase());
            });
        })
        .sort((a, b) => {
            if (!sortConfig) return 0;
            
            const { key, direction } = sortConfig;
            const aValue = a[key];
            const bValue = b[key];

            // Add special handling for dates
            if (key === 'trade_date' || key === 'settlement_date') {
                const aDate = parse(String(aValue), 'yyyy-MM-dd', new Date());
                const bDate = parse(String(bValue), 'yyyy-MM-dd', new Date());
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

    const getSortIcon = (key: keyof Trade) => {
        if (sortConfig?.key !== key) return <ChevronsUpDown className="h-4 w-4" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Input
                    placeholder="Search trades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            
            <Table>
                <TableHeader>
                    <TableRow>
                        {['order_no', 'reference', 'symbol', 'action', 'trade_date', 'settlement_date', 'size', 'price_per_lot', 'principal_amount'].map((key) => (
                            <TableHead key={key}>
                                <Button
                                    variant="ghost"
                                    onClick={() => handleSort(key as keyof Trade)}
                                    className="flex items-center gap-1"
                                >
                                    {key.replace(/_/g, ' ').toUpperCase()}
                                    {getSortIcon(key as keyof Trade)}
                                </Button>
       
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredAndSortedTrades.map((trade, index) => (
                        <TableRow key={index}>
                            <TableCell>{trade.order_no}</TableCell>
                            <TableCell>{trade.reference}</TableCell>
                            <TableCell>{trade.symbol}</TableCell>
                            <TableCell>{trade.action}</TableCell>
                            <TableCell>{formatDate(trade.trade_date)}</TableCell>
                            <TableCell>{formatDate(trade.settlement_date)}</TableCell>
                            <TableCell>{trade.size.toLocaleString()}</TableCell>
                            <TableCell>${trade.price_per_lot.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</TableCell>
                            <TableCell>${trade.principal_amount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default TradeTable; 