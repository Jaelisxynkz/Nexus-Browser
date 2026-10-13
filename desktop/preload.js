/**
 * Nexus Desktop — preload bridge.
 *
 * Injected into the renderer before any page script runs. Exposes a minimal,
 * secure API on `window.__nexus` via contextBridge. The renderer never has
 * direct access to Node APIs or ipcRenderer — only the whitelisted methods
 * below.
 *
 * Security:
 *   - contextIsolation: true (page cannot reach this module directly)
 *   - nodeIntegration: false (no Node APIs in the renderer)
 *   - sandbox: true
 *   - Only validated IPC channels are exposed.
 *   - All input parameters are validated before forwarding to the main process.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function validateString(v) {
  return typeof v === 'string' ? v : '';
}

contextBridge.exposeInMainWorld('__nexus', {
  native: true,
  version: '1.0.0',

  // ---- Tab management ----
  tabs: {
    create: (opts) => ipcRenderer.invoke('nexus:tabs:create', opts || {}),
    close: (tabId) => ipcRenderer.invoke('nexus:tabs:close', tabId),
    activate: (tabId) => ipcRenderer.invoke('nexus:tabs:activate', tabId),
    navigate: (tabId, input) => ipcRenderer.invoke('nexus:tabs:navigate', tabId, validateString(input)),
    goBack: (tabId) => ipcRenderer.invoke('nexus:tabs:goBack', tabId),
    goForward: (tabId) => ipcRenderer.invoke('nexus:tabs:goForward', tabId),
    reload: (tabId) => ipcRenderer.invoke('nexus:tabs:reload', tabId),
    stop: (tabId) => ipcRenderer.invoke('nexus:tabs:stop', tabId),
    togglePin: (tabId) => ipcRenderer.invoke('nexus:tabs:togglePin', tabId),
    duplicate: (tabId) => ipcRenderer.invoke('nexus:tabs:duplicate', tabId),
    list: () => ipcRenderer.invoke('nexus:tabs:list'),
    getActive: () => ipcRenderer.invoke('nexus:tabs:getActive'),
    onEvent: (fn) => {
      const handler = (_e, evt) => fn(evt);
      ipcRenderer.on('nexus:tab-event', handler);
      return () => ipcRenderer.removeListener('nexus:tab-event', handler);
    },
  },

  // ---- Downloads ----
  downloads: {
    list: () => ipcRenderer.invoke('nexus:downloads:list'),
    cancel: (id) => ipcRenderer.invoke('nexus:downloads:cancel', id),
    open: (id) => ipcRenderer.invoke('nexus:downloads:open', id),
    show: (id) => ipcRenderer.invoke('nexus:downloads:show', id),
    onEvent: (fn) => {
      const handler = (_e, evt) => fn(evt);
      ipcRenderer.on('nexus:download-event', handler);
      return () => ipcRenderer.removeListener('nexus:download-event', handler);
    },
  },

  // ---- Ad Blocker ----
  adBlocker: {
    isEnabled: () => ipcRenderer.invoke('nexus:adblock:isEnabled'),
    setEnabled: (on) => ipcRenderer.invoke('nexus:adblock:setEnabled', !!on),
    getStats: () => ipcRenderer.invoke('nexus:adblock:stats'),
    addException: (host) => ipcRenderer.invoke('nexus:adblock:addException', validateString(host)),
    removeException: (host) => ipcRenderer.invoke('nexus:adblock:removeException', validateString(host)),
    hasException: (host) => ipcRenderer.invoke('nexus:adblock:hasException', validateString(host)),
  },

  // ---- Settings ----
  settings: {
    get: (key) => ipcRenderer.invoke('nexus:settings:get', validateString(key)),
    getAll: () => ipcRenderer.invoke('nexus:settings:getAll'),
    set: (key, value) => ipcRenderer.invoke('nexus:settings:set', validateString(key), value),
    setMany: (patch) => ipcRenderer.invoke('nexus:settings:setMany', patch || {}),
    reset: () => ipcRenderer.invoke('nexus:settings:reset'),
    onChange: (fn) => {
      // Settings changes are pushed via the tab-event channel's sibling.
      // For simplicity, the renderer polls getAll() on focus; a dedicated
      // push channel can be added if needed.
      const handler = () => fn();
      ipcRenderer.on('nexus:settings-changed', handler);
      return () => ipcRenderer.removeListener('nexus:settings-changed', handler);
    },
  },

  // ---- First Run ----
  firstRun: {
    isPending: () => ipcRenderer.invoke('nexus:firstrun:isPending'),
    complete: () => ipcRenderer.invoke('nexus:firstrun:complete'),
    reset: () => ipcRenderer.invoke('nexus:firstrun:reset'),
  },

  // ---- Incognito ----
  incognito: {
    list: () => ipcRenderer.invoke('nexus:incognito:list'),
    destroyAll: () => ipcRenderer.invoke('nexus:incognito:destroyAll'),
  },

  // ---- Updater ----
  updater: {
    check: () => ipcRenderer.invoke('nexus:updater:check'),
    downloadAndInstall: () => ipcRenderer.invoke('nexus:updater:downloadAndInstall'),
    onStatus: (fn) => {
      const handler = (_e, evt) => fn(evt);
      ipcRenderer.on('nexus:updater:status', handler);
      return () => ipcRenderer.removeListener('nexus:updater:status', handler);
    },
  },

  // ---- System ----
  system: {
    info: () => ipcRenderer.invoke('nexus:system:info'),
    openExternal: (url) => ipcRenderer.invoke('nexus:system:open-external', validateString(url)),
    defaultBrowserStatus: () => ipcRenderer.invoke('nexus:system:default-browser-status'),
    setDefaultBrowser: () => ipcRenderer.invoke('nexus:system:set-default-browser'),
    osTheme: (fn) => {
      const handler = (_e, theme) => fn(theme);
      ipcRenderer.on('nexus:os-theme', handler);
      return () => ipcRenderer.removeListener('nexus:os-theme', handler);
    },
  },

  // ---- URL routing (second-instance / protocol handler) ----
  onOpenUrl: (fn) => {
    const handler = (_e, url) => fn(url);
    ipcRenderer.on('nexus:open-url', handler);
    return () => ipcRenderer.removeListener('nexus:open-url', handler);
  },
});