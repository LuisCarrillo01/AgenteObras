import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { ENV } from '../config/env.js';

// Initialize Firebase Admin App
initializeApp({
  credential: cert(ENV.GOOGLE_APPLICATION_CREDENTIALS)
});

export const db = getFirestore();
console.log('[DB] Firebase Firestore initialized successfully.');
