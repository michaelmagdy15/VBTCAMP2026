import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Heart,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  Check,
  X,
  RotateCw,
  Shield,
  Radio,
  Layers,
  Flame,
  ArrowRight,
  Info,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  OPPORTUNITY_ROLES,
  OPPORTUNITY_STATUS,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  subscribeToOpportunities,
} from '../services/servingOpportunityService';
import {
  APPLICATION_STATUS,
  applyForOpportunity,
  confirmAssignment,
  requestReplacement,
} from '../services/servingAssignmentService';
import {
  subscribeToUpcomingServices,
  formatTimeRange,
  getNextDayOfWeekDate,
} from '../services/serviceMeetingService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';

/**
 * 6 Primary Role Categories required by VBT Serving Marketplace:
 * Referees, Logistics, Worship, Media, Kids Care, Setup
 */
const SERVING_ROLES = [
  {
    id: 'referees',
    serviceRoleKey: OPPORTUNITY_ROLES.REFEREE,
    matchKeys: ['referee', 'referees'],
    label: 'Referees',
    fullTitle: 'Referees & Match Officials',
    icon: Shield,
    color: '#10b981', // emerald
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderCard: 'hover:border-emerald-500/50',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/20',
    description: 'Officiating matches, rule enforcement, tournament scoring',
  },
  {
    id: 'logistics',
    serviceRoleKey: OPPORTUNITY_ROLES.LOGISTICS,
    matchKeys: ['logistics', 'first_aid', 'hospitality'],
    label: 'Logistics',
    fullTitle: 'Logistics & Hospitality',
    icon: Clock,
    color: '#f59e0b', // amber
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderCard: 'hover:border-amber-500/50',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/20',
    description: 'Hydration stations, snacks, team check-in, equipment transit',
  },
  {
    id: 'worship',
    serviceRoleKey: OPPORTUNITY_ROLES.PRAISE,
    matchKeys: ['worship', 'praise', 'music'],
    label: 'Worship',
    fullTitle: 'Worship & Music Team',
    icon: Heart,
    color: '#a855f7', // purple
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    borderCard: 'hover:border-purple-500/50',
    accentText: 'text-purple-400',
    accentBg: 'bg-purple-500/20',
    description: 'Vocals, acoustic/electric instruments, praise leading, sound checks',
  },
  {
    id: 'media',
    serviceRoleKey: OPPORTUNITY_ROLES.MEDIA,
    matchKeys: ['media', 'tech', 'video', 'livestream'],
    label: 'Media',
    fullTitle: 'Media & Tech Production',
    icon: Radio,
    color: '#06b6d4', // cyan
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    borderCard: 'hover:border-cyan-500/50',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500/20',
    description: 'Live streaming, camera rigs, photography, highlight reels, slides',
  },
  {
    id: 'kids_care',
    serviceRoleKey: OPPORTUNITY_ROLES.GENERAL,
    matchKeys: ['kids_care', 'kids', 'junior', 'general'],
    label: 'Kids Care',
    fullTitle: 'Kids Care & Junior Sports',
    icon: Users,
    color: '#ec4899', // pink
    badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    borderCard: 'hover:border-pink-500/50',
    accentText: 'text-pink-400',
    accentBg: 'bg-pink-500/20',
    description: 'Junior sports, Bible crafts, safe play & supervision for kids 5-11',
  },
  {
    id: 'setup',
    serviceRoleKey: OPPORTUNITY_ROLES.SETUP,
    matchKeys: ['setup', 'breakdown', 'facilities'],
    label: 'Setup',
    fullTitle: 'Setup & Breakdown Crew',
    icon: Layers,
    color: '#6366f1', // indigo
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    borderCard: 'hover:border-indigo-500/50',
    accentText: 'text-indigo-400',
    accentBg: 'bg-indigo-500/20',
    description: 'Court lining, net assembly, stage equipment load-in and teardown',
  },
];

/**
 * Match any incoming opportunity role string to our standard category
 */
function getRoleMeta(roleKey) {
  if (!roleKey) return SERVING_ROLES[0];
  const normalized = String(roleKey).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const found = SERVING_ROLES.find(
    (r) =>
      r.id === normalized ||
      r.serviceRoleKey === normalized ||
      r.matchKeys.includes(normalized) ||
      r.label.toLowerCase() === normalized
  );
  return found || SERVING_ROLES[0];
}

/**
 * High-quality initial seed opportunities if Firestore collection is fresh or empty
 */
const DEFAULT_OPPORTUNITIES = [
  {
    id: 'opp_seed_referee_1',
    title: 'Court 1 3v3 Basketball Tournament Referee',
    serviceTitle: 'Friday Youth Sports Night & Camp',
    serviceDate: '2026-10-09',
    startTime: '18:30',
    endTime: '21:00',
    location: 'Main Gymnasium Court 1',
    role: OPPORTUNITY_ROLES.REFEREE,
    roleCategory: 'referees',
    spotsNeeded: 4,
    spotsFilled: 2,
    status: OPPORTUNITY_STATUS.OPEN,
    isUrgent: false,
    description:
      'Officiate high-intensity 3v3 basketball tournament games, manage shot clocks, and uphold Christian sportsmanship on the court.',
    requirements: [
      'Basic knowledge of FIBA 3v3 rules',
      'Athletic attire & whistle',
      'Arrive 15 min early for briefing',
    ],
    volunteers: [
      {
        id: 'vol_seed_1',
        userId: 'usr_david',
        memberName: 'David Mikhail',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Can referee until 9 PM',
        appliedAt: '2026-10-05T10:00:00Z',
      },
      {
        id: 'vol_seed_2',
        userId: 'usr_mina',
        memberName: 'Mina Ashraf',
        memberRole: 'leader',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Court 1 supervisor',
        appliedAt: '2026-10-05T10:30:00Z',
      },
    ],
  },
  {
    id: 'opp_seed_logistics_1',
    title: 'Courtside Hydration & Snack Station Coordinator',
    serviceTitle: 'Friday Youth Sports Night & Camp',
    serviceDate: '2026-10-09',
    startTime: '18:00',
    endTime: '21:30',
    location: 'Court Side Station & Refreshment Lounge',
    role: OPPORTUNITY_ROLES.LOGISTICS,
    roleCategory: 'logistics',
    spotsNeeded: 3,
    spotsFilled: 1,
    status: OPPORTUNITY_STATUS.OPEN,
    isUrgent: false,
    description:
      'Keep athletes and youth hydrated with fresh electrolyte cups and protein bars. Monitor court-side coolers and assist with cold packs.',
    requirements: [
      'Restock water dispensers regularly',
      'Assist with ice bags if minor sprains occur',
      'Warm, welcoming attitude',
    ],
    volunteers: [
      {
        id: 'vol_seed_3',
        userId: 'usr_sarah',
        memberName: 'Sarah George',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Bringing 2 large ice coolers',
        appliedAt: '2026-10-06T12:00:00Z',
      },
    ],
  },
  {
    id: 'opp_seed_worship_1',
    title: 'Praise & Worship Acoustic Guitarist & Vocalist',
    serviceTitle: 'Sunday Evening Camp Fellowship',
    serviceDate: '2026-10-11',
    startTime: '17:30',
    endTime: '20:30',
    location: 'Main Church Sanctuary Stage',
    role: OPPORTUNITY_ROLES.PRAISE,
    roleCategory: 'worship',
    spotsNeeded: 2,
    spotsFilled: 1,
    status: OPPORTUNITY_STATUS.OPEN,
    isUrgent: true,
    description:
      'Lead youth and campers into heartfelt worship and praise before the evening devotional message. Collaborate with pianist.',
    requirements: [
      'Attend 5:30 PM sound check',
      'Familiar with contemporary praise songs',
      'Bring own acoustic guitar',
    ],
    volunteers: [
      {
        id: 'vol_seed_4',
        userId: 'usr_peter',
        memberName: 'Peter Soliman',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Lead guitar & backing vocals',
        appliedAt: '2026-10-05T18:00:00Z',
      },
    ],
  },
  {
    id: 'opp_seed_media_1',
    title: 'Live Stream Camera Operator & Action Photography',
    serviceTitle: 'Friday Youth Sports Night & Camp',
    serviceDate: '2026-10-09',
    startTime: '18:15',
    endTime: '21:30',
    location: 'Media Production Table & Baseline',
    role: OPPORTUNITY_ROLES.MEDIA,
    roleCategory: 'media',
    spotsNeeded: 3,
    spotsFilled: 2,
    status: OPPORTUNITY_STATUS.OPEN,
    isUrgent: false,
    description:
      'Operate broadcast camera rig for live stream to families and capture high-resolution athletic action photos for the camp gallery.',
    requirements: [
      'Comfortable operating mirrorless camera',
      'Capture tournament highlight plays',
      'Transfer SD card files after games',
    ],
    volunteers: [
      {
        id: 'vol_seed_5',
        userId: 'usr_mark',
        memberName: 'Mark Shenouda',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Operating baseline camera rig',
        appliedAt: '2026-10-06T14:00:00Z',
      },
      {
        id: 'vol_seed_6',
        userId: 'usr_kirollos',
        memberName: 'Kirollos Adel',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Action photographer',
        appliedAt: '2026-10-06T14:30:00Z',
      },
    ],
  },
  {
    id: 'opp_seed_kids_1',
    title: 'Junior Camp Games & Bible Crafts Assistant',
    serviceTitle: 'Friday Youth Sports Night & Camp',
    serviceDate: '2026-10-09',
    startTime: '18:30',
    endTime: '21:00',
    location: 'Lower Level Junior Sports Room',
    role: OPPORTUNITY_ROLES.GENERAL,
    roleCategory: 'kids_care',
    spotsNeeded: 4,
    spotsFilled: 1,
    status: OPPORTUNITY_STATUS.OPEN,
    isUrgent: true,
    description:
      'Facilitate safe mini-sports games, balloon relays, and Bible crafts for children aged 5-11 while older campers compete.',
    requirements: [
      'Heart for children ministry & safety',
      'Engage kids in active games',
      'Assist parents with secure pickup',
    ],
    volunteers: [
      {
        id: 'vol_seed_7',
        userId: 'usr_mona',
        memberName: 'Mona Nabil',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Prepared 20 craft bags',
        appliedAt: '2026-10-06T15:00:00Z',
      },
    ],
  },
  {
    id: 'opp_seed_setup_1',
    title: 'Gym Court Assembly & Sound Equipment Load-In',
    serviceTitle: 'Friday Youth Sports Night & Camp',
    serviceDate: '2026-10-09',
    startTime: '17:00',
    endTime: '18:30',
    location: 'Main Gymnasium & Storage Wing',
    role: OPPORTUNITY_ROLES.SETUP,
    roleCategory: 'setup',
    spotsNeeded: 5,
    spotsFilled: 2,
    status: OPPORTUNITY_STATUS.OPEN,
    isUrgent: false,
    description:
      'Transform gym into tournament venue. Tape court boundary lines, erect volleyball/badminton nets, and set up scoring tables.',
    requirements: [
      'Able to carry sports equipment',
      'Arrive promptly at 5:00 PM',
      'High team spirit and diligence',
    ],
    volunteers: [
      {
        id: 'vol_seed_8',
        userId: 'usr_john',
        memberName: 'John Fayek',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Bringing equipment cart',
        appliedAt: '2026-10-05T09:00:00Z',
      },
      {
        id: 'vol_seed_9',
        userId: 'usr_samuel',
        memberName: 'Samuel George',
        memberRole: 'servant',
        status: APPLICATION_STATUS.CONFIRMED,
        notes: 'Setting up audio snakes',
        appliedAt: '2026-10-05T09:15:00Z',
      },
    ],
  },
];

/**
 * Visual Progress Bar for Available Spots
 */
function SpotsIndicator({ spotsFilled = 0, spotsNeeded = 1, isUrgent = false }) {
  const needed = Math.max(1, spotsNeeded);
  const filled = Math.max(0, Math.min(spotsFilled, needed));
  const remaining = Math.max(0, needed - filled);
  const percentage = Math.round((filled / needed) * 100);
  const isFull = remaining === 0;

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 flex items-center gap-1.5 font-medium">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            <strong className="text-white font-semibold">{filled} of {needed}</strong> spots filled
          </span>
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border transition-all ${
            isFull
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : isUrgent
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              : remaining === 1
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
          }`}
        >
          {isFull ? 'Fully Staffed' : `${remaining} spot${remaining === 1 ? '' : 's'} left`}
        </span>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull
              ? 'bg-emerald-500'
              : isUrgent
              ? 'bg-gradient-to-r from-amber-500 to-rose-500'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Main Serving Marketplace Tab Component
 */
export default function ServeMarketplaceTab({
  currentUser = null,
  currentUserProfile = null,
  isAdmin = false,
  isLeader = false,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  const [opportunities, setOpportunities] = useState(DEFAULT_OPPORTUNITIES);
  const [upcomingServices, setUpcomingServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedRole, setSelectedRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyOpenSpots, setOnlyOpenSpots] = useState(false);
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'list'

  // Modals state
  const [applyModalOpp, setApplyModalOpp] = useState(null);
  const [replacementModalItem, setReplacementModalItem] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState(null);

  // Forms state
  const [applicantNotes, setApplicantNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [replacementReason, setReplacementReason] = useState('');

  // New Opportunity Form state (Admin/Leader)
  const [newOpp, setNewOpp] = useState({
    title: '',
    roleCategory: 'referees',
    serviceTitle: 'Friday Youth Sports Night & Camp',
    serviceDate: getNextDayOfWeekDate(5),
    startTime: '18:00',
    endTime: '21:30',
    location: 'Main Church Gymnasium',
    spotsNeeded: 3,
    isUrgent: false,
    description: '',
    requirements: '',
  });

  // Derived user details
  const currentUserId = useMemo(() => {
    return (
      currentUser?.uid ||
      currentUserProfile?.id ||
      currentUser?.id ||
      'guest_user'
    );
  }, [currentUser, currentUserProfile]);

  const currentUserName = useMemo(() => {
    if (currentUserProfile?.displayName) return currentUserProfile.displayName;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUserProfile?.firstName) {
      return `${currentUserProfile.firstName} ${currentUserProfile.lastName || ''}`.trim();
    }
    return 'Fellow Servant';
  }, [currentUser, currentUserProfile]);

  const currentUserRole = useMemo(() => {
    return currentUserProfile?.role || (isAdmin ? 'admin' : isLeader ? 'leader' : 'servant');
  }, [currentUserProfile, isAdmin, isLeader]);

  const currentUserPhone = useMemo(() => {
    return currentUserProfile?.phone || '';
  }, [currentUserProfile]);

  // Subscribe to real-time opportunities
  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToOpportunities(communityId, (list) => {
      if (!isMounted) return;
      if (list && list.length > 0) {
        setOpportunities(list);
      } else {
        setOpportunities((prev) => (prev.length > 0 ? prev : DEFAULT_OPPORTUNITIES));
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (typeof unsub === 'function') unsub();
    };
  }, [communityId]);

  // Subscribe to upcoming services for the "Add Opportunity" linked service dropdown
  useEffect(() => {
    let isMounted = true;
    const unsub = subscribeToUpcomingServices(communityId, (list) => {
      if (!isMounted) return;
      setUpcomingServices(list || []);
    });

    return () => {
      isMounted = false;
      if (typeof unsub === 'function') unsub();
    };
  }, [communityId]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      const meta = getRoleMeta(opp.roleCategory || opp.role);

      // Role filter
      if (selectedRole !== 'all' && meta.id !== selectedRole) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const text = `${opp.title || ''} ${opp.serviceTitle || ''} ${opp.description || ''} ${
          opp.location || ''
        } ${meta.label} ${(opp.requirements || []).join(' ')}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      // Open spots only
      if (onlyOpenSpots) {
        const remaining = (opp.spotsNeeded || 1) - (opp.spotsFilled || 0);
        if (remaining <= 0) return false;
      }

      // Urgent only
      if (onlyUrgent && !opp.isUrgent) {
        return false;
      }

      return true;
    });
  }, [opportunities, selectedRole, searchQuery, onlyOpenSpots, onlyUrgent]);

  // Grouped opportunities by ministry role
  const groupedOpportunities = useMemo(() => {
    const map = {};
    SERVING_ROLES.forEach((role) => {
      map[role.id] = [];
    });

    filteredOpportunities.forEach((opp) => {
      const meta = getRoleMeta(opp.roleCategory || opp.role);
      if (!map[meta.id]) map[meta.id] = [];
      map[meta.id].push(opp);
    });

    return map;
  }, [filteredOpportunities]);

  // My Serving Commitments
  const myCommitments = useMemo(() => {
    const list = [];
    opportunities.forEach((opp) => {
      const vols = opp.volunteers || [];
      const match = vols.find(
        (v) =>
          v.userId === currentUserId ||
          v.id === currentUserId ||
          v.memberId === currentUserId ||
          (currentUserName && v.memberName === currentUserName) ||
          (currentUserPhone && v.phone && v.phone === currentUserPhone)
      );

      if (match) {
        list.push({
          opportunity: opp,
          volunteer: match,
        });
      }
    });
    return list;
  }, [opportunities, currentUserId, currentUserName, currentUserPhone]);

  // Total statistics for summary header
  const stats = useMemo(() => {
    let totalSpots = 0;
    let filledSpots = 0;
    let urgentCount = 0;

    opportunities.forEach((opp) => {
      totalSpots += opp.spotsNeeded || 1;
      filledSpots += opp.spotsFilled || (opp.volunteers ? opp.volunteers.length : 0);
      if (opp.isUrgent) urgentCount += 1;
    });

    return {
      totalOpportunities: opportunities.length,
      openSpots: Math.max(0, totalSpots - filledSpots),
      myCommitmentsCount: myCommitments.length,
      urgentCount,
    };
  }, [opportunities, myCommitments.length]);

  // Toast / Notification banner helper
  const showBanner = useCallback((text, type = 'success') => {
    setNotificationBanner({ text, type });
    setTimeout(() => {
      setNotificationBanner(null);
    }, 4500);
  }, []);

  // Confetti helper
  const fireConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignored if canvas unsupported
    }
  }, []);

  // Apply to serve in an opportunity
  const handleCommitToServe = async () => {
    if (!applyModalOpp) return;
    setSubmittingAction(true);

    try {
      const newVolunteer = {
        id: currentUserId,
        userId: currentUserId,
        memberId: currentUserId,
        memberName: currentUserName,
        memberRole: currentUserRole,
        phone: currentUserPhone,
        notes: applicantNotes.trim(),
        status: APPLICATION_STATUS.CONFIRMED,
        appliedAt: new Date().toISOString(),
      };

      const existingVolunteers = applyModalOpp.volunteers || [];
      const alreadyIn = existingVolunteers.some(
        (v) => v.userId === currentUserId || v.id === currentUserId || v.memberName === currentUserName
      );

      let updatedVolunteers;
      if (alreadyIn) {
        updatedVolunteers = existingVolunteers.map((v) =>
          v.userId === currentUserId || v.id === currentUserId || v.memberName === currentUserName
            ? { ...v, status: APPLICATION_STATUS.CONFIRMED, notes: applicantNotes.trim() }
            : v
        );
      } else {
        updatedVolunteers = [...existingVolunteers, newVolunteer];
      }

      const newFilled = Math.min(applyModalOpp.spotsNeeded || 1, updatedVolunteers.length);
      const newStatus =
        newFilled >= (applyModalOpp.spotsNeeded || 1)
          ? OPPORTUNITY_STATUS.FILLED
          : OPPORTUNITY_STATUS.OPEN;

      // Update in Firestore
      try {
        await applyForOpportunity({
          communityId,
          opportunityId: applyModalOpp.id,
          member: {
            id: currentUserId,
            memberName: currentUserName,
            memberRole: currentUserRole,
            phone: currentUserPhone,
          },
          notes: applicantNotes.trim(),
          serviceId: applyModalOpp.serviceId || null,
        });

        await updateOpportunity(communityId, applyModalOpp.id, {
          volunteers: updatedVolunteers,
          spotsFilled: newFilled,
          status: newStatus,
        });
      } catch (err) {
        console.warn('Firestore update fallback to local state:', err);
      }

      // Update local state reactively
      setOpportunities((prev) =>
        prev.map((opp) =>
          opp.id === applyModalOpp.id
            ? {
                ...opp,
                volunteers: updatedVolunteers,
                spotsFilled: newFilled,
                status: newStatus,
              }
            : opp
        )
      );

      fireConfetti();
      showBanner(`Blessed to serve! You are confirmed for: ${applyModalOpp.title}`);
      setApplyModalOpp(null);
      setApplicantNotes('');
    } catch (error) {
      console.error('Failed to commit to serve:', error);
      showBanner('Failed to save commitment. Please try again.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Confirm attendance on active commitment
  const handleConfirmCommitment = async (commitment) => {
    const opp = commitment.opportunity;
    const vol = commitment.volunteer;

    try {
      try {
        await confirmAssignment(communityId, opp.id, vol.id || currentUserId);
        const updatedVols = (opp.volunteers || []).map((v) =>
          v.id === vol.id || v.userId === currentUserId
            ? { ...v, status: APPLICATION_STATUS.CONFIRMED }
            : v
        );
        await updateOpportunity(communityId, opp.id, { volunteers: updatedVols });
      } catch (e) {
        console.warn('Fallback local state confirmation:', e);
      }

      setOpportunities((prev) =>
        prev.map((item) => {
          if (item.id !== opp.id) return item;
          const updated = (item.volunteers || []).map((v) =>
            v.id === vol.id || v.userId === currentUserId
              ? { ...v, status: APPLICATION_STATUS.CONFIRMED }
              : v
          );
          return { ...item, volunteers: updated };
        })
      );

      fireConfetti();
      showBanner('Serving commitment re-confirmed! See you there on time.');
    } catch (err) {
      console.error('Failed to confirm assignment:', err);
      showBanner('Could not update status. Please try again.', 'error');
    }
  };

  // Submit request for replacement
  const handleSubmitReplacement = async () => {
    if (!replacementModalItem) return;
    const { opportunity: opp, volunteer: vol } = replacementModalItem;
    setSubmittingAction(true);

    try {
      const reason = replacementReason.trim() || 'Unforeseen conflict';
      try {
        await requestReplacement(communityId, opp.id, vol.id || currentUserId, reason);
        const updatedVols = (opp.volunteers || []).map((v) =>
          v.id === vol.id || v.userId === currentUserId
            ? {
                ...v,
                status: APPLICATION_STATUS.REPLACEMENT_REQUESTED,
                replacementReason: reason,
              }
            : v
        );
        await updateOpportunity(communityId, opp.id, {
          volunteers: updatedVols,
          isUrgent: true,
        });
      } catch (e) {
        console.warn('Fallback local replacement request:', e);
      }

      setOpportunities((prev) =>
        prev.map((item) => {
          if (item.id !== opp.id) return item;
          const updated = (item.volunteers || []).map((v) =>
            v.id === vol.id || v.userId === currentUserId
              ? {
                  ...v,
                  status: APPLICATION_STATUS.REPLACEMENT_REQUESTED,
                  replacementReason: reason,
                }
              : v
          );
          return { ...item, volunteers: updated, isUrgent: true };
        })
      );

      showBanner(
        'Replacement requested. Other servants can now step in to cover your spot.',
        'warning'
      );
      setReplacementModalItem(null);
      setReplacementReason('');
    } catch (err) {
      console.error('Failed to request replacement:', err);
      showBanner('Failed to submit replacement request.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Withdraw / Cancel commitment
  const handleWithdrawCommitment = async (commitment) => {
    const opp = commitment.opportunity;
    const vol = commitment.volunteer;

    const confirmWithdraw = window.confirm(
      `Are you sure you want to withdraw from serving as ${opp.title}?`
    );
    if (!confirmWithdraw) return;

    try {
      const remainingVols = (opp.volunteers || []).filter(
        (v) => v.id !== vol.id && v.userId !== currentUserId && v.memberName !== currentUserName
      );
      const newFilled = Math.max(0, remainingVols.length);

      try {
        await updateOpportunity(communityId, opp.id, {
          volunteers: remainingVols,
          spotsFilled: newFilled,
          status: OPPORTUNITY_STATUS.OPEN,
        });
      } catch (e) {
        console.warn('Fallback local withdrawal:', e);
      }

      setOpportunities((prev) =>
        prev.map((item) =>
          item.id === opp.id
            ? {
                ...item,
                volunteers: remainingVols,
                spotsFilled: newFilled,
                status: OPPORTUNITY_STATUS.OPEN,
              }
            : item
        )
      );

      showBanner('Commitment cancelled. Your spot has been reopened to the community.');
    } catch (err) {
      console.error('Failed to cancel commitment:', err);
      showBanner('Could not cancel commitment.', 'error');
    }
  };

  // Create new opportunity (Admin/Leader)
  const handleCreateOpportunity = async (e) => {
    e.preventDefault();
    if (!newOpp.title.trim()) {
      showBanner('Please provide an opportunity title.', 'error');
      return;
    }

    setSubmittingAction(true);
    try {
      const roleMeta = getRoleMeta(newOpp.roleCategory);
      const reqList = newOpp.requirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const oppData = {
        id: `opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        communityId,
        title: newOpp.title.trim(),
        serviceTitle: newOpp.serviceTitle.trim() || 'Weekly Community Gathering',
        serviceDate: newOpp.serviceDate,
        startTime: newOpp.startTime,
        endTime: newOpp.endTime,
        location: newOpp.location.trim() || 'Church Campus',
        role: roleMeta.serviceRoleKey,
        roleCategory: roleMeta.id,
        spotsNeeded: Math.max(1, parseInt(newOpp.spotsNeeded, 10) || 1),
        spotsFilled: 0,
        status: OPPORTUNITY_STATUS.OPEN,
        isUrgent: Boolean(newOpp.isUrgent),
        description: newOpp.description.trim(),
        requirements: reqList,
        volunteers: [],
      };

      try {
        await createOpportunity(communityId, oppData);
      } catch (err) {
        console.warn('Fallback local creation:', err);
      }

      setOpportunities((prev) => [oppData, ...prev]);
      fireConfetti();
      showBanner(`Posted new serving spot: "${oppData.title}"!`);

      // Reset form & close
      setAddModalOpen(false);
      setNewOpp({
        title: '',
        roleCategory: 'referees',
        serviceTitle: 'Friday Youth Sports Night & Camp',
        serviceDate: getNextDayOfWeekDate(5),
        startTime: '18:00',
        endTime: '21:30',
        location: 'Main Church Gymnasium',
        spotsNeeded: 3,
        isUrgent: false,
        description: '',
        requirements: '',
      });
    } catch (err) {
      console.error('Failed to post serving opportunity:', err);
      showBanner('Failed to post opportunity.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete opportunity (Admin/Leader)
  const handleDeleteOpportunity = async (oppId, oppTitle) => {
    const confirmed = window.confirm(`Delete serving opportunity "${oppTitle}"?`);
    if (!confirmed) return;

    try {
      try {
        await deleteOpportunity(communityId, oppId);
      } catch (e) {
        console.warn('Fallback local deletion:', e);
      }

      setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
      showBanner(`Deleted opportunity "${oppTitle}".`);
    } catch (err) {
      console.error('Failed to delete opportunity:', err);
      showBanner('Failed to delete opportunity.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20 selection:bg-cyan-500 selection:text-black">
      {/* Toast Notification Banner */}
      {notificationBanner && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-medium flex items-center gap-3 backdrop-blur-md transition-all animate-in fade-in duration-300 ${
            notificationBanner.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
              : notificationBanner.type === 'warning'
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/50'
              : 'bg-slate-900/95 text-cyan-200 border-cyan-500/50 shadow-cyan-500/20'
          }`}
        >
          {notificationBanner.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : notificationBanner.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
          )}
          <span>{notificationBanner.text}</span>
          <button
            onClick={() => setNotificationBanner(null)}
            className="text-slate-400 hover:text-white ml-2 p-1"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/50 border border-slate-800 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  VBT Serving Marketplace
                </span>
                {stats.urgentCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <Flame className="w-3 h-3 text-rose-400" />
                    {stats.urgentCount} Urgent Need{stats.urgentCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <Heart className="w-8 h-8 text-rose-500 fill-rose-500/30 shrink-0" />
                Serving Opportunities
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Discover where God can use your gifts. Commit to sports camp officiating, setup,
                logistics, music, tech media, and junior activities.
              </p>
            </div>

            {/* Admin / Leader Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {(isAdmin || isLeader) && (
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Post Serving Spot
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-900/60 rounded-2xl p-3 sm:p-4 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Open Spots</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mt-1">
                {stats.openSpots}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-3 sm:p-4 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Total Opportunities</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {stats.totalOpportunities}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-3 sm:p-4 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">My Active Roles</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
                {stats.myCommitmentsCount}
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-2xl p-3 sm:p-4 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block">Ministry Categories</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 mt-1">
                {SERVING_ROLES.length}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: My Serving Commitments */}
        <section aria-labelledby="my-commitments-heading">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" />
              <h2 id="my-commitments-heading" className="text-xl font-bold text-white tracking-tight">
                My Serving Commitments
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {myCommitments.length}
              </span>
            </div>
            {myCommitments.length > 0 && (
              <span className="text-xs text-slate-400">
                Logged in as <strong className="text-cyan-300 font-medium">{currentUserName}</strong>
              </span>
            )}
          </div>

          {myCommitments.length === 0 ? (
            <div className="bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No active serving commitments yet</h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-1 mb-4">
                Explore the open ministry spots below to sign up for court officiating, logistics,
                music, tech media, or junior camp!
              </p>
              <button
                onClick={() => {
                  setSelectedRole('all');
                  setOnlyOpenSpots(true);
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 transition"
              >
                Browse Open Spots <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCommitments.map(({ opportunity: opp, volunteer: vol }) => {
                const meta = getRoleMeta(opp.roleCategory || opp.role);
                const IconComponent = meta.icon;
                const isReplacement = vol.status === APPLICATION_STATUS.REPLACEMENT_REQUESTED;

                return (
                  <div
                    key={`${opp.id}_${vol.id || vol.userId}`}
                    className={`rounded-2xl p-5 border transition-all shadow-xl bg-slate-800/80 backdrop-blur ${
                      isReplacement
                        ? 'border-amber-500/50 shadow-amber-500/10'
                        : 'border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                        {isReplacement ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <AlertTriangle className="w-3 h-3" />
                            Replacement Requested
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmed
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleWithdrawCommitment({ opportunity: opp, volunteer: vol })}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-700/50 transition"
                        title="Withdraw from this spot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="text-base font-bold text-white mb-1 line-clamp-1">{opp.title}</h4>
                    <p className="text-xs text-cyan-300 font-medium mb-3">{opp.serviceTitle}</p>

                    <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{opp.serviceDate || 'Upcoming Service'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{formatTimeRange(opp.startTime, opp.endTime) || 'Time TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{opp.location || 'Church Campus'}</span>
                      </div>
                      {vol.notes && (
                        <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-400 italic">
                          "{vol.notes}"
                        </div>
                      )}
                      {vol.replacementReason && (
                        <div className="pt-1.5 border-t border-amber-500/20 text-[11px] text-amber-300">
                          <strong>Reason:</strong> {vol.replacementReason}
                        </div>
                      )}
                    </div>

                    {/* Commitment Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                      {!isReplacement ? (
                        <>
                          <button
                            onClick={() => handleConfirmCommitment({ opportunity: opp, volunteer: vol })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            I'll Be There
                          </button>
                          <button
                            onClick={() => {
                              setReplacementModalItem({ opportunity: opp, volunteer: vol });
                              setReplacementReason('');
                            }}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition active:scale-95"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Need Coverage
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleConfirmCommitment({ opportunity: opp, volunteer: vol })}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                          Cancel Replacement (I can make it)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION: Search, Role Filter Tabs, and Controls */}
        <div className="space-y-4 pt-4">
          {/* Search bar & quick toggles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by role, duty, service, requirements, or location..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setOnlyOpenSpots((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  onlyOpenSpots
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${onlyOpenSpots ? 'text-cyan-400' : 'text-slate-400'}`} />
                Open Spots Only
              </button>

              <button
                onClick={() => setOnlyUrgent((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  onlyUrgent
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${onlyUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
                Urgent Only
              </button>

              <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === 'grouped' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grouped by Ministry Role"
                >
                  Grouped
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    viewMode === 'list' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="All Opportunities Grid"
                >
                  All Grid
                </button>
              </div>
            </div>
          </div>

          {/* Role Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedRole('all')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                selectedRole === 'all'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              All Roles ({opportunities.length})
            </button>

            {SERVING_ROLES.map((role) => {
              const IconComp = role.icon;
              const count = opportunities.filter((o) => getRoleMeta(o.roleCategory || o.role).id === role.id).length;
              const isSelected = selectedRole === role.id;

              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                    isSelected
                      ? `${role.badgeClass} ring-2 ring-cyan-500/40`
                      : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{role.label}</span>
                  <span className="ml-1 text-[11px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION: Opportunities Feed */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading serving opportunities...</p>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-slate-800/40 rounded-3xl border border-slate-800 p-12 text-center max-w-lg mx-auto">
            <SlidersHorizontal className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No serving opportunities match your filters</h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 mb-5">
              Try clearing your search terms or toggling role filters to see all available spots.
            </p>
            <button
              onClick={() => {
                setSelectedRole('all');
                setSearchQuery('');
                setOnlyOpenSpots(false);
                setOnlyUrgent(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 text-xs font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'grouped' && selectedRole === 'all' ? (
          /* Grouped by Role View */
          <div className="space-y-8">
            {SERVING_ROLES.map((role) => {
              const list = groupedOpportunities[role.id] || [];
              if (list.length === 0) return null;
              const IconComp = role.icon;

              return (
                <div key={role.id} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border ${role.badgeClass}`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{role.fullTitle}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {list.length} spot{list.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{role.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Role Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {list.map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        currentUserId={currentUserId}
                        currentUserName={currentUserName}
                        isAdmin={isAdmin}
                        isLeader={isLeader}
                        onApply={(oppItem) => {
                          setApplyModalOpp(oppItem);
                          setApplicantNotes('');
                        }}
                        onDelete={(oppId, title) => handleDeleteOpportunity(oppId, title)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List / Unified Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                isAdmin={isAdmin}
                isLeader={isLeader}
                onApply={(oppItem) => {
                  setApplyModalOpp(oppItem);
                  setApplicantNotes('');
                }}
                onDelete={(oppId, title) => handleDeleteOpportunity(oppId, title)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Apply to Serve */}
      {applyModalOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Heart className="w-5 h-5 fill-cyan-400/20" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">Apply to Serve</h3>
                  <p className="text-xs text-slate-400">Commit your gifts to the VBT community</p>
                </div>
              </div>
              <button
                onClick={() => setApplyModalOpp(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Opportunity Summary Card */}
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2">
                  {(() => {
                    const meta = getRoleMeta(applyModalOpp.roleCategory || applyModalOpp.role);
                    const IconComp = meta.icon;
                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    );
                  })()}
                  {applyModalOpp.isUrgent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                      <Flame className="w-3 h-3 text-rose-400" /> Urgent Need
                    </span>
                  )}
                </div>

                <h4 className="text-base font-bold text-white">{applyModalOpp.title}</h4>
                <p className="text-xs text-cyan-300">{applyModalOpp.serviceTitle}</p>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{applyModalOpp.serviceDate || 'Upcoming Service'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{formatTimeRange(applyModalOpp.startTime, applyModalOpp.endTime)}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{applyModalOpp.location || 'Church Campus'}</span>
                  </div>
                </div>

                {/* Spots status */}
                <div className="pt-2 border-t border-slate-700/60">
                  <SpotsIndicator
                    spotsFilled={applyModalOpp.spotsFilled || (applyModalOpp.volunteers || []).length}
                    spotsNeeded={applyModalOpp.spotsNeeded || 1}
                    isUrgent={applyModalOpp.isUrgent}
                  />
                </div>
              </div>

              {/* Description & Responsibilities */}
              {applyModalOpp.description && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300">About this serving spot:</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {applyModalOpp.description}
                  </p>
                </div>
              )}

              {/* Requirements Checklist */}
              {applyModalOpp.requirements && applyModalOpp.requirements.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300">Prerequisites & Guidelines:</span>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {applyModalOpp.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Current Team Members */}
              {applyModalOpp.volunteers && applyModalOpp.volunteers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Currently serving on this team:</span>
                  <div className="flex flex-wrap gap-2">
                    {applyModalOpp.volunteers.map((v, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        {v.memberName || v.name || 'Servant'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Applicant Profile Note */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Servant Notes & Availability (Optional)
                </label>
                <textarea
                  rows={3}
                  value={applicantNotes}
                  onChange={(e) => setApplicantNotes(e.target.value)}
                  placeholder="e.g. I will arrive 15 minutes early to assist with court prep, have my own referee whistle..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Member Confirmation Summary */}
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <div>
                  <span className="block text-slate-300 font-medium">{currentUserName}</span>
                  <span className="text-[11px] capitalize text-slate-400">Role: {currentUserRole}</span>
                </div>
                <span className="text-cyan-400 font-semibold text-[11px]">Instant Commitment</span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setApplyModalOpp(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleCommitToServe}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
              >
                {submittingAction ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5 fill-white" />
                    Commit to Serve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request Replacement */}
      {replacementModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Request Replacement</h3>
                  <p className="text-xs text-slate-400">Need another servant to cover your spot?</p>
                </div>
              </div>
              <button
                onClick={() => setReplacementModalItem(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
                <div className="font-semibold text-white">
                  {replacementModalItem.opportunity.title}
                </div>
                <div className="text-slate-400 mt-1">
                  {replacementModalItem.opportunity.serviceTitle} •{' '}
                  {replacementModalItem.opportunity.serviceDate}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Reason for replacement request (Optional)
                </label>
                <textarea
                  rows={3}
                  value={replacementReason}
                  onChange={(e) => setReplacementReason(e.target.value)}
                  placeholder="e.g. Sudden family emergency, work travel, feeling sick..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  This spot will be highlighted in the serving marketplace with a priority badge so
                  fellow servants know backup coverage is urgently needed.
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReplacementModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Never Mind
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleSubmitReplacement}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                {submittingAction ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Post Replacement Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Serving Opportunity (Admin / Leader) */}
      {addModalOpen && (isAdmin || isLeader) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Post Serving Opportunity</h3>
                  <p className="text-xs text-slate-400">Open new spots for upcoming church services</p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-6 space-y-4 overflow-y-auto">
              {/* Ministry Role Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ministry Role Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVING_ROLES.map((role) => {
                    const isSelected = newOpp.roleCategory === role.id;
                    const IconComp = role.icon;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => setNewOpp({ ...newOpp, roleCategory: role.id })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition ${
                          isSelected
                            ? `${role.badgeClass} ring-2 ring-cyan-500`
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Opportunity Title *
                </label>
                <input
                  type="text"
                  required
                  value={newOpp.title}
                  onChange={(e) => setNewOpp({ ...newOpp, title: e.target.value })}
                  placeholder="e.g. Lead Referee - 3v3 Tournament or Sound Desk Operator"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Linked Service */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Linked Service / Gathering
                </label>
                {upcomingServices.length > 0 ? (
                  <select
                    value={newOpp.serviceTitle}
                    onChange={(e) => {
                      const selected = upcomingServices.find((s) => s.title === e.target.value);
                      setNewOpp({
                        ...newOpp,
                        serviceTitle: e.target.value,
                        serviceDate: selected?.date || newOpp.serviceDate,
                        startTime: selected?.startTime || newOpp.startTime,
                        endTime: selected?.endTime || newOpp.endTime,
                        location:
                          typeof selected?.location === 'string'
                            ? selected.location
                            : selected?.location?.name || newOpp.location,
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {upcomingServices.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title} ({s.date})
                      </option>
                    ))}
                    <option value="Friday Youth Sports Night & Camp">
                      Friday Youth Sports Night & Camp
                    </option>
                    <option value="Sunday Evening Fellowship Service">
                      Sunday Evening Fellowship Service
                    </option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newOpp.serviceTitle}
                    onChange={(e) => setNewOpp({ ...newOpp, serviceTitle: e.target.value })}
                    placeholder="e.g. Friday Youth Sports Night & Camp"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={newOpp.serviceDate}
                    onChange={(e) => setNewOpp({ ...newOpp, serviceDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newOpp.startTime}
                    onChange={(e) => setNewOpp({ ...newOpp, startTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newOpp.endTime}
                    onChange={(e) => setNewOpp({ ...newOpp, endTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Location & Spots Needed */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={newOpp.location}
                    onChange={(e) => setNewOpp({ ...newOpp, location: e.target.value })}
                    placeholder="e.g. Main Gymnasium Court 1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Spots Needed
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newOpp.spotsNeeded}
                    onChange={(e) => setNewOpp({ ...newOpp, spotsNeeded: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Urgent Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Mark as Urgent Need</span>
                    <span className="text-[11px] text-slate-400">
                      Displays a glowing badge to encourage fast signups
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newOpp.isUrgent}
                  onChange={(e) => setNewOpp({ ...newOpp, isUrgent: e.target.checked })}
                  className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500"
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Prerequisites / Requirements (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newOpp.requirements}
                  onChange={(e) => setNewOpp({ ...newOpp, requirements: e.target.value })}
                  placeholder="e.g. Arrive 15 min early, Bring whistle, Ages 16+"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Duties & Description
                </label>
                <textarea
                  rows={3}
                  value={newOpp.description}
                  onChange={(e) => setNewOpp({ ...newOpp, description: e.target.value })}
                  placeholder="Describe the duties, blessing, and atmosphere for this role..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
                >
                  {submittingAction ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Post Opportunity
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable Opportunity Card Component
 */
function OpportunityCard({
  opportunity,
  currentUserId,
  currentUserName,
  isAdmin,
  isLeader,
  onApply,
  onDelete,
}) {
  const meta = getRoleMeta(opportunity.roleCategory || opportunity.role);
  const IconComp = meta.icon;

  const vols = opportunity.volunteers || [];
  const needed = opportunity.spotsNeeded || 1;
  const filled = opportunity.spotsFilled || vols.length;
  const remaining = Math.max(0, needed - filled);
  const isFull = remaining === 0;

  const hasMyCommitment = vols.some(
    (v) =>
      v.userId === currentUserId ||
      v.id === currentUserId ||
      (currentUserName && v.memberName === currentUserName)
  );

  const hasReplacementRequest = vols.some(
    (v) => v.status === APPLICATION_STATUS.REPLACEMENT_REQUESTED
  );

  return (
    <div
      className={`relative rounded-3xl p-5 border bg-slate-800/80 backdrop-blur transition-all duration-200 flex flex-col justify-between shadow-xl ${
        opportunity.isUrgent || hasReplacementRequest
          ? 'border-amber-500/40 shadow-amber-500/10'
          : `border-slate-700/70 ${meta.borderCard}`
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
            >
              <IconComp className="w-3.5 h-3.5" />
              {meta.label}
            </span>

            {opportunity.isUrgent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                <Flame className="w-3 h-3 text-rose-400" />
                Urgent Need
              </span>
            )}

            {hasReplacementRequest && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/25 text-amber-300 border border-amber-500/50">
                <AlertTriangle className="w-3 h-3" />
                Backup Needed
              </span>
            )}
          </div>

          {(isAdmin || isLeader) && (
            <button
              onClick={() => onDelete(opportunity.id, opportunity.title)}
              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-750 transition"
              title="Delete opportunity (Leader/Admin)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Title & Service */}
        <h4 className="text-base font-bold text-white mb-1 leading-snug line-clamp-2">
          {opportunity.title}
        </h4>
        <p className="text-xs text-cyan-300 font-medium mb-3">{opportunity.serviceTitle}</p>

        {/* Time & Location Pill details */}
        <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{opportunity.serviceDate || 'Upcoming Service'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{formatTimeRange(opportunity.startTime, opportunity.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{opportunity.location || 'Church Campus'}</span>
          </div>
        </div>

        {/* Description */}
        {opportunity.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {opportunity.description}
          </p>
        )}

        {/* Requirements preview */}
        {opportunity.requirements && opportunity.requirements.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {opportunity.requirements.slice(0, 3).map((req, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-300 border border-slate-800"
              >
                {req}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Section: Spots progress bar and Apply button */}
      <div className="pt-3 border-t border-slate-700/60 space-y-3 mt-2">
        <SpotsIndicator
          spotsFilled={filled}
          spotsNeeded={needed}
          isUrgent={opportunity.isUrgent || hasReplacementRequest}
        />

        {/* Action Button */}
        {hasMyCommitment ? (
          <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>You Are Serving Here</span>
          </div>
        ) : isFull && !hasReplacementRequest ? (
          <button
            disabled
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            All Spots Filled
          </button>
        ) : (
          <button
            onClick={() => onApply(opportunity)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-98 ${
              hasReplacementRequest
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
            }`}
          >
            {hasReplacementRequest ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Step In to Cover Spot
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5" />
                Apply to Serve
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
