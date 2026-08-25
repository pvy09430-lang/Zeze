import { initializeApp, getApps } from "firebase/app";
import { getFirestore, getDocs, collection, doc, getDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

async function check() {
  const botsSnap = await getDocs(collection(db, "bots"));
  console.log(`Found ${botsSnap.size} bots in 'bots' collection.`);
  
  const mainStateRef = doc(db, "appData", "mainState");
  const mainSnap = await getDoc(mainStateRef);
  if (mainSnap.exists()) {
    const data = mainSnap.data();
    console.log(`mainState exists. Bots in mainState: ${data.bots ? data.bots.length : 0}`);
  } else {
    console.log(`mainState does not exist.`);
  }
}

check().catch(console.error);
