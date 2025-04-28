import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Overview from './mycomponents/Overview'
import QQQTracker from './mycomponents/QQQTracker'
import AdminView from './mycomponents/AdminView'
import axios from 'axios'

// Define interfaces
interface SP500Data {
  [key: string]: number;
}

function App() {
  const [access, setAccess] = useState('default')
  const [openTrades, setOpenTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [closedPositions, setClosedPositions] = useState<any[]>([]);
  const [sp500Data, setSP500Data] = useState<SP500Data | null>(null);
  const initialized = useRef(false);

  const fetchOpenTrades = async () => {
    try {
      console.log("App: Fetching open trades...");
      const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com//get_trades');
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("App: Parsed open trades:", parsedData["trades"]);
      const tradesData = parsedData.trades || [];
      setOpenTrades([...tradesData]);
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'An error occurred while fetching open trades');
      throw err;
    }
  };

  const fetchClosedPositions = async () => {
    try {
      console.log("App: Fetching closed positions...");
      const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com//get_closed_positions');
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("App: Parsed closed positions:", parsedData["closed_positions"]);
      const closedPositionsData = parsedData.closed_positions || [];
      setClosedPositions([...closedPositionsData]);
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'An error occurred while fetching closed positions');
      throw err;
    }
  };

  const fetchSP500Data = async () => {
    try {
      console.log("App: Fetching S&P 500 data...");
      const { data } = await axios.get('https://port-tracker-a42556a33892.herokuapp.com//get_sp500_data');
      const spData = data.sp500_data || null;
      console.log("App: Parsed S&P 500 data:", spData);
      setSP500Data(spData);
    } catch (err) {
      const errorMessage = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : 'An error occurred while fetching S&P 500 data';
      setError(errorMessage);
      console.error("Error fetching S&P 500 data:", errorMessage);
      throw err;
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchOpenTrades(), fetchClosedPositions(), fetchSP500Data()]);
    } catch (err) {
      console.error("Error during data fetching: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) return;
    initialized.current = true;

    // Verify token and fetch data
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const initializeApp = async () => {
      if (token) {
        try {
          const response = await axios.post('https://port-tracker-a42556a33892.herokuapp.com/api/verify', { token });
          setAccess(response.data.access);
        } catch (error) {
          console.error('Error verifying token:', error);
        }
      } else {
        console.error('No token found in URL');
      }
      
      // Fetch all data after token verification
      await fetchAllData();
    };

    initializeApp();
  }, []);

  if (loading) return <div>Loading portfolio data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (

      <div className='w-full'>
      <QQQTracker 
              openTrades={openTrades}
              closedPositions={closedPositions}
              sp500Data={sp500Data}
              loading={loading}
              error={error}
            />


      </div>

  )
}

export default App
