const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const path = require('path');
const { app, BrowserWindow, shell, ipcMain, dialog, session } = require('electron');
const fs = require('fs-extra');
const crypto = require('crypto');
const os = require('os');
const isDev = process.env.IS_DEV == "true" ? true : false;
const { Octokit } = require("octokit");
const AdmZip = require("adm-zip");
const Store = require('electron-store').default || require('electron-store');
const axios = require('axios');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const url = require('url');
const igdb = require('igdb-api-node').default;
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();
const http = require('http');
const serviceAccount = require('./firebase-service-account.json');
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();




if (isDev) {

  try {
    require('electron-reloader')(module);
  } catch (_) { }
}



function getFormattedTimestamp() {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  // Format suitable for release names and tags (underscores for tags, spaces for names)
  return {
    tagFormat: `${YYYY}-${MM}-${DD}_${HH}-${mm}-${ss}`, // e.g., 2023-10-27_15-30-00
    displayFormat: `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}` // e.g., 2023-10-27 15:30:00
  };
}


function sanitizeForTagName(name) {
  // Tags can't have spaces, and certain other characters might be problematic.
  // Keep it simple: replace non-alphanumeric (plus dot, underscore, hyphen) with hyphen.
  return name.replace(/[^\w.-]/g, '-').replace(/--+/g, '-'); // Also replace multiple hyphens with one
}

async function getFolderSize(directoryPath) {
  if (!await fs.pathExists(directoryPath)) return 0;
  let totalSize = 0;
  const files = await fs.readdir(directoryPath);

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      totalSize += await getFolderSize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  return totalSize;
}

function resolveManifestPath(manifestPath, baseDir = null) {
  const winAppData = process.env.APPDATA; // Roaming
  const winLocalAppData = process.env.LOCALAPPDATA;
  const winPublic = process.env.PUBLIC;
  const winProgramData = process.env.ProgramData;
  const userProfile = process.env.USERPROFILE;

  let resolved = manifestPath
    .replace('<winAppData>', winAppData)
    .replace('<winLocalAppData>', winLocalAppData)
    .replace('<winPublic>', winPublic)
    .replace('<winProgramData>', winProgramData)
    .replace('<home>', userProfile)
    .replace('<winDocuments>', path.join(userProfile, 'Documents'))
    .replace('<winSavedGames>', path.join(userProfile, 'Saved Games'))
    .replace(/\//g, path.sep); // Normalize separators for Windows

  if (baseDir) {
    resolved = resolved.replace('<base>', baseDir);
  }

  return resolved;
}

async function getSteamLibraries() {
  let libraries = [];
  try {
    // 1. Try to find Steam path from environment or common locations (non-blocking)
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const commonSteamPaths = [
      path.join(programFilesX86, 'Steam'),
      'C:\\SteamLibrary',
      'D:\\SteamLibrary',
      'E:\\SteamLibrary'
    ];

    let mainSteamPath = '';
    for (const p of commonSteamPaths) {
      if (await fs.pathExists(p)) {
        mainSteamPath = p;
        break;
      }
    }

    if (!mainSteamPath) return [];

    // Add primary library
    libraries.push(path.join(mainSteamPath, 'steamapps'));

    // 2. Parse libraryfolders.vdf for external libraries
    const vdfPath = path.join(mainSteamPath, 'steamapps', 'libraryfolders.vdf');
    if (await fs.pathExists(vdfPath)) {
      const content = await fs.readFile(vdfPath, 'utf8');
      const pathMatches = content.match(/"path"\s+"([^"]+)"/g);
      if (pathMatches) {
        pathMatches.forEach(m => {
          const library = m.match(/"path"\s+"([^"]+)"/)[1].replace(/\\\\/g, '\\');
          const appsPath = path.join(library, 'steamapps');
          if (!libraries.includes(appsPath)) libraries.push(appsPath);
        });
      }
    }
  } catch (error) {
    console.error("[Scanner] Error getting Steam libraries:", error);
  }
  return libraries;
}

async function getInstalledSteamGamesEnums() {
  const libraries = await getSteamLibraries();
  const installedGames = [];

  for (const libPath of libraries) {
    if (!await fs.pathExists(libPath)) continue;

    try {
      const files = await fs.readdir(libPath);
      for (const file of files) {
        if (file.endsWith('.acf')) {
          const content = await fs.readFile(path.join(libPath, file), 'utf8');
          const appId = content.match(/"appid"\s+"(\d+)"/)?.[1];
          const installDir = content.match(/"installdir"\s+"([^"]+)"/)?.[1];
          if (appId && installDir) {
            installedGames.push({ steamId: appId, installPath: path.join(libPath, 'common', installDir) });
          }
        }
      }
    } catch (e) { }
  }
  return installedGames;
}

async function createZipForGame(gameName, gamePath, baseTempDir) {
  const sanitizedGameName = sanitizeForTagName(gameName);
  // Use a more unique temp file name to avoid collisions if called rapidly
  const tempZipFileName = `gamesync_${sanitizedGameName}_${crypto.randomBytes(4).toString('hex')}.zip`;
  const tempZipPath = path.join(baseTempDir, tempZipFileName);

  if (!await fs.pathExists(gamePath)) {
    throw new Error(`Game save path not found: ${gamePath}`);
  }

  const zip = new AdmZip();
  const stats = await fs.stat(gamePath);

  if (stats.isDirectory()) {
    const filesInDir = await fs.readdir(gamePath);
    if (filesInDir.length === 0) {
      throw new Error(`Source directory for ${gameName} at ${gamePath} is empty.`);
    }
    zip.addLocalFolder(gamePath, path.basename(gamePath)); // Puts the game's folder (e.g., "MyGame") into the zip
  } else { // It's a file
    if (stats.size === 0) {
      throw new Error(`Source file for ${gameName} at ${gamePath} is empty.`);
    }
    zip.addLocalFile(gamePath); // Adds the file to the root of the zip
  }


  if (typeof zip.writeZipPromise === 'function') {
    await zip.writeZipPromise(tempZipPath);
  } else {
    // Fallback for older adm-zip or if writeZipPromise is not found
    await new Promise((resolve, reject) => {
      zip.writeZip(tempZipPath, (err) => { // Assuming writeZip takes a callback
        if (err) reject(err);
        else resolve();
      });
    });
  }
  console.log(`[GitHub Checkpoint] Zipped ${gameName} to: ${tempZipPath}`);
  return { tempZipPath, tempZipFileName };
}

















const schema = {
  githubPat: { type: 'string' },
  githubRepoOwner: { type: 'string' },
  githubRepoName: { type: 'string' },
  googleRefreshToken: { type: 'string' },
};

const store = new Store({
  schema,

});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1324,
    height: 800,
    minWidth: 1324,
    minHeight: 800,
    autoHideMenuBar: true,
    resizable: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // 🔒 Keep this FALSE for security
      contextIsolation: true  // 🔒 Keep this TRUE for security
    },
  });

  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: "deny" };
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {


  session.defaultSession.protocol.registerFileProtocol('safe-file', (request, callback) => {
    // Strip query parameters for local file access (Windows safety)
    const urlWithoutQuery = request.url.split('?')[0];
    const urlPart = urlWithoutQuery.substr('safe-file://'.length);
    const decodedPath = decodeURI(urlPart.startsWith('/') ? urlPart.substr(1) : urlPart); // Handle potential leading slash
    const finalPath = path.normalize(decodedPath);

    // Security check: only allow files from our app's data directory
    const userDataPath = app.getPath('userData');
    if (finalPath.startsWith(userDataPath)) {
      callback({ path: finalPath });
    } else {
      console.error('[safe-file protocol] Blocked unsafe file request:', finalPath);
      callback({ error: -6 }); // FILE_NOT_FOUND
    }
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';",
          "script-src 'self' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com;",
          "style-src 'self' 'unsafe-inline';",
          // This line MUST include 'safe-file:'
          "img-src 'self' data: safe-file: https://*.steamstatic.com https://*.fastly.net https://*.akamai.steamstatic.com https://placehold.co https://images.igdb.com https://lh3.googleusercontent.com https://opwsfrnznwcqnieolfit.supabase.co;",
          "font-src 'self';",
          "connect-src 'self' https://*.googleapis.com https://identitytoolkit.googleapis.com https://opwsfrnznwcqnieolfit.supabase.co https://www.google-analytics.com;",
          `frame-src 'self' https://gamesave-syncer.firebaseapp.com;`
        ].join(' ')
      }
    });
  });

  createWindow();

  // It's safer to clear cache on the specific window's session if needed, but this is okay.
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    win.webContents.session.clearCache();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Main Handlers (No changes needed here) ---

ipcMain.handle('shell:openPath', async (event, filePath) => {
  console.log(`Main process: Received request to open path: ${filePath}`);
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Main process: Failed to open path:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('local:syncGame', async (event, { sourcePath, destinationPath }) => {
  console.log(`Main process: Received request to sync from: ${sourcePath} to: ${destinationPath}`);
  try {
    await fs.ensureDir(destinationPath);
    await fs.copy(sourcePath, destinationPath, { overwrite: true });
    return { success: true, message: `Successfully synced ${sourcePath} to ${destinationPath}` };
  } catch (error) {
    console.error('Main process: Local sync failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('local:createCheckpoint', async (event, { gameId, gamePath, checkpointBasePath, description }) => {
  console.log(`Main process: Received request to create checkpoint for game ${gameId} from ${gamePath}`);
  try {
    const timestamp = new Date().getTime();
    const checkpointDir = path.join(checkpointBasePath, `${gameId}-${timestamp}`);
    await fs.ensureDir(checkpointDir);
    await fs.copy(gamePath, checkpointDir, { overwrite: true });
    // --- START: Added Code ---
    const sizeInBytes = await getFolderSize(checkpointDir);
    console.log(`[Local Checkpoint] Calculated size for ${checkpointDir}: ${sizeInBytes} bytes.`);
    // --- END: Added Code ---
    return { success: true, path: checkpointDir, size: sizeInBytes, message: `Checkpoint created at ${checkpointDir}` };
  } catch (error) {
    console.error('Main process: Error creating local checkpoint:', error);
    return { success: false, error: error.message || 'Unknown error creating checkpoint' };
  }
});

ipcMain.handle('local:restoreCheckpoint', async (event, { checkpointPath, gamePath }) => {
  console.log(`Main process: Received request to restore from: ${checkpointPath} to: ${gamePath}`);

  try {
    const backupPath = `${gamePath}_backup`;
    if (await fs.pathExists(gamePath)) {
      if (await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
        console.log(`Main process: Removed old backup at: ${backupPath}`);
      }
      await fs.rename(gamePath, backupPath);
      console.log(`Main process: Backed up current game save to: ${backupPath}`);
    }
    await fs.copy(checkpointPath, gamePath);
    console.log(`Main process: Restored checkpoint to: ${gamePath}`);
    return { success: true, message: `Checkpoint restored successfully.` };
  } catch (error) {
    console.error('Main process: Error restoring local checkpoint:', error);
    return { success: false, error: error.message || 'Unknown error restoring checkpoint' };
  }
});

ipcMain.handle('local:deleteCheckpoint', async (event, { checkpointPath }) => {
  console.log(`Main process: Received request to delete checkpoint at: ${checkpointPath}`);
  try {
    await fs.remove(checkpointPath);
    return { success: true, message: `Checkpoint deleted: ${checkpointPath}` };
  } catch (error) {
    console.error('Main process: Error deleting local checkpoint:', error);
    return { success: false, error: error.message || 'Unknown error deleting checkpoint' };
  }
});

ipcMain.handle('launch-game', async (event, gamePath) => {
  console.log(`Main process: Received request to launch path: ${gamePath}`);
  try {
    await shell.openPath(gamePath);
    return { success: true };
  } catch (error) {
    console.error('Main process: Failed to launch game:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-path-dialog', async (event, options) => {
  console.log(`Main process: Received request for path dialog with mode: ${options.mode}`);
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return null;

  let dialogProperties = [];
  if (options.mode === 'file') {
    dialogProperties = ['openFile'];
  } else if (options.mode === 'folder') {
    dialogProperties = ['openDirectory'];
  } else {
    dialogProperties = ['openFile', 'openDirectory'];
  }

  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Select Path',
      buttonLabel: 'Select',
      properties: dialogProperties,
      filters: options.mode === 'file' ? [
        { name: 'Executables', extensions: ['exe', 'bat', 'cmd'] },
        { name: 'All Files', extensions: ['*'] }
      ] : []
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return null;
    } else {
      return filePaths[0];
    }
  } catch (error) {
    console.error(`Error in 'show-path-dialog' handler:`, error);
    return null;
  }
});

ipcMain.handle('open-logs-folder', async () => {
  try {
    const logsPath = app.getPath('userData');
    await shell.openPath(logsPath);
    return true;
  } catch (error) {
    console.error('Failed to open logs folder:', error);
    return false;
  }
});

ipcMain.handle('scan-for-backups', async (event, games) => {
  console.log('Main process: Received request to scan for backups.');
  const foundBackups = [];
  for (const game of games) {


    const backupPatternsToScan = [
      {
        type: 'local_checkpoint_restore', // Backup created when restoring a *local* checkpoint
        path: `${game.path}_backup`,
        displayNameSuffix: " (Local Restore Backup)" // Suffix for display in UI
      },
      {
        type: 'github_checkpoint_restore', // Backup created when restoring a *GitHub* checkpoint
        path: `${game.path}_backup_github-restore`, // This matches the consistent name from Option A
        displayNameSuffix: " (GitHub Restore Backup)" // Suffix for display in UI
      },
      // You can add more patterns here if you introduce other backup mechanisms in the future
    ];

    for (const pattern of backupPatternsToScan) {
      if (await fs.pathExists(pattern.path)) {
        foundBackups.push({
          gameId: game.id,
          gameName: `${game.name}${pattern.displayNameSuffix}`, // Append suffix to game name for clarity in the UI
          backupPath: pattern.path,
          // Optionally, add a type if your UI needs to treat them differently (e.g., different icons or actions)
          // backupType: pattern.type
        });
      }
    }














    const backupPath = `${game.path}_backup`;
    if (await fs.pathExists(backupPath)) {
      foundBackups.push({
        gameId: game.id,
        gameName: game.name,
        backupPath: backupPath,
      });
    }
  }
  console.log(`Main process: Found ${foundBackups.length} backups.`);
  return foundBackups;
});

ipcMain.handle('delete-backup', async (event, backupPath) => {
  console.log(`Main process: Received request to delete backup at: ${backupPath}`);
  try {
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
      return { success: true };
    }
    return { success: false, error: 'Backup path not found.' };
  } catch (error) {
    console.error('Main process: Error deleting backup:', error);
    return { success: false, error: error.message };
  }
});

// In electron.js



ipcMain.handle('app:copyImage', async (event, fileData) => {
  const { buffer, name } = fileData;
  console.log(`[Main Process] Received 'app:copyImage' request for file: ${name}`);

  try {
    // 1. Create a temporary path for the file from the renderer.
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${name}`);

    // 2. Write the buffer from the renderer to this temporary file.
    // Node.js's fs.writeFile can handle the ArrayBuffer directly.
    await fs.writeFile(tempFilePath, Buffer.from(buffer));
    console.log(`[Main Process] Wrote renderer buffer to temp file: ${tempFilePath}`);

    // 3. Now that you have a real file on the filesystem, proceed as before.
    const userDataPath = app.getPath('userData');
    const mediaDir = path.join(userDataPath, 'media', 'images');
    await fs.ensureDir(mediaDir);

    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}${path.extname(name)}`;
    const destinationPath = path.join(mediaDir, uniqueFilename);

    // 4. Copy from the temporary file to the final destination.
    await fs.copy(tempFilePath, destinationPath);
    console.log(`[Main Process] Successfully copied image to: ${destinationPath}`);

    // 5. Clean up the temporary file.
    await fs.remove(tempFilePath);

    // 6. Return the permanent, absolute path.
    return destinationPath;

  } catch (error) {
    console.error('[Main Process] FAILED to process and copy image:', error);
    return null;
  }
});


ipcMain.handle('github:set-config', async (event, config) => {
  if (!config || !config.pat || !config.repoOwner || !config.repoName) {
    return { success: false, error: 'Invalid configuration data provided.' };
  }
  try {
    store.set('githubPat', config.pat);
    store.set('githubRepoOwner', config.repoOwner);
    store.set('githubRepoName', config.repoName);
    console.log('[GitHub Config] Settings saved.');
    // Optional: Test connection here with a simple read API call to verify PAT/repo
    // For example, try to get repo info:
    // const octokit = new Octokit({ auth: config.pat });
    // await octokit.rest.repos.get({ owner: config.repoOwner, repo: config.repoName });
    return { success: true };
  } catch (error) {
    console.error('[GitHub Config] Error saving settings:', error);
    // If the test API call above fails, return specific error
    return { success: false, error: `Failed to save or verify GitHub config: ${error.message}` };
  }
});



ipcMain.handle('github:get-config', async () => {
  try {
    const pat = store.get('githubPat');
    const repoOwner = store.get('githubRepoOwner');
    const repoName = store.get('githubRepoName');
    // Do not return the PAT to the renderer if it's not strictly needed for display.
    // For now, we return it as the renderer uses it in state, but ideally, only confirm existence.
    if (pat && repoOwner && repoName) {
      console.log('[GitHub Config] Settings retrieved.');
      return { success: true, pat, repoOwner, repoName }; // Renderer expects pat for now
    }
    return { success: false, error: 'GitHub configuration not found in store.' };
  } catch (error) {
    console.error('[GitHub Config] Error getting settings:', error);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('github:clear-config', async () => {
  try {
    store.delete('githubPat');
    store.delete('githubRepoOwner');
    store.delete('githubRepoName');
    console.log('[GitHub Config] Settings cleared.');
    return { success: true };
  } catch (error) {
    console.error('[GitHub Config] Error clearing settings:', error);
    return { success: false, error: error.message };
  }
});

async function getGithubFileSha(octokit, owner, repo, filePathInRepo) {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePathInRepo,
    });
    return data.sha; // This is a string
  } catch (error) {
    if (error.status === 404) {
      return null; // File doesn't exist, so no SHA
    }
    console.error(`[GitHub SHA] Error fetching SHA for ${filePathInRepo} in ${owner}/${repo}:`, error.status, error.message);
    throw error;
  }
}

ipcMain.handle('github:sync-game', async (event, { gameName, gamePath }) => {
  const pat = store.get('githubPat');
  const owner = store.get('githubRepoOwner');
  const repo = store.get('githubRepoName');

  if (!pat || !owner || !repo) {
    return { success: false, error: 'GitHub not configured. Please set PAT, owner, and repository name in Cloud Sync settings.' };
  }
  if (!gameName || !gamePath) {
    return { success: false, error: 'Game name or game path missing for GitHub sync.' };
  }

  const octokit = new Octokit({ auth: pat });

  const sanitizedGameName = gameName.replace(/[^\w.-]/g, '_');
  const repoFilePath = `game-saves/${sanitizedGameName}/${sanitizedGameName}_latest.zip`; // Path within the GitHub repo
  const tempZipPath = path.join(os.tmpdir(), `gamesync_${sanitizedGameName}_${Date.now()}.zip`);

  try {
    // 1. Check if gamePath exists and is accessible (You already have this)
    if (!await fs.pathExists(gamePath)) {
      throw new Error(`Game save path not found: ${gamePath}`);
    }

    // --- Start: Ensure this block is correctly implemented ---
    // 2. Create a zip file of the game save directory/file
    const zip = new AdmZip();
    const stats = await fs.stat(gamePath);

    if (stats.isDirectory()) {
      console.log(`[GitHub Sync] Zipping directory: ${gamePath}`);
      zip.addLocalFolder(gamePath, path.basename(gamePath)); // Adds the folder itself into the zip
    } else { // It's a file
      console.log(`[GitHub Sync] Zipping file: ${gamePath}`);
      zip.addLocalFile(gamePath); // Adds the file to the root of the zip
    }

    zip.writeZip(tempZipPath); // Synchronous write
    console.log(`[GitHub Sync] Zipped to temporary location: ${tempZipPath}`);

    // 3. Read the zip file content into a base64 string
    const contentBuffer = await fs.readFile(tempZipPath);
    if (contentBuffer.length === 0) {
      throw new Error(`Temporary zip file at ${tempZipPath} is empty. Check if game path "${gamePath}" contains data.`);
    }
    const contentBase64 = contentBuffer.toString('base64');

    // 4. Get SHA of the existing file on GitHub (if it exists) for updating
    const existingFileSha = await getGithubFileSha(octokit, owner, repo, repoFilePath);
    console.log(`[GitHub Sync] Existing file SHA for ${repoFilePath}: ${existingFileSha || 'null (new file)'}`);

    // 5. Upload to GitHub
    const commitMessage = `Sync game save: ${gameName} (${new Date().toISOString()})`;
    console.log(`[GitHub Sync] Attempting to upload/update ${repoFilePath} in ${owner}/${repo}`);
    const { data: uploadData } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: repoFilePath,
      message: commitMessage,
      content: contentBase64,
      sha: existingFileSha,
      committer: {
        name: 'GameSync Pro App',
        email: 'app@example.com',
      },
      author: {
        name: 'GameSync Pro User',
        email: 'user@example.com',
      },
    });

    console.log('[GitHub Sync] File uploaded/updated successfully:', uploadData.content?.html_url);
    // --- End: Ensure this block is correctly implemented ---

    return { success: true, message: `Successfully synced ${gameName} to GitHub.`, url: uploadData.content?.html_url };

  } catch (error) {
    // Your existing error handling logic
    console.error('[GitHub Sync] Error during sync process:', error.status, error.message, error.response?.data?.message);
    let userFriendlyError = `GitHub Sync Failed: ${error.message || 'Unknown error'}`;
    if (error.response?.data?.message) { // GitHub API often provides a message here
      userFriendlyError = `GitHub API Error: ${error.response.data.message}`;
    }
    if (error.status === 401) userFriendlyError = 'GitHub PAT is invalid, expired, or lacks `repo` scope.';
    else if (error.status === 404) {
      // Check if it's the repo or the file path for SHA
      if (error.message.toLowerCase().includes("not found") || error.response?.data?.message.toLowerCase().includes("not found")) {
        userFriendlyError = `Repository '${owner}/${repo}' not found, or PAT lacks permission. If updating, the file path '${repoFilePath}' might also be incorrect.`;
      }
    }
    else if (error.status === 409 && error.message.toLowerCase().includes("empty")) userFriendlyError = `The content being pushed might be empty. Check if the save path "${gamePath}" contains files and zipping was successful.`;
    else if (error.status === 422) userFriendlyError = `Could not create/update file on GitHub (Unprocessable Entity). The save path "${gamePath}" might be empty, or the content is too large (>100MB typically for direct API, or >25MB for web UI).`;
    else if (error.message.includes("Game save path not found")) userFriendlyError = error.message;
    else if (error.message.includes("Temporary zip file at")) userFriendlyError = error.message;


    return { success: false, error: userFriendlyError };
  } finally {
    // 6. Clean up temporary zip file
    if (await fs.pathExists(tempZipPath)) {
      try {
        await fs.remove(tempZipPath);
        console.log(`[GitHub Sync] Cleaned up temporary zip: ${tempZipPath}`);
      } catch (cleanupError) {
        console.error(`[GitHub Sync] Error cleaning up temp zip ${tempZipPath}:`, cleanupError);
      }
    }
  }
});



ipcMain.handle('github:create-checkpoint-release', async (event, {
  gamesToBackup, // Array of { name: string, path: string, id: string }
  isFolderCheckpoint, // boolean
  checkpointDescription, // string (user-provided description)
  providerGameName // For folder checkpoint, this would be "Folder Checkpoint"
}) => {
  const pat = store.get('githubPat');
  const owner = store.get('githubRepoOwner');
  const repo = store.get('githubRepoName');

  if (!pat || !owner || !repo) {
    return { success: false, error: 'GitHub not configured. Please set PAT, owner, and repository name in Cloud Sync settings.' };
  }
  if (!gamesToBackup || gamesToBackup.length === 0) {
    return { success: false, error: 'No games provided for checkpoint.' };
  }

  const octokit = new Octokit({ auth: pat });
  const { tagFormat: timestampTag, displayFormat: timestampDisplay } = getFormattedTimestamp();
  // Create a unique parent temporary directory for all zips for this operation
  const operationTempDir = path.join(os.tmpdir(), `gamesync_checkpoint_op_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
  await fs.ensureDir(operationTempDir);

  let releaseTag, releaseName, releaseBody;
  const assetsToUpload = []; // Array of { path: string, name: string, gameNameForLog: string }

  try {
    if (isFolderCheckpoint) {
      // --- Logic for Folder Checkpoint (All games in one release) ---
      const folderName = sanitizeForTagName(providerGameName || 'Folder-Checkpoint');
      releaseTag = `checkpoint_${folderName}_${timestampTag}`;
      releaseName = `${providerGameName || 'Folder Checkpoint'} - ${timestampDisplay}`;

      const gameListForBody = gamesToBackup.map(g => `- ${g.name} (ID: ${g.id})`).join('\n');
      releaseBody = `Folder checkpoint created on ${timestampDisplay}.\n\nDescription: ${checkpointDescription || 'N/A'}\n\nGames included:\n${gameListForBody}`;

      const allGamesZip = new AdmZip();
      let atLeastOneGameZipped = false;
      for (const game of gamesToBackup) {
        if (!await fs.pathExists(game.path)) {
          console.warn(`[GitHub Checkpoint] Path for ${game.name} not found: ${game.path}. Skipping for folder checkpoint.`);
          continue;
        }
        const stats = await fs.stat(game.path);
        const sanitizedGameFolderName = sanitizeForTagName(game.name); // This will be the folder name inside the zip

        if (stats.isDirectory()) {
          const filesInDir = await fs.readdir(game.path);
          if (filesInDir.length === 0) {
            console.warn(`[GitHub Checkpoint] Source directory for ${game.name} is empty. Skipping for folder checkpoint.`);
            continue;
          }
          allGamesZip.addLocalFolder(game.path, sanitizedGameFolderName);
          atLeastOneGameZipped = true;
        } else { // It's a file
          if (stats.size === 0) {
            console.warn(`[GitHub Checkpoint] Source file for ${game.name} is empty. Skipping for folder checkpoint.`);
            continue;
          }
          // Add file into a folder named after the game for consistency
          allGamesZip.addLocalFile(game.path, path.join(sanitizedGameFolderName, path.basename(game.path)));
          atLeastOneGameZipped = true;
        }
      }

      if (!atLeastOneGameZipped) {
        throw new Error("No valid game paths with content found to include in the folder checkpoint.");
      }

      const folderZipFileName = `${folderName}_${timestampTag}.zip`;
      const folderZipPath = path.join(operationTempDir, folderZipFileName);

      if (typeof allGamesZip.writeZipPromise === 'function') {
        await allGamesZip.writeZipPromise(folderZipPath);
      } else {
        await new Promise((resolve, reject) => { // Fallback
          allGamesZip.writeZip(folderZipPath, (err) => err ? reject(err) : resolve());
        });
      }
      assetsToUpload.push({ path: folderZipPath, name: folderZipFileName, gameNameForLog: providerGameName || "Folder Checkpoint" });

    } else {
      // --- Logic for Individual Checkpoint (one game per call) ---
      if (gamesToBackup.length !== 1) {
        console.error("[GitHub Checkpoint] 'Individual' checkpoint type should process one game per IPC call. Received: ", gamesToBackup.length);
        throw new Error("Internal error: Individual checkpoint should process one game at a time.");
      }
      const game = gamesToBackup[0];
      const sanitizedGameName = sanitizeForTagName(game.name);

      releaseTag = `checkpoint_${sanitizedGameName}_${timestampTag}`;
      releaseName = `Checkpoint: ${game.name} - ${timestampDisplay}`;
      releaseBody = `Checkpoint for ${game.name} created on ${timestampDisplay}.\n\nDescription: ${checkpointDescription || 'N/A'}`;

      const { tempZipPath, tempZipFileName } = await createZipForGame(game.name, game.path, operationTempDir);
      assetsToUpload.push({ path: tempZipPath, name: tempZipFileName, gameNameForLog: game.name });
    }

    if (assetsToUpload.length === 0) {
      throw new Error("No assets were prepared for upload. Check game paths and zipping process.");
    }

    // 1. Create the Release
    console.log(`[GitHub Checkpoint] Creating release: Tag='${releaseTag}', Name='${releaseName}' for game(s): ${assetsToUpload.map(a => a.gameNameForLog).join(', ')}`);
    const { data: releaseData } = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: releaseTag,
      name: releaseName,
      body: releaseBody,
      draft: false,
      prerelease: false,
    });
    console.log(`[GitHub Checkpoint] Release created: ${releaseData.html_url}`);

    // 2. Upload Assets to the Release
    for (const asset of assetsToUpload) {
      console.log(`[GitHub Checkpoint] Uploading asset '${asset.name}' (for ${asset.gameNameForLog}) to release ID ${releaseData.id}`);
      const assetFileContent = await fs.readFile(asset.path);
      if (assetFileContent.length === 0) {
        console.warn(`[GitHub Checkpoint] Asset file ${asset.name} is empty. Skipping upload for this asset.`);
        continue; // Skip uploading empty assets
      }
      await octokit.rest.repos.uploadReleaseAsset({
        owner,
        repo,
        release_id: releaseData.id,
        name: asset.name, // This is the filename for the asset in the release
        data: assetFileContent,
        headers: {
          'content-type': 'application/zip',
          'content-length': assetFileContent.length,
        },
      });
      console.log(`[GitHub Checkpoint] Asset '${asset.name}' uploaded.`);
    }

    return { success: true, message: `GitHub checkpoint release '${releaseName}' created.`, url: releaseData.html_url, releaseName: releaseName, releaseTag: releaseTag, size: size };

  } catch (error) {
    console.error('[GitHub Checkpoint] Error creating checkpoint release:', error.status, error.message, error.response?.data?.message, error.stack);
    let userFriendlyError = `GitHub Checkpoint Failed: ${error.message || 'Unknown error'}`;
    if (error.response?.data?.message) {
      userFriendlyError = `GitHub API Error: ${error.response.data.message}`;
    }
    if (error.status === 401) userFriendlyError = 'GitHub PAT is invalid, expired, or lacks `repo` scope.';
    else if (error.status === 404) userFriendlyError = `Repository '${owner}/${repo}' not found, or PAT lacks permission.`;
    else if (error.status === 422) userFriendlyError = 'GitHub API Error (Unprocessable Entity): Tag might already exist, or data is invalid. Ensure game saves are not empty.';
    else if (error.message.includes("is empty")) userFriendlyError = error.message; // From our custom empty checks

    return { success: false, error: userFriendlyError };
  } finally {
    if (await fs.pathExists(operationTempDir)) {
      try {
        await fs.remove(operationTempDir);
        console.log(`[GitHub Checkpoint] Cleaned up temporary operation directory: ${operationTempDir}`);
      } catch (cleanupError) {
        console.error(`[GitHub Checkpoint] Error cleaning up temp dir ${operationTempDir}:`, cleanupError);
      }
    }
  }
});



async function getReleaseIdByTagName(octokit, owner, repo, tagName) {
  try {
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: tagName,
    });
    return release.id;
  } catch (error) {
    if (error.status === 404) {
      console.warn(`[GitHub Delete] Release with tag '${tagName}' not found.`);
      return null;
    }
    console.error(`[GitHub Delete] Error fetching release by tag '${tagName}':`, error.message);
    throw error; // Re-throw other errors
  }
}

ipcMain.handle('github:delete-checkpoint-release', async (event, { releaseTag }) => {
  const pat = store.get('githubPat');
  const owner = store.get('githubRepoOwner');
  const repo = store.get('githubRepoName');

  if (!pat || !owner || !repo) {
    return { success: false, error: 'GitHub not configured.' };
  }
  if (!releaseTag) {
    return { success: false, error: 'Release tag not provided for deletion.' };
  }

  const octokit = new Octokit({ auth: pat });

  try {
    console.log(`[GitHub Delete] Attempting to delete release with tag: ${releaseTag}`);

    // GitHub API requires release_id to delete a release. We need to get it from the tag.
    const releaseId = await getReleaseIdByTagName(octokit, owner, repo, releaseTag);

    if (!releaseId) {
      // If release is not found by tag, it might have already been deleted, or tag is wrong.
      // We can consider this a "success" in terms of the app's state, as the checkpoint is effectively gone from GitHub.
      console.warn(`[GitHub Delete] Release for tag '${releaseTag}' not found on GitHub. It might have been already deleted.`);
      // Optionally, you might want to try deleting just the tag if the release is gone but tag might persist (less common for release tags)
      // try {
      //   await octokit.rest.git.deleteRef({ owner, repo, ref: `tags/${releaseTag}` });
      //   console.log(`[GitHub Delete] Deleted orphaned tag '${releaseTag}'`);
      // } catch (tagDeleteError) {
      //   if (tagDeleteError.status !== 404 && tagDeleteError.status !== 422) { // 422 if ref doesn't exist
      //     console.warn(`[GitHub Delete] Could not delete orphaned tag '${releaseTag}': ${tagDeleteError.message}`);
      //   }
      // }
      return { success: true, message: `Release for tag '${releaseTag}' not found or already deleted on GitHub.` };
    }

    // Delete the release
    await octokit.rest.repos.deleteRelease({
      owner,
      repo,
      release_id: releaseId,
    });
    console.log(`[GitHub Delete] Successfully deleted release ID ${releaseId} (Tag: ${releaseTag})`);

    // Optionally, try to delete the git tag as well.
    // Deleting a release does NOT automatically delete the underlying git tag.
    try {
      await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `tags/${releaseTag}`, // API expects 'tags/tag_name'
      });
      console.log(`[GitHub Delete] Successfully deleted tag: ${releaseTag}`);
    } catch (tagError) {
      // It's possible the tag was already deleted or couldn't be found (e.g., if it was a lightweight tag not directly associated with a commit object in a way the API expects for this call, or if it was part of the deleted release's automatic tag).
      // This is often a non-critical error if the release itself is gone.
      if (tagError.status !== 404 && tagError.status !== 422) { // 422 if ref doesn't exist or is not a tag
        console.warn(`[GitHub Delete] Could not delete tag '${releaseTag}' after deleting release: ${tagError.message}. This might be okay if the release deletion handled it or it was a lightweight tag.`);
      } else {
        console.log(`[GitHub Delete] Tag '${releaseTag}' likely already removed or not found for standalone deletion.`);
      }
    }

    return { success: true, message: `Successfully deleted GitHub release and tag: ${releaseTag}` };

  } catch (error) {
    console.error('[GitHub Delete] Error deleting checkpoint release:', error.status, error.message);
    let userFriendlyError = `GitHub Delete Failed: ${error.message || 'Unknown error'}`;
    if (error.response?.data?.message) {
      userFriendlyError = `GitHub API Error: ${error.response.data.message}`;
    }
    // Add specific error status handling
    return { success: false, error: userFriendlyError };
  }
});




ipcMain.handle('github:restore-checkpoint-release', async (event, {
  releaseTag,    // To identify the release (this comes from checkpoint.id in App.tsx)
  gamePath,      // The local path to restore the game save to
  gameName       // For logging/notifications (this is checkpoint.gameName from App.tsx)
}) => {
  const pat = store.get('githubPat');
  const owner = store.get('githubRepoOwner');
  const repo = store.get('githubRepoName');

  if (!pat || !owner || !repo) {
    return { success: false, error: 'GitHub not configured.' };
  }
  if (!releaseTag || !gamePath || !gameName) {
    return { success: false, error: 'Missing releaseTag, gamePath, or gameName for GitHub restore.' };
  }

  const octokit = new Octokit({ auth: pat });
  // More unique temporary directory name
  const tempDownloadDir = path.join(os.tmpdir(), `gamesync_restore_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
  let tempZipPath = ''; // Will be defined after asset is found and downloaded

  try {
    await fs.ensureDir(tempDownloadDir);
    console.log(`[GitHub Restore] Attempting to restore for "${gameName}" from release tag "${releaseTag}"`);

    // 1. Get the release details using the tag
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: releaseTag,
    });

    if (!release || !release.assets || release.assets.length === 0) {
      throw new Error(`Release with tag '${releaseTag}' not found or has no assets on GitHub.`);
    }

    // 2. Find the first .zip asset in the release's assets array
    const assetToDownload = release.assets.find(a => a.name.toLowerCase().endsWith('.zip'));
    if (!assetToDownload) {
      const availableAssetNames = release.assets.map(a => a.name).join(', ') || 'none';
      throw new Error(`No .zip asset found in release '${releaseTag}'. Available assets: ${availableAssetNames}`);
    }
    const foundAssetName = assetToDownload.name; // This is the name of the .zip file we found

    console.log(`[GitHub Restore] Found asset: ID=${assetToDownload.id}, Name='${foundAssetName}', Download URL: ${assetToDownload.browser_download_url}`);

    // 3. Download the found asset
    tempZipPath = path.join(tempDownloadDir, foundAssetName); // Use the name of the asset we found
    const writer = fs.createWriteStream(tempZipPath);

    const response = await axios({
      method: 'get',
      url: assetToDownload.url,
      responseType: 'stream',
      headers: {
        Accept: 'application/octet-stream', // Request binary data
        Authorization: `token ${pat}` // Usually not needed for browser_download_url if repo is public or PAT has access
      },
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => reject(new Error(`Failed to write downloaded asset to disk: ${err.message}`)));
    });
    console.log(`[GitHub Restore] Asset '${foundAssetName}' downloaded to: ${tempZipPath}`);

    // Verify downloaded file is not empty
    const downloadedFileStats = await fs.stat(tempZipPath);
    if (downloadedFileStats.size === 0) {
      throw new Error(`Downloaded asset '${foundAssetName}' is empty. Check the release on GitHub.`);
    }

    // 4. Backup current game save directory/file
    const backupTimestamp = Date.now(); // Use current time for unique backup name
    const backupPath = `${gamePath}_backup_github-restore`; // Consistent name

    if (await fs.pathExists(gamePath)) {
      if (await fs.pathExists(backupPath)) {
        // If a previous GitHub restore backup exists, remove it first
        await fs.remove(backupPath);
        console.log(`[GitHub Restore] Removed previous GitHub restore backup at: ${backupPath}`);
      }
      // Now move the current gamePath to the consistent backupPath
      await fs.move(gamePath, backupPath, { overwrite: true });
      console.log(`[GitHub Restore] Backed up current game save for "${gameName}" to: ${backupPath}`);
    } else {
      // If original gamePath doesn't exist, ensure its parent directory exists for extraction.
      await fs.ensureDir(path.dirname(gamePath));
      console.log(`[GitHub Restore] Original game path "${gamePath}" does not exist. Will attempt to create during extraction.`);
    }

    // 5. Extract the downloaded ZIP to the gamePath
    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();
    if (zipEntries.length === 0) {
      throw new Error(`The downloaded zip file '${foundAssetName}' is empty or corrupted.`);
    }

    await fs.ensureDir(gamePath); // Ensure the target gamePath directory exists for extraction

    // Refined extraction logic:
    // This logic assumes that if the zip was created by `createZipForGame`,
    // it contains a single root folder named like path.basename(gamePath) (e.g., "MyGame").
    // We want to extract the *contents* of that folder into the actual gamePath.
    const gameFolderInZipName = path.basename(gamePath); // e.g., "MyGame"
    let successfullyExtractedCorrectly = false;

    if (zipEntries.length > 0 && zipEntries.some(e => e.entryName.startsWith(gameFolderInZipName + "/"))) {
      // Try to extract only the contents of the game-specific folder from the zip
      const tempExtractSubFolder = path.join(tempDownloadDir, 'temp_extracted_game_data');
      await fs.ensureDir(tempExtractSubFolder);
      zip.extractAllTo(tempExtractSubFolder, true); // Extract everything to a temp spot

      const sourceOfExtractedGameData = path.join(tempExtractSubFolder, gameFolderInZipName);
      if (await fs.pathExists(sourceOfExtractedGameData)) {
        const itemsToCopy = await fs.readdir(sourceOfExtractedGameData);
        for (const item of itemsToCopy) {
          await fs.copy(path.join(sourceOfExtractedGameData, item), path.join(gamePath, item), { overwrite: true });
        }
        console.log(`[GitHub Restore] Extracted contents of '${gameFolderInZipName}' (from zip) into '${gamePath}'`);
        successfullyExtractedCorrectly = true;
      } else {
        console.warn(`[GitHub Restore] Expected root folder '${gameFolderInZipName}' not found in zip after temp extraction. Will attempt to extract all entries to gamePath.`);
      }
    }

    if (!successfullyExtractedCorrectly) {
      // Fallback: If the specific folder wasn't found or another structure, extract all to gamePath.
      // This might create an extra subfolder if the zip wasn't structured as expected.
      console.log(`[GitHub Restore] Fallback: Extracting all entries from '${foundAssetName}' directly into '${gamePath}'`);
      zip.extractAllTo(gamePath, true /* overwrite */);
    }

    console.log(`[GitHub Restore] Extraction complete for asset '${foundAssetName}', targeting final structure at '${gamePath}'.`);

    return { success: true, message: `Successfully restored "${gameName}" from GitHub checkpoint (Tag: ${releaseTag}).` };

  } catch (error) {
    console.error('[IPC github:restore-checkpoint-release] Error:', error.status, error.message, error.stack);
    let userFriendlyError = `GitHub Restore Failed: ${error.message || 'Unknown error'}`;
    if (error.response && error.response.data && error.response.data.message) { // Axios error structure
      userFriendlyError = `GitHub API Error: ${error.response.data.message}`;
    } else if (error.status) { // Octokit error structure
      userFriendlyError = `GitHub API Error (Status ${error.status}): ${error.message}`;
    }
    return { success: false, error: userFriendlyError };
  } finally {
    if (await fs.pathExists(tempDownloadDir)) {
      try {
        await fs.remove(tempDownloadDir);
        console.log(`[GitHub Restore] Cleaned up temporary download directory: ${tempDownloadDir}`);
      } catch (cleanupError) {
        console.error(`[GitHub Restore] Error cleaning up temp dir ${tempDownloadDir}:`, cleanupError);
      }
    }
  }
});

async function getIgdbAccessToken() {
  const existingToken = store.get('igdb_access_token');
  const tokenExpiresAt = store.get('igdb_token_expires_at');

  // Use the cached token if it's still valid
  if (existingToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    console.log('[IGDB Auth] Using cached access token.');
    return existingToken;
  }

  console.log('[IGDB Auth] No valid token found, requesting a new one from Twitch...');
  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      },
    });

    const { access_token, expires_in } = response.data;
    // Set expiry time to 1 minute before it actually expires, for safety
    const expiresAt = Date.now() + (expires_in * 1000) - 60000;

    store.set('igdb_access_token', access_token);
    store.set('igdb_token_expires_at', expiresAt);

    console.log('[IGDB Auth] New token acquired and cached.');
    return access_token;
  } catch (error) {
    console.error('[IGDB Auth] FAILED to get Twitch access token:', error.response?.data || error.message);
    throw new Error('Could not authenticate with Twitch/IGDB. Check your credentials.');
  }
}



// ----- 1. REPLACE your existing 'igdb:search' handler with this -----
ipcMain.handle('igdb:search', async (event, query) => {
  console.log(`[IGDB Search] Received search request for: "${query}"`);
  try {
    const accessToken = await getIgdbAccessToken();
    const clientId = process.env.TWITCH_CLIENT_ID;

    if (!clientId) {
      throw new Error('TWITCH_CLIENT_ID is not defined in your environment.');
    }

    const apiClient = igdb(clientId, accessToken);

    // Ask for the 'cover' to use as a preview
    const { data } = await apiClient
      .fields(['name', 'summary', 'cover.image_id'])
      .search(query)
      .where('category = 0 & version_parent = null')
      .limit(10)
      .request('/games');

    const formattedResults = data.map(game => {
      const cover = game.cover;

      return {
        igdb_id: game.id,
        name: game.name,
        summary: game.summary,
        // Populate the NEW field for the search modal preview
        searchPreviewUrl: cover
          ? `https://images.igdb.com/igdb/image/upload/t_cover_small/${cover.image_id}.jpg`
          : undefined,
        // Ensure the final bannerUrl is explicitly undefined here
        bannerUrl: undefined,
        coverArtUrl: undefined,
      };
    });

    console.log(`[IGDB Search] Found ${formattedResults.length} results.`);
    return { success: true, data: formattedResults };

  } catch (error) {
    console.error('[IGDB Search] FAILED:', error.message);
    return { success: false, error: error.message };
  }
});



ipcMain.handle('igdb:get-game-details', async (event, gameId) => {
  console.log(`[IGDB Details] Received request for game ID: "${gameId}"`);
  try {
    const accessToken = await getIgdbAccessToken();
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      throw new Error('TWITCH_CLIENT_ID is not defined in your environment.');
    }

    const apiClient = igdb(clientId, accessToken);

    // Request artworks, screenshots, and release dates with platform info
    const { data } = await apiClient
      .fields([
        'name',
        'summary',
        'artworks.image_id',
        'screenshots.image_id',
        'release_dates.platform', // Get platform ID for each release
        'release_dates.game.cover.image_id' // Get cover associated with each release
      ])
      .where(`id = ${gameId}`)
      .request('/games');

    if (!data || data.length === 0) {
      throw new Error(`No game found with ID: ${gameId}`);
    }

    const game = data[0];
    let bannerUrl;
    let coverArtUrl;

    // --- Banner Selection Logic (Unchanged, it's correct) ---
    const bannerImage = game.artworks && game.artworks.length > 0
      ? game.artworks[0]
      : (game.screenshots && game.screenshots.length > 0 ? game.screenshots[0] : null);

    if (bannerImage) {
      bannerUrl = `https://images.igdb.com/igdb/image/upload/t_screenshot_big/${bannerImage.image_id}.jpg`;
    }

    // --- PC Cover Art Selection Logic (NEW and IMPROVED) ---
    // The platform ID for PC (Windows) is 6
    const pcRelease = game.release_dates?.find(date => date.platform === 6);

    if (pcRelease && pcRelease.game?.cover?.image_id) {
      // We found a specific release for PC (Windows) and it has a cover! Use it.
      coverArtUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${pcRelease.game.cover.image_id}.jpg`;
      console.log(`[IGDB Details] Found specific PC cover art for ${game.name}.`);
    } else if (game.release_dates && game.release_dates.length > 0 && game.release_dates[0].game?.cover?.image_id) {
      // Fallback: Use the cover from the first available release if no PC one is found
      coverArtUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.release_dates[0].game.cover.image_id}.jpg`;
      console.log(`[IGDB Details] No PC cover found. Using first available cover for ${game.name}.`);
    }

    const formattedResult = {
      name: game.name,
      summary: game.summary,
      bannerUrl: bannerUrl,
      coverArtUrl: coverArtUrl,
    };

    console.log(`[IGDB Details] Final details for ${game.name}: Banner=${!!bannerUrl}, Cover=${!!coverArtUrl}`);
    return { success: true, data: formattedResult };

  } catch (error) {
    console.error('[IGDB Details] FAILED:', error.message);
    return { success: false, error: error.message };
  }
});

// --- Steam API Handlers ---

// Cache for top games list (fetch once, paginate in-memory)
let _topGamesCache = null;
let _topGamesCacheTime = 0;
const TOP_GAMES_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchTopGames() {
  const now = Date.now();
  if (_topGamesCache && (now - _topGamesCacheTime) < TOP_GAMES_TTL) {
    return _topGamesCache;
  }
  // Fetch two lists and merge for more variety (200+ games)
  const [r1, r2] = await Promise.allSettled([
    axios.get('https://steamspy.com/api.php?request=top100in2weeks', { timeout: 8000 }),
    axios.get('https://steamspy.com/api.php?request=top100forever', { timeout: 8000 }),
  ]);

  const seen = new Set();
  const merge = (res) => {
    if (res.status !== 'fulfilled') return [];
    return Object.values(res.value.data).filter(g => {
      if (!g.appid || !g.name || seen.has(g.appid)) return false;
      seen.add(g.appid);
      return true;
    });
  };

  const all = [...merge(r1), ...merge(r2)].map(game => ({
    id: game.appid.toString(),
    name: game.name,
    bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_616x353.jpg`,
    coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/library_hero.jpg`,
    genres: game.genre ? game.genre.split(',').map(g => g.trim()).filter(Boolean) : [],
    price: game.price,
    owners: game.owners,
  }));

  _topGamesCache = all;
  _topGamesCacheTime = now;
  console.log(`[TopGames] Cached ${all.length} games from SteamSpy`);
  return all;
}

ipcMain.handle('steam:search', async (event, query, filters = {}, page = 1) => {
  const count = 20; // 20 results for top games
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return { success: false, error: 'Steam API Key not found in .env' };

  const isDefaultLoad = !query || query.trim() === '';
  const start = (page - 1) * count;
  console.log(`[Steam ${isDefaultLoad ? 'TopGames' : 'Search'}] Query: "${query}", Page: ${page}`);

  try {
    let items = [];
    let total = 0;
    let totalPages = 1;

    if (isDefaultLoad) {
      const allGames = await fetchTopGames();
      total = allGames.length;
      const slicedGames = allGames.slice(start, start + count);
      totalPages = Math.ceil(total / count);

      // Fetch icon hashes for the sliced games using the community search
      // this ensures the catalogue also has high-quality icons
      items = await Promise.all(slicedGames.map(async (game) => {
        try {
          const searchUrl = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(game.name)}`;
          const searchRes = await axios.get(searchUrl, { timeout: 3000 });
          const match = Array.isArray(searchRes.data) ? searchRes.data.find(i => i.appid.toString() === game.id) : null;

          return {
            ...game,
            iconUrl: match ? match.icon : `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/logo.png`, // Fallback
          };
        } catch (e) {
          return {
            ...game,
            iconUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/logo.png`, // Fallback
          };
        }
      }));
    } else {
      // Community Search API - Returns exact icon hashes for square sidebar icons!
      // This is the "Holy Grail" endpoint discovered during debugging.
      const url = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(query)}`;

      const response = await axios.get(url, { timeout: 8000 });
      const rawItems = Array.isArray(response.data) ? response.data : [];

      total = rawItems.length;
      const searchCount = 10;
      totalPages = Math.ceil(total / searchCount);

      // Handle pagination locally as the community API returns all results
      const searchStart = (page - 1) * searchCount;
      items = rawItems.slice(searchStart, searchStart + searchCount)
        .map(item => ({
          id: item.appid.toString(),
          name: item.name,
          bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/capsule_616x353.jpg`,
          coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/library_hero.jpg`,
          iconUrl: item.icon, // This is the high-quality square icon with hash!
          genres: [], // SearchApps doesn't return genres, appdetails will fill this later
          price: null,
        }));
    }

    console.log(`[Steam] ${total} total → ${items.length} items on page ${page}/${totalPages}`);
    return { success: true, total, totalPages, items };
  } catch (error) {
    console.error('[Steam] FAILED:', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('steam:get-app-details', async (event, appId) => {
  console.log(`[Steam Details] AppID: ${appId}`);
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
    const response = await axios.get(url);

    if (response.data[appId] && response.data[appId].success) {
      const data = response.data[appId].data;
      let iconUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/logo.png`; // Default fallback
      try {
        const searchUrl = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(data.name)}`;
        const searchRes = await axios.get(searchUrl, { timeout: 3000 });
        const match = Array.isArray(searchRes.data) ? searchRes.data.find(i => i.appid.toString() === appId) : null;
        if (match) iconUrl = match.icon;
      } catch (e) {
        console.warn(`[Steam Details] Could not fetch community icon for ${appId}`);
      }

      return {
        success: true,
        data: {
          name: data.name,
          summary: data.short_description || data.about_the_game,
          bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,
          coverArtUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`,
          iconUrl: iconUrl,
          genres: data.genres?.map(g => g.description) || [],
          developer: data.developers?.[0] || 'Unknown',
          releaseDate: data.release_date?.date || 'Unknown'
        }
      };
    }
    return { success: false, error: 'Failed to fetch Steam app details' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});





const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5678/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Helper to get user profile after authentication
async function getGoogleUserProfile(authClient) {
  const people = google.people({ version: 'v1', auth: authClient });
  const { data } = await people.people.get({
    resourceName: 'people/me',
    personFields: 'names,emailAddresses,photos',
  });
  return {
    name: data.names?.[0]?.displayName || 'Google User',
    email: data.emailAddresses?.[0]?.value || '',
    profilePictureUrl: data.photos?.[0]?.url || undefined,
  };
}


// In electron.js

// ... (keep all your other imports and setup)






let appFolderIds = null;

async function getDriveClient() {
  const refreshToken = store.get('googleRefreshToken');
  if (!refreshToken) {
    throw new Error('User is not authenticated with Google or refresh token is missing.');
  }
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// A robust helper to find a folder by name or create it if it doesn't exist
async function findOrCreateFolder(drive, folderName, parentId = 'root') {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
  const { data } = await drive.files.list({ q: query, fields: 'files(id, name)' });

  if (data.files.length > 0) {
    console.log(`[Google Drive] Found folder '${folderName}' with ID: ${data.files[0].id}`);
    return data.files[0].id;
  } else {
    console.log(`[Google Drive] Folder '${folderName}' not found. Creating it...`);
    const { data: newFolder } = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    });
    console.log(`[Google Drive] Created folder '${folderName}' with ID: ${newFolder.id}`);
    return newFolder.id;
  }
}

// Ensures the entire folder structure exists and returns the final folder IDs
async function getAppFolderIds() {
  if (appFolderIds) {
    return appFolderIds;
  }
  const drive = await getDriveClient();
  const rootSyncFolderId = await findOrCreateFolder(drive, 'Cloud Sync');
  const syncFilesFolderId = await findOrCreateFolder(drive, 'Cloud Sync Files', rootSyncFolderId);
  const checkpointsFolderId = await findOrCreateFolder(drive, 'Cloud Checkpoints', rootSyncFolderId);

  appFolderIds = { syncFilesFolderId, checkpointsFolderId };
  return appFolderIds;
}















// Checks for a saved session when the app starts
ipcMain.handle('google:check-status', async () => {
  const refreshToken = store.get('googleRefreshToken');
  if (!refreshToken) return { success: false };
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const user = await getGoogleUserProfile(oauth2Client);
    return { success: true, user };
  } catch (error) {
    store.delete('googleRefreshToken'); // Clear invalid token
    return { success: false, error: 'Session expired. Please log in again.' };
  }
});

// Handles logging out
ipcMain.handle('google:logout', async () => {
  const refreshToken = store.get('googleRefreshToken');
  if (refreshToken) {
    try {
      await oauth2Client.revokeToken(refreshToken);
    } catch (e) {
      console.error("Failed to revoke token, but logging out locally anyway.");
    }
  }
  store.delete('googleRefreshToken');
  return { success: true };
});



ipcMain.handle('google-drive:sync-game', async (event, { gameName, gamePath }) => {
  const sender = event.sender;
  try {
    const drive = await getDriveClient();
    const { syncFilesFolderId } = await getAppFolderIds();

    // 1. Zip the file locally
    const sanitizedGameName = gameName.replace(/[^\w.-]/g, '_');
    const zipFileName = `${sanitizedGameName}_latest.zip`;
    const tempZipPath = path.join(os.tmpdir(), `gamesync_drive_${Date.now()}.zip`);

    sender.send('sync-progress', { gameName, progress: 5, message: 'Compressing save files...' });

    const zip = new AdmZip();
    zip.addLocalFolder(gamePath, path.basename(gamePath));
    zip.writeZip(tempZipPath);

    const stats = await fs.stat(tempZipPath);
    const totalSize = stats.size;

    sender.send('sync-progress', { gameName, progress: 15, message: 'Syncing to Google Drive...' });

    // 2. Check if the file already exists on Drive to update it
    const listQuery = `'${syncFilesFolderId}' in parents and name='${zipFileName}' and trashed=false`;
    const { data: listData } = await drive.files.list({ q: listQuery, fields: 'files(id)' });

    const fileMetadata = { name: zipFileName, parents: [syncFilesFolderId] };

    // Create a progress-tracked stream
    let uploadedBytes = 0;
    const readStream = fs.createReadStream(tempZipPath);
    readStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const progress = Math.round(15 + (uploadedBytes / totalSize) * 85);
      sender.send('sync-progress', { gameName, progress, message: `Uploading: ${progress}%` });
    });

    const media = { mimeType: 'application/zip', body: readStream };

    let file;
    if (listData.files.length > 0) {
      // File exists, update it
      const fileId = listData.files[0].id;
      console.log(`[Google Drive Sync] Updating existing file '${zipFileName}' (ID: ${fileId})`);
      const { data } = await drive.files.update({ fileId, media });
      file = data;
    } else {
      // File does not exist, create it
      console.log(`[Google Drive Sync] Creating new file '${zipFileName}'`);
      const { data } = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
      file = data;
    }

    fs.remove(tempZipPath); // Clean up temp zip
    return { success: true, message: `Successfully synced ${gameName} to Google Drive.`, fileId: file.id };
  } catch (error) {
    console.error('[Google Drive Sync] FAILED:', error);
    return { success: false, error: error.message };
  }
});

// In electron.js

ipcMain.handle('google-drive:create-checkpoint', async (event, {
  gamesToBackup,      // NEW: Will be an array of {name, path}
  isFolderCheckpoint, // NEW: A boolean to tell us the type
  description,
  providerGameName    // NEW: The display name, e.g., "Folder Checkpoint"
}) => {
  try {
    const drive = await getDriveClient();
    const { checkpointsFolderId } = await getAppFolderIds();

    const timestamp = getFormattedTimestamp().tagFormat;
    let zipFileName;
    let finalDescription = description || 'GameSync Pro Checkpoint';
    const tempZipPath = path.join(os.tmpdir(), `gdrive_temp_${Date.now()}.zip`);
    const zip = new AdmZip();

    if (isFolderCheckpoint) {
      // --- LOGIC FOR FOLDER CHECKPOINT ---
      console.log(`[Google Drive] Creating FOLDER checkpoint for ${gamesToBackup.length} games.`);
      const folderName = sanitizeForTagName(providerGameName || 'Folder-Checkpoint');
      zipFileName = `checkpoint_FOLDER_${folderName}_${timestamp}.zip`;

      let atLeastOneGameZipped = false;
      for (const game of gamesToBackup) {
        if (!await fs.pathExists(game.path)) {
          console.warn(`[Google Drive Folder CP] Path for ${game.name} not found: ${game.path}. Skipping.`);
          continue;
        }
        const sanitizedGameFolderName = sanitizeForTagName(game.name);
        zip.addLocalFolder(game.path, sanitizedGameFolderName); // Put each game in its own sub-folder
        atLeastOneGameZipped = true;
      }

      if (!atLeastOneGameZipped) {
        throw new Error("No valid game paths with content found to include in the folder checkpoint.");
      }

    } else {
      // --- LOGIC FOR INDIVIDUAL CHECKPOINT (your existing logic) ---
      if (gamesToBackup.length !== 1) {
        throw new Error("Individual checkpoint must have exactly one game.");
      }
      const game = gamesToBackup[0];
      console.log(`[Google Drive] Creating INDIVIDUAL checkpoint for ${game.name}.`);
      const sanitizedGameName = sanitizeForTagName(game.name);
      zipFileName = `checkpoint_${sanitizedGameName}_${timestamp}.zip`;
      zip.addLocalFolder(game.path, path.basename(game.path));
    }

    zip.writeZip(tempZipPath); // Create the final zip file

    // --- START: Added Code ---
    const stats = await fs.stat(tempZipPath);
    const sizeInBytes = stats.size;
    console.log(`[Google Drive Checkpoint] Zipped file size: ${sizeInBytes} bytes.`);
    // --- END: Added Code ---

    const fileMetadata = {
      name: zipFileName,
      parents: [checkpointsFolderId],
      description: finalDescription
    };
    const media = { mimeType: 'application/zip', body: fs.createReadStream(tempZipPath) };

    console.log(`[Google Drive Checkpoint] Uploading new checkpoint '${zipFileName}'`);
    const { data: file } = await drive.files.create({ resource: fileMetadata, media, fields: 'id, name' });

    fs.remove(tempZipPath);
    // Add 'size' to the return object
    return { success: true, message: `Checkpoint created on Google Drive.`, fileId: file.id, fileName: file.name, size: sizeInBytes };

  } catch (error) {
    console.error('[Google Drive Checkpoint] FAILED:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-drive:restore-checkpoint', async (event, { fileId, gamePath, gameName }) => {
  const sender = event.sender;
  const tempDownloadDir = path.join(os.tmpdir(), `gamesync_drive_restore_${Date.now()}`);
  try {
    const drive = await getDriveClient();
    await fs.ensureDir(tempDownloadDir);

    sender.send('sync-progress', { gameName, progress: 10, message: 'Initiating download...' });

    // 1. Get file metadata to get the name for the temp file and its size
    const { data: fileMetadata } = await drive.files.get({ fileId: fileId, fields: 'name, size' });
    const tempZipPath = path.join(tempDownloadDir, fileMetadata.name);
    const totalSize = parseInt(fileMetadata.size);

    // 2. Download the file from Drive
    console.log(`[Google Drive Restore] Downloading file ID '${fileId}' to '${tempZipPath}'`);
    const dest = fs.createWriteStream(tempZipPath);
    const { data: fileStream } = await drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' });

    let downloadedBytes = 0;
    fileStream.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      const progress = Math.round(10 + (downloadedBytes / totalSize) * 80);
      sender.send('sync-progress', { gameName, progress, message: `Downloading: ${progress}%` });
    });

    await new Promise((resolve, reject) => {
      fileStream.pipe(dest);
      dest.on('finish', resolve);
      dest.on('error', reject);
    });

    sender.send('sync-progress', { gameName, progress: 95, message: 'Extracting files...' });

    // 3. Backup current save and restore
    const backupPath = `${gamePath}_backup_gdrive-restore`;
    if (await fs.pathExists(gamePath)) {
      await fs.move(gamePath, backupPath, { overwrite: true });
      console.log(`[Google Drive Restore] Backed up current save to: ${backupPath}`);
    }

    console.log(`[Google Drive Restore] Extracting '${tempZipPath}' to '${gamePath}'`);
    const zip = new AdmZip(tempZipPath);
    zip.extractAllTo(path.dirname(gamePath), true);

    sender.send('sync-progress', { gameName, progress: 100, message: 'Restore complete.' });

    return { success: true };
  } catch (error) {
    console.error('[Google Drive Restore] FAILED:', error);
    return { success: false, error: error.message };
  } finally {
    fs.remove(tempDownloadDir); // Clean up
  }
});

ipcMain.handle('google-drive:list-all-checkpoints', async () => {
  try {
    const drive = await getDriveClient();
    const { checkpointsFolderId } = await getAppFolderIds();

    console.log(`[Google Drive List] Fetching all checkpoints from folder: ${checkpointsFolderId}`);

    const { data } = await drive.files.list({
      q: `'${checkpointsFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, description, size, createdTime)',
      pageSize: 1000
    });

    if (!data.files || data.files.length === 0) {
      return { success: true, checkpoints: [] };
    }

    const checkpoints = data.files.map(file => {
      let type = 'individual';
      let gameName = 'Unknown Game';
      let gameId = 'unknown';
      let time = file.createdTime;

      const name = file.name || '';

      // Try to parse the filename: checkpoint_Game-Name_TIMESTAMP.zip
      // or checkpoint_FOLDER_Folder-Name_TIMESTAMP.zip
      const folderMatch = name.match(/^checkpoint_FOLDER_(.+)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.zip$/);
      const individualMatch = name.match(/^checkpoint_(.+)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.zip$/);

      if (folderMatch) {
        type = 'folder';
        gameId = 'all-enabled-games-folder';
        gameName = folderMatch[1].replace(/-/g, ' ');
      } else if (individualMatch) {
        type = 'individual';
        gameName = individualMatch[1].replace(/-/g, ' ');
      } else {
        // Fallback for non-standard filenames
        gameName = name.replace('.zip', '').replace('checkpoint_', '').replace(/-/g, ' ');
      }

      return {
        id: file.id,
        cloudFileId: file.id,
        gameId: gameId,
        gameName: gameName,
        time: time,
        description: file.description || `Cloud Checkpoint: ${gameName}`,
        provider: 'Google Drive',
        size: file.size, // This is raw size in bytes, frontend will format it
        type: type,
        cloudLink: undefined,
        path: undefined
      };
    });

    console.log(`[Google Drive List] Found ${checkpoints.length} checkpoints.`);
    return { success: true, checkpoints: checkpoints };
  } catch (error) {
    console.error('[Google Drive List All] FAILED:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google-drive:delete-checkpoint', async (event, { fileId }) => {
  try {
    const drive = await getDriveClient();
    console.log(`[Google Drive Delete] Deleting file ID: ${fileId}`);
    await drive.files.delete({ fileId: fileId });
    return { success: true };
  } catch (error) {
    console.error('[Google Drive Delete] FAILED:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('firebase:get-user-profile', async (event, uid) => {
  if (!uid) return { success: false, error: 'User ID is missing.' };
  try {
    const userProfileRef = db.collection('userProfiles').doc(uid);
    const doc = await userProfileRef.get();
    if (!doc.exists) {
      console.log(`[Firestore] No profile found for user ${uid}. Returning null.`);
      return { success: true, profile: null }; // No profile exists yet for this new user
    }
    console.log(`[Firestore] Successfully fetched profile for user ${uid}.`);
    return { success: true, profile: doc.data() };
  } catch (error) {
    console.error('[Firestore] Error fetching user profile:', error);
    return { success: false, error: error.message };
  }
});

// Saves the entire user profile document to Firestore
ipcMain.handle('firebase:set-user-profile', async (event, { uid, data }) => {
  if (!uid || !data) return { success: false, error: 'User ID or data is missing.' };
  try {
    const userProfileRef = db.collection('userProfiles').doc(uid);
    // Using set with merge:true is robust; it creates the doc if it doesn't exist
    // or updates it without overwriting fields not included in the 'data' object.
    await userProfileRef.set(data, { merge: true });
    console.log(`[Firestore] Successfully saved profile for user ${uid}.`);
    return { success: true };
  } catch (error) {
    console.error('[Firestore] Error saving user profile:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('google:login', () => {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });

    let server;

    server = http.createServer(async (req, res) => {
      try {
        if (!req.url || !req.url.startsWith('/oauth2callback')) {
          res.writeHead(404);
          res.end();
          return;
        }

        const qs = new url.URL(req.url, 'http://localhost:5678').searchParams;
        const code = qs.get('code');

        res.end('Authentication successful! You can now close this browser window.');

        if (code) {
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          if (tokens.refresh_token) {
            store.set('googleRefreshToken', tokens.refresh_token);
          }
          resolve({ success: true, id_token: tokens.id_token });
        } else {
          reject({ success: false, error: 'Authorization code not found in callback.' });
        }
      } catch (error) {
        console.error('[Google Auth] Error in callback handler:', error);
        reject({ success: false, error: error.message || 'Failed to exchange token.' });
      } finally {
        // ✅ --- THIS IS THE IMPROVEMENT --- ✅
        // This ensures the server is always closed after a request is handled.
        if (server && server.listening) {
          server.close(() => console.log('[Google Auth] Local server closed.'));
        }
      }
    }).listen(5678, () => {
      shell.openExternal(authUrl);
    });

    server.on('error', (error) => {
      console.error('[Google Auth] Local server error:', error);
      reject({ success: false, error: 'Failed to start local server for authentication.' });
    });
  });
});

ipcMain.handle('supabase:upload-banner', async (event, { uid, fileData }) => {
  const { buffer, name } = fileData;
  if (!uid) return { success: false, error: 'User not authenticated for banner upload.' };

  try {
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}${path.extname(name)}`;
    const filePathInBucket = `${uid}/${uniqueFilename}`; // Store in a folder named after the user's ID

    // Upload the file to the 'user-banners' bucket
    const { data, error } = await supabase.storage
      .from('user-banners')
      .upload(filePathInBucket, Buffer.from(buffer), {
        contentType: 'image/jpeg', // Or determine dynamically
        upsert: false // Don't overwrite if a file with the same random name exists
      });

    if (error) throw error;

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('user-banners')
      .getPublicUrl(filePathInBucket);

    console.log(`[Supabase Storage] Banner uploaded for user ${uid} to ${publicUrl}`);
    return { success: true, url: publicUrl };

  } catch (error) {
    console.error('[Supabase Storage] FAILED to upload banner:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('supabase:delete-banner', async (event, { url }) => {
  // Check if the URL is a Supabase URL
  if (!url || !url.startsWith(SUPABASE_URL)) {
    return { success: true }; // Not our file, ignore
  }
  try {
    // Extract the file path from the URL, e.g., "uid/filename.jpg"
    const filePath = url.substring(url.indexOf('/user-banners/') + '/user-banners/'.length);

    const { data, error } = await supabase.storage
      .from('user-banners')
      .remove([filePath]);

    if (error) throw error;

    console.log(`[Supabase Storage] Deleted old banner: ${filePath}`);
    return { success: true };
  } catch (error) {
    console.error('[Supabase Storage] FAILED to delete banner:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:download-and-cache-banner', async (event, { url, uid }) => {
  if (!url || !uid) {
    return { success: false, error: 'URL or User ID missing for caching.' };
  }
  try {
    const userDataPath = app.getPath('userData');
    // We will store the cache in a folder specific to the logged-in user
    const cacheDir = path.join(userDataPath, 'banner_cache', uid);
    await fs.ensureDir(cacheDir);

    // Strip query parameters for extension extraction (Windows safety)
    const urlWithoutQuery = url.split('?')[0];
    const extension = path.extname(urlWithoutQuery);
    const uniqueFilename = `${crypto.createHash('md5').update(url).digest('hex')}${extension}`;
    const localPath = path.join(cacheDir, uniqueFilename);

    // If the file is already cached, just return the path
    if (await fs.pathExists(localPath)) {
      return { success: true, path: localPath };
    }

    // Download the image
    const writer = fs.createWriteStream(localPath);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`[Cache] Downloaded and cached banner to: ${localPath}`);
    return { success: true, path: localPath };

  } catch (error) {
    console.error(`[Cache] Failed to download banner from ${url}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:clear-banner-cache', async (event, { uid }) => {
  if (!uid) return { success: false, error: 'User ID missing for cache clearing.' };
  try {
    const userDataPath = app.getPath('userData');
    // Important: Only clear the cache for the user who is logging out
    const cacheDir = path.join(userDataPath, 'banner_cache', uid);
    if (await fs.pathExists(cacheDir)) {
      await fs.remove(cacheDir);
      console.log(`[App Cache] Cleared local banner cache for user ${uid}.`);
    }
    return { success: true };
  } catch (error) {
    console.error('[App Cache] Failed to clear banner cache:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:scan-for-games', async () => {
  const manifestPath = path.join(app.getAppPath(), 'ludusavi', 'manifest.yaml');
  if (!await fs.pathExists(manifestPath)) return [];

  const detectedGames = [];
  const manifestContent = await fs.readFile(manifestPath, 'utf8');

  // Pre-calculate roots
  console.log("[Scanner] Starting deep scan...");
  const roots = [
    { path: resolveManifestPath('<winDocuments>'), source: 'Documents' },
    { path: resolveManifestPath('<winAppData>'), source: 'AppData' },
    { path: resolveManifestPath('<winLocalAppData>'), source: 'LocalAppData' },
    { path: resolveManifestPath('<winSavedGames>'), source: 'Saved Games' },
    { path: resolveManifestPath('<winPublic>/Documents/OnlineFix'), source: 'OnlineFix' },
    { path: resolveManifestPath('<winProgramData>/Steam/dodi'), source: 'DODI' },
  ];

  const steamGames = await getInstalledSteamGamesEnums();
  const processedIds = new Set();

  // Helper to extract paths reliably
  const extractPaths = (id, installPath = null) => {
    const start = manifestContent.indexOf(`"${id}":`);
    if (start === -1) return [];
    const nextStart = manifestContent.indexOf(`\n"`, start + 5);
    const block = manifestContent.substring(start, nextStart === -1 ? undefined : nextStart);

    // Match anything that looks like a path in the files section
    const pathMatches = block.match(/<[^>]+>[^:\n]+/g) || [];
    return [...new Set(pathMatches.map(p => resolveManifestPath(p.trim(), installPath)))];
  };

  // 1. Process Steam Games (High Confidence)
  for (const game of steamGames) {
    if (processedIds.has(game.steamId)) continue;
    const paths = extractPaths(game.steamId, game.installPath);
    for (const p of paths) {
      if (await fs.pathExists(p)) {
        const size = await getFolderSize(p);
        detectedGames.push({
          tempId: `steam-${game.steamId}`,
          steamId: game.steamId,
          name: `Steam Game ${game.steamId}`, // Will be resolved by frontend
          path: p,
          source: 'Steam',
          size,
          bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamId}/library_hero.jpg`,
          coverArtUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.steamId}/library_600x900.jpg`,
        });
        processedIds.add(game.steamId);
        break;
      }
    }
    // Give event loop some air
    await new Promise(r => setTimeout(r, 0));
  }

  // 2. Scan Common Folders for Repacks/Emus (IDs as folder names)
  for (const root of roots) {
    if (!await fs.pathExists(root.path)) continue;
    try {
      const folders = await fs.readdir(root.path);
      for (const folder of folders) {
        if (processedIds.has(folder)) continue;
        const fullPath = path.join(root.path, folder);

        // If it's a numeric ID, check manifest
        if (/^\d+$/.test(folder)) {
          console.log(`[Scanner] Found real game: ${folder} from ${root.source}`);
          const size = await getFolderSize(fullPath);
          detectedGames.push({
            tempId: `id-${folder}-${Date.now()}`,
            steamId: folder,
            name: `Game ${folder}`,
            path: fullPath,
            source: root.source,
            size,
            bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${folder}/library_hero.jpg`,
            coverArtUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${folder}/library_600x900.jpg`,
          });
          processedIds.add(folder);
        }
      }
    } catch (e) { }
    await new Promise(r => setTimeout(r, 0));
  }

  return detectedGames;
});