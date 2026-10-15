# ðŸŽ™ï¸ ONE DIAL â€” International Calling & Digital Wallet Web Platform

A web platform for **ONE DIAL**, designed in tactile **Claymorphism** (soft 3D inflated aesthetics with multi-layered shadows and interactive feedback).

Built with standard **HTML5, CSS3, JavaScript (Web Audio API DTMF synthesizer)** and a **PHP backend** with **Neon PostgreSQL** database integration.

---

## âœ¨ Features

- **Tactile Claymorphic UI:** Custom clay buttons, cards, dial keys, and embossed inputs featuring soft multi-layered inner and outer drop shadows.
- **Interactive Phone Dialer & DTMF Sound Engine:**
  - Real telephone keypad (`0-9, *, #`) powered by the Web Audio API to synthesize standard ITU-T dual-tone multi-frequency (DTMF) audio tones in real-time.
  - Automatic dial code recognition (e.g. `+1` USA, `+44` UK, `+234` Nigeria, `+91` India, `+233` Ghana).
  - Simulated active calling screen with ringback tone, call timer, connected audio chime, and termination sounds.
- **Global Rate Calculator:**
  - Live search filter across 20+ international destinations.
  - Per-minute rate display and savings calculation compared to traditional carrier roaming (saving up to 98%).
  - One-click "Dial Now" to automatically populate the dialer.
- **Prepaid Digital Wallet & Call Detail Records (CDR):**
  - Live available calling balance display with per-second balance deduction during calls.
  - Quick top-up chips (`$5`, `$10`, `$20`, `$50`) and custom amount recharge modal.
  - Real-time transaction ledger and call history log table.
- **Mobile App Download Showcase:**
  - Mockup banners for the native iOS (TestFlight / App Store) and Android (Google Play / APK) mobile apps.

---

## ðŸ—‚ï¸ Project Structure

```
ONE DIAL/
â”œâ”€â”€ index.html              # Main Claymorphic web application
â”œâ”€â”€ css/
â”‚   â””â”€â”€ clay.css            # 3D soft inflated clay styles & animations
â”œâ”€â”€ js/
â”‚   â”œâ”€â”€ app.js              # Core UI logic, wallet balance & call controller
â”‚   â””â”€â”€ dtmf.js             # Web Audio API telephone tone synthesizer
â”œâ”€â”€ api/
â”‚   â”œâ”€â”€ db.php              # PHP database connection (Neon PostgreSQL PDO)
â”‚   â”œâ”€â”€ rates.php           # Calling rates endpoint (PHP)
â”‚   â”œâ”€â”€ wallet.php          # Wallet balance & top-up endpoint (PHP)
â”‚   â”œâ”€â”€ calls.php           # Call Detail Records (CDR) logger (PHP)
â”‚   â”œâ”€â”€ auth.php            # User authentication / OTP session (PHP)
â”‚   â”œâ”€â”€ rates.js            # Vercel serverless function (Node.js fallback)
â”‚   â”œâ”€â”€ wallet.js           # Vercel serverless function with Neon Postgres support
â”‚   â”œâ”€â”€ calls.js            # Vercel serverless function
â”‚   â””â”€â”€ auth.js             # Vercel serverless function
â”œâ”€â”€ schema.sql              # Neon PostgreSQL schema & initial seed data
â”œâ”€â”€ server.js               # Zero-dependency local dev server & API bridge
â”œâ”€â”€ vercel.json             # Vercel deployment & API rewrite configuration
â”œâ”€â”€ package.json            # Node configuration & dependencies
â””â”€â”€ README.md
```

---

## ðŸš€ How to Run Locally

You can run the application immediately using either Node.js or native PHP:

### Option A: Using Node.js (Ready Out-of-the-Box)
```bash
node server.js
```
Open your browser and navigate to:
```
http://localhost:3000
```

### Option B: Using PHP Built-In Server
If you have PHP installed:
```bash
php -S localhost:8000
```
Open your browser and navigate to:
```
http://localhost:8000
```

---

## ðŸŒ Deployment Guide

### 1. Set Up Neon PostgreSQL
1. Sign up or log into [Neon](https://neon.tech).
2. Create a new project (e.g. `one-voice-db`).
3. In the Neon Console, open the **SQL Editor**.
4. Open [schema.sql](schema.sql), copy its contents, paste them into the SQL Editor, and click **Run**.
5. Copy your **Connection String** (e.g. `postgres://alex:secret@ep-cool-frog-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`).

---

### 2. Push to GitHub
1. Initialize Git and commit the project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ONE DIAL Claymorphic web app"
   ```
2. Create a new repository on [GitHub](https://github.com/new) named `one-voice`.
3. Link your remote repository and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/one-voice.git
   git branch -M main
   git push -u origin main
   ```

---

### 3. Deploy to Vercel
1. Log into [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your `one-voice` GitHub repository.
3. In the **Environment Variables** section, add:
   - **Key:** `DATABASE_URL`
   - **Value:** *Your Neon PostgreSQL connection string*
4. Click **Deploy**.
5. Vercel will build and assign your live production URL (e.g. `https://one-voice.vercel.app`).

---

## ðŸ“± Mobile App Compatibility
This web platform shares the backend API and data contracts specified in the *ONE DIAL Mobile Application* architecture, allowing seamless integration with iOS (Swift / Flutter) and Android (Kotlin / Flutter) clients.
