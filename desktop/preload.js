/**
 * The only bridge between the window and the app process.
 *
 * It exposes one function, used by the offline page's retry button. The
 * workspace itself needs nothing from here — it is the same web app that runs
 * in a browser, and it stays that way, so the desktop build cannot drift into
 * behaving differently from the hosted one.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("plasgainDesktop", {
  retry: () => ipcRenderer.invoke("plasgain:retry")
});
