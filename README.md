# Savra - Game Sync Manager

Savra is a modern, premium game save synchronization tool built with React, TypeScript, and Electron. It allows you to track your game library, create local and cloud checkpoints, and sync your progress seamlessly across devices using Google Drive and GitHub.

![Savra Dashboard](https://github.com/darkbitt/Savra/blob/main/photos/dashboard.png?raw=true)

## Built With

- **Frontend**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Desktop Framework**: [Electron](https://www.electronjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (powered by [Radix UI](https://www.radix-ui.com/))
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend & Storage**: [Firebase](https://firebase.google.com/), [Supabase](https://supabase.com/)
- **Cloud APIs**: Google Drive API, IGDB API, Steam API
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Features

- **🎮 Comprehensive Library Management**: Auto-detect installed games or add them manually.
- **☁️ Cloud Synchronization**: Seamlessly sync checkpoints to Google Drive and GitHub Releases.
- **🕒 Checkpoint System**: Create individual or folder-based checkpoints with detailed metadata.
- **📂 Orphan Support**: Manage checkpoints even for games no longer in your library.
- **📊 Storage Visualizer**: Monitor your local, Google Drive, and GitHub storage usage.
- **🔍 Real-time Discovery**: Scan your system for game manifests and save locations.
- **🎨 Premium UI**: Dark, glassmorphic design inspired by modern gaming dashboards.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/darkbitt/Savra.git
cd Savra
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the `.env.example` file to a new file named `.env` and fill in your API credentials:
```bash
cp .env.example .env
```
You will need to set up:
- **Twitch (IGDB)**: For game metadata and search.
- **Google Cloud Console**: For Google Drive sync and Auth.
- **Steam API**: For Steam game discovery.
- **Supabase**: For banner hosting and storage.

### 4. Firebase Setup
This app requires a Firebase Service Account file for backend database operations.
1. Generate a new private key from your Firebase Console (**Project Settings > Service Accounts**).
2. Save the downloaded JSON file as `electron/firebase-service-account.json`.
3. **DO NOT** commit this file to any public repository (it is already in `.gitignore`).

### 5. Run in Development
```bash
npm run electron:dev
```

## Building for Production

To create a distributable installer for your OS:
```bash
npm run app:build
```
The output will be available in the `dist_electron` directory.

## Maintenance & Logs
If you encounter issues, you can access logs via **Settings > Maintenance & Logs**.
- **Activity Log**: Human-readable history of app operations.
- **Technical Logs**: Raw Electron logs stored in the user data directory.

## GitHub Reconciliation
If your cloud checkpoints aren't showing up, use the **"Refresh from Cloud"** button in the Cloud Checkpoints tab to force a direct scan of your Google Drive.

## License
Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by [darkbitt](https://github.com/darkbitt)
