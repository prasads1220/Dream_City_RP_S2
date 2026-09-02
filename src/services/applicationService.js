// Application service — handles whitelist application CRUD via Firestore and Backend API
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import axios from 'axios';

const COLLECTION_NAME = 'whitelistApplications';
const rawUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
const BACKEND_URL = rawUrl.replace(/\/$/, '');


/**
 * Check if a Discord ID has already applied (Securely via backend)
 * @param {string} discordId 
 */
export const checkDiscordDuplicate = async (discordId) => {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/check-duplicate/${discordId}`);
    return res.data.exists;
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return false; // Fallback to allow attempt if API is down
  }
};

/**
 * Fetch all applications for a specific Discord ID
 * Queries with both string and number versions of the ID to handle type mismatches
 * @param {string} discordId 
 */
export const getUserApplications = async (discordId) => {
  if (!discordId) return [];
  try {
    // Firestore is type-strict: '123' !== 123
    // The discordId may have been stored as a string OR a number depending on the source.
    // We query with the string version first (most common from form submissions).
    const discordIdStr = String(discordId);

    const q = query(
      collection(db, COLLECTION_NAME),
      where('discordId', '==', discordIdStr)
    );
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // If no results found with string, also try as a number (in case old data used numbers)
    if (results.length === 0 && /^\d+$/.test(discordIdStr)) {
      const qNum = query(
        collection(db, COLLECTION_NAME),
        where('discordId', '==', Number(discordIdStr))
      );
      const snapNum = await getDocs(qNum);
      results = snapNum.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }

    console.log(`📋 Found ${results.length} application(s) for Discord ID: ${discordIdStr}`, results.map(r => ({ type: r.type, status: r.status })));
    return results;
  } catch (error) {
    console.error('❌ Failed to fetch user applications:', error);
    return [];
  }
};

/**
 * Submit an application for a specific role
 * @param {Object} data - Form data
 * @param {string} type - Application type (Civilian, EMS, Police, Mechanic)
 * @param {string} userId - Auth user UID
 */
export const submitApplication = async (data, type, userId) => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    type,
    userId,
    status: 'pending',
    createdAt: serverTimestamp()
  });

  try {
    await axios.post(`${BACKEND_URL}/api/notify-new-application`, {
      name: data.discordName || data.fullName || 'Unknown',
      discordId: data.discordId,
      type: type
    }, { timeout: 10000 });
  } catch (error) {
    console.error('Failed to notify Discord about new application:', error);
  }

  return docRef;
};

/**
 * Fetch all applications (Admin)
 */
export const getAllApplications = async () => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

/**
 * Update application status and trigger backend automation
 * @param {string} appId 
 * @param {string} status 
 * @param {Object} appData - Full application data for notification
 * @param {Object} metadata - Optional additional info (jobRank, interviewDate, etc.)
 */
export const processApplicationDecision = async (appId, status, appData, metadata = {}) => {
  // 1. Update Firestore
  const docRef = doc(db, COLLECTION_NAME, appId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp()
  });

  const result = { firestore: true, discord: false, whitelist: false, error: null };

  // 2. Trigger Backend Discord Notification
  // The backend has been updated to handle non-numeric Discord IDs (usernames)

  try {
    const notifyRes = await axios.post(`${BACKEND_URL}/api/notify-user`, {
      discordId: appData.discordId,
      status: status,
      name: appData.discordName || appData.fullName,
      type: appData.type,
      ...metadata
    }, { timeout: 10000 });
    result.discord = notifyRes.data.success;
  } catch (error) {
    console.error('Failed to send Discord notification:', error.message);
    result.error = error.message;
  }

  // 3. Trigger FiveM Whitelist if approved
  if (status === 'approved') {
    try {
      const whitelistRes = await axios.post(`${BACKEND_URL}/api/whitelist-player`, {
        discordId: appData.discordId,
        name: appData.fullName || appData.discordName
      }, { timeout: 10000 });
      result.whitelist = whitelistRes.data.success;
    } catch (error) {
      console.error('Failed to update FiveM whitelist:', error.message);
    }
  }

  return result;
};

/**
 * Update arbitrary metadata for an application (Interview date, Rank, etc.)
 * @param {string} appId 
 * @param {Object} metadata - Fields to update
 */
export const updateApplicationMetadata = async (appId, metadata) => {
  const docRef = doc(db, COLLECTION_NAME, appId);
  await updateDoc(docRef, {
    ...metadata,
    updatedAt: serverTimestamp()
  });
};

/**
 * Delete one or more applications
 * @param {string[]} ids 
 */
export const deleteApplications = async (ids) => {
  if (ids.length === 1) {
    return await deleteDoc(doc(db, COLLECTION_NAME, ids[0]));
  }

  const batch = writeBatch(db);
  ids.forEach(id => {
    batch.delete(doc(db, COLLECTION_NAME, id));
  });
  return await batch.commit();
};

/**
 * Subscribe to realtime application locks
 * @param {Function} callback - Called with the new settings object
 */
export const subscribeToAppSettings = (callback) => {
  const settingsDoc = doc(db, 'System', 'appSettings');
  
  return onSnapshot(settingsDoc, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      // Default fallback if doc doesn't exist
      callback({
        policeLocked: true,
        emsLocked: true,
        mechanicLocked: true,
        dojLocked: true
      });
    }
  }, (error) => {
    console.error('Failed to subscribe to app settings:', error);
  });
};

/**
 * Update the lock status of a specific department
 * @param {string} departmentId - e.g., 'police', 'ems', 'mechanic'
 * @param {boolean} isLocked 
 */
export const updateAppLock = async (departmentId, isLocked) => {
  const settingsDoc = doc(db, 'System', 'appSettings');
  // Use setDoc with merge: true to create if it doesn't exist yet
  await setDoc(settingsDoc, {
    [`${departmentId}Locked`]: isLocked
  }, { merge: true });
};
