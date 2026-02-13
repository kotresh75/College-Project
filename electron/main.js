const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// -----------------------------------------------------------------------------
// 0. Single Instance Lock
// -----------------------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log("Another instance is already running. Quitting this instance.");
    app.quit();
    return; // Stop execution
}

// Global references
let mainWindow;
let splashWindow;
let backendProcess = null; // We might want to track this more formally
let isQuitting = false;

// Config
const isDev = !app.isPackaged;
const userDataPath = app.getPath('userData');
const stateFilePath = path.join(userDataPath, 'window-state.json');

// -----------------------------------------------------------------------------
// 1. Splash Window
// -----------------------------------------------------------------------------
function createSplashWindow(mode = 'startup') {
    if (splashWindow) return; // Already exists

    splashWindow = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true, // For simple IPC in splash
            contextIsolation: false
        },
        icon: path.join(__dirname, '../assets/icons/College_icon.ico'),
    });

    const splashPath = path.join(__dirname, 'splash.html');
    splashWindow.loadFile(splashPath, { query: { mode: mode } });

    splashWindow.on('closed', () => {
        splashWindow = null;
    });
}

// -----------------------------------------------------------------------------
// 2. Main Window
// -----------------------------------------------------------------------------
function createWindow() {
    // Load window state
    let state = { width: 1200, height: 800, maximized: true };
    try {
        if (fs.existsSync(stateFilePath)) {
            const savedState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
            if (savedState) state = savedState;
        }
    } catch (e) {
        console.error("Failed to load window state", e);
    }

    mainWindow = new BrowserWindow({
        width: state.width,
        height: state.height,
        x: state.x,
        y: state.y,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        show: false, // Wait until ready
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../assets/icons/College_icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    if (state.maximized) {
        mainWindow.maximize();
    }

    // Load App
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../frontend/build/index.html'));
    }

    // Show window when ready and close splash
    mainWindow.once('ready-to-show', () => {
        // slight delay to ensure smooth transition
        setTimeout(() => {
            mainWindow.show();
            if (splashWindow) {
                splashWindow.close();
            }
        }, 500);
    });

    // -------------------------------------------------------------------------
    // Shutdown & Backup Logic Handlers
    // -------------------------------------------------------------------------

    // Intercept Close Event
    mainWindow.on('close', (e) => {
        if (isQuitting) return; // Already going through shutdown process

        e.preventDefault(); // Stop window from closing immediately

        // 1. Bring up Splash in "Shutdown" mode
        createSplashWindow('shutdown');
        mainWindow.hide(); // Hide main app

        // 2. Add extra delay for UX (user sees "Backing up...") 
        // and trigger backend backup check
        setTimeout(() => {
            if (backendProcess) {
                console.log("[Main] Requesting graceful shutdown/backup from Backend...");
                // Send signal to backend
                // Since backend is running in the same process group or we need a way to talk to it.
                // NOTE: 'startBackend' just does require() in the same process in the original code? 
                // Ah, the original code does `require(path.join(backendPath, 'server.js'));`
                // This means backend is running IN THE MAIN PROCESS.
                // We can use process.emit or a global event emitter, OR if it's in main process, 
                // we can just call a function if we had access, but `require` doesn't return the app instance easily.

                // BEST APPROACH for "Same Process" Backend:
                // We will rely on `process.on('message')` pattern we added to server.js
                // But wait, `process.on('message')` works for child processes. 
                // If we ran `require('server.js')`, it shares the same `process` object?
                // Yes. So `process.emit('message', 'shutdown_request')` might work if we listen for it.
                // BUT `requestSingleInstanceLock` behaves weirdly with process events sometimes.

                // Let's rely on the fact that we are in the same process.
                // We will use a custom IPC event to itself or just `process.emit`.
                process.emit('graceful-exit-request');
            } else {
                // Backend not running? Just quit.
                performQuit();
            }
        }, 500);
    });

    // Save state logic
    mainWindow.on('close', saveState);

    function saveState() {
        if (!mainWindow) return;
        // Don't save if minimized to tray or hidden, only if valid
        try {
            const bounds = mainWindow.getBounds();
            const isMaximized = mainWindow.isMaximized();
            const newState = {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                maximized: isMaximized
            };
            fs.writeFileSync(stateFilePath, JSON.stringify(newState));
        } catch (e) {
            console.error("Failed to save window state", e);
        }
    }
}

function performQuit() {
    isQuitting = true;
    app.exit(0);
}

// -----------------------------------------------------------------------------
// 3. Backend Management
// -----------------------------------------------------------------------------
function startBackend() {
    const backendPath = isDev
        ? path.join(__dirname, '../backend')
        : path.join(process.resourcesPath, 'backend');

    console.log("Starting backend from:", backendPath);

    try {
        process.chdir(backendPath);

        // Update module paths
        const Module = require('module');
        const backendNodeModules = path.join(backendPath, 'node_modules');
        if (!module.paths.includes(backendNodeModules)) {
            module.paths.unshift(backendNodeModules);
        }

        process.env.NODE_ENV = isDev ? 'development' : 'production';
        process.env.USER_DATA_PATH = app.getPath('userData');

        // Start Server
        // We use 'require' so it runs in THIS process. 
        require(path.join(backendPath, 'server.js'));
        backendProcess = true; // Flag that it's running

        // Listen for the "Done" signal from backend if we implement it, 
        // OR just assume it's up.
        // For robustness, let's wait a second before showing main window to let DB connect.
        setTimeout(createWindow, 2500);

    } catch (err) {
        console.error("Failed to start backend:", err);
        if (splashWindow) {
            splashWindow.webContents.send('update-status', 'Error: Failed to start backend.');
        }
    }
}

// -----------------------------------------------------------------------------
// 4. App Lifecycle
// -----------------------------------------------------------------------------
app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

app.on('ready', () => {
    createSplashWindow('startup');

    // Small delay to let splash render
    setTimeout(() => {
        startBackend();
    }, 500);
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

// Listener for Backend 'Ready to Quit' signal
// We will modify server.js to emit this when backup is done
// Listener for Backend 'Ready to Quit' signal
// We will modify server.js to emit this when backup is done
process.on('backend-exit-completed', (status) => {
    console.log("[Main] Backend finished cleanup. Quitting.");

    // If we have a splash window open (which we should in shutdown mode)
    // and backup was actually performed, update the UI instead of quitting immediately
    if (splashWindow && status && status.performed) {
        splashWindow.webContents.send('backup-result', status);
    } else {
        performQuit();
    }
});

// Listener for Splash "OK" button
ipcMain.on('splash-done', () => {
    performQuit();
});

// IPC handlers for Title Bar
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });

// External Link Handling
ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

// Printer Handling
ipcMain.handle('get-printers', async () => {
    if (!mainWindow) return [];
    try {
        return await mainWindow.webContents.getPrintersAsync();
    } catch (e) {
        console.error("Failed to get printers:", e);
        return [];
    }
});

// Scanner Handling (HID Discovery)
ipcMain.handle('get-scanners', async () => {
    return new Promise((resolve) => {
        const cmd = `powershell "Get-PnpDevice -Class HIDClass -Status OK | Select-Object -ExpandProperty FriendlyName"`;
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("Scanner Scan Error:", error);
                resolve([]);
                return;
            }
            // Filter and clean output
            const lines = stdout.split('\r\n')
                .map(l => l.trim())
                .filter(l => l &&
                    !l.includes('System Controller') &&
                    !l.includes('Radio Controls') &&
                    !l.includes('Event Filter') &&
                    !l.includes('Portable Device Control') &&
                    !l.includes('Converted')
                );
            resolve([...new Set(lines)]);
        });
    });
});

// Silent Print Handling with Advanced Options
ipcMain.handle('print-silent', async (event, content, options = {}) => {
    return new Promise((resolve, reject) => {
        const printWindow = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: true }
        });

        // Create a data URI to load the content
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(content);
        printWindow.loadURL(dataUrl);

        printWindow.webContents.on('did-finish-load', () => {
            // Map frontend options to Electron print settings
            // Default 0 margins (customizable via options)
            // marginsType: 0 - default, 1 - none, 2 - minimum

            const printSettings = {
                silent: true,
                deviceName: options.deviceName || '',
                printBackground: options.printBackground !== false, // Default true
                landscape: !!options.landscape,
                color: options.color !== false, // Default true
                margins: options.margins || { marginType: 0 },
                scaleFactor: options.scaleFactor || 100,
                pagesPerSheet: options.pagesPerSheet || 1,
                collate: !!options.collate,
                copies: options.copies || 1,
                pageRanges: options.pageRanges || [], // [{from: 0, to: 1}]
                duplexMode: options.duplexMode, // 'simplex', 'longEdge', 'shortEdge'
                dpi: options.dpi
            };

            printWindow.webContents.print(printSettings, (success, errorType) => {
                if (!success) console.error("Print Failed:", errorType);
                printWindow.close();
                resolve(success);
            });
        });
    });
});

// PDF Generation Handling
ipcMain.handle('print-to-pdf', async (event, content, options = {}) => {
    return new Promise((resolve, reject) => {
        const printWindow = new BrowserWindow({
            show: false,
            webPreferences: { nodeIntegration: true }
        });

        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(content);
        printWindow.loadURL(dataUrl);

        printWindow.webContents.on('did-finish-load', async () => {
            try {
                // Map options to printToPDF options
                const pdfOptions = {
                    landscape: !!options.landscape,
                    displayHeaderFooter: false,
                    printBackground: options.printBackground !== false,
                    scale: (options.scaleFactor || 100) / 100,
                    pageSize: options.pageSize || 'A4',
                    margins: {
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0
                    }
                    // We can add more mapping if needed
                };

                // If margins are passed as object Use them
                if (options.margins && typeof options.margins === 'object' && options.margins.top !== undefined) {
                    pdfOptions.margins = options.margins;
                }

                const data = await printWindow.webContents.printToPDF(pdfOptions);
                printWindow.close();
                resolve(data.toString('base64')); // Return as base64 string
            } catch (error) {
                console.error("PDF Generation Failed:", error);
                printWindow.close();
                reject(error);
            }
        });
    });
});
