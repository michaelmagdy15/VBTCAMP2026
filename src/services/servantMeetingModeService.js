import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import {
  MEETING_MODES,
  isLeaderRole,
  createAuditRecord,
  AUDIT_ACTIONS,
  VBT_ROLES,
} from '../contracts/communityContracts';
import {
  getServiceAttendance,
  recordAttendance,
  ATTENDANCE_STATUS,
  CHECKIN_METHOD,
} from './attendanceService';

export { MEETING_MODES };

/**
 * Path helper for the servant meeting session doc
 * @param {string} communityId
 * @param {string} serviceId
 * @returns {string}
 */
export function servantMeetingSessionDocPath(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  return `vbt_communities/${communityId}/servant_meeting_sessions/${serviceId}`;
}

/**
 * Path helper for the servant meeting feedback subcollection
 * @param {string} communityId
 * @param {string} serviceId
 * @returns {string}
 */
export function servantMeetingFeedbackCollectionPath(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  return `vbt_communities/${communityId}/servant_meeting_sessions/${serviceId}/feedback`;
}

/**
 * Default meeting session generator providing structured content for all 3 phases
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Object} [baseData={}]
 * @returns {Object}
 */
export function createDefaultMeetingSession(communityId = DEFAULT_COMMUNITY_ID, serviceId, baseData = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeekDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  return {
    id: serviceId,
    serviceId,
    communityId,
    title: baseData.title || 'Weekly Servant Meeting & Spiritual Huddle',
    serviceTitle: baseData.serviceTitle || baseData.title || 'Friday Camp & Youth Gathering',
    phase: baseData.phase || MEETING_MODES.BEFORE,
    phaseUpdatedAt: null,
    phaseUpdatedBy: null,

    // Phase 1: BEFORE THE MEETING
    meetingLocation: {
      room: baseData.meetingLocation?.room || 'Upper Room / Youth Lounge',
      address: baseData.meetingLocation?.address || 'VBT Community Center - 2nd Floor',
      arrivalTime: baseData.meetingLocation?.arrivalTime || '17:30',
      startTime: baseData.meetingLocation?.startTime || '18:00',
      endTime: baseData.meetingLocation?.endTime || '19:30',
    },
    qrCodeStatus: {
      active: true,
      sessionId: `qrs_${serviceId}`,
      quickCheckInPrompt: 'Scan the room QR code or tap Quick Check-in to confirm your presence',
    },
    agenda: baseData.agenda || [
      {
        id: 'agenda_1',
        title: 'Opening Prayer & Devotional',
        estimatedMinutes: 10,
        speaker: 'Service Coordinator',
        completed: false,
        notes: 'Theme: Running with purpose and humility (1 Cor 9:24-27).',
      },
      {
        id: 'agenda_2',
        title: 'Attendance Check & Servant Welcome',
        estimatedMinutes: 10,
        speaker: 'Lead Servant',
        completed: false,
        notes: 'Welcome first-time volunteers and pair them with experienced mentors.',
      },
      {
        id: 'agenda_3',
        title: 'Station Schedules, Equipment & Rotations',
        estimatedMinutes: 20,
        speaker: 'Athletics Director',
        completed: false,
        notes: 'Review court assignments, referee rotations, whistle rules, and timer devices.',
      },
      {
        id: 'agenda_4',
        title: 'Safety, Hydration & First Aid Briefing',
        estimatedMinutes: 10,
        speaker: 'Safety Officer',
        completed: false,
        notes: 'Review ice pack locations, heat index protocols, and emergency exits.',
      },
      {
        id: 'agenda_5',
        title: 'Open Floor & On-the-Spot Role Confirmations',
        estimatedMinutes: 15,
        speaker: 'Team Leaders',
        completed: false,
        notes: 'Fill any remaining open stations and confirm team sub-leaders.',
      },
      {
        id: 'agenda_6',
        title: 'Closing Circle & Commissioning Prayer',
        estimatedMinutes: 10,
        speaker: 'Pastoral Care Leader',
        completed: false,
        notes: 'Lifting up the youth, families, and all serving hands in blessing.',
      },
    ],
    preparationMaterials: baseData.preparationMaterials || [
      {
        id: 'prep_1',
        title: "This Week's Theme & Scripture Reading",
        type: 'notes',
        url: '#',
        required: true,
        description: '1 Corinthians 9:24-27 - Running the race to obtain the incorruptible crown.',
      },
      {
        id: 'prep_2',
        title: 'Station Map & Court Layout (PDF)',
        type: 'download',
        url: '#',
        required: false,
        description: 'Diagram of Basketball Court A, Soccer Field B, and Registration Tent.',
      },
      {
        id: 'prep_3',
        title: 'First Aid & Concussion Safety Quick Guide',
        type: 'document',
        url: '#',
        required: true,
        description: 'Essential symptoms to spot, protocol steps, and when to notify emergency contacts.',
      },
    ],
    openServingRoles: baseData.openServingRoles || [
      {
        id: 'role_ref_1',
        role: 'Basketball Court Referee',
        department: 'sports',
        spotsNeeded: 2,
        spotsFilled: 1,
        assignedMembers: [{ id: 'usr_david', name: 'David K.' }],
      },
      {
        id: 'role_fa_1',
        role: 'First Aid & Hydration Station',
        department: 'safety',
        spotsNeeded: 2,
        spotsFilled: 0,
        assignedMembers: [],
      },
      {
        id: 'role_media_1',
        role: 'Photo & Video Highlights',
        department: 'media',
        spotsNeeded: 2,
        spotsFilled: 1,
        assignedMembers: [{ id: 'usr_sarah', name: 'Sarah M.' }],
      },
      {
        id: 'role_setup_1',
        role: 'Setup & Teardown Crew',
        department: 'logistics',
        spotsNeeded: 4,
        spotsFilled: 2,
        assignedMembers: [
          { id: 'usr_mike', name: 'Michael M.' },
          { id: 'usr_john', name: 'John D.' },
        ],
      },
    ],
    prayerTopics: baseData.prayerTopics || [
      {
        id: 'prayer_1',
        title: 'Humility and Servant Heart',
        topic: 'Praying for patience, love, and Christ-like gentleness in every interaction with children and youth.',
        category: 'spiritual',
      },
      {
        id: 'prayer_2',
        title: 'Injury Prevention & Court Safety',
        topic: 'Covering all games, drills, and weather conditions with safety, quick hydration, and swift care.',
        category: 'safety',
      },
      {
        id: 'prayer_3',
        title: 'Reaching Newcomer Families',
        topic: 'That newcomer youth and parents feel welcomed, valued, and integrated into our community.',
        category: 'outreach',
      },
    ],
    urgentAnnouncements: baseData.urgentAnnouncements || [
      {
        id: 'ann_1',
        title: 'Indoor Court Adjustments',
        message: 'Courts 3 & 4 moved to Indoor Gymnasium due to weather forecast.',
        priority: 'high',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'ann_2',
        title: 'Servant Gear Check',
        message: 'Pick up your blue servant jerseys in the team room before 17:45.',
        priority: 'normal',
        timestamp: new Date().toISOString(),
      },
    ],

    // Phase 2: DURING THE MEETING
    polls: baseData.polls || [
      {
        id: 'poll_readiness',
        question: 'Team Readiness Pulse: How ready is your station for upcoming games?',
        options: ['100% Ready to Roll! 🔥', 'Good, need 1 more volunteer 👍', 'Need leader assistance / materials 🆘'],
        responses: {},
      },
      {
        id: 'poll_spiritual_check',
        question: 'Quick Spiritual Check: Are you feeling refreshed or need prayer?',
        options: ['Filled with energy and joy 🕊️', 'Doing fine, ready to serve 🤝', 'Need prayer and encouragement ❤️'],
        responses: {},
      },
    ],
    discussionPrompts: baseData.discussionPrompts || [
      'Where did you witness God moving among our youth during this past week?',
      'Which youth member needs an extra word of encouragement or check-in today?',
      'How can we make station transitions smoother and safer today?',
    ],

    // Phase 3: AFTER THE MEETING
    decisions: baseData.decisions || [
      'Agreed to extend warm-up stations by 5 minutes to prevent calf and ankle strains.',
      'Assigned dedicated hydration breaks every 20 minutes across all courts.',
      'Approved purchasing 12 new size 7 basketballs and 2 first aid refill kits.',
    ],
    actionItems: baseData.actionItems || [
      {
        id: 'act_1',
        title: 'Bring extra whistles, clipboards, and ball pumps to Court 1 & 2',
        ownerId: 'usr_david',
        ownerName: 'David K.',
        dueDate: today,
        completed: false,
        notes: 'Bins are located in the north storage room.',
      },
      {
        id: 'act_2',
        title: 'Verify camera battery kits and memory cards for media team',
        ownerId: 'usr_sarah',
        ownerName: 'Sarah M.',
        dueDate: today,
        completed: true,
        notes: 'Spares fully charged.',
      },
      {
        id: 'act_3',
        title: 'Send weekly servant summary & scripture memo to WhatsApp broadcast',
        ownerId: 'usr_leader',
        ownerName: 'Service Coordinator',
        dueDate: nextWeekDate,
        completed: false,
        notes: 'Include link to feedback form.',
      },
    ],
    feedback: baseData.feedback || [],
    nextMeeting: baseData.nextMeeting || {
      date: nextWeekDate,
      time: '18:00',
      title: 'Next Servant Prep & Fellowship Huddle',
      location: 'Upper Room / Youth Lounge',
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Fetch meeting session from Firestore, creating and persisting default data if it doesn't exist
 * @param {string} communityId
 * @param {string} serviceId
 * @returns {Promise<Object>}
 */
export async function getMeetingSession(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  if (!serviceId) {
    throw new Error('serviceId is required to get meeting session');
  }

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }

    // Initialize default session if not found
    const defaultSession = createDefaultMeetingSession(communityId, serviceId);
    await setDoc(docRef, defaultSession);
    return defaultSession;
  } catch (err) {
    console.error(`[ServantMeetingModeService] Error fetching meeting session for ${serviceId}:`, err);
    // Return fallback in-memory default to prevent UI breakage
    return createDefaultMeetingSession(communityId, serviceId);
  }
}

/**
 * Update the active meeting phase (Before -> During -> After)
 * Enforces role-based permissions via communityContracts.
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} phase - 'before' | 'during' | 'after'
 * @param {Object} [actor] - { id, displayName, role }
 * @returns {Promise<Object>}
 */
export async function updateMeetingPhase(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  phase,
  actor = null
) {
  if (!serviceId) throw new Error('serviceId is required');

  const validPhases = [MEETING_MODES.BEFORE, MEETING_MODES.DURING, MEETING_MODES.AFTER];
  if (!validPhases.includes(phase)) {
    throw new Error(`Invalid meeting phase: "${phase}". Expected one of: ${validPhases.join(', ')}`);
  }

  if (actor && actor.role && !isLeaderRole(actor.role)) {
    throw new Error('Unauthorized: Only leaders can update the meeting phase');
  }

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  const updates = {
    phase,
    phaseUpdatedAt: serverTimestamp(),
    phaseUpdatedBy: actor?.displayName || actor?.name || actor?.id || 'Leader',
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updates, { merge: true });

  return {
    success: true,
    serviceId,
    phase,
    updatedBy: updates.phaseUpdatedBy,
  };
}

/**
 * Submit or update a member's response to a live pulse poll question
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} pollId
 * @param {string} memberId
 * @param {string|number} answer
 * @returns {Promise<Object>}
 */
export async function submitPollResponse(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  pollId,
  memberId,
  answer
) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!pollId) throw new Error('pollId is required');
  if (!memberId) throw new Error('memberId is required');
  if (answer === undefined || answer === null || answer === '') {
    throw new Error('answer is required');
  }

  const session = await getMeetingSession(communityId, serviceId);
  const polls = Array.isArray(session.polls) ? [...session.polls] : [];
  const pollIndex = polls.findIndex((p) => p.id === pollId);

  if (pollIndex === -1) {
    throw new Error(`Poll with id "${pollId}" not found in meeting session`);
  }

  const targetPoll = { ...polls[pollIndex] };
  const responses = { ...(targetPoll.responses || {}) };

  responses[memberId] = {
    memberId,
    answer,
    submittedAt: new Date().toISOString(),
  };

  targetPoll.responses = responses;
  polls[pollIndex] = targetPoll;

  // Calculate live breakdown tally
  const tally = {};
  (targetPoll.options || []).forEach((opt) => {
    tally[opt] = 0;
  });

  const responseEntries = Object.values(responses);
  responseEntries.forEach((res) => {
    const userAns = typeof res === 'object' ? res.answer : res;
    if (tally[userAns] !== undefined) {
      tally[userAns]++;
    } else {
      tally[userAns] = 1;
    }
  });

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  await setDoc(
    docRef,
    {
      polls,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    pollId,
    memberId,
    answer,
    tally,
    totalResponses: responseEntries.length,
    poll: targetPoll,
  };
}

/**
 * Record meeting decisions and assign action items
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Array<string|Object>} decisions
 * @param {Array<Object>} actionItems
 * @param {Object} [actor]
 * @returns {Promise<Object>}
 */
export async function recordMeetingDecisions(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  decisions = [],
  actionItems = [],
  actor = null
) {
  if (!serviceId) throw new Error('serviceId is required');

  if (actor && actor.role && !isLeaderRole(actor.role)) {
    throw new Error('Unauthorized: Only leaders can record meeting decisions');
  }

  const sanitizedDecisions = (Array.isArray(decisions) ? decisions : []).map((d) => {
    if (typeof d === 'string') return d.trim();
    if (d && typeof d === 'object') return d.title || d.text || JSON.stringify(d);
    return String(d);
  }).filter(Boolean);

  const sanitizedActionItems = (Array.isArray(actionItems) ? actionItems : []).map((item, idx) => ({
    id: item.id || `act_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    title: item.title || 'Action Item',
    ownerId: item.ownerId || null,
    ownerName: item.ownerName || 'Unassigned',
    dueDate: item.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    completed: Boolean(item.completed),
    notes: item.notes || '',
  }));

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  const updates = {
    decisions: sanitizedDecisions,
    actionItems: sanitizedActionItems,
    decisionsUpdatedAt: serverTimestamp(),
    decisionsUpdatedBy: actor?.displayName || actor?.name || actor?.id || 'Leader',
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updates, { merge: true });

  return {
    success: true,
    serviceId,
    decisions: sanitizedDecisions,
    actionItems: sanitizedActionItems,
    updatedBy: updates.decisionsUpdatedBy,
  };
}

/**
 * Submit feedback after the servant meeting
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} memberId
 * @param {Object} feedback - { rating, positives, improvements, notes, memberName }
 * @returns {Promise<Object>}
 */
export async function submitMeetingFeedback(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  memberId,
  feedback = {}
) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!memberId) throw new Error('memberId is required');

  const session = await getMeetingSession(communityId, serviceId);
  const feedbackList = Array.isArray(session.feedback) ? [...session.feedback] : [];

  const feedbackRecord = {
    id: feedback.id || `fb_${memberId}_${Date.now()}`,
    memberId,
    memberName: feedback.memberName || feedback.name || 'Anonymous Servant',
    memberRole: feedback.memberRole || 'servant',
    rating: typeof feedback.rating === 'number' ? Math.max(1, Math.min(5, feedback.rating)) : 5,
    positives: feedback.positives ? String(feedback.positives).trim() : '',
    improvements: feedback.improvements ? String(feedback.improvements).trim() : '',
    notes: feedback.notes ? String(feedback.notes).trim() : '',
    submittedAt: new Date().toISOString(),
  };

  // Replace existing feedback if member previously submitted, else append
  const existingIndex = feedbackList.findIndex((f) => f.memberId === memberId);
  if (existingIndex >= 0) {
    feedbackList[existingIndex] = feedbackRecord;
  } else {
    feedbackList.push(feedbackRecord);
  }

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  await setDoc(
    docRef,
    {
      feedback: feedbackList,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    serviceId,
    memberId,
    feedback: feedbackRecord,
    totalFeedback: feedbackList.length,
  };
}

/**
 * Get live attendance stats and checked-in servants for this servant meeting
 * Integrates with attendanceService
 * @param {string} communityId
 * @param {string} serviceId
 * @returns {Promise<Object>}
 */
export async function getLiveAttendanceStats(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  if (!serviceId) throw new Error('serviceId is required');

  try {
    const records = await getServiceAttendance(communityId, serviceId);
    let present = 0;
    let late = 0;
    let excused = 0;

    for (const rec of records) {
      if (rec.status === ATTENDANCE_STATUS.PRESENT) present++;
      else if (rec.status === ATTENDANCE_STATUS.LATE) late++;
      else if (rec.status === ATTENDANCE_STATUS.EXCUSED) excused++;
    }

    return {
      serviceId,
      total: records.length,
      present,
      late,
      excused,
      attendees: records,
      qrActive: true,
      qrSessionId: `qrs_${serviceId}`,
    };
  } catch (err) {
    console.error(`[ServantMeetingModeService] Error getting live attendance:`, err);
    return {
      serviceId,
      total: 0,
      present: 0,
      late: 0,
      excused: 0,
      attendees: [],
      qrActive: false,
      qrSessionId: null,
    };
  }
}

/**
 * Toggle or update an agenda item's completion status during the meeting
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} itemId
 * @param {boolean} completed
 * @param {Object} [actor]
 * @returns {Promise<Array>} Updated agenda array
 */
export async function updateAgendaItemProgress(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  itemId,
  completed = true,
  actor = null
) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!itemId) throw new Error('itemId is required');

  if (actor && actor.role && !isLeaderRole(actor.role)) {
    throw new Error('Unauthorized: Only leaders can update agenda progress');
  }

  const session = await getMeetingSession(communityId, serviceId);
  const agenda = Array.isArray(session.agenda) ? [...session.agenda] : [];
  const itemIndex = agenda.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    throw new Error(`Agenda item with id "${itemId}" not found`);
  }

  agenda[itemIndex] = {
    ...agenda[itemIndex],
    completed: Boolean(completed),
    completedAt: completed ? new Date().toISOString() : null,
    completedBy: completed ? actor?.displayName || 'Leader' : null,
  };

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  await setDoc(docRef, { agenda, updatedAt: serverTimestamp() }, { merge: true });

  return agenda;
}

/**
 * Confirm a servant for an open serving role on the spot during the meeting
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} roleId
 * @param {Object} member - { id, displayName, name, role, avatar }
 * @param {Object} [actor]
 * @returns {Promise<Array>} Updated openServingRoles array
 */
export async function confirmServingRole(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  roleId,
  member,
  actor = null
) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!roleId) throw new Error('roleId is required');
  if (!member || !member.id) throw new Error('member with valid id is required');

  const session = await getMeetingSession(communityId, serviceId);
  const roles = Array.isArray(session.openServingRoles) ? [...session.openServingRoles] : [];
  const roleIndex = roles.findIndex((r) => r.id === roleId);

  if (roleIndex === -1) {
    throw new Error(`Serving role with id "${roleId}" not found`);
  }

  const targetRole = { ...roles[roleIndex] };
  const assigned = Array.isArray(targetRole.assignedMembers) ? [...targetRole.assignedMembers] : [];

  const alreadyAssigned = assigned.some((m) => m.id === member.id);
  if (!alreadyAssigned) {
    assigned.push({
      id: member.id,
      name: member.displayName || member.name || 'Servant',
      confirmedAt: new Date().toISOString(),
      confirmedBy: actor?.displayName || 'Self',
    });
    targetRole.assignedMembers = assigned;
    targetRole.spotsFilled = assigned.length;
    roles[roleIndex] = targetRole;

    const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
    await setDoc(docRef, { openServingRoles: roles, updatedAt: serverTimestamp() }, { merge: true });
  }

  return roles;
}

/**
 * Toggle an action item's completed status in the follow-up tracker
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} actionItemId
 * @param {boolean} completed
 * @param {Object} [actor]
 * @returns {Promise<Array>} Updated actionItems array
 */
export async function toggleActionItemStatus(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  actionItemId,
  completed = true,
  actor = null
) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!actionItemId) throw new Error('actionItemId is required');

  const session = await getMeetingSession(communityId, serviceId);
  const items = Array.isArray(session.actionItems) ? [...session.actionItems] : [];
  const itemIndex = items.findIndex((i) => i.id === actionItemId);

  if (itemIndex === -1) {
    throw new Error(`Action item with id "${actionItemId}" not found`);
  }

  items[itemIndex] = {
    ...items[itemIndex],
    completed: Boolean(completed),
    completedAt: completed ? new Date().toISOString() : null,
    completedBy: completed ? actor?.displayName || 'Servant' : null,
  };

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  await setDoc(docRef, { actionItems: items, updatedAt: serverTimestamp() }, { merge: true });

  return items;
}

/**
 * Broadcast an urgent or important announcement to the meeting session
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Object} announcement - { title, message, priority }
 * @param {Object} [actor]
 * @returns {Promise<Array>} Updated urgentAnnouncements array
 */
export async function broadcastMeetingAnnouncement(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  announcement = {},
  actor = null
) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!announcement.title && !announcement.message) {
    throw new Error('announcement must include title or message');
  }

  if (actor && actor.role && !isLeaderRole(actor.role)) {
    throw new Error('Unauthorized: Only leaders can broadcast announcements');
  }

  const session = await getMeetingSession(communityId, serviceId);
  const announcements = Array.isArray(session.urgentAnnouncements) ? [...session.urgentAnnouncements] : [];

  const newAnn = {
    id: announcement.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: announcement.title || 'Important Notice',
    message: announcement.message || '',
    priority: announcement.priority || 'high',
    broadcastBy: actor?.displayName || 'Leadership',
    timestamp: new Date().toISOString(),
  };

  announcements.unshift(newAnn);

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  await setDoc(docRef, { urgentAnnouncements: announcements, updatedAt: serverTimestamp() }, { merge: true });

  return announcements;
}

/**
 * Perform a quick self check-in from within Servant Meeting Mode
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Object} member - { id, displayName, role, team, avatar }
 * @returns {Promise<Object>}
 */
export async function quickSelfCheckIn(communityId = DEFAULT_COMMUNITY_ID, serviceId, member) {
  if (!serviceId) throw new Error('serviceId is required');
  if (!member || !member.id) throw new Error('member with id is required');

  return recordAttendance({
    communityId,
    serviceId,
    serviceInfo: {
      title: 'Weekly Servant Meeting',
      date: new Date().toISOString().slice(0, 10),
    },
    member,
    status: ATTENDANCE_STATUS.PRESENT,
    checkInMethod: CHECKIN_METHOD.SELF_KIOSK,
    markedBy: 'servant_meeting_quick_checkin',
    notes: 'Checked in via Servant Meeting Mode',
  });
}

/**
 * Real-time subscription to a servant meeting session
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToMeetingSession(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  callback
) {
  if (!serviceId) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, servantMeetingSessionDocPath(communityId, serviceId));
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        // Fallback default
        callback(createDefaultMeetingSession(communityId, serviceId));
      }
    },
    (err) => {
      console.error(`[ServantMeetingModeService] Subscription error:`, err);
      callback(createDefaultMeetingSession(communityId, serviceId));
    }
  );
}
