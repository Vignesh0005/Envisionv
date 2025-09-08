"use client"

import React, { useState, useEffect, useRef } from 'react'
import { X, Play, FileText, ImageIcon, Filter } from "lucide-react"
import axios from 'axios'

// Configure axios with base URL
const API_BASE_URL = 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

const GrainSizeAnalysis = ({ onClose, imagePath, imageUrl }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [displayedImage, setDisplayedImage] = useState(null)
  const [results, setResults] = useState(null)
  const [settings, setSettings] = useState({
    method: 'intercept',
    calibration: 1.0,
    threshold: 128
  })

  const canvasRef = useRef(null)

  // Load image into canvas
  const loadImageIntoCanvas = (imageUrl) => {
    if (!canvasRef.current || !imageUrl) {
      console.log('Canvas or imageUrl not available:', { canvas: !!canvasRef.current, imageUrl });
      return;
    }
    
    console.log('Loading image into canvas:', imageUrl);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      console.log('Image loaded successfully:', { width: img.naturalWidth, height: img.naturalHeight });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Calculate scale to fit image within canvas bounds
      const maxWidth = 800;
      const maxHeight = 350;
      const scale = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
      
      // Set canvas size
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      
      console.log('Canvas size set to:', { width: canvas.width, height: canvas.height, scale });
      
      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      console.log('Image drawn to canvas successfully');
    };
    
    img.onerror = (error) => {
      console.error('Error loading image into canvas:', error);
      setError('Failed to load image');
    };
    
    img.src = imageUrl;
  };

  useEffect(() => {
    console.log('GrainSizeAnalysis useEffect triggered:', { imagePath, imageUrl });
    
    // Use imageUrl prop if available, otherwise construct from imagePath
    const imageToLoad = imageUrl || (imagePath ? `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}` : null);
    
    console.log('Image to load:', imageToLoad);
    
    if (imageToLoad) {
      setDisplayedImage(imageToLoad);
      // Add a small delay to ensure canvas is ready
      setTimeout(() => {
        loadImageIntoCanvas(imageToLoad);
      }, 100);
    }
  }, [imagePath, imageUrl])

  const analyzeGrainSize = async () => {
    setLoading(true)
    setError(null)
    try {
      // Placeholder for grain size analysis
      setError('Grain Size analysis is not yet implemented. This feature is coming soon!')
    } catch (err) {
      console.error('Error analyzing grain size:', err)
      setError(err.message || 'Failed to analyze grain size')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }

  const handleClose = (e) => {
    console.log('Close button clicked');
    e.preventDefault();
    e.stopPropagation();
    if (onClose) {
      console.log('Calling onClose function');
      onClose();
    } else {
      console.log('onClose function not available');
    }
  };

  return (
    <div className="fixed inset-0 bg-white">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Grain Size Analysis</h2>
            <p className="text-sm text-gray-500">Analyze grain size and distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)] bg-white">
        {/* Left Panel - Settings & Controls */}
        <div className="w-[350px] border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-8">
              {/* Analysis Settings */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Analysis Settings</h3>
                </div>
                
                <div className="space-y-6">
                  {/* Method Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Analysis Method</label>
                    <select
                      value={settings.method}
                      onChange={(e) => handleSettingChange('method', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="intercept">Intercept Method</option>
                      <option value="planimetric">Planimetric Method</option>
                      <option value="comparison">Comparison Method</option>
                    </select>
                  </div>

                  {/* Calibration */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Calibration (μm/pixel)</label>
                    <input
                      type="number"
                      value={settings.calibration}
                      onChange={(e) => handleSettingChange('calibration', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  {/* Threshold */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-gray-700">Threshold Level</label>
                      <span className="text-sm text-gray-500">{settings.threshold}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={settings.threshold}
                      onChange={(e) => handleSettingChange('threshold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={analyzeGrainSize}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Analyze Grain Size</span>
                  </>
                )}
              </button>

              {/* Coming Soon Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-yellow-800">Coming Soon</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Grain Size analysis is currently under development. This feature will include advanced grain size measurement and classification capabilities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Image Display */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {error && (
              <div className="mb-4">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="hover:text-red-800">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              {displayedImage ? (
                <div>
                  {/* Canvas for image display */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '350px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              ) : (
                <div className="flex justify-center items-center h-[350px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="text-gray-500 text-center">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No image selected</p>
                  </div>
                </div>
              )}
            </div>

            {/* Results Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-center text-gray-500">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Results</h3>
                <p className="text-sm text-gray-600">
                  Grain size analysis results will appear here once the feature is implemented.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GrainSizeAnalysis


