import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "faa-test-guide-v2",
  appId: "1:492280162134:web:08307e50672d6ae12d98f7",
  apiKey: "AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI",
  authDomain: "faa-test-guide-v2.firebaseapp.com",
  storageBucket: "faa-test-guide-v2.firebasestorage.app",
  messagingSenderId: "492280162134"
};

import { getAuth, signInAnonymously } from "firebase/auth";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'db-vbt');
const auth = getAuth(app);

async function checkServants() {
  await signInAnonymously(auth);
  const docSnap = await getDoc(doc(db, 'vbt_global', 'servants'));
  if (docSnap.exists()) {
    console.log(JSON.stringify(docSnap.data().list, null, 2));
  } else {
    console.log("No servants found");
  }
}
checkServants();
