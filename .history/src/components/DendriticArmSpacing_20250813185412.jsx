import React, { useState, useEffect } from 'react';

const TABS = ['Analysis', 'Configuration', 'Results'];

const DendriticArmSpacing = ({ onClose, imagePath }) => {
  const [activeTab, setActiveTab] = useState('Analysis');
  const [displayedImage, setDisplayedImage] = useState(null);

  useEffect(() => {
    if (imagePath) {
      let formattedPath = imagePath
        .replace(/\\/g, '/')
        .replace(/^file:\/\//, '')
        .replace(/^\/([A-Za-z]):\//, '$1:/');
      setDisplayedImage(`http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`);
    }
  }, [imagePath]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg relative">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <span className="sr-only">Close</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <h2 className="text-xl font-bold mb-2 text-gray-800">Dendritic Arm Spacing</h2>
      
      {/* Image Display */}
      {displayedImage && (
        <div className="mb-4">
          <div className="w-full h-48 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
            <img 
              src={displayedImage} 
              alt="Dendritic Arm Spacing Analysis" 
              className="object-contain w-full h-full"
              onError={(e) => {
                console.error('Failed to load image:', e.target.src);
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-blue-700 font-semibold">Step 1: Click on the initialize button after opening the image</span>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Initialize</button>
          <button className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-xs">Cancel</button>
        </div>
      </div>
      {/* Summary Box */}
      <div className="bg-gray-50 border rounded p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col text-xs mr-4">
          <span className="font-semibold text-red-700 mb-1">Unit: Microns</span>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Min Length</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Max Length</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Mean</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
        </div>
        <div className="flex flex-col text-xs mr-4">
          <div className="flex gap-2 mb-1">
            <label className="w-20">Total Length</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Total Count</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Std Dev</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
        </div>
        <button className="ml-auto px-3 py-1 bg-green-600 text-white rounded text-xs">Add Result</button>
      </div>
      {/* Results Table */}
      <div className="mb-4">
        <div className="flex justify-end text-xs text-red-700 font-semibold mb-1">Unit: Microns</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Field</th>
                <th className="border px-2 py-1">Min</th>
                <th className="border px-2 py-1">Max</th>
                <th className="border px-2 py-1">Mean</th>
                <th className="border px-2 py-1">Std Dev</th>
                <th className="border px-2 py-1">Total Len</th>
                <th className="border px-2 py-1">Count</th>
                <th className="border px-2 py-1">Delete</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1 text-center text-gray-400" colSpan={8}>No results yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Chart Area */}
      <div className="mb-4">
        <div className="border rounded bg-white h-40 flex flex-col">
          <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">Chart</div>
          <div className="flex justify-between px-2 text-xs text-gray-500">
            <span>Count</span>
            <span>Microns</span>
          </div>
        </div>
      </div>
      {/* Report Buttons */}
      <div className="flex justify-center gap-4 mt-4">
        <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded">Enter Report Details</button>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Report</button>
      </div>
    </div>
  );
};

export default DendriticArmSpacing; 