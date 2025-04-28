import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { FormattedTrade } from './PortfolioSummary';
import { Button } from "../components/ui/button";
import { Eye } from "lucide-react";
import { useState } from "react";

interface TradeHistoryProps {
  trades: FormattedTrade[];
}

const ITEMS_PER_PAGE = 5; // Define items per page

const TradeHistory = ({ trades }: TradeHistoryProps) => {
  const [currentPage, setCurrentPage] = useState(1); // State for current page

  // Calculate total pages
  const totalPages = Math.ceil(trades.length / ITEMS_PER_PAGE);

  // Calculate the trades to display for the current page
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTrades = trades.slice(startIndex, endIndex);

  // State to manage column visibility
  //console.log("TradeHistory: Fetched trades:", trades);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    'Date of Trade': true,
    'Action': false,
    'Symbol': true,
    'Description': false,
    'Type': true,
    'Quantity': true,
    'Price ($)': true,
    'Commission ($)': false,
    'Fees ($)': false,
    'Accrued Interest ($)': false,
    'Amount ($)': true,
    'Cash Balance ($)': false,
    'Settlement Date': false,
    'Trade Confirmation': true,
    'split_adjustment_factor': false,
    'unadjusted_price': false,
    'unadjusted_quantity': false,
  });

  // Column visibility panel component
  const ColumnVisibilityPanel = ({ columnVisibility, toggleColumnVisibility }: { 
    columnVisibility: Record<string, boolean>, 
    toggleColumnVisibility: (key: string) => void 
  }) => (
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

  const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false);

  // Function to toggle column visibility
  const toggleColumnVisibility = (key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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

  // Add this helper function near the top of the component
  const formatNumber = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Pagination handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  if (!trades || trades.length === 0) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No trade history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-3 h-full">
   
      <CardContent className="p-0 h-full border-red-900 dark:border-gray-700">
        <div className="relative overflow-x-auto">
          <table className="w-full text-md text-center border-collapse ">
            <thead className="text-ms ">
              <tr className="text-md bg-grey-600 text-black">
                {columnVisibility['Date of Trade'] && <th className="px-6 py-3 border border-gray-200 dark:border-gray-700">Trade Date</th>}
               
                {columnVisibility['Quantity'] && <th className="px-6 py-3 border border-gray-200 dark:border-gray-700">Qty</th>}
                {columnVisibility['Price ($)'] && <th className="px-6 py-3 border border-gray-200 dark:border-gray-700">Price</th>}
                {columnVisibility['Amount ($)'] && <th className="px-6 py-3 border border-gray-200 dark:border-gray-700">Amount</th>}
              </tr>
            </thead>
            <tbody>
              {currentTrades.map((trade, index) =>{
                //console.log(trade);
                return(
                <tr key={`${trade['Symbol']}-${startIndex + index}`} className="border-b">
                  {columnVisibility['Date of Trade'] && <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">{formatDate(trade['Date of Trade'])}</td>}
               
                  {columnVisibility['Quantity'] && (
                    <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">
                      {trade['Quantity']}
                    </td>
                  )}
                  {columnVisibility['Price ($)'] && (
                    <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">
                      ${trade['Price ($)']}
                    </td>
                  )}
                  {columnVisibility['Amount ($)'] && (
                    <td className="px-6 py-4 border border-gray-200 dark:border-gray-700">${(trade['Amount ($)']).toFixed(2)}</td>
                  )}
                </tr>
              )})}
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

export default TradeHistory; 