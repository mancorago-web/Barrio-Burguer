import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB9u8YDmKzn_74dTxyecOT7OR-1m0nNQZY",
  authDomain: "hamburgueseria-cec1b.firebaseapp.com",
  projectId: "hamburgueseria-cec1b",
  storageBucket: "hamburgueseria-cec1b.firebasestorage.app",
  messagingSenderId: "142606919431",
  appId: "1:142606919431:web:14d335035774fd68cd47a2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
