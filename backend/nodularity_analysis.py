import cv2
import numpy as np
from flask import jsonify
import os
import json
from scipy import stats
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from porosity_analysis import PorosityAnalyzer
from fpdf import FPDF
from datetime import datetime

class NodularityAnalyzer(PorosityAnalyzer):
    def __init__(self):
        super().__init__()
        self.nodule_sizes = {
            1: {'min': 0, 'max': 10},    # Size ranges in microns
            2: {'min': 10, 'max': 20},
            3: {'min': 20, 'max': 30},
            4: {'min': 30, 'max': 40},
            5: {'min': 40, 'max': 50},
            6: {'min': 50, 'max': 60},
            7: {'min': 60, 'max': 70},
            8: {'min': 70, 'max': float('inf')}
        }
        self.circularity_cutoff = 0.5
        self.manual_selections = set()  # Store manually selected/unselected nodules
        self.cumulative_results = [] # Initialize list to store cumulative results
        
    def analyze_nodularity(self, image_path, threshold=128, circularity_cutoff=0.5, prep_option=None, filter_settings=None):
        """
        Analyze nodularity in the image with enhanced preprocessing and filtering.
        """
        try:
            # Convert image path to absolute path
            abs_path = self._get_absolute_path(image_path)

            # Apply image preparation if specified
            if prep_option:
                prep_result = self.prepare_image(abs_path, prep_option)
                if prep_result['status'] == 'error':
                    return prep_result # Return error from prepare_image
                # Use the prepared image for analysis
                img = cv2.imread(prep_result['filepath'])
            else:
                img = cv2.imread(abs_path)
            
            if img is None:
                return {
                    'status': 'error',
                    'message': f'Failed to read image after preparation: {abs_path}'
                }

            # Create copies for processing and display
            display_img = img.copy()
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            height, width = gray.shape[:2] # Get dimensions for border filtering

            # Apply threshold
            _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
            
            # Find contours - changed to RETR_LIST to find all contours
            contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            
            # Analyze each potential nodule
            nodules = []
            non_nodules = []
            
            for i, contour in enumerate(contours):
                # Calculate properties
                area = cv2.contourArea(contour)
                perimeter = cv2.arcLength(contour, True)
                x, y, w, h = cv2.boundingRect(contour)

                # Filter out contours that are too large (e.g., image border)
                image_area = height * width
                if area / image_area > 0.90:  # If contour area is more than 90% of image area, skip it
                    continue
                
                # Calculate circularity
                circularity = 4 * np.pi * area / (perimeter * perimeter) if perimeter > 0 else 0
                
                # Calculate equivalent diameter for more accurate width
                equivalent_diameter = np.sqrt(4 * area / np.pi)

                # Convert measurements to microns using self.calibration_factor
                length = h * self.calibration_factor
                width_micron = equivalent_diameter * self.calibration_factor
                area_microns = area * (self.calibration_factor ** 2)
                perimeter_microns = perimeter * self.calibration_factor
                
                # Apply additional filters if provided
                if filter_settings:
                    if not self._validate_pore_against_filters(length, width_micron, area_microns, circularity, filter_settings):
                        continue

                # Determine nodule size category
                size_category = self._get_nodule_size_category(length)
                
                # Check if this is a manually selected/unselected nodule
                contour_id = f"{x}_{y}_{w}_{h}"
                is_manually_selected = contour_id in self.manual_selections
                
                # Determine if it's a nodule based on circularity and manual selection
                is_nodule = (circularity >= circularity_cutoff) if not is_manually_selected else True
                
                feature_data = {
                    'id': i + 1,
                    'length': round(length, 2),
                    'width': round(width_micron, 2),
                    'area': round(area_microns, 2),
                    'circularity': round(circularity, 3),
                    'perimeter': round(perimeter_microns, 2), # Add perimeter to feature data
                    'size_category': size_category,
                    'x': x,
                    'y': y,
                    'w': w,
                    'h': h,
                    'contour': contour.tolist()
                }
                
                if is_nodule:
                    nodules.append(feature_data)
                    # Draw green contour for nodules
                    cv2.drawContours(display_img, [contour], -1, (0, 255, 0), 2)
                else:
                    non_nodules.append(feature_data)
                    # Draw red contour for non-nodules
                    cv2.drawContours(display_img, [contour], -1, (0, 0, 255), 2)
                
                # Add ID label
                cv2.putText(display_img, str(i+1), (x+w//2, y+h//2),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Calculate nodularity statistics
            total_features = len(nodules) + len(non_nodules)
            nodularity_percent = (len(nodules) / total_features * 100) if total_features > 0 else 0
            
            # Size distribution
            size_distribution = {size: 0 for size in range(1, 9)}
            for nodule in nodules:
                size_distribution[nodule['size_category']] += 1
            
            # Save the processed image
            output_dir = os.path.dirname(abs_path)
            base_name = os.path.splitext(os.path.basename(abs_path))[0]
            output_path = os.path.join(output_dir, f"{base_name}_nodularity.png")
            cv2.imwrite(output_path, display_img)
            
            # Generate histogram data
            histogram_data = self._generate_histogram(gray, threshold)
            
            return {
                'status': 'success',
                'nodules': nodules,
                'non_nodules': non_nodules,
                'statistics': {
                    'total_features': total_features,
                    'total_nodules': len(nodules),
                    'nodularity_percent': round(nodularity_percent, 2),
                    'size_distribution': size_distribution,
                    'mean_circularity': np.mean([n['circularity'] for n in nodules]) if nodules else 0,
                    'mean_area': np.mean([n['area'] for n in nodules]) if nodules else 0
                },
                'histogram': histogram_data,
                'analyzed_image_path': output_path
            }
            
        except Exception as e:
            print(f"Error in analyze_nodularity: {str(e)}")
            return {
                'status': 'error',
                'message': f'Error analyzing nodularity: {str(e)}'
            }
    
    def _get_nodule_size_category(self, length):
        """Determine the size category (1-8) based on nodule length"""
        for size, range_data in self.nodule_sizes.items():
            if range_data['min'] <= length < range_data['max']:
                return size
        return 8  # Default to largest category if no match
    
    def _generate_histogram(self, gray_image, current_threshold):
        """Generate histogram data for the grayscale image"""
        hist = cv2.calcHist([gray_image], [0], None, [256], [0, 256])
        return {
            'counts': hist.flatten().tolist(),
            'bins': list(range(256)),
            'current_threshold': current_threshold
        }
    
    def toggle_nodule_selection(self, x, y, w, h):
        """Toggle manual selection of a nodule"""
        contour_id = f"{x}_{y}_{w}_{h}"
        if contour_id in self.manual_selections:
            self.manual_selections.remove(contour_id)
        else:
            self.manual_selections.add(contour_id)
        return True
    
    def set_circularity_cutoff(self, cutoff):
        """Set the circularity cutoff value"""
        self.circularity_cutoff = max(0.0, min(1.0, cutoff))
        return True
    
    def update_nodule_sizes(self, size_ranges):
        """Update the nodule size category ranges"""
        for size, range_data in size_ranges.items():
            if int(size) in self.nodule_sizes:
                self.nodule_sizes[int(size)] = {
                    'min': float(range_data['min']),
                    'max': float(range_data['max'])
                }
        return True

    def add_current_image_result_to_cumulative(self, result_data):
        """Add the result of the current image analysis to the cumulative list."""
        self.cumulative_results.append(result_data)
        return True

    def get_cumulative_results(self):
        """Retrieve all stored cumulative results."""
        return self.cumulative_results

    def clear_cumulative_results(self):
        """Clear all stored cumulative results."""
        self.cumulative_results = []
        return True

    def delete_config(self, name):
        """Delete a saved configuration by name."""
        if name in self.configs:
            del self.configs[name]
            return True
        return False

    def save_cumulative_results(self, filepath):
        """Save all cumulative results to a JSON file."""
        try:
            with open(filepath, 'w') as f:
                json.dump(self.cumulative_results, f, indent=4)
            return {'status': 'success', 'message': f'Cumulative results saved to {filepath}'}
        except Exception as e:
            return {'status': 'error', 'message': f'Error saving cumulative results: {str(e)}'}

    def load_cumulative_results(self, filepath):
        """Load cumulative results from a JSON file."""
        try:
            with open(filepath, 'r') as f:
                self.cumulative_results = json.load(f)
            return {'status': 'success', 'message': f'Cumulative results loaded from {filepath}'}
        except Exception as e:
            return {'status': 'error', 'message': f'Error loading cumulative results: {str(e)}'}

    def generate_report(self, report_type, image_paths='all', include_flake_phase_data=False):
        """Generate a report (PDF/Excel) with nodule statistics.
        Actual report generation logic is implemented here.
        """
        try:
            if report_type == 'PDF':
                pdf = FPDF(format='A4')
                pdf.set_auto_page_break(auto=True, margin=15)
                pdf.add_page()

                # Add title and timestamp
                pdf.set_font('Arial', 'B', 16)
                pdf.cell(0, 10, 'Nodularity Analysis Report', 0, 1, 'C')
                pdf.set_font('Arial', '', 10)
                pdf.cell(0, 5, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'R')

                # Gather data based on image_paths (for simplicity, use cumulative_results for now)
                # In a real scenario, you'd load specific image data if image_paths is not 'all'
                analysis_results = self.cumulative_results

                for result in analysis_results:
                    pdf.add_page()
                    pdf.set_font('Arial', 'B', 14)
                    pdf.cell(0, 10, f'Image: {os.path.basename(result.get("analyzed_image_path", "N/A"))}', 0, 1, 'L')

                    # Add image if available
                    image_path = result.get('analyzed_image_path', '')
                    if image_path and os.path.exists(image_path):
                        try:
                            # Scale image to fit within PDF, maintaining aspect ratio
                            img_width = 190 # Max width for image
                            img = cv2.imread(image_path)
                            if img is not None:
                                h_img, w_img = img.shape[:2]
                                aspect_ratio = w_img / h_img
                                img_height = img_width / aspect_ratio
                                pdf.image(image_path, x=10, y=pdf.get_y(), w=img_width, h=img_height)
                                pdf.ln(img_height + 5) # Move cursor after image
                            else:
                                pdf.cell(0, 10, 'Image not found or unreadable', 0, 1)
                        except Exception as img_error:
                            print(f"Error adding image to PDF: {str(img_error)}")
                            pdf.cell(0, 10, f'Error loading image: {str(img_error)}', 0, 1)

                    # Add statistics
                    pdf.ln(10)
                    pdf.set_font('Arial', 'B', 12)
                    pdf.cell(0, 10, 'Analysis Results', 0, 1)
                    pdf.set_font('Arial', '', 10)

                    statistics = result.get('statistics', {})
                    if statistics:
                        stats_data = [
                            ['Total Features', statistics.get('total_features', 0)],
                            ['Total Nodules', statistics.get('total_nodules', 0)],
                            ['Nodularity %', f"{statistics.get('nodularity_percent', 0)}%"],
                            ['Mean Circularity', f"{statistics.get('mean_circularity', 0):.3f}"],
                            ['Mean Area', f"{statistics.get('mean_area', 0):.2f}"]
                        ]

                        for label, value in stats_data:
                            pdf.cell(60, 6, label, 1)
                            pdf.cell(30, 6, str(value), 1)
                            pdf.ln()

                    # Add size distribution
                    if statistics.get('size_distribution'):
                        pdf.ln(10)
                        pdf.set_font('Arial', 'B', 12)
                        pdf.cell(0, 10, 'Size Distribution', 0, 1)
                        pdf.set_font('Arial', '', 10)

                        for size, count in statistics['size_distribution'].items():
                            pdf.cell(60, 6, f"Size {size}", 1)
                            pdf.cell(30, 6, str(count), 1)
                            pdf.ln()

                    # Add nodule details (optional, if needed and results are available)
                    nodules = result.get('nodules', [])
                    if nodules:
                        pdf.ln(10)
                        pdf.set_font('Arial', 'B', 12)
                        pdf.cell(0, 10, 'Nodule Details', 0, 1)
                        pdf.set_font('Arial', '', 8)
                        # Table header
                        pdf.cell(10, 6, 'ID', 1)
                        pdf.cell(20, 6, 'Length', 1)
                        pdf.cell(20, 6, 'Width', 1)
                        pdf.cell(20, 6, 'Area', 1)
                        pdf.cell(20, 6, 'Circ.', 1)
                        pdf.cell(20, 6, 'Per.', 1)
                        pdf.cell(20, 6, 'Size Cat.', 1)
                        pdf.ln()
                        # Table data
                        for nodule in nodules:
                            pdf.cell(10, 6, str(nodule.get('id', '')), 1)
                            pdf.cell(20, 6, str(round(nodule.get('length', 0), 2)), 1)
                            pdf.cell(20, 6, str(round(nodule.get('width', 0), 2)), 1)
                            pdf.cell(20, 6, str(round(nodule.get('area', 0), 2)), 1)
                            pdf.cell(20, 6, str(round(nodule.get('circularity', 0), 3)), 1)
                            pdf.cell(20, 6, str(round(nodule.get('perimeter', 0), 2)), 1)
                            pdf.cell(20, 6, str(nodule.get('size_category', '')), 1)
                            pdf.ln()


                pdf_output = BytesIO()
                pdf.output(pdf_output)
                pdf_output.seek(0)
                return {'status': 'success', 'message': 'PDF report generated', 'data': pdf_output.getvalue()}
            elif report_type == 'Excel':
                # Placeholder for Excel generation
                return {'status': 'success', 'message': 'Excel report generation initiated (placeholder)', 'data': None}
            else:
                return {'status': 'error', 'message': 'Invalid report type'}
        except Exception as e:
            print(f"Error generating report: {str(e)}")
            return {'status': 'error', 'message': f'Error generating report: {str(e)}'}

# Create global analyzer instance
nodularity_analyzer = NodularityAnalyzer() 