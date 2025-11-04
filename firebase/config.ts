// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOtmIYb75tuO76Gr5jse5lP3c4Ecq2v-s",
  authDomain: "studio-9140351137-a7972.firebaseapp.com",
  projectId: "studio-9140351137-a7972",
  storageBucket: "studio-9140351137-a7972.firebasestorage.app",
  messagingSenderId: "494868879085",
  appId: "1:494868879085:web:53e3d2c54eef0781139ee4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// In a real project, you might want to connect to emulators for local development
// For example:
// if (window.location.hostname === 'localhost') {
//   connectAuthEmulator(auth, "http://localhost:9099");
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectFunctionsEmulator(functions, "localhost", 5001);
// }

export { app, auth, db, functions };
