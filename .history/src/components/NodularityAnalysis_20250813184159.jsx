"use client"

import React, { useState, useEffect, useRef } from 'react'
import { HelpCircle, X, Play, FileText, ImageIcon, Filter, Save, Plus } from "lucide-react"
import axios from 'axios'
import { Tabs, Button, Table } from 'antd'
import { DownOutlined } from '@ant-design/icons'

// Configure axios with base URL
const API_BASE_URL = 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

const { TabPane } = Tabs;

const NodularityAnalysis = ({ onClose, imagePath, imageUrl }) => {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [displayedImage, setDisplayedImage] = useState(null)
  const [histogramData, setHistogramData] = useState(null)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [configName, setConfigName] = useState("")
  const [summaryResults, setSummaryResults] = useState([])
  const [sizeRanges, setSizeRanges] = useState({
    1: { min: 0, max: 10 },
    2: { min: 10, max: 20 },
    3: { min: 20, max: 30 },
    4: { min: 30, max: 40 },
    5: { min: 40, max: 50 },
    6: { min: 50, max: 60 },
    7: { min: 60, max: 70 },
    8: { min: 70, max: Infinity }
  })
  const [fieldImage, setFieldImage] = useState(1)
  const [totalImages, setTotalImages] = useState(1)
  const [settings, setSettings] = useState({
    minSize: 100,
    maxSize: 10000,
    minCircularity: 0.6,
    maxCircularity: 1.0,
    threshold: 128
  })

  const canvasRef = useRef(null)
  const graphCanvasRef = useRef(null)

  // Define columns for the Table component
  const columns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (_, record, index) => index + 1
    },
    {
      title: 'Length',
      dataIndex: 'length',
      key: 'length',
      width: 100,
      render: (value) => value?.toFixed(1)
    },
    {
      title: 'Width',
      dataIndex: 'width',
      key: 'width',
      width: 100,
      render: (value) => value?.toFixed(1)
    },
    {
      title: 'Area',
      dataIndex: 'area',
      key: 'area',
      width: 100,
      render: (value) => value?.toFixed(1)
    },
    {
      title: 'Circularity',
      dataIndex: 'circularity',
      key: 'circularity',
      width: 100,
      render: (value) => value?.toFixed(3)
    },
    {
      title: 'Size',
      dataIndex: 'size_category',
      key: 'size_category',
      width: 80
    }
  ]

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
    console.log('NodularityAnalysis useEffect triggered:', { imagePath, imageUrl });
    
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

  const analyzeNodularity = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post('/api/nodularity/analyze', {
        image_path: imagePath,
        settings: settings
      })

      if (response.data.error) {
        setError(response.data.error)
      } else {
        setResults(response.data)
        setHistogramData(response.data.histogram)
        
        // Update displayed image to show analysis results
        if (response.data.analyzed_image_path) {
          const analyzedImageUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(response.data.analyzed_image_path)}`;
          setDisplayedImage(analyzedImageUrl);
          loadImageIntoCanvas(analyzedImageUrl);
        }
      }
    } catch (err) {
      console.error('Error analyzing nodularity:', err)
      setError(err.message || 'Failed to analyze nodularity')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: Number(value)
    }))
  }

  const handleFeatureClick = async (feature) => {
    setSelectedFeature(feature)
    try {
      await axios.post('/api/nodularity/toggle-selection', {
        x: feature.x,
        y: feature.y,
        w: feature.w,
        h: feature.h
      })
      // Re-analyze to update the display
      await analyzeNodularity()
    } catch (error) {
      console.error('Error toggling feature selection:', error)
    }
  }

  const handleSaveConfig = async () => {
    try {
      await axios.post('/api/nodularity/update-sizes', {
        size_ranges: sizeRanges
      })
      setShowConfigDialog(false)
    } catch (error) {
      console.error('Error saving configuration:', error)
      setError('Failed to save configuration')
    }
  }

  const handleExportReport = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await axios.post('/api/nodularity/export-report', {
        results: results?.nodules,
        statistics: results?.statistics,
        image_path: imagePath
      }, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `nodularity_report_${new Date().toISOString()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Error exporting report:', error)
      setError('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToSummary = () => {
    if (results?.nodules) {
      setSummaryResults(prev => [...prev, ...results.nodules])
    }
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
          <div className="p-2 bg-blue-500 rounded-lg">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Nodularity Analysis</h2>
            <p className="text-sm text-gray-500">Configure and analyze nodule properties</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportReport}
            disabled={!results || loading}
          >
            <FileText className="w-4 h-4" />
            Export Report
          </button>
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
                  <button 
                    onClick={() => setShowConfigDialog(true)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    Configure
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Threshold Level */}
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
                      onChange={(e) => handleSettingChange('threshold', e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Circularity */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium text-gray-700">Circularity Cutoff</label>
                      <span className="text-sm text-gray-500">{settings.minCircularity}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.minCircularity}
                      onChange={(e) => handleSettingChange('minCircularity', e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* Size Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Min Size (px²)</label>
                      <input
                        type="number"
                        value={settings.minSize}
                        onChange={(e) => handleSettingChange('minSize', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Max Size (px²)</label>
                      <input
                        type="number"
                        value={settings.maxSize}
                        onChange={(e) => handleSettingChange('maxSize', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={analyzeNodularity}
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
                    <span>Analyze Image</span>
                  </>
                )}
              </button>

              {/* Statistics Cards */}
              {results && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                    <div className="text-sm text-blue-600 mb-1">Total Features</div>
                    <div className="text-xl font-semibold text-blue-900">{results.statistics.total_features}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3">
                    <div className="text-sm text-green-600 mb-1">Total Nodules</div>
                    <div className="text-xl font-semibold text-green-900">{results.statistics.total_nodules}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3">
                    <div className="text-sm text-purple-600 mb-1">Nodularity</div>
                    <div className="text-xl font-semibold text-purple-900">{results.statistics.nodularity_percent}%</div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3">
                    <div className="text-sm text-orange-600 mb-1">Mean Circularity</div>
                    <div className="text-xl font-semibold text-orange-900">{results.statistics.mean_circularity.toFixed(3)}</div>
                  </div>
                </div>
              )}
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
                  <canvas
                    ref={graphCanvasRef}
                    width={400}
                    height={150}
                    style={{
                      width: '100%',
                      height: '150px',
                      marginTop: '16px',
                      cursor: 'pointer',
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
            <div className="bg-white border border-gray-200 rounded-lg">
              <Tabs defaultActiveKey="current" className="px-4 pt-4">
                <TabPane tab="Current Result" key="current">
                  <div className="p-4">
                    <Table
                      dataSource={results?.nodules || []}
                      columns={columns}
                      pagination={false}
                      rowKey="id"
                      size="small"
                      className="border border-gray-200 rounded-lg"
                    />
                    <Button
                      icon={<DownOutlined />}
                      onClick={handleAddToSummary}
                      className="mt-4"
                      type="primary"
                      ghost
                    >
                      Add to Summary
                    </Button>
                  </div>
                </TabPane>
                <TabPane tab="Overall Summary" key="summary">
                  <div className="p-4">
                    <Table
                      dataSource={summaryResults}
                      columns={columns}
                      pagination={false}
                      rowKey={record => `${record.id}_${Date.now()}`}
                      size="small"
                      className="border border-gray-200 rounded-lg"
                    />
                  </div>
                </TabPane>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Dialog */}
      {showConfigDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Size Categories Configuration</h3>
              <button 
                onClick={() => setShowConfigDialog(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">Size</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">Min (µm)</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-4">Max (µm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(sizeRanges).map(([size, range]) => (
                    <tr key={size}>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Size {size}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={range.min}
                          onChange={(e) => setSizeRanges(prev => ({
                            ...prev,
                            [size]: { ...range, min: parseFloat(e.target.value) }
                          }))}
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={range.max === Infinity ? 999999 : range.max}
                          onChange={(e) => setSizeRanges(prev => ({
                            ...prev,
                            [size]: { ...range, max: parseFloat(e.target.value) }
                          }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={() => setShowConfigDialog(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleSaveConfig}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NodularityAnalysis
