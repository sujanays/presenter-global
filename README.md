# Presenter: Globally Accessible Presentation Remote Platform (MVP)

Presenter is a production-quality, secure presentation remote system enabling users to control slideshows running on their laptop securely from a phone browser over the internet—**globally, without shared Wi-Fi or Bluetooth.**

This repository is structured as a modern, clean TypeScript **Monorepo** using npm workspaces.

---

## Key Features

1. **Slide Navigation Controls:** Large, touch-friendly next/prev triggers with HTML5 haptic vibration feedbacks, and utility triggers (Play/F5, Stop/Esc, Black screen/B, Fullscreen/F11).
2. **Screen-Scale Laser Overlay:** Frameless, click-through transparent screen overlay in Electron rendering a smooth red laser dot mapped using relative coordinates `[0,1]` with linear interpolation (LERP) for fluid movements.
3. **Remote Trackpad:** Delta touchpad gesture surface supporting custom sensitivity configurations, click buttons, and intuitive tap-to-click detection.
4. **Expiring QR Code Pairing:** 60-second expiring single-use pairing codes scanned via mobile browser to instantly link communication sockets.
5. **Secure Cryptographic Tokens:** State-of-the-art JWT access tokens, encrypted refresh tokens, and rate-limiting to prevent unauthorized control.
6. **Horizontal Scale-ready:** Configured with `@socket.io/redis-adapter` and Redis to support clustering stateless backend instances under an Nginx load balancer.

---

## Tech Stack

* **Frontend (Mobile Web):** Next.js 14, React, Tailwind CSS, Socket.IO Client, Lucide React icons.
* **Desktop Agent:** Electron, TypeScript, RobotJS (native inputs), Custom WinAPI fallback shell scripting, qr-image.
* **Cloud Backend:** Node.js, Express, Socket.IO (WebSockets), Redis Adapter, PostgreSQL, JWT credentials, rate-limiting.
* **Deployment:** Docker, Nginx (upstream proxies with Socket.IO upgrades), Fly.io/Railway ready.

---

## Monorepo Architecture

```
Presenter/
├── package.json                   # Monorepo workspaces setup
├── tsconfig.json                  # Base typescript configs
├── docker-compose.yml             # Local production deployment containers
├── nginx.conf                     # Nginx proxy mapping HTTP/WSS channels
├── database_schema.sql            # PostgreSQL DDL schemas
├── .env.example                   # Global environments template
└── apps/
    ├── backend/                   # Node.js + Express API + Socket.IO Server
    ├── desktop-agent/             # Electron Desktop Controller Agent
    └── mobile-web/                # Next.js App Router Mobile Web App
```

---

## Installation & Setup

### Prerequisites
* [Node.js v20+](https://nodejs.org/)
* [Docker Desktop](https://www.docker.com/) (For persistent database & redis nodes)
* *For Windows Desktop Agent compilation fallbacks (Optional):* Visual Studio Build Tools (C++ Compiler) and Python. (Our agent includes a custom native shell injection engine that runs perfectly out-of-the-box using PowerShell if native compilers are missing).

### 1. Build and Run via Docker Compose (Recommended for Production)
You can launch the complete Cloud Backend, Next.js Web App, Nginx load balancer, PostgreSQL database, and Redis adapter with a single command:
```bash
docker-compose up --build
```
* **Next.js Web remote portal:** Access at `http://localhost:3000` (or through reverse proxy on `http://localhost:80`)
* **REST API & WebSockets:** Running on `http://localhost:3001` (or proxied on `http://localhost:80/api/v1`)

---

### 2. Manual Local Development (Workspaces)

Copy the global env file:
```bash
cp .env.example .env
```

Install dependencies across all workspaces:
```bash
npm install
```

#### Run Cloud Backend
```bash
npm run backend:dev
```
The server will start up on `http://localhost:3001`. If PostgreSQL and Redis are offline, the server gracefully prints a warning and switches to **memory-only fallback cache and database mock operations** so that you can instantly code, pair, and test.

#### Run Next.js Mobile Web UI
```bash
npm run mobile:dev
```
The portal starts up on `http://localhost:3000`.

#### Run Electron Desktop Agent
```bash
npm run desktop:dev
```
Launches the Electron pairing frame displaying a beautiful dark controller UI, dynamic 60s pin code, and real-time QR code.

---

## Realtime WebSocket Protocol

Communication runs over secure Socket.IO namespaces using room segregation: `room:session:<deviceId>`.

### Core Event Map:
* `SESSION_JOIN`: Sent by both agents upon startup to join the secure session room.
* `NEXT_SLIDE` / `PREVIOUS_SLIDE`: Slides navigations commands forwarded from phone to desktop.
* `START_SLIDESHOW` / `END_SLIDESHOW`: Slideshow triggers (F5/Esc).
* `BLACK_SCREEN` / `FULLSCREEN_TOGGLE`: Screen blackouts (B key) and frame expands (F11).
* `LASER_MOVE`: Relative screen coordinates payload: `{ x: 0.52, y: 0.31, visible: true }`.
* `TRACKPAD_MOVE`: Cursor delta movements payload: `{ dx: 14, dy: -3 }`.
* `LEFT_CLICK` / `RIGHT_CLICK`: Mouse click signals.
* `HEARTBEAT` / `HEARTBEAT_ACK`: Active latency metrics.

---

## Custom OS Input Injector & Fallback Engine
When Electron receives events, it calls `/apps/desktop-agent/src/main/injector.ts`. 

To maintain production-quality reliability under Windows without requiring complex local visual studio compilation toolchains:
* **RobotJS Engine:** Default injector which compiles as a Node.js C++ native addon interfacing directly with operating system window handles.
* **PowerShell Native Shell Engine:** Our proprietary Windows fallback engine. If RobotJS fails to load, the desktop agent gracefully maps operations to a secure PowerShell subprocess using Windows Forms SendKeys assemblies:
  - Slide Next/Prev keys are injected using `[System.Windows.Forms.SendKeys]::SendWait('{RIGHT}')` / `('{LEFT}')`.
  - Mouse coordinates are scaled and repositioned using `[System.Windows.Forms.Cursor]::Position`.
  - Clicks are fired by declaring and invoking dynamic `user32.dll` user handles: `[WinAPI.Tool]::mouse_event(0x0002, 0, 0, 0, 0)`.

This double-layered framework ensures that developers and users get a premium responsive feedback loop instantly under any environment.
