import { BrowserWindow, screen } from 'electron';
import path from 'path';

let overlayWindow: BrowserWindow | null = null;

export const createLaserOverlay = (preloadPath: string): BrowserWindow => {
  if (overlayWindow) {
    return overlayWindow;
  }

  // Get primary display bounds
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Critical properties for click-through overlay
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Load a special overlay rendering file
  const overlayHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background-color: transparent;
          pointer-events: none;
        }
        #laser {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,0,0,1) 0%, rgba(255,0,0,0.8) 30%, rgba(255,0,0,0) 70%);
          box-shadow: 0 0 12px 4px rgba(255, 0, 0, 0.8), 0 0 4px 1px rgba(255, 255, 255, 0.9);
          transform: translate3d(-100px, -100px, 0);
          transition: transform 0.08s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.15s ease;
          opacity: 0;
          pointer-events: none;
          z-index: 999999;
        }
      </style>
    </head>
    <body>
      <div id="laser"></div>
      <script>
        const laser = document.getElementById('laser');
        
        // Listen to IPC events from the main process to reposition laser
        window.electronAPI.onUpdateLaser((event, data) => {
          if (!data || !data.visible) {
            laser.style.opacity = '0';
            return;
          }
          
          const targetX = data.x * window.innerWidth;
          const targetY = data.y * window.innerHeight;
          
          laser.style.opacity = '1';
          laser.style.transform = \`translate3d(\${targetX - 8}px, \${targetY - 8}px, 0)\`;
        });
      </script>
    </body>
    </html>
  `;

  overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(overlayHtml)}`);

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
};

export const updateLaserPosition = (x: number, y: number, visible: boolean) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('UPDATE_LASER', { x, y, visible });
  }
};

export const destroyLaserOverlay = () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
};
