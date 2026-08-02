import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:    (import.meta.env.VITE_FIREBASE_API_KEY    as string | undefined) || 'AIzaSyBivFl3oyBtjUOCUhycPW51P_2GzQ7E2Jw',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || 'sales-9e9b8',
  appId:     (import.meta.env.VITE_FIREBASE_APP_ID     as string | undefined) || '1:849598643135:web:e866e665a0eb7acbafff0a',
}

/** Shared client-side Firestore handle — reuses whichever Firebase app is already initialized. */
export function getFirestoreDb(): Firestore {
  const app = getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig, 'finance')
  return getFirestore(app)
}
