import React, { useState, useRef, useEffect } from 'react';
import { 
  FaMousePointer, 
  FaEraser,
  FaDotCircle,
  FaSquare,
  FaCircle,
  FaDrawPolygon,
  FaBezierCurve,
  FaVectorSquare,
  FaFont,
  FaRuler,
  FaArrowsAlt,
  FaTrash
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

const ShapeTracker = ({ 
  shapes, 
  selectedShape, 
  onShapeSelect, 
  onColorChange, 
  currentColor,
  currentFontColor,
  onFontColorChange,
  onShapesUpdate 
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);
  const colorPickerRef = useRef(null);
  const fontColorPickerRef = useRef(null);

  // Predefined colors
  const predefinedColors = [
    '#00ff00', '#ff0000', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#ffffff', '#ff8c00',
    '#800080', '#008000', '#800000', '#000080'
  ];

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (fontColorPickerRef.current && !fontColorPickerRef.current.contains(event.target)) {
        setShowFontColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to get shape icon
  const getShapeIcon = (type) => {
    switch (type) {
      case 'point':
        return <PointIcon />;
      case 'line':
        return <LineIcon />;
      case 'arrow':
        return <ArrowIcon />;
      case 'rectangle':
        return <RectangleIcon />;
      case 'circle':
        return <CircleIcon />;
      case 'arc':
        return <FaDrawPolygon className="w-4 h-4" />;
      case 'curve':
        return <FaBezierCurve className="w-4 h-4" />;
      case 'closedCurve':
        return <FaVectorSquare className="w-4 h-4" />;
      case 'text':
        return <TextBoxIcon />;
      case 'angle':
        return <AngleIcon />;
      default:
        return <FaCircle className="w-4 h-4" />;
    }
  };

  // Helper function to generate shape label
  const getShapeLabel = (shape, index) => {
    const type = shape.type;
    const count = shapes.filter(s => s.type === type).length;
    const number = shapes.filter(s => s.type === type && shapes.indexOf(s) <= index).length;
    
    switch (type) {
      case 'line':
        return `L${number}`;
      case 'rectangle':
        return `R${number}`;
      case 'circle':
        return `C${number}`;
      case 'arc':
        return `A${number}`;
      case 'curve':
        return `CV${number}`;
      case 'closedCurve':
        return `CC${number}`;
      case 'point':
        return `P${number}`;
      case 'angle':
        return `AG${number}`;
      case 'text':
        return `T${number}`;
      default:
        return `${type}${number}`;
    }
  };

  // Handle shape color change
  const handleShapeColorChange = (color) => {
    if (selectedShape) {
      const newShapes = shapes.map(shape => {
        if (shape === selectedShape) {
          return {
            ...shape,
            style: {
              ...shape.style,
              color: color
            }
          };
        }
        return shape;
      });
      onShapesUpdate(newShapes);
      onColorChange(color);
    }
  };

  // Handle font color change
  const handleFontColorChange = (color) => {
    if (selectedShape) {
      const newShapes = shapes.map(shape => {
        if (shape === selectedShape) {
          return {
            ...shape,
            style: {
              ...shape.style,
              fontColor: color
            }
          };
        }
        return shape;
      });
      onShapesUpdate(newShapes);
      onFontColorChange(color);
    }
  };

  // Function to handle shape deletion
  const handleDeleteShape = (shape, e) => {
    e.stopPropagation();
    console.log('=== handleDeleteShape called ===');
    console.log('Shape to delete:', shape);
    console.log('Current shapes count:', shapes.length);
    
    // Use shape ID for proper comparison instead of object reference
    const updatedShapes = shapes.filter(s => s.id !== shape.id);
    console.log('Updated shapes count:', updatedShapes.length);
    
    onShapesUpdate(updatedShapes);
    console.log('Shape deletion completed');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-0 m-0 w-full">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Drawn Shapes</h3>
        <span className="text-xs text-gray-500">{shapes.length} shapes</span>
      </div>

      {/* Shape List with Scroll */}
      <div className="h-[300px] overflow-y-auto">
        {shapes.map((shape, index) => {
          const isSelected = shape === selectedShape;
          const label = getShapeLabel(shape, index);
          const shapeColor = shape.style?.color || currentColor;
          const fontColor = shape.style?.fontColor || currentFontColor;
          
          return (
            <div
              key={index}
              className={`group relative px-4 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors
                ${isSelected ? 'bg-blue-50' : ''}`}
              onClick={() => onShapeSelect(shape)}
            >
              <div className="flex items-center space-x-3">
                {/* Shape Icon */}
                <div className="flex-shrink-0 text-gray-700">
                  {getShapeIcon(shape.type)}
                </div>

                {/* Shape Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {label}
                  </p>
                </div>

                {/* Color Preview */}
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: shapeColor }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: fontColor }}
                  />
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDeleteShape(shape, e)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded-full"
                >
                  <FaTrash className="w-3 h-3 text-red-500" />
                </button>
              </div>

              {/* Color Controls (show on hover) */}
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Shape Color</label>
                      <div ref={colorPickerRef} className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowColorPicker(prev => !prev);
                            setShowFontColorPicker(false);
                          }}
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: shapeColor }}
                        />
                        {showColorPicker && selectedShape === shape && (
                          <div className="absolute left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border z-50 w-48">
                            <div className="grid grid-cols-4 gap-2">
                              {predefinedColors.map((color) => (
                                <button
                                  key={color}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShapeColorChange(color);
                                  }}
                                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: color === (shape.style?.color || currentColor) ? '#3B82F6' : '#E5E7EB'
                                  }}
                                />
                              ))}
                            </div>
                            <div className="mt-3">
                              <input
                                type="color"
                                value={shape.style?.color || currentColor}
                                onChange={(e) => handleShapeColorChange(e.target.value)}
                                className="w-full h-8 cursor-pointer rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                      <div ref={fontColorPickerRef} className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowFontColorPicker(prev => !prev);
                            setShowColorPicker(false);
                          }}
                          className="w-6 h-6 rounded border border-gray-300 text-xs flex items-center justify-center"
                          style={{ backgroundColor: fontColor }}
                        >
                          T
                        </button>
                        {showFontColorPicker && selectedShape === shape && (
                          <div className="absolute left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border z-50 w-48">
                            <div className="grid grid-cols-4 gap-2">
                              {predefinedColors.map((color) => (
                                <button
                                  key={color}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFontColorChange(color);
                                  }}
                                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: color,
                                    borderColor: color === (shape.style?.fontColor || currentFontColor) ? '#3B82F6' : '#E5E7EB'
                                  }}
                                />
                              ))}
                            </div>
                            <div className="mt-3">
                              <input
                                type="color"
                                value={shape.style?.fontColor || currentFontColor}
                                onChange={(e) => handleFontColorChange(e.target.value)}
                                className="w-full h-8 cursor-pointer rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {shapes.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No shapes drawn yet</p>
        </div>
      )}
    </div>
  );
};

export default ShapeTracker; 