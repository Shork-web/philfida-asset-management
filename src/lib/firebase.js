import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let db = null
let auth = null

function getApp() {
  if (!app) {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error(
        'Firebase is not configured. Add VITE_FIREBASE_* env vars. See .env.example',
      )
    }
    app = initializeApp(firebaseConfig)
  }
  return app
}

export function getDb() {
  if (!db) db = getFirestore(getApp())
  return db
}

export function getFirebaseAuth() {
  if (!auth) auth = getAuth(getApp())
  return auth
}

export const ASSETS_COLLECTION = 'assets'
export const USERS_COLLECTION = 'users'
