
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Log the environment variable to help debug
const rawDatabaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
console.log(
  '[Firebase Setup] Attempting to initialize with DATABASE_URL from env:',
  rawDatabaseURL
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: rawDatabaseURL, // This is the crucial one
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Perform more stringent checks on the databaseURL before attempting to initialize
if (!firebaseConfig.databaseURL) {
  const errorMessage = 'Firebase FATAL: NEXT_PUBLIC_FIREBASE_DATABASE_URL is not defined in your .env file or environment variables. Firebase cannot connect to the Realtime Database without it. Please ensure it is set correctly (e.g., https://your-project-id-default-rtdb.firebaseio.com) and restart your server.';
  console.error(errorMessage);
  throw new Error(errorMessage);
} else if (typeof firebaseConfig.databaseURL !== 'string') {
  const errorMessage = `Firebase FATAL: NEXT_PUBLIC_FIREBASE_DATABASE_URL is not a string. Received: ${typeof firebaseConfig.databaseURL}. Please ensure it's a valid URL string.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
} else if (!firebaseConfig.databaseURL.startsWith('https://')) {
  const errorMessage = `Firebase FATAL: NEXT_PUBLIC_FIREBASE_DATABASE_URL "${firebaseConfig.databaseURL}" must start with "https://". Please correct it in your .env file and restart your server.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
} else if (
    !(firebaseConfig.databaseURL.endsWith('.firebaseio.com') || firebaseConfig.databaseURL.endsWith('.firebasedatabase.app'))
) {
  const errorMessage = `Firebase FATAL: NEXT_PUBLIC_FIREBASE_DATABASE_URL "${firebaseConfig.databaseURL}" does not seem to be a valid Firebase Realtime Database URL. It should typically end with ".firebaseio.com" or ".firebasedatabase.app". Please verify this value in your .env file and restart your server.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}


// Initialize Firebase
let app;
if (!getApps().length) {
  try {
    console.log('[Firebase Setup] Initializing Firebase app with config:', {
      apiKey: firebaseConfig.apiKey ? '***' : undefined, // Mask API key
      authDomain: firebaseConfig.authDomain,
      databaseURL: firebaseConfig.databaseURL,
      projectId: firebaseConfig.projectId,
      // storageBucket: firebaseConfig.storageBucket, // Not strictly needed for RTDB
      // messagingSenderId: firebaseConfig.messagingSenderId, // Not strictly needed for RTDB
      // appId: firebaseConfig.appId // Not strictly needed for RTDB
    });
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("Firebase FATAL ERROR during initializeApp:", error);
    // Re-throw or handle as appropriate for your app's error strategy
    throw error;
  }
} else {
  app = getApp();
  console.log('[Firebase Setup] Using existing Firebase app instance.');
}

let database;
try {
  database = getDatabase(app);
} catch (error) {
  console.error("Firebase FATAL ERROR during getDatabase(app):", error);
  // This is often where the "Cannot parse Firebase url" error surfaces if initializeApp didn't catch it with a malformed URL that wasn't empty.
  throw error;
}

export { app, database };
