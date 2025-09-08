import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Select, Card, Alert, Typography, Space, Divider } from 'antd';
import { AimOutlined, CalculatorOutlined, SaveOutlined, CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const InlineCalibration = ({ imagePath, onCalibrationComplete, onClose, setCalibrationCallback }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [calibrationPoints, setCalibrationPoints] = useState({ point1: null, point2: null });
  const [pixelDistance, setPixelDistance] = useState(0);
  const [realDistance, setRealDistance] = useState('');
  const [realDistanceUnit, setRealDistanceUnit] = useState('mm');
  const [magnification, setMagnification] = useState('100X');
  const [calibrationRatio, setCalibrationRatio] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mouseCoordinates, setMouseCoordinates] = useState({ x: 0, y: 0 });
  const [horizontalLineY, setHorizontalLineY] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const steps = [
    { title: 'Setup', description: 'Set name, magnification, units' },
    { title: 'Select Points', description: 'Click two points on the scale' },
    { title: 'Enter Length', description: 'Enter actual length' },
    { title: 'Calibrate', description: 'Calculate and save' }
  ];

  // Set up the calibration callback when component mounts
  useEffect(() => {
    if (setCalibrationCallback) {
      setCalibrationCallback({
        onCanvasClick: handleCanvasClick,
        onCanvasMouseMove: handleCanvasMouseMove,
        calibrationPoints,
        currentStep,
        horizontalLineY,
        mouseCoordinates
      });
    }

    // Cleanup function to clear callback when component unmounts
    return () => {
      if (setCalibrationCallback) {
        setCalibrationCallback(null);
      }
    };
  }, [calibrationPoints, currentStep, horizontalLineY, mouseCoordinates, setCalibrationCallback]);

  const handleCanvasClick = (e) => {
    if (currentStep !== 1) return;

    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to the canvas viewport
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the scale factor between canvas internal resolution and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert to canvas coordinates accounting for the scaling
    const x = mouseX * scaleX;
    const y = mouseY * scaleY;

    if (!calibrationPoints.point1) {
      // First point - set the horizontal line Y position
      setCalibrationPoints({ point1: { x, y }, point2: null });
      setHorizontalLineY(y);
    } else if (!calibrationPoints.point2) {
      // Second point - snap to the same Y as the first point
      const snappedY = horizontalLineY;
      const newPoints = { ...calibrationPoints, point2: { x, y: snappedY } };
      setCalibrationPoints(newPoints);
      
      // Calculate pixel distance (only X difference since Y is the same)
      const distance = Math.abs(newPoints.point2.x - newPoints.point1.x);
      setPixelDistance(distance);
      setCurrentStep(2);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = e.target;
    const rect = canvas.getBoundingClientRect();
    
    // Get mouse position relative to the canvas viewport
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the scale factor between canvas internal resolution and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert to canvas coordinates accounting for the scaling
    const x = mouseX * scaleX;
    const y = mouseY * scaleY;
    
    // If we have a horizontal line, snap the Y coordinate to it
    const snappedY = horizontalLineY !== null ? horizontalLineY : y;
    setMouseCoordinates({ x, y: snappedY });
  };

  const calculateCalibrationRatio = () => {
    if (pixelDistance > 0 && realDistance) {
      const ratio = parseFloat(realDistance) / pixelDistance;
      setCalibrationRatio(ratio);
      return ratio;
    }
    return 0;
  };

  const handleCalibrate = () => {
    if (pixelDistance > 0 && realDistance) {
      const ratio = calculateCalibrationRatio();
      setShowResults(true);
      setCurrentStep(3);
    }
  };

  const handleRealDistanceChange = (e) => {
    const value = e.target.value;
    setRealDistance(value);
    if (value && pixelDistance > 0) {
      calculateCalibrationRatio();
    }
  };

  const handleSaveCalibration = async () => {
    if (!calibrationRatio || !magnification) return;

    const calibrationData = {
      magnification: `${magnification}x`,
      pixelDistance,
      realDistance: parseFloat(realDistance),
      unit: realDistanceUnit,
      calibrationRatio,
      timestamp: new Date().toISOString(),
      imagePath: imagePath,
      name: `${magnification} Calibration`,
      points: {
        point1: {
          x: calibrationPoints.point1.x,
          y: calibrationPoints.point1.y
        },
        point2: {
          x: calibrationPoints.point2.x,
          y: calibrationPoints.point2.y
        }
      },
      coordinates: {
        point1X: calibrationPoints.point1.x,
        point1Y: calibrationPoints.point1.y,
        point2X: calibrationPoints.point2.x,
        point2Y: calibrationPoints.point2.y
      }
    };

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/save-calibration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calibrationData }),
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        // Save to localStorage for immediate use
        const existingCalibrations = JSON.parse(localStorage.getItem('calibrations') || '{}');
        existingCalibrations[`${magnification}x`] = calibrationData;
        localStorage.setItem('calibrations', JSON.stringify(existingCalibrations));
        localStorage.setItem('currentCalibration', JSON.stringify(calibrationData));
        
        if (onCalibrationComplete) {
          onCalibrationComplete(calibrationData);
        }
        
        // Clear calibration callback immediately
        if (setCalibrationCallback) {
          setCalibrationCallback(null);
        }
        
        // Reset and close
        resetCalibration();
        if (onClose) onClose();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving calibration:', error);
      alert('Failed to save calibration: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCalibration = () => {
    setCalibrationPoints({ point1: null, point2: null });
    setPixelDistance(0);
    setRealDistance('');
    setCalibrationRatio(0);
    setCurrentStep(0);
    setHorizontalLineY(null);
    setShowResults(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Title level={5} className="mb-4">Calibration Setup</Title>
            </div>

            <div className="space-y-3">
              <div>
                <Text strong className="text-sm">Magnification <span className="text-red-500">*</span></Text>
                <Input
                  value={magnification.replace('X', '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
                    setMagnification(value + 'X');
                  }}
                  placeholder="100"
                  size="small"
                  style={{ width: '100%' }}
                  suffix="X"
                />
              </div>


              <div>
                <Text strong className="text-sm">Unit</Text>
                <div className="flex space-x-2 mt-1">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="unit"
                      value="mm"
                      checked={realDistanceUnit === 'mm'}
                      onChange={(e) => setRealDistanceUnit(e.target.value)}
                      className="mr-1"
                    />
                    <Text className="text-xs">mm</Text>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="unit"
                      value="cm"
                      checked={realDistanceUnit === 'cm'}
                      onChange={(e) => setRealDistanceUnit(e.target.value)}
                      className="mr-1"
                    />
                    <Text className="text-xs">cm</Text>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="unit"
                      value="inch"
                      checked={realDistanceUnit === 'inch'}
                      onChange={(e) => setRealDistanceUnit(e.target.value)}
                      className="mr-1"
                    />
                    <Text className="text-xs">inch</Text>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="unit"
                      value="microns"
                      checked={realDistanceUnit === 'microns'}
                      onChange={(e) => setRealDistanceUnit(e.target.value)}
                      className="mr-1"
                    />
                    <Text className="text-xs">microns</Text>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={onClose} size="small">
                Cancel
              </Button>
              <Button 
                type="primary" 
                onClick={() => setCurrentStep(1)}
                disabled={!magnification}
                size="small"
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <AimOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
              <Title level={5} className="mb-2">Select Two Points</Title>
              <Paragraph className="text-sm text-gray-600 mb-4">
                Click on two points on the calibration scale along a horizontal line.
              </Paragraph>
            </div>

            <Alert
              message="Instructions"
              description="Click on two distinct points on the scale along a horizontal line (180°). The first click sets the horizontal line, the second click will snap to the same Y position."
              type="info"
              showIcon
              size="small"
            />

            <div className="bg-gray-50 p-3 rounded">
              <div className="text-center space-y-1">
                <Text strong className="text-sm">Points selected: {calibrationPoints.point1 ? '1' : '0'} / 2</Text>
                {horizontalLineY !== null && (
                  <div className="text-xs text-blue-600">
                    Horizontal line set at Y: {horizontalLineY.toFixed(1)} px
                  </div>
                )}
                {calibrationPoints.point1 && (
                  <div className="text-xs text-gray-600">
                    P1: ({calibrationPoints.point1.x.toFixed(1)}, {calibrationPoints.point1.y.toFixed(1)})
                  </div>
                )}
                {calibrationPoints.point2 && (
                  <div className="text-xs text-gray-600">
                    P2: ({calibrationPoints.point2.x.toFixed(1)}, {calibrationPoints.point2.y.toFixed(1)})
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <Text className="text-xs text-gray-500">
                Mouse: ({mouseCoordinates.x.toFixed(0)}, {mouseCoordinates.y.toFixed(0)}) px
              </Text>
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setCurrentStep(0)} size="small">
                Back
              </Button>
              <Button onClick={resetCalibration} disabled={!calibrationPoints.point1} size="small">
                Reset Points
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CalculatorOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
              <Title level={5} className="mb-2">Enter Actual Length</Title>
            </div>

            {/* Point Coordinates */}
            <div className="bg-gray-50 p-3 rounded">
              <Text strong className="text-sm">Selected Points:</Text>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>
                  <Text strong>Point 1:</Text>
                  <div className="text-gray-600">
                    X: {calibrationPoints.point1?.x.toFixed(1)} px<br/>
                    Y: {calibrationPoints.point1?.y.toFixed(1)} px
                  </div>
                </div>
                <div>
                  <Text strong>Point 2:</Text>
                  <div className="text-gray-600">
                    X: {calibrationPoints.point2?.x.toFixed(1)} px<br/>
                    Y: {calibrationPoints.point2?.y.toFixed(1)} px
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Text strong className="text-sm">Length</Text>
                <Input
                  type="number"
                  value={realDistance}
                  onChange={handleRealDistanceChange}
                  placeholder="Enter actual length"
                  size="small"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <Text strong className="text-sm">Pixels</Text>
                <Input
                  value={pixelDistance.toFixed(2)}
                  disabled
                  size="small"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setCurrentStep(1)} size="small">
                Back
              </Button>
              <Button 
                type="primary" 
                onClick={handleCalibrate}
                disabled={!realDistance}
                size="small"
              >
                Calibrate
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
              <Title level={5} className="mb-2">Calibration Results</Title>
            </div>

            <div className="bg-gray-50 p-3 rounded space-y-2">
              <div className="flex justify-between items-center">
                <Text strong className="text-sm">X Axis:</Text>
                <div className="flex items-center space-x-2">
                  <Input
                    value={calibrationRatio.toFixed(11)}
                    disabled
                    size="small"
                    style={{ width: 140 }}
                  />
                  <Text className="text-xs">Microns/pixel</Text>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Text strong className="text-sm">Y Axis:</Text>
                <div className="flex items-center space-x-2">
                  <Input
                    value={calibrationRatio.toFixed(11)}
                    disabled
                    size="small"
                    style={{ width: 140 }}
                  />
                  <Text className="text-xs">Microns/pixel</Text>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded">
              <Text strong className="text-sm text-blue-800">Calibration Details:</Text>
              <div className="mt-2 text-xs text-blue-700 space-y-1">
                <div>Name: {magnification} Calibration</div>
                <div>Magnification: {magnification}</div>
                <div>Unit: {realDistanceUnit}</div>
                <div>Pixel Distance: {pixelDistance.toFixed(2)} px</div>
                <div>Real Distance: {realDistance} {realDistanceUnit}</div>
                <div>Ratio: {calibrationRatio.toFixed(11)} {realDistanceUnit}/pixel</div>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setCurrentStep(2)} size="small">
                Back
              </Button>
              <Button 
                type="primary" 
                onClick={handleSaveCalibration}
                loading={isLoading}
                size="small"
              >
                Save Calibration
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <AimOutlined style={{ color: '#1890ff' }} />
          <Title level={5} className="mb-0">Calibration</Title>
        </div>
        <Button 
          type="text" 
          size="small" 
          icon={<ArrowLeftOutlined />}
          onClick={onClose}
        />
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-2 border-b">
        <div className="flex justify-between text-xs">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`text-center ${index <= currentStep ? 'text-blue-600' : 'text-gray-400'}`}
            >
              <div className={`w-6 h-6 rounded-full mx-auto mb-1 flex items-center justify-center text-xs ${
                index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                {index + 1}
              </div>
              <div className="text-xs">{step.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default InlineCalibration;