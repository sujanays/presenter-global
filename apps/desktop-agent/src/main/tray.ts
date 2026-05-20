import { Tray, Menu, nativeImage, BrowserWindow } from 'electron';

let tray: Tray | null = null;

export const createSystemTray = (mainWindow: BrowserWindow, appName: string): Tray => {
  if (tray) {
    return tray;
  }

  // Create a 16x16 simple red presentation pointer dot image for system tray
  const trayIcon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAALElEQVR42mP8z8BQD8AEjFCaAecGBgYGBiQDGBnQAEY1gNEAYtQAo4FGDTAaAABDfQIJ8s0d2AAAAABJRU5ErkJggg=='
  );

  tray = new Tray(trayIcon);
  tray.setToolTip(appName);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${appName} - Ready`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Open Remote Controller UI',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Run on Windows Startup',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        console.log(`Auto launch toggled: ${menuItem.checked}`);
        // In full app, we update the AutoLaunch preference
      },
    },
    { type: 'separator' },
    {
      label: 'Exit Presenter',
      role: 'quit',
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click on tray icon restores screen
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  return tray;
};

export const updateTrayStatus = (statusText: string) => {
  if (tray) {
    tray.setToolTip(`Presenter - Status: ${statusText}`);
  }
};
