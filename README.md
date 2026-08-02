<div align="center">

# 🎴 UNO Online — Real-Time Multiplayer Card Game

**A feature-rich, low-latency multiplayer UNO web application powered by Node.js, Express, WebSockets, and pure modern CSS.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-ws-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![HTML5 & CSS3](https://img.shields.io/badge/Frontend-Vanilla%20JS%20%7C%20CSS%20Grid-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://uno-online-oao9.onrender.com)

[Play Live Demo](https://uno-online-oao9.onrender.com) · [Report Bug](#) · [Request Feature](#)

</div>

---

## 🌟 Overview

**UNO Online** is a server-authoritative, real-time multiplayer implementation of the classic UNO card game. Designed from the ground up for seamless responsive gameplay across desktop and mobile devices, it supports **2 to 8 players** per room, intelligent **AI bots**, interactive **penalty stacking**, and **6 synchronized pure-CSS themes**.

---

## ✨ Key Features

### 🎮 Real-Time Multiplayer & AI Support
- **Instant Room Creation**: Create private rooms with 4-character room codes and share instantly with friends.
- **Smart AI Bots**: Hosts can seamlessly populate rooms with up to 4 AI bots directly from the lobby to fill empty slots or practice solo.
- **Server-Authoritative Synchronization**: All game validation, card legality, turn timers, and deck shuffling occur securely on the backend server to ensure fairness and prevent tampering.

### 🎨 Premium Glassmorphic UI & 3-Column Lobby
- **Balanced 3-Column Lobby Layout**:
  - **Left Column**: Clean action controls (`Start Game`, `Add Bot`, `Leave Room`).
  - **Center Column**: Prominent Room Code display paired with a **scrollable glassmorphic player & bot roster** capable of handling up to 8 players without layout shift.
  - **Right Column**: Interactive Theme Selector with real-time swatch previews.
- **Custom Player Avatars**: Integrated Canvas-based interactive image crop & zoom modal for custom avatar uploads, alongside retro emoji fallbacks.

### 🌌 6 Dynamic Pure-CSS Themes
Hosts can switch themes in real-time, instantly synchronizing the aesthetic across all connected players:
1. **Classic Felt (Default)**: Traditional casino blue felt mat with a natural wood rim and classic Uno card gradients.
2. **Neon Cyberpunk**: Glowing cyan-magenta grid table, high-contrast neon borders, and pitch-black futuristic cards.
3. **Royal Casino**: Deep crimson velvet table, thick polished metallic gold rim, and classic gold-trimmed cards.
4. **Retro Arcade**: High-contrast 8-bit pixel colors, chunky block borders, and pixelated font typography.
5. **Ethereal Glass**: Frosted translucent glass tablemat over a soothing pastel lavender gradient.
6. **Dark Matter Void**: Deep starry void table with matte-black laser-edged cards.

### ⚡ Advanced UNO Game Mechanics
- **Draw 2 & Wild Draw 4 Stacking**: Players can chain matching +2 or +4 penalty cards to escalate penalties onto the next player.
- **Interactive Stack / Decline Modal**: Clear countdown timers giving players the option to stack a matching card or accept the accumulated draw penalty.
- **Wild Draw 4 Challenges**: Official UNO challenge rules allowing players to call out illegal +4 plays.
- **Live Activity Log & Confetti Celebration**: Real-time action log tracking every card play and penalty, finished with celebratory confetti animations for winners.

---

## 🏗️ Architecture & Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime & Server** | **Node.js & Express** | Lightweight HTTP server hosting static assets and managing REST routes. |
| **Real-Time Layer** | **ws (WebSockets)** | Low-latency bidirectional JSON message passing for deterministic game state sync. |
| **Frontend UI** | **Vanilla ES6+ JS** | Modular, framework-free frontend architecture (`app.js`, `cards.js`, `network.js`). |
| **Styling & Layouts** | **Pure CSS3** | Custom CSS Variables, CSS Grid 3-column layouts, Flexbox, and Glassmorphism effects. |
| **Graphics & Avatars** | **HTML5 Canvas** | High-performance background particle rendering and client-side avatar image cropper. |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version `18.0.0` or higher
- **npm**: Node Package Manager

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shinobu-34/UNO_ONLINE.git
   cd UNO_ONLINE
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   *Alternatively, start directly with Node:*
   ```bash
   node server.js
   ```

4. **Launch the Game:**
   - Open your browser and navigate to: `http://localhost:3000`
   - **Multiplayer LAN Play**: Share your local IP address (`http://<YOUR_LOCAL_IP>:3000`) with devices on the same Wi-Fi network to play together.

---

## ☁️ Deployment

This project includes a production-ready `render.yaml` blueprint for zero-config deployments on [Render.com](https://render.com).

1. Connect your GitHub repository to **Render**.
2. Click **New** > **Blueprint** and select this repo.
3. Render will automatically provision using:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Access your live application instance instantly.

**Live Production Instance**: [https://uno-online-oao9.onrender.com](https://uno-online-oao9.onrender.com)

---

## 📜 License & Acknowledgements

- Designed and developed by **Shinobu-34** &copy; 2026. All Rights Reserved.
- UNO is a registered trademark of Mattel. This project is a non-commercial, educational fan implementation.
