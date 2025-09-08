# Envision - Advanced Microscopy Analysis Software

Envision is a comprehensive desktop application for advanced microscopy analysis, featuring real-time camera control, image processing, and automated analysis capabilities.

## Features

### 🎥 **Multi-Camera Support**
- **HIKERBOT Professional Cameras**: Full control over exposure, gain, pixel format, test patterns
- **Webcam Support**: Brightness, contrast, saturation, hue controls
- **Real-time Camera Filters**: Dynamic adjustment of camera parameters during live feed

### 📐 **Precision Calibration**
- **Unit Consistency**: Automatic unit conversion (microns, mm, cm, pixels)
- **Inline Calibration**: Quick setup with magnification auto-suffix (e.g., "100X")
- **Accurate Measurements**: Precise coordinate mapping for annotation selection

### 🔬 **Advanced Analysis**
- **Phase Segmentation**: Automated phase identification and analysis
- **Inclusion Analysis**: Detection and characterization of inclusions
- **Porosity Analysis**: Void detection and measurement
- **Nodularity Analysis**: Graphite nodule analysis
- **De-carburization Analysis**: Surface decarburization measurement
- **Grain Size Analysis**: Automated grain size determination
- **Dendritic Arm Spacing**: Microstructure analysis

### 🎨 **Interactive Interface**
- **Real-time Annotations**: Draw shapes, measure distances, mark areas of interest
- **Live Camera Feed**: Real-time image capture and processing
- **Dynamic UI**: Context-sensitive controls based on camera type
- **Professional Workflow**: Streamlined analysis pipeline

## Technology Stack

- **Frontend**: React + Vite + Electron
- **Backend**: Python Flask + OpenCV
- **Camera Control**: HIKERBOT MvCameraControl SDK
- **Image Processing**: OpenCV, NumPy, SciPy
- **UI Framework**: Tailwind CSS + Ant Design

## Installation

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- HIKERBOT Camera SDK (for professional cameras)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Vignesh0005/Envisionv.git
   cd Envisionv
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. Start the application:
   ```bash
   # Terminal 1: Start backend
   cd backend
   python start_server.py
   
   # Terminal 2: Start frontend
   npm start
   
   # Terminal 3: Start Electron app (optional)
   npm run electron-dev
   ```

## Usage

### Camera Setup
1. Connect your camera (webcam or HIKERBOT)
2. Click "Start Camera" in the main interface
3. Select camera type (Webcam/HIKERBOT)
4. Access "Camera Filters" for real-time parameter control

### Analysis Workflow
1. **Calibrate**: Set up measurement scale using known reference
2. **Capture**: Take images using live camera or upload existing images
3. **Annotate**: Mark areas of interest with drawing tools
4. **Analyze**: Run automated analysis algorithms
5. **Export**: Save results and generate reports

### Camera Filters
- **Webcam Controls**: Brightness, Contrast, Saturation, Hue, Exposure, Gain
- **HIKERBOT Controls**: All webcam features plus Pixel Format, Test Patterns, Digital Shift, Exposure Auto

## API Endpoints

### Camera Control
- `GET /api/get-camera-settings` - Get current camera parameters
- `POST /api/update-camera-setting` - Update camera parameter
- `POST /api/start-camera` - Start camera with specified type
- `POST /api/stop-camera` - Stop camera
- `GET /api/video-feed` - Live camera feed stream

### Analysis
- `POST /api/phase-segmentation` - Phase analysis
- `POST /api/inclusion-analysis` - Inclusion detection
- `POST /api/porosity-analysis` - Porosity measurement
- `POST /api/nodularity-analysis` - Nodularity analysis

## Development

### Project Structure
```
Envisionv/
├── src/                    # React frontend
│   ├── components/         # UI components
│   └── styles/            # CSS styles
├── backend/               # Python backend
│   ├── camera_server.py   # Main Flask server
│   ├── analysis/          # Analysis algorithms
│   └── requirements.txt   # Python dependencies
├── Electron/              # Desktop app configuration
└── package.json           # Node.js dependencies
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue on GitHub or contact the development team.

---

**Envision Team** - Advanced Microscopy Analysis Software