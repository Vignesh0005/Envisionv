import React, { useState, useEffect } from 'react';
import { 
  FaMousePointer, 
  FaEraser,
  FaDotCircle,
  FaSquare,
  FaCircle,
  FaDrawPolygon,
  FaBezierCurve,
  FaVectorSquare,
  FaTrash,
  FaPalette,
  FaRuler,
  FaArrowsAlt
} from 'react-icons/fa';

const LineIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 8v8M18 8v8M6 12h12" />
  </svg>
);

const CircleIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="6" />
  </svg>
);

const RectangleIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="6" y="6" width="12" height="12" />
  </svg>
);

const PointIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12h14M14 6l6 6-6 6" />
  </svg>
);

const TextBoxIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="6" width="16" height="12" rx="1" />
    <path d="M8 10h8M8 14h5" strokeLinecap="round" />
  </svg>
);

const AngleIcon = () => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 18L18 6M6 6h12v12" />
    <path d="M6 6l12 12" />
    <path d="M6 6l6 6" />
  </svg>
);

const Toolbar = ({ 
  onSelectTool, 
  selectedTool, 
  measurementData, 
  onClearShapes,
  onColorChange,
  onFontColorChange,
  onThicknessChange,
  currentColor,
  currentFontColor,
  currentThickness,
  currentCalibration
}) => {
  const [showTooltip, setShowTooltip] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);
  const [showThicknessPicker, setShowThicknessPicker] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor);
  const [customFontColor, setCustomFontColor] = useState(currentFontColor);
  
  // Predefined colors for quick selection
  const predefinedColors = [
    '#00ff00', // Green
    '#ff0000', // Red
    '#0000ff', // Blue
    '#ffff00', // Yellow
    '#ff00ff', // Magenta
    '#00ffff', // Cyan
    '#ffffff', // White
    '#ff8c00', // Orange
    '#800080', // Purple
    '#008000', // Dark Green
    '#800000', // Maroon
    '#000080'  // Navy
  ];

  // Thickness options with visual indicators
  const thicknessOptions = [
    { value: 1, label: 'Thin' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'Thick' },
    { value: 4, label: 'Extra Thick' },
    { value: 5, label: 'Maximum' }
  ];
  
  // Group tools by category for better organization
  const toolGroups = [
    {
      name: 'Basic',
      tools: [
        { id: 'pointer', icon: <FaMousePointer />, label: 'Select', description: 'Select or move objects' },
        { id: 'move', icon: <FaArrowsAlt />, label: 'Move', description: 'Move shapes freely' },
        { id: 'point', icon: <PointIcon />, label: 'Point', description: 'Place a point marker' },
        { id: 'eraser', icon: <FaEraser />, label: 'Eraser', description: 'Erase measurements' },
      ]
    },
    {
      name: 'Measurement',
      tools: [
        { id: 'line', icon: <LineIcon />, label: 'Line', description: 'Measure linear distance' },
        { id: 'rectangle', icon: <RectangleIcon />, label: 'Rectangle', description: 'Measure area with rectangle' },
        { id: 'circle', icon: <CircleIcon />, label: 'Circle', description: 'Measure circular area' },
      ]
    },
    {
      name: 'Annotations',
      tools: [
        { id: 'arrow', icon: <ArrowIcon />, label: 'Arrow', description: 'Add directional arrow' },
        { id: 'textbox', icon: <TextBoxIcon />, label: 'Text Box', description: 'Add text annotation' },
      ]
    },
    {
      name: 'Advanced',
      tools: [
        { id: 'arc', icon: <FaDrawPolygon />, label: 'Arc', description: 'Draw an arc' },
        { id: 'curve', icon: <FaBezierCurve />, label: 'Curve', description: 'Draw a curve' },
        { id: 'closedCurve', icon: <FaVectorSquare />, label: 'Closed Curve', description: 'Draw a closed curve' },
        { id: 'angle', icon: <AngleIcon />, label: 'Angle', description: 'Measure angle between three points' },
      ]
    }
  ];

  // Add useEffect to load current calibration from localStorage
  const [calibrationInfo, setCalibrationInfo] = useState(null);
  
  useEffect(() => {
    const loadCalibration = () => {
      const savedCalibration = localStorage.getItem('currentCalibration');
      if (savedCalibration) {
        setCalibrationInfo(JSON.parse(savedCalibration));
      }
    };

    loadCalibration();
    window.addEventListener('storage', loadCalibration);
    return () => window.removeEventListener('storage', loadCalibration);
  }, []);

  // Add color picker handlers
  const handleColorChange = (color) => {
    setCustomColor(color.hex);
    onColorChange(color.hex);
  };

  const handleFontColorChange = (color) => {
    setCustomFontColor(color.hex);
    onFontColorChange(color.hex);
  };

  // Add click outside handler for color pickers
  useEffect(() => {
    const handleClickOutside = (event) => {
      const colorPicker = document.getElementById('color-picker');
      const fontColorPicker = document.getElementById('font-color-picker');
      
      if (colorPicker && !colorPicker.contains(event.target)) {
        setShowColorPicker(false);
      }
      
      if (fontColorPicker && !fontColorPicker.contains(event.target)) {
        setShowFontColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white border-b shadow-sm h-full z-40 relative">
      <div className="flex items-center h-full px-2">
        {/* Tool Groups */}
        <div className="flex space-x-2">
          {toolGroups.map((group) => (
            <div key={group.name} className="flex items-center">
              <div className="flex items-center space-x-1 px-1 py-0.5 bg-gray-50 rounded-lg">
                <span className="text-xs font-medium text-gray-500 mr-1">{group.name}</span>
                <div className="flex space-x-0.5">
                  {group.tools.map((tool) => (
                    <div key={tool.id} className="relative">
                      <button
                        onClick={() => onSelectTool(tool.id)}
                        onMouseEnter={() => setShowTooltip(tool.id)}
                        onMouseLeave={() => setShowTooltip(null)}
                        className={`p-1 rounded-md transition-all duration-200 relative
                          ${selectedTool === tool.id 
                            ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm' 
                            : 'hover:bg-gray-100 text-gray-700'
                          }`}
                      >
                        <span className="text-base">{tool.icon}</span>
                      </button>
                      
                      {/* Enhanced Tooltip */}
                      {showTooltip === tool.id && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-40 z-50">
                          <div className="relative">
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mt-1">
                              <div className="border-4 border-transparent border-b-gray-800"></div>
                            </div>
                          <div className="bg-gray-800 text-white px-2 py-1 rounded-md text-sm shadow-lg">
                            <p className="font-medium">{tool.label}</p>
                            <p className="text-xs text-gray-300">{tool.description}</p>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {/* Style Controls and Clear Button */}
          <div className="flex items-center">
            <div className="flex items-center space-x-1 px-2 py-0.5 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium text-gray-500">Style</span>
              
              {/* Shape Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-300"
                    style={{ backgroundColor: currentColor }}
                  />
                  <span className="text-xs text-gray-700">Shape</span>
                </button>
                
                {/* Shape Color Picker Dropdown */}
                {showColorPicker && (
                  <div 
                    id="color-picker"
                    className="absolute top-full left-0 mt-1 p-3 bg-white rounded-lg shadow-lg border z-50 w-64"
                  >
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Colors</h3>
                      <div className="grid grid-cols-6 gap-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              onColorChange(color);
                              setCustomColor(color);
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                              ${currentColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Color</h3>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => handleColorChange({ hex: e.target.value })}
                          className="w-full h-8 cursor-pointer rounded"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => handleColorChange({ hex: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border rounded"
                        />
                        <button
                          onClick={() => setShowColorPicker(false)}
                          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Font Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowFontColorPicker(!showFontColorPicker)}
                  className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-300"
                    style={{ backgroundColor: currentFontColor }}
                  />
                  <span className="text-xs text-gray-700">Font</span>
                </button>
                
                {/* Font Color Picker Dropdown */}
                {showFontColorPicker && (
                  <div 
                    id="font-color-picker"
                    className="absolute top-full left-0 mt-1 p-3 bg-white rounded-lg shadow-lg border z-50 w-64"
                  >
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Colors</h3>
                      <div className="grid grid-cols-6 gap-2">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              onFontColorChange(color);
                              setCustomFontColor(color);
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110
                              ${currentFontColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Color</h3>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={customFontColor}
                          onChange={(e) => handleFontColorChange({ hex: e.target.value })}
                          className="w-full h-8 cursor-pointer rounded"
                        />
                        <input
                          type="text"
                          value={customFontColor}
                          onChange={(e) => handleFontColorChange({ hex: e.target.value })}
                          className="w-24 px-2 py-1 text-sm border rounded"
                        />
                        <button
                          onClick={() => setShowFontColorPicker(false)}
                          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Thickness Control */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowThicknessPicker(!showThicknessPicker);
                    setShowColorPicker(false);
                    setShowFontColorPicker(false);
                  }}
                  className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((size) => (
                      <div
                        key={size}
                        className={`w-1 h-1 rounded-full transition-colors
                          ${size <= currentThickness ? 'bg-gray-700' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-700">Thickness</span>
                </button>
                
                {/* Thickness Picker Dropdown */}
                {showThicknessPicker && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white rounded-lg shadow-lg border z-50 w-48">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Line Thickness</h3>
                    <div className="space-y-2">
                      {thicknessOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            onThicknessChange(option.value);
                            setShowThicknessPicker(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors
                            ${currentThickness === option.value ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                        >
                          <span className="text-sm">{option.label}</span>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((size) => (
                              <div
                                key={size}
                                className={`w-1 h-1 rounded-full transition-colors
                                  ${size <= option.value ? 'bg-gray-700' : 'bg-gray-300'}`}
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clear Button */}
              <button
                onClick={onClearShapes}
                className="flex items-center space-x-2 px-2 py-1 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                title="Clear workspace (image and measurements)"
              >
                <span className="text-lg"><FaTrash /></span>
                <span className="text-xs">Clear All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add calibration info display */}
        {calibrationInfo && (
          <div className="flex items-center text-xs text-gray-600">
            <span className="bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
              {calibrationInfo.magnification} • 1px = {(1/calibrationInfo.calibrationFactor).toFixed(4)} μm
            </span>
          </div>
        )}

        {/* Existing measurement display */}
        {measurementData && (
          <div className="text-sm text-gray-600">
            {/* ... existing measurement display ... */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar; 