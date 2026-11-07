const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  status: () => ipcRenderer.invoke('desktop:status'),
  openWorkflow: () => ipcRenderer.invoke('desktop:workflow'),
  startDocker: () => ipcRenderer.invoke('desktop:docker'),
  startSwitch: () => ipcRenderer.invoke('desktop:switch'),
  importState: () => ipcRenderer.invoke('desktop:import'),
});
