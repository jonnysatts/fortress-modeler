const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, exec } = require('child_process');
const net = require('net');
const isDev = process.env.NODE_ENV === 'development';

// Keep a global reference of the window object
let mainWindow;
let viteProcess = null;

// Port conflict resolution functions
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, (err) => {
      if (err) {
        resolve(false);
      } else {
        server.close(() => {
          resolve(true);
        });
      }
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function killProcessOnPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (stdout) {
          const lines = stdout.trim().split('\n');
          const pids = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return parts[parts.length - 1];
          }).filter(pid => pid && !isNaN(pid));
          
          if (pids.length > 0) {
            exec(`taskkill /F ${pids.map(pid => `/PID ${pid}`).join(' ')}`, (killError) => {
              console.log(`Killed processes on port ${port}:`, pids);
              resolve(true);
            });
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    } else {
      // macOS/Linux
      exec(`lsof -ti:${port}`, (error, stdout) => {
        if (stdout) {
          const pids = stdout.trim().split('\n').filter(pid => pid);
          if (pids.length > 0) {
            exec(`kill -9 ${pids.join(' ')}`, (killError) => {
              console.log(`Killed processes on port ${port}:`, pids);
              resolve(true);
            });
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    }
  });
}

async function ensurePort8081() {
  console.log('🔍 Checking if port 8081 is available...');
  
  if (await isPortAvailable(8081)) {
    console.log('✅ Port 8081 is available');
    return true;
  }
  
  console.log('❌ Port 8081 is in use, attempting to free it...');
  
  // Show dialog to user
  const response = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Port 8081 Conflict',
    message: 'Port 8081 is required for Fortress Financial Modeler but is currently in use.',
    detail: 'The app can attempt to free the port by closing conflicting processes. This is safe and necessary for OAuth authentication to work.',
    buttons: ['Free Port 8081', 'Exit'],
    defaultId: 0,
    cancelId: 1
  });
  
  if (response.response === 1) {
    console.log('User chose to exit');
    app.quit();
    return false;
  }
  
  // Attempt to kill processes using port 8081
  const killed = await killProcessOnPort(8081);
  
  // Wait a moment for processes to close
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (await isPortAvailable(8081)) {
    console.log('✅ Successfully freed port 8081');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Port 8081 Ready',
      message: 'Port 8081 has been successfully freed and is ready for use.',
      buttons: ['Continue']
    });
    return true;
  } else {
    console.log('❌ Failed to free port 8081');
    const retryResponse = await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Port 8081 Still Unavailable',
      message: 'Unable to free port 8081. This will prevent OAuth authentication from working.',
      detail: 'You may need to manually close other applications using this port, or restart your computer.',
      buttons: ['Continue Anyway', 'Exit'],
      defaultId: 1,
      cancelId: 1
    });
    
    if (retryResponse.response === 1) {
      app.quit();
      return false;
    }
    
    return false;
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'assets', 'icon.png'), // We'll add this
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  });

  // Set application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Fortress Financial Modeler',
          click: () => {
            // Show about dialog
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Fortress Financial Modeler',
              message: 'Fortress Financial Modeler',
              detail: 'Professional financial modeling and analysis tool.\n\nVersion: 1.0.0\nBuilt with Electron and React'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Load the app
  if (isDev) {
    // Development - connect to Vite dev server
    mainWindow.loadURL('http://localhost:8081');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production - load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates (production only)
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(async () => {
  createWindow();
  
  // Ensure port 8081 is available before starting the app
  if (!isDev) {
    const portReady = await ensurePort8081();
    if (!portReady) {
      console.log('Port 8081 not available, app may not function correctly');
    }
  }

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') app.quit();
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available.');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  autoUpdater.quitAndInstall();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});