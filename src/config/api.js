// API configuration for different environments
const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;

export const API_BASE_URL = isElectron 
    ? 'http://localhost:5000' 
    : 'http://localhost:5000';

export const API_ENDPOINTS = {
    TEST_CONNECTION: '/api/test-connection',
    IMPORT_IMAGE: '/api/import-image',
    LOWPASS_FILTER: '/api/lowpass-filter',
    MEDIAN_FILTER: '/api/median-filter',
    EDGE_DETECT: '/api/edge-detect',
    EDGE_EMPHASIS: '/api/edge-emphasis',
    THRESHOLD: '/api/threshold',
    GRAYSCALE: '/api/grayscale',
    INVERT: '/api/invert',
    THIN: '/api/thin',
    IMAGE_SHARPEN: '/api/image-sharpen',
    IMAGE_SPLICE: '/api/image-splice',
    IMAGE_STITCH: '/api/image-stitch',
    POROSITY_ANALYSIS: '/api/porosity-analysis',
    PHASE_SEGMENTATION: '/api/phase-segmentation',
    INCLUSION_ANALYSIS: '/api/inclusion-analysis',
    NODULARITY_ANALYSIS: '/api/nodularity-analysis'
};

// Helper function to make API requests
export const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, mergedOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error);
        throw error;
    }
};
