import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = 'C:/Program Files (x86)/Common Files/MVS/Runtime/Win64_x64/MvCameraControl.dll';
const targetDir = path.join(__dirname, '../backend/dist');
const targetPath = path.join(targetDir, 'MvCameraControl.dll');

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the DLL file
try {
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log('Successfully copied MvCameraControl.dll');
    } else {
        console.error('MvCameraControl.dll not found at source path');
        process.exit(1);
    }
} catch (error) {
    console.error('Error copying MvCameraControl.dll:', error);
    process.exit(1);
} 