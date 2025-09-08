import React, { useState, useEffect, useCallback } from 'react';
import { FaChevronUp } from 'react-icons/fa';

const ImageList = ({ currentPath, onSelectImage }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Add polling interval state (default 5 seconds)
  const POLL_INTERVAL = 5000;

  // Memoize loadImages to prevent unnecessary recreations
  const loadImages = useCallback(async () => {
    if (!currentPath) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/list-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          path: currentPath,
          filters: {
            extensions: ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
          }
        })
      });

      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.images)) {
        // Compare with current images to avoid unnecessary updates
        const newImages = data.images.map(img => ({
          ...img,
          path: img.path,
          name: img.name,
          date: new Date(img.date),
          size: img.size,
          thumbnail: `http://localhost:5000/api/thumbnail?path=${encodeURIComponent(img.path)}`
        }));

        // Only update if images have changed
        setImages(prevImages => {
          const hasChanged = JSON.stringify(prevImages.map(i => i.path)) !== 
                            JSON.stringify(newImages.map(i => i.path));
          return hasChanged ? newImages : prevImages;
        });
      }
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  // Initial load and path change handler
  useEffect(() => {
    if (currentPath) {
      setLoading(true);
      loadImages();
    }
  }, [currentPath, loadImages]);

  // Set up polling for updates
  useEffect(() => {
    if (!currentPath) return;

    // Initial load
    loadImages();

    // Set up polling interval
    const intervalId = setInterval(loadImages, POLL_INTERVAL);

    // Cleanup on unmount or path change
    return () => {
      clearInterval(intervalId);
    };
  }, [currentPath, loadImages]);

  // Add folder watch setup
  useEffect(() => {
    const setupFolderWatch = async () => {
      if (!currentPath) return;

      try {
        // Set up folder watch on the backend
        const response = await fetch('http://localhost:5000/api/watch-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ path: currentPath })
        });

        if (!response.ok) {
          console.error('Failed to set up folder watch');
        }
      } catch (error) {
        console.error('Error setting up folder watch:', error);
      }
    };

    setupFolderWatch();
  }, [currentPath]);

  const handleImageClick = (image) => {
    setSelectedImage(image.path);
    if (onSelectImage) {
      onSelectImage(image.path);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Add a helper function to get filename without extension
  const getFileNameWithoutExtension = (filename) => {
    return filename.replace(/\.[^/.]+$/, '');
  };

  return (
    <>
      {/* Fixed Arrow Button at bottom */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed bottom-0 right-1/2 transform translate-x-1/2 z-50 
          bg-white rounded-t-lg px-6 py-2 shadow-lg
          hover:bg-gray-50 transition-all duration-200 
          border border-gray-200 border-b-0
          flex items-center gap-2 group"
      >
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
          Image Gallery
        </span>
        <FaChevronUp 
          className={`transition-transform duration-300 text-gray-500 group-hover:text-gray-700
            ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
        />
      </button>

      {/* Image Gallery Container */}
      <div
        className={`fixed left-6 right-6 bottom-12 z-40 
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
      >
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
          <div className="h-[280px]">
            <div className="overflow-x-auto overflow-y-hidden h-full">
              <div className="flex gap-4 p-4 min-w-max">
                {loading ? (
                  <div className="flex items-center justify-center p-4 w-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  </div>
                ) : images.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 w-full">
                    No images found in this folder
                  </div>
                ) : (
                  images.map((image) => (
                    <div
                      key={image.path}
                      onClick={() => handleImageClick(image)}
                      className={`flex flex-col items-center p-2 rounded-lg cursor-pointer 
                        transition-all duration-200
                        ${selectedImage === image.path 
                          ? 'bg-blue-50 border-blue-300 shadow-sm' 
                          : 'hover:bg-gray-50 border-gray-200'}
                        border w-[200px] flex-shrink-0`}
                    >
                      <div className="relative w-[160px] h-[160px] mb-2">
                        <img
                          src={image.thumbnail}
                          alt={getFileNameWithoutExtension(image.name)}
                          className="w-full h-full object-cover rounded"
                          loading="lazy"
                        />
                      </div>
                      <p className="text-xs text-gray-900 break-words w-full text-center px-1">
                        {getFileNameWithoutExtension(image.name)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageList;