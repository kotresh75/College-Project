const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron', {
    windowControl: {
        minimize: () => ipcRenderer.send('window-minimize'),
        maximize: () => ipcRenderer.send('window-maximize'),
        close: () => ipcRenderer.send('window-close')
    },
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    getScanners: () => ipcRenderer.invoke('get-scanners'),
    printSilent: (content, printerName) => ipcRenderer.invoke('print-silent', content, printerName),
    printToPDF: (content, options) => ipcRenderer.invoke('print-to-pdf', content, options),
    openExternal: (url) => ipcRenderer.send('open-external', url),

    // Auto-Update API
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-download-progress', (_event, info) => callback(info)),
    installUpdate: () => ipcRenderer.send('install-update'),
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-available');
        ipcRenderer.removeAllListeners('update-downloaded');
        ipcRenderer.removeAllListeners('update-download-progress');
    }
});
