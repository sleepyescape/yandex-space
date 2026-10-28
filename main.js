const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1120,
    minHeight: 720,
    title: 'Яндекс Спейс',
    backgroundColor: '#E9EEF2',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'app', 'assets', 'icon.png'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required', // интро-ролик стартует со звуком
    },
  });

  win.removeMenu();
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  // Внешние ссылки открываем в браузере, а не внутри приложения.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
