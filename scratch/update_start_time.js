import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "faa-test-guide-v2",
  appId: "1:492280162134:web:08307e50672d6ae12d98f7",
  apiKey: "AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI",
  authDomain: "faa-test-guide-v2.firebaseapp.com",
  storageBucket: "faa-test-guide-v2.firebasestorage.app",
  messagingSenderId: "492280162134"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'db-vbt');

async function updateScheduleMatchupTimes(targetEventCode, startTimeStr, roundDur, breakDur) {
  const scheduleDocRef = doc(db, `vbt_events/${targetEventCode}/schedule_data/main`);
  const scheduleSnap = await getDoc(scheduleDocRef);
  if (!scheduleSnap.exists()) return;

  const scheduleData = scheduleSnap.data();
  const matchups = scheduleData.matchups || [];

  const [startHours, startMins] = startTimeStr.split(':').map(Number);
  const getShiftedTime = (minsOffset) => {
    const d = new Date();
    d.setHours(startHours, startMins + minsOffset, 0, 0);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${strMinutes} ${ampm}`;
  };

  const roundTimes = {
    1: getShiftedTime(0),
    2: getShiftedTime(1 * (roundDur + breakDur)),
    3: getShiftedTime(2 * (roundDur + breakDur)),
    4: getShiftedTime(3 * (roundDur + breakDur))
  };
  const bigGameTime = getShiftedTime(4 * roundDur + 3 * breakDur);
  const reflectionTime = getShiftedTime(4 * roundDur + 3 * breakDur + 35);

  const updatedMatchups = matchups.map(m => {
    let newTime = m.time;
    if (m.block === 1) {
      newTime = roundTimes[m.round] || m.time;
    } else if (m.block === 2) {
      newTime = bigGameTime;
    } else if (m.block === 3) {
      newTime = reflectionTime;
    }
    return {
      ...m,
      time: newTime
    };
  });

  await setDoc(scheduleDocRef, { ...scheduleData, matchups: updatedMatchups }, { merge: true });
}

async function run() {
  console.log("Updating config document...");
  const configDocRef = doc(db, 'vbt_events/june26/config/main');
  const configSnap = await getDoc(configDocRef);
  if (!configSnap.exists()) {
    throw new Error("june26 config not found");
  }
  const currentConfig = configSnap.data();
  const nextCacheVersion = (currentConfig.clearCacheVersion || 3) + 1;

  await updateDoc(configDocRef, {
    startTime: '15:40',
    clearCacheVersion: nextCacheVersion,
    updatedAt: new Date().toISOString()
  });

  console.log(`Config updated: startTime to '15:40', clearCacheVersion bumped to ${nextCacheVersion}.`);

  console.log("Shifting matchup schedule times to start at 15:40...");
  await updateScheduleMatchupTimes("june26", "15:40", 20, 5);

  console.log("SUCCESS! Database updated successfully to start at 3:40 PM!");
}

run().catch(console.error);
