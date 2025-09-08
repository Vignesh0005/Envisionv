import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FLAKE_TYPES = [
  { label: 'Type A', color: 'bg-red-500' },
  { label: 'Type B', color: 'bg-green-500' },
  { label: 'Type C', color: 'bg-blue-500' },
  { label: 'Type D', color: 'bg-yellow-500' },
  { label: 'Type E', color: 'bg-purple-500' },
];

const TABS = ['Flakes', 'Configuration', 'Flake Samples'];

const FlakeAnalysis = ({ onClose, imagePath }) => {
  const [activeTab, setActiveTab] = useState('Flakes');
  const [displayedImage, setDisplayedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (imagePath) {
      let formattedPath = imagePath
        .replace(/\\/g, '/')
        .replace(/^file:\/\//, '')
        .replace(/^\/([A-Za-z]):\//, '$1:/');
      setDisplayedImage(`http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`);
    }
  }, [imagePath]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await axios.post('/api/flake/analyze', {
        image_path: imagePath,
        // Add more parameters here if needed
      });
      if (response.data.status === 'success') {
        setResults(response.data.results || []);
      } else {
        setError(response.data.message || 'Analysis failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to analyze flake');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg relative">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <span className="sr-only">Close</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Flake Analysis</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Flake Analysis UI */}
      {activeTab === 'Flakes' && (
        <div className="space-y-4">
          {/* Top Controls */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Source</label>
              <select className="border rounded px-2 py-1 text-sm">
                <option>Image</option>
                <option>Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Image Preparation</label>
              <select className="border rounded px-2 py-1 text-sm">
                <option>Select</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Configuration</label>
              <select className="border rounded px-2 py-1 text-sm">
                <option>Default</option>
              </select>
            </div>
            <button className="ml-2 px-4 py-1 bg-blue-600 text-white rounded text-sm">Run</button>
            <span className="ml-4 text-xs text-red-500">(Optional)</span>
          </div>

          {/* Image and Controls */}
          <div className="flex gap-6 mt-4">
            {/* Image Display */}
            <div className="w-1/2 flex flex-col items-center">
              <div className="w-full h-64 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
                {displayedImage ? (
                  <img src={displayedImage} alt="Flake" className="object-contain w-full h-full" />
                ) : (
                  <span className="text-gray-400">No image selected</span>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Mouse right-click to change type OR define a contour area using mouse left-button
              </div>
            </div>
            {/* Controls and Legend */}
            <div className="w-1/2 flex flex-col gap-4">
              <div className="flex gap-2 mb-2">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </button>
                <button className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-xs">Reset</button>
                <button className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-xs">Delete</button>
                <button className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-xs flex items-center gap-1">
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8C2 8 5 2 10 2C15 2 18 8 18 8C18 8 15 14 10 14C5 14 2 8 2 8Z" stroke="#333" strokeWidth="2"/></svg>
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <span className="text-xs">Set Type As</span>
                {FLAKE_TYPES.map(type => (
                  <button key={type.label} className={`px-2 py-1 rounded text-xs text-white ${type.color}`}>{type.label}</button>
                ))}
                <button className="px-2 py-1 bg-gray-200 text-xs rounded">Apply Whole</button>
                <button className="px-2 py-1 bg-gray-200 text-xs rounded">Set Remaining</button>
              </div>
              {/* Legend */}
              <div className="flex gap-2 items-center mt-2">
                <span className="text-xs font-semibold">Legend:</span>
                {FLAKE_TYPES.map(type => (
                  <span key={type.label} className={`flex items-center gap-1 text-xs`}>
                    <span className={`inline-block w-4 h-4 rounded ${type.color}`}></span> {type.label}
                  </span>
                ))}
              </div>
              {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
            </div>
          </div>

          {/* Results Table and View Options */}
          <div className="mt-6">
            <div className="flex gap-4 items-center mb-2">
              <span className="font-semibold text-blue-700">Flake Analysis Result</span>
              <span className="text-xs text-red-500">Max 18 Samples</span>
              <span className="ml-auto text-xs text-blue-700">No. of Fields</span>
            </div>
            <div className="flex gap-4 items-center mb-2">
              <span className="text-xs">Current-Overall</span>
              <button className="px-2 py-1 text-xs bg-gray-200 rounded">Cumulative Result</button>
              <span className="ml-4 text-xs">View By</span>
              <select className="border rounded px-2 py-1 text-xs">
                <option>Overall</option>
                <option>By Type</option>
                <option>By Size</option>
              </select>
              <button className="ml-4 px-2 py-1 text-xs bg-blue-100 rounded">Add Sample</button>
            </div>
            <div className="bg-white border rounded overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">Type/Size</th>
                    <th className="border px-2 py-1">Area / Count</th>
                    <th className="border px-2 py-1">% by Total Area</th>
                    <th className="border px-2 py-1">% by Total Flakes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td className="border px-2 py-1 text-center text-gray-400" colSpan={4}>No data</td>
                    </tr>
                  ) : (
                    results.map((row, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1">{row.type || '-'}</td>
                        <td className="border px-2 py-1">{row.area_count || '-'}</td>
                        <td className="border px-2 py-1">{row.percent_area || '-'}</td>
                        <td className="border px-2 py-1">{row.percent_flakes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Distribution Chart Placeholder */}
            <div className="mt-6">
              <span className="font-semibold text-blue-700">Distribution by Total Flakes</span>
              <div className="w-full h-32 bg-gray-100 border rounded flex items-center justify-center text-gray-400 mt-2">
                Chart Placeholder
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Configuration and Flake Samples tabs can be implemented similarly as needed */}
    </div>
  );
};

export default FlakeAnalysis; 