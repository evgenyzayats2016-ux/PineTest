import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Your web app's Firebase configuration
const firebaseConfig = {
      apiKey: "AIzaSyDNE3ypnY4A9zCApjtrDreyix_mD8zAdQ8",
        authDomain: "gas-futures-ace.firebaseapp.com",
          projectId: "gas-futures-ace",
            storageBucket: "gas-futures-ace.firebasestorage.app",
              messagingSenderId: "813249765893",
                appId: "1:813249765893:web:e7ab5c54a03b9250a3b26c"
};
                

// --- Configuration Validation ---
// This check prevents the app from running with placeholder values, which causes initialization errors.
if (firebaseConfig.apiKey === "AIzaSyDNE3ypnY4A9zCApjtrDreyix_mD8zAdQ8" || firebaseConfig.projectId === "gas-futures-ace") {
    const errorMessage = "Firebase configuration is not set. Please replace the placeholder values in 'firebase/config.ts' with your actual Firebase project configuration from your Firebase console.";
    
    // Display the error prominently in the UI
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding: 2rem; font-family: sans-serif; background-color: #282c34; color: white; height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="background-color: #ff3d00; padding: 1.5rem; border-radius: 8px; max-width: 600px;">
                    <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Ошибка конфигурации Firebase</h1>
                    <p style="font-size: 1rem; line-height: 1.5;">${errorMessage}</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">После обновления файла 'firebase/config.ts' обновите страницу.</p>
                </div>
            </div>
        `;
    }
    // Stop further script execution
    throw new Error(errorMessage);
}


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