import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCmXOvZtmwNA5xoWuuWsgae0tiWz4bg_FE",
    authDomain: "moneybook-app.firebaseapp.com",
    projectId: "moneybook-app",
    storageBucket: "moneybook-app.firebasestorage.app",
    messagingSenderId: "637158010486",
    appId: "1:637158010486:web:aedd82f2e13e96ddedb957"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
