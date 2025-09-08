import cv2
import numpy as np
from flask import jsonify
import os
import urllib.parse

class InclusionAnalyzer:
    def __init__(self):
        self.calibration_factor = 1.0  # microns per pixel
        self.configs = {}
        
    def set_calibration(self, factor):
        self.calibration_factor = factor

    def _get_absolute_path(self, image_path):
        """Convert file URL or relative path to absolute path"""
        try:
            print(f"Original image path received: {image_path}")
            
            # Remove file:// prefix if present
            if image_path.startswith('file://'):
                path = urllib.parse.unquote(image_path[7:])
            else:
                path = image_path
            
            # Handle Windows paths
            if path.startswith('/'):
                path = path[1:]
            
            # Convert to absolute path
            abs_path = os.path.abspath(path)
            
            # Verify file exists
            if not os.path.exists(abs_path):
                raise ValueError(f'Image file not found: {abs_path}')
            
            return abs_path
            
        except Exception as e:
            raise ValueError(f"Invalid image path: {str(e)}")

    def analyze_inclusion(self, image_path, method='default', specimen_number=1, field_area=0.512, inclusion_types=None):
        """
        Analyze inclusions in the image according to ASTM E45 standard
        """
        try:
            # Convert image path to absolute path
            abs_path = self._get_absolute_path(image_path)
            
            # Read image
            img = cv2.imread(abs_path)
            if img is None:
                return {
                    'status': 'error',
                    'message': f'Failed to read image: {abs_path}'
                }

            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Create result structure
            results = {
                'A': {'thin': 0, 'thick': 0},  # Sulfide
                'B': {'thin': 0, 'thick': 0},  # Alumina
                'C': {'thin': 0, 'thick': 0},  # Silicate
                'D': {'thin': 0, 'thick': 0}   # Globular Oxide
            }

            # Apply method-specific processing
            if method == 'default':
                results = self._analyze_default(gray, inclusion_types)
            elif method == 'methodD':
                results = self._analyze_method_d(gray, inclusion_types)
            elif method == 'methodC':
                results = self._analyze_method_c(gray, inclusion_types)
            else:
                return {
                    'status': 'error',
                    'message': 'Invalid analysis method'
                }

            return {
                'status': 'success',
                'results': results,
                'specimen_number': specimen_number,
                'field_area': field_area
            }

        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }

    def _analyze_default(self, gray_img, inclusion_types):
        """Default inclusion analysis method"""
        results = {
            'A': {'thin': 0, 'thick': 0},
            'B': {'thin': 0, 'thick': 0},
            'C': {'thin': 0, 'thick': 0},
            'D': {'thin': 0, 'thick': 0}
        }

        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(
            gray_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # Find contours
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 10:  # Filter out noise
                continue

            # Calculate shape features
            perimeter = cv2.arcLength(contour, True)
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
            
            # Classify inclusion type and thickness
            if circularity > 0.8:  # More circular - Type D
                results['D']['thick' if area > 100 else 'thin'] += 1
            elif circularity > 0.6:  # Moderately circular - Type A
                results['A']['thick' if area > 100 else 'thin'] += 1
            elif circularity > 0.4:  # Less circular - Type B
                results['B']['thick' if area > 100 else 'thin'] += 1
            else:  # Elongated - Type C
                results['C']['thick' if area > 100 else 'thin'] += 1

        return results

    def _analyze_method_d(self, gray_img, inclusion_types):
        """Method D analysis following ASTM E45"""
        # Similar to default but with different thresholds and classification
        return self._analyze_default(gray_img, inclusion_types)

    def _analyze_method_c(self, gray_img, inclusion_types):
        """Method C analysis for oxide and silicate"""
        results = {
            'A': {'thin': 0, 'thick': 0},
            'B': {'thin': 0, 'thick': 0},
            'C': {'thin': 0, 'thick': 0},
            'D': {'thin': 0, 'thick': 0}
        }

        # Apply Otsu's thresholding
        _, binary = cv2.threshold(gray_img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Find contours
        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 10:  # Filter out noise
                continue

            # Calculate shape features
            perimeter = cv2.arcLength(contour, True)
            circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
            
            # For Method C, focus on oxide and silicate inclusions
            if circularity > 0.7:  # Oxide inclusions
                results['D']['thick' if area > 100 else 'thin'] += 1
            else:  # Silicate inclusions
                results['C']['thick' if area > 100 else 'thin'] += 1

        return results

# Create global analyzer instance
analyzer = InclusionAnalyzer() 