import React, { useState, useEffect, useRef } from 'react';
import { Button, Select, Input, Slider, Switch, Space, message, Table, Tabs, Card, Divider, Typography, Upload } from 'antd';
import { DownOutlined, PlusOutlined, SaveOutlined, SettingOutlined, ArrowLeftOutlined, UploadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title } = Typography;

// Simple Image Icon component
const ImageIcon = () => (
    <svg 
        viewBox="0 0 24 24" 
        width="24" 
        height="24" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
    </svg>
);

const PhaseSegmentation = ({ imagePath, imageUrl, onClose }) => {
    const navigate = useNavigate();
    const [method, setMethod] = useState('area_fraction'); // 'area_fraction' or 'point_count'
    const [currentConfig, setCurrentConfig] = useState('');
    const [configurations, setConfigurations] = useState({});
    const [currentPhase, setCurrentPhase] = useState(null);
    const [configName, setConfigName] = useState('');
    const [phases, setPhases] = useState([]);
    const [detectionMode, setDetectionMode] = useState('auto'); // 'auto' or 'manual'
    const [boundaries, setBoundaries] = useState([]);
    const [minIntensity, setMinIntensity] = useState(0);
    const [maxIntensity, setMaxIntensity] = useState(255);
    const [results, setResults] = useState([]);
    const [summaryResults, setSummaryResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [displayUrl, setDisplayUrl] = useState(null);
    const [selectedRange, setSelectedRange] = useState({ start: 0, end: 255 });
    const [imageData, setImageData] = useState(null);
    const canvasRef = useRef(null);
    const graphCanvasRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragHandleRef = useRef(null); // 'start' or 'end'
    const rgbHistogramRef = useRef(null);

    // Shape filter states
    const [shapeFilters, setShapeFilters] = useState({
        circularity: { enabled: false, start: 0, end: 1 },
        length: { enabled: false, min: 0, max: 100 },
        width: { enabled: false, min: 0, max: 100 }
    });

    const [histogramData, setHistogramData] = useState(null);
    const imageRef = useRef(null);
    const [imageScale, setImageScale] = useState(1);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [uploadedImage, setUploadedImage] = useState(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
    const [selectedColor, setSelectedColor] = useState('#ff0000');

    useEffect(() => {
        console.log('PhaseSegmentation: Component mounted with props:', {
            imagePath,
            imageUrl,
            hasImagePath: !!imagePath,
            hasImageUrl: !!imageUrl,
            imagePathType: typeof imagePath,
            imageUrlType: typeof imageUrl
        });
        
        // Check if we have any image data
        if (!imagePath && !imageUrl && !uploadedImageUrl) {
            console.log('PhaseSegmentation: No image data provided');
            setError('No image selected. Please select an image in the main application or upload an image.');
            setDisplayUrl(null);
            return;
        }
        
        // Determine the correct URL to use
        let finalUrl = null;
        
        if (uploadedImageUrl) {
            // Use uploaded image
            console.log('PhaseSegmentation: Using uploaded image URL:', uploadedImageUrl);
            finalUrl = uploadedImageUrl;
        } else if (imageUrl) {
            // Check if imageUrl is already a proper HTTP URL
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                console.log('PhaseSegmentation: Using provided HTTP imageUrl:', imageUrl);
                finalUrl = imageUrl;
            } else {
                // imageUrl is a file path, construct HTTP URL
                console.log('PhaseSegmentation: imageUrl is a file path, constructing HTTP URL from imagePath:', imagePath);
                if (imagePath) {
                    finalUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
                }
            }
        } else if (imagePath) {
            // No imageUrl provided, construct from imagePath
            console.log('PhaseSegmentation: No imageUrl, constructing from imagePath:', imagePath);
            finalUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
        }
        
        console.log('PhaseSegmentation: Final URL to use:', finalUrl);
        setDisplayUrl(finalUrl);
        
        fetchConfigurations();
        
        // Test backend connectivity
        fetch('http://localhost:5000/api/health', { method: 'GET' })
            .then(response => {
                console.log('PhaseSegmentation: Backend connectivity test:', response.status);
                if (!response.ok) {
                    console.error('PhaseSegmentation: Backend not responding properly');
                }
            })
            .catch(error => {
                console.error('PhaseSegmentation: Backend connectivity test failed:', error);
                setError('Backend server not accessible. Please ensure the camera server is running.');
            });
    }, [imageUrl, imagePath, uploadedImageUrl]);

    useEffect(() => {
        if (displayUrl) {
            console.log('PhaseSegmentation: Loading image from displayUrl:', displayUrl);
            loadImage(displayUrl);
        }
    }, [displayUrl]);

    useEffect(() => {
        if (!imageData || !rgbHistogramRef.current) return;

        // Calculate histograms
        const rHist = new Array(256).fill(0);
        const gHist = new Array(256).fill(0);
        const bHist = new Array(256).fill(0);

        for (let i = 0; i < imageData.data.length; i += 4) {
            rHist[imageData.data[i]]++;
            gHist[imageData.data[i + 1]]++;
            bHist[imageData.data[i + 2]]++;
        }

        // Normalize
        const max = Math.max(...rHist, ...gHist, ...bHist);

        // Draw
        const canvas = rgbHistogramRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const drawLine = (hist, color) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            for (let x = 0; x < 256; x++) {
                const y = canvas.height - (hist[x] / max) * canvas.height;
                if (x === 0) ctx.moveTo(x * (canvas.width / 256), y);
                else ctx.lineTo(x * (canvas.width / 256), y);
            }
            ctx.stroke();
        };

        drawLine(rHist, 'red');
        drawLine(gHist, 'green');
        drawLine(bHist, 'blue');
    }, [imageData]);

    const fetchConfigurations = async () => {
        try {
            const response = await axios.get('/api/phase/get-configurations');
            if (response.data.status === 'success') {
                setConfigurations(response.data.configurations || {});
            }
        } catch (error) {
            message.error('Failed to load configurations');
        }
    };

    const handleNewPhase = () => {
        setCurrentPhase({
            name: '',
            detectionMode: detectionMode,
            intensityRange: { min: minIntensity, max: maxIntensity },
            boundaries: [],
            shapeFilters: { ...shapeFilters }
        });
    };

    const handlePhaseNameChange = (name) => {
        setCurrentPhase(prev => ({ ...prev, name }));
    };

    // Remove color mode and color range logic

    const handleDetectionModeChange = (mode) => {
        setDetectionMode(mode);
        setCurrentPhase(prev => ({ ...prev, detectionMode: mode }));
    };

    // Remove color range change logic

    const handleShapeFilterChange = (type, values) => {
        setShapeFilters(prev => ({
            ...prev,
            [type]: { ...prev[type], ...values }
        }));
        
        setCurrentPhase(prev => ({
            ...prev,
            shapeFilters: {
                ...prev.shapeFilters,
                [type]: { ...prev.shapeFilters[type], ...values }
            }
        }));
    };

    const handleSavePhase = async () => {
        console.log('PhaseSegmentation: handleSavePhase called');
        console.log('PhaseSegmentation: currentPhase:', currentPhase);
        
        if (!currentPhase?.name) {
            message.error('Please enter a phase name');
            return;
        }

        // Just save the phase to the phases list without analyzing
        const newPhases = [...phases, currentPhase];
        setPhases(newPhases);
        message.success('Phase added successfully');
        setCurrentPhase(null);
    };

    const handleAnalyzePhases = async () => {
        console.log('PhaseSegmentation: handleAnalyzePhases called');
        
        if (phases.length === 0) {
            message.error('Please add at least one phase before analyzing');
            return;
        }

        if (!imagePath && !uploadedImage) {
            message.error('Please select an image first or upload an image');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let requestData = {
                configuration: { phases: phases },
                min_intensity: minIntensity,
                max_intensity: maxIntensity
            };

            if (uploadedImage) {
                // Handle uploaded image
                const formData = new FormData();
                formData.append('image', uploadedImage);
                formData.append('configuration', JSON.stringify(requestData.configuration));
                formData.append('min_intensity', minIntensity);
                formData.append('max_intensity', maxIntensity);

                const response = await axios.post('/api/phase/analyze-upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                if (response.data.status === 'success') {
                    const newResults = phases.map(phase => ({
                        ...phase,
                        result: response.data.results[phase.name]?.percentage || 0
                    }));
                    setResults(newResults);
                    message.success('Phase analysis completed successfully');
                } else {
                    message.error('Failed to analyze phases: ' + (response.data.message || 'Unknown error'));
                }
            } else {
                // Handle image from path
                requestData.image_path = imagePath;
                const response = await axios.post('/api/phase/analyze', requestData);

                if (response.data.status === 'success') {
                    const newResults = phases.map(phase => ({
                        ...phase,
                        result: response.data.results[phase.name]?.percentage || 0
                    }));
                    setResults(newResults);
                    message.success('Phase analysis completed successfully');
                } else {
                    message.error('Failed to analyze phases: ' + (response.data.message || 'Unknown error'));
                }
            }
        } catch (error) {
            console.error('PhaseSegmentation: Analysis error:', error);
            setError(error.response?.data?.message || 'Failed to analyze phases');
            message.error('Failed to analyze phases');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfiguration = async () => {
        console.log('PhaseSegmentation: handleSaveConfiguration called');
        console.log('PhaseSegmentation: configName:', configName);
        console.log('PhaseSegmentation: phases:', phases);
        console.log('PhaseSegmentation: method:', method);
        
        if (!configName.trim()) {
            message.error('Please enter a configuration name');
            return;
        }
        
        if (phases.length === 0) {
            message.error('Please add at least one phase before saving configuration');
            return;
        }
        
        try {
            console.log('PhaseSegmentation: Sending save configuration request');
            const response = await axios.post('/api/phase/save-configuration', {
                name: configName.trim(),
                configuration: {
                    method,
                    phases
                }
            });
            
            console.log('PhaseSegmentation: Save configuration response:', response.data);
            
            if (response.data.status === 'success') {
                message.success('Configuration saved successfully');
                setConfigName(''); // Clear the input
                fetchConfigurations();
            } else {
                message.error('Failed to save configuration: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('PhaseSegmentation: Save configuration error:', error);
            console.error('PhaseSegmentation: Error response:', error.response?.data);
            message.error('Failed to save configuration: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleApplyConfiguration = async (configName) => {
        try {
            const response = await axios.post('/api/phase/apply-configuration', {
                name: configName
            });
            
            if (response.data.status === 'success') {
                const config = response.data.configuration;
                setMethod(config.method);
                setPhases(config.phases);
                
                // Re-analyze with loaded configuration
                const analysisResponse = await axios.post('/api/phase/analyze', {
                    image_path: imagePath,
                    configuration: {
                        phases: config.phases
                    }
                });

                if (analysisResponse.data.status === 'success') {
                    setResults(
                        config.phases.map(phase => ({
                            ...phase,
                            result: analysisResponse.data.results[phase.name].percentage
                        }))
                    );
                }
            }
        } catch (error) {
            message.error('Failed to apply configuration');
        }
    };

    const handleAddToSummary = () => {
        setSummaryResults(prev => [...prev, ...results]);
    };

    const loadImage = (url) => {
        console.log('PhaseSegmentation: loadImage called with URL:', url);
        
        // Test if the URL is accessible
        fetch(url, { method: 'HEAD' })
            .then(response => {
                console.log('PhaseSegmentation: URL accessibility test:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            })
            .catch(error => {
                console.error('PhaseSegmentation: URL accessibility test failed:', error);
                setError(`Image URL not accessible: ${error.message}`);
                return;
            });
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
            console.log('PhaseSegmentation: Image loaded successfully:', { width: img.naturalWidth, height: img.naturalHeight });
            setError(null); // Clear any previous errors
            
            // Create canvas for image processing
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Get image data for processing
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setImageData(imgData);

            // Generate and draw intensity graph
            generateIntensityGraph(imgData);

            // Set up canvas for displaying processed image
            if (canvasRef.current) {
                const displayCtx = canvasRef.current.getContext('2d');
                canvasRef.current.width = img.naturalWidth;
                canvasRef.current.height = img.naturalHeight;
                displayCtx.drawImage(img, 0, 0);
            }

            // Update image dimensions
            setImageDimensions({
                width: img.naturalWidth,
                height: img.naturalHeight
            });

            // Calculate appropriate scale
            const maxWidth = 800;
            const maxHeight = 600;
            let scale = 1;
            
            if (img.naturalWidth > maxWidth || img.naturalHeight > maxHeight) {
                const widthScale = maxWidth / img.naturalWidth;
                const heightScale = maxHeight / img.naturalHeight;
                scale = Math.min(widthScale, heightScale);
            }
            
            setImageScale(scale);
        };

        img.onerror = (error) => {
            console.error('PhaseSegmentation: Error loading image:', error);
            console.error('PhaseSegmentation: Failed URL:', url);
            setError(`Failed to load image from: ${url}`);
        };

        img.src = url;
    };

    const generateIntensityGraph = (imgData) => {
        const data = imgData.data;
        const intensities = new Array(256).fill(0);

        // Calculate intensity values
        for (let i = 0; i < data.length; i += 4) {
            const intensity = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
            intensities[intensity]++;
        }

        drawGraph(intensities);
    };

    const drawGraph = (intensities) => {
        const canvas = graphCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const maxIntensity = Math.max(...intensities);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, width, height);

        // Draw graph line
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        for (let i = 0; i < intensities.length; i++) {
            const x = (i / 255) * width;
            const y = height - (intensities[i] / maxIntensity) * height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw selected range
        const startX = (selectedRange.start / 255) * width;
        const endX = (selectedRange.end / 255) * width;

        // Draw selected range background
        ctx.fillStyle = `${selectedColor}40`;
        ctx.fillRect(startX, 0, endX - startX, height);

        // Draw handles
        drawHandle(ctx, startX, height, 'start');
        drawHandle(ctx, endX, height, 'end');
    };

    const drawHandle = (ctx, x, height, type) => {
        ctx.fillStyle = selectedColor;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        // Draw handle line
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw handle grip
        ctx.beginPath();
        ctx.arc(x, height - 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    };

    const handleMouseDown = (e) => {
        const canvas = graphCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = canvas.width;

        // Check if click is near handles
        const startX = (selectedRange.start / 255) * width;
        const endX = (selectedRange.end / 255) * width;
        const threshold = 10;

        if (Math.abs(x - startX) < threshold) {
            isDraggingRef.current = true;
            dragHandleRef.current = 'start';
        } else if (Math.abs(x - endX) < threshold) {
            isDraggingRef.current = true;
            dragHandleRef.current = 'end';
        }

        dragStartXRef.current = x;
    };

    const handleMouseMove = (e) => {
        if (!isDraggingRef.current) return;

        const canvas = graphCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = canvas.width;

        const newValue = Math.max(0, Math.min(255, Math.round((x / width) * 255)));

        if (dragHandleRef.current === 'start') {
            if (newValue < selectedRange.end) {
                setSelectedRange(prev => ({ ...prev, start: newValue }));
            }
        } else {
            if (newValue > selectedRange.start) {
                setSelectedRange(prev => ({ ...prev, end: newValue }));
            }
        }

        if (imageData) {
            applyColorHighlight();
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        dragHandleRef.current = null;
    };

    const applyColorHighlight = () => {
        if (!imageData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const newImageData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );

        for (let i = 0; i < newImageData.data.length; i += 4) {
            const intensity = Math.round(
                (newImageData.data[i] + newImageData.data[i + 1] + newImageData.data[i + 2]) / 3
            );

            if (intensity >= selectedRange.start && intensity <= selectedRange.end) {
                // Convert selected color to RGB
                const r = parseInt(selectedColor.slice(1, 3), 16);
                const g = parseInt(selectedColor.slice(3, 5), 16);
                const b = parseInt(selectedColor.slice(5, 7), 16);

                // Apply selected color with some transparency
                newImageData.data[i] = r;
                newImageData.data[i + 1] = g;
                newImageData.data[i + 2] = b;
                newImageData.data[i + 3] = 200; // Some transparency
            }
        }

        ctx.putImageData(newImageData, 0, 0);
    };

    const columns = [
        {
            title: '#',
            dataIndex: 'index',
            key: 'index',
            render: (_, __, index) => index + 1
        },
        {
            title: 'Color',
            dataIndex: 'color',
            key: 'color',
            render: color => (
                <div
                    style={{
                        width: 20,
                        height: 20,
                        backgroundColor: color,
                        border: '1px solid #d9d9d9'
                    }}
                />
            )
        },
        {
            title: 'Element',
            dataIndex: 'name',
            key: 'name'
        },
        {
            title: 'Area',
            dataIndex: 'result',
            key: 'result',
            render: value => `${value?.toFixed(2)}%`
        }
    ];

    // Add image load handler
    const handleImageLoad = () => {
        console.log('PhaseSegmentation: handleImageLoad called');
        if (imageRef.current) {
            const { naturalWidth, naturalHeight } = imageRef.current;
            console.log('PhaseSegmentation: Image dimensions:', { naturalWidth, naturalHeight });
            
            const maxWidth = 800;
            const maxHeight = 600;
            
            let scale = 1;
            if (naturalWidth > maxWidth || naturalHeight > maxHeight) {
                const widthScale = maxWidth / naturalWidth;
                const heightScale = maxHeight / naturalHeight;
                scale = Math.min(widthScale, heightScale);
            }
            
            setImageScale(scale);
            setImageDimensions({
                width: naturalWidth * scale,
                height: naturalHeight * scale
            });
            
            // Only generate histogram if imageData is available
            if (imageData) {
                console.log('PhaseSegmentation: Generating intensity graph from imageData');
                generateIntensityGraph(imageData);
            } else {
                console.log('PhaseSegmentation: imageData not available yet, skipping histogram generation');
            }
        }
    };

    const handleBack = () => {
        window.history.back();
    };

    const handleFileUpload = (file) => {
        console.log('PhaseSegmentation: File uploaded:', file);
        
        // Validate file type
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('You can only upload image files!');
            return false;
        }
        
        // Validate file size (max 10MB)
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('Image must be smaller than 10MB!');
            return false;
        }
        
        // Create object URL for the uploaded file
        const imageUrl = URL.createObjectURL(file);
        setUploadedImage(file);
        setUploadedImageUrl(imageUrl);
        setDisplayUrl(imageUrl);
        setError(null);
        
        console.log('PhaseSegmentation: Created object URL:', imageUrl);
        message.success('Image uploaded successfully!');
        return false; // Prevent default upload behavior
    };

    const uploadProps = {
        name: 'image',
        multiple: false,
        accept: 'image/*',
        beforeUpload: handleFileUpload,
        showUploadList: false,
    };

    return (
        <div className="fixed inset-0 bg-white flex flex-col">
            {/* Top Navigation Bar */}
            <div className="h-14 bg-gray-100 flex items-center px-4 border-b border-gray-200">
                <button 
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
                >
                    <ArrowLeftOutlined />
                    <span>Close</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <div className="w-[300px] bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="p-4 space-y-6">
                        {/* Analysis Method */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Analysis Method</h3>
                            <Select
                                value={method}
                                onChange={setMethod}
                                className="w-full"
                            >
                                <Option value="area_fraction">Area Fraction Method</Option>
                                <Option value="point_count">Manual Point Count Method</Option>
                            </Select>
                        </div>

                        {/* Saved Configurations */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Saved Configurations</h3>
                            <Select
                                value={currentConfig}
                                onChange={handleApplyConfiguration}
                                className="w-full"
                                placeholder="Select Configuration"
                            >
                                {Object.entries(configurations).map(([name]) => (
                                    <Option key={name} value={name}>{name}</Option>
                                ))}
                            </Select>
                        </div>

                        {/* New Phase Button */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleNewPhase}
                            block
                        >
                            New Phase
                        </Button>

                        {/* Current Phases List */}
                        {phases.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Current Phases ({phases.length})</h3>
                                <div className="space-y-2">
                                    {phases.map((phase, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-4 h-4 rounded border"
                                                    style={{ backgroundColor: selectedColor }}
                                                />
                                                <span className="text-sm font-medium">{phase.name}</span>
                                            </div>
                                            <Button
                                                type="text"
                                                size="small"
                                                danger
                                                onClick={() => {
                                                    const newPhases = phases.filter((_, i) => i !== index);
                                                    setPhases(newPhases);
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Save Configuration Section */}
                        {phases.length > 0 && (
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Save Configuration</h3>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Enter configuration name"
                                        value={configName}
                                        onChange={e => setConfigName(e.target.value)}
                                        className="w-full"
                                    />
                                    <Button
                                        type="default"
                                        icon={<SaveOutlined />}
                                        onClick={handleSaveConfiguration}
                                        block
                                        disabled={!configName.trim()}
                                    >
                                        Save Configuration
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Phase Configuration */}
                        {currentPhase && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h3 className="text-sm font-medium text-gray-900 mb-4">Phase Configuration</h3>
                                <div className="space-y-4">
                                    <Input
                                        placeholder="Enter Element Name"
                                        value={currentPhase.name}
                                        onChange={e => handlePhaseNameChange(e.target.value)}
                                        className="w-full"
                                    />

                                    {/* Color Selection Card */}
                                    <Card className="w-full bg-white shadow-sm">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="color"
                                                    value={selectedColor}
                                                    onChange={(e) => setSelectedColor(e.target.value)}
                                                    className="w-10 h-10 p-1 rounded border border-gray-200"
                                                />
                                                <span className="text-sm text-gray-600">Selected Color</span>
                                            </div>

                                            {/* Remove color mode and color range controls */}
                                        </div>
                                    </Card>

                                    {/* Color Controls */}
                                    <Card className="w-full bg-white shadow-sm">
                                        <h4 className="text-sm font-medium mb-4">
                                            Intensity Threshold
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Min Intensity</span>
                                                <Slider
                                                    value={minIntensity}
                                                    onChange={setMinIntensity}
                                                    min={0}
                                                    max={255}
                                                    step={1}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Max Intensity</span>
                                                <Slider
                                                    value={maxIntensity}
                                                    onChange={setMaxIntensity}
                                                    min={0}
                                                    max={255}
                                                    step={1}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Save Phase Button */}
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        onClick={handleSavePhase}
                                        block
                                    >
                                        Add Phase
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Analyze Phases Button */}
                        {phases.length > 0 && (
                            <div className="mt-4 border-t border-gray-200 pt-4">
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    onClick={handleAnalyzePhases}
                                    loading={loading}
                                    block
                                >
                                    Analyze Phases
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-white overflow-y-auto">
                    <div className="p-6">
                        {/* Image Display */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                            {displayUrl ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-full max-h-[600px] overflow-hidden flex justify-center items-center">
                                        <img
                                            ref={imageRef}
                                            src={displayUrl}
                                            alt="Analysis"
                                            onLoad={handleImageLoad}
                                            onError={(e) => {
                                                console.error('PhaseSegmentation: Image failed to load:', e.target.src);
                                                setError('Failed to load image');
                                            }}
                                            className="max-w-full max-h-[600px] object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    </div>
                                    {error && (
                                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-red-800">Image Loading Error</h3>
                                                    <div className="mt-2 text-sm text-red-700">
                                                        <p>{error}</p>
                                                        <div className="mt-2">
                                                            <p className="text-xs text-red-600">
                                                                <strong>Debug Info:</strong><br/>
                                                                ImagePath: {imagePath || 'Not provided'}<br/>
                                                                ImageUrl: {imageUrl || 'Not provided'}<br/>
                                                                DisplayUrl: {displayUrl || 'Not set'}
                                                            </p>
                                                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                                                <p className="text-xs text-yellow-800">
                                                                    <strong>Troubleshooting:</strong><br/>
                                                                    1. Ensure the backend server is running (python camera_server.py)<br/>
                                                                    2. Check that an image is selected in the main application<br/>
                                                                    3. Verify the image file exists at the specified path
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-4 w-full">
                                        <h4 className="text-sm font-medium text-gray-900 mb-2">Color Distribution</h4>
                                        <canvas
                                            ref={graphCanvasRef}
                                            width={400}
                                            height={150}
                                            className="w-full border border-gray-200 rounded-lg bg-white"
                                        />
                                        <div className="flex justify-center gap-4 mt-2">
                                            <span className="text-sm text-gray-600">
                                                <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
                                                Red
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
                                                Green
                                            </span>
                                            <span className="text-sm text-gray-600">
                                                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
                                                Blue
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg">
                                    <div className="text-center text-gray-500">
                                        <div className="mb-4">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="mb-2 text-lg font-medium">No Image Selected</div>
                                        <div className="text-sm mb-4">
                                            Please select an image in the main application or upload an image below
                                        </div>
                                        
                                        {/* File Upload Section */}
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-white">
                                            <Upload {...uploadProps}>
                                                <Button 
                                                    icon={<UploadOutlined />} 
                                                    type="primary" 
                                                    size="large"
                                                    className="mb-2"
                                                >
                                                    Upload Image
                                                </Button>
                                                <div className="text-xs text-gray-500">
                                                    Click to upload or drag and drop<br/>
                                                    Supports JPG, PNG, BMP (max 10MB)
                                                </div>
                                            </Upload>
                                        </div>
                                        
                                        {error && (
                                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-sm text-blue-800">{error}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Results Table */}
                        <div className="bg-white border border-gray-200 rounded-lg">
                            <Tabs defaultActiveKey="current" className="px-4">
                                <TabPane tab="Current Result" key="current">
                                    <div className="p-4">
                                        <Table
                                            dataSource={results}
                                            columns={columns}
                                            pagination={false}
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
        </div>
    );
};

export default PhaseSegmentation; 