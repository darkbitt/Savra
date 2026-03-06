// src/preload.js

const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
});



contextBridge.exposeInMainWorld('electronAPI', {

  selectPath: (options) => ipcRenderer.invoke('show-path-dialog', options),
  googleLogin: () => ipcRenderer.invoke('google:login'),

  syncGameLocal: (data) => ipcRenderer.invoke('local:syncGame', data),

  createLocalCheckpoint: (data) => ipcRenderer.invoke('local:createCheckpoint', data),

  restoreLocalCheckpoint: (data) => ipcRenderer.invoke('local:restoreCheckpoint', data),

  deleteLocalCheckpoint: (data) => ipcRenderer.invoke('local:deleteCheckpoint', data),


  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),





  findGameSaveLocation: (gameName) => ipcRenderer.invoke('find-game-save-location', gameName),
  launchGame: (gamePath) => ipcRenderer.invoke('launch-game', gamePath),
  getGameFolders: (gamePath) => ipcRenderer.invoke('get-game-folders', gamePath), // Example: if you need to list subfolders


  askAiForSaveLocation: (gameName) => ipcRenderer.invoke('ask-ai-for-save-location', gameName),
  searchGameInfo: (query) => ipcRenderer.invoke('search-game-info', query),


  connectGoogleDrive: () => ipcRenderer.invoke('connect-google-drive'),
  uploadToGoogleDrive: (gameId, filePath) => ipcRenderer.invoke('upload-google-drive', gameId, filePath),
  downloadFromGoogleDrive: (gameId, fileId) => ipcRenderer.invoke('download-google-drive', gameId, fileId),


  onLaunchGameStatus: (callback) => ipcRenderer.on('launch-game-status', (event, ...args) => callback(...args)),
  scanForBackups: (games) => ipcRenderer.invoke('scan-for-backups', games),
  deleteBackup: (path) => ipcRenderer.invoke('delete-backup', path),
  copyImageToAppData: (fileData) => ipcRenderer.invoke('app:copyImage', fileData),


  setGithubConfig: (config) => ipcRenderer.invoke('github:set-config', config),
  getGithubConfig: () => ipcRenderer.invoke('github:get-config'),
  clearGithubConfig: () => ipcRenderer.invoke('github:clear-config'),
  syncGameToGithub: (syncData) => ipcRenderer.invoke('github:sync-game', syncData),

  deleteGithubCheckpointRelease: (data) => ipcRenderer.invoke('github:delete-checkpoint-release', data),
  createGithubCheckpointRelease: (checkpointData) => ipcRenderer.invoke('github:create-checkpoint-release', checkpointData),
  restoreGithubCheckpointRelease: (data) => ipcRenderer.invoke('github:restore-checkpoint-release', data),
  searchIGDB: (query) => ipcRenderer.invoke('igdb:search', query),
  getGameDetails: (gameId) => ipcRenderer.invoke('igdb:get-game-details', gameId),

  searchSteam: (query, filters, page) => ipcRenderer.invoke('steam:search', query, filters, page),
  getSteamAppDetails: (appId) => ipcRenderer.invoke('steam:get-app-details', appId),

  googleLogin: () => ipcRenderer.invoke('google:login'),
  googleLogout: () => ipcRenderer.invoke('google:logout'),
  checkGoogleLoginStatus: () => ipcRenderer.invoke('google:check-status'),
  syncGameToGoogleDrive: (data) => ipcRenderer.invoke('google-drive:sync-game', data),
  createGoogleDriveCheckpoint: (data) => ipcRenderer.invoke('google-drive:create-checkpoint', data),
  restoreGoogleDriveCheckpoint: (data) => ipcRenderer.invoke('google-drive:restore-checkpoint', data),
  deleteGoogleDriveCheckpoint: (data) => ipcRenderer.invoke('google-drive:delete-checkpoint', data),
  getUserProfile: (uid) => ipcRenderer.invoke('firebase:get-user-profile', uid),
  setUserProfile: (data) => ipcRenderer.invoke('firebase:set-user-profile', data),
  listAllGoogleDriveCheckpoints: () => ipcRenderer.invoke('google-drive:list-all-checkpoints'),


  uploadBannerToSupabase: (data) => ipcRenderer.invoke('supabase:upload-banner', data),
  deleteBannerFromSupabase: (data) => ipcRenderer.invoke('supabase:delete-banner', data),
  downloadAndCacheBanner: (data) => ipcRenderer.invoke('app:download-and-cache-banner', data),
  clearBannerCache: (data) => ipcRenderer.invoke('app:clear-banner-cache', data),
  scanForGames: () => ipcRenderer.invoke('app:scan-for-games'),
  onSyncProgress: (callback) => ipcRenderer.on('sync-progress', (event, data) => callback(data)),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),
});




