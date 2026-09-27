import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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

export default app;
