// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIza...",                         // your project key
  authDomain: "heartlink-provider-platform.firebaseapp.com",
  projectId: "heartlink-provider-platform",
  storageBucket: "heartlink-provider-platform.appspot.com",
  messagingSenderId: "XXXXXX",
  appId: "1:XXXXXX:web:XXXXXX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
