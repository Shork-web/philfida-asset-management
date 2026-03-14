# PhilFIDA 7 Asset Management

IT asset management system with Firebase Firestore as the database.

## Features

- Dashboard with stats, search, filters, and sorting
- Serviceable / Unserviceable asset views
- Create, edit, delete assets
- Collapsible sidebar with PhilFIDA branding
- Green & orange theme

## Tech Stack

- **Frontend:** React + Vite
- **Database:** Firebase Firestore (no backend server required)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:** See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for creating a Firebase project and adding your config to `.env`.

3. **Run the app:**
   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`. Add assets via the **Add Asset** button.

## Pushing to GitHub

See **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** for step-by-step instructions to create a GitHub repo and push this project (including installing Git if needed).

## Project structure

- `src/lib/firebase.js` – Firebase initialization
- `src/lib/api.js` – Firestore CRUD
- `src/lib/constants.js` – Types, statuses, labels
- `src/components/` – Sidebar, table, modals, etc.
- `src/pages/` – Dashboard, Serviceable, Unserviceable
- `firestore.rules` – Firestore security rules (deploy with `firebase deploy`)
- `.env.example` – Template for Firebase config
