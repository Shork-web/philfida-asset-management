# Firebase Setup

The app uses **Firebase Firestore** as its database instead of a local server.

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable **Firestore Database** (Build → Firestore Database → Create database)
   - Start in **test mode** for development, or set up rules (see below)

## 2. Register your web app

1. In Project Settings (gear icon), go to **Your apps**
2. Click **Add app** → **Web** (</> icon)
3. Register the app and copy the config values

## 3. Configure environment variables

Copy the example file and fill in your Firebase config:

```bash
cp .env.example .env
```

Edit `.env` and replace the placeholders with your Firebase config:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 4. Deploy Firestore rules (optional)

For production, deploy security rules:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
# Select your project, use existing firestore.rules
firebase deploy --only firestore
```

The included `firestore.rules` allows read/write for development. For production, add [Firebase Auth](https://firebase.google.com/docs/auth) and restrict access.

## 5. Authorized domains (for Google sign-in on Vercel)

If you deploy to Vercel and get **"auth/unauthorized-domain"** when using **Continue with Google**, add your live domain to Firebase:

1. Open [Firebase Console](https://console.firebase.google.com/) → your project.
2. Go to **Authentication** → **Settings** (or **Sign-in method** tab) → **Authorized domains**.
3. Click **Add domain**.
4. Enter your Vercel domain, e.g.:
   - `your-project.vercel.app` (replace with your actual Vercel URL)
   - or your custom domain if you use one (e.g. `app.philfida.gov.ph`).
5. Save.

Google sign-in will then work from that domain. Repeat for any other domains (e.g. preview URLs) if needed.

## 6. Run the app

```bash
npm run dev
```

No backend server needed. Add assets via the **Add Asset** button on the Dashboard.
