import { useState, useEffect } from 'react';

export default function PipeFlowCalculator() {
  // Input states
  const [pipeInnerDiameter, setPipeInnerDiameter] = useState(50);
  const [pipeLength, setPipeLength] = useState(100);
  const [fluidDensity, setFluidDensity] = useState(1000);
  const [fluidViscosity, setFluidViscosity] = useState(0.001);
  const [pressureDrop, setPressureDrop] = useState(5000);
  const [flowRate, setFlowRate] = useState(0.001);
  const [roughness, setRoughness] = useState(0.0015);
  
  // Calculation mode (1: Calculate flow rate, 2: Calculate pressure drop)
  const [calculationMode, setCalculationMode] = useState(1);
  
  // Fluid presets
  const fluidPresets = [
    { name: "Water (20°C)", density: 998, viscosity: 0.001 },
    { name: "Air (20°C, 1 atm)", density: 1.2, viscosity: 0.000018 },
    { name: "Oil (SAE 30)", density: 891, viscosity: 0.29 },
    { name: "Glycol (60%)", density: 1150, viscosity: 0.0079 }
  ];
  
  // Pipe material presets (roughness in mm)
  const materialPresets = [
    { name: "PVC/Plastic", roughness: 0.0015 },
    { name: "Copper/Brass", roughness: 0.0015 },
    { name: "Cast Iron", roughness: 0.26 },
    { name: "Galvanized Steel", roughness: 0.15 },
    { name: "Commercial Steel", roughness: 0.045 }
  ];
  
  // Units
  const [diameterUnit, setDiameterUnit] = useState("mm");
  const [lengthUnit, setLengthUnit] = useState("m");
  const [densityUnit, setDensityUnit] = useState("kg/m³");
  const [viscosityUnit, setViscosityUnit] = useState("Pa·s");
  const [pressureUnit, setPressureUnit] = useState("Pa");
  const [flowRateUnit, setFlowRateUnit] = useState("m³/s");
  const [roughnessUnit, setRoughnessUnit] = useState("mm");
  
  // Results
  const [reynoldsNumber, setReynoldsNumber] = useState(0);
  const [frictionFactor, setFrictionFactor] = useState(0);
  const [flowVelocity, setFlowVelocity] = useState(0);
  const [result, setResult] = useState(0);
  const [flowRegime, setFlowRegime] = useState("");
  
  // Unit conversion functions
  const convertToBaseUnits = (value: number, unit: string, type: string): number => {
    if (type === "diameter" || type === "length" || type === "roughness") {
      switch (unit) {
        case "mm": return value / 1000;
        case "cm": return value / 100;
        case "in": return value * 0.0254;
        case "ft": return value * 0.3048;
        default: return value; // m
      }
    } else if (type === "density") {
      switch (unit) {
        case "g/cm³": return value * 1000;
        case "lb/ft³": return value * 16.018;
        default: return value; // kg/m³
      }
    } else if (type === "viscosity") {
      switch (unit) {
        case "cP": return value / 1000;
        default: return value; // Pa·s
      }
    } else if (type === "pressure") {
      switch (unit) {
        case "kPa": return value * 1000;
        case "bar": return value * 100000;
        case "psi": return value * 6894.76;
        default: return value; // Pa
      }
    } else if (type === "flowRate") {
      switch (unit) {
        case "L/s": return value / 1000;
        case "L/min": return value / 60000;
        case "gpm": return value * 0.00006309;
        case "cfm": return value * 0.0004719;
        default: return value; // m³/s
      }
    }
    return value;
  };
  
  const convertFromBaseUnits = (value: number, unit: string, type: string): number => {
    if (type === "diameter" || type === "length" || type === "roughness") {
      switch (unit) {
        case "mm": return value * 1000;
        case "cm": return value * 100;
        case "in": return value / 0.0254;
        case "ft": return value / 0.3048;
        default: return value; // m
      }
    } else if (type === "density") {
      switch (unit) {
        case "g/cm³": return value / 1000;
        case "lb/ft³": return value / 16.018;
        default: return value; // kg/m³
      }
    } else if (type === "viscosity") {
      switch (unit) {
        case "cP": return value * 1000;
        default: return value; // Pa·s
      }
    } else if (type === "pressure") {
      switch (unit) {
        case "kPa": return value / 1000;
        case "bar": return value / 100000;
        case "psi": return value / 6894.76;
        default: return value; // Pa
      }
    } else if (type === "flowRate") {
      switch (unit) {
        case "L/s": return value * 1000;
        case "L/min": return value * 60000;
        case "gpm": return value / 0.00006309;
        case "cfm": return value / 0.0004719;
        default: return value; // m³/s
      }
    }
    return value;
  };

  // Colebrook-White equation for friction factor (using approximation)
  const calculateFrictionFactor = (reynolds: number, relativeRoughness: number): number => {
    if (reynolds < 2000) {
      // Laminar flow
      return 64 / reynolds;
    } else if (reynolds > 4000) {
      // Turbulent flow - Haaland approximation
      return Math.pow((-1.8 * Math.log10(Math.pow(relativeRoughness/3.7, 1.11) + 6.9/reynolds)), -2);
    } else {
      // Transitional flow - weighted average
      const laminar = 64 / 2000;
      const turbulent = Math.pow((-1.8 * Math.log10(Math.pow(relativeRoughness/3.7, 1.11) + 6.9/4000)), -2);
      const weight = (reynolds - 2000) / 2000;
      return laminar * (1 - weight) + turbulent * weight;
    }
  };

  // Handle input change
  const handleChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string): void => {
    const parsedValue = parseFloat(value);
    setter(isNaN(parsedValue) ? 0 : parsedValue);
  };

  // Calculate results
  useEffect(() => {
    // Convert to base units for calculations
    const d = convertToBaseUnits(pipeInnerDiameter, diameterUnit, "diameter");
    const L = convertToBaseUnits(pipeLength, lengthUnit, "length");
    const rho = convertToBaseUnits(fluidDensity, densityUnit, "density");
    const mu = convertToBaseUnits(fluidViscosity, viscosityUnit, "viscosity");
    const dp = convertToBaseUnits(pressureDrop, pressureUnit, "pressure");
    const Q = convertToBaseUnits(flowRate, flowRateUnit, "flowRate");
    const eps = convertToBaseUnits(roughness, roughnessUnit, "roughness");
    
    const area = Math.PI * Math.pow(d, 2) / 4;
    
    let Re = 0, f = 0, v = 0, calculatedResult = 0;
    
    if (calculationMode === 1) {
      // Calculate flow rate from pressure drop
      // Start with rough estimate assuming turbulent flow
      v = Math.sqrt((2 * d * dp) / (L * rho));
      
      // Iterate to refine (basic approach)
      for (let i = 0; i < 10; i++) {
        Re = (rho * v * d) / mu;
        f = calculateFrictionFactor(Re, eps/d);
        v = Math.sqrt((2 * d * dp) / (f * L * rho));
      }
      
      calculatedResult = v * area; // m³/s
      
      // Update states
      setFlowVelocity(v);
      setReynoldsNumber(Re);
      setFrictionFactor(f);
      setResult(convertFromBaseUnits(calculatedResult, flowRateUnit, "flowRate"));
      
    } else {
      // Calculate pressure drop from flow rate
      v = Q / area;
      Re = (rho * v * d) / mu;
      f = calculateFrictionFactor(Re, eps/d);
      
      // Darcy-Weisbach equation
      calculatedResult = (f * L * rho * Math.pow(v, 2)) / (2 * d);
      
      // Update states
      setFlowVelocity(v);
      setReynoldsNumber(Re);
      setFrictionFactor(f);
      setResult(convertFromBaseUnits(calculatedResult, pressureUnit, "pressure"));
    }
    
    // Determine flow regime
    if (Re < 2000) {
      setFlowRegime("Laminar");
    } else if (Re > 4000) {
      setFlowRegime("Turbulent");
    } else {
      setFlowRegime("Transitional");
    }
    
  }, [pipeInnerDiameter, pipeLength, fluidDensity, fluidViscosity, pressureDrop, flowRate, roughness, 
      calculationMode, diameterUnit, lengthUnit, densityUnit, viscosityUnit, pressureUnit, flowRateUnit, roughnessUnit]);

  // Handle fluid preset selection
  const handleFluidPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value);
    if (selectedIndex >= 0) {
      const preset = fluidPresets[selectedIndex];
      setFluidDensity(preset.density);
      setFluidViscosity(preset.viscosity);
    }
  };

  // Handle material preset selection
  const handleMaterialPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value);
    if (selectedIndex >= 0) {
      const preset = materialPresets[selectedIndex];
      setRoughness(preset.roughness);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-800">Pipe Flow Calculator</h1>
      
      {/* Calculation Mode Selector */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <button 
            className={`px-4 py-2 rounded-md ${calculationMode === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setCalculationMode(1)}
          >
            Calculate Flow Rate
          </button>
          <button 
            className={`px-4 py-2 rounded-md ${calculationMode === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setCalculationMode(2)}
          >
            Calculate Pressure Drop
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Input Parameters */}
        <div className="bg-white p-4 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Input Parameters</h2>
          
          {/* Presets Section */}
          <div className="mb-6 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fluid Type</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                onChange={handleFluidPresetChange}
                defaultValue=""
              >
                <option value="" disabled>Select fluid...</option>
                {fluidPresets.map((fluid, index) => (
                  <option key={index} value={index}>{fluid.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pipe Material</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md"
                onChange={handleMaterialPresetChange}
                defaultValue=""
              >
                <option value="" disabled>Select material...</option>
                {materialPresets.map((material, index) => (
                  <option key={index} value={index}>{material.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Pipe Parameters */}
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2 text-gray-700">Pipe Parameters</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-1/2">Inner Diameter:</label>
                <div className="w-1/2 flex">
                  <input
                    type="number"
                    value={pipeInnerDiameter}
                    onChange={(e) => handleChange(setPipeInnerDiameter, e.target.value)}
                    className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                    min="0"
                    step="0.1"
                  />
                  <select
                    value={diameterUnit}
                    onChange={(e) => setDiameterUnit(e.target.value)}
                    className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                  >
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="in">in</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-1/2">Pipe Length:</label>
                <div className="w-1/2 flex">
                  <input
                    type="number"
                    value={pipeLength}
                    onChange={(e) => handleChange(setPipeLength, e.target.value)}
                    className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                    min="0"
                    step="0.1"
                  />
                  <select
                    value={lengthUnit}
                    onChange={(e) => setLengthUnit(e.target.value)}
                    className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                  >
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-1/2">Roughness:</label>
                <div className="w-1/2 flex">
                  <input
                    type="number"
                    value={roughness}
                    onChange={(e) => handleChange(setRoughness, e.target.value)}
                    className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                    min="0"
                    step="0.0001"
                  />
                  <select
                    value={roughnessUnit}
                    onChange={(e) => setRoughnessUnit(e.target.value)}
                    className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                  >
                    <option value="mm">mm</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Fluid Parameters */}
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2 text-gray-700">Fluid Properties</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-1/2">Density:</label>
                <div className="w-1/2 flex">
                  <input
                    type="number"
                    value={fluidDensity}
                    onChange={(e) => handleChange(setFluidDensity, e.target.value)}
                    className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                    min="0"
                    step="0.1"
                  />
                  <select
                    value={densityUnit}
                    onChange={(e) => setDensityUnit(e.target.value)}
                    className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                  >
                    <option value="kg/m³">kg/m³</option>
                    <option value="g/cm³">g/cm³</option>
                    <option value="lb/ft³">lb/ft³</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center">
                <label className="block text-sm font-medium text-gray-700 w-1/2">Viscosity:</label>
                <div className="w-1/2 flex">
                  <input
                    type="number"
                    value={fluidViscosity}
                    onChange={(e) => handleChange(setFluidViscosity, e.target.value)}
                    className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                    min="0"
                    step="0.0001"
                  />
                  <select
                    value={viscosityUnit}
                    onChange={(e) => setViscosityUnit(e.target.value)}
                    className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                  >
                    <option value="Pa·s">Pa·s</option>
                    <option value="cP">cP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Flow/Pressure Parameters */}
          <div>
            <h3 className="text-md font-medium mb-2 text-gray-700">
              {calculationMode === 1 ? "Pressure Parameters" : "Flow Parameters"}
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {calculationMode === 1 ? (
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700 w-1/2">Pressure Drop:</label>
                  <div className="w-1/2 flex">
                    <input
                      type="number"
                      value={pressureDrop}
                      onChange={(e) => handleChange(setPressureDrop, e.target.value)}
                      className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                      min="0"
                      step="1"
                    />
                    <select
                      value={pressureUnit}
                      onChange={(e) => setPressureUnit(e.target.value)}
                      className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                    >
                      <option value="Pa">Pa</option>
                      <option value="kPa">kPa</option>
                      <option value="bar">bar</option>
                      <option value="psi">psi</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-gray-700 w-1/2">Flow Rate:</label>
                  <div className="w-1/2 flex">
                    <input
                      type="number"
                      value={flowRate}
                      onChange={(e) => handleChange(setFlowRate, e.target.value)}
                      className="w-2/3 p-1 border border-gray-300 rounded-l-md"
                      min="0"
                      step="0.001"
                    />
                    <select
                      value={flowRateUnit}
                      onChange={(e) => setFlowRateUnit(e.target.value)}
                      className="w-1/3 p-1 border border-gray-300 rounded-r-md bg-gray-50"
                    >
                      <option value="m³/s">m³/s</option>
                      <option value="L/s">L/s</option>
                      <option value="L/min">L/min</option>
                      <option value="gpm">gpm</option>
                      <option value="cfm">cfm</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column: Results */}
        <div className="bg-white p-4 rounded-md shadow">
          <h2 className="text-lg font-semibold mb-6 text-gray-700">Results</h2>
          
          <div className="p-4 bg-blue-50 rounded-md mb-6">
            <h3 className="text-xl font-bold text-center mb-2">
              {calculationMode === 1 ? 'Flow Rate' : 'Pressure Drop'}
            </h3>
            <p className="text-3xl text-center font-bold text-blue-700">
              {result.toFixed(4)} {calculationMode === 1 ? flowRateUnit : pressureUnit}
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-medium text-gray-700">Reynolds Number:</span>
              <span className="font-mono">{Math.round(reynoldsNumber).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-medium text-gray-700">Flow Regime:</span>
              <span className={`font-semibold ${
                flowRegime === "Laminar" ? "text-green-600" : 
                flowRegime === "Turbulent" ? "text-red-600" : "text-yellow-600"
              }`}>{flowRegime}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-medium text-gray-700">Friction Factor:</span>
              <span className="font-mono">{frictionFactor.toFixed(6)}</span>
            </div>
            
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-medium text-gray-700">Flow Velocity:</span>
              <span className="font-mono">{flowVelocity.toFixed(3)} m/s</span>
            </div>
          </div>
          
          <div className="mt-6 bg-gray-50 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2 text-gray-700">Notes:</h3>
            <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
              <li>Uses the Darcy-Weisbach equation for pressure drop calculations</li>
              <li>Friction factor calculated using the Haaland approximation for turbulent flow</li>
              <li>Accounts for laminar (Re &lt; 2000), transitional (2000 &lt; Re &lt; 4000), and turbulent (Re &gt; 4000) flow regimes</li>
              <li>Does not account for minor losses from fittings, valves, etc.</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Formula Reference */}
      <div className="mt-6 bg-white p-4 rounded-md shadow">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">Formula Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-1">Darcy-Weisbach Equation:</h3>
            <p className="text-gray-700">
              ΔP = f × (L/D) × (ρ × v²/2)
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Reynolds Number:</h3>
            <p className="text-gray-700">
              Re = (ρ × v × D) / μ
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Flow Rate:</h3>
            <p className="text-gray-700">
              Q = A × v = (π × D²/4) × v
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Friction Factor (Turbulent):</h3>
            <p className="text-gray-700">
              Approximated using the Haaland equation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 