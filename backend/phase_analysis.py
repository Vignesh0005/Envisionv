import cv2
import numpy as np
from flask import jsonify
import os
from sklearn.cluster import KMeans
from scipy import ndimage

def analyze_phase(image_path, method='area_fraction', configuration=None, min_intensity=0, max_intensity=255):
    """
    Analyze phase segmentation in the image using intensity thresholding
    Args:
        image_path: Path to the image
        method: Analysis method ('area_fraction' or 'point_count')
        configuration: Dictionary containing phase configuration
        min_intensity: Minimum intensity threshold (0-255)
        max_intensity: Maximum intensity threshold (0-255)
    """
    try:
        print(f"Analyzing phase for image: {image_path}")
        print(f"Method: {method}")
        print(f"Configuration: {configuration}")
        print(f"Intensity thresholds: {min_intensity}-{max_intensity}")

        # Read image
        img = cv2.imread(image_path)
        if img is None:
            print(f"Failed to read image at path: {image_path}")
            return {
                'status': 'error',
                'message': f'Failed to read image at path: {image_path}'
            }

        # Convert to grayscale for intensity-based segmentation
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        height, width = gray.shape[:2]
        total_pixels = height * width
        print(f"Image dimensions: {width}x{height}")

        if not configuration or 'phases' not in configuration:
            print("No valid configuration provided")
            return {
                'status': 'error',
                'message': 'No valid configuration provided'
            }

        results = {}
        for phase in configuration['phases']:
            try:
                phase_name = phase.get('name')
                if not phase_name:
                    continue
                print(f"Processing phase: {phase_name}")

                # Use intensity range from phase config if present, else from global
                intensity_range = phase.get('intensityRange', {'min': min_intensity, 'max': max_intensity})
                phase_min = intensity_range.get('min', min_intensity)
                phase_max = intensity_range.get('max', max_intensity)

                # Create mask for pixels within intensity range
                mask = cv2.inRange(gray, phase_min, phase_max)

                # Apply shape filters if present
                shape_filters = phase.get('shapeFilters', {})
                if shape_filters:
                    mask = apply_shape_filters(mask, shape_filters)

                # Calculate phase area and percentage
                phase_area = np.sum(mask > 0)
                phase_percentage = (phase_area / total_pixels) * 100

                print(f"Phase {phase_name} results:")
                print(f"Area: {phase_area} pixels")
                print(f"Percentage: {phase_percentage}%")

                # Store results
                results[phase_name] = {
                    'percentage': round(phase_percentage, 2),
                    'area': int(phase_area)
                }

            except Exception as phase_error:
                print(f"Error processing phase {phase_name}: {str(phase_error)}")
                results[phase_name] = {
                    'error': str(phase_error)
                }

        return {
            'status': 'success',
            'results': results
        }

    except Exception as e:
        print(f"Error in phase analysis: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

def create_color_mask(img, color_range, color_mode='rgb'):
    """
    Create a mask based on color range
    """
    try:
        if color_mode == 'hsv':
            h, s, v = cv2.split(img)
            h_range = color_range.get('h', [0, 360])
            s_range = color_range.get('s', [0, 100])
            v_range = color_range.get('v', [0, 100])
            
            # Scale HSV values to OpenCV ranges
            h_mask = cv2.inRange(h, int(h_range[0] * 180/360), int(h_range[1] * 180/360))
            s_mask = cv2.inRange(s, int(s_range[0] * 255/100), int(s_range[1] * 255/100))
            v_mask = cv2.inRange(v, int(v_range[0] * 255/100), int(v_range[1] * 255/100))
            
            return cv2.bitwise_and(cv2.bitwise_and(h_mask, s_mask), v_mask)
        else:
            r, g, b = cv2.split(img)
            r_range = color_range.get('r', [0, 255])
            g_range = color_range.get('g', [0, 255])
            b_range = color_range.get('b', [0, 255])
            
            r_mask = cv2.inRange(r, r_range[0], r_range[1])
            g_mask = cv2.inRange(g, g_range[0], g_range[1])
            b_mask = cv2.inRange(b, b_range[0], b_range[1])
            
            return cv2.bitwise_and(cv2.bitwise_and(r_mask, g_mask), b_mask)
    except Exception as e:
        print(f"Error creating color mask: {str(e)}")
        return np.zeros_like(img[:,:,0])

def create_boundary_mask(img, boundaries):
    """
    Create a mask based on provided boundaries
    """
    try:
        mask = np.zeros(img.shape[:2], dtype=np.uint8)
        if boundaries:
            for boundary in boundaries:
                points = np.array(boundary, dtype=np.int32)
                cv2.fillPoly(mask, [points], 255)
        return mask
    except Exception as e:
        print(f"Error creating boundary mask: {str(e)}")
        return np.zeros_like(img[:,:,0])

def apply_shape_filters(mask, filters):
    """
    Apply shape-based filters to the mask
    """
    try:
        filtered_mask = mask.copy()
        
        if filters.get('circularity', {}).get('enabled', False):
            filtered_mask = filter_by_circularity(
                filtered_mask,
                filters['circularity'].get('start', 0),
                filters['circularity'].get('end', 1)
            )
        
        if filters.get('length', {}).get('enabled', False):
            filtered_mask = filter_by_length(
                filtered_mask,
                filters['length'].get('min', 0),
                filters['length'].get('max', 100)
            )
        
        if filters.get('width', {}).get('enabled', False):
            filtered_mask = filter_by_width(
                filtered_mask,
                filters['width'].get('min', 0),
                filters['width'].get('max', 100)
            )
        
        return filtered_mask
    except Exception as e:
        print(f"Error applying shape filters: {str(e)}")
        return mask

def filter_by_circularity(mask, min_circ, max_circ):
    """
    Filter regions by circularity
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filtered_mask = np.zeros_like(mask)
    
    for contour in contours:
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        if perimeter > 0:
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            if min_circ <= circularity <= max_circ:
                cv2.drawContours(filtered_mask, [contour], -1, 255, -1)
    
    return filtered_mask

def filter_by_length(mask, min_length, max_length):
    """
    Filter regions by length
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filtered_mask = np.zeros_like(mask)
    
    for contour in contours:
        _, _, w, h = cv2.boundingRect(contour)
        length = max(w, h)
        if min_length <= length <= max_length:
            cv2.drawContours(filtered_mask, [contour], -1, 255, -1)
    
    return filtered_mask

def filter_by_width(mask, min_width, max_width):
    """
    Filter regions by width
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filtered_mask = np.zeros_like(mask)
    
    for contour in contours:
        _, _, w, h = cv2.boundingRect(contour)
        width = min(w, h)
        if min_width <= width <= max_width:
            cv2.drawContours(filtered_mask, [contour], -1, 255, -1)
    
    return filtered_mask 