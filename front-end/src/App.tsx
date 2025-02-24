import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MessageCard from './Jefferey'
import Overview from './mycomponents/Overview'
import { Routes, Route } from 'react-router-dom'
import Symbol from './mycomponents/Symbol'
import axios from 'axios';
function App() {
  const [symbols, setSymbols] = useState<SymbolTotal[]>([]);
  const [total_value, setTotalValue] = useState<number>(0);
  const [count, setCount] = useState(0)


  useEffect(() => {
    const total_value = symbols.reduce((acc, curr) => acc + curr['total_amount'], 0);
    setTotalValue(total_value);
  },[symbols])
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [symbolsRes] = await Promise.all([
          axios.get('https://day-late-dollar-f3f068eb8581.herokuapp.com/get_nav_symbols'),
        //   axios.get('http://localhost:5000/get_portfolio_stats')
        ]);
        console.log(symbolsRes.data);

        // Sort symbols alphabetically by symbol name
        const sortedSymbols = [...symbolsRes.data].sort((a, b) => 
          a.symbol.localeCompare(b.symbol)
        );
        
        setSymbols(sortedSymbols);
      
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);
  return (
    <>
      <Routes>
        <Route path="/" element={<Overview symbols={symbols} total_value={total_value} />} />
        <Route path="/symbol/:symbol" element={<Symbol />} />
      </Routes>
      {/* <MessageCard/> */}
    </>
  )
}

export default App
