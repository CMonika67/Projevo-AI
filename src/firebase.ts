import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';

// Environment-backed Firebase configuration without any hardcoded credentials
const getMetaEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  return '';
};

const firebaseConfig = {
  apiKey: getMetaEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getMetaEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getMetaEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getMetaEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getMetaEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getMetaEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getMetaEnv('VITE_FIREBASE_MEASUREMENT_ID')
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

// Initialize Firebase safely without duplicate initialization or missing-key exceptions
let app: any = null;
let auth: any = null;
let googleProvider: any = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
  }
}

export { app, auth, googleProvider };

export async function signInWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured() || !auth || !googleProvider) {
    throw new Error('Google Sign-In is not configured. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function firebaseSignOut(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  }
}

export default app;

