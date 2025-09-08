import React, { useState, useEffect } from 'react';
import { FaSlidersH, FaUndo, FaRedo, FaSave } from 'react-icons/fa';

const CameraFilters = ({ onClose }) => {
  const [filters, setFilters] = useState({
    exposure: 1068.0,
    gain: 0.0,
    width: 640,
    height: 480,
    pixelFormat: 'Mono 8',
    testPattern: 'Off',
    digitalShift: 0.0117,
    acquisitionFrameRate: 2.0,
    resultingFrameRate: 814.0,
    exposureAuto: 'Off',
    brightness: 128.0,
    contrast: 32.0,
    saturation: 32.0,
    hue: 0.0
  });
  
  const [cameraType, setCameraType] = useState(null);

  const [isLoading, setIsLoading] = useState(false);

  // Load current camera settings
  useEffect(() => {
    loadCameraSettings();
  }, []);

  const [cameraError, setCameraError] = useState(null);

  const loadCameraSettings = async () => {
    try {
      setIsLoading(true);
      setCameraError(null);
      const response = await fetch('http://localhost:5000/api/get-camera-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setFilters(prev => ({
            ...prev,
            ...data.settings
          }));
          setCameraType(data.settings.cameraType);
        } else {
          setCameraError(data.message || 'Failed to load camera settings');
        }
      } else {
        setCameraError('Backend server not responding');
      }
    } catch (error) {
      console.error('Error loading camera settings:', error);
      setCameraError('Cannot connect to backend server. Make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFilter = async (key, value) => {
    try {
      const response = await fetch('http://localhost:5000/api/update-camera-setting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          setting: key,
          value: value
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setFilters(prev => ({
            ...prev,
            [key]: value
          }));
          setCameraError(null); // Clear any previous errors
        } else {
          setCameraError(data.message || 'Failed to update camera setting');
        }
      } else {
        setCameraError('Backend server not responding');
      }
    } catch (error) {
      console.error('Error updating camera setting:', error);
      setCameraError('Cannot connect to backend server');
    }
  };

  const handleInputChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleInputBlur = (key, value) => {
    updateFilter(key, parseFloat(value) || 0);
  };

  const resetToDefaults = () => {
    const defaultFilters = {
      exposure: 1068.0,
      gain: 0.0,
      width: 640,
      height: 480,
      pixelFormat: 'Mono 8',
      testPattern: 'Off',
      digitalShift: 0.0117,
      acquisitionFrameRate: 2.0,
      resultingFrameRate: 814.0,
      exposureAuto: 'Off'
    };
    
    setFilters(defaultFilters);
    
    // Apply all default settings
    Object.entries(defaultFilters).forEach(([key, value]) => {
      updateFilter(key, value);
    });
  };

  const saveSettings = () => {
    // Save current settings to localStorage
    localStorage.setItem('cameraFilters', JSON.stringify(filters));
    alert('Camera filter settings saved!');
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaSlidersH className="text-blue-600" />
            <h3 className="font-semibold text-gray-800">Camera Filters</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close Filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cameraError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-red-700 text-sm">
                <div className="font-medium">Camera Error</div>
                <div>{cameraError}</div>
                {cameraError.includes('camera not initialized') && (
                  <div className="mt-1 text-xs">
                    Please start a camera first by clicking "Start Camera" in the main interface.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading camera settings...</div>
          </div>
        ) : (
          <>
            {/* Acquisition Frame Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Acquisition Frame Rate</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.acquisitionFrameRateEnabled}
                    onChange={(e) => {
                      const newValue = e.target.checked ? 2.0 : 0;
                      handleInputChange('acquisitionFrameRate', newValue);
                      updateFilter('acquisitionFrameRate', newValue);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </div>
              </div>
              <input
                type="number"
                value={filters.acquisitionFrameRate}
                onChange={(e) => handleInputChange('acquisitionFrameRate', parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleInputBlur('acquisitionFrameRate', e.target.value)}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!filters.acquisitionFrameRateEnabled}
              />
            </div>

            {/* Resulting Frame Rate */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Resulting Frame Rate</label>
              <input
                type="number"
                value={filters.resultingFrameRate}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100"
              />
            </div>

            {/* Exposure Auto - HIKERBOT only */}
            {cameraType === 'HIKERBOT' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Exposure Auto</label>
                <select
                  value={filters.exposureAuto}
                  onChange={(e) => {
                    handleInputChange('exposureAuto', e.target.value);
                    updateFilter('exposureAuto', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Off">Off</option>
                  <option value="Once">Once</option>
                  <option value="Continuous">Continuous</option>
                </select>
              </div>
            )}

            {/* Exposure Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Exposure Time</label>
              <input
                type="number"
                value={filters.exposure}
                onChange={(e) => handleInputChange('exposure', parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleInputBlur('exposure', e.target.value)}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gain */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Gain</label>
              <input
                type="number"
                value={filters.gain}
                onChange={(e) => handleInputChange('gain', parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleInputBlur('gain', e.target.value)}
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Width */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={filters.width}
                  onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 0)}
                  onBlur={(e) => handleInputBlur('width', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    const newValue = filters.width + 10;
                    handleInputChange('width', newValue);
                    updateFilter('width', newValue);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    const newValue = Math.max(0, filters.width - 10);
                    handleInputChange('width', newValue);
                    updateFilter('width', newValue);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  -
                </button>
              </div>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Height</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={filters.height}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 0)}
                  onBlur={(e) => handleInputBlur('height', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    const newValue = filters.height + 10;
                    handleInputChange('height', newValue);
                    updateFilter('height', newValue);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    const newValue = Math.max(0, filters.height - 10);
                    handleInputChange('height', newValue);
                    updateFilter('height', newValue);
                  }}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  -
                </button>
              </div>
            </div>

            {/* Pixel Format - HIKERBOT only */}
            {cameraType === 'HIKERBOT' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Pixel Format</label>
                <select
                  value={filters.pixelFormat}
                  onChange={(e) => {
                    handleInputChange('pixelFormat', e.target.value);
                    updateFilter('pixelFormat', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Mono 8">Mono 8</option>
                  <option value="Mono 10">Mono 10</option>
                  <option value="Mono 12">Mono 12</option>
                  <option value="Mono 16">Mono 16</option>
                  <option value="RGB 8">RGB 8</option>
                  <option value="BGR 8">BGR 8</option>
                </select>
              </div>
            )}

            {/* Test Pattern - HIKERBOT only */}
            {cameraType === 'HIKERBOT' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Test Pattern</label>
                <select
                  value={filters.testPattern}
                  onChange={(e) => {
                    handleInputChange('testPattern', e.target.value);
                    updateFilter('testPattern', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Off">Off</option>
                  <option value="Horizontal Ramp">Horizontal Ramp</option>
                  <option value="Vertical Ramp">Vertical Ramp</option>
                  <option value="Diagonal Ramp">Diagonal Ramp</option>
                  <option value="Gray Ramp">Gray Ramp</option>
                </select>
              </div>
            )}

            {/* Digital Shift - HIKERBOT only */}
            {cameraType === 'HIKERBOT' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Digital Shift</label>
                <input
                  type="number"
                  value={filters.digitalShift}
                  onChange={(e) => handleInputChange('digitalShift', parseFloat(e.target.value) || 0)}
                  onBlur={(e) => handleInputBlur('digitalShift', e.target.value)}
                  step="0.0001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Webcam-specific controls */}
            {cameraType === 'WEBCAM' && (
              <>
                {/* Brightness */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Brightness</label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={filters.brightness}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleInputChange('brightness', value);
                      updateFilter('brightness', value);
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{filters.brightness}</div>
                </div>

                {/* Contrast */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Contrast</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.contrast}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleInputChange('contrast', value);
                      updateFilter('contrast', value);
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{filters.contrast}</div>
                </div>

                {/* Saturation */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Saturation</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.saturation}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleInputChange('saturation', value);
                      updateFilter('saturation', value);
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{filters.saturation}</div>
                </div>

                {/* Hue */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Hue</label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={filters.hue}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleInputChange('hue', value);
                      updateFilter('hue', value);
                    }}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">{filters.hue}</div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            <FaUndo className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveSettings}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <FaSave className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraFilters;
