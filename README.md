<div align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Savra Icon">
  <h1>Savra</h1>
  <p><strong>Universal Game Save Manager & Sync Tool</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Electron-47848f?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
    <img src="https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61dafb" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-007acc?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/Tailwind_CSS-38b2ac?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
  </p>
</div>

---

## 🌟 Overview

**Savra** is a professional-grade game save synchronization tool designed for enthusiasts. Built with a focus on speed, reliability, and a premium user experience, Savra bridges the gap between your local game library and the cloud.

![Savra Hero Screenshot](assets/Screenshot%202026-03-06%20094240.png)

## ✨ Core Features
       VIBE CODED RAHHHHHHHHHHHHHHHHHH
- **🎮 Intelligent Library**: Auto-detects installed games across Steam, Epic, and popular repacks.
- **☁️ Native Cloud Sync**: Seamless integration with Google Drive and GitHub Releases for secure, versioned backups.
- **🕒 Checkpoint Engine**: Create unlimited checkpoints for any game, allowing you to roll back progress at any time.
- **🔍 Advanced Discovery**: Deep-system scanning for manifests and save file locations without performance impact.
- **🎨 Premium Aesthetics**: A sleek, dark, glassmorphic UI designed to look beautiful on high-resolution displays.
- **📂 Orphan Management**: Keep your saves safe even after a game is uninstalled.

## 🛠️ Built With

*   **Logic**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
*   **Shell**: [Electron](https://www.electronjs.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
*   **Motion**: [Framer Motion](https://www.framer.com/motion/)
*   **Backing**: [Firebase](https://firebase.google.com/)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+
- **npm**: Integrated with Node.js

### Quick Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/darkbitt/Savra.git
    cd Savra
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    - Copy `.env.example` to `.env`
    - Configure your IGDB, Google Cloud, and Steam API keys.
    - Place your `firebase-service-account.json` in the `electron/` directory.

4.  **Launch Development Environment**
    ```bash
    npm run electron:dev
    ```

---

## 📦 Building for Production

Create a high-performance installer for your platform:
```bash
npm run app:build
```
Find your build in `dist_electron/`.

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/darkbitt">darkbitt</a></p>
  <img src="https://img.shields.io/github/license/darkbitt/Savra?style=flat-square&color=blue" alt="License">
</div>
