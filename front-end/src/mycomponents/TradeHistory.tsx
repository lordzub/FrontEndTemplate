import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { FormattedTrade } from './PortfolioSummary';
import { Button } from "../components/ui/button";
import { Eye } from "lucide-react";
import { useState } from "react";

interface TradeHistoryProps {
  trades: FormattedTrade[];
}

const TradeHistory = ({ trades }: TradeHistoryProps) => {
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
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">

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
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="text-xs uppercase bg-secondary">
              <tr>
                {columnVisibility['Date of Trade'] && <th className="px-6 py-3">Trade Date</th>}
                {columnVisibility['Symbol'] && <th className="px-6 py-3">Symbol</th>}


                {columnVisibility['Quantity'] && <th className="px-6 py-3">Qty</th>}
                {columnVisibility['Price ($)'] && <th className="px-6 py-3">Price</th>}

                {columnVisibility['Amount ($)'] && <th className="px-6 py-3">Amount</th>}
            
   
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, index) =>{ 
                //console.log(trade);
                return(
                <tr key={`${trade['Symbol']}-${index}`} className="border-b">
                  {columnVisibility['Date of Trade'] && <td className="px-6 py-4">{formatDate(trade['Date of Trade'])}</td>}
                  {columnVisibility['Symbol'] && <td className="px-6 py-4">{trade['Symbol']}</td>}
  {columnVisibility['Quantity'] && (
                    <td className="px-6 py-4">
                      {trade['Quantity']}
                    </td>
                  )}
                  {columnVisibility['Price ($)'] && (
                    <td className="px-6 py-4">
                      ${trade['Price ($)']}
                    </td>
                  )}
          
                  {columnVisibility['Amount ($)'] && (
                    <td className="px-6 py-4">${trade['Amount ($)']}</td>
                  )}

                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeHistory; 