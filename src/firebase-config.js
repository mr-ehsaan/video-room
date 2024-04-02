// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCBC1PDvvX_krNj3Gq4WYASSU6i_1ZS-lw",
  authDomain: "video-app-27473.firebaseapp.com",
  projectId: "video-app-27473",
  storageBucket: "video-app-27473.appspot.com",
  messagingSenderId: "1033744126587",
  appId: "1:1033744126587:web:7d08f8510ab363989608de",
  measurementId: "G-6EB0NGZ4R1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics (optional)
const analytics = getAnalytics(app);

// Initialize Firebase Database
const database = getDatabase(app);

const auth = getAuth(app);

export { app, analytics, database, auth };