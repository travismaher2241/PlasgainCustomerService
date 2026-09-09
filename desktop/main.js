/**
 * Plasgain Sales Workspace — desktop shell.
 *
 * A native window around the hosted workspace, in the shape Teams and Slack
 * use: the app is installed and launched like any other program, but the CRM
 * itself still runs on the server, so every rep is on one database and one
 * version with nothing to update by hand.
 *
 * Deliberately thin. It holds no business logic and no credentials — the
 * service-account key that reaches Firestore stays on the server rather than
 * being shipped to every laptop.
 */
const { app, BrowserWindow, Menu, shell, screen, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

/**
 * Where the workspace lives.
 *
 * Overridable so a laptop can be pointed at a preview deployment or a machine
 * running `npm run dev`, without rebuilding the installer: set PLASGAIN_APP_URL,
 * or write {"appUrl": "..."} into config.json in the app's user-data folder
 * (the About item in the Help menu prints where that is).
 */
const DEFAULT_APP_URL = "https://plasgain-customer-service.vercel.app";

function resolveAppUrl() {
  if (process.env.PLASGAIN_APP_URL) return process.env.PLASGAIN_APP_URL;
  try {
    const configPath = path.join(app.getPath("userData"), "config.json");
    const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (saved && typeof saved.appUrl === "string" && saved.appUrl.trim()) {
      return saved.appUrl.trim();
    }
  } catch {
    // No config file, or unreadable: the default below is the normal case.
  }
  return DEFAULT_APP_URL;
}

const APP_URL = resolveAppUrl();
const APP_ORIGIN = new URL(APP_URL).origin;

/** Window size and position, so the app reopens where it was left. */
const stateFile = () => path.join(app.getPath("userData"), "window-state.json");

function loadWindowState() {
  const fallback = { width: 1400, height: 900 };
  try {
    const saved = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
    if (!Number.isFinite(saved.width) || !Number.isFinite(saved.height)) return fallback;

    // A window restored onto a monitor that is no longer attached is invisible
    // and looks exactly like the app failing to start, so check it still lands
    // on a display that exists.
    if (Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      const onScreen = screen.getAllDisplays().some((display) => {
        const { x, y, width, height } = display.workArea;
        return saved.x < x + width && saved.x + 100 > x && saved.y < y + height && saved.y + 100 > y;
      });
      if (!onScreen) return { width: saved.width, height: saved.height };
    }
    return saved;
  } catch {
    return fallback;
  }
}

function saveWindowState(window) {
  if (!window || window.isDestroyed() || window.isMinimized()) return;
  try {
    const bounds = window.isMaximized() ? window.getNormalBounds() : window.getBounds();
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ ...bounds, maximized: window.isMaximized() })
    );
  } catch {
    // Losing the remembered size is not worth interrupting a quit over.
  }
}

let mainWindow = null;

function showConnectionError(details) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadFile(path.join(__dirname, "offline.html"), {
    query: { url: APP_URL, detail: details || "" }
  });
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    title: "Plasgain Sales Workspace",
    backgroundColor: "#080A09",
    // Painting an empty frame first reads as a hang on a cold start, so the
    // window is held back until there is something in it.
    show: false,
    icon: path.join(__dirname, "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // The window shows a remote page, so it gets no access to Node at all.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (state.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", () => saveWindowState(mainWindow));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Links to anywhere else — a council website, a mailto: — belong in the
  // user's own browser, not loaded inside the workspace window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url) || url.startsWith("mailto:")) shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    let target;
    try {
      target = new URL(url);
    } catch {
      event.preventDefault();
      return;
    }
    if (target.origin === APP_ORIGIN || target.protocol === "file:") return;
    event.preventDefault();
    if (/^https?:$/i.test(target.protocol)) shell.openExternal(url);
  });

  // An unreachable server is the one failure a rep will actually hit, so it
  // gets a page that says so plainly instead of Chromium's error screen.
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // -3 is ERR_ABORTED, which a redirect or a cancelled load raises normally.
    if (!isMainFrame || errorCode === -3) return;
    if (validatedURL && validatedURL.startsWith("file:")) return;
    showConnectionError(`${errorDescription} (${errorCode})`);
  });

  mainWindow.loadURL(APP_URL);
}

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "Reload workspace",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow && mainWindow.loadURL(APP_URL)
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "toggleDevTools" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open in browser",
          click: () => shell.openExternal(APP_URL)
        },
        {
          label: "Show settings folder",
          click: () => shell.openPath(app.getPath("userData"))
        },
        { type: "separator" },
        { label: `Connected to ${APP_ORIGIN}`, enabled: false },
        { label: `Version ${app.getVersion()}`, enabled: false }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// A CRM opened twice is two windows disagreeing about the same records, so a
// second launch focuses the window that is already open.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// The retry button on the offline page comes through here rather than the page
// reloading itself, which would only reload the offline page.
ipcMain.handle("plasgain:retry", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(APP_URL);
});
