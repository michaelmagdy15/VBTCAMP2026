import { db } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, runTransaction, onSnapshot } from "firebase/firestore";

/**
 * Attempts to acquire a PTT lock for a specific channel.
 * Returns true if successful, false if the channel is already busy.
 */
export async function acquireChannelLock(channelId, userRole, userName, uid) {
  const lockRef = doc(db, "vbt_events", "live_audio_locks", "channels", channelId);

  try {
    const success = await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      if (!lockDoc.exists()) {
        // Channel is completely free
        transaction.set(lockRef, {
          isBusy: true,
          currentSpeakerUid: uid,
          currentSpeakerName: userName,
          speakerRole: userRole,
          timestamp: serverTimestamp(),
        });
        return true;
      }

      const data = lockDoc.data();
      
      // If there is a stale lock (e.g. someone got disconnected without releasing)
      // we can override if it's older than 60 seconds.
      const now = Date.now();
      const lockTime = data.timestamp ? data.timestamp.toMillis() : now;
      const isStale = (now - lockTime) > 60000;

      if (!data.isBusy || isStale) {
        transaction.set(lockRef, {
          isBusy: true,
          currentSpeakerUid: uid,
          currentSpeakerName: userName,
          speakerRole: userRole,
          timestamp: serverTimestamp(),
        });
        return true;
      }

      // If we reach here, it's busy by someone else
      return false;
    });

    return success;
  } catch (err) {
    console.error("Transaction failed: ", err);
    return false;
  }
}

/**
 * Releases the channel lock so others can speak.
 */
export async function releaseChannelLock(channelId, uid) {
  const lockRef = doc(db, "vbt_events", "live_audio_locks", "channels", channelId);

  try {
    await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      if (lockDoc.exists()) {
        const data = lockDoc.data();
        // Only the person who holds the lock can release it
        if (data.currentSpeakerUid === uid) {
          transaction.update(lockRef, {
            isBusy: false,
            currentSpeakerUid: null,
            currentSpeakerName: null,
            speakerRole: null,
            timestamp: serverTimestamp(),
          });
        }
      }
    });
  } catch (err) {
    console.error("Failed to release lock: ", err);
  }
}

export function subscribeToChannelLock(channelId, callback) {
  const lockRef = doc(db, "vbt_events", "live_audio_locks", "channels", channelId);
  return onSnapshot(lockRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({ isBusy: false, currentSpeakerName: null, currentSpeakerUid: null });
    }
  });
}
