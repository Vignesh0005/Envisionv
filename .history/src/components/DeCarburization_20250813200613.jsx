import React, { useState, useEffect, useRef } from 'react';
import { Button, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const DeCarburization = ({ onClose, imagePath, imageUrl }) => {
  const [displayedImage, setDisplayedImage] = useState(null);
  const [displayUrl, setDisplayUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [measurements, setMeasurements] = useState({
    min: 0,
    max: 0,
    mean: 0,
    totalDepth: 0,
    totalCount: 0,
    stdDev: 0
  });
  const [results, setResults] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log('DeCarburization: Component mounted with props:', {
      imagePath, imageUrl, hasImagePath: !!imagePath, hasImageUrl: !!imageUrl
    });
    
    // Determine the correct URL to use
    let finalUrl = null;
    
    if (imageUrl) {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        console.log('DeCarburization: Using provided HTTP imageUrl:', imageUrl);
        finalUrl = imageUrl;
      } else if (imagePath) {
        console.log('DeCarburization: Constructing HTTP URL from imagePath:', imagePath);
        finalUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
      }
    } else if (imagePath) {
      console.log('DeCarburization: No imageUrl, constructing from imagePath:', imagePath);
      finalUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
    }
    
    console.log('DeCarburization: Final URL to use:', finalUrl);
    setDisplayUrl(finalUrl);
    
    if (finalUrl) {
      loadImage(finalUrl);
    }
  }, [imageUrl, imagePath]);

  const loadImage = (url) => {
    console.log('DeCarburization: loadImage called with URL:', url);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('DeCarburization: Image loaded successfully:', { width: img.naturalWidth, height: img.naturalHeight });
      setError(null);
      setDisplayedImage(url);
      
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const maxWidth = 800;
        const maxHeight = 400;
        
        // Calculate scale to fit within bounds
        const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        console.log('DeCarburization: Image drawn to canvas successfully');
      }
    };
    img.onerror = (error) => {
      console.error('DeCarburization: Error loading image:', error);
      setError('Failed to load image');
      message.error('Failed to load image');
    };
    img.src = url;
  };

  const handleGetImage = () => {
    console.log('DeCarburization: handleGetImage called');
    console.log('DeCarburization: Current displayUrl:', displayUrl);
    
    if (displayUrl) {
      loadImage(displayUrl);
      message.success('Image loaded successfully');
    } else {
      message.error('No image available. Please select an image in the main application.');
    }
  };

  const handleInitialize = () => {
    if (!displayedImage) {
      message.warning('Please load an image first');
      return;
    }
    setIsInitialized(true);
    message.success('De-Carburization analysis initialized');
  };

  const handleCancel = () => {
    setIsInitialized(false);
    setMeasurements({
      min: 0,
      max: 0,
      mean: 0,
      totalDepth: 0,
      totalCount: 0,
      stdDev: 0
    });
    message.info('Analysis cancelled');
  };

  const handleAddResult = () => {
    if (!isInitialized) {
      message.warning('Please initialize the analysis first');
      return;
    }
    
    const newResult = {
      id: Date.now(),
      field: `Field ${results.length + 1}`,
      ...measurements
    };
    
    setResults([...results, newResult]);
    message.success('Result added successfully');
  };

  const handleDeleteResult = (id) => {
    setResults(results.filter(result => result.id !== id));
    message.success('Result deleted');
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      {/* Header Bar */}
      <div className="flex items-center px-4 py-2 border-b bg-gray-100">
        <button onClick={onClose} className="flex items-center gap-2 px-2 py-1 text-gray-600 hover:bg-gray-200 rounded transition-colors">
          <ArrowLeftOutlined />
          <span>Close</span>
        </button>
        <span className="ml-4 font-semibold text-lg">De-Carburization</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="small" onClick={handleGetImage}>Get Image</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
      
      {/* Image Display */}
      {displayedImage && (
        <div className="mb-4">
          <div className="w-full h-48 bg-gray-100 border rounded flex items-center justify-center overflow-hidden">
            <img 
              src={displayedImage} 
              alt="De-Carburization Analysis" 
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
            <label className="w-20">Min</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Max</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
          <div className="flex gap-2 mb-1">
            <label className="w-20">Mean</label>
            <input className="w-16 border rounded px-1 py-0.5 text-xs" readOnly value={0} />
          </div>
        </div>
        <div className="flex flex-col text-xs mr-4">
          <div className="flex gap-2 mb-1">
            <label className="w-20">Total Depth</label>
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
                <th className="border px-2 py-1">Total Depth</th>
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

export default DeCarburization; 