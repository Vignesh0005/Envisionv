import os
import sys
import logging
import time
from datetime import datetime
import json
import shutil
import tempfile
import filetype
from io import BytesIO

os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    filename="logs/camera_server.log",
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
sys.stdout = open("logs/stdout.log", "w")
sys.stderr = open("logs/stderr.log", "w")

from flask import Flask, Response, jsonify, request, send_file, make_response
from flask_cors import CORS
import cv2
import threading
from pathlib import Path
from PIL import Image
import numpy as np
import json
from porosity_analysis import PorosityAnalyzer
from MvCameraControl_class import *
from ctypes import c_float, byref
from CameraParams_header import MVCC_INTVALUE, MVCC_FLOATVALUE, MVCC_ENUMVALUE
import atexit
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from phase_analysis import analyze_phase
from fpdf import FPDF
from werkzeug.utils import secure_filename
from nodularity_analysis import nodularity_analyzer



app = Flask(__name__)
# Configure CORS to allow requests from the React app
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000", "app://*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"],
        "max_age": 3600
    }
})

# Global observer for file system events
observer = None

# Phase analysis configurations
phase_configurations = {}
analysis_results = {}

# Initialize the porosity analyzer
analyzer = PorosityAnalyzer()

class ConfigurationManager:
    """Manages saving and loading of configurations"""
    
    def __init__(self, config_dir="calibration_data"):
        self.config_dir = config_dir
        self.config_file = os.path.join(config_dir, "phase_configurations.json")
        self._ensure_config_dir()
        
    def _ensure_config_dir(self):
        """Ensure configuration directory exists"""
        try:
            os.makedirs(self.config_dir, exist_ok=True)
            if not os.path.exists(self.config_file):
                self._save_configs({})
        except Exception as e:
            print(f"Error creating config directory: {str(e)}")
            
    def _save_configs(self, configs):
        """Atomically save configurations to file"""
        try:
            # Create temp file
            with tempfile.NamedTemporaryFile(mode='w', delete=False) as tf:
                json.dump(configs, tf, indent=2)
                temp_name = tf.name
                
            # Atomic replace
            shutil.move(temp_name, self.config_file)
        except Exception as e:
            print(f"Error saving configurations: {str(e)}")
            if os.path.exists(temp_name):
                os.unlink(temp_name)
                
    def save_configuration(self, name, config):
        """Save a new configuration"""
        try:
            configs = self.get_configurations()
            configs[name] = config
            self._save_configs(configs)
            return True
        except Exception as e:
            print(f"Error saving configuration '{name}': {str(e)}")
            return False
            
    def get_configurations(self):
        """Get all saved configurations"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            print(f"Error loading configurations: {str(e)}")
            return {}
            
    def get_configuration(self, name):
        """Get a specific configuration by name"""
        try:
            configs = self.get_configurations()
            return configs.get(name)
        except Exception as e:
            print(f"Error getting configuration '{name}': {str(e)}")
            return None

# Initialize configuration manager after class definition
config_manager = ConfigurationManager()

class WebcamManager:
    def __init__(self):
        self.camera = None
        self.is_recording = False
        self.frame = None
        self.thread = None
        self.last_frame = None
        self.user_save_path = None
        self.default_save_path = 'C:\\Users\\Public\\MicroScope_Images'
        self.temp_dir = None
        self.current_camera_type = None
        self.hikrobot_camera = None
        self.current_resolution = None
        self.current_zoom = 1.0
        self.frame_lock = threading.Lock()
        
        # Initialize with default path
        self.set_save_path(self.default_save_path)

    def set_save_path(self, path=None):
        """Set save path and create necessary directories"""
        try:
            if path:
                self.user_save_path = path
            else:
                self.user_save_path = self.default_save_path
                
            # Create main directory
            os.makedirs(self.user_save_path, exist_ok=True)
            
            # Update temp directory path
            self.temp_dir = os.path.join(self.user_save_path, 'temp')
            os.makedirs(self.temp_dir, exist_ok=True)
            
            return True
        except Exception as e:
            print(f"Error setting save path: {str(e)}")
            return False

    def get_current_save_path(self):
        """Get current save path"""
        return self.user_save_path or self.default_save_path

    def get_temp_path(self, original_path, suffix):
        """Generate a path in temp directory maintaining original filename"""
        filename = os.path.basename(original_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_{suffix}{ext}"
        return os.path.join(self.temp_dir, new_filename)

    def clear_temp_directory(self):
        """Clear all files in temp directory"""
        try:
            for file in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, file)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f"Error deleting {file_path}: {str(e)}")
        except Exception as e:
            print(f"Error clearing temp directory: {str(e)}")

    def save_to_main_directory(self, temp_path):
        """Save temp file to main directory and clear temp"""
        try:
            if not temp_path or not os.path.exists(temp_path):
                return None
                
            filename = os.path.basename(temp_path)
            new_path = os.path.join(self.get_current_save_path(), filename)
            
            img = cv2.imread(temp_path)
            cv2.imwrite(new_path, img, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
            
            # Clear temp directory after successful save
            self.clear_temp_directory()
            
            return new_path
            
        except Exception as e:
            print(f"Error saving to main directory: {str(e)}")
            return None

    def start_camera(self, camera_type=None):
        try:
            if self.camera is not None:
                self.stop_camera()

            print(f"Starting camera with type: {camera_type}")

            if camera_type == "HIKERBOT":
                # Initialize HIKROBOT camera
                self.hikrobot_camera = MvCamera()
                
                # Initialize SDK
                ret = self.hikrobot_camera.MV_CC_Initialize()
                if ret != 0:
                    print("Initialize SDK fail!")
                    return False

                # Enumerate devices
                deviceList = MV_CC_DEVICE_INFO_LIST()
                ret = self.hikrobot_camera.MV_CC_EnumDevices(MV_GIGE_DEVICE | MV_USB_DEVICE, deviceList)
                if ret != 0:
                    print("Enum Devices fail!")
                    return False

                if deviceList.nDeviceNum == 0:
                    print("No HIKROBOT camera found!")
                    return False

                # Select first available device
                stDeviceList = cast(deviceList.pDeviceInfo[0], POINTER(MV_CC_DEVICE_INFO)).contents

                # Create handle
                ret = self.hikrobot_camera.MV_CC_CreateHandle(stDeviceList)
                if ret != 0:
                    print("Create Handle fail!")
                    return False

                # Open device
                ret = self.hikrobot_camera.MV_CC_OpenDevice(MV_ACCESS_Exclusive, 0)
                if ret != 0:
                    print("Open Device fail!")
                    return False

                # Start grabbing
                ret = self.hikrobot_camera.MV_CC_StartGrabbing()
                if ret != 0:
                    print("Start Grabbing fail!")
                    return False

                self.camera = self.hikrobot_camera
                self.current_camera_type = 'HIKERBOT'
                
                # Set initial zoom based on current magnification
                if hasattr(self, 'current_zoom'):
                    self.set_digital_zoom(f"{int(self.current_zoom * 100)}x")
            else:
                # Default webcam (index 0)
                print("Using default webcam")
                self.camera = cv2.VideoCapture(0)
                self.current_camera_type = 'WEBCAM'

            self.is_recording = True
            self.thread = threading.Thread(target=self.capture_frames)
            self.thread.daemon = True
            self.thread.start()
            
            return True
        except Exception as e:
            print(f"Error starting camera: {str(e)}")
            return False

    def capture_frames(self):
        """Continuously capture frames from the camera"""
        while self.is_recording:
            try:
                if self.current_camera_type == 'HIKERBOT':
                    frame = self.get_frame()
                    if frame is not None:
                        ret, buffer = cv2.imencode('.jpg', frame)
                        if ret:
                            self.frame = buffer.tobytes()
                            self.last_frame = self.frame
                else:
                    if self.camera is None or not self.camera.isOpened():
                        break

                    success, frame = self.camera.read()
                    if success:
                        frame = cv2.flip(frame, 1)
                        ret, buffer = cv2.imencode('.jpg', frame)
                        if ret:
                            self.frame = buffer.tobytes()
                            self.last_frame = self.frame

                time.sleep(0.033)  # ~30 FPS
            except Exception as e:
                print(f"Error capturing frame: {str(e)}")
                time.sleep(0.1)

        self.is_recording = False

    def stop_camera(self):
        self.is_recording = False
        if self.thread:
            self.thread.join(timeout=1.0)
        
        if self.current_camera_type == 'HIKERBOT':
            if self.camera:
                self.camera.MV_CC_StopGrabbing()
                self.camera.MV_CC_CloseDevice()
                self.camera.MV_CC_DestroyHandle()
        else:
            if self.camera:
                self.camera.release()
        
        self.camera = None
        self.frame = None
        self.current_camera_type = None

    def take_snapshot(self, save_path=None):
        if self.last_frame:
            try:
                # Use provided save path or default
                if not save_path:
                    save_path = self.get_current_save_path()
                
                # Create directory if it doesn't exist
                os.makedirs(save_path, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"microscope_{timestamp}.jpg"
                filepath = os.path.join(save_path, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(self.last_frame)
                
                print(f"Snapshot saved to: {filepath}")
                return filepath
            except Exception as e:
                print(f"Error taking snapshot: {str(e)}")
                return None
        return None

    def set_resolution(self, width, height):
        if self.current_camera_type == 'HIKERBOT' and self.camera:
            try:
                # Store the desired display resolution
                self.current_resolution = (width, height)
                
                # Get the current sensor resolution
                nWidth = c_uint()
                nHeight = c_uint()
                ret = self.camera.MV_CC_GetIntValue("Width", nWidth)
                if ret != 0:
                    print("Failed to get width")
                    return False
                    
                ret = self.camera.MV_CC_GetIntValue("Height", nHeight)
                if ret != 0:
                    print("Failed to get height")
                    return False
                    
                original_width = nWidth.value
                original_height = nHeight.value
                
                # Calculate scaling factors
                scale_x = width / original_width
                scale_y = height / original_height
                
                # Use the smaller scaling factor to maintain aspect ratio
                scale = min(scale_x, scale_y)
                
                # Calculate new dimensions that maintain aspect ratio
                display_width = int(original_width * scale)
                display_height = int(original_height * scale)
                
                # Update current resolution with the actual display dimensions
                self.current_resolution = (display_width, display_height)
                
                return True
                
            except Exception as e:
                print(f"Error setting resolution: {str(e)}")
                return False
        return False

    def set_digital_zoom(self, magnification):
        """Set digital zoom based on magnification value"""
        try:
            if self.current_camera_type != 'HIKERBOT' or not self.hikrobot_camera:
                print("Digital zoom only available for HIKROBOT cameras")
                return False
                
            # Convert magnification (e.g., '100x') to zoom factor
            try:
                # Remove 'x' and convert to float
                zoom_factor = float(magnification.replace('x', ''))
                # Convert to proper zoom factor (e.g., 100x = 1.0, 200x = 2.0, 50x = 0.5)
                normalized_zoom = zoom_factor / 100.0
                print(f"Setting zoom factor to: {normalized_zoom} from magnification {magnification}")
            except ValueError as e:
                print(f"Invalid magnification format: {magnification}")
                return False

            # Set digital zoom
            ret = self.hikrobot_camera.MV_CC_SetDigitalZoom(c_float(normalized_zoom))
            if ret == 0:
                self.current_zoom = normalized_zoom
                print(f"Successfully set digital zoom to {normalized_zoom}x")
                return True
            else:
                print(f"Failed to set digital zoom (error code: {ret})")
                return False
                
        except Exception as e:
            print(f"Error setting digital zoom: {str(e)}")
            return False
            
    def get_digital_zoom(self):
        """Get current digital zoom factor"""
        try:
            if self.current_camera_type != 'HIKERBOT' or not self.hikrobot_camera:
                return None
                
            zoom_factor = c_float()
            ret = self.hikrobot_camera.MV_CC_GetDigitalZoom(byref(zoom_factor))
            if ret == 0:
                return zoom_factor.value
            return None
        except Exception as e:
            print(f"Error getting zoom: {str(e)}")
            return None

    def get_frame(self):
        """Get the current frame from the camera"""
        with self.frame_lock:
            if self.current_camera_type == 'HIKERBOT':
                if not self.hikrobot_camera:
                    return None
                    
                stOutFrame = MV_FRAME_OUT()
                ret = self.hikrobot_camera.MV_CC_GetImageBuffer(stOutFrame, 1000)
                if ret == 0:
                    # Get original dimensions
                    original_width = stOutFrame.stFrameInfo.nWidth
                    original_height = stOutFrame.stFrameInfo.nHeight

                    # Get current display resolution
                    display_width, display_height = self.current_resolution if self.current_resolution else (original_width, original_height)

                    pData = (c_ubyte * stOutFrame.stFrameInfo.nFrameLen)()
                    cdll.msvcrt.memcpy(byref(pData), stOutFrame.pBufAddr, stOutFrame.stFrameInfo.nFrameLen)
                    data = np.frombuffer(pData, count=int(stOutFrame.stFrameInfo.nFrameLen), dtype=np.uint8)
                    frame = data.reshape((original_height, original_width, -1))
                    
                    # Resize frame to display resolution while maintaining aspect ratio
                    if self.current_resolution:
                        aspect_ratio = original_width / original_height
                        target_aspect = display_width / display_height
                        
                        if aspect_ratio > target_aspect:
                            # Width limited by display width
                            new_width = display_width
                            new_height = int(display_width / aspect_ratio)
                        else:
                            # Height limited by display height
                            new_height = display_height
                            new_width = int(display_height * aspect_ratio)
                            
                        frame = cv2.resize(frame, (new_width, new_height))
                    
                    # Release buffer
                    self.hikrobot_camera.MV_CC_FreeImageBuffer(stOutFrame)
                    return frame
                    
            else:
                # Regular webcam capture
                if self.camera is None or not self.camera.isOpened():
                    return None

                success, frame = self.camera.read()
                if success:
                    frame = cv2.flip(frame, 1)
                    return frame
                    
            return None

webcam = WebcamManager()

@app.route('/api/start-camera', methods=['POST'])
def start_camera():
    try:
        data = request.get_json()
        camera_type = data.get('cameraType')
        print(f"Starting camera with type: {camera_type}")  # Debug log
        
        if webcam.start_camera(camera_type):
            return jsonify({'status': 'success'})
        return jsonify({'status': 'error', 'message': 'Failed to start camera'})
    except Exception as e:
        print(f"Error in start_camera route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)})

@app.route('/api/stop-camera', methods=['POST'])
def stop_camera():
    webcam.stop_camera()
    return jsonify({'status': 'success'})

@app.route('/api/video-feed')
def video_feed():
    def generate():
        while True:
            try:
                if not webcam.is_recording:
                    time.sleep(0.1)
                    continue
                    
                if webcam.current_camera_type == 'HIKERBOT':
                    frame = webcam.get_frame()
                    if frame is None:
                        time.sleep(0.033)
                        continue
                        
                    # Convert frame to JPEG
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if not ret:
                        continue
                        
                    frame_bytes = buffer.tobytes()
                    webcam.frame = frame_bytes  # Update the current frame
                    webcam.last_frame = frame_bytes  # Update last frame
                    
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                else:
                    # Regular webcam
                    success, frame = webcam.camera.read() if webcam.camera else (False, None)
                    if not success:
                        time.sleep(0.033)
                        continue
                        
                    frame = cv2.flip(frame, 1)
                    ret, buffer = cv2.imencode('.jpg', frame)
                    if not ret:
                        continue
                        
                    frame_bytes = buffer.tobytes()
                    webcam.frame = frame_bytes  # Update the current frame
                    webcam.last_frame = frame_bytes  # Update last frame
                    
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                time.sleep(0.033)  # ~30 FPS
                
            except Exception as e:
                print(f"Error in video feed: {str(e)}")
                time.sleep(0.1)
                continue

    return Response(generate(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/snapshot', methods=['POST'])
def take_snapshot():
    try:
        data = request.get_json()
        save_path = data.get('savePath') if data else None
        magnification = data.get('magnification', '100x')  # Get magnification from request
        
        filepath = webcam.take_snapshot(save_path)
        if filepath:
            # Modify the filename to include magnification
            directory = os.path.dirname(filepath)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            new_filename = f"microscope_{magnification}_{timestamp}.jpg"
            new_filepath = os.path.join(directory, new_filename)
            
            # Rename the file
            os.rename(filepath, new_filepath)
            
            return jsonify({
                'status': 'success',
                'filepath': new_filepath
            })
        return jsonify({
            'status': 'error',
            'message': 'Failed to take snapshot'
        })
    except Exception as e:
        print(f"Error in snapshot route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/get-image')
def get_image():
    try:
        image_path = request.args.get('path')
        if not image_path:
            return jsonify({'error': 'No path provided'}), 400
        
        if not os.path.exists(image_path):
            return jsonify({'error': 'Image not found'}), 404

        return send_file(image_path, mimetype='image/jpeg')
    except Exception as e:
        print(f"Error serving image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/import-image', methods=['POST'])
def import_image():
    try:
        print("Starting import process...")
        
        if 'file' not in request.files:
            print("No file part in request. Files received:", request.files)
            return jsonify({
                'status': 'error',
                'message': 'No file part'
            }), 400
            
        file = request.files['file']
        print(f"Received file: {file.filename}")
        
        if file.filename == '':
            print("No selected file")
            return jsonify({
                'status': 'error',
                'message': 'No selected file'
            }), 400

        if file:
            try:
                filename = secure_filename(file.filename)
                save_dir = webcam.get_current_save_path()  # Use WebcamManager's default path
                print(f"Using save directory: {save_dir}")
                
                os.makedirs(save_dir, exist_ok=True)
                
                # Add timestamp to filename to avoid conflicts
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                base, ext = os.path.splitext(filename)
                filename = f"{base}_{timestamp}{ext}"
                
                filepath = os.path.join(save_dir, filename)
                print(f"Attempting to save file to: {filepath}")
                
                # Save the file
                file.save(filepath)
                print(f"File saved successfully")
                
                # Verify file exists and is readable
                if os.path.exists(filepath):
                    try:
                        # Try to open the file to verify it's valid
                        with open(filepath, 'rb') as test_file:
                            test_file.read(1024)  # Read first 1KB to verify file
                        
                        print(f"File verified at: {filepath}")
                        return jsonify({
                            'status': 'success',
                            'filepath': filepath
                        })
                    except Exception as read_error:
                        print(f"File exists but cannot be read: {str(read_error)}")
                        return jsonify({
                            'status': 'error',
                            'message': 'File saved but cannot be read'
                        }), 500
                else:
                    print(f"File not found after saving")
                    return jsonify({
                        'status': 'error',
                        'message': 'File not found after saving'
                    }), 500
                    
            except Exception as save_error:
                print(f"Error saving file: {str(save_error)}")
                return jsonify({
                    'status': 'error',
                    'message': f'Error saving file: {str(save_error)}'
                }), 500
            
    except Exception as e:
        print(f"Error in import process: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/rotate-image', methods=['POST'])
def rotate_image():
    try:
        data = request.get_json()
        image_path = data.get('imagePath')
        direction = data.get('direction', 'clockwise')
        
        if not image_path or not os.path.exists(image_path):
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        if direction == 'clockwise':
            rotated_img = np.rot90(img, k=-1)
        else:
            rotated_img = np.rot90(img, k=1)

        # Save to temp directory
        temp_path = webcam.get_temp_path(image_path, 'rotated')
        cv2.imwrite(temp_path, rotated_img, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        return jsonify({
            'status': 'success',
            'filepath': temp_path
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/flip-image', methods=['POST'])
def flip_image():
    try:
        print("Flip endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        direction = data.get('direction', 'horizontal')
        
        print(f"Processing flip: {direction} for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Flip the image based on direction
        if direction == 'horizontal':
            flipped_img = cv2.flip(img, 1)  # 1 for horizontal flip
        else:
            flipped_img = cv2.flip(img, 0)  # 0 for vertical flip

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_flipped{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving flipped image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, flipped_img, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Flip completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during flip: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/set-camera-resolution', methods=['POST'])
def set_camera_resolution():
    try:
        data = request.get_json()
        resolution = data.get('resolution')  # This will be like "1920x1080"
        
        if not resolution or 'x' not in resolution:
            return jsonify({
                'status': 'error',
                'message': 'Invalid resolution format'
            }), 400

        width, height = map(int, resolution.split('x'))
        
        if webcam.set_resolution(width, height):
            return jsonify({'status': 'success'})
        else:
            return jsonify({
                'status': 'error',
                'message': 'Camera not initialized or not HIKERBOT'
            }), 400
    except Exception as e:
        print(f"Error setting camera resolution: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/get-camera-settings', methods=['GET'])
def get_camera_settings():
    try:
        if not webcam.camera or not webcam.current_camera_type:
            return jsonify({
                'status': 'error',
                'message': 'No camera initialized'
            }), 400

        settings = {}
        
        # Get camera type
        settings['cameraType'] = webcam.current_camera_type
        
        if webcam.current_camera_type == 'HIKERBOT':
            # HIKERBOT camera settings
            # Get exposure time
            try:
                exposure_value = MVCC_INTVALUE()
                ret = webcam.camera.MV_CC_GetIntValue("ExposureTime", exposure_value)
                if ret == 0:
                    settings['exposure'] = exposure_value.nCurValue
            except:
                settings['exposure'] = 1068.0

            # Get gain
            try:
                gain_value = MVCC_INTVALUE()
                ret = webcam.camera.MV_CC_GetIntValue("Gain", gain_value)
                if ret == 0:
                    settings['gain'] = gain_value.nCurValue
            except:
                settings['gain'] = 0.0

            # Get width
            try:
                width_value = MVCC_INTVALUE()
                ret = webcam.camera.MV_CC_GetIntValue("Width", width_value)
                if ret == 0:
                    settings['width'] = width_value.nCurValue
            except:
                settings['width'] = 640

            # Get height
            try:
                height_value = MVCC_INTVALUE()
                ret = webcam.camera.MV_CC_GetIntValue("Height", height_value)
                if ret == 0:
                    settings['height'] = height_value.nCurValue
            except:
                settings['height'] = 480
        else:
            # Webcam settings
            try:
                # Get webcam properties
                settings['width'] = int(webcam.camera.get(cv2.CAP_PROP_FRAME_WIDTH)) if webcam.camera else 640
                settings['height'] = int(webcam.camera.get(cv2.CAP_PROP_FRAME_HEIGHT)) if webcam.camera else 480
                settings['exposure'] = webcam.camera.get(cv2.CAP_PROP_EXPOSURE) if webcam.camera else -6.0
                settings['gain'] = webcam.camera.get(cv2.CAP_PROP_GAIN) if webcam.camera else 0.0
                settings['brightness'] = webcam.camera.get(cv2.CAP_PROP_BRIGHTNESS) if webcam.camera else 128.0
                settings['contrast'] = webcam.camera.get(cv2.CAP_PROP_CONTRAST) if webcam.camera else 32.0
                settings['saturation'] = webcam.camera.get(cv2.CAP_PROP_SATURATION) if webcam.camera else 32.0
                settings['hue'] = webcam.camera.get(cv2.CAP_PROP_HUE) if webcam.camera else 0.0
            except:
                # Default webcam values
                settings['width'] = 640
                settings['height'] = 480
                settings['exposure'] = -6.0
                settings['gain'] = 0.0
                settings['brightness'] = 128.0
                settings['contrast'] = 32.0
                settings['saturation'] = 32.0
                settings['hue'] = 0.0

        # HIKERBOT-specific settings
        if webcam.current_camera_type == 'HIKERBOT':
            # Get pixel format
            try:
                pixel_format_value = MVCC_ENUMVALUE()
                ret = webcam.camera.MV_CC_GetEnumValue("PixelFormat", pixel_format_value)
                if ret == 0:
                    # Convert pixel format enum to string
                    pixel_format_map = {
                        0x01080001: "Mono 8",
                        0x01080002: "Mono 10",
                        0x01080003: "Mono 12",
                        0x01080004: "Mono 16",
                        0x02180014: "RGB 8",
                        0x02180015: "BGR 8"
                    }
                    settings['pixelFormat'] = pixel_format_map.get(pixel_format_value.nCurValue, "Mono 8")
            except:
                settings['pixelFormat'] = "Mono 8"

            # Get acquisition frame rate
            try:
                frame_rate_value = MVCC_FLOATVALUE()
                ret = webcam.camera.MV_CC_GetFloatValue("AcquisitionFrameRate", frame_rate_value)
                if ret == 0:
                    settings['acquisitionFrameRate'] = frame_rate_value.fCurValue
            except:
                settings['acquisitionFrameRate'] = 2.0

            # Get resulting frame rate
            try:
                result_frame_rate_value = MVCC_FLOATVALUE()
                ret = webcam.camera.MV_CC_GetFloatValue("ResultingFrameRate", result_frame_rate_value)
                if ret == 0:
                    settings['resultingFrameRate'] = result_frame_rate_value.fCurValue
            except:
                settings['resultingFrameRate'] = 814.0

            # Get exposure auto
            try:
                exposure_auto_value = MVCC_ENUMVALUE()
                ret = webcam.camera.MV_CC_GetEnumValue("ExposureAuto", exposure_auto_value)
                if ret == 0:
                    exposure_auto_map = {0: "Off", 1: "Once", 2: "Continuous"}
                    settings['exposureAuto'] = exposure_auto_map.get(exposure_auto_value.nCurValue, "Off")
            except:
                settings['exposureAuto'] = "Off"

            # Get test pattern
            try:
                test_pattern_value = MVCC_ENUMVALUE()
                ret = webcam.camera.MV_CC_GetEnumValue("TestPattern", test_pattern_value)
                if ret == 0:
                    test_pattern_map = {0: "Off", 1: "Horizontal Ramp", 2: "Vertical Ramp", 3: "Diagonal Ramp", 4: "Gray Ramp"}
                    settings['testPattern'] = test_pattern_map.get(test_pattern_value.nCurValue, "Off")
            except:
                settings['testPattern'] = "Off"

            # Get digital shift
            try:
                digital_shift_value = MVCC_FLOATVALUE()
                ret = webcam.camera.MV_CC_GetFloatValue("DigitalShift", digital_shift_value)
                if ret == 0:
                    settings['digitalShift'] = digital_shift_value.fCurValue
            except:
                settings['digitalShift'] = 0.0117
        else:
            # Webcam-specific settings
            settings['pixelFormat'] = "RGB 8"  # Webcams typically use RGB
            settings['acquisitionFrameRate'] = 30.0  # Typical webcam frame rate
            settings['resultingFrameRate'] = 30.0
            settings['exposureAuto'] = "Off"  # Webcams don't have this setting
            settings['testPattern'] = "Off"  # Webcams don't have test patterns
            settings['digitalShift'] = 0.0  # Webcams don't have digital shift

        return jsonify({
            'status': 'success',
            'settings': settings
        })

    except Exception as e:
        print(f"Error getting camera settings: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/update-camera-setting', methods=['POST'])
def update_camera_setting():
    try:
        if not webcam.camera or not webcam.current_camera_type:
            return jsonify({
                'status': 'error',
                'message': 'No camera initialized'
            }), 400

        data = request.get_json()
        setting = data.get('setting')
        value = data.get('value')

        if not setting or value is None:
            return jsonify({
                'status': 'error',
                'message': 'Setting and value are required'
            }), 400

        ret = 0
        
        if webcam.current_camera_type == 'HIKERBOT':
            # HIKERBOT camera settings
            if setting == 'exposure':
                ret = webcam.camera.MV_CC_SetIntValue("ExposureTime", int(value))
            elif setting == 'gain':
                ret = webcam.camera.MV_CC_SetIntValue("Gain", int(value))
            elif setting == 'width':
                ret = webcam.camera.MV_CC_SetIntValue("Width", int(value))
            elif setting == 'height':
                ret = webcam.camera.MV_CC_SetIntValue("Height", int(value))
            elif setting == 'pixelFormat':
                # Convert string to enum value
                pixel_format_map = {
                    "Mono 8": 0x01080001,
                    "Mono 10": 0x01080002,
                    "Mono 12": 0x01080003,
                    "Mono 16": 0x01080004,
                    "RGB 8": 0x02180014,
                    "BGR 8": 0x02180015
                }
                enum_value = pixel_format_map.get(value, 0x01080001)
                ret = webcam.camera.MV_CC_SetEnumValue("PixelFormat", enum_value)
            elif setting == 'acquisitionFrameRate':
                ret = webcam.camera.MV_CC_SetFloatValue("AcquisitionFrameRate", float(value))
            elif setting == 'exposureAuto':
                # Convert string to enum value
                exposure_auto_map = {"Off": 0, "Once": 1, "Continuous": 2}
                enum_value = exposure_auto_map.get(value, 0)
                ret = webcam.camera.MV_CC_SetEnumValue("ExposureAuto", enum_value)
            elif setting == 'testPattern':
                # Convert string to enum value
                test_pattern_map = {"Off": 0, "Horizontal Ramp": 1, "Vertical Ramp": 2, "Diagonal Ramp": 3, "Gray Ramp": 4}
                enum_value = test_pattern_map.get(value, 0)
                ret = webcam.camera.MV_CC_SetEnumValue("TestPattern", enum_value)
            elif setting == 'digitalShift':
                ret = webcam.camera.MV_CC_SetFloatValue("DigitalShift", float(value))
            else:
                return jsonify({
                    'status': 'error',
                    'message': f'Unknown HIKERBOT setting: {setting}'
                }), 400
        else:
            # Webcam settings
            if setting == 'exposure':
                ret = webcam.camera.set(cv2.CAP_PROP_EXPOSURE, float(value))
            elif setting == 'gain':
                ret = webcam.camera.set(cv2.CAP_PROP_GAIN, float(value))
            elif setting == 'width':
                ret = webcam.camera.set(cv2.CAP_PROP_FRAME_WIDTH, int(value))
            elif setting == 'height':
                ret = webcam.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, int(value))
            elif setting == 'brightness':
                ret = webcam.camera.set(cv2.CAP_PROP_BRIGHTNESS, float(value))
            elif setting == 'contrast':
                ret = webcam.camera.set(cv2.CAP_PROP_CONTRAST, float(value))
            elif setting == 'saturation':
                ret = webcam.camera.set(cv2.CAP_PROP_SATURATION, float(value))
            elif setting == 'hue':
                ret = webcam.camera.set(cv2.CAP_PROP_HUE, float(value))
            else:
                return jsonify({
                    'status': 'error',
                    'message': f'Unknown webcam setting: {setting}'
                }), 400

        if ret == 0:
            return jsonify({'status': 'success'})
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to set {setting} to {value}'
            }), 400

    except Exception as e:
        print(f"Error updating camera setting: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/lowpass-filter', methods=['POST'])
def apply_lowpass_filter():
    try:
        print("Low pass filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing low pass filter for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Apply Gaussian blur (low pass filter)
        filtered_img = cv2.GaussianBlur(img, (25, 25), 0)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_lowpass{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving filtered image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, filtered_img, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Low pass filter completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during low pass filter: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/median-filter', methods=['POST'])
def apply_median_filter():
    try:
        print("Median filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing median filter for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Apply Median blur
        filtered_img = cv2.medianBlur(img, 15)  # kernel size 5x5

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_median{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving filtered image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, filtered_img, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Median filter completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during median filter: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/edge-detect', methods=['POST'])
def apply_edge_detect():
    try:
        print("Edge detection filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing edge detection for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Convert to grayscale if image is color
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply Canny edge detection
        edges = cv2.Canny(blurred, 100, 200)  # Adjust thresholds as needed
        
        # Convert back to BGR for saving
        edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_edges{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving edge detected image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, edges_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Edge detection completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during edge detection: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/edge-emphasis', methods=['POST'])
def apply_edge_emphasis():
    try:
        print("Edge emphasis filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing edge emphasis for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Convert to float32 for processing
        img_float = img.astype(np.float32) / 255.0

        # Create sharpening kernel
        kernel = np.array([[-1,-1,-1],
                         [-1, 9,-1],
                         [-1,-1,-1]], dtype=np.float32)

        # Apply edge emphasis filter
        emphasized = cv2.filter2D(img_float, -1, kernel)
        
        # Convert back to uint8
        emphasized = np.clip(emphasized * 255, 0, 255).astype(np.uint8)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_emphasized{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving edge emphasized image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, emphasized, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Edge emphasis completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during edge emphasis: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/grayscale', methods=['POST'])
def apply_grayscale():
    try:
        print("Grayscale filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing grayscale for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Convert back to BGR for saving
        gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_gray{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving grayscale image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, gray_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Grayscale completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during grayscale: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/invert', methods=['POST'])
def apply_invert():
    try:
        print("Invert filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing invert for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Invert the image
        inverted = cv2.bitwise_not(img)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_inverted{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving inverted image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, inverted, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Invert completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during invert: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/thin', methods=['POST'])
def apply_thin():
    try:
        print("Thin filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing thin for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Convert to grayscale if image is color
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img

        # Apply Otsu's thresholding
        _, thresholded = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # Apply erosion and dilation for thinning
        kernel = np.ones((3, 3), np.uint8)
        eroded = cv2.erode(thresholded, kernel, iterations=1)
        dilated = cv2.dilate(eroded, kernel, iterations=1)

        # Convert back to BGR for saving
        thinned_bgr = cv2.cvtColor(dilated, cv2.COLOR_GRAY2BGR)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_thinned{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving thinned image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, thinned_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Thin completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during thin: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/image-splice', methods=['POST'])
def apply_image_splice():
    try:
        print("Image splice endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_paths = data.get('imagePaths', [])  # Get array of image paths
        direction = data.get('direction', 'horizontal')
        
        print(f"Processing image splice for images: {image_paths}")
        
        if not image_paths or len(image_paths) < 2:
            return jsonify({
                'status': 'error',
                'message': 'Need at least 2 images to splice'
            }), 400

        # Read all images
        images = []
        for path in image_paths:
            if not os.path.exists(path):
                return jsonify({
                    'status': 'error',
                    'message': f'Image not found: {path}'
                }), 404

            img = cv2.imread(path)
            if img is None:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to read image: {path}'
                }), 500
            images.append(img)

        # Get dimensions of first image
        h1, w1 = images[0].shape[:2]
        
        # Resize all images to match the first image's dimensions
        resized_images = [images[0]]
        for img in images[1:]:
            resized = cv2.resize(img, (w1, h1))
            resized_images.append(resized)
        
        # Create a panorama by concatenating images
        if direction == 'horizontal':
            result = np.hstack(resized_images)
        else:
            result = np.vstack(resized_images)

        # Save with new filename
        directory = os.path.dirname(image_paths[0])
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"spliced_{timestamp}.jpg"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving spliced image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, result, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Image splice completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during image splice: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/image-sharpen', methods=['POST'])
def apply_image_sharpen():
    try:
        print("Image sharpen endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing image sharpen for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Apply sharpening filter
        kernel = np.array([[-1,-1,-1],
                         [-1, 9,-1],
                         [-1,-1,-1]], dtype=np.float32)
        sharpened = cv2.filter2D(img, -1, kernel)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_sharpened{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving sharpened image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, sharpened, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Image sharpen completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during image sharpen: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/image-stitch', methods=['POST'])
def apply_image_stitch():
    try:
        print("Image stitch endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_paths = data.get('imagePaths', [])
        
        print(f"Processing image stitch for images: {image_paths}")
        
        if not image_paths or len(image_paths) < 2:
            return jsonify({
                'status': 'error',
                'message': 'At least two images are required for stitching'
            }), 400

        # Read images with OpenCV
        images = []
        for img_path in image_paths:
            img = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)
            if img is None:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to read image: {img_path}'
                }), 500
            images.append(img)

        # Resize all images to match the first image's dimensions
        resized_images = []
        for img in images:
            resized_img = cv2.resize(img, (images[0].shape[1], images[0].shape[0]))
            resized_images.append(resized_img)

        # Create a panorama by blending overlapping regions
        stitched_img = resized_images[0]
        for i in range(1, len(resized_images)):
            stitched_img = cv2.addWeighted(stitched_img, 0.5, resized_images[i], 0.5, 0)

        # Save with new filename
        directory = os.path.dirname(image_paths[0])
        filename = os.path.basename(image_paths[0])
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_stitched{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving stitched image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, stitched_img, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Image stitch completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during image stitch: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/save-calibration', methods=['POST'])
def save_calibration():
    try:
        print("Save calibration endpoint called")
        data = request.get_json()
        print("Received calibration data:", data)
        
        calibration_data = data.get('calibrationData')
        if not calibration_data:
            return jsonify({
                'status': 'error',
                'message': 'No calibration data provided'
            }), 400

        # Create calibration directory if it doesn't exist
        calibration_dir = os.path.join('calibration_data')
        os.makedirs(calibration_dir, exist_ok=True)

        # Save calibration data with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"calibration_{timestamp}.json"
        filepath = os.path.join(calibration_dir, filename)

        with open(filepath, 'w') as f:
            json.dump(calibration_data, f, indent=4)
        
        print(f"Calibration data saved to: {filepath}")
        return jsonify({
            'status': 'success',
            'message': 'Calibration data saved successfully',
            'filepath': filepath
        })
        
    except Exception as e:
        print(f"Error saving calibration data: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/threshold', methods=['POST'])
def apply_threshold():
    try:
        print("Threshold filter endpoint called")
        data = request.get_json()
        print("Received data:", data)
        
        image_path = data.get('imagePath')
        
        print(f"Processing threshold for image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found at path: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Read image with OpenCV
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to read image'
            }), 500

        # Convert to grayscale if image is color
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply Otsu's thresholding
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert back to BGR for saving
        thresh_bgr = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)

        # Save with new filename
        directory = os.path.dirname(image_path)
        filename = os.path.basename(image_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_threshold{ext}"
        new_path = os.path.join(directory, new_filename)
        
        print(f"Saving thresholded image to: {new_path}")
        # Save with original quality
        cv2.imwrite(new_path, thresh_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
        
        print("Thresholding completed successfully")
        return jsonify({
            'status': 'success',
            'filepath': new_path
        })
        
    except Exception as e:
        print(f"Error during thresholding: {str(e)}")
        print(f"Error type: {type(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/porosity/analyze', methods=['POST'])
def analyze_porosity():
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        unit = data.get('unit', 'microns')
        features = data.get('features', 'dark')
        filter_settings = data.get('filter_settings')
        min_threshold = data.get('min_threshold', 0)
        max_threshold = data.get('max_threshold', 255)
        prep_method = data.get('prep_method')
        view_option = data.get('view_option', 'summary')

        # Only call prepare_image for supported options
        supported_preps = ['threshold', 'edge_detect', 'adaptive', 'morphological']
        if prep_method in supported_preps:
            prepared_path = analyzer.prepare_image(image_path, prep_method, filter_settings, min_threshold, max_threshold)
        else:
            prepared_path = image_path  # Use original image for 'color' or unsupported options

        result = analyzer.analyze_porosity(
            prepared_path,
            unit=unit,
            features=features,
            filter_settings=filter_settings,
            view_option=view_option,
            min_threshold=min_threshold,
            max_threshold=max_threshold,
            prep_method=prep_method
        )
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Porosity analysis error: {str(e)}'
        })

@app.route('/api/porosity/save-config', methods=['POST'])
def save_porosity_config():
    try:
        data = request.get_json()
        name = data.get('name')
        config = data.get('config')
        
        if not name or not config:
            return jsonify({
                'status': 'error',
                'message': 'Name and config are required'
            })

        analyzer.save_config(name, config)
        return jsonify({
            'status': 'success'
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

@app.route('/api/porosity/load-config/<name>', methods=['GET'])
def load_porosity_config(name):
    try:
        config = analyzer.load_config(name)
        if not config:
            return jsonify({
                'status': 'error',
                'message': 'Config not found'
            })

        return jsonify(config)

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        })

@app.route('/api/porosity/export-report', methods=['POST'])
def export_porosity_report():
    temp_files = []  # Track temporary files for cleanup
    try:
        data = request.get_json()
        results = data.get('results', [])
        statistics = data.get('statistics', {})
        image_path = data.get('image_path', '')
        filters = data.get('filters', {})
        unit = data.get('unit', 'microns')
        
        # Create PDF with specific page size and margins
        pdf = FPDF(format='A4')
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        # Enable page numbers
        pdf.alias_nb_pages()
        pdf.set_font('Arial', '', 8)
        pdf.set_y(10)
        pdf.cell(0, 10, 'Page ' + str(pdf.page_no()) + '/{nb}', 0, 0, 'R')
        
        # Add title
        pdf.set_font('Arial', 'B', 16)
        pdf.set_y(20)
        pdf.cell(0, 10, 'Porosity Analysis Report', 0, 1, 'C')
        pdf.ln(5)
        
        # Add timestamp and metadata
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 5, f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', 0, 1, 'R')
        if image_path:
            pdf.cell(0, 5, f'Source Image: {os.path.basename(image_path)}', 0, 1, 'R')
        pdf.ln(5)

        # Add image if available
        try:
            if image_path and os.path.exists(image_path):
                img = cv2.imread(image_path)
                if img is not None:
                    # Calculate dimensions while preserving aspect ratio
                    height, width = img.shape[:2]
                    page_width = pdf.w - 20
                    max_height = 120  # Maximum height in mm
                    
                    # Calculate scaling while respecting max height
                    width_ratio = page_width / width
                    height_ratio = max_height / height
                    ratio = min(width_ratio, height_ratio)
                    
                    img_width = width * ratio
                    img_height = height * ratio
                    
                    # Save as PNG for better quality
                    temp_img_path = os.path.join(tempfile.gettempdir(), 'temp_analysis.png')
                    cv2.imwrite(temp_img_path, img, [cv2.IMWRITE_PNG_COMPRESSION, 9])
                    temp_files.append(temp_img_path)
                    
                    # Center image horizontally
                    x_offset = (pdf.w - img_width) / 2
                    pdf.image(temp_img_path, x=x_offset, y=pdf.get_y(), w=img_width)
                    pdf.ln(img_height + 10)
        except Exception as img_error:
            print(f"Error adding image to PDF: {str(img_error)}")
            pdf.cell(0, 10, 'Error adding image to report', 0, 1)
            pdf.ln(5)

        # Add filter settings if available
        if filters:
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, 'Analysis Parameters', 0, 1)
            pdf.set_font('Arial', '', 10)
            
            # Create a table for filter settings
            filters_data = []
            if filters.get('circularity', {}).get('enabled'):
                filters_data.append(['Circularity', f"{filters['circularity']['min']} - {filters['circularity']['max']}"])
            if filters.get('length', {}).get('enabled'):
                filters_data.append(['Length', f"{filters['length']['min']} - {filters['length']['max']} {unit}"])
            if filters.get('area', {}).get('enabled'):
                filters_data.append(['Area', f"{filters['area']['min']} - {filters['area']['max']} {unit}²"])
            
            col_width = pdf.w / 2 - 20
            for filter_name, filter_value in filters_data:
                pdf.cell(col_width, 6, filter_name, 1)
                pdf.cell(col_width, 6, filter_value, 1)
                pdf.ln()
            
            pdf.ln(5)

        # Add statistics in organized sections
        if statistics:
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, 'Analysis Results', 0, 1)
            
            # Basic Statistics
            pdf.set_font('Arial', 'B', 10)
            pdf.cell(0, 6, 'Basic Measurements', 0, 1)
            pdf.set_font('Arial', '', 10)
            
            stats_data = [
                ['Total Pores', f"{statistics.get('total_pores', 0)}"],
                ['Mean Area', f"{statistics.get('mean_area', 0):.2f} {unit}²"],
                ['Mean Length', f"{statistics.get('mean_length', 0):.2f} {unit}"],
                ['Mean Width', f"{statistics.get('mean_width', 0):.2f} {unit}"],
                ['Mean Circularity', f"{statistics.get('mean_circularity', 0):.2f}"]
            ]
            
            col_width = pdf.w / 2 - 20
            for stat_name, stat_value in stats_data:
                pdf.cell(col_width, 6, stat_name, 1)
                pdf.cell(col_width, 6, stat_value, 1)
                pdf.ln()
            
            # Distribution Statistics
            area_dist = statistics.get('area_distribution', {})
            if area_dist:
                pdf.ln(5)
                pdf.set_font('Arial', 'B', 10)
                pdf.cell(0, 6, 'Area Distribution Statistics', 0, 1)
                pdf.set_font('Arial', '', 10)
                
                dist_data = [
                    ['Minimum', f"{area_dist.get('min', 0):.2f} {unit}²"],
                    ['Maximum', f"{area_dist.get('max', 0):.2f} {unit}²"],
                    ['Median', f"{area_dist.get('median', 0):.2f} {unit}²"],
                    ['First Quartile (Q1)', f"{area_dist.get('q1', 0):.2f} {unit}²"],
                    ['Third Quartile (Q3)', f"{area_dist.get('q3', 0):.2f} {unit}²"]
                ]
                
                for dist_name, dist_value in dist_data:
                    pdf.cell(col_width, 6, dist_name, 1)
                    pdf.cell(col_width, 6, dist_value, 1)
                    pdf.ln()
            
            pdf.ln(5)

        # Add results table with improved layout
        if results:
            pdf.add_page()
            pdf.set_font('Arial', 'B', 12)
            pdf.cell(0, 10, 'Detailed Results', 0, 1)
            pdf.set_font('Arial', '', 8)
            
            # Calculate optimal column widths
            col_widths = {
                'id': 15,
                'length': 25,
                'width': 25,
                'area': 25,
                'circ': 25,
                'per': 25
            }
            
            # Table header with improved formatting
            pdf.set_fill_color(240, 240, 240)
            pdf.cell(col_widths['id'], 7, 'ID', 1, 0, 'C', True)
            pdf.cell(col_widths['length'], 7, f'Length ({unit})', 1, 0, 'C', True)
            pdf.cell(col_widths['width'], 7, f'Width ({unit})', 1, 0, 'C', True)
            pdf.cell(col_widths['area'], 7, f'Area ({unit}²)', 1, 0, 'C', True)
            pdf.cell(col_widths['circ'], 7, 'Circularity', 1, 0, 'C', True)
            pdf.cell(col_widths['per'], 7, f'Perimeter ({unit})', 1, 1, 'C', True)
            
            # Table data with alternating row colors
            for i, result in enumerate(results):
                if i % 2 == 0:
                    pdf.set_fill_color(245, 245, 245)
                else:
                    pdf.set_fill_color(255, 255, 255)
                
                pdf.cell(col_widths['id'], 6, str(result['id']), 1, 0, 'C', True)
                pdf.cell(col_widths['length'], 6, f"{result['length']:.2f}", 1, 0, 'C', True)
                pdf.cell(col_widths['width'], 6, f"{result['width']:.2f}", 1, 0, 'C', True)
                pdf.cell(col_widths['area'], 6, f"{result['area']:.2f}", 1, 0, 'C', True)
                pdf.cell(col_widths['circ'], 6, f"{result['circ']:.2f}", 1, 0, 'C', True)
                pdf.cell(col_widths['per'], 6, f"{result['per']:.2f}", 1, 1, 'C', True)
                
                # Add page break if needed
                if pdf.get_y() > pdf.h - 20:
                    pdf.add_page()
                    # Repeat header on new page
                    pdf.set_font('Arial', 'B', 8)
                    pdf.set_fill_color(240, 240, 240)
                    pdf.cell(col_widths['id'], 7, 'ID', 1, 0, 'C', True)
                    pdf.cell(col_widths['length'], 7, f'Length ({unit})', 1, 0, 'C', True)
                    pdf.cell(col_widths['width'], 7, f'Width ({unit})', 1, 0, 'C', True)
                    pdf.cell(col_widths['area'], 7, f'Area ({unit}²)', 1, 0, 'C', True)
                    pdf.cell(col_widths['circ'], 7, 'Circularity', 1, 0, 'C', True)
                    pdf.cell(col_widths['per'], 7, f'Perimeter ({unit})', 1, 1, 'C', True)
                    pdf.set_font('Arial', '', 8)

        # Generate PDF in memory using chunks to manage memory
        pdf_output = BytesIO()
        pdf.output(pdf_output)
        pdf_output.seek(0)
        
        # Clean up temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as cleanup_error:
                print(f"Error cleaning up temporary file {temp_file}: {str(cleanup_error)}")
        
        # Create response with appropriate headers
        response = make_response(pdf_output.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=porosity_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        
        return response

    except Exception as e:
        # Clean up temporary files in case of error
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except:
                pass
        
        print(f"Error generating PDF report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to generate PDF report: {str(e)}'
        }), 500

@app.route('/api/get-calibrations', methods=['GET'])
def get_calibrations():
    try:
        calibration_dir = os.path.join('calibration_data')
        if not os.path.exists(calibration_dir):
            return jsonify({
                'status': 'success',
                'calibrations': {}
            })

        calibrations = {}
        for filename in os.listdir(calibration_dir):
            if filename.endswith('.json'):
                filepath = os.path.join(calibration_dir, filename)
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    # Keep only the most recent calibration for each magnification
                    mag = data.get('magnification', '100x')  # Default to 100x if not specified
                    # If timestamp is missing, use file modification time
                    if 'timestamp' not in data:
                        data['timestamp'] = datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
                    if mag not in calibrations or data['timestamp'] > calibrations[mag]['timestamp']:
                        calibrations[mag] = data

        return jsonify({
            'status': 'success',
            'calibrations': calibrations
        })

    except Exception as e:
        print(f"Error getting calibrations: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def is_valid_image(filepath):
    """
    Validate if a file is a valid image using multiple checks
    """
    try:
        # Check if file exists and has non-zero size
        if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
            return False
            
        # Check file type using filetype library
        kind = filetype.guess(filepath)
        if kind is None:
            return False
            
        # Verify it's an image type
        if not kind.mime.startswith('image/'):
            return False
            
        # Try to read with OpenCV as final validation
        img = cv2.imread(filepath)
        if img is None:
            return False
            
        return True
    except Exception as e:
        print(f"Error validating image {filepath}: {str(e)}")
        return False

@app.route('/api/list-images', methods=['POST'])
def list_images():
    try:
        data = request.get_json()
        directory = data.get('path')
        filters = data.get('filters', {})
        allowed_extensions = filters.get('extensions', ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'])
        
        print(f"Listing images from directory: {directory}")
        
        if not directory or not os.path.exists(directory):
            print(f"Directory not found: {directory}")
            return jsonify({
                'status': 'error',
                'message': 'Directory not found'
            }), 404

        images = []
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            
            # Check if it's a file and has allowed extension
            if os.path.isfile(file_path) and any(filename.lower().endswith(ext) for ext in allowed_extensions):
                try:
                    # Get file stats
                    stats = os.stat(file_path)
                    
                    # Verify it's actually an image using OpenCV
                    if is_valid_image(file_path):
                        images.append({
                            'name': filename,
                            'path': file_path,
                            'size': stats.st_size,
                            'date': datetime.fromtimestamp(stats.st_mtime).isoformat()
                        })
                except Exception as e:
                    print(f"Error processing file {filename}: {str(e)}")
                    continue

        # Sort images by date, newest first
        images.sort(key=lambda x: x['date'], reverse=True)
        
        print(f"Found {len(images)} images")
        return jsonify({
            'status': 'success',
            'images': images
        })

    except Exception as e:
        print(f"Error listing images: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/delete-image', methods=['POST'])
def delete_image():
    try:
        data = request.get_json()
        image_path = data.get('path')
        
        print(f"Attempting to delete image: {image_path}")
        
        if not image_path or not os.path.exists(image_path):
            print(f"Image not found: {image_path}")
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Verify it's a file and an image using OpenCV
        if not os.path.isfile(image_path) or not is_valid_image(image_path):
            return jsonify({
                'status': 'error',
                'message': 'Invalid image file'
            }), 400

        # Delete the file
        os.remove(image_path)
        
        print(f"Successfully deleted image: {image_path}")
        return jsonify({
            'status': 'success',
            'message': 'Image deleted successfully'
        })

    except Exception as e:
        print(f"Error deleting image: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/thumbnail', methods=['GET'])
def get_thumbnail():
    try:
        image_path = request.args.get('path')
        if not image_path or not os.path.exists(image_path):
            return jsonify({
                'status': 'error',
                'message': 'Image not found'
            }), 404

        # Send the file directly
        return send_file(image_path, mimetype='image/jpeg')

    except Exception as e:
        print(f"Error serving thumbnail: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/phase/analyze', methods=['POST'])
def analyze_phase_route():
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        method = data.get('method', 'area_fraction')
        configuration = data.get('configuration')

        result = analyze_phase(image_path, method=method, configuration=configuration)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/phase/analyze-upload', methods=['POST'])
def analyze_phase_upload_route():
    try:
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({'status': 'error', 'message': 'No image file provided'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'status': 'error', 'message': 'No image file selected'}), 400
        
        # Get other parameters from form data
        configuration_str = request.form.get('configuration')
        min_intensity = int(request.form.get('min_intensity', 0))
        max_intensity = int(request.form.get('max_intensity', 255))
        
        if not configuration_str:
            return jsonify({'status': 'error', 'message': 'No configuration provided'}), 400
        
        # Parse configuration
        try:
            configuration = json.loads(configuration_str)
        except json.JSONDecodeError:
            return jsonify({'status': 'error', 'message': 'Invalid configuration format'}), 400
        
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
            image_file.save(temp_file.name)
            temp_image_path = temp_file.name
        
        try:
            # Analyze the uploaded image
            result = analyze_phase(
                temp_image_path, 
                method='area_fraction', 
                configuration=configuration,
                min_intensity=min_intensity,
                max_intensity=max_intensity
            )
            
            return jsonify(result)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_image_path):
                os.unlink(temp_image_path)
                
    except Exception as e:
        print(f"Error in analyze_phase_upload_route: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/phase/save-configuration', methods=['POST'])
def save_phase_configuration():
    try:
        data = request.get_json()
        name = data.get('name')
        configuration = data.get('configuration')

        if not name or not configuration:
            return jsonify({'status': 'error', 'message': 'Name or configuration missing'}), 400

        success = config_manager.save_configuration(name, configuration)
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Failed to save configuration'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/phase/get-configurations', methods=['GET'])
def get_phase_configurations():
    try:
        configs = config_manager.get_configurations()
        return jsonify({'status': 'success', 'configurations': configs})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/phase/apply-configuration', methods=['POST'])
def apply_phase_configuration():
    try:
        data = request.get_json()
        name = data.get('name')
        configuration = config_manager.get_configuration(name)

        if not configuration:
            return jsonify({'status': 'error', 'message': 'Configuration not found'}), 404

        return jsonify({'status': 'success', 'configuration': configuration})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/analyze-inclusion', methods=['POST'])
def analyze_inclusion():
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        method = data.get('method', 'default')
        specimen_number = data.get('specimen_number', 1)
        field_area = data.get('field_area', 0.512)
        inclusion_types = data.get('inclusion_types', {})
        
        print(f"Inclusion analysis request:")
        print(f"  Image path: {image_path}")
        print(f"  Method: {method}")
        print(f"  Specimen number: {specimen_number}")
        print(f"  Field area: {field_area}")
        print(f"  Inclusion types: {inclusion_types}")
        
        if not image_path:
            return jsonify({
                'status': 'error',
                'message': 'No image path provided'
            }), 400
        
        # Simulate inclusion analysis results
        # In a real implementation, this would analyze the image for inclusions
        import random
        
        results = {
            'A': {'thin': random.randint(0, 10), 'thick': random.randint(0, 5)},
            'B': {'thin': random.randint(0, 8), 'thick': random.randint(0, 3)},
            'C': {'thin': random.randint(0, 6), 'thick': random.randint(0, 2)},
            'D': {'thin': random.randint(0, 4), 'thick': random.randint(0, 1)}
        }
        
        # Adjust results based on selected inclusion types
        for type_key, type_data in inclusion_types.items():
            if type_key != 'NONE':
                if not type_data.get('thin', False) and not type_data.get('thick', False):
                    results[type_key] = {'thin': 0, 'thick': 0}
        
        print(f"Generated results: {results}")
        
        return jsonify({
            'status': 'success',
            'results': results,
            'specimen_number': specimen_number,
            'field_area': field_area,
            'total_inclusions': sum(sum(type_data.values()) for type_data in results.values())
        })
        
    except Exception as e:
        print(f"Error in inclusion analysis: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/nodularity/analyze', methods=['POST'])
def analyze_nodularity():
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        threshold = data.get('threshold', 128)
        circularity_cutoff = data.get('circularity_cutoff', 0.5)
        prep_option = data.get('prep_option') # New parameter
        filter_settings = data.get('filter_settings') # Pass new parameter
        
        if not image_path:
            return jsonify({
                'status': 'error',
                'message': 'No image path provided'
            }), 400
            
        result = nodularity_analyzer.analyze_nodularity(
            image_path=image_path,
            threshold=threshold,
            circularity_cutoff=circularity_cutoff,
            prep_option=prep_option, # Pass new parameter
            filter_settings=filter_settings # Pass new parameter
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/nodularity/toggle-selection', methods=['POST'])
def toggle_nodule_selection():
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        w = data.get('w')
        h = data.get('h')
        
        if None in (x, y, w, h):
            return jsonify({
                'status': 'error',
                'message': 'Missing coordinates'
            }), 400
            
        result = nodularity_analyzer.toggle_nodule_selection(x, y, w, h)
        return jsonify({'status': 'success', 'result': result})
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/nodularity/set-cutoff', methods=['POST'])
def set_nodularity_cutoff():
    try:
        data = request.get_json()
        cutoff = data.get('cutoff')
        
        if cutoff is None:
            return jsonify({
                'status': 'error',
                'message': 'No cutoff value provided'
            }), 400
            
        result = nodularity_analyzer.set_circularity_cutoff(float(cutoff))
        return jsonify({'status': 'success', 'result': result})
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/nodularity/update-sizes', methods=['POST'])
def update_nodule_sizes():
    try:
        data = request.get_json()
        size_ranges = data.get('size_ranges')
        
        if not size_ranges:
            return jsonify({
                'status': 'error',
                'message': 'No size ranges provided'
            }), 400
            
        result = nodularity_analyzer.update_nodule_sizes(size_ranges)
        return jsonify({'status': 'success', 'result': result})
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/nodularity/export-report', methods=['POST'])
def export_nodularity_report():
    try:
        data = request.get_json()
        report_type = data.get('report_type', 'PDF')  # 'PDF' or 'Excel'
        image_paths = data.get('image_paths', 'all') # Can be 'all' or a list of specific paths
        include_flake_phase_data = data.get('include_flake_phase_data', False)

        # Call the analyzer's generate_report method
        report_result = nodularity_analyzer.generate_report(report_type, image_paths, include_flake_phase_data)

        if report_result['status'] == 'success':
            if report_type == 'PDF':
                pdf_data = report_result['data']
                response = make_response(pdf_data)
                response.headers['Content-Type'] = 'application/pdf'
                response.headers['Content-Disposition'] = f'attachment; filename=nodularity_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
                return response
            elif report_type == 'Excel':
                # Placeholder for serving Excel file
                return jsonify({'status': 'success', 'message': report_result['message']})
            else:
                return jsonify({'status': 'error', 'message': 'Invalid report type'}), 400
        else:
            return jsonify(report_result), 500

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Error in report generation route: {str(e)}'
        }), 500

@app.route('/api/nodularity/add-cumulative-result', methods=['POST'])
def add_nodularity_cumulative_result():
    try:
        data = request.get_json()
        result_data = data.get('result_data')
        if not result_data:
            return jsonify({'status': 'error', 'message': 'No result data provided'}), 400
        nodularity_analyzer.add_current_image_result_to_cumulative(result_data)
        return jsonify({'status': 'success', 'message': 'Result added to cumulative list'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodularity/get-cumulative-results', methods=['GET'])
def get_nodularity_cumulative_results():
    try:
        results = nodularity_analyzer.get_cumulative_results()
        return jsonify({'status': 'success', 'results': results})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodularity/clear-cumulative-results', methods=['POST'])
def clear_nodularity_cumulative_results():
    try:
        nodularity_analyzer.clear_cumulative_results()
        return jsonify({'status': 'success', 'message': 'Cumulative results cleared'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodularity/save-config', methods=['POST'])
def save_nodularity_config():
    try:
        data = request.get_json()
        name = data.get('name')
        config = data.get('config')
        if not name or not config:
            return jsonify({'status': 'error', 'message': 'Missing name or config data'}), 400
        nodularity_analyzer.save_config(name, config)
        return jsonify({'status': 'success', 'message': f'Configuration \'{name}\' saved'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodularity/load-config/<name>', methods=['GET'])
def load_nodularity_config(name):
    try:
        config = nodularity_analyzer.load_config(name)
        if config:
            return jsonify({'status': 'success', 'config': config})
        return jsonify({'status': 'error', 'message': f'Configuration \'{name}\' not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodularity/delete-config', methods=['POST'])
def delete_nodularity_config():
    try:
        data = request.get_json()
        name = data.get('name')
        if not name:
            return jsonify({'status': 'error', 'message': 'Missing config name'}), 400
        if nodularity_analyzer.delete_config(name):
            return jsonify({'status': 'success', 'message': f'Configuration \'{name}\' deleted'})
        return jsonify({'status': 'error', 'message': f'Configuration \'{name}\' not found'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/nodularity/transfer-to-phase-analysis', methods=['POST'])
def transfer_nodularity_to_phase_analysis():
    try:
        data = request.get_json()
        nodularity_results = data.get('nodularity_results')
        # Here you would typically pass nodularity_results to a function in phase_analysis.py
        # For now, we'll just log it and return a success message.
        print(f"Transferring nodularity results to Phase Analysis: {nodularity_results}")
        # Example: Call a function in phase_analysis.py
        # from phase_analysis import receive_nodularity_data
        # receive_nodularity_data(nodularity_results)
        return jsonify({'status': 'success', 'message': 'Nodularity results transferred to Phase Analysis (placeholder)'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/porosity/get-histogram', methods=['POST'])
def get_porosity_histogram():
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        if not image_path:
            return jsonify({'status': 'error', 'message': 'No image path provided'}), 400
        
        result = analyzer.get_image_histogram_data(image_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/porosity/apply-intensity-threshold', methods=['POST'])
def apply_porosity_intensity_threshold():
    try:
        data = request.get_json()
        image_path = data.get('image_path')
        min_threshold = data.get('min_threshold', 0)
        max_threshold = data.get('max_threshold', 255)
        features = data.get('features', 'dark')

        if not image_path:
            return jsonify({'status': 'error', 'message': 'No image path provided'}), 400
        
        result = analyzer.apply_intensity_threshold(image_path, min_threshold, max_threshold, features)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/clear-temp-files', methods=['POST'])
def clear_temp_files():
    try:
        print("Clearing temporary files and analysis results")
        
        # Clear temporary files in the temp directory
        temp_dir = os.path.join('C:\\Users\\Public\\MicroScope_Images', 'temp')
        if os.path.exists(temp_dir):
            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                        print(f"Deleted temp file: {file_path}")
                except Exception as e:
                    print(f"Error deleting temp file {file_path}: {str(e)}")
        
        # Clear analyzed images directory
        analyzed_dir = os.path.join('C:\\Users\\Public\\MicroScope_Images', 'analyzed')
        if os.path.exists(analyzed_dir):
            for filename in os.listdir(analyzed_dir):
                file_path = os.path.join(analyzed_dir, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                        print(f"Deleted analyzed file: {file_path}")
                except Exception as e:
                    print(f"Error deleting analyzed file {file_path}: {str(e)}")
        
        # Clear any cached analysis results
        global analysis_results
        analysis_results = {}
        
        print("Temporary files and analysis results cleared successfully")
        return jsonify({
            'status': 'success',
            'message': 'Temporary files and analysis results cleared'
        })
        
    except Exception as e:
        print(f"Error clearing temp files: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify backend is running"""
    try:
        return jsonify({
            'status': 'success',
            'message': 'Backend server is running',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True) 