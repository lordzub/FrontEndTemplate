import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import MessageCard from './Jefferey'
import TradeTracker from './mycomponents/Tradetracker'
import Overview from './mycomponents/Overview'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        {/* <TradeTracker/> */}
        <Overview/>
        </>
  )
}

export default App
