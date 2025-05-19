import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import BeamDeflectionCalculator from './components/BeamDeflectionCalculator'
import OhmsLawCalculator from './components/OhmsLawCalculator'
import PipeFlowCalculator from './components/PipeFlowCalculator'
import HeatTransferCalculator from './components/HeatTransferCalculator'
import NotFound from './components/NotFound'

function App() {
  return (
    <Router>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-6">Engineering Calculators</h1>
        
        {/* Navigation */}
        <nav className="bg-slate-100 p-4 rounded-lg mb-8 shadow-md">
          <ul className="flex flex-wrap justify-center gap-4">
            <li>
              <Link to="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Home
              </Link>
            </li>
            <li>
              <Link to="/beam-deflection" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Beam Deflection
              </Link>
            </li>
            <li>
              <Link to="/ohms-law" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Ohm's Law
              </Link>
            </li>
            <li>
              <Link to="/pipe-flow" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Pipe Flow
              </Link>
            </li>
            <li>
              <Link to="/heat-transfer" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                Heat Transfer
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Routes */}
        <Routes>
          <Route path="/" element={
            <div className="grid gap-8 place-items-center">
              <h2 className="text-xl font-semibold text-center">Select a calculator from the navigation menu</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to="/beam-deflection" className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition">
                  <h3 className="text-lg font-bold mb-2">Beam Deflection Calculator</h3>
                  <p className="text-gray-600">Calculate deflection in beams under various loading conditions</p>
                </Link>
                <Link to="/ohms-law" className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition">
                  <h3 className="text-lg font-bold mb-2">Ohm's Law Calculator</h3>
                  <p className="text-gray-600">Calculate voltage, current, or resistance using Ohm's Law</p>
                </Link>
                <Link to="/pipe-flow" className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition">
                  <h3 className="text-lg font-bold mb-2">Pipe Flow Calculator</h3>
                  <p className="text-gray-600">Calculate flow rates and pressure drops in pipe systems</p>
                </Link>
                <Link to="/heat-transfer" className="p-6 bg-white shadow-md rounded-lg hover:shadow-lg transition">
                  <h3 className="text-lg font-bold mb-2">Heat Transfer Calculator</h3>
                  <p className="text-gray-600">Calculate heat transfer via conduction, convection, and radiation</p>
                </Link>
              </div>
            </div>
          } />
          <Route path="/beam-deflection" element={<BeamDeflectionCalculator />} />
          <Route path="/ohms-law" element={<OhmsLawCalculator />} />
          <Route path="/pipe-flow" element={<PipeFlowCalculator />} />
          <Route path="/heat-transfer" element={<HeatTransferCalculator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
