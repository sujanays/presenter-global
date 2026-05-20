import { contextBridge, ipcRenderer } from 'electron';

// Expose safe, structured APIs to the renderer UI process
contextBridge.exposeInMainWorld('electronAPI', {
  // Listeners from Main Process to Renderer
  onUpdateConnectionStatus: (callback: (event: any, status: string) => void) => {
    ipcRenderer.on('UPDATE_STATUS', callback);
  },
  onUpdatePairingDetails: (callback: (event: any, data: { deviceId: string; qrBase64: string; temporaryPairToken: string }) => void) => {
    ipcRenderer.on('UPDATE_PAIRING', callback);
  },
  onUpdateLaser: (callback: (event: any, data: { x: number; y: number; visible: boolean }) => void) => {
    ipcRenderer.on('UPDATE_LASER', callback);
  },
  // Actions from Renderer to Main Process
  requestPairingInfo: () => {
    ipcRenderer.send('REQUEST_PAIRING_INFO');
  }
});
