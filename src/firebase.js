import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {

  apiKey: "AIzaSyAQIGsXWjSNqPcPxJ_lfjXKzHYL892_dRE",
  authDomain: "hediyealsat-61160.firebaseapp.com",
  projectId: "hediyealsat-61160",
  storageBucket: "hediyealsat-61160.firebasestorage.app",
  messagingSenderId: "370420780946",
  appId: "1:370420780946:web:e60be57af987aa3dd6bb4b",
  measurementId: "G-TTJ1GDM3HM"

};


const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);


export const auth = getAuth(app);
