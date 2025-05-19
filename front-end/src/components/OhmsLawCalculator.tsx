import React, { useState, useEffect } from "react";

export default function OhmsLawCalculator() {
  const [calculate, setCalculate] = useState("voltage");
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");
  const [resistance, setResistance] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const v = parseFloat(voltage);
    const i = parseFloat(current);
    const r = parseFloat(resistance);

    setResult(null); // Clear previous result first

    if (calculate === "voltage") {
      if (current === "" || resistance === "") { // Check if inputs are empty
        setResult(null);
      } else if (!isNaN(i) && !isNaN(r)) {
        setResult(`Voltage (V) = ${i * r} V`);
      } else {
        setResult("Invalid input for Current or Resistance.");
      }
    } else if (calculate === "current") {
      if (voltage === "" || resistance === "") { // Check if inputs are empty
        setResult(null);
      } else if (!isNaN(v) && !isNaN(r)) {
        if (r === 0) {
          setResult("Resistance (R) cannot be zero.");
        } else {
          setResult(`Current (I) = ${(v / r).toFixed(2)} A`);
        }
      } else {
        setResult("Invalid input for Voltage or Resistance.");
      }
    } else if (calculate === "resistance") {
      if (voltage === "" || current === "") { // Check if inputs are empty
        setResult(null);
      } else if (!isNaN(v) && !isNaN(i)) {
        if (i === 0) {
          setResult("Current (I) cannot be zero.");
        } else {
          setResult(`Resistance (R) = ${(v / i).toFixed(2)} Ω`);
        }
      } else {
        setResult("Invalid input for Voltage or Current.");
      }
    }
  }, [voltage, current, resistance, calculate]);

  const clearInputsAndResult = () => {
    setVoltage("");
    setCurrent("");
    setResistance("");
    // Result is cleared by useEffect, but explicit clear here is also fine
    // setResult(null); 
  };

  const getFormulaElement = (variable: string, symbol: string) => {
    const isCalculating = calculate === variable.toLowerCase();
    // More robust check for actual calculated variable
    const isCalculatedValue = result && result.toLowerCase().startsWith(variable.toLowerCase());

    return (
      <span
        className={`px-3 py-1.5 mx-1 rounded-md font-mono text-xl shadow-sm transition-all duration-150 ease-in-out ${
          isCalculating
            ? "bg-blue-600 text-white ring-2 ring-blue-400 scale-110"
            : "bg-gray-200 text-gray-800"
        } ${
          isCalculatedValue && !isCalculating
            ? "border-2 border-green-500 bg-green-100 text-green-700"
            : ""
        }`}
      >
        {isCalculating ? "?" : symbol}
      </span>
    );
  };

  return (
    <div className="max-w-lg mx-auto bg-gradient-to-br from-slate-50 to-sky-100 p-6 sm:p-8 rounded-xl shadow-2xl space-y-6">
      <h1 className="text-3xl font-bold text-center text-gray-700">
        Ohm's Law Calculator
      </h1>

      {/* Formula Display */}
      <div className="text-center my-5 p-4 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold text-gray-600 mb-3">
          The Formula:
        </h2>
        <div className="flex items-center justify-center text-3xl space-x-2">
          {calculate === "voltage" && (
            <>
              {getFormulaElement("Voltage", "V")} <span>=</span>
              {getFormulaElement("Current", "I")} <span>×</span>
              {getFormulaElement("Resistance", "R")}
            </>
          )}
          {calculate === "current" && (
            <>
              {getFormulaElement("Current", "I")} <span>=</span>
              {getFormulaElement("Voltage", "V")} <span>/</span>
              {getFormulaElement("Resistance", "R")}
            </>
          )}
          {calculate === "resistance" && (
            <>
              {getFormulaElement("Resistance", "R")} <span>=</span>
              {getFormulaElement("Voltage", "V")} <span>/</span>
              {getFormulaElement("Current", "I")}
            </>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        <label htmlFor="calculateSelect" className="block font-medium text-gray-600">Calculate:</label>
        <select
          id="calculateSelect"
          className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
          value={calculate}
          onChange={(e) => {
            setCalculate(e.target.value);
            clearInputsAndResult(); // Use the renamed clearer function
          }}
        >
          <option value="voltage">Voltage (V)</option>
          <option value="current">Current (I)</option>
          <option value="resistance">Resistance (R)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {calculate !== "voltage" && (
          <div className="space-y-1">
            <label htmlFor="voltageInput" className="block font-medium text-gray-600">Voltage (V):</label>
            <input
              id="voltageInput"
              type="number"
              placeholder="Enter Voltage"
              value={voltage}
              onChange={(e) => setVoltage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {calculate !== "current" && (
          <div className="space-y-1">
            <label htmlFor="currentInput" className="block font-medium text-gray-600">Current (I):</label>
            <input
              id="currentInput"
              type="number"
              placeholder="Enter Current"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {calculate !== "resistance" && (
          <div className="space-y-1">
            <label htmlFor="resistanceInput" className="block font-medium text-gray-600">Resistance (R):</label>
            <input
              id="resistanceInput"
              type="number"
              placeholder="Enter Resistance"
              value={resistance}
              onChange={(e) => setResistance(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        )}
      </div>

      {result && (
        <div className="mt-5 p-4 bg-green-50 border border-green-300 rounded-md text-center shadow-md">
          <p className="text-lg font-semibold text-green-700">{result}</p>
        </div>
      )}
      {!result && (calculate === "voltage" && (voltage !== "" || current !== "" || resistance !== "")) && (resistance === "" || current === "") && (
         <div className="mt-5 p-4 bg-yellow-50 border border-yellow-300 rounded-md text-center shadow-md">
          <p className="text-sm font-medium text-yellow-700">Please enter values for Current and Resistance to calculate Voltage.</p>
        </div>
      )}
       {!result && (calculate === "current" && (voltage !== "" || current !== "" || resistance !== "")) && (voltage === "" || resistance === "") && (
         <div className="mt-5 p-4 bg-yellow-50 border border-yellow-300 rounded-md text-center shadow-md">
          <p className="text-sm font-medium text-yellow-700">Please enter values for Voltage and Resistance to calculate Current.</p>
        </div>
      )}
       {!result && (calculate === "resistance" && (voltage !== "" || current !== "" || resistance !== "")) && (voltage === "" || current === "") && (
         <div className="mt-5 p-4 bg-yellow-50 border border-yellow-300 rounded-md text-center shadow-md">
          <p className="text-sm font-medium text-yellow-700">Please enter values for Voltage and Current to calculate Resistance.</p>
        </div>
      )}


    </div>
  );
} 