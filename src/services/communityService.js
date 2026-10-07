import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export { DEFAULT_COMMUNITY_ID };

/**
 * Default community configuration document
 */
export const DEFAULT_COMMUNITY_CONFIG = {
  id: DEFAULT_COMMUNITY_ID,
  name: 'Value Blessings Team',
  tagline: 'Faith, Service & Fellowship Through Sports',
  description: 'A church sports community that meets weekly for services, servant meetings, sports activities, training, outreach, and fellowship.',
  activeEventCode: 'july6',
  timezone: 'Africa/Cairo',
  settings: {
    allowWalkInRegistration: true,
    defaultCheckInWindowMinutes: 60,
    qrTokenDurationSeconds: 180,
    features: {
      qrAttendance: true,
      servingMarketplace: true,
      teamsAndGroups: true,
      prayerWall: true,
      trainingModules: true,
    }
  }
};

/**
 * Fetch a community document by ID, initializing defaults if it does not exist.
 * @param {string} communityId 
 * @returns {Promise<Object>}
 */
export async function getCommunity(communityId = DEFAULT_COMMUNITY_ID) {
  try {
    const docRef = doc(db, 'vbt_communities', communityId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    // Auto-initialize if first run
    const initialDoc = {
      ...DEFAULT_COMMUNITY_CONFIG,
      id: communityId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, initialDoc, { merge: true });
    return initialDoc;
  } catch (error) {
    console.error(`[CommunityService] Failed to get community ${communityId}:`, error);
    return { ...DEFAULT_COMMUNITY_CONFIG, id: communityId };
  }
}

/**
 * Subscribe to real-time community settings updates.
 * @param {string} communityId 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export function subscribeToCommunity(communityId = DEFAULT_COMMUNITY_ID, callback) {
  const docRef = doc(db, 'vbt_communities', communityId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback({ ...DEFAULT_COMMUNITY_CONFIG, id: communityId });
    }
  }, (error) => {
    console.error(`[CommunityService] Subscription error for ${communityId}:`, error);
    callback({ ...DEFAULT_COMMUNITY_CONFIG, id: communityId });
  });
}

/**
 * Update community settings (Admin only).
 * @param {string} communityId 
 * @param {Object} updates 
 */
export async function updateCommunitySettings(communityId = DEFAULT_COMMUNITY_ID, updates) {
  const docRef = doc(db, 'vbt_communities', communityId);
  try {
    await setDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error(`[CommunityService] Failed to update community ${communityId}:`, error);
    throw error;
  }
}
