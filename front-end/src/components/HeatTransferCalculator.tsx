import { useState } from 'react';
import { Calculator } from 'lucide-react';

export default function HeatTransferCalculator() {
  const [mode, setMode] = useState('conduction');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Conduction inputs
  const [conductionInputs, setConductionInputs] = useState({
    thermalConductivity: 0.6, // W/(m·K), default for brick
    area: 10, // m²
    thickness: 0.2, // m
    tempDiff: 20, // K or °C
  });
  
  // Convection inputs
  const [convectionInputs, setConvectionInputs] = useState({
    convectionCoeff: 25, // W/(m²·K), default for forced air
    area: 10, // m²
    tempDiff: 20, // K or °C
  });
  
  // Radiation inputs
  const [radiationInputs, setRadiationInputs] = useState({
    emissivity: 0.9, // dimensionless, default for most non-metallic surfaces
    area: 10, // m²
    objectTemp: 30, // K or °C
    surroundingTemp: 20, // K or °C
  });

  const materials = [
    { name: 'Aluminum', k: 205 },
    { name: 'Copper', k: 385 },
    { name: 'Steel (mild)', k: 50 },
    { name: 'Stainless Steel', k: 16 },
    { name: 'Brick', k: 0.6 },
    { name: 'Concrete', k: 1.7 },
    { name: 'Glass (window)', k: 0.8 },
    { name: 'Wood (pine)', k: 0.12 },
    { name: 'Fiberglass insulation', k: 0.04 },
    { name: 'Air', k: 0.026 },
    { name: 'Water', k: 0.6 },
  ];

  const convectionTypes = [
    { name: 'Free convection, air', h: 5 },
    { name: 'Forced convection, air', h: 25 },
    { name: 'Free convection, water', h: 50 },
    { name: 'Forced convection, water', h: 500 },
    { name: 'Boiling water', h: 3000 },
    { name: 'Condensing water vapor', h: 6000 },
  ];

  const surfaceTypes = [
    { name: 'Polished aluminum', e: 0.05 },
    { name: 'Oxidized aluminum', e: 0.3 },
    { name: 'Polished copper', e: 0.04 },
    { name: 'Oxidized copper', e: 0.8 },
    { name: 'Glass', e: 0.9 },
    { name: 'Red brick', e: 0.93 },
    { name: 'White paint', e: 0.9 },
    { name: 'Black paint', e: 0.98 },
    { name: 'Human skin', e: 0.97 },
    { name: 'Wood', e: 0.9 },
    { name: 'Snow', e: 0.8 },
  ];

  const handleConductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConductionInputs({
      ...conductionInputs,
      [name]: parseFloat(value),
    });
  };

  const handleConvectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConvectionInputs({
      ...convectionInputs,
      [name]: parseFloat(value),
    });
  };

  const handleRadiationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRadiationInputs({
      ...radiationInputs,
      [name]: parseFloat(value),
    });
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMaterial = materials.find(m => m.name === e.target.value);
    if (selectedMaterial) {
      setConductionInputs({
        ...conductionInputs,
        thermalConductivity: selectedMaterial.k,
      });
    }
  };

  const handleConvectionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = convectionTypes.find(t => t.name === e.target.value);
    if (selectedType) {
      setConvectionInputs({
        ...convectionInputs,
        convectionCoeff: selectedType.h,
      });
    }
  };

  const handleSurfaceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSurface = surfaceTypes.find(s => s.name === e.target.value);
    if (selectedSurface) {
      setRadiationInputs({
        ...radiationInputs,
        emissivity: selectedSurface.e,
      });
    }
  };

  const calculateHeatTransfer = () => {
    setError('');
    try {
      if (mode === 'conduction') {
        const { thermalConductivity, area, thickness, tempDiff } = conductionInputs;
        
        // Validate inputs
        if (thermalConductivity <= 0) throw new Error('Thermal conductivity must be positive');
        if (area <= 0) throw new Error('Area must be positive');
        if (thickness <= 0) throw new Error('Thickness must be positive');
        
        // Q = k * A * (T1 - T2) / L
        const heatTransferRate = (thermalConductivity * area * tempDiff) / thickness;
        const thermalResistance = thickness / (thermalConductivity * area);
        
        setResults({
          heatTransferRate,
          thermalResistance,
          unit: 'W',
          resistanceUnit: 'K/W',
          explanation: `Heat transfer through conduction occurs when there is a temperature difference across a material. The rate depends on the material's thermal conductivity, the area perpendicular to heat flow, the temperature difference, and the material thickness.`
        });
      } 
      else if (mode === 'convection') {
        const { convectionCoeff, area, tempDiff } = convectionInputs;
        
        // Validate inputs
        if (convectionCoeff <= 0) throw new Error('Convection coefficient must be positive');
        if (area <= 0) throw new Error('Area must be positive');
        
        // Q = h * A * (Ts - T∞)
        const heatTransferRate = convectionCoeff * area * tempDiff;
        const thermalResistance = 1 / (convectionCoeff * area);
        
        setResults({
          heatTransferRate,
          thermalResistance,
          unit: 'W',
          resistanceUnit: 'K/W',
          explanation: `Convection heat transfer occurs between a surface and a moving fluid. The heat transfer rate depends on the convection coefficient, surface area, and temperature difference between the surface and fluid.`
        });
      } 
      else if (mode === 'radiation') {
        const { emissivity, area, objectTemp, surroundingTemp } = radiationInputs;
        
        // Validate inputs
        if (emissivity <= 0 || emissivity > 1) throw new Error('Emissivity must be between 0 and 1');
        if (area <= 0) throw new Error('Area must be positive');
        
        // Convert temperatures to Kelvin for radiation calculation
        const objectTempK = objectTemp + 273.15;
        const surroundingTempK = surroundingTemp + 273.15;
        
        if (objectTempK <= 0 || surroundingTempK <= 0) throw new Error('Absolute temperatures must be positive');
        
        // Stefan-Boltzmann constant
        const sigma = 5.67e-8; // W/(m²·K⁴)
        
        // Q = ε * σ * A * (T₁⁴ - T₂⁴)
        const heatTransferRate = emissivity * sigma * area * (Math.pow(objectTempK, 4) - Math.pow(surroundingTempK, 4));
        
        setResults({
          heatTransferRate,
          unit: 'W',
          explanation: `Radiation heat transfer occurs due to electromagnetic waves emitted by all bodies above absolute zero temperature. The heat transfer rate depends on the emissivity of the surface, the surface area, and the fourth power of the absolute temperatures.`
        });
      }
    } catch (err: any) {
      setError(err.message);
      setResults(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-md">
      <div className="flex items-center mb-6 text-blue-600">
        <Calculator className="mr-2" size={24} />
        <h1 className="text-2xl font-bold">Heat Transfer Calculator</h1>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={() => setMode('conduction')}
            className={`px-4 py-2 rounded-md ${mode === 'conduction' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Conduction
          </button>
          <button
            onClick={() => setMode('convection')}
            className={`px-4 py-2 rounded-md ${mode === 'convection' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Convection
          </button>
          <button
            onClick={() => setMode('radiation')}
            className={`px-4 py-2 rounded-md ${mode === 'radiation' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Radiation
          </button>
        </div>
        
        {mode === 'conduction' && (
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Conduction Heat Transfer</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Material:</label>
              <select 
                onChange={handleMaterialChange} 
                className="w-full p-2 border rounded-md"
              >
                <option value="">Custom Value</option>
                {materials.map((material, index) => (
                  <option key={index} value={material.name}>
                    {material.name} (k = {material.k} W/(m·K))
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thermal Conductivity (W/(m·K)):
                </label>
                <input
                  type="number"
                  name="thermalConductivity"
                  value={conductionInputs.thermalConductivity}
                  onChange={handleConductionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.01"
                  min="0.001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher values indicate better heat conductors
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surface Area (m²):
                </label>
                <input
                  type="number"
                  name="area"
                  value={conductionInputs.area}
                  onChange={handleConductionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                  min="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Thickness (m):
                </label>
                <input
                  type="number"
                  name="thickness"
                  value={conductionInputs.thickness}
                  onChange={handleConductionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.01"
                  min="0.001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature Difference (°C or K):
                </label>
                <input
                  type="number"
                  name="tempDiff"
                  value={conductionInputs.tempDiff}
                  onChange={handleConductionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        )}
        
        {mode === 'convection' && (
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Convection Heat Transfer</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Convection Type:</label>
              <select 
                onChange={handleConvectionTypeChange} 
                className="w-full p-2 border rounded-md"
              >
                <option value="">Custom Value</option>
                {convectionTypes.map((type, index) => (
                  <option key={index} value={type.name}>
                    {type.name} (h = {type.h} W/(m²·K))
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Convection Coefficient (W/(m²·K)):
                </label>
                <input
                  type="number"
                  name="convectionCoeff"
                  value={convectionInputs.convectionCoeff}
                  onChange={handleConvectionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                  min="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher values indicate stronger convection
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surface Area (m²):
                </label>
                <input
                  type="number"
                  name="area"
                  value={convectionInputs.area}
                  onChange={handleConvectionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                  min="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature Difference (°C or K):
                </label>
                <input
                  type="number"
                  name="tempDiff"
                  value={convectionInputs.tempDiff}
                  onChange={handleConvectionChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Between surface and fluid
                </p>
              </div>
            </div>
          </div>
        )}
        
        {mode === 'radiation' && (
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Radiation Heat Transfer</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Surface Type:</label>
              <select 
                onChange={handleSurfaceTypeChange} 
                className="w-full p-2 border rounded-md"
              >
                <option value="">Custom Value</option>
                {surfaceTypes.map((surface, index) => (
                  <option key={index} value={surface.name}>
                    {surface.name} (ε = {surface.e})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surface Emissivity (0-1):
                </label>
                <input
                  type="number"
                  name="emissivity"
                  value={radiationInputs.emissivity}
                  onChange={handleRadiationChange}
                  className="w-full p-2 border rounded-md"
                  step="0.01"
                  min="0"
                  max="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  1 = perfect emitter, 0 = perfect reflector
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surface Area (m²):
                </label>
                <input
                  type="number"
                  name="area"
                  value={radiationInputs.area}
                  onChange={handleRadiationChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                  min="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Object Temperature (°C):
                </label>
                <input
                  type="number"
                  name="objectTemp"
                  value={radiationInputs.objectTemp}
                  onChange={handleRadiationChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be converted to Kelvin for calculation
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Surrounding Temperature (°C):
                </label>
                <input
                  type="number"
                  name="surroundingTemp"
                  value={radiationInputs.surroundingTemp}
                  onChange={handleRadiationChange}
                  className="w-full p-2 border rounded-md"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be converted to Kelvin for calculation
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={calculateHeatTransfer}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Calculate Heat Transfer
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-100">
            <h3 className="text-lg font-semibold mb-2">Results:</h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                <span className="font-medium">Heat Transfer Rate:</span>
                <span className="text-blue-600 font-bold">
                  {results.heatTransferRate.toFixed(2)} {results.unit}
                </span>
              </div>
              
              {results.thermalResistance && (
                <div className="flex justify-between items-center p-2 bg-white rounded shadow-sm">
                  <span className="font-medium">Thermal Resistance:</span>
                  <span className="text-blue-600 font-bold">
                    {results.thermalResistance.toFixed(4)} {results.resistanceUnit}
                  </span>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
              <p className="font-medium mb-1">What this means:</p>
              <p>{results.explanation}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-600 bg-gray-100 p-4 rounded-md">
        <h3 className="font-medium mb-2">Notes:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>All calculations assume steady state conditions with uniform properties.</li>
          <li>For conduction, thermal conductivity varies with temperature - values provided are approximations.</li>
          <li>Convection coefficients vary greatly with geometry, fluid properties, and flow conditions.</li>
          <li>Radiation calculations assume that the surface is in a large enclosure, and view factor is 1.</li>
          <li>All SI units: temperatures in °C or K, areas in m², thickness in m, heat transfer rates in Watts.</li>
        </ul>
      </div>
    </div>
  );
} 