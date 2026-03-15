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

## Deploying to Vercel

1. Push your code to GitHub and import the repo in [Vercel](https://vercel.com).
2. **Add environment variables** in the Vercel project (Settings → Environment Variables). Add the same names as in `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_SIGNUP_MASTER_KEY` (optional, for email sign-up)
3. Deploy. The project includes `vercel.json` so client-side routes work correctly.

If you see a white screen, check the browser console for errors and ensure all Firebase env vars are set in Vercel, then redeploy.

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
