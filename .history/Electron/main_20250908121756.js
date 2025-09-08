const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
let pythonProcess = null;

function startFlaskServer() {
    const isDev = process.env.NODE_ENV === 'development';

    let scriptPath;
    let pythonExecutable;
    let env = { ...process.env };

    if (isDev) {
        pythonExecutable = 'python';
        scriptPath = path.join(__dirname, '..', 'backend', 'camera_server.py');
    } else {
        // In production, use the bundled executable
        const appPath = app.getAppPath();
        scriptPath = path.join(appPath, '..', '..', 'resources', 'camera_server.exe');
        
        // Verify if the executable exists
        if (!fs.existsSync(scriptPath)) {
            console.error('Camera server executable not found at:', scriptPath);
            dialog.showErrorBox('Server Error', 'Camera server executable not found. Please ensure the application is properly installed.');
            return;
        }

        pythonExecutable = scriptPath;
        
        // Add the DLL directory to PATH in production
        const dllPath = path.join(appPath, '..', '..', 'resources');
        env.PATH = `${dllPath}${path.delimiter}${env.PATH}`;
    }

    console.log('Starting server with:', pythonExecutable);
    console.log('Server path:', scriptPath);
    console.log('Environment PATH:', env.PATH);

    try {
        pythonProcess = spawn(pythonExecutable, [], {
            env: env,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(scriptPath)
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python Server: ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Server Error: ${data.toString()}`);
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python server:', error);
            dialog.showErrorBox('Server Error', `Failed to start camera server: ${error.message}`);
        });

        pythonProcess.on('close', (code) => {
            console.log(`Python Server process exited with code ${code}`);
            if (code !== 0) {
                dialog.showErrorBox('Server Error', 'The camera server has stopped unexpectedly. Please restart the application.');
            }
        });
    } catch (error) {
        console.error('Error starting Python server:', error);
        dialog.showErrorBox('Server Error', `Failed to start camera server: ${error.message}`);
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false,
            allowRunningInsecureContent: true
        }
    });

    // Configure session to allow localhost requests
    const { session } = require('electron');
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = 'Electron';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    // Always use the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    startFlaskServer();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (pythonProcess) {
            pythonProcess.kill();
        }
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle IPC messages from renderer
ipcMain.on('restart-server', () => {
    if (pythonProcess) {
        pythonProcess.kill();
    }
    startFlaskServer();
});

// Add IPC handler for folder picker
ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (!result.canceled) {
        return result.filePaths[0];
    }
    return null;
});
