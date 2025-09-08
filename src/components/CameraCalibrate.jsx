import React, { useState, useRef, useEffect } from 'react';

const CameraCalibrate = ({ imagePath }) => {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState({ x: 0, y: 0 }); // pixels per micron
  const [calibrationLine, setCalibrationLine] = useState({ start: null, end: null });
  const [isDrawing, setIsDrawing] = useState(false);
  const [measurementValue, setMeasurementValue] = useState('');
  const [unit, setUnit] = useState('microns'); // 'microns' or 'cm'
  const [lines, setLines] = useState([]); // Store multiple measurements
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [scaleFactor, setScaleFactor] = useState(1);
  const [realScale, setRealScale] = useState({ x: 0, y: 0 }); // pixels to unit conversion
  const [currentMeasurement, setCurrentMeasurement] = useState(null);
  const [canDrawLine, setCanDrawLine] = useState(true);
  const [calibrationData, setCalibrationData] = useState({
    pixelDistance: 0,
    actualDistance: 0,
    unit: 'mm',
    calibrationFactor: 0
  });
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const [calibrationType, setCalibrationType] = useState(null); // 'new' or 'existing'
  const [magnification, setMagnification] = useState('100x');
  const [existingCalibrations, setExistingCalibrations] = useState({});
  const [selectedExistingCalibration, setSelectedExistingCalibration] = useState(null);

  // Add resolution state
  const [resolution, setResolution] = useState({ width: 1920, height: 1080 });

  // Add useEffect to load camera settings
  useEffect(() => {
    const loadCameraSettings = () => {
      const savedSettings = localStorage.getItem('cameraSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          const [width, height] = settings.resolution.split('x').map(Number);
          setResolution({ width, height });
        } catch (error) {
          console.error('Error loading camera settings:', error);
        }
      }
    };

    loadCameraSettings();
    // Listen for changes in camera settings
    window.addEventListener('storage', loadCameraSettings);
    return () => window.removeEventListener('storage', loadCameraSettings);
  }, []);

  // Add reset calibration function
  const resetCalibration = () => {
    setLines([]);
    setCalibrationLine({ start: null, end: null });
    setCanDrawLine(true);
    setMeasurementValue('');
    setRealScale({ x: 0, y: 0 });
    setCurrentMeasurement(null);
  };

  // Modify initializeCanvas to draw image without scaling
  const initializeCanvas = (img) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match camera resolution
    canvas.width = resolution.width;
    canvas.height = resolution.height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image at full resolution
    ctx.drawImage(img, 0, 0, resolution.width, resolution.height);
  };

  // Modify drawScaleMarkers to show calibrated values
  const drawScaleMarkers = (ctx, width, height) => {
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    
    const step = 100; // pixels between markers
    
    // Draw X axis scale
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, height - 20);
      ctx.lineTo(x, height - 10);
      ctx.stroke();
      
      if (realScale.x) {
        // Convert pixels to calibrated units
        const realValue = (x / scaleFactor / realScale.x).toFixed(2);
        ctx.fillText(`${realValue} ${unit}`, x - 20, height - 5);
      } else {
        // Show original pixels
        ctx.fillText(`${Math.round(x / scaleFactor)}px`, x - 15, height - 5);
      }
    }
    
    // Draw Y axis scale
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(20, y);
      ctx.stroke();
      
      if (realScale.x) {
        // Convert pixels to calibrated units
        const realValue = (y / scaleFactor / realScale.x).toFixed(2);
        ctx.fillText(`${realValue} ${unit}`, 25, y + 5);
      } else {
        // Show original pixels
        ctx.fillText(`${Math.round(y / scaleFactor)}px`, 25, y + 5);
      }
    }
  };

  // Modify getScaledCoordinates to get actual coordinates
  const getScaledCoordinates = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Convert click coordinates to canvas coordinates
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  // Function to save the canvas as image
  const saveImage = () => {
    const canvas = canvasRef.current;
    // Create a temporary link element
    const link = document.createElement('a');
    link.download = 'calibrated-image.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modified handleMouseDown
  const handleMouseDown = (e) => {
    if (!image || !canDrawLine) return;
    
    const { x, y } = getScaledCoordinates(e.clientX, e.clientY);
    setIsDrawing(true);
    // Start point is where user clicks
    setCalibrationLine({
        start: { x, y },
        end: { x, y },
        measurement: null
    });
  };

  // Simplify handleMouseMove
  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const coords = getScaledCoordinates(e.clientX, e.clientY);
    setCalibrationLine(prev => ({
        ...prev,
        end: { 
        x: coords.x,
        y: prev.start.y // Keep y coordinate same as start point
        }
    }));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Convert pixels to real units
  const convertToRealUnits = (pixels) => {
    if (!realScale.x) return null;
    const realValue = pixels / scaleFactor / realScale.x;
    return realValue.toFixed(2);
  };

  // Modify handleMeasurementSubmit to handle single calibration
  const handleMeasurementSubmit = (e) => {
    if (e) e.preventDefault();
    if (!measurementValue || isNaN(measurementValue)) {
        alert('Please enter a valid measurement value');
        return;
    }

    const value = parseFloat(measurementValue);
    const pixelDistance = Math.sqrt(
        Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2)
    );

    // Calculate pixels per unit
    const pixelsPerUnit = pixelDistance / value;
    setRealScale({ 
        x: pixelsPerUnit,
        y: pixelsPerUnit
    });

    // Update calibration data
    setCalibrationData({
        pixelDistance: pixelDistance,
        actualDistance: value,
        unit: unit,
        calibrationFactor: pixelsPerUnit
    });

    // Store calibration line
    setLines([{
        ...calibrationLine,
        measurement: value,
        unit: unit,
        pixelDistance: pixelDistance,
        pixelsPerUnit: pixelsPerUnit,
        calibrationDate: new Date().toISOString()
    }]);

    setMeasurementValue('');
    setCanDrawLine(false);
    
    // Redraw canvas with updated measurements
    const ctx = canvasRef.current.getContext('2d');
    drawImage();
    drawLine(ctx);
  };

  // Calculate real-time measurement while drawing
  useEffect(() => {
    if (calibrationLine.start && calibrationLine.end && realScale.x) {
      const pixelDistance = Math.sqrt(
        Math.pow(calibrationLine.end.x - calibrationLine.start.x, 2) +
        Math.pow(calibrationLine.end.y - calibrationLine.start.y, 2)
      );
      const realDistance = convertToRealUnits(pixelDistance);
      setCurrentMeasurement(realDistance);
    } else {
      setCurrentMeasurement(null);
    }
  }, [calibrationLine, realScale]);

  // Add this new function to draw scale bar
  const drawScaleBar = (ctx, width, height) => {
    if (!realScale.x) return; // Only draw if calibrated

    const scaleBarLength = 100; // pixels
    const realDistance = (scaleBarLength / scaleFactor / realScale.x).toFixed(2);
    
    // Position the scale bar in the bottom right
    const margin = 50;
    const barY = height - margin;
    const barX = width - margin - scaleBarLength;

    // Draw the scale bar
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    // Main line
    ctx.moveTo(barX, barY);
    ctx.lineTo(barX + scaleBarLength, barY);
    
    // End ticks
    ctx.moveTo(barX, barY - 5);
    ctx.lineTo(barX, barY + 5);
    ctx.moveTo(barX + scaleBarLength, barY - 5);
    ctx.lineTo(barX + scaleBarLength, barY + 5);
    
    ctx.stroke();

    // Draw the measurement text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${realDistance} ${unit}`, barX + scaleBarLength/2, barY - 10);
  };

  // Modify the calculatePixelDistance function to return original image pixels
  const calculatePixelDistance = (start, end) => {
    if (!start || !end) return null;
    
    // Convert display coordinates to original image coordinates
    const originalX1 = start.x / scaleFactor;
    const originalY1 = start.y / scaleFactor;
    const originalX2 = end.x / scaleFactor;
    const originalY2 = end.y / scaleFactor;
    
    // Use Pythagorean theorem for accurate distance
    const originalDistance = Math.sqrt(
      Math.pow(originalX2 - originalX1, 2) +
      Math.pow(originalY2 - originalY1, 2)
    );
    
    return originalDistance;
  };

  // Update the image loading effect
  useEffect(() => {
    if (imagePath) {
      const img = new Image();
      img.onload = () => {
        // Store original dimensions
        setOriginalDimensions({ width: img.width, height: img.height });
        setImage(img);
        imageRef.current = img;
        initializeCanvas(img);
      };
      img.src = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
    }
  }, [imagePath, resolution]); // Add resolution to dependencies

  // Update the redraw effect
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, resolution.width, resolution.height);
    
    // Draw dimensions info
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Resolution: ${resolution.width} × ${resolution.height} px`, 20, 30);

    // Draw calibration line with perpendicular ends
    if (calibrationLine.start && calibrationLine.end) {
      // Draw main horizontal line
      ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.start.y);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw perpendicular lines at endpoints
      const perpLength = 10; // Length of perpendicular lines

      // Left perpendicular line
      ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y - perpLength);
      ctx.lineTo(calibrationLine.start.x, calibrationLine.start.y + perpLength);
      ctx.stroke();

      // Right perpendicular line
      ctx.beginPath();
      ctx.moveTo(calibrationLine.end.x, calibrationLine.start.y - perpLength);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.start.y + perpLength);
      ctx.stroke();

      // Draw measurement
      const pixelDistance = Math.abs(calibrationLine.end.x - calibrationLine.start.x);
        const midX = (calibrationLine.start.x + calibrationLine.end.x) / 2;
      const midY = calibrationLine.start.y - 20;
      
      ctx.fillStyle = 'black';
      ctx.fillRect(midX - 40, midY - 15, 80, 20);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(pixelDistance)} px`, midX, midY);
    }

  }, [image, calibrationLine, resolution]);

  // Add unit conversion helper
  const convertUnits = (value, fromUnit, toUnit) => {
    // More precise conversion factors
    const conversions = {
      microns: 1,
      mm: 1000,    // 1 mm = 1000 microns
      cm: 10000,   // 1 cm = 10000 microns
      um: 1        // alias for microns
    };
    
    // Convert to base unit (microns) first, then to target unit
    const inMicrons = value * conversions[fromUnit];
    return inMicrons / conversions[toUnit];
  };

  // Handle unit change
  const handleUnitChange = (newUnit) => {
    // Convert all existing measurements to new unit
    const updatedLines = lines.map(line => ({
      ...line,
      measurement: convertUnits(line.measurement, line.unit, newUnit),
      unit: newUnit
    }));
    setLines(updatedLines);
    setUnit(newUnit);
  };

  const validateCalibration = (pixelDistance, measurementValue) => {
    if (pixelDistance < 10) {
      throw new Error('Calibration line too short. Please draw a longer line for accurate calibration.');
    }
    
    if (measurementValue <= 0) {
      throw new Error('Measurement value must be greater than 0.');
    }
    
    // Check for reasonable calibration values based on magnification
    const pixelsPerMicron = pixelDistance / measurementValue;
    if (pixelsPerMicron < 0.01 || pixelsPerMicron > 100) {
      throw new Error('Calibration value seems incorrect. Please check your measurement.');
    }
  };

  const CalibrationInfo = ({ realScale, unit }) => {
    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-blue-900">Calibration Information</h4>
        <div className="mt-2 space-y-2">
          <p>Scale: {realScale.x.toFixed(4)} pixels/{unit}</p>
          <p>Resolution: {(1/realScale.x).toFixed(4)} {unit}/pixel</p>
          <p>Calibration Status: {realScale.x > 0 ? '✓ Calibrated' : '⚠️ Not Calibrated'}</p>
        </div>
      </div>
    );
  };

  // Add this function to load existing calibrations
  const loadExistingCalibrations = async () => {
    try {
      console.log('Loading existing calibrations...');
      const response = await fetch('http://localhost:5000/api/get-calibrations');
      const data = await response.json();
      console.log('Calibration data received:', data);
      
      if (data.status === 'success') {
        // Sort calibrations by timestamp and keep only the latest for each magnification
        const sortedCalibrations = {};
        Object.entries(data.calibrations).forEach(([mag, cal]) => {
          if (!sortedCalibrations[mag] || new Date(cal.timestamp) > new Date(sortedCalibrations[mag].timestamp)) {
            sortedCalibrations[mag] = cal;
          }
        });
        
        setExistingCalibrations(sortedCalibrations);
        console.log('Latest calibrations loaded:', sortedCalibrations);
        
        // If there's a current calibration in localStorage, try to match it with loaded calibrations
        const savedCalibration = localStorage.getItem('currentCalibration');
        if (savedCalibration) {
          const currentCalibration = JSON.parse(savedCalibration);
          console.log('Current calibration from localStorage:', currentCalibration);
          
          // Find matching calibration in loaded data
          const matchingCalibration = Object.values(sortedCalibrations).find(
            cal => cal.magnification === currentCalibration.magnification
          );
          
          if (matchingCalibration) {
            console.log('Found matching calibration:', matchingCalibration);
            handleUseCalibration(matchingCalibration);
          }
        }
      } else {
        console.error('Failed to load calibrations:', data.message);
      }
    } catch (error) {
      console.error('Error loading calibrations:', error);
    }
  };

  // Add useEffect to load existing calibrations when component mounts
  useEffect(() => {
    loadExistingCalibrations();
  }, []);

  // Add function to handle selecting existing calibration
  const handleSelectExistingCalibration = (calibration) => {
    setSelectedExistingCalibration(calibration);
    setRealScale({
      x: calibration.calibrationFactor,
      y: calibration.calibrationFactor
    });
    setUnit(calibration.unit);
    setCanDrawLine(false);
  };

  // Modify handleSaveCalibration to include magnification
  const handleSaveCalibration = async () => {
    try {
      if (!calibrationData.calibrationFactor) {
        alert('Please perform calibration first');
        return;
      }

      const calibrationToSave = {
        ...calibrationData,
        magnification,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('http://localhost:5000/api/save-calibration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          calibrationData: calibrationToSave
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Save calibration response:', data);

      if (data.status === 'success') {
        alert('Calibration data saved successfully');
      } else {
        alert('Failed to save calibration: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving calibration:', error);
      alert('Error saving calibration: ' + error.message);
    }
  };

  // Update handleUseCalibration function
  const handleUseCalibration = (calibration) => {
    try {
    // Save the selected calibration to localStorage
      const calibrationData = {
      magnification: calibration.magnification,
      calibrationFactor: calibration.calibrationFactor,
      unit: calibration.unit,
      timestamp: calibration.timestamp
      };
      
      localStorage.setItem('currentCalibration', JSON.stringify(calibrationData));

    // Update UI state
    setSelectedExistingCalibration(calibration);
    setRealScale({ 
      x: calibration.calibrationFactor,
      y: calibration.calibrationFactor 
    });
      setUnit(calibration.unit);

    // Force a storage event to notify other components
    window.dispatchEvent(new Event('storage'));
    
    // Also dispatch a custom calibration change event for more specific handling
    window.dispatchEvent(new CustomEvent('calibrationChanged', { 
      detail: { calibration: calibrationData } 
    }));

      // Show success message
      alert(`Using ${calibration.magnification} calibration (${calibration.calibrationFactor.toFixed(4)} px/μm)`);
    } catch (error) {
      console.error('Error using calibration:', error);
      alert('Error applying calibration: ' + error.message);
    }
  };

  // Add delete calibration handler
  const handleDeleteCalibration = (magnification) => {
    if (window.confirm(`Are you sure you want to delete the ${magnification} calibration?`)) {
      // Remove from localStorage
      const updatedCalibrations = { ...existingCalibrations };
      delete updatedCalibrations[magnification];
      localStorage.setItem('calibrations', JSON.stringify(updatedCalibrations));
      setExistingCalibrations(updatedCalibrations);

      // If this was the selected calibration, clear it
      if (selectedExistingCalibration?.magnification === magnification) {
        setSelectedExistingCalibration(null);
        localStorage.removeItem('currentCalibration');
      }
    }
  };

  const drawLine = (ctx) => {
    if (calibrationLine.start && calibrationLine.end) {
      // Draw main horizontal line
        ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.start.y);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();

      // Draw perpendicular lines at endpoints
      const perpLength = 10; // Length of perpendicular lines

      // Left perpendicular line
        ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y - perpLength);
      ctx.lineTo(calibrationLine.start.x, calibrationLine.start.y + perpLength);
      ctx.stroke();

      // Right perpendicular line
        ctx.beginPath();
      ctx.moveTo(calibrationLine.end.x, calibrationLine.start.y - perpLength);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.start.y + perpLength);
      ctx.stroke();

      // Draw pixel distance
      const pixelDistance = Math.abs(calibrationLine.end.x - calibrationLine.start.x);
      const midX = (calibrationLine.start.x + calibrationLine.end.x) / 2;
      const midY = calibrationLine.start.y - 20;

      ctx.fillStyle = 'black';
      ctx.fillRect(midX - 40, midY - 15, 80, 20);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.font = '14px Arial';
      ctx.fillText(`${Math.round(pixelDistance)} px`, midX, midY);
    }
  };

  const handleCalibrate = () => {
    if (measurementValue && calibrationLine.start && calibrationLine.end) {
      const pixelDistance = Math.abs(calibrationLine.end.x - calibrationLine.start.x);
      // Calculate pixels per unit (if 40px = 10 cm, then pixels/unit = 40/10 = 4)
      const pixelsPerUnit = pixelDistance / measurementValue;
      
      const calibrationData = {
        magnification,
        calibrationFactor: pixelsPerUnit, // pixels per unit
        unit: unit, // Use the actual selected unit
        timestamp: new Date().getTime(),
        notes: `${pixelsPerUnit.toFixed(4)} pixels = 1 ${unit}`
      };

      // Save to localStorage
      const existingCalibrations = JSON.parse(localStorage.getItem('calibrations') || '{}');
      existingCalibrations[magnification] = calibrationData;
      localStorage.setItem('calibrations', JSON.stringify(existingCalibrations));
      
      // Update state
      setExistingCalibrations(existingCalibrations);
      setRealScale({ 
        x: pixelsPerUnit,
        y: pixelsPerUnit 
      });

      // Save as current calibration
      localStorage.setItem('currentCalibration', JSON.stringify(calibrationData));
      
      // Dispatch calibration change event
      window.dispatchEvent(new CustomEvent('calibrationChanged', { 
        detail: { calibration: calibrationData } 
      }));
    }
  };

  return (
    <div className="h-screen flex flex-col p-4 bg-gray-50 w-full">
      {/* Header - Enhanced */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 w-full">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">Camera Calibration</h2>
            {selectedExistingCalibration && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                Calibrated
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {selectedExistingCalibration ? 
              `Using ${selectedExistingCalibration.magnification} calibration (${selectedExistingCalibration.calibrationFactor.toFixed(4)} px/μm)` : 
              'Calibrate your microscope camera for precise measurements'}
          </p>
      </div>

        {/* Action Buttons - Redesigned with industry standard colors */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleMeasurementSubmit}
            disabled={!calibrationLine.start || !measurementValue || !canDrawLine}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
              bg-gray-800 text-white hover:bg-gray-900 
              disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Calibrate
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={saveImage}
              disabled={!image}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300
                disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Image
            </button>
            <button
              onClick={handleSaveCalibration}
              disabled={!realScale.x}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300
                disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              Save Calibration
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Horizontal Layout */}
      <div className="flex-1 flex flex-row gap-6 w-full overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 min-w-[320px] max-w-xs flex flex-col gap-3">
          {/* Calibration Type Selection - Enhanced */}
          {!calibrationType && (
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Calibration Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCalibrationType('new')}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-blue-200
                    bg-blue-50 hover:bg-blue-100 transition-all duration-200"
                >
                  <svg className="w-6 h-6 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm font-medium text-blue-700">New</span>
                  <span className="text-xs text-blue-600 mt-1">Create calibration</span>
                </button>
                <button
                  onClick={() => setCalibrationType('existing')}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-green-200
                    bg-green-50 hover:bg-green-100 transition-all duration-200"
                >
                  <svg className="w-6 h-6 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">Existing</span>
                  <span className="text-xs text-green-600 mt-1">Use saved calibration</span>
                </button>
              </div>
            </div>
          )}

          {/* Existing Calibrations List */}
          {calibrationType === 'existing' && (
            <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Calibrations</h3>
              <div className="p-3 space-y-2">
                {Object.entries(existingCalibrations).map(([mag, calibration]) => (
                  <div key={mag} 
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      selectedExistingCalibration?.magnification === mag
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-gray-800">{mag}</h4>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-gray-600">
                            Scale: {calibration.calibrationFactor.toFixed(4)} px/μm
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(calibration.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUseCalibration(calibration)}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                          selectedExistingCalibration?.magnification === mag
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {selectedExistingCalibration?.magnification === mag ? 'In Use' : 'Use'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Calibration Controls - Enhanced */}
      {calibrationType === 'new' && (
              <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">New Calibration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Magnification
                  </label>
                  <input
                    type="text"
              value={magnification}
              onChange={(e) => setMagnification(e.target.value)}
                    placeholder="e.g., 100x"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
          </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Measurement Value
                  </label>
                  <div className="relative">
            <input
              type="number"
              value={measurementValue}
              onChange={(e) => setMeasurementValue(e.target.value)}
                      placeholder={`Enter value`}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-sm text-gray-500">{unit}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Draw a line on the image, then enter its known measurement
                </p>
              </div>
            </div>
          )}

          {/* Calibration Info - Enhanced */}
          {realScale.x > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Current Calibration</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800">Scale Factor:</span>
                  <span className="text-sm font-medium text-blue-900">
                    1px = {(1/realScale.x).toFixed(4)} {unit}
            </span>
          </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800">Resolution:</span>
                  <span className="text-sm font-medium text-blue-900">
                    {(1/realScale.x).toFixed(4)} {unit}/px
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-800">Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✓ Calibrated
                  </span>
                </div>
        </div>
      </div>
      )}
        </div>

        {/* Right Panel - Canvas and Results */}
        <div className="flex-1 flex flex-col gap-3 min-w-0 max-w-full">
          {/* Canvas */}
          <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="w-full h-full max-h-[600px] max-w-full object-contain"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
      </div>

          {/* Results */}
          {(lines.length > 0 || image) && (
            <div className="h-36 flex gap-3 w-full">
              {/* Measurements */}
        {lines.length > 0 && (
                <div className="flex-1 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Measurements</h3>
                  <div className="space-y-2">
              {lines.map((line, index) => (
                      <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Measurement {index + 1}:</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">
                    {line.measurement.toFixed(2)} {line.unit}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                      ({Math.round(line.pixelDistance)} px)
                    </span>
                        </div>
                      </div>
              ))}
                  </div>
          </div>
        )}

              {/* Image Details */}
        {image && (
                <div className="flex-1 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Image Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Resolution:</span>
                      <span className="text-sm font-medium text-gray-900">
                  {originalDimensions.width} × {originalDimensions.height} px
                </span>
              </div>
                    {realScale.x > 0 && (
                <>
                        <div className="flex justify-between">
                          <span>Width:</span>
                          <span>{(originalDimensions.width / realScale.x).toFixed(2)} {unit}</span>
                  </div>
                        <div className="flex justify-between">
                          <span>Height:</span>
                          <span>{(originalDimensions.height / realScale.x).toFixed(2)} {unit}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
          )}
      </div>
      </div>
    </div>
  );
};

export default CameraCalibrate; 