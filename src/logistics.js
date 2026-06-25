import { db } from './firebase';
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';

function getDb() {
  return db;
}

// ─── Materials ───────────────────────────────────────────────

/**
 * Real-time listener on the materials sub-collection.
 * vbt_events/{eventCode}/logistics_data/materials
 * @returns unsubscribe function
 */
export function subscribeToLogistics(eventCode, callback) {
  const db = getDb();
  const colRef = collection(db, 'vbt_events', eventCode, 'logistics_data', 'materials', 'items');
  return onSnapshot(colRef, (snapshot) => {
    const materials = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(materials);
  });
}

/**
 * Update an existing material document.
 */
export async function updateMaterial(eventCode, materialId, data) {
  const db = getDb();
  const docRef = doc(db, 'vbt_events', eventCode, 'logistics_data', 'materials', 'items', materialId);
  await updateDoc(docRef, data);
}

/**
 * Add a new material document.
 */
export async function addMaterial(eventCode, data) {
  const db = getDb();
  const colRef = collection(db, 'vbt_events', eventCode, 'logistics_data', 'materials', 'items');
  const docRef = await addDoc(colRef, {
    name: '',
    quantityNeeded: 0,
    quantityAvailable: 0,
    unitPrice: 0,
    verified: false,
    notes: '',
    createdAt: Date.now(),
    ...data
  });
  return docRef.id;
}

/**
 * Delete a material document.
 */
export async function deleteMaterial(eventCode, materialId) {
  const db = getDb();
  const docRef = doc(db, 'vbt_events', eventCode, 'logistics_data', 'materials', 'items', materialId);
  await deleteDoc(docRef);
}

// ─── Financials ──────────────────────────────────────────────

/**
 * Real-time listener on the single financials document.
 * vbt_events/{eventCode}/logistics_data/financials
 * Contains expenses[] and income[] arrays.
 * @returns unsubscribe function
 */
export function subscribeToFinancials(eventCode, callback) {
  const db = getDb();
  const docRef = doc(db, 'vbt_events', eventCode, 'logistics_data', 'financials');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback({ expenses: [], income: [] });
    }
  });
}

/**
 * Save the full financials object (merge to avoid overwriting other fields).
 */
export async function updateFinancials(eventCode, data) {
  const db = getDb();
  const docRef = doc(db, 'vbt_events', eventCode, 'logistics_data', 'financials');
  await setDoc(docRef, { ...data, updatedAt: Date.now() }, { merge: true });
}

// ─── Access Control ──────────────────────────────────────────

/**
 * Real-time listener on the access document.
 * vbt_events/{eventCode}/logistics_data/access
 * @returns unsubscribe function
 */
export function subscribeToLogisticsAccess(eventCode, callback) {
  const db = getDb();
  const docRef = doc(db, 'vbt_events', eventCode, 'logistics_data', 'access');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      // Default access list
      callback({ allowedNames: ['Yohanna', 'Amy', 'Rita', 'Andrew'] });
    }
  });
}

/**
 * Save the access list.
 */
export async function updateLogisticsAccess(eventCode, accessList) {
  const db = getDb();
  const docRef = doc(db, 'vbt_events', eventCode, 'logistics_data', 'access');
  await setDoc(docRef, { allowedNames: accessList, updatedAt: Date.now() }, { merge: true });
}
