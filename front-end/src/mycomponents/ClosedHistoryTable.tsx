import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useState } from "react";
import { Button } from "../components/ui/button";

// Interface for closed position data
export interface ClosedPositionData {
  'Symbol': string;
  'Quantity': number;
  'Acquired': string; // date string
  'Date Sold': string; // date string
  'Proceeds': number;
  'Cost Basis': number;
  'Gain/Loss': number;
  'Cost Basis Per Share'?: number; // optional
  'Proceeds Per Share'?: number; // optional
}

// Interface for sort configuration
export interface SortConfig {
  key: keyof ClosedPositionData | null;
  direction: 'asc' | 'desc';
}

// Component props interface
interface ClosedHistoryTableProps {
  positions: ClosedPositionData[];
  sortConfig: SortConfig;
  onSortChange: (key: keyof ClosedPositionData, direction: 'asc' | 'desc') => void;
}

const ITEMS_PER_PAGE = 5; // Define items per page

const ClosedHistoryTable = ({ positions, sortConfig, onSortChange }: ClosedHistoryTableProps) => {
  const [currentPage, setCurrentPage] = useState(1); // State for current page

  // Calculate total pages
  const totalPages = Math.ceil(positions.length / ITEMS_PER_PAGE);

  // Calculate the positions to display for the current page
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPositions = positions.slice(startIndex, endIndex);

  // Format date helper function
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateStr;
    }
  };

  // Format number helper function
  const formatNumber = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Handle column click for sorting
  const handleColumnClick = (key: keyof ClosedPositionData) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    onSortChange(key, direction);
  };

  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (!positions || positions.length === 0) {
    return (
      <Card className="lg:col-span-3">
        <CardContent>
          <p className="text-muted-foreground">No closed positions available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-3">
    <CardHeader className="flex flex-row items-center justify-between">
    </CardHeader>
    <CardContent>
      {/* <div className="relative">
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
      </div> */}

    <div className="relative overflow-x-auto">
      <table className="w-full text-md text-center border-collapse border border-gray-200 dark:border-gray-700">
        <thead>
          <tr className="text-md bg-grey-600 text-black dark:bg-green-900 border-b border-gray-200 dark:border-gray-700">
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Symbol')}
            >
              Symbol
              {sortConfig.key === 'Symbol' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Quantity')}
            >
              Quantity
              {sortConfig.key === 'Quantity' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Acquired')}
            >
              Acquired
              {sortConfig.key === 'Acquired' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Date Sold')}
            >
              Date Sold
              {sortConfig.key === 'Date Sold' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Cost Basis')}
            >
              Cost Basis
              {sortConfig.key === 'Cost Basis' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Proceeds')}
            >
              Proceeds
              {sortConfig.key === 'Proceeds' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
            <th 
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800"
              onClick={() => handleColumnClick('Gain/Loss')}
            >
              Gain/Loss
              {sortConfig.key === 'Gain/Loss' && (
                <span className="ml-1">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {currentPositions.map((position, index) => (
            <tr key={`${position.Symbol}-${startIndex + index}`} className="border-b">
              <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">{position.Symbol}</td>
              <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">{position.Quantity}</td>
              <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">{formatDate(position.Acquired)}</td>
              <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">{formatDate(position['Date Sold'])}</td>
              <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">${formatNumber(position['Cost Basis'])}</td>
              <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">${formatNumber(position.Proceeds)}</td>
              <td className={`px-6 py-4 border border-gray-200 dark:border-gray-700 ${position['Gain/Loss'] >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                ${formatNumber(position['Gain/Loss'])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* Pagination Controls */}
    <div className="flex justify-center items-center space-x-2 p-4">
      <Button onClick={handlePrevPage} disabled={currentPage === 1}>
        Previous
      </Button>
      <span>Page {currentPage} of {totalPages}</span>
      <Button onClick={handleNextPage} disabled={currentPage === totalPages}>
        Next
      </Button>
    </div>
    </CardContent>
    </Card>
    

  );
};

export default ClosedHistoryTable; 