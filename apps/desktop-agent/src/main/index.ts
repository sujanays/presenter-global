import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { io, Socket } from 'socket.io-client';
import qr from 'qr-image';
import { inputInjector } from './injector.js';
import { createSystemTray, updateTrayStatus } from './tray.js';
import { createLaserOverlay, updateLaserPosition } from './overlay.js';

// Constants
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const APP_NAME = 'Presenter Desktop Agent';

let mainWindow: BrowserWindow | null = null;
let socket: Socket | null = null;
let deviceId = 'desktop_dev_' + Math.random().toString(36).substring(2, 9);
let overlayWindow: BrowserWindow | null = null;

const createMainWindow = () => {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    show: true,
    title: APP_NAME,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Simple clean HTML string loaded directly to prevent build filesystem failures
  const mainHtmlPath = path.join(__dirname, '../../src/renderer/index.html');
  mainWindow.loadFile(mainHtmlPath).catch(() => {
    // Fallback if compilation outputs index.html in a different place
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Presenter Remote Agent</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #121214;
            color: #e1e1e6;
            margin: 0;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            box-sizing: border-box;
          }
          h1 { color: #fff; margin-bottom: 8px; font-size: 24px; }
          p { color: #8d8d99; margin: 4px 0 16px 0; text-align: center; }
          .card {
            background-color: #202024;
            border-radius: 8px;
            padding: 24px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid #323238;
          }
          .status {
            font-weight: bold;
            color: #f75a68;
            margin-bottom: 20px;
          }
          .status.connected { color: #00b37e; }
          .qr-container {
            background-color: #fff;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .qr-img { width: 180px; height: 180px; }
          .details {
            font-size: 13px;
            color: #7c7c8a;
            word-break: break-all;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>Presenter Remote</h1>
        <p>Control slideshows, mouse, and laser pointer securely from your phone.</p>
        <div class="card">
          <div id="status" class="status">Connecting to Backend...</div>
          <div class="qr-container">
            <img id="qr" class="qr-img" style="display: none;" />
            <div id="qr-loading" style="color: #121214">Generating QR...</div>
          </div>
          <div id="details" class="details">Device ID: Loading...</div>
        </div>
        <script>
          window.electronAPI.onUpdateConnectionStatus((event, status) => {
            const el = document.getElementById('status');
            el.innerText = 'Status: ' + status;
            if (status === 'Connected') {
              el.className = 'status connected';
            } else {
              el.className = 'status';
            }
          });
          
          window.electronAPI.onUpdatePairingDetails((event, data) => {
            document.getElementById('details').innerText = 'Pairing Code: ' + data.temporaryPairToken + '\\nDevice ID: ' + data.deviceId;
            const img = document.getElementById('qr');
            img.src = 'data:image/png;base64,' + data.qrBase64;
            img.style.display = 'block';
            document.getElementById('qr-loading').style.display = 'none';
          });

          if (window.electronAPI && window.electronAPI.requestPairingInfo) {
            window.electronAPI.requestPairingInfo();
          }
        </script>
      </body>
      </html>
    `;
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fallbackHtml)}`);
  });

  // Push connection status and pairing details immediately after the renderer finishes loading to prevent race conditions
  mainWindow.webContents.on('did-finish-load', () => {
    const isConnected = socket && socket.connected;
    updateStatusInRenderer(isConnected ? 'Connected' : 'Connecting');
    if (isConnected) {
      generateAndSendPairingQR();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const setupRealtimeSocket = () => {
  console.log(`Connecting to backend at: ${BACKEND_URL}`);
  socket = io(BACKEND_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Successfully connected to cloud backend.');
    updateStatusInRenderer('Connected');
    updateTrayStatus('Connected');

    // Register this device with the backend
    socket?.emit('SESSION_JOIN', {
      deviceId,
      role: 'desktop',
    });

    // Request code & generate QR for desktop display
    generateAndSendPairingQR();
  });

  socket.on('disconnect', () => {
    console.warn('Disconnected from backend.');
    updateStatusInRenderer('Disconnected');
    updateTrayStatus('Disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    updateStatusInRenderer('Connection Error');
  });

  // Bind Slide Control Events
  socket.on('NEXT_SLIDE', () => {
    console.log('Received NEXT_SLIDE command.');
    inputInjector.injectKey('right');
  });

  socket.on('PREVIOUS_SLIDE', () => {
    console.log('Received PREVIOUS_SLIDE command.');
    inputInjector.injectKey('left');
  });

  socket.on('START_SLIDESHOW', () => {
    console.log('Received START_SLIDESHOW command.');
    inputInjector.injectKey('f5');
  });

  socket.on('END_SLIDESHOW', () => {
    console.log('Received END_SLIDESHOW command.');
    inputInjector.injectKey('escape');
  });

  socket.on('BLACK_SCREEN', () => {
    console.log('Received BLACK_SCREEN command.');
    inputInjector.injectKey('b');
  });

  socket.on('FULLSCREEN_TOGGLE', () => {
    console.log('Received FULLSCREEN_TOGGLE command.');
    inputInjector.injectKey('f11');
  });

  // Bind Laser Pointer Event
  socket.on('LASER_MOVE', (data: { x: number; y: number; visible: boolean }) => {
    updateLaserPosition(data.x, data.y, data.visible);
  });

  // Bind Mouse Event
  socket.on('TRACKPAD_MOVE', (data: { dx: number; dy: number }) => {
    inputInjector.moveMouseRelative(data.dx, data.dy);
  });

  socket.on('LEFT_CLICK', () => {
    inputInjector.mouseClick('left');
  });

  socket.on('RIGHT_CLICK', () => {
    inputInjector.mouseClick('right');
  });
};

const generateAndSendPairingQR = async () => {
  let temporaryPairToken = '';
  try {
    // Request a secure temporary token from the backend
    const response = await fetch(`${BACKEND_URL}/api/v1/devices/pair/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });

    if (response.ok) {
      const resData = await response.json() as { temporaryPairToken: string };
      temporaryPairToken = resData.temporaryPairToken;
    } else {
      throw new Error(`HTTP error ${response.status}`);
    }
  } catch (err) {
    console.warn('Failed to fetch pairing token from backend. Generating offline token fallback:', err);
    temporaryPairToken = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Pairing URL that mobile devices scan
  const pairingUrl = `${BACKEND_URL}/pair?token=${temporaryPairToken}&deviceId=${deviceId}`;

  try {
    const qrPngBuffer = qr.imageSync(pairingUrl, { type: 'png', margin: 1 });
    const qrBase64 = qrPngBuffer.toString('base64');

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('UPDATE_PAIRING', {
        deviceId,
        qrBase64,
        temporaryPairToken,
      });
    }
  } catch (err) {
    console.error('Error generating QR Code:', err);
  }
};

const updateStatusInRenderer = (status: string) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('UPDATE_STATUS', status);
  }
};

// Listen to ipc messages from renderer
ipcMain.on('REQUEST_PAIRING_INFO', () => {
  generateAndSendPairingQR();
});

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();
  
  // Setup system tray
  if (mainWindow) {
    createSystemTray(mainWindow, APP_NAME);
  }

  // Setup transparent laser pointer overlay
  const preloadPath = path.join(__dirname, '../preload/index.js');
  overlayWindow = createLaserOverlay(preloadPath);

  // Setup sockets
  setupRealtimeSocket();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
