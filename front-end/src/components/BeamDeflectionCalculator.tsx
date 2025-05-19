import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface ChartDataPoint {
  position: number;
  deflection: number;
}

export default function BeamDeflectionCalculator() {
  // State variables for beam properties and loading
  const [beamLength, setBeamLength] = useState(3);
  const [modulusE, setModulusE] = useState(200);
  const [inertiaI, setInertiaI] = useState(2.1e-6);
  const [loadMagnitude, setLoadMagnitude] = useState(1000);
  const [supportType, setSupportType] = useState("simply-supported");
  const [loadType, setLoadType] = useState("point-center");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [maxDeflection, setMaxDeflection] = useState(0);
  const [maxDeflectionLocation, setMaxDeflectionLocation] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Update load type when support type changes to ensure compatibility
  useEffect(() => {
    if (supportType === "simply-supported" && loadType === "point-end") {
      setLoadType("point-center");
    } else if (supportType === "cantilever" && loadType === "point-center") {
      setLoadType("point-end");
    }
  }, [supportType, loadType]);
  
  // Calculate deflection for each point along the beam
  const calculateDeflection = () => {
    // Validate inputs
    const errors: Record<string, string> = {};
    if (beamLength <= 0) errors.beamLength = "Length must be greater than 0";
    if (modulusE <= 0) errors.modulusE = "Young's modulus must be greater than 0";
    if (inertiaI <= 0) errors.inertiaI = "Moment of inertia must be greater than 0";
    if (loadMagnitude <= 0) errors.loadMagnitude = "Load must be greater than 0";
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    setIsCalculating(true);
    
    // Simulate calculation delay for better UX feedback
    setTimeout(() => {
      const numPoints = 100;
      const data: ChartDataPoint[] = [];
      let maxDef = 0;
      let maxDefLoc = 0;
      
      // EI value (flexural rigidity)
      const EI = modulusE * 1e9 * inertiaI; // Convert E to Pa
      const L = beamLength;
      
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * L;
        let deflection = 0;
        
        // Different deflection calculations based on support and load types
        if (supportType === "simply-supported") {
          if (loadType === "point-center") {
            // Point load at center of simply supported beam
            const P = loadMagnitude;
            if (x <= L/2) {
              // Corrected formula for 0 <= x <= L/2
              deflection = (P * x * (3*L*L - 4*x*x)) / (48 * EI); 
            } else {
              // Corrected formula for L/2 < x <= L (using symmetry or derived formula)
              // Using the formula derived for x > L/2 often expressed as: P*(L-x)*(3*L^2 - 4*(L-x)^2)/(48*EI)
              // Alternatively, by symmetry: deflection(x) = deflection(L-x)
              const x_sym = L - x;
              deflection = (P * x_sym * (3*L*L - 4*x_sym*x_sym)) / (48 * EI);
            }
          } else if (loadType === "uniformly-distributed") {
            // Uniformly distributed load on simply supported beam
            const w = loadMagnitude;
            deflection = (w * x * (L*L*L - 2*L*x*x + x*x*x)) / (24 * EI);
          }
        } else if (supportType === "cantilever") {
          if (loadType === "point-end") {
            // Point load at end of cantilever
            const P = loadMagnitude;
            deflection = (P * x*x * (3*L - x)) / (6 * EI);
          } else if (loadType === "uniformly-distributed") {
            // Uniformly distributed load on cantilever
            const w = loadMagnitude;
            deflection = (w * x*x * (6*L*L - 4*L*x + x*x)) / (24 * EI);
          }
        }
        
        // Convert to mm and make deflection negative (downward)
        deflection = -deflection * 1000;
        
        // Track maximum deflection
        if (Math.abs(deflection) > Math.abs(maxDef)) {
          maxDef = deflection;
          maxDefLoc = x;
        }
        
        data.push({
          position: x,
          deflection: deflection
        });
      }
      
      setChartData(data);
      setMaxDeflection(maxDef);
      setMaxDeflectionLocation(maxDefLoc);
      setIsCalculating(false);
    }, 300);
  };
  
  // Beam diagram component based on selected options
  const BeamDiagram = () => {
    return (
      <div className="flex justify-center p-4 my-2 bg-gray-100 rounded" aria-label={`Illustration of ${supportType} beam with ${loadType} load`}>
        <svg viewBox="0 0 400 100" className="w-full max-w-lg">
          {/* Beam line */}
          <line x1="50" y1="50" x2="350" y2="50" stroke="black" strokeWidth="4" />
          
          {/* Supports */}
          {supportType === "simply-supported" && (
            <>
              <polygon points="50,50 30,80 70,80" fill="none" stroke="black" strokeWidth="2" />
              <circle cx="50" cy="80" r="5" fill="white" stroke="black" strokeWidth="2" />
              
              <polygon points="350,50 330,80 370,80" fill="none" stroke="black" strokeWidth="2" />
              <circle cx="350" cy="80" r="5" fill="white" stroke="black" strokeWidth="2" />
            </>
          )}
          
          {supportType === "cantilever" && (
            <rect x="30" y="20" width="20" height="60" fill="none" stroke="black" strokeWidth="2" />
          )}
          
          {/* Loads */}
          {loadType === "point-center" && supportType === "simply-supported" && (
            <polygon points="200,20 190,50 210,50" fill="red" stroke="black" strokeWidth="1" />
          )}
          
          {loadType === "point-end" && supportType === "cantilever" && (
            <polygon points="350,20 340,50 360,50" fill="red" stroke="black" strokeWidth="1" />
          )}
          
          {loadType === "uniformly-distributed" && (
            <>
              <line x1="50" y1="20" x2="350" y2="20" stroke="red" strokeWidth="2" />
              {Array.from({ length: 16 }).map((_, i) => (
                <line 
                  key={i} 
                  x1={50 + i * 20} 
                  y1="20" 
                  x2={50 + i * 20} 
                  y2="50" 
                  stroke="red" 
                  strokeWidth="1" 
                  strokeDasharray="4"
                />
              ))}
            </>
          )}
        </svg>
      </div>
    );
  };

  // Helper function to generate input field
  const InputField = ({ 
    label, 
    value, 
    onChange, 
    min, 
    step, 
    unit, 
    name 
  }: { 
    label: string; 
    value: number; 
    onChange: (value: number) => void; 
    min: string; 
    step: string; 
    unit: string;
    name: string;
  }) => {
    return (
      <div>
        <label htmlFor={name} className="block mb-1 text-sm font-medium">
          {label}
          {unit && <span className="text-gray-500 ml-1">({unit})</span>}
        </label>
        <div className="relative">
          <input 
            id={name}
            type="number" 
            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500 
              ${validationErrors[name] ? 'border-red-500' : 'border-gray-300'}`}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={min}
            step={step}
            aria-describedby={validationErrors[name] ? `${name}-error` : undefined}
          />
        </div>
        {validationErrors[name] && (
          <p className="mt-1 text-sm text-red-600" id={`${name}-error`}>{validationErrors[name]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <style>
        {`
          .katex-container .katex {
            font-size: 1.2em;
          }
          .katex-display {
            margin: 0.5em 0;
          }
        `}
      </style>
      
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Beam Deflection Calculator</h1>
      
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Beam Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="support-type" className="block mb-1 text-sm font-medium">Support Type</label>
              <select 
                id="support-type"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                value={supportType}
                onChange={(e) => setSupportType(e.target.value)}
                aria-label="Select beam support type"
              >
                <option value="simply-supported">Simply Supported</option>
                <option value="cantilever">Cantilever</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="load-type" className="block mb-1 text-sm font-medium">Load Type</label>
              <select 
                id="load-type"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                value={loadType}
                onChange={(e) => setLoadType(e.target.value)}
                aria-label="Select load type"
              >
                {supportType === "simply-supported" ? (
                  <>
                    <option value="point-center">Point Load (Center)</option>
                    <option value="uniformly-distributed">Uniformly Distributed Load</option>
                  </>
                ) : (
                  <>
                    <option value="point-end">Point Load (End)</option>
                    <option value="uniformly-distributed">Uniformly Distributed Load</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          <BeamDiagram />
          
          <div className="grid md:grid-cols-2 gap-4">
            <InputField
              label="Beam Length"
              value={beamLength}
              onChange={setBeamLength}
              min="0.1"
              step="0.1"
              unit="m"
              name="beamLength"
            />
            
            <InputField
              label="Load"
              value={loadMagnitude}
              onChange={setLoadMagnitude}
              min="0"
              step="100"
              unit={loadType.includes("distributed") ? "N/m" : "N"}
              name="loadMagnitude"
            />
            
            <InputField
              label="Young's Modulus E"
              value={modulusE}
              onChange={setModulusE}
              min="0.01"
              step="10"
              unit="GPa"
              name="modulusE"
            />
            
            <InputField
              label="Moment of Inertia I"
              value={inertiaI}
              onChange={setInertiaI}
              min="0.0000001"
              step="0.0000001"
              unit="m⁴"
              name="inertiaI"
            />
          </div>
          
          <button 
            className={`w-full mt-6 flex items-center justify-center py-3 px-4 rounded font-medium text-white transition-colors 
              ${isCalculating 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
            onClick={calculateDeflection}
            disabled={isCalculating}
            aria-label="Calculate beam deflection"
          >
            {isCalculating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating...
              </>
            ) : (
              'Calculate Deflection'
            )}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Deflection Results</h2>
          
          {chartData.length > 0 ? (
            <>
              <div className="mb-6 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="text-sm">
                  {supportType === "simply-supported" && loadType === "point-center" && (
                    <>
                      <div className="mb-2 font-medium text-gray-800 text-center">Simply Supported Beam with Point Load at Center</div>
                      <div className="mb-2  text-center text-black-600 ">For position x where 0 ≤ x ≤ L/2:</div>
                      <div className="mb-3 flex justify-center katex-container">
                        <BlockMath math={"\\delta = \\frac{P \\cdot x \\cdot (3L^2 - 4x^2)}{48 \\cdot E \\cdot I}"} />
                      </div>
                      {/* <div className="mb-1 text-s text-black-600 text-center">With values:</div> */}
                      <div className="mb-2 flex justify-center katex-container">
                        <BlockMath math={`\\delta = \\frac{${loadMagnitude} \\cdot x \\cdot (3 \\cdot ${beamLength}^2 - 4x^2)}{48 \\cdot ${modulusE} \\cdot 10^9 \\cdot ${inertiaI}}`} />
                      </div>
                    </>
                  )}
                  
                  {supportType === "simply-supported" && loadType === "uniformly-distributed" && (
                    <>
                      <div className="mb-2 font-medium text-gray-800 text-center">Simply Supported Beam with Uniformly Distributed Load</div>
                      <div className="mb-2 italic text-center text-gray-600">For position x where 0 ≤ x ≤ L:</div>
                      <div className="mb-3 flex justify-center katex-container">
                        <BlockMath math={"\\delta = \\frac{w \\cdot x \\cdot (L^3 - 2L \\cdot x^2 + x^3)}{24 \\cdot E \\cdot I}"} />
                      </div>
                      <div className="mb-1 text-xs text-gray-600 text-center">With values:</div>
                      <div className="mb-2 flex justify-center katex-container">
                        <BlockMath math={`\\delta = \\frac{${loadMagnitude} \\cdot x \\cdot (${beamLength}^3 - 2 \\cdot ${beamLength} \\cdot x^2 + x^3)}{24 \\cdot ${modulusE} \\cdot 10^9 \\cdot ${inertiaI}}`} />
                      </div>
                    </>
                  )}
                  
                  {supportType === "cantilever" && loadType === "point-end" && (
                    <>
                      <div className="mb-2 font-medium text-gray-800 text-center">Cantilever Beam with Point Load at End</div>
                      <div className="mb-2 italic text-center text-gray-600">For position x where 0 ≤ x ≤ L:</div>
                      <div className="mb-3 flex justify-center katex-container">
                        <BlockMath math={"\\delta = \\frac{P \\cdot x^2 \\cdot (3L - x)}{6 \\cdot E \\cdot I}"} />
                      </div>
                      <div className="mb-1 text-xs text-gray-600 text-center">With values:</div>
                      <div className="mb-2 flex justify-center katex-container">
                        <BlockMath math={`\\delta = \\frac{${loadMagnitude} \\cdot x^2 \\cdot (3 \\cdot ${beamLength} - x)}{6 \\cdot ${modulusE} \\cdot 10^9 \\cdot ${inertiaI}}`} />
                      </div>
                    </>
                  )}
                  
                  {supportType === "cantilever" && loadType === "uniformly-distributed" && (
                    <>
                      <div className="mb-2 font-medium text-gray-800 text-center">Cantilever Beam with Uniformly Distributed Load</div>
                      <div className="mb-2 italic text-center text-gray-600">For position x where 0 ≤ x ≤ L:</div>
                      <div className="mb-3 flex justify-center katex-container">
                        <BlockMath math={"\\delta = \\frac{w \\cdot x^2 \\cdot (6L^2 - 4L \\cdot x + x^2)}{24 \\cdot E \\cdot I}"} />
                      </div>
                      <div className="mb-1 text-xs text-gray-600 text-center">With values:</div>
                      <div className="mb-2 flex justify-center katex-container">
                        <BlockMath math={`\\delta = \\frac{${loadMagnitude} \\cdot x^2 \\cdot (6 \\cdot ${beamLength}^2 - 4 \\cdot ${beamLength} \\cdot x + x^2)}{24 \\cdot ${modulusE} \\cdot 10^9 \\cdot ${inertiaI}}`} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm font-medium mb-1 text-blue-700">Maximum Deflection:</div>
                <div className="text-2xl font-bold text-blue-800">{maxDeflection.toFixed(4)} mm</div>
                <div className="text-sm text-blue-600">at position {maxDeflectionLocation.toFixed(2)} m</div>
              </div>
              
              <div className="h-64 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="position" 
                      label={{ 
                        value: 'Position (m)', 
                        position: 'insideBottomRight', 
                        offset: -15,
                        fill: '#4b5563',
                        fontSize: 12,
                        fontWeight: 500
                      }}
                      tickFormatter={(value) => value.toFixed(1)} 
                      stroke="#9ca3af"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Deflection (mm)', 
                        angle: -90, 
                        position: 'insideLeft', 
                        offset: 0,
                        fill: '#4b5563',
                        fontSize: 12,
                        fontWeight: 500 
                      }} 
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => value.toFixed(2)}
                      stroke="#9ca3af"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value.toFixed(4)} mm`, 'Deflection']}
                      labelFormatter={(value: number) => `Position: ${value.toFixed(2)} m`}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.97)', 
                        borderRadius: '6px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #e2e8f0',
                        padding: '8px 12px',
                        fontSize: '12px',
                        color: '#1e3a8a'
                      }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 500 }}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Line 
                      name="Beam Deflection"
                      type="monotone" 
                      dataKey="deflection" 
                      stroke="#3b82f6" 
                      strokeWidth={2.5} 
                      dot={false} 
                      activeDot={{ r: 6, fill: '#1e40af', stroke: 'white', strokeWidth: 2 }}
                      animationDuration={1000}
                      animationEasing="ease-in-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-64 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p className="mb-1 font-medium">No data to display</p>
              <p className="text-sm text-gray-400">Click "Calculate Deflection" to view beam analysis</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-white rounded-lg shadow-md border border-gray-100">
        <h3 className="font-medium mb-3 text-gray-700">How to use:</h3>
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
          <li>Select the beam support type (simply supported or cantilever)</li>
          <li>Choose the loading condition</li>
          <li>Enter beam properties (length, material, cross-section)</li>
          <li>Input the load magnitude</li>
          <li>Click "Calculate Deflection" to see results</li>
        </ol>
      </div>
    </div>
  );
} 