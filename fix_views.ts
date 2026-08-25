import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const localDb = JSON.parse(fs.readFileSync('db.json', 'utf8'));

let changed = false;
localDb.bots.forEach((b: any) => {
  if (b.name === 'Trịnh Triêu Vũ' && b.views > 1000) {
    console.log(`Fixing Trịnh Triêu Vũ views from ${b.views} to 205 (reasonable)`);
    b.views = 205;
    changed = true;
  }
});

if (changed) {
  fs.writeFileSync('db.json', JSON.stringify(localDb, null, 2), 'utf8');
  console.log("Updated local db.json");
  
  // also push to mainState
  setDoc(doc(db, "appData", "mainState"), localDb).then(() => {
    console.log("Synced fix to Firestore appData/mainState");
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
} else {
  console.log("No need to fix views.");
  process.exit(0);
}
