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
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION_NAME = 'events';

/**
 * Create a new event with its top 3 winners
 * @param {Object} eventData 
 */
export const createEvent = async (eventData) => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...eventData,
    active: eventData.active || false,
    createdAt: serverTimestamp()
  });
  
  // If this event was set to active immediately, deactivate other events
  if (eventData.active) {
    await setActiveEvent(docRef.id);
  }
  
  return docRef.id;
};

/**
 * Fetch all events, ordered by race date descending
 */
export const getAllEvents = async () => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Failed to fetch events:', error);
    // Fallback: If ordering by 'date' fails because index is building, try fallback
    try {
      const qFallback = query(collection(db, COLLECTION_NAME));
      const snapshotFallback = await getDocs(qFallback);
      return snapshotFallback.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } catch (err) {
      console.error('All event fetch attempts failed:', err);
      return [];
    }
  }
};

/**
 * Update an existing event
 * @param {string} id 
 * @param {Object} eventData 
 */
export const updateEvent = async (id, eventData) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...eventData,
    updatedAt: serverTimestamp()
  });

  // If this event is now active, handle toggles for others
  if (eventData.active) {
    await setActiveEvent(id);
  }
};

/**
 * Delete an event
 * @param {string} id 
 */
export const deleteEvent = async (id) => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

/**
 * Fetch the currently active welcome popup event
 */
export const getActiveEvent = async () => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('active', '==', true),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const activeDoc = snapshot.docs[0];
      return {
        id: activeDoc.id,
        ...activeDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get active event:', error);
    return null;
  }
};

/**
 * Sets a specific event as the active popup, and deactivates all others.
 * @param {string} activeId 
 */
export const setActiveEvent = async (activeId) => {
  try {
    // 1. Fetch all other active events
    const q = query(
      collection(db, COLLECTION_NAME),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    
    // 2. Batch update: turn off 'active' for everything except activeId
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(docSnap => {
      if (docSnap.id !== activeId) {
        batch.update(doc(db, COLLECTION_NAME, docSnap.id), { active: false });
      }
    });
    
    // 3. Turn on 'active' for activeId
    batch.update(doc(db, COLLECTION_NAME, activeId), { active: true });
    
    await batch.commit();
  } catch (error) {
    console.error('Failed to set active event:', error);
    throw error;
  }
};

/**
 * Submit an application to a specific event
 * @param {string} eventId 
 * @param {Object} applicationData 
 */
export const submitEventApplication = async (eventId, applicationData) => {
  const docRef = await addDoc(collection(db, 'eventApplications'), {
    eventId,
    ...applicationData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

/**
 * Fetch all applications submitted for events
 */
export const getAllEventApplications = async () => {
  try {
    const q = query(
      collection(db, 'eventApplications'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Failed to fetch event applications:', error);
    // Fallback if ordering by 'createdAt' index is not yet built in Firestore
    try {
      const qFallback = query(collection(db, 'eventApplications'));
      const snapshotFallback = await getDocs(qFallback);
      return snapshotFallback.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error('All event applications fetch attempts failed:', err);
      return [];
    }
  }
};

/**
 * Delete a specific event application
 * @param {string} id 
 */
export const deleteEventApplication = async (id) => {
  await deleteDoc(doc(db, 'eventApplications', id));
};
