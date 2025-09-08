"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { HelpCircle, X, Play, FileText, ImageIcon, Moon, Sun, Filter, Plus, Trash, Save } from "lucide-react"
import HistogramChart from './HistogramChart'

// Add API base URL constant
const API_BASE_URL = 'http://localhost:5000';

export default function PorosityAnalysis({ onClose, imagePath }) {
  const [activeTab, setActiveTab] = useState("result")
  const [selectedRow, setSelectedRow] = useState(null)
  const [fieldImage, setFieldImage] = useState(1)
  const [totalImages, setTotalImages] = useState(1)
  const [unit, setUnit] = useState("microns")
  const [features, setFeatures] = useState("dark")
  const [source, setSource] = useState("view")
  const [prepMethod, setPrepMethod] = useState("threshold")
  const [results, setResults] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [plotData, setPlotData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [configName, setConfigName] = useState("")
  const [filters, setFilters] = useState([])
  const [showFilterDialog, setShowFilterDialog] = useState(false)
  const [newFilter, setNewFilter] = useState({ type: "size", min: 0, max: 1000 })
  const [error, setError] = useState(null)
  const [displayedImage, setDisplayedImage] = useState(null)
  const [viewOption, setViewOption] = useState("summary")
  const [activeFilterTab, setActiveFilterTab] = useState("filterSettings")
  const [filterSettings, setFilterSettings] = useState({
    circularity: { enabled: false, min: 0, max: 1 },
    length: { enabled: false, min: 0, max: 1000 },
    area: { enabled: false, min: 0, max: 1000000 },
    intervals: [
      { range: "Small", from: 0, to: 50, minLimit: 0, maxLimit: 100, color: "#FF0000" },
      { range: "Medium", from: 50, to: 100, minLimit: 0, maxLimit: 200, color: "#00FF00" },
      { range: "Large", from: 100, to: 200, minLimit: 0, maxLimit: 300, color: "#0000FF" }
    ],
    viewType: "summary"
  })
  const [histogramData, setHistogramData] = useState(null)
  const [minIntensityThreshold, setMinIntensityThreshold] = useState(0)
  const [maxIntensityThreshold, setMaxIntensityThreshold] = useState(255)

  // Ref for debounce timer
  const previewDebounceTimer = useRef(null)
  const imageContainerRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // --- All useCallback functions defined FIRST to ensure they are in scope ---
  const fetchHistogramData = useCallback(async (path) => {
    try {
      const cleanPath = path
        .replace(/\\/g, '/')
        .replace(/^file:\/\/\//, '')
        .replace(/^\/([A-Za-z]):\//, '$1:/')

      const response = await fetch(`${API_BASE_URL}/api/porosity/get-histogram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_path: cleanPath })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 'success') {
        setHistogramData(data)
        setMinIntensityThreshold(0)
        setMaxIntensityThreshold(255)
      } else {
        console.error('Error fetching histogram:', data.message)
        setError(data.message || 'Failed to fetch histogram')
      }
    } catch (error) {
      console.error('Network error fetching histogram:', error)
      setError(error.message || 'Failed to fetch histogram')
    }
  }, [])

  const applyIntensityThresholdAndGetPreview = useCallback(async (min, max) => {
    if (!imagePath) return
    try {
      const cleanPath = imagePath
        .replace(/\\/g, '/')
        .replace(/^file:\/\/\//, '')
        .replace(/^\/([A-Za-z]):\//, '$1:/')

      const response = await fetch(`${API_BASE_URL}/api/porosity/apply-intensity-threshold`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_path: cleanPath,
          min_threshold: min,
          max_threshold: max,
          features: features 
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status === 'success') {
        setDisplayedImage(`data:image/png;base64,${data.image}`)
      } else {
        console.error('Error applying threshold for preview:', data.message)
        setDisplayedImage(null) 
      }
    } catch (error) {
      console.error('Network error applying threshold for preview:', error)
      setDisplayedImage(null)
    }
  }, [imagePath, features])

  const handleIntensityThresholdChange = useCallback((min, max) => {
    setMinIntensityThreshold(min);
    setMaxIntensityThreshold(max);
  }, []);

  // --- Other helper functions (if not using useCallback and not dependent on above) ---
  const validateFilterSettings = (settings) => {
    const errors = [];
    
    if (settings.circularity.enabled) {
      if (settings.circularity.min < 0 || settings.circularity.max > 1) {
        errors.push('Circularity values must be between 0 and 1');
      }
      if (settings.circularity.min > settings.circularity.max) {
        errors.push('Minimum circularity cannot be greater than maximum');
      }
    }

    if (settings.length.enabled) {
      if (settings.length.min < 0) {
        errors.push('Length minimum cannot be negative');
      }
      if (settings.length.min > settings.length.max) {
        errors.push('Minimum length cannot be greater than maximum');
      }
    }

    if (settings.area.enabled) {
      if (settings.area.min < 0) {
        errors.push('Area minimum cannot be negative');
      }
      if (settings.area.min > settings.area.max) {
        errors.push('Minimum area cannot be greater than maximum');
      }
    }

    return errors;
  };

  const updateFilterSettings = (newSettings) => {
    const errors = validateFilterSettings(newSettings);
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return false;
    }
    setFilterSettings(newSettings);
    return true;
  };

  const handleMinIntensityInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 255 && value <= maxIntensityThreshold) {
      setMinIntensityThreshold(value);
    } else if (e.target.value === '') {
      setMinIntensityThreshold(0); 
    }
  };

  const handleMaxIntensityInputChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 255 && value >= minIntensityThreshold) {
      setMaxIntensityThreshold(value);
    } else if (e.target.value === '') {
      setMaxIntensityThreshold(255); 
    }
  };

  const handleResetIntensityThresholds = () => {
    setMinIntensityThreshold(0);
    setMaxIntensityThreshold(255);
  };

  // --- Functions that depend on the above ---
  const analyzeImage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Clean and normalize the image path for the backend
      let cleanPath = imagePath
        .replace(/\\/g, '/')
        .replace(/^file:\/\/\//, '')
        .replace(/^\/([A-Za-z]):\//, '$1:/');

      const response = await fetch(`${API_BASE_URL}/api/porosity/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_path: cleanPath,
          unit,
          features,
          prep_method: 'color', // Force color-based detection
          filter_settings: filterSettings,
          min_threshold: minIntensityThreshold, 
          max_threshold: maxIntensityThreshold 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'Analysis failed');
      }

      setResults(data.results || []);
      setStatistics(data.statistics || null);
      setPlotData(data.plot_data || null);
      // Display the processed/annotated image after analysis
      if (data.analyzed_image_path) {
        setDisplayedImage(`http://localhost:5000/api/get-image?path=${encodeURIComponent(data.analyzed_image_path)}&t=${Date.now()}`);
      } else {
        setDisplayedImage(null);
      }
      // Fetch histogram data after successful analysis to ensure it's up-to-date with the analyzed image
      await fetchHistogramData(imagePath);

    } catch (error) {
      console.error('Error analyzing image:', error);
      setError(error.message || 'Failed to analyze image');
      setResults([]);
      setStatistics(null);
      setPlotData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFilter = () => {
    setFilters([...filters, newFilter])
    setShowFilterDialog(false)
    setNewFilter({ type: "size", min: 0, max: 1000 })
  }

  const handleRemoveFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const handleSaveConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/porosity/save-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: configName,
          config: {
            unit,
            features,
            prep_method: prepMethod,
            filters, 
            min_intensity_threshold: minIntensityThreshold, 
            max_intensity_threshold: maxIntensityThreshold
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setConfigName("");
    } catch (error) {
      console.error('Error saving config:', error);
      setError('Failed to save configuration');
    }
  };

  const handleLoadConfig = async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/porosity/load-config/${name}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const config = await response.json();
      setUnit(config.unit);
      setFeatures(config.features);
      setPrepMethod(config.prep_method);
      setFilters(config.filters || []); 
      setMinIntensityThreshold(config.min_intensity_threshold || 0); 
      setMaxIntensityThreshold(config.max_intensity_threshold || 255);

      if (imagePath) {
        await fetchHistogramData(imagePath);
      }

    } catch (error) {
      console.error('Error loading config:', error);
      setError('Failed to load configuration');
    }
  };

  const handleExportReport = async () => {
    try {
      setLoading(true);
      setError(null);

      let cleanPath = imagePath
        .replace(/\\/g, '/')
        .replace(/^file:\/\/\//, '')
        .replace(/^\/([A-Za-z]):\//, '$1:/');

      const response = await fetch(`${API_BASE_URL}/api/porosity/export-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf'
        },
        body: JSON.stringify({
          results, 
          statistics, 
          image_path: cleanPath,
          filters: filterSettings,
          unit,
          features,
          prep_method: prepMethod,
          min_threshold: minIntensityThreshold, 
          max_threshold: maxIntensityThreshold 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `porosity_report_${timestamp}.pdf`;
      
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      link.remove();
      setError(null);
      
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Failed to generate PDF report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIntervalChange = (index, field, value) => {
    setFilterSettings(prev => {
      const newIntervals = [...prev.intervals]
      newIntervals[index] = { ...newIntervals[index], [field]: value }
      return { ...prev, intervals: newIntervals }
    })
  }

  const applyFilters = async () => {
    try {
      setLoading(true)
      setError(null)

      await analyzeImage(); 

    } catch (error) {
      console.error('Error applying filters:', error)
      setError('Failed to apply filters')
    } finally {
      setLoading(false)
    }
  }

  // --- useEffects ---
  useEffect(() => {
    if (imagePath) {
      setDisplayedImage(`http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`)
      setResults([])
      setStatistics(null)
      setPlotData(null)
      setError(null)
      fetchHistogramData(imagePath)
    }
  }, [imagePath])

  // Draw overlays on the canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const container = imageContainerRef.current;
    if (!canvas || !container || !displayedImage || !results.length) return;
    const ctx = canvas.getContext('2d');
    const img = container.querySelector('img');
    if (!img) return;
    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw overlays
    results.forEach((row, idx) => {
      // Assume row has x, y, width, height, or boundary points
      // Draw bounding box or circle (customize as needed)
      if (row.x !== undefined && row.y !== undefined && row.radius !== undefined) {
        // Draw circle
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(row.x, row.y, row.radius, 0, 2 * Math.PI);
        ctx.stroke();
        // Draw number
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(idx + 1, row.x - 10, row.y - 10);
      } else if (row.bbox) {
        // Draw bounding box
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(row.bbox.x, row.bbox.y, row.bbox.width, row.bbox.height);
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(idx + 1, row.bbox.x, row.bbox.y - 5);
      }
    });
  }, [displayedImage, results]);

  // Debounce effect for real-time preview updates
  // Remove auto-processing debounce effect. Only process on Run.

  return (
    <div className="fixed inset-0 flex justify-end z-50">
      {/* Main Content */}
      <div className="flex-1 bg-gray-100">
        {/* Image Display Area */}
        <div className="h-full p-4">
          <div className="bg-white rounded-lg shadow-lg h-full relative overflow-hidden">
            {displayedImage && (
              <div className="relative h-full">
                <img 
                  src={displayedImage}
                  alt="Analysis Image" 
                  className="w-full h-full object-contain"
                  style={{ maxHeight: '100%', maxWidth: '100%' }}
                  onError={(e) => {
                    console.error('Image load error:', e);
                    console.error('Attempted image path:', displayedImage);
                    setError('Failed to load image. Please check the file path.');
                  }}
                />
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="text-white">Analyzing...</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Panel */}
      <div className="w-[800px] bg-white shadow-lg border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          <span className="font-medium">Porosity Analysis</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
            <button 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Rest of the existing content */}
      <div className="flex h-[calc(100%-48px)]">
        {/* Left Panel */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-red-600">Step 1:</span>
              <button 
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={analyzeImage}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Get Image'}
            </button>
          </div>

          {/* Distribution Analysis */}
          <div className="text-sm font-medium">Distribution Analysis</div>

          {/* Image Preparation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Image Preparation:</span>
                <select 
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-48"
                  value={prepMethod}
                  onChange={(e) => setPrepMethod(e.target.value)}
                >
                  <option value="threshold">Threshold</option>
                  <option value="edge_detect">Edge Detection</option>
                  <option value="adaptive">Adaptive Threshold</option>
                  <option value="morphological">Morphological</option>
              </select>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 
                      flex items-center gap-2"
                    onClick={() => setShowFilterDialog(true)}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                  <button 
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 
                      flex items-center gap-2"
                    onClick={analyzeImage}
                    disabled={loading}
                  >
                <Play className="w-4 h-4" />
                Run
              </button>
                </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="border rounded shadow-sm">
            <div className="p-2 bg-gray-50 border-b text-sm font-medium">Current Results</div>
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-200 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 border-r border-gray-300 text-left">Id</th>
                    <th className="px-2 py-1 border-r border-gray-300 text-left">Length</th>
                    <th className="px-2 py-1 border-r border-gray-300 text-left">Width</th>
                    <th className="px-2 py-1 border-r border-gray-300 text-left">Area</th>
                    <th className="px-2 py-1 border-r border-gray-300 text-left">Circ</th>
                    <th className="px-2 py-1 border-r border-gray-300 text-left">Per</th>
                    <th className="px-2 py-1 text-left">?</th>
                  </tr>
                </thead>
                <tbody>
                    {results.map((row) => (
                    <tr
                      key={row.id}
                        className={`${selectedRow === row.id ? "bg-blue-100" : "hover:bg-gray-50"} 
                          transition-colors duration-150`}
                      onClick={() => setSelectedRow(row.id)}
                        style={{
                          backgroundColor: row.color ? `${row.color}22` : undefined // Add very light version of the color as background
                        }}
                    >
                      <td className="px-2 py-1 border-r border-gray-300">{row.id}</td>
                        <td className="px-2 py-1 border-r border-gray-300">{row.length.toFixed(2)}</td>
                        <td className="px-2 py-1 border-r border-gray-300">{row.width.toFixed(2)}</td>
                        <td className="px-2 py-1 border-r border-gray-300">{row.area.toFixed(2)}</td>
                        <td className="px-2 py-1 border-r border-gray-300">{row.circ.toFixed(2)}</td>
                        <td className="px-2 py-1 border-r border-gray-300">{row.per.toFixed(2)}</td>
                      <td className="px-2 py-1">{row.q}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Config */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Save Config:</span>
              <input 
                type="text" 
                className="text-sm border border-gray-300 rounded px-1 py-0.5 flex-1"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Config name"
              />
              <button 
                className="px-3 py-1 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300 flex items-center gap-1"
                onClick={handleSaveConfig}
              >
                <Save className="w-3 h-3" />
              Save
            </button>
          </div>

          {/* Summary Result */}
          <div className="border rounded">
            <div className="flex border-b">
              <button
                className={`px-3 py-1 text-sm ${activeTab === "result" ? "bg-white border-t border-l border-r border-gray-300" : "bg-gray-200"}`}
                onClick={() => setActiveTab("result")}
              >
                Result
              </button>
              <button
                className={`px-3 py-1 text-sm ${activeTab === "graph" ? "bg-white border-t border-l border-r border-gray-300" : "bg-gray-200"}`}
                onClick={() => setActiveTab("graph")}
              >
                Graph
              </button>
            </div>
              <div className="h-64 bg-gray-50 p-4">
                {activeTab === "result" && statistics && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Statistics</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm">Total Pores: {statistics.total_pores}</div>
                      <div className="text-sm">Mean Area: {statistics.mean_area.toFixed(2)}</div>
                      <div className="text-sm">Mean Length: {statistics.mean_length.toFixed(2)}</div>
                      <div className="text-sm">Mean Width: {statistics.mean_width.toFixed(2)}</div>
                      <div className="text-sm">Mean Circularity: {statistics.mean_circularity.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                {activeTab === "graph" && plotData && (
                  <img 
                    src={`data:image/png;base64,${plotData}`} 
                    alt="Distribution Plot"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center items-center gap-2 pt-2">
              <button 
                className="px-3 py-1 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300 flex items-center gap-1"
                onClick={handleExportReport}
              >
              <FileText className="w-3 h-3" />
              Report
            </button>
            <div className="flex items-center gap-1">
              <span className="text-sm">Field Image:</span>
              <div className="flex items-center border border-gray-300 rounded">
                <button
                  className="px-1 text-sm bg-gray-200 hover:bg-gray-300"
                  onClick={() => setFieldImage(Math.max(1, fieldImage - 1))}
                >
                  &lt;
                </button>
                <span className="px-2 text-sm">{fieldImage}</span>
                <button
                  className="px-1 text-sm bg-gray-200 hover:bg-gray-300"
                  onClick={() => setFieldImage(Math.min(totalImages, fieldImage + 1))}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
            </div>

      {/* Filter Dialog */}
      {showFilterDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg w-[600px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-t-lg">
              <h3 className="text-lg font-medium">Filter Settings and View Options</h3>
              <button onClick={() => setShowFilterDialog(false)}>
                <X className="w-5 h-5" />
              </button>
          </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeFilterTab === "filterSettings"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveFilterTab("filterSettings")}
                >
                  Filter Settings
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeFilterTab === "viewOptions"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  onClick={() => setActiveFilterTab("viewOptions")}
                >
                  View Options
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {activeFilterTab === "filterSettings" ? (
                <div className="space-y-4">
                  {/* Circularity Filter */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={filterSettings.circularity.enabled}
                        onChange={(e) => updateFilterSettings({
                          ...filterSettings,
                          circularity: { ...filterSettings.circularity, enabled: e.target.checked }
                        })}
                      />
                      <span className="ml-2 text-sm font-medium">Circularity Cutoff</span>
                    </label>
                    <div className="flex gap-4 pl-6">
                      <div>
                        <label className="block text-xs text-gray-500">Min</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={filterSettings.circularity.min}
                          onChange={(e) => updateFilterSettings({
                            ...filterSettings,
                            circularity: { ...filterSettings.circularity, min: parseFloat(e.target.value) }
                          })}
                          disabled={!filterSettings.circularity.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Max</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={filterSettings.circularity.max}
                          onChange={(e) => updateFilterSettings({
                            ...filterSettings,
                            circularity: { ...filterSettings.circularity, max: parseFloat(e.target.value) }
                          })}
                          disabled={!filterSettings.circularity.enabled}
                        />
              </div>
            </div>
          </div>

                  {/* Length Filter */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={filterSettings.length.enabled}
                        onChange={(e) => updateFilterSettings({
                          ...filterSettings,
                          length: { ...filterSettings.length, enabled: e.target.checked }
                        })}
                      />
                      <span className="ml-2 text-sm font-medium">Length</span>
                </label>
                    <div className="flex gap-4 pl-6">
                      <div>
                        <label className="block text-xs text-gray-500">Min</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={filterSettings.length.min}
                          onChange={(e) => updateFilterSettings({
                            ...filterSettings,
                            length: { ...filterSettings.length, min: parseFloat(e.target.value) }
                          })}
                          disabled={!filterSettings.length.enabled}
                        />
              </div>
                      <div>
                        <label className="block text-xs text-gray-500">Max</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={filterSettings.length.max}
                          onChange={(e) => updateFilterSettings({
                            ...filterSettings,
                            length: { ...filterSettings.length, max: parseFloat(e.target.value) }
                          })}
                          disabled={!filterSettings.length.enabled}
                        />
              </div>
            </div>
          </div>

                  {/* Area Filter */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-blue-600"
                        checked={filterSettings.area.enabled}
                        onChange={(e) => updateFilterSettings({
                          ...filterSettings,
                          area: { ...filterSettings.area, enabled: e.target.checked }
                        })}
                      />
                      <span className="ml-2 text-sm font-medium">Area</span>
                    </label>
                    <div className="flex gap-4 pl-6">
                      <div>
                        <label className="block text-xs text-gray-500">Min</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={filterSettings.area.min}
                          onChange={(e) => updateFilterSettings({
                            ...filterSettings,
                            area: { ...filterSettings.area, min: parseFloat(e.target.value) }
                          })}
                          disabled={!filterSettings.area.enabled}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Max</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={filterSettings.area.max}
                          onChange={(e) => updateFilterSettings({
                            ...filterSettings,
                            area: { ...filterSettings.area, max: parseFloat(e.target.value) }
                          })}
                          disabled={!filterSettings.area.enabled}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Histogram and Intensity Threshold Filters */}
                  <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                    <h4 className="text-sm font-medium">Intensity Threshold</h4>
                    {histogramData && histogramData.counts && histogramData.counts.length > 0 ? (
                      <HistogramChart
                        counts={histogramData.counts}
                        bins={histogramData.bins}
                        minThreshold={minIntensityThreshold}
                        maxThreshold={maxIntensityThreshold}
                        onThresholdChange={handleIntensityThresholdChange}
                      />
                    ) : (
                      <div className="text-sm text-gray-500">Load an image to see the histogram.</div>
                    )}
                    
                    <div className="flex gap-4">
                      <div>
                        <label className="block text-xs text-gray-500">Min Intensity</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={minIntensityThreshold}
                          onChange={handleMinIntensityInputChange}
                          min={0}
                          max={255}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Max Intensity</label>
                        <input
                          type="number"
                          className="mt-1 block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          value={maxIntensityThreshold}
                          onChange={handleMaxIntensityInputChange}
                          min={0}
                          max={255}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          className="px-3 py-1 text-sm bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
                          onClick={handleResetIntensityThresholds}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* View Type Selection */}
                  <div className="space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="viewType"
                        value="summary"
                        checked={filterSettings.viewType === "summary"}
                        onChange={(e) => setFilterSettings(prev => ({
                          ...prev,
                          viewType: e.target.value
                        }))}
                      />
                      <span className="ml-2 text-sm">Summary</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="viewType"
                        value="byLength"
                        checked={filterSettings.viewType === "byLength"}
                        onChange={(e) => setFilterSettings(prev => ({
                          ...prev,
                          viewType: e.target.value
                        }))}
                      />
                      <span className="ml-2 text-sm">By Length</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="viewType"
                        value="byWidth"
                        checked={filterSettings.viewType === "byWidth"}
                        onChange={(e) => setFilterSettings(prev => ({
                          ...prev,
                          viewType: e.target.value
                        }))}
                      />
                      <span className="ml-2 text-sm">By Width</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="viewType"
                        value="byArea"
                        checked={filterSettings.viewType === "byArea"}
                        onChange={(e) => setFilterSettings(prev => ({
                          ...prev,
                          viewType: e.target.value
                        }))}
                      />
                      <span className="ml-2 text-sm">By Area</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="viewType"
                        value="byCirc"
                        checked={filterSettings.viewType === "byCirc"}
                        onChange={(e) => setFilterSettings(prev => ({
                          ...prev,
                          viewType: e.target.value
                        }))}
                      />
                      <span className="ml-2 text-sm">By Circ</span>
                    </label>
          </div>

                  {/* Intervals Table */}
                  <div className="mt-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Range</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min Limit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Max Limit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filterSettings.intervals.map((interval, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{interval.range}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-16 rounded border-gray-300 text-sm"
                                value={interval.from}
                                onChange={(e) => {
                                  const newIntervals = [...filterSettings.intervals];
                                  newIntervals[index] = { ...interval, from: parseFloat(e.target.value) };
                                  setFilterSettings(prev => ({ ...prev, intervals: newIntervals }));
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-16 rounded border-gray-300 text-sm"
                                value={interval.to}
                                onChange={(e) => {
                                  const newIntervals = [...filterSettings.intervals];
                                  newIntervals[index] = { ...interval, to: parseFloat(e.target.value) };
                                  setFilterSettings(prev => ({ ...prev, intervals: newIntervals }));
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-16 rounded border-gray-300 text-sm"
                                value={interval.minLimit}
                                onChange={(e) => {
                                  const newIntervals = [...filterSettings.intervals];
                                  newIntervals[index] = { ...interval, minLimit: parseFloat(e.target.value) };
                                  setFilterSettings(prev => ({ ...prev, intervals: newIntervals }));
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="w-16 rounded border-gray-300 text-sm"
                                value={interval.maxLimit}
                                onChange={(e) => {
                                  const newIntervals = [...filterSettings.intervals];
                                  newIntervals[index] = { ...interval, maxLimit: parseFloat(e.target.value) };
                                  setFilterSettings(prev => ({ ...prev, intervals: newIntervals }));
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="color"
                                className="w-16 h-8 rounded"
                                value={interval.color}
                                onChange={(e) => {
                                  const newIntervals = [...filterSettings.intervals];
                                  newIntervals[index] = { ...interval, color: e.target.value };
                                  setFilterSettings(prev => ({ ...prev, intervals: newIntervals }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => setShowFilterDialog(false)}
              >
                Cancel
            </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                onClick={() => {
                  applyFilters();
                  setShowFilterDialog(false);
                }}
              >
                Apply
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
