import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Select, Card, Alert, Steps, Typography, Space, Divider } from 'antd';
import { AimOutlined, CalculatorOutlined, SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const EnhancedCalibration = ({ imagePath, onClose, onCalibrationComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [calibrationPoints, setCalibrationPoints] = useState({ point1: null, point2: null });
  const [pixelDistance, setPixelDistance] = useState(0);
  const [realDistance, setRealDistance] = useState('');
  const [realDistanceUnit, setRealDistanceUnit] = useState('microns');
  const [magnification, setMagnification] = useState('100x');
  const [calibrationRatio, setCalibrationRatio] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [savedCalibrations, setSavedCalibrations] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [mouseCoordinates, setMouseCoordinates] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const steps = [
    {
      title: 'Load Image',
      description: 'Load calibration image with scale',
      icon: <AimOutlined />
    },
    {
      title: 'Select Points',
      description: 'Click two points on the scale',
      icon: <AimOutlined />
    },
    {
      title: 'Enter Distance',
      description: 'Enter real-world distance',
      icon: <CalculatorOutlined />
    },
    {
      title: 'Save Calibration',
      description: 'Save calibration for magnification',
      icon: <SaveOutlined />
    }
  ];

  // Load image when component mounts or imagePath changes
  useEffect(() => {
    if (imagePath) {
      loadImage();
    }
  }, [imagePath]);

  const loadImage = async () => {
    try {
      setIsLoading(true);
      const formattedPath = imagePath.replace(/\\/g, '/');
      const response = await fetch(`http://localhost:5000/api/get-image?path=${encodeURIComponent(formattedPath)}`);
      
      if (!response.ok) throw new Error('Failed to load image');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setImageUrl(url);

      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setCurrentStep(1);
        setIsLoading(false);
      };
      img.src = url;
    } catch (error) {
      console.error('Error loading image:', error);
      setIsLoading(false);
    }
  };

  const handleCanvasClick = (e) => {
    if (currentStep !== 1) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (!calibrationPoints.point1) {
      setCalibrationPoints({ point1: { x, y }, point2: null });
      setCurrentPoint({ x, y });
    } else if (!calibrationPoints.point2) {
      const newPoints = { ...calibrationPoints, point2: { x, y } };
      setCalibrationPoints(newPoints);
      setCurrentPoint(null);
      
      // Calculate pixel distance
      const distance = Math.sqrt(
        Math.pow(newPoints.point2.x - newPoints.point1.x, 2) + 
        Math.pow(newPoints.point2.y - newPoints.point1.y, 2)
      );
      setPixelDistance(distance);
      setCurrentStep(2);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setMouseCoordinates({ x, y });
  };

  const calculateCalibrationRatio = () => {
    if (pixelDistance > 0 && realDistance) {
      const ratio = parseFloat(realDistance) / pixelDistance;
      setCalibrationRatio(ratio);
      return ratio;
    }
    return 0;
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
      magnification,
      pixelDistance,
      realDistance: parseFloat(realDistance),
      unit: realDistanceUnit,
      calibrationRatio,
      timestamp: new Date().toISOString(),
      imagePath: imagePath,
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
        existingCalibrations[magnification] = calibrationData;
        localStorage.setItem('calibrations', JSON.stringify(existingCalibrations));
        localStorage.setItem('currentCalibration', JSON.stringify(calibrationData));
        
        setCurrentStep(3);
        if (onCalibrationComplete) {
          onCalibrationComplete(calibrationData);
        }
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
    setCurrentPoint(null);
    setCurrentStep(1);
  };

  const drawCalibrationPoints = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw calibration points
    if (calibrationPoints.point1) {
      ctx.fillStyle = '#ff4d4f';
      ctx.beginPath();
      ctx.arc(calibrationPoints.point1.x, calibrationPoints.point1.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label point 1
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('P1', calibrationPoints.point1.x, calibrationPoints.point1.y - 15);
      
      // Show coordinates for point 1
      ctx.font = '10px Arial';
      ctx.fillText(`(${calibrationPoints.point1.x.toFixed(0)}, ${calibrationPoints.point1.y.toFixed(0)})`, 
                   calibrationPoints.point1.x, calibrationPoints.point1.y + 25);
    }

    if (calibrationPoints.point2) {
      ctx.fillStyle = '#ff4d4f';
      ctx.beginPath();
      ctx.arc(calibrationPoints.point2.x, calibrationPoints.point2.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Label point 2
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('P2', calibrationPoints.point2.x, calibrationPoints.point2.y - 15);
      
      // Show coordinates for point 2
      ctx.font = '10px Arial';
      ctx.fillText(`(${calibrationPoints.point2.x.toFixed(0)}, ${calibrationPoints.point2.y.toFixed(0)})`, 
                   calibrationPoints.point2.x, calibrationPoints.point2.y + 25);

      // Draw line between points
      ctx.strokeStyle = '#ff4d4f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(calibrationPoints.point1.x, calibrationPoints.point1.y);
      ctx.lineTo(calibrationPoints.point2.x, calibrationPoints.point2.y);
      ctx.stroke();

      // Draw measurement line
      const midX = (calibrationPoints.point1.x + calibrationPoints.point2.x) / 2;
      const midY = (calibrationPoints.point1.y + calibrationPoints.point2.y) / 2;
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${pixelDistance.toFixed(1)} px`, midX, midY - 10);
    }

    // Draw current point being placed
    if (currentPoint) {
      ctx.fillStyle = '#52c41a';
      ctx.beginPath();
      ctx.arc(currentPoint.x, currentPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  useEffect(() => {
    drawCalibrationPoints();
  }, [calibrationPoints, currentPoint, pixelDistance]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <Title level={3}>📌 Calibration Setup</Title>
            <Paragraph>
              Load a calibration image with a known scale (stage micrometer) to establish 
              the relationship between pixels and real-world measurements.
            </Paragraph>
            {isLoading && <div>Loading image...</div>}
          </div>
        );

      case 1:
        return (
          <div>
            <Title level={4}>Step 1: Select Two Points on the Scale</Title>
            <Paragraph>
              Click on two points on the calibration scale. The system will measure 
              the pixel distance between them.
            </Paragraph>
            <Alert
              message="Instructions"
              description="Click on two distinct points on the scale. The first click will place point P1, the second click will place point P2."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div className="text-center space-y-2">
              <Text strong>Points selected: {calibrationPoints.point1 ? '1' : '0'} / 2</Text>
              {calibrationPoints.point1 && (
                <div className="text-sm text-gray-600">
                  P1: ({calibrationPoints.point1.x.toFixed(1)}, {calibrationPoints.point1.y.toFixed(1)})
                </div>
              )}
              {calibrationPoints.point2 && (
                <div className="text-sm text-gray-600">
                  P2: ({calibrationPoints.point2.x.toFixed(1)}, {calibrationPoints.point2.y.toFixed(1)})
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <Title level={4}>Step 2: Enter Real-World Distance</Title>
            <Paragraph>
              Enter the actual distance between the two points you selected, 
              as indicated on the calibration scale.
            </Paragraph>
            
            <div className="space-y-4">
              {/* Point Coordinates */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <Title level={5}>Selected Points:</Title>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Text strong>Point 1 (P1):</Text>
                    <div className="text-sm text-gray-600">
                      X: {calibrationPoints.point1?.x.toFixed(1)} px<br/>
                      Y: {calibrationPoints.point1?.y.toFixed(1)} px
                    </div>
                  </div>
                  <div>
                    <Text strong>Point 2 (P2):</Text>
                    <div className="text-sm text-gray-600">
                      X: {calibrationPoints.point2?.x.toFixed(1)} px<br/>
                      Y: {calibrationPoints.point2?.y.toFixed(1)} px
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Text strong>Pixel Distance: </Text>
                <Text code>{pixelDistance.toFixed(2)} pixels</Text>
              </div>
              
              <div className="flex items-center space-x-4">
                <Text strong>Real Distance:</Text>
                <Input
                  type="number"
                  value={realDistance}
                  onChange={handleRealDistanceChange}
                  placeholder="Enter distance"
                  style={{ width: 120 }}
                />
                <Select
                  value={realDistanceUnit}
                  onChange={setRealDistanceUnit}
                  style={{ width: 100 }}
                >
                  <Option value="microns">µm</Option>
                  <Option value="mm">mm</Option>
                  <Option value="cm">cm</Option>
                </Select>
              </div>

              {calibrationRatio > 0 && (
                <Alert
                  message={`Calibration Ratio: ${calibrationRatio.toFixed(4)} ${realDistanceUnit}/pixel`}
                  description={`This means each pixel represents ${calibrationRatio.toFixed(4)} ${realDistanceUnit} in real-world measurements.`}
                  type="success"
                  showIcon
                />
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <Title level={3} style={{ color: '#52c41a' }}>Calibration Complete!</Title>
            <Paragraph>
              Your calibration has been saved for {magnification} magnification.
            </Paragraph>
            <div className="bg-gray-50 p-4 rounded-lg text-left">
              <Text strong>Calibration Details:</Text>
              <div className="mt-2 space-y-1">
                <div>Magnification: {magnification}</div>
                <div>Pixel Distance: {pixelDistance.toFixed(2)} px</div>
                <div>Real Distance: {realDistance} {realDistanceUnit}</div>
                <div>Ratio: {calibrationRatio.toFixed(4)} {realDistanceUnit}/pixel</div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Text strong>Point Coordinates:</Text>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Text strong>Point 1:</Text>
                    <div>X: {calibrationPoints.point1?.x.toFixed(1)} px</div>
                    <div>Y: {calibrationPoints.point1?.y.toFixed(1)} px</div>
                  </div>
                  <div>
                    <Text strong>Point 2:</Text>
                    <div>X: {calibrationPoints.point2?.x.toFixed(1)} px</div>
                    <div>Y: {calibrationPoints.point2?.y.toFixed(1)} px</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <Title level={3} className="mb-0">Microscope Calibration</Title>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>

        <div className="p-6">
          <Steps current={currentStep} items={steps} className="mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Display */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Title level={5} className="mb-0">Calibration Image</Title>
                {currentStep === 1 && (
                  <div className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    Mouse: ({mouseCoordinates.x.toFixed(0)}, {mouseCoordinates.y.toFixed(0)}) px
                  </div>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden bg-gray-100" style={{ height: '400px' }}>
                {imageUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt="Calibration Image"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 cursor-crosshair"
                      width={imageDimensions.width}
                      height={imageDimensions.height}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                      onClick={handleCanvasClick}
                      onMouseMove={handleCanvasMouseMove}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No image loaded
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div>
              <Title level={5}>Calibration Controls</Title>
              {renderStepContent()}

              <Divider />

              <div className="space-y-4">
                {currentStep === 1 && (
                  <div className="flex space-x-2">
                    <Button onClick={resetCalibration} disabled={!calibrationPoints.point1}>
                      Reset Points
                    </Button>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Text strong>Magnification:</Text>
                      <Select
                        value={magnification}
                        onChange={setMagnification}
                        style={{ width: '100%', marginTop: 8 }}
                      >
                        <Option value="10x">10x</Option>
                        <Option value="20x">20x</Option>
                        <Option value="40x">40x</Option>
                        <Option value="50x">50x</Option>
                        <Option value="100x">100x</Option>
                        <Option value="200x">200x</Option>
                        <Option value="400x">400x</Option>
                        <Option value="1000x">1000x</Option>
                      </Select>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={resetCalibration}>
                        Reset
                      </Button>
                      <Button 
                        type="primary" 
                        onClick={handleSaveCalibration}
                        disabled={!calibrationRatio || !realDistance}
                        loading={isLoading}
                      >
                        Save Calibration
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="flex space-x-2">
                    <Button onClick={resetCalibration}>
                      New Calibration
                    </Button>
                    <Button type="primary" onClick={onClose}>
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCalibration;
