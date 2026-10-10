import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import baseFirebaseConfig from '../../firebase-applet-config.json';

// Merge base applet config with optional VITE_ environment variables so GitHub/Vercel and AI Studio Preview use the exact same configuration
export const firebaseConfig = {
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || baseFirebaseConfig.projectId || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || baseFirebaseConfig.appId || '').trim(),
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || baseFirebaseConfig.apiKey || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || baseFirebaseConfig.authDomain || '').trim(),
  firestoreDatabaseId: (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || baseFirebaseConfig.firestoreDatabaseId || '(default)').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || baseFirebaseConfig.storageBucket || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || baseFirebaseConfig.messagingSenderId || '').trim(),
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || baseFirebaseConfig.measurementId || '').trim(),
};

// Suppress noisy internal @firebase/firestore WebChannel timeout console.error logs
// so transient network/proxy delays seamlessly fall back to offline cache without crashing preview
try {
  setLogLevel('silent');
} catch {
  // ignore if unsupported
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific database ID and long-polling auto-detection for iframe/proxy compatibility
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    },
    databaseId
  );
} catch {
  firestoreDb = getFirestore(app, databaseId);
}

export const db = firestoreDb;

let storageInstance: FirebaseStorage | null = null;
try {
  const bucketUrl = firebaseConfig.storageBucket
    ? (firebaseConfig.storageBucket.startsWith('gs://')
        ? firebaseConfig.storageBucket
        : `gs://${firebaseConfig.storageBucket}`)
    : undefined;
  storageInstance = getStorage(app, bucketUrl);
} catch {
  try {
    storageInstance = getStorage(app);
  } catch {
    storageInstance = null;
  }
}

export const storage = storageInstance;

export default app;

