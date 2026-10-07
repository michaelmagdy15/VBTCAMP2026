import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Heart,
  Sparkles,
  Shield,
  Lock,
  Plus,
  CheckCircle2,
  MessageSquare,
  Share2,
  Flame,
  Search,
  Filter,
  X,
  Loader2,
  Users,
  Clock,
  Globe,
  Send,
  Check,
  Smile,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import { triggerHaptic } from '../utils/haptics';

// Category Configuration
const PRAYER_CATEGORIES = [
  { id: 'all', label: 'All Requests', icon: '🙏' },
  { id: 'healing', label: 'Healing & Health', icon: '🩺', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'camp', label: 'Camp & Sports', icon: '🏕️', badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { id: 'family', label: 'Family & Home', icon: '👨‍👩‍👧', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'guidance', label: 'Guidance & Exams', icon: '🎓', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { id: 'spiritual', label: 'Spiritual Growth', icon: '✝️', badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  { id: 'thanksgiving', label: 'Praise & Thanksgiving', icon: '🌟', badgeBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
];

// Rich Seed Data for offline/instant UI
const SEED_PRAYERS = [
  {
    id: 'seed-prayer-1',
    title: "Healing for David's Sprained Ankle Before Quarterfinals",
    content: 'David twisted his ankle during the basketball match on Court B. Praying for fast recovery, no ligament injury, and strength for him and his team.',
    description: 'David twisted his ankle during the basketball match on Court B. Praying for fast recovery, no ligament injury, and strength for him and his team.',
    category: 'healing',
    isUrgent: true,
    authorAnonymous: false,
    authorId: 'user_michael',
    authorName: 'Coach Michael',
    authorRole: 'leader',
    privacy: 'COMMUNITY',
    status: 'active',
    prayerCount: 24,
    prayedByUids: ['user_michael', 'u2', 'u3'],
    comments: [
      { id: 'c1', authorName: 'Peter M.', text: 'Amen! Praying for swift healing brother.', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'c2', authorName: 'Servant Mary', text: 'Philippians 4:13! You will be back stronger.', createdAt: new Date(Date.now() - 1800000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'seed-prayer-2',
    title: 'Peace of Mind for Campers Taking College & High School Exams',
    content: 'Lifting up our high school seniors and college servants who have exams immediately following sports camp week. Praying for clarity, focus, and divine calm.',
    description: 'Lifting up our high school seniors and college servants who have exams immediately following sports camp week. Praying for clarity, focus, and divine calm.',
    category: 'guidance',
    isUrgent: false,
    authorAnonymous: false,
    authorId: 'user_sarah',
    authorName: 'Sarah K.',
    authorRole: 'servant',
    privacy: 'COMMUNITY',
    status: 'active',
    prayerCount: 19,
    prayedByUids: ['u4', 'u5'],
    comments: [
      { id: 'c3', authorName: 'Mina B.', text: 'Amen! God gives wisdom generously.', createdAt: new Date(Date.now() - 5400000).toISOString() },
    ],
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'seed-prayer-3',
    title: 'Family Comfort & Health Support for Servant Mark',
    content: 'Confidential request: Servant Mark’s grandmother was admitted to the hospital. Praying for medical wisdom for doctors and peace for his household.',
    description: 'Confidential request: Servant Mark’s grandmother was admitted to the hospital. Praying for medical wisdom for doctors and peace for his household.',
    category: 'family',
    isUrgent: true,
    authorAnonymous: true,
    authorId: 'user_mark_anon',
    authorName: 'Anonymous Servant',
    authorRole: 'servant',
    privacy: 'LEADERS_ONLY',
    status: 'active',
    prayerCount: 14,
    prayedByUids: [],
    comments: [],
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 'seed-prayer-4',
    title: 'Spiritual Renewal During Tonight’s Campfire & Praise Night',
    content: 'Praying that the Holy Spirit touches every youth member during our acoustic praise worship and fellowship message around the fire tonight.',
    description: 'Praying that the Holy Spirit touches every youth member during our acoustic praise worship and fellowship message around the fire tonight.',
    category: 'spiritual',
    isUrgent: false,
    authorAnonymous: false,
    authorId: 'user_daniel',
    authorName: 'Daniel F.',
    authorRole: 'leader',
    privacy: 'COMMUNITY',
    status: 'active',
    prayerCount: 38,
    prayedByUids: ['user_michael'],
    comments: [],
    createdAt: new Date(Date.now() - 36000000).toISOString(),
  },
  {
    id: 'seed-prayer-5',
    title: 'Safe Travel for Tomorrow’s Morning Bus Coming from Cairo',
    content: 'Asking for traveling mercies for the 45 campers and drivers on the highway tomorrow morning. Protection on every mile.',
    description: 'Asking for traveling mercies for the 45 campers and drivers on the highway tomorrow morning. Protection on every mile.',
    category: 'camp',
    isUrgent: true,
    authorAnonymous: false,
    authorId: 'user_george',
    authorName: 'George S.',
    authorRole: 'coordinator',
    privacy: 'COMMUNITY',
    status: 'active',
    prayerCount: 29,
    prayedByUids: [],
    comments: [],
    createdAt: new Date(Date.now() - 50000000).toISOString(),
  },
  // Answered Prayers
  {
    id: 'seed-answered-1',
    title: 'City Sports Court Permits & Night Floodlights Granted Free',
    content: 'We urgently needed permission to extend evening sports lights for the tournament championship playoffs without venue extra fees.',
    description: 'We urgently needed permission to extend evening sports lights for the tournament championship playoffs without venue extra fees.',
    category: 'camp',
    isUrgent: false,
    authorAnonymous: false,
    authorId: 'user_bishoy',
    authorName: 'Father Bishoy & Sports Committee',
    authorRole: 'admin',
    privacy: 'COMMUNITY',
    status: 'answered',
    prayerCount: 45,
    prayedByUids: [],
    answeredAt: new Date(Date.now() - 86400000).toISOString(),
    answerNote: 'The sports complex director not only approved late lights until 10:30 PM at no cost, but also offered free sound equipment and extra grandstands. God’s favor is marvelous!',
    rejoiceCount: 51,
    rejoicedUserIds: [],
    comments: [],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'seed-answered-2',
    title: 'Full Recovery for Anthony After Severe Heat Cramps',
    content: 'Anthony suffered severe cramps and dehydration during Tuesday soccer match drills.',
    description: 'Anthony suffered severe cramps and dehydration during Tuesday soccer match drills.',
    category: 'healing',
    isUrgent: false,
    authorAnonymous: false,
    authorId: 'user_anthony',
    authorName: 'Anthony M.',
    authorRole: 'member',
    privacy: 'COMMUNITY',
    status: 'answered',
    prayerCount: 33,
    prayedByUids: [],
    answeredAt: new Date(Date.now() - 120000000).toISOString(),
    answerNote: 'After urgent prayer by the servant team, fluids and rest completely restored him. Doctor cleared him with flying colors and he played 2 full games yesterday!',
    rejoiceCount: 42,
    rejoicedUserIds: [],
    comments: [],
    createdAt: new Date(Date.now() - 250000000).toISOString(),
  },
];

const SEED_TESTIMONIES = [
  {
    id: 'seed-testimony-1',
    title: 'Volleyball Semifinal Sportsmanship: St. George & St. Mina',
    content: 'During the high-stakes volleyball tiebreaker, referee miscalled an out-of-bounds ball. Instead of accepting the unfair advantage, Captain Kyrollos spoke up and yielded the point to St. George. The whole hall erupted in respect, and both teams joined hands in prayer at center court. True Christian sportsmanship!',
    authorName: 'Kyrollos & Team St. Mina',
    authorRole: 'leader',
    category: 'camp',
    rejoiceCount: 63,
    rejoicedUserIds: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'seed-testimony-2',
    title: 'From Lonely First-Timer to Beloved Brother in Christ',
    content: 'I arrived at camp feeling completely isolated and battling anxiety. From day one, the servants welcomed me with open arms and brotherly love. During worship night, Christ lifted that heavy burden off my shoulders. I found a real family in VBT.',
    authorName: 'Anonymous Camper',
    authorRole: 'member',
    category: 'spiritual',
    rejoiceCount: 78,
    rejoicedUserIds: [],
    createdAt: new Date(Date.now() - 150000000).toISOString(),
  },
  {
    id: 'seed-testimony-3',
    title: 'Complete Camp Sponsorship Provided for Six Kids',
    content: 'Two days before camp kickoff, six children could not afford the bus and jersey fees. We prayed silently during liturgy. That evening, a sponsor stepped in to cover all registrations and gave each camper brand-new sneakers! Praise God who provides.',
    authorName: 'VBT Outreach Ministry',
    authorRole: 'admin',
    category: 'thanksgiving',
    rejoiceCount: 94,
    rejoicedUserIds: [],
    createdAt: new Date(Date.now() - 220000000).toISOString(),
  },
];

// Helper: Format relative timestamp
function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Recently';
  const date = typeof dateInput?.toDate === 'function' ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PrayerWallTab({
  currentUser,
  currentUserProfile,
  isAdmin = false,
  isLeader = false,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  // Navigation Tabs: 'prayer-wall' | 'answered' | 'testimonies'
  const [activeTab, setActiveTab] = useState('prayer-wall');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterUrgentOnly, setFilterUrgentOnly] = useState(false);
  const [filterLeadersOnly, setFilterLeadersOnly] = useState(false);

  // Data state
  const [prayers, setPrayers] = useState(() => {
    try {
      const saved = localStorage.getItem(`vbt_prayers_${communityId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SEED_PRAYERS;
  });

  const [testimonies, setTestimonies] = useState(() => {
    try {
      const saved = localStorage.getItem(`vbt_testimonies_${communityId}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SEED_TESTIMONIES;
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [testimonyModalOpen, setTestimonyModalOpen] = useState(false);
  const [answeringPrayer, setAnsweringPrayer] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [justPrayedId, setJustPrayedId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  // New Prayer Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('healing');
  const [newIsUrgent, setNewIsUrgent] = useState(false);
  const [newIsAnonymous, setNewIsAnonymous] = useState(false);
  const [newPrivacy, setNewPrivacy] = useState('COMMUNITY'); // 'COMMUNITY' | 'LEADERS_ONLY'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Direct Testimony Form State
  const [newTestimonyTitle, setNewTestimonyTitle] = useState('');
  const [newTestimonyContent, setNewTestimonyContent] = useState('');
  const [newTestimonyCategory, setNewTestimonyCategory] = useState('camp');
  const [newTestimonyAnonymous, setNewTestimonyAnonymous] = useState(false);

  // Answer Prayer Form State
  const [answerTestimonyText, setAnswerTestimonyText] = useState('');
  const [answerPublishToTestimonies, setAnswerPublishToTestimonies] = useState(true);

  // Current user identifiers
  const currentUserId = useMemo(() => {
    return currentUser?.uid || currentUser?.id || currentUserProfile?.id || 'guest_user';
  }, [currentUser, currentUserProfile]);

  const currentUserName = useMemo(() => {
    if (currentUserProfile?.firstName) {
      return `${currentUserProfile.firstName} ${currentUserProfile.lastName || ''}`.trim();
    }
    return currentUser?.name || currentUser?.displayName || 'VBT Member';
  }, [currentUser, currentUserProfile]);

  // Check if current user has leadership privileges
  const hasLeadershipAccess = useMemo(() => {
    if (isAdmin || isLeader) return true;
    const userRole = (currentUser?.role || currentUserProfile?.role || '').toLowerCase();
    return ['admin', 'coordinator', 'team_leader', 'leader', 'service_leader', 'game_leader'].includes(userRole);
  }, [isAdmin, isLeader, currentUser, currentUserProfile]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(`vbt_prayers_${communityId}`, JSON.stringify(prayers));
    } catch {
      // ignore
    }
  }, [prayers, communityId]);

  useEffect(() => {
    try {
      localStorage.setItem(`vbt_testimonies_${communityId}`, JSON.stringify(testimonies));
    } catch {
      // ignore
    }
  }, [testimonies, communityId]);

  // Subscribe to Firestore collection
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const prayersCol = collection(db, 'vbt_communities', communityId, 'prayer_requests');
      unsubscribe = onSnapshot(
        prayersCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));
            setPrayers(list);
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );
    } catch {
      // Ignore synchronous initialization error
    }
    return () => unsubscribe();
  }, [communityId]);

  // Filter Active Prayers
  const activePrayers = useMemo(() => {
    return prayers.filter((p) => p.status !== 'answered');
  }, [prayers]);

  // Filter Answered Prayers
  const answeredPrayers = useMemo(() => {
    return prayers.filter((p) => p.status === 'answered');
  }, [prayers]);

  // Visible Active Prayers taking privacy and search into account
  const visibleActivePrayers = useMemo(() => {
    let list = activePrayers;

    // Filter by Privacy: Leaders-only requests are only visible to leadership or the author
    list = list.filter((p) => {
      const isConfidential = p.privacy === 'LEADERS_ONLY' || p.privacy === 'leaders';
      if (!isConfidential) return true;
      if (hasLeadershipAccess) return true;
      return p.authorId === currentUserId;
    });

    // Urgent filter
    if (filterUrgentOnly) {
      list = list.filter((p) => p.isUrgent);
    }

    // Leaders-only toggle filter (when user actively wants to isolate confidential requests)
    if (filterLeadersOnly && hasLeadershipAccess) {
      list = list.filter((p) => p.privacy === 'LEADERS_ONLY' || p.privacy === 'leaders');
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          (p.content || p.description)?.toLowerCase().includes(q) ||
          p.authorName?.toLowerCase().includes(q)
      );
    }

    // Sort: Urgent first, then by date descending
    return [...list].sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [activePrayers, hasLeadershipAccess, currentUserId, filterUrgentOnly, filterLeadersOnly, selectedCategory, searchQuery]);

  // Visible Answered Prayers
  const visibleAnsweredPrayers = useMemo(() => {
    let list = answeredPrayers;

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          (p.content || p.description)?.toLowerCase().includes(q) ||
          (p.answerNote || p.testimony)?.toLowerCase().includes(q) ||
          p.authorName?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.answeredAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.answeredAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [answeredPrayers, selectedCategory, searchQuery]);

  // Visible Testimonies
  const visibleTestimonies = useMemo(() => {
    let list = testimonies;

    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          (t.content || t.story)?.toLowerCase().includes(q) ||
          t.authorName?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [testimonies, selectedCategory, searchQuery]);

  // Check if current user can mark answered
  const canMarkAnswered = useCallback(
    (item) => {
      if (hasLeadershipAccess) return true;
      if (item.authorId && String(item.authorId) === String(currentUserId)) return true;
      if (item.authorName && item.authorName.toLowerCase() === currentUserName.toLowerCase()) return true;
      return false;
    },
    [hasLeadershipAccess, currentUserId, currentUserName]
  );

  // Trigger celebratory confetti
  const triggerCelebration = useCallback(() => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#10b981', '#fbbf24', '#38bdf8', '#f43f5e', '#a855f7'],
      });
      triggerHaptic('success');
    } catch {
      // ignore
    }
  }, []);

  // Handle "I Prayed for This" click
  const handlePrayClick = async (prayerId) => {
    triggerHaptic('light');
    setJustPrayedId(prayerId);
    setTimeout(() => setJustPrayedId(null), 1200);

    setPrayers((prev) =>
      prev.map((item) => {
        if (item.id !== prayerId) return item;

        const prayedList = item.prayedByUids || item.prayedUserIds || [];
        const alreadyPrayed = prayedList.includes(currentUserId);
        const newPrayedList = alreadyPrayed
          ? prayedList.filter((uid) => uid !== currentUserId)
          : [...prayedList, currentUserId];

        const newCount = alreadyPrayed
          ? Math.max(0, (item.prayerCount || 1) - 1)
          : (item.prayerCount || 0) + 1;

        const updated = {
          ...item,
          prayerCount: newCount,
          prayedByUids: newPrayedList,
          prayedUserIds: newPrayedList,
        };

        // Sync with Firestore asynchronously
        try {
          const prayerDocRef = doc(db, 'vbt_communities', communityId, 'prayer_requests', prayerId);
          setDoc(
            prayerDocRef,
            { prayerCount: newCount, prayedByUids: newPrayedList, updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {});
        } catch {
          // ignore
        }

        return updated;
      })
    );
  };

  // Handle Share to Clipboard
  const handleShare = async (title, text) => {
    triggerHaptic('light');
    const content = `🙏 [VBT Prayer Wall]\n\n*${title}*\n${text}\n\nJoin our community in lifting this up in faith!`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        setCopiedId(title);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      // Fallback
    }
  };

  // Handle Rejoice / Praise reaction for testimonies
  const handleRejoiceClick = (testimonyId, isPrayerTestimony = false) => {
    triggerHaptic('success');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#fbbf24', '#34d399', '#f43f5e'],
      });
    } catch {
      // ignore
    }

    if (isPrayerTestimony) {
      setPrayers((prev) =>
        prev.map((p) => {
          if (p.id !== testimonyId) return p;
          const rejoicedList = p.rejoicedUserIds || [];
          const alreadyRejoiced = rejoicedList.includes(currentUserId);
          const newRejoicedList = alreadyRejoiced
            ? rejoicedList.filter((uid) => uid !== currentUserId)
            : [...rejoicedList, currentUserId];
          const newCount = alreadyRejoiced
            ? Math.max(0, (p.rejoiceCount || 1) - 1)
            : (p.rejoiceCount || 0) + 1;
          return { ...p, rejoiceCount: newCount, rejoicedUserIds: newRejoicedList };
        })
      );
    } else {
      setTestimonies((prev) =>
        prev.map((t) => {
          if (t.id !== testimonyId) return t;
          const rejoicedList = t.rejoicedUserIds || [];
          const alreadyRejoiced = rejoicedList.includes(currentUserId);
          const newRejoicedList = alreadyRejoiced
            ? rejoicedList.filter((uid) => uid !== currentUserId)
            : [...rejoicedList, currentUserId];
          const newCount = alreadyRejoiced
            ? Math.max(0, (t.rejoiceCount || 1) - 1)
            : (t.rejoiceCount || 0) + 1;
          return { ...t, rejoiceCount: newCount, rejoicedUserIds: newRejoicedList };
        })
      );
    }
  };

  // Handle Add Encouragement comment
  const handleAddComment = (prayerId) => {
    const text = (commentInputs[prayerId] || '').trim();
    if (!text) return;
    triggerHaptic('light');

    const newComment = {
      id: `c_${Date.now()}`,
      authorName: currentUserName,
      text,
      createdAt: new Date().toISOString(),
    };

    setPrayers((prev) =>
      prev.map((item) => {
        if (item.id !== prayerId) return item;
        const currentComments = item.comments || [];
        const updatedComments = [...currentComments, newComment];

        try {
          const prayerDocRef = doc(db, 'vbt_communities', communityId, 'prayer_requests', prayerId);
          setDoc(prayerDocRef, { comments: updatedComments }, { merge: true }).catch(() => {});
        } catch {
          // ignore
        }

        return { ...item, comments: updatedComments };
      })
    );

    setCommentInputs((prev) => ({ ...prev, [prayerId]: '' }));
  };

  // Post Prayer Request Submit
  const handlePostPrayerSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setIsSubmitting(true);
    triggerHaptic('medium');

    const newPrayer = {
      id: `prayer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      description: newContent.trim(),
      category: newCategory,
      isUrgent: newIsUrgent,
      authorAnonymous: newIsAnonymous,
      authorId: currentUserId,
      authorName: newIsAnonymous ? 'Anonymous VBT Member' : currentUserName,
      authorRole: currentUser?.role || currentUserProfile?.role || 'member',
      privacy: newPrivacy,
      status: 'active',
      prayerCount: 1,
      prayedByUids: [currentUserId],
      prayedUserIds: [currentUserId],
      comments: [],
      createdAt: new Date().toISOString(),
    };

    setPrayers((prev) => [newPrayer, ...prev]);

    try {
      const prayerDocRef = doc(db, 'vbt_communities', communityId, 'prayer_requests', newPrayer.id);
      await setDoc(prayerDocRef, {
        ...newPrayer,
        createdAt: serverTimestamp(),
      });
    } catch {
      // Local optimistic update stays active
    }

    triggerCelebration();
    setIsSubmitting(false);
    setPostModalOpen(false);

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setNewCategory('healing');
    setNewIsUrgent(false);
    setNewIsAnonymous(false);
    setNewPrivacy('COMMUNITY');
  };

  // Mark Prayer as Answered Submit
  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!answeringPrayer || !answerTestimonyText.trim()) return;

    setIsSubmitting(true);
    triggerHaptic('success');

    const answeredDate = new Date().toISOString();
    const prayerId = answeringPrayer.id;

    // Update Prayer State
    setPrayers((prev) =>
      prev.map((item) => {
        if (item.id !== prayerId) return item;
        const updated = {
          ...item,
          status: 'answered',
          answeredAt: answeredDate,
          answerNote: answerTestimonyText.trim(),
          testimony: answerTestimonyText.trim(),
          rejoiceCount: 1,
          rejoicedUserIds: [currentUserId],
        };

        try {
          const prayerDocRef = doc(db, 'vbt_communities', communityId, 'prayer_requests', prayerId);
          setDoc(
            prayerDocRef,
            {
              status: 'answered',
              answeredAt: serverTimestamp(),
              answerNote: answerTestimonyText.trim(),
              rejoiceCount: 1,
              rejoicedUserIds: [currentUserId],
            },
            { merge: true }
          ).catch(() => {});
        } catch {
          // ignore
        }

        return updated;
      })
    );

    // Optionally feature as community testimony
    if (answerPublishToTestimonies) {
      const newTestimony = {
        id: `testimony_from_${prayerId}`,
        title: `Answered Prayer: ${answeringPrayer.title}`,
        content: answerTestimonyText.trim(),
        story: answerTestimonyText.trim(),
        authorName: (answeringPrayer.authorAnonymous || answeringPrayer.isAnonymous) ? 'Anonymous Member' : answeringPrayer.authorName,
        authorRole: answeringPrayer.authorRole || 'member',
        category: answeringPrayer.category || 'thanksgiving',
        rejoiceCount: 1,
        rejoicedUserIds: [currentUserId],
        createdAt: answeredDate,
      };
      setTestimonies((prev) => [newTestimony, ...prev]);
    }

    triggerCelebration();
    setIsSubmitting(false);
    setAnsweringPrayer(null);
    setAnswerTestimonyText('');
    setAnswerPublishToTestimonies(true);
  };

  // Direct Testimony Submit
  const handleDirectTestimonySubmit = async (e) => {
    e.preventDefault();
    if (!newTestimonyTitle.trim() || !newTestimonyContent.trim()) return;

    setIsSubmitting(true);
    triggerHaptic('success');

    const newTestimony = {
      id: `testimony_${Date.now()}`,
      title: newTestimonyTitle.trim(),
      content: newTestimonyContent.trim(),
      story: newTestimonyContent.trim(),
      authorName: newTestimonyAnonymous ? 'Anonymous Camp Member' : currentUserName,
      authorRole: currentUser?.role || currentUserProfile?.role || 'member',
      category: newTestimonyCategory,
      rejoiceCount: 1,
      rejoicedUserIds: [currentUserId],
      createdAt: new Date().toISOString(),
    };

    setTestimonies((prev) => [newTestimony, ...prev]);
    triggerCelebration();
    setIsSubmitting(false);
    setTestimonyModalOpen(false);

    setNewTestimonyTitle('');
    setNewTestimonyContent('');
    setNewTestimonyCategory('camp');
    setNewTestimonyAnonymous(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 sm:p-8 shadow-2xl">
        {/* Ambient glow backgrounds */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 fill-rose-500 animate-pulse" />
              <span>VBT Prayer & Praise Sanctuary</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Prayer Wall & Testimonies
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              &ldquo;Therefore confess your sins to each other and pray for each other so that you may be healed.
              The prayer of a righteous person is powerful and effective.&rdquo;
              <span className="text-amber-400 font-semibold ml-1.5">— James 5:16</span>
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                triggerHaptic('light');
                setPostModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-500/25 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Post Prayer Request</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('light');
                setTestimonyModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Share Testimony</span>
            </button>
          </div>
        </div>

        {/* Leadership Access Notice Banner */}
        {hasLeadershipAccess && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs text-purple-300">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>
                <strong>Leader Access Active:</strong> You can view confidential Leaders-Only prayer requests and mark any request answered.
              </span>
            </div>
            <button
              onClick={() => setFilterLeadersOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                filterLeadersOnly
                  ? 'bg-purple-600 text-white border-purple-500 font-bold'
                  : 'bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{filterLeadersOnly ? 'Viewing Leaders Only Requests' : 'Filter Leaders Only'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Live sync indicator */}
      {loading && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 w-fit">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
          <span>Syncing prayer wall live...</span>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tab 1: Prayer Wall */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('prayer-wall');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'prayer-wall'
                ? 'bg-slate-800 text-rose-400 border border-rose-500/30 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'prayer-wall' ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>Prayer Wall</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'prayer-wall' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activePrayers.length}
            </span>
          </button>

          {/* Tab 2: Answered Prayers */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('answered');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'answered'
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Answered Prayers</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'answered' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {answeredPrayers.length}
            </span>
          </button>

          {/* Tab 3: Community Testimonies */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('testimonies');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'testimonies'
                ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Community Testimonies</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'testimonies' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {testimonies.length}
            </span>
          </button>
        </div>

        {/* Urgent Quick Filter (shown on prayer wall) */}
        {activeTab === 'prayer-wall' && (
          <button
            onClick={() => setFilterUrgentOnly((prev) => !prev)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              filterUrgentOnly
                ? 'bg-rose-600/30 border-rose-500 text-rose-300 shadow-md'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-rose-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-bounce" />
            <span>Urgent Needs Only</span>
          </button>
        )}
      </div>

      {/* Search Bar & Category Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'prayer-wall'
                  ? 'Search prayer requests by name, need, or details...'
                  : activeTab === 'answered'
                  ? 'Search answered prayers and testimonies...'
                  : 'Search praise reports and camp testimonies...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Urgent button on mobile */}
          {activeTab === 'prayer-wall' && (
            <button
              onClick={() => setFilterUrgentOnly((prev) => !prev)}
              className={`sm:hidden flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                filterUrgentOnly
                  ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Urgent Needs</span>
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 pr-1 shrink-0 font-medium">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </div>
          {PRAYER_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all font-semibold ${
                  isSelected
                    ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800/80 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRAYER WALL                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'prayer-wall' && (
        <div className="space-y-4">
          {visibleActivePrayers.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Prayer Requests Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedCategory !== 'all' || filterUrgentOnly
                  ? 'No requests match your current filters. Try changing or resetting them.'
                  : 'Be the first to post a prayer request so our VBT community can stand in faith with you.'}
              </p>
              <button
                onClick={() => setPostModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post First Request</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleActivePrayers.map((prayer) => {
                const categoryObj = PRAYER_CATEGORIES.find((c) => c.id === prayer.category) || PRAYER_CATEGORIES[0];
                const prayedList = prayer.prayedByUids || prayer.prayedUserIds || [];
                const hasPrayed = prayedList.includes(currentUserId);
                const isAuthorOrLeader = canMarkAnswered(prayer);
                const isJustPrayed = justPrayedId === prayer.id;
                const isCommentsOpen = !!expandedComments[prayer.id];
                const commentsCount = (prayer.comments || []).length;
                const isLeadersOnly = prayer.privacy === 'LEADERS_ONLY' || prayer.privacy === 'leaders';
                const isAnonymous = Boolean(prayer.authorAnonymous || prayer.isAnonymous);

                return (
                  <div
                    key={prayer.id}
                    className={`relative rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between ${
                      prayer.isUrgent
                        ? 'bg-gradient-to-br from-rose-950/20 via-slate-900/90 to-slate-900 border-2 border-rose-500/40 shadow-lg shadow-rose-950/20'
                        : isLeadersOnly
                        ? 'bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-slate-900 border border-purple-500/30'
                        : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Floating "+1 Prayed!" notification on recent click */}
                    {isJustPrayed && (
                      <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-black shadow-lg animate-bounce flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-white" />
                        <span>Prayer Lifted!</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Card Tags / Badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Urgent Tag */}
                          {prayer.isUrgent && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-extrabold tracking-wide uppercase">
                              <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-500 animate-pulse" />
                              <span>Urgent</span>
                            </span>
                          )}

                          {/* Category Tag */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                              categoryObj.badgeBg || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            <span>{categoryObj.icon}</span>
                            <span>{categoryObj.label}</span>
                          </span>
                        </div>

                        {/* Privacy Tag */}
                        <div>
                          {isLeadersOnly ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[11px] font-bold">
                              <Lock className="w-3 h-3" />
                              <span>Leaders Only</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] font-medium">
                              <Globe className="w-3 h-3" />
                              <span>Community Wall</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                          {prayer.title}
                        </h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                          {prayer.content || prayer.description}
                        </p>
                      </div>

                      {/* Author Info & Timestamp */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isAnonymous
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-gradient-to-tr from-rose-500 to-amber-500 text-white'
                            }`}
                          >
                            {isAnonymous ? (
                              <Shield className="w-3 h-3 text-slate-400" />
                            ) : (
                              prayer.authorName?.[0]?.toUpperCase() || 'V'
                            )}
                          </div>
                          <span className="font-semibold text-slate-300">
                            {isAnonymous ? 'Anonymous Member' : prayer.authorName}
                          </span>
                          {prayer.authorRole && !isAnonymous && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 uppercase font-medium">
                              {prayer.authorRole}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(prayer.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      {/* "I Prayed for This" Button */}
                      <button
                        onClick={() => handlePrayClick(prayer.id)}
                        className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 transform active:scale-95 ${
                          hasPrayed
                            ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 shadow-md shadow-rose-500/10'
                            : 'bg-slate-800/90 border border-slate-700/80 text-slate-300 hover:border-rose-500/50 hover:text-white'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 transition-transform duration-300 ${
                            hasPrayed
                              ? 'fill-rose-500 text-rose-500 scale-110 animate-pulse'
                              : 'text-rose-400 group-hover:scale-125'
                          }`}
                        />
                        <span>{hasPrayed ? 'You Prayed' : 'I Prayed for This'}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            hasPrayed ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {prayer.prayerCount || 0}
                        </span>
                      </button>

                      {/* Right Secondary Actions */}
                      <div className="flex items-center gap-1.5">
                        {/* Encouraging Comments Button */}
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            setExpandedComments((prev) => ({
                              ...prev,
                              [prayer.id]: !prev[prayer.id],
                            }));
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            isCommentsOpen
                              ? 'bg-slate-800 border-slate-600 text-white'
                              : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                          title="View / Add prayer encouragements"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{commentsCount > 0 ? commentsCount : 'Amen'}</span>
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => handleShare(prayer.title, prayer.content || prayer.description)}
                          className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Share prayer request"
                        >
                          {copiedId === prayer.title ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* "Mark Answered" Button for Author or Leader */}
                        {isAuthorOrLeader && (
                          <button
                            onClick={() => {
                              triggerHaptic('medium');
                              setAnsweringPrayer(prayer);
                              setAnswerTestimonyText('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all transform active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Mark Answered</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Encouraging Comments & Notes */}
                    {isCommentsOpen && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5 animate-fadeIn">
                        <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                          <span>Encouraging Words & Amen Notes:</span>
                          <span className="text-[10px] text-slate-500">{commentsCount} notes</span>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {commentsCount === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">No notes yet. Be the first to send an &ldquo;Amen!&rdquo;</p>
                          ) : (
                            (prayer.comments || []).map((c) => (
                              <div
                                key={c.id}
                                className="p-2 rounded-lg bg-slate-800/60 border border-slate-800 text-xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="font-bold text-slate-300">{c.authorName}</span>
                                  <span>{formatRelativeTime(c.createdAt)}</span>
                                </div>
                                <p className="text-slate-200 text-xs">{c.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Add Comment Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Add an encouraging note or &lsquo;Amen!&rsquo;..."
                            value={commentInputs[prayer.id] || ''}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [prayer.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddComment(prayer.id);
                              }
                            }}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                          />
                          <button
                            onClick={() => handleAddComment(prayer.id)}
                            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ANSWERED PRAYERS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'answered' && (
        <div className="space-y-4">
          {/* Answered Celebration Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">God Hears &amp; Answers Every Prayer</h3>
                <p className="text-xs text-slate-400">
                  {answeredPrayers.length} prayers celebrated and answered across our VBT community!
                </p>
              </div>
            </div>

            <button
              onClick={triggerCelebration}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Celebrate All Answered</span>
            </button>
          </div>

          {visibleAnsweredPrayers.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Answered Prayers Found</h3>
              <p className="text-xs text-slate-400">
                When prayers are answered, mark them answered from the Prayer Wall to celebrate God&rsquo;s glory here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleAnsweredPrayers.map((prayer) => {
                const categoryObj = PRAYER_CATEGORIES.find((c) => c.id === prayer.category) || PRAYER_CATEGORIES[0];
                const hasRejoiced = (prayer.rejoicedUserIds || []).includes(currentUserId);

                return (
                  <div
                    key={prayer.id}
                    className="rounded-2xl p-5 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-900 border border-emerald-500/30 shadow-lg flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Answered by Grace</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                            categoryObj.badgeBg || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span>{categoryObj.icon}</span>
                          <span>{categoryObj.label}</span>
                        </span>
                      </div>

                      {/* Original Prayer Title */}
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight leading-snug">
                          {prayer.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          <span className="font-semibold text-slate-300">Original Request: </span>
                          {prayer.content || prayer.description}
                        </p>
                      </div>

                      {/* Testimony Story Callout Box */}
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Testimony / How God Answered:</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic">
                          &ldquo;{prayer.answerNote || prayer.testimony || 'God answered this prayer abundantly!'}&rdquo;
                        </p>
                      </div>

                      {/* Answered Date & Prayer Count */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Answered {formatRelativeTime(prayer.answeredAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-rose-400">
                          <Heart className="w-3.5 h-3.5 fill-rose-500" />
                          <span>{prayer.prayerCount || 0} saints prayed</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleRejoiceClick(prayer.id, true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all transform active:scale-95 ${
                          hasRejoiced
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Smile className="w-3.5 h-3.5 text-amber-400" />
                        <span>Amen! Praise God</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-extrabold">
                          {prayer.rejoiceCount || 1}
                        </span>
                      </button>

                      <button
                        onClick={() => handleShare(prayer.title, prayer.answerNote || prayer.testimony)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        {copiedId === prayer.title ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>Share Blessing</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMMUNITY TESTIMONIES FEED                                        */}
      {/* ========================================================================= */}
      {activeTab === 'testimonies' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Praise &amp; Blessings Wall</h3>
                <p className="text-xs text-slate-400">
                  Sharing the wondrous deeds of God and miracles across our sports camp family.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                setTestimonyModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Share Testimony</span>
            </button>
          </div>

          {visibleTestimonies.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 space-y-3">
              <Sparkles className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Testimonies Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Has God done something wonderful in your life or during camp sports? Share it to encourage others!
              </p>
              <button
                onClick={() => setTestimonyModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Write a Praise Report</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleTestimonies.map((testimony) => {
                const categoryObj = PRAYER_CATEGORIES.find((c) => c.id === testimony.category) || PRAYER_CATEGORIES[0];
                const hasRejoiced = (testimony.rejoicedUserIds || []).includes(currentUserId);

                return (
                  <div
                    key={testimony.id}
                    className="rounded-2xl p-5 bg-gradient-to-br from-amber-950/20 via-slate-900/90 to-slate-900 border border-amber-500/30 shadow-xl flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Blessing &amp; Glory</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                            categoryObj.badgeBg || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <span>{categoryObj.icon}</span>
                          <span>{categoryObj.label}</span>
                        </span>
                      </div>

                      {/* Testimony Title & Story */}
                      <div>
                        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                          {testimony.title}
                        </h4>
                        <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {testimony.content || testimony.story}
                        </p>
                      </div>

                      {/* Author & Timestamp */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                            {testimony.authorName?.[0]?.toUpperCase() || 'V'}
                          </div>
                          <span className="font-semibold text-slate-300">{testimony.authorName}</span>
                          {testimony.authorRole && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 uppercase font-medium">
                              {testimony.authorRole}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>{formatRelativeTime(testimony.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <button
                        onClick={() => handleRejoiceClick(testimony.id, false)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all transform active:scale-95 ${
                          hasRejoiced
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Smile className="w-4 h-4 text-amber-400" />
                        <span>Amen! Rejoice</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200 text-[10px] font-black">
                          {testimony.rejoiceCount || 1}
                        </span>
                      </button>

                      <button
                        onClick={() => handleShare(testimony.title, testimony.content || testimony.story)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        {copiedId === testimony.title ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5" />
                        )}
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: POST PRAYER REQUEST                                             */}
      {/* ========================================================================= */}
      {postModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Post Prayer Request</h3>
                  <p className="text-xs text-slate-400">Share your need with our praying family</p>
                </div>
              </div>
              <button
                onClick={() => setPostModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePostPrayerSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Request Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Healing for ankle injury before Friday final..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRAYER_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border text-left transition-colors ${
                        newCategory === cat.id
                          ? 'bg-rose-500/20 border-rose-500 text-white font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Details Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Details &amp; Prayer Needs <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share the details so brothers and sisters know specifically how to pray..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* Urgent Toggle */}
              <div
                onClick={() => setNewIsUrgent((prev) => !prev)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  newIsUrgent
                    ? 'bg-rose-950/40 border-rose-500/60'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Flame className={`w-4 h-4 ${newIsUrgent ? 'text-rose-400 fill-rose-500 animate-pulse' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-white">Mark as Urgent Prayer</div>
                    <div className="text-[11px] text-slate-400">Needs immediate prayer support and attention</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newIsUrgent}
                  onChange={() => {}}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </div>

              {/* Anonymous Option */}
              <div
                onClick={() => setNewIsAnonymous((prev) => !prev)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  newIsAnonymous
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Post Anonymously</div>
                    <div className="text-[11px] text-slate-400">
                      Your name will be masked as &ldquo;Anonymous VBT Member&rdquo;
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newIsAnonymous}
                  onChange={() => {}}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
              </div>

              {/* Privacy Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Privacy &amp; Visibility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPrivacy('COMMUNITY')}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-left transition-colors ${
                      newPrivacy === 'COMMUNITY'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Community Wall</div>
                      <div className="text-[11px] text-slate-400">Visible to all camp members and servants</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPrivacy('LEADERS_ONLY')}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-left transition-colors ${
                      newPrivacy === 'LEADERS_ONLY'
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Leaders &amp; Priests Only</div>
                      <div className="text-[11px] text-slate-400">Confidential pastoral prayer support</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPostModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all transform active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4 fill-white" />
                  )}
                  <span>Post to Prayer Wall</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CELEBRATE / MARK PRAYER ANSWERED                                 */}
      {/* ========================================================================= */}
      {answeringPrayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Celebrate Answered Prayer</h3>
                  <p className="text-xs text-slate-400">Give God the glory and encourage your brothers &amp; sisters</p>
                </div>
              </div>
              <button
                onClick={() => setAnsweringPrayer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prayer Preview */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Original Request:</div>
              <div className="text-sm font-bold text-white">{answeringPrayer.title}</div>
              <div className="text-xs text-slate-300 line-clamp-2">{answeringPrayer.content || answeringPrayer.description}</div>
            </div>

            {/* Form */}
            <form onSubmit={handleAnswerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Testimony / How God Answered <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share the testimony of what God has done, the healing, provision, peace, or victory..."
                  value={answerTestimonyText}
                  onChange={(e) => setAnswerTestimonyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Publish to Testimonies feed checkbox */}
              <div
                onClick={() => setAnswerPublishToTestimonies((prev) => !prev)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  answerPublishToTestimonies
                    ? 'bg-emerald-950/30 border-emerald-500/50'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Publish to Community Testimonies</div>
                    <div className="text-[11px] text-slate-400">Feature on the praise wall for all members to rejoice</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={answerPublishToTestimonies}
                  onChange={() => {}}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAnsweringPrayer(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all transform active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Praise God &amp; Mark Answered ✨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SHARE DIRECT TESTIMONY                                           */}
      {/* ========================================================================= */}
      {testimonyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/40 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Share a Community Testimony</h3>
                  <p className="text-xs text-slate-400">Proclaim God&rsquo;s blessing and goodness at VBT</p>
                </div>
              </div>
              <button
                onClick={() => setTestimonyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDirectTestimonySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Blessing / Testimony Title <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Volleyball sportsmanship miracle / God's provision..."
                  value={newTestimonyTitle}
                  onChange={(e) => setNewTestimonyTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRAYER_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewTestimonyCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border text-left transition-colors ${
                        newTestimonyCategory === cat.id
                          ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  The Story of God&rsquo;s Goodness <span className="text-amber-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share what happened, how God touched you or your team, and the blessing received..."
                  value={newTestimonyContent}
                  onChange={(e) => setNewTestimonyContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Anonymous Option */}
              <div
                onClick={() => setNewTestimonyAnonymous((prev) => !prev)}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  newTestimonyAnonymous
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Share Anonymously</div>
                    <div className="text-[11px] text-slate-400">Post as &ldquo;Anonymous Camp Member&rdquo;</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newTestimonyAnonymous}
                  onChange={() => {}}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTestimonyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-slate-950" />
                  )}
                  <span>Publish Testimony</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Quick Footer Stats */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/30" />
            <span>
              {activePrayers.reduce((acc, p) => acc + (p.prayerCount || 0), 0)} Prayers Lifted
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{answeredPrayers.length} Prayers Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Community United in Faith</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          VBT Sports Camp • Faith, Service &amp; Fellowship
        </div>
      </div>
    </div>
  );
}
