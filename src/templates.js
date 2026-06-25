/**
 * templates.js
 * ─────────────────────────────────────────────────────────────
 * Template management module for VBT Sports Camp.
 * Allows coordinators to save, load, and apply service
 * configuration templates via Firestore.
 * ─────────────────────────────────────────────────────────────
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const TEMPLATES_COLLECTION = 'vbt_service_templates';

// ── Helpers ───────────────────────────────────────────────────

/**
 * Convert a template name to a URL-friendly slug ID.
 * @param {string} name - The template name
 * @returns {string} Slugified ID
 */
function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '_')
    .replace(/^-+|-+$/g, '');
}

// ── Template CRUD ─────────────────────────────────────────────

/**
 * Save the current event configuration and schedule data as a reusable template.
 *
 * @param {string} templateName  - Human-readable template name
 * @param {Object} eventConfig   - The event configuration object
 * @param {Object} scheduleData  - The schedule data object
 * @param {string} [description] - Optional description for the template
 * @returns {Promise<string>} The generated template ID
 */
export async function saveAsTemplate(templateName, eventConfig, scheduleData, description = '') {
  const templateId = slugify(templateName);

  if (!templateId) {
    throw new Error('Invalid template name. Please provide a non-empty name.');
  }

  const templateDoc = {
    name: templateName,
    description,
    config: eventConfig,
    schedule: scheduleData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);

  // Check if already exists to preserve createdAt
  const existing = await getDoc(docRef);
  if (existing.exists()) {
    templateDoc.createdAt = existing.data().createdAt;
  }

  await setDoc(docRef, templateDoc);
  return templateId;
}

/**
 * Fetch all saved templates (metadata only — no full config/schedule).
 *
 * @returns {Promise<Object[]>} Array of { id, name, description, createdAt }
 */
export async function loadTemplates() {
  const colRef = collection(db, TEMPLATES_COLLECTION);
  const snapshot = await getDocs(colRef);

  const templates = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    templates.push({
      id: docSnap.id,
      name: data.name || docSnap.id,
      description: data.description || '',
      createdAt: data.createdAt || null,
    });
  });

  // Sort by creation date descending (newest first)
  templates.sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return templates;
}

/**
 * Fetch a single template with its full configuration and schedule data.
 *
 * @param {string} templateId - The template document ID
 * @returns {Promise<Object|null>} Full template object or null if not found
 */
export async function loadTemplate(templateId) {
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

/**
 * Delete a saved template from Firestore.
 *
 * @param {string} templateId - The template document ID
 * @returns {Promise<void>}
 */
export async function deleteTemplate(templateId) {
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
  await deleteDoc(docRef);
}

/**
 * Create a new event configuration from an existing template,
 * merging any overrides into the template's config.
 *
 * @param {string} templateId  - The source template ID
 * @param {string} newEventCode - The event code for the new event
 * @param {Object} [overrides]  - Optional config overrides to merge
 * @returns {Promise<{ config: Object, schedule: Object }>}
 */
export async function createEventFromTemplate(templateId, newEventCode, overrides = {}) {
  const template = await loadTemplate(templateId);

  if (!template) {
    throw new Error(`Template "${templateId}" not found.`);
  }

  // Deep merge the config with overrides
  const mergedConfig = {
    ...template.config,
    ...overrides,
    eventCode: newEventCode,
  };

  return {
    config: mergedConfig,
    schedule: template.schedule || {},
  };
}

// ── Preset Templates ──────────────────────────────────────────

/**
 * Built-in starter templates that coordinators can use as a starting point.
 * These are not stored in Firestore — they ship with the app.
 */
export const PRESET_TEMPLATES = [
  {
    id: 'sunday_school_sports',
    name: 'Sunday School Sports Day',
    description: 'A fun-filled sports day for Sunday School children with team games and fellowship.',
    config: {
      eventType: 'service',
      kidCount: 60,
      daysCount: 1,
      teamCount: 4,
    },
  },
  {
    id: 'summer_outreach',
    name: 'Summer Outreach',
    description: 'Summer outreach event with water games, team challenges, and spiritual reflection.',
    config: {
      eventType: 'service',
      kidCount: 100,
      daysCount: 2,
      teamCount: 4,
    },
  },
  {
    id: 'youth_fellowship_rally',
    name: 'Youth Fellowship Rally',
    description: 'Youth fellowship rally with competitive games, worship, and team building.',
    config: {
      eventType: 'service',
      kidCount: 80,
      daysCount: 1,
      teamCount: 4,
    },
  },
];
