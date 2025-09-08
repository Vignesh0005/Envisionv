import React, { useState, useEffect, useRef } from "react";
import CameraCalibrate from "./CameraCalibrate";
import CameraConfiguration from "./CameraConfiguration";
import PorosityAnalysis from './PorosityAnalysis';
import PhaseSegmentation from './PhaseSegmentation';
import NodularityAnalysis from './NodularityAnalysis';
import SystemConfiguration from './SystemConfiguration';
import FlakeAnalysis from './FlakeAnalysis';
import DendriticArmSpacing from './DendriticArmSpacing';
import DeCarburization from './DeCarburization';
import InclusionAnalysis from './InclusionAnalysis';

const Navbar = ({ imagePath, setImagePath, currentImageUrl, onClearWorkspace, addToImageHistory }) => {
  console.log('Navbar component - addToImageHistory function exists:', !!addToImageHistory);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [showCameraConfig, setShowCameraConfig] = useState(false);
  const [showPorosity, setShowPorosity] = useState(false);
  const [showPhaseSegment, setShowPhaseSegment] = useState(false);
  const [showNodularity, setShowNodularity] = useState(false);
  const [showSystemConfig, setShowSystemConfig] = useState(false);
  const [showFlakeAnalysis, setShowFlakeAnalysis] = useState(false);
  const [showDendriticArmSpacing, setShowDendriticArmSpacing] = useState(false);
  const [showDeCarburization, setShowDeCarburization] = useState(false);
  const [showInclusionAnalysis, setShowInclusionAnalysis] = useState(false);
  const dropdownRefs = useRef([]);

  const menuItems = [
    { name: "File", options: ["Clear", "Exit", "Logout", "Save Image"] },
    {
      name: "Settings",
      options: [
        "System Configuration",
        "Calibrate",
        "Camera Configuration",
        "Activate Product",
      ],
    },
    {
      name: "Image",
      options: [
        "Rotate Clockwise",
        "Rotate Anti-Clockwise",
        "Flip Horizontal",
        "Flip Vertical",
        "Zoom In",
        "Zoom Out",
      ],
    },
    {
      name: "Image Process",
      options: [
        "LowPass Filter",
        "Median Filter",
        "Edge Detect Filter",
        "Edge Emphasis",
        "Thresholding",
        "Gray Scale",
        "Invert",
        "Thin",
        "Image Splice",
        "Image Sharpening",
        "Image Stitch",
      ],
    },
    {
      name: "Measurement",
      options: [
        "Porosity",
        "Nodularity",
        "Phases",
        "Grain Size",
        "Inclusion",
        "De-Carburization",
        "Flake Analysis",
        "Dentric Arm Spacing",
        "Particle Analysis",
        "Graphite Classification",
        "Coating Thickness",
      ],
    },
    { name: "Help", options: ["About", "Help"] },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!dropdownRefs.current.some(ref => ref && ref.contains(event.target))) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDropdown = (index) => {
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDropdown(index);
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
    }
  };

  const handleRotate = async (direction) => {
    try {
      if (!imagePath) {
        alert('No image to rotate');
        return;
      }

      console.log('Sending rotation request to server...');
      const response = await fetch('http://localhost:5000/api/rotate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imagePath: imagePath,
          direction: direction
        })
      });

      console.log('Server response received:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Rotation response data:', data);

      if (data.status === 'success') {
        console.log('Setting new image path:', data.filepath);
        setImagePath(data.filepath);
        // Add to image history
        if (addToImageHistory) {
          addToImageHistory(data.filepath, `Rotate ${direction}`);
        }
      } else {
        alert('Failed to rotate image: ' + data.message);
      }
    } catch (error) {
      console.error('Error rotating image:', error);
      alert('Error rotating image: ' + error.message);
    }
  };

  const handleFlip = async (direction) => {
    try {
      if (!imagePath) {
        alert('No image to flip');
        return;
      }

      console.log('Sending flip request to server...');
      const response = await fetch('http://localhost:5000/api/flip-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imagePath: imagePath,
          direction: direction
        })
      });

      console.log('Server response received:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Flip response data:', data);

      if (data.status === 'success') {
        console.log('Setting new image path:', data.filepath);
        setImagePath(data.filepath);
        // Add to image history
        if (addToImageHistory) {
          addToImageHistory(data.filepath, `Flip ${direction}`);
        }
      } else {
        alert('Failed to flip image: ' + data.message);
      }
    } catch (error) {
      console.error('Error flipping image:', error);
      alert('Error flipping image: ' + error.message);
    }
  };

  const handleLowPassFilter = async () => {
    console.log('=== handleLowPassFilter called ===');
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending low pass filter request to server...');
        const response = await fetch('http://localhost:5000/api/lowpass-filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Low pass filter response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            console.log('addToImageHistory function exists:', !!addToImageHistory);
            if (addToImageHistory) {
                console.log('Calling addToImageHistory with:', data.filepath, 'Low Pass Filter');
                addToImageHistory(data.filepath, 'Low Pass Filter');
            } else {
                console.log('addToImageHistory function is not available');
            }
        } else {
            alert('Failed to apply filter: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying low pass filter:', error);
        alert('Error applying low pass filter: ' + error.message);
    }
    console.log('=== handleLowPassFilter completed ===');
};

  const handleMedianFilter = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending median filter request to server...');
        const response = await fetch('http://localhost:5000/api/median-filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Median filter response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Median Filter');
            }
        } else {
            alert('Failed to apply filter: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying median filter:', error);
        alert('Error applying median filter: ' + error.message);
    }
};

  const handleEdgeDetect = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending edge detection request to server...');
        const response = await fetch('http://localhost:5000/api/edge-detect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Edge detection response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Edge Detection');
            }
        } else {
            alert('Failed to apply edge detection: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying edge detection:', error);
        alert('Error applying edge detection: ' + error.message);
    }
};

  const handleEdgeEmphasis = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending edge emphasis request to server...');
        const response = await fetch('http://localhost:5000/api/edge-emphasis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Edge emphasis response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Edge Emphasis');
            }
        } else {
            alert('Failed to apply edge emphasis: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying edge emphasis:', error);
        alert('Error applying edge emphasis: ' + error.message);
    }
};

  const handleThreshold = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending threshold request to server...');
        const response = await fetch('http://localhost:5000/api/threshold', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Threshold response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Thresholding');
            }
        } else {
            alert('Failed to apply threshold: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying threshold:', error);
        alert('Error applying threshold: ' + error.message);
    }
};

  const handleGrayscale = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending grayscale request to server...');
        const response = await fetch('http://localhost:5000/api/grayscale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Grayscale response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Grayscale');
            }
        } else {
            alert('Failed to apply grayscale: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying grayscale:', error);
        alert('Error applying grayscale: ' + error.message);
    }
};

  const handleInvert = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending invert request to server...');
        const response = await fetch('http://localhost:5000/api/invert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Invert response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Invert');
            }
        } else {
            alert('Failed to apply invert: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying invert:', error);
        alert('Error applying invert: ' + error.message);
    }
};

  const handleThin = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending thin request to server...');
        const response = await fetch('http://localhost:5000/api/thin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Thin response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Thinning');
            }
        } else {
            alert('Failed to apply thinning: ' + data.message);
        }
    } catch (error) {
        console.error('Error applying thinning:', error);
        alert('Error applying thinning: ' + error.message);
    }
};

  const handleImageSplice = async () => {
    try {
        if (!imagePath) {
            alert('Please select a base image first');
            return;
        }

        // Create input element for file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Upload additional images first
            const additionalPaths = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const uploadResponse = await fetch('http://localhost:5000/api/import-image', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const uploadData = await uploadResponse.json();
                    if (uploadData.status === 'success') {
                        additionalPaths.push(uploadData.filepath);
                    }
                } catch (error) {
                    console.error('Error uploading additional image:', error);
                }
            }

            if (additionalPaths.length === 0) {
                alert('Failed to upload additional images');
                return;
            }

            // Now perform the splice
            const allPaths = [imagePath, ...additionalPaths];
            
            console.log('Sending image splice request to server...');
            const response = await fetch('http://localhost:5000/api/image-splice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imagePaths: allPaths,
                    direction: 'horizontal'  // or let user choose
                })
            });

            console.log('Server response received:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Image splice response data:', data);

            if (data.status === 'success') {
                console.log('Setting new image path:', data.filepath);
                setImagePath(data.filepath);
                // Add to image history
                if (addToImageHistory) {
                    addToImageHistory(data.filepath, 'Image Splice');
                }
            } else {
                alert('Failed to splice images: ' + data.message);
            }
        };

        input.click();
    } catch (error) {
        console.error('Error during image splice:', error);
        alert('Error splicing images: ' + error.message);
    }
};

  const handleImageSharpen = async () => {
    try {
        if (!imagePath) {
            alert('No image to process');
            return;
        }

        console.log('Sending image sharpen request to server...');
        const response = await fetch('http://localhost:5000/api/image-sharpen', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        console.log('Server response received:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Image sharpen response data:', data);

        if (data.status === 'success') {
            console.log('Setting new image path:', data.filepath);
            setImagePath(data.filepath);
            // Add to image history
            if (addToImageHistory) {
                addToImageHistory(data.filepath, 'Image Sharpening');
            }
        } else {
            alert('Failed to sharpen image: ' + data.message);
        }
    } catch (error) {
        console.error('Error sharpening image:', error);
        alert('Error sharpening image: ' + error.message);
    }
};

  const handleImageStitch = async () => {
    try {
        if (!imagePath) {
            alert('Please select a base image first');
            return;
        }

        // Create input element for file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Upload additional images first
            const additionalPaths = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const uploadResponse = await fetch('http://localhost:5000/api/import-image', {
                        method: 'POST',
                        body: formData
                    });
                    
                    const uploadData = await uploadResponse.json();
                    if (uploadData.status === 'success') {
                        additionalPaths.push(uploadData.filepath);
                    }
                } catch (error) {
                    console.error('Error uploading additional image:', error);
                }
            }

            if (additionalPaths.length === 0) {
                alert('Failed to upload additional images');
                return;
            }

            // Now perform the stitching
            const allPaths = [imagePath, ...additionalPaths];
            
            console.log('Sending image stitch request to server...');
            const response = await fetch('http://localhost:5000/api/image-stitch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    imagePaths: allPaths
                })
            });

            console.log('Server response received:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Image stitch response data:', data);

            if (data.status === 'success') {
                console.log('Setting new image path:', data.filepath);
                setImagePath(data.filepath);
                // Add to image history
                if (addToImageHistory) {
                    addToImageHistory(data.filepath, 'Image Stitch');
                }
            } else {
                alert('Failed to stitch images: ' + data.message);
            }
        };

        input.click();
    } catch (error) {
        console.error('Error during image stitching:', error);
        alert('Error stitching images: ' + error.message);
    }
};

  const handleSaveImage = async () => {
    try {
        if (!imagePath) {
            alert('No image to save');
            return;
        }

        const response = await fetch('http://localhost:5000/api/save-to-main', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imagePath: imagePath
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status === 'success') {
            alert('Image saved successfully');
            setImagePath(data.filepath);
        } else {
            alert('Failed to save image: ' + data.message);
        }
    } catch (error) {
        console.error('Error saving image:', error);
        alert('Error saving image: ' + error.message);
    }
};

  const handleOptionClick = (option) => {
    if (option === "Clear") {
      if (onClearWorkspace) {
        onClearWorkspace();
      }
    } else if (option === "System Configuration") {
      setShowSystemConfig(true);
    } else if (option === "Calibrate") {
      setShowCalibrate(true);
    } else if (option === "Camera Configuration") {
      setShowCameraConfig(true);
    } else if (option === "Rotate Clockwise") {
      handleRotate('clockwise');
    } else if (option === "Rotate Anti-Clockwise") {
      handleRotate('anticlockwise');
    } else if (option === "Flip Horizontal") {
      handleFlip('horizontal');
    } else if (option === "Flip Vertical") {
      handleFlip('vertical');
    } else if (option === "LowPass Filter") {
      handleLowPassFilter();
    } else if (option === "Median Filter") {
      handleMedianFilter();
    } else if (option === "Edge Detect Filter") {
      handleEdgeDetect();
    } else if (option === "Edge Emphasis") {
      handleEdgeEmphasis();
    } else if (option === "Thresholding") {
      handleThreshold();
    } else if (option === "Gray Scale") {
      handleGrayscale();
    } else if (option === "Invert") {
      handleInvert();
    } else if (option === "Thin") {
      handleThin();
    } else if (option === "Image Splice") {
      handleImageSplice();
    } else if (option === "Image Sharpening") {
      handleImageSharpen();
    } else if (option === "Image Stitch") {
      handleImageStitch();
    } else if (option === "Porosity") {
      setShowPorosity(true);
    } else if (option === "Phases") {
      setShowPhaseSegment(true);
    } else if (option === "Nodularity") {
      setShowNodularity(true);
    } else if (option === "Save Image") {
      handleSaveImage();
    } else if (option === "Flake Analysis") {
      setShowFlakeAnalysis(true);
    } else if (option === "Dentric Arm Spacing") {
      setShowDendriticArmSpacing(true);
    } else if (option === "De-Carburization") {
      setShowDeCarburization(true);
    } else if (option === "Inclusion") {
      setShowInclusionAnalysis(true);
    }
    setActiveDropdown(null);
  };

  return (
    <>
      <nav className="bg-gray-800 text-white shadow-lg">
      <div className="w-full px-4">
        <div className="relative flex items-center justify-start h-8 w-full">
          {/* Mobile menu button (optional, can be removed if not needed) */}
          {/* <div className="md:hidden">
            <button className="inline-flex items-center justify-center p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none">
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div> */}

          {/* All menu items aligned left */}
          <div className="hidden md:block w-full">
            <div className="flex space-x-2 justify-start w-full">
              {menuItems.map((item, index) => (
                <div 
                  key={index} 
                  className="relative"
                  ref={el => dropdownRefs.current[index] = el}
                >
                  <button
                    onClick={() => handleDropdown(index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`px-2 py-1 rounded-md text-xs font-medium 
                      transition-colors duration-200 ease-in-out
                      ${activeDropdown === index 
                        ? 'bg-gray-700 text-white' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2 
                      focus:ring-offset-gray-800 focus:ring-white`}
                    aria-expanded={activeDropdown === index}
                    role="menuitem"
                    tabIndex={0}
                  >
                    {item.name}
                  </button>
                  {activeDropdown === index && (
                    <div 
                      className="origin-top-left absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 
                        transform transition-all duration-200 ease-in-out z-50"
                      role="menu"
                    >
                      <div className="py-1">
                        {item.options.map((option, optionIndex) => (
                          <a
                            key={optionIndex}
                            href="#"
                            className="block px-3 py-1 text-xs text-gray-700 
                              hover:bg-gray-100 hover:text-gray-900
                              transition-colors duration-150 ease-in-out
                              focus:outline-none focus:bg-gray-100 focus:text-gray-900"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOptionClick(option);
                            }}
                            role="menuitem"
                            tabIndex={0}
                          >
                            {option}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>

      {/* Camera Configuration Modal */}
      {showCameraConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div className="fixed inset-0" onClick={() => setShowCameraConfig(false)}></div>
            <div className="inline-block w-auto bg-white shadow-xl rounded-lg relative">
              {/* Close Button */}
              <button
                onClick={() => setShowCameraConfig(false)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <CameraConfiguration />
            </div>
          </div>
        </div>
      )}

      {/* Calibrate Modal */}
      {showCalibrate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0" onClick={() => setShowCalibrate(false)}></div>
            <div className="inline-block w-full max-w-7xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setShowCalibrate(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CameraCalibrate imagePath={imagePath} />
            </div>
          </div>
        </div>
      )}

      {showPorosity && (
        <PorosityAnalysis 
          onClose={() => setShowPorosity(false)}
          imagePath={imagePath}
        />
      )}

      {showPhaseSegment && (
        <PhaseSegmentation 
          imageUrl={imagePath}
          onClose={() => setShowPhaseSegment(false)}
        />
      )}

      {/* Nodularity Modal */}
      {showNodularity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0" onClick={() => setShowNodularity(false)}></div>
            <div className="inline-block w-full max-w-7xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setShowNodularity(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <NodularityAnalysis 
                onClose={() => setShowNodularity(false)}
                imagePath={imagePath} 
                imageUrl={currentImageUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* System Configuration Modal */}
      {showSystemConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div className="fixed inset-0" onClick={() => setShowSystemConfig(false)}></div>
            <div className="inline-block w-auto bg-white shadow-xl rounded-lg relative">
              {/* Close Button handled in SystemConfiguration */}
              <SystemConfiguration onClose={() => setShowSystemConfig(false)} />
            </div>
          </div>
        </div>
      )}

      {showFlakeAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0" onClick={() => setShowFlakeAnalysis(false)}></div>
            <div className="inline-block w-full max-w-7xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setShowFlakeAnalysis(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <FlakeAnalysis onClose={() => setShowFlakeAnalysis(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Dendritic Arm Spacing Modal */}
      {showDendriticArmSpacing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0" onClick={() => setShowDendriticArmSpacing(false)}></div>
            <div className="inline-block w-full max-w-7xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setShowDendriticArmSpacing(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DendriticArmSpacing onClose={() => setShowDendriticArmSpacing(false)} />
            </div>
          </div>
        </div>
      )}

      {/* De-Carburization Modal */}
      {showDeCarburization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div className="fixed inset-0" onClick={() => setShowDeCarburization(false)}></div>
            <div className="inline-block w-full max-w-7xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  onClick={() => setShowDeCarburization(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <DeCarburization onClose={() => setShowDeCarburization(false)} />
            </div>
          </div>
        </div>
      )}

      {showInclusionAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center flex items-center justify-center">
            <div className="fixed inset-0" onClick={() => setShowInclusionAnalysis(false)}></div>
            <div className="inline-block w-auto bg-white shadow-xl rounded-lg relative">
              <button
                onClick={() => setShowInclusionAnalysis(false)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <InclusionAnalysis imagePath={imagePath} imageUrl={currentImageUrl} onClose={() => setShowInclusionAnalysis(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;