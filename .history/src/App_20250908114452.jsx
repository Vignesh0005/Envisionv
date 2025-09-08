import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Navbar from './components/Navbar'
import Toolbar from './components/Toolbar'
import ControlBox from './components/ControlBox'
import Display from './components/Display'
import ImageList from './components/ImageList'
import NodularityAnalysis from './components/NodularityAnalysis'
import PhaseSegmentation from './components/PhaseSegmentation'
import InclusionAnalysis from './components/InclusionAnalysis'
import PorosityAnalysis from './components/PorosityAnalysis'
import ShapeTracker from './components/ShapeTracker'
import EnhancedCalibration from './components/EnhancedCalibration'
import InlineCalibration from './components/InlineCalibration'

const SIDEBAR_WIDTH = '320px';
const VIEWER_MAX_WIDTH = 'calc(100vw - 340px)';
const VIEWER_MAX_HEIGHT = 'calc(100vh - 120px - 300px)'; // minus top bars and gallery

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [imagePath, setImagePath] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [selectedTool, setSelectedTool] = useState('pointer');
  const [measurementData, setMeasurementData] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [selectedShape, setSelectedShape] = useState(null);
  const [currentFolderPath, setCurrentFolderPath] = useState('C:\\Users\\Public\\MicroScope_Images');
  const [currentColor, setCurrentColor] = useState('#00ff00');
  const [currentFontColor, setCurrentFontColor] = useState('#ffffff');
  const [currentThickness, setCurrentThickness] = useState(2);
  const [currentCalibration, setCurrentCalibration] = useState(null);
  const [imageHistory, setImageHistory] = useState([]);
  const [imageHistoryIndex, setImageHistoryIndex] = useState(-1);
  const [showPhaseSegmentation, setShowPhaseSegmentation] = useState(false);
  const [showInclusion, setShowInclusion] = useState(false);
  const [showPorosity, setShowPorosity] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showInlineCalibration, setShowInlineCalibration] = useState(false);
  const [calibrationCallback, setCalibrationCallback] = useState(null);

  useEffect(() => {
    const loadCalibration = () => {
      const savedCalibration = localStorage.getItem('currentCalibration');
      if (savedCalibration) {
        setCurrentCalibration(JSON.parse(savedCalibration));
      }
    };
    loadCalibration();
    window.addEventListener('storage', loadCalibration);
    return () => window.removeEventListener('storage', loadCalibration);
  }, []);

  const handleImageLoad = (url) => setCurrentImageUrl(url);
  const handleSelectTool = (toolId) => setSelectedTool(toolId);
  const handleMeasurement = (data) => setMeasurementData(data);
  const handleShapesUpdate = (newShapes) => setShapes(newShapes);
  const handleShapeSelect = (shape) => setSelectedShape(shape);

  // Image history management functions
  const addToImageHistory = useCallback((newImagePath, operation) => {
    const newHistory = imageHistory.slice(0, imageHistoryIndex + 1);
    newHistory.push({ path: newImagePath, operation });
    setImageHistory(newHistory);
    setImageHistoryIndex(newHistory.length - 1);
  }, [imageHistory, imageHistoryIndex]);

  const handleImageUndo = useCallback(() => {
    if (imageHistory.length > 0 && imageHistoryIndex > 0) {
      const newIndex = imageHistoryIndex - 1;
      setImageHistoryIndex(newIndex);
      setImagePath(imageHistory[newIndex].path);
    }
  }, [imageHistory, imageHistoryIndex]);

  const handleImageRedo = () => {
    if (imageHistory.length > 0 && imageHistoryIndex < imageHistory.length - 1) {
      const newIndex = imageHistoryIndex + 1;
      setImageHistoryIndex(newIndex);
      setImagePath(imageHistory[newIndex].path);
    }
  };
  const handleClearShapes = () => {
    if (window.confirm('Are you sure you want to clear all measurements?')) {
      setShapes([]);
    }
  };

  // Add comprehensive clear function
  const handleClearWorkspace = () => {
    if (window.confirm('Are you sure you want to clear everything in the workspace? This will remove the current image, all measurements, and analysis results.')) {
      console.log('=== handleClearWorkspace: Starting clear process ===');
      console.log('Before clear - imagePath:', imagePath);
      console.log('Before clear - currentImageUrl:', currentImageUrl);
      console.log('Before clear - shapes count:', shapes.length);
      
      // Clear current image
      setImagePath(null);
      setCurrentImageUrl(null);
      
      // Clear image history
      setImageHistory([]);
      setImageHistoryIndex(-1);
      
      // Clear all shapes and measurements
      setShapes([]);
      setSelectedShape(null);
      setMeasurementData(null);
      
      // Clear analysis modals
      setShowPhaseSegmentation(false);
      setShowInclusion(false);
      setShowPorosity(false);
      
      // Reset tool to pointer
      setSelectedTool('pointer');
      
      // Clear any ongoing recording
      if (isRecording) {
        setIsRecording(false);
        // Stop camera if running
        fetch('http://localhost:5000/api/stop-camera', {
          method: 'POST'
        }).catch(error => console.error('Error stopping camera:', error));
      }
      
      console.log('=== handleClearWorkspace: Clear process completed ===');
      console.log('After clear - imagePath should be null');
      console.log('After clear - currentImageUrl should be null');
      console.log('After clear - shapes should be empty array');
    }
  };

  const handleImageSelect = (imagePath) => {
    console.log('=== handleImageSelect called ===');
    console.log('imagePath:', imagePath);
    console.log('Current imageHistory.length:', imageHistory.length);
    
    setImagePath(imagePath);
    // Initialize image history with the first image
    if (imageHistory.length === 0) {
      console.log('Initializing image history with original image');
      setImageHistory([{ path: imagePath, operation: 'Original Image' }]);
      setImageHistoryIndex(0);
    } else {
      console.log('Image history already exists, not initializing');
    }
  };

  // Initialize image history when imagePath is first set
  useEffect(() => {
    if (imagePath && imageHistory.length === 0) {
      console.log('=== useEffect: Initializing image history ===');
      console.log('imagePath:', imagePath);
      setImageHistory([{ path: imagePath, operation: 'Original Image' }]);
      setImageHistoryIndex(0);
    }
  }, [imagePath, imageHistory.length]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Top Menu Bars */}
      <div className="flex flex-col w-full z-50">
        <Navbar 
          imagePath={imagePath} 
          setImagePath={setImagePath} 
          currentImageUrl={imagePath ? `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}` : null}
          onClearWorkspace={handleClearWorkspace}
          addToImageHistory={addToImageHistory}
          onCalibrationClick={() => setShowInlineCalibration(true)}
        />
        {!(showPhaseSegmentation || showInclusion || showPorosity) && (
          <Toolbar 
            onSelectTool={handleSelectTool}
            selectedTool={selectedTool}
            measurementData={measurementData}
            onClearShapes={handleClearWorkspace}
            onColorChange={setCurrentColor}
            onFontColorChange={setCurrentFontColor}
            onThicknessChange={setCurrentThickness}
            currentColor={currentColor}
            currentFontColor={currentFontColor}
            currentThickness={currentThickness}
            currentCalibration={currentCalibration}
          />
        )}
      </div>
      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex flex-col h-full" style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}>
          {showInlineCalibration ? (
            <InlineCalibration
              imagePath={imagePath}
              onCalibrationComplete={(calibrationData) => {
                setCurrentCalibration(calibrationData);
                setCalibrationCallback(null);
                setShowInlineCalibration(false);
              }}
              onClose={() => {
                setShowInlineCalibration(false);
                setCalibrationCallback(null);
              }}
              setCalibrationCallback={setCalibrationCallback}
            />
          ) : (
            <>
              {/* Drawn Shapes Panel - fill sidebar up to ControlBox */}
              <div className="flex-1 min-h-0 w-full">
                <ShapeTracker
                  shapes={shapes}
                  selectedShape={selectedShape}
                  onShapeSelect={handleShapeSelect}
                  onColorChange={setCurrentColor}
                  currentColor={currentColor}
                  currentFontColor={currentFontColor}
                  onFontColorChange={setCurrentFontColor}
                  onShapesUpdate={handleShapesUpdate}
                />
              </div>
              {/* ControlBox at the bottom of the sidebar */}
              <div className="w-full">
                <ControlBox
                  isRecording={isRecording}
                  setIsRecording={setIsRecording}
                  setImagePath={setImagePath}
                  onFolderChange={setCurrentFolderPath}
                />
              </div>
            </>
          )}
        </div>
        {/* Main Image Viewer Centered */}
        <div className="flex-1 flex items-center justify-center overflow-hidden h-full">
          <div className="relative bg-white flex items-center justify-center w-full h-full">
            <Display
              isRecording={isRecording}
              imagePath={imagePath}
              onImageLoad={handleImageLoad}
              selectedTool={selectedTool}
              shapes={shapes}
              onShapesUpdate={handleShapesUpdate}
              currentColor={currentColor}
              currentFontColor={currentFontColor}
              currentThickness={currentThickness}
              onColorChange={setCurrentColor}
              onFontColorChange={setCurrentFontColor}
              handleImageUndo={handleImageUndo}
              handleImageRedo={handleImageRedo}
              imageHistory={imageHistory}
              imageHistoryIndex={imageHistoryIndex}
              isCalibrationMode={showInlineCalibration}
              calibrationCallback={calibrationCallback}
            />
          </div>
        </div>
      </div>
      {/* Bottom Gallery as Footer/Tray */}
      <div className="w-full flex justify-center items-end z-40">
        <ImageList
          currentPath={currentFolderPath}
          onSelectImage={handleImageSelect}
        />
      </div>
      {/* Analysis Modals */}
      {showPhaseSegmentation && (
        <PhaseSegmentation
          onClose={() => {
            console.log('PhaseSegmentation: Closing modal');
            setShowPhaseSegmentation(false);
          }}
          imagePath={imagePath}
          imageUrl={imagePath ? (() => {
            const url = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
            console.log('PhaseSegmentation: Constructed imageUrl:', url);
            console.log('PhaseSegmentation: imagePath from App.jsx:', imagePath);
            return url;
          })() : null}
        />
      )}
      {showInclusion && (
        <InclusionAnalysis
          onClose={() => setShowInclusion(false)}
          imagePath={imagePath}
          imageUrl={`http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`}
        />
      )}
      {showPorosity && (
        <PorosityAnalysis
          onClose={() => setShowPorosity(false)}
          imagePath={imagePath}
          setImagePath={setImagePath}
        />
      )}
      {showCalibration && (
        <EnhancedCalibration
          onClose={() => setShowCalibration(false)}
          imagePath={imagePath}
          onCalibrationComplete={(calibrationData) => {
            setCurrentCalibration(calibrationData);
            setShowCalibration(false);
          }}
        />
      )}
    </div>
  );
};

export default App;