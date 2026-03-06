// /src/electron.d.ts

// This is a placeholder for the kind of data you might get from a game search
// You can expand this later.
interface GameInfo {
  name: string;
  summary?: string;
  bannerUrl?: string;
  coverArtUrl?: string;
}

// This interface defines the shape of your "electronAPI" object.
// It must match every function you exposed in `preload.js`
export interface IElectronAPI {
  [x: string]: any;
  // 📂 System Dialog & Shell Actions
  selectPath: (options: { mode: 'file' | 'folder' | 'any' }) => Promise<string | null>;
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>;

  // 💾 Local Sync & Checkpoint Actions
  syncGameLocal: (data: { sourcePath: string; destinationPath: string; }) => Promise<{ success: boolean; error?: string }>;
  createLocalCheckpoint: (data: { gameId: string; gamePath: string; checkpointBasePath: string; description: string; }) => Promise<{ success: boolean; path?: string; size?: number; error?: string }>;
  restoreLocalCheckpoint: (data: { checkpointPath: string; gamePath: string; }) => Promise<{ success: boolean; error?: string }>;
  deleteLocalCheckpoint: (data: { checkpointPath: string; }) => Promise<{ success: boolean; error?: string }>;

  // 🎮 Game-related Actions
  findGameSaveLocation: (gameName: string) => Promise<string | null>;
  launchGame: (gamePath: string) => Promise<{ success: boolean; error?: string }>;
  getGameFolders: (gamePath: string) => Promise<string[] | null>;

  // 🤖 AI & Game Info Actions
  askAiForSaveLocation: (gameName: string) => Promise<string | null>;
  searchGameInfo: (query: string) => Promise<GameInfo | null>;

  // ☁️ Cloud Sync Actions
  connectGoogleDrive: () => Promise<{ success: boolean; error?: string }>;
  uploadToGoogleDrive: (gameId: string, filePath: string) => Promise<{ success: boolean; fileId?: string; size?: number; error?: string }>;
  downloadFromGoogleDrive: (gameId: string, fileId: string) => Promise<{ success: boolean; downloadedPath?: string; error?: string }>;
  // (You would add connectGithub, etc. here when you implement them)

  // --- IPC 'on' channels (Listeners) ---
  // Note: These do not return Promises. They set up listeners.
  onLaunchGameStatus: (callback: (statusMessage: string) => void) => void;

  // 🎮 Steam API
  searchSteam: (query: string, filters?: { genre?: string; tag?: string }, page?: number) => Promise<{ success: boolean; total?: number; items?: any[]; error?: string } | any[]>;
  getSteamAppDetails: (appId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
}


// This tells TypeScript that the global `window` object will have a
// property called `electronAPI` that adheres to the interface we just defined.
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}