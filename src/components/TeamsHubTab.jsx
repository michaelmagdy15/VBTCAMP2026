import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Users,
  Trophy,
  Flame,
  Plus,
  Search,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  UserPlus,
  UserMinus,
  X,
  Filter,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  subscribeToTeams,
  createTeam,
  updateTeam,
  subscribeToGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  DEFAULT_COMMUNITY_ID,
} from '../services/teamGroupService';

// ── DEFAULT FALLBACK / SEED DATASETS ─────────────────────────────────────────

const DEFAULT_SPORTS_TEAMS = [
  {
    id: 'team_tigers',
    name: 'Tigers',
    code: 'tigers',
    division: 'Varsity Division',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.1) 100%)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    colorBadge: 'Gold / Amber',
    motto: 'Fear the Roar: Bold in Spirit, Strong in Faith',
    leaderName: 'Coach Mina Shenouda',
    captain: 'Kyrollos M.',
    wins: 7,
    losses: 2,
    ties: 1,
    points: 285,
    rank: 1,
    fairPlayStars: 5,
    roster: [
      { id: 't1', name: 'Kyrollos M.', number: '7', role: 'Captain / Point Guard', points: 42 },
      { id: 't2', name: 'Mina Shenouda', number: '10', role: 'Head Coach / Forward', points: 38 },
      { id: 't3', name: 'Mark Shenouda', number: '23', role: 'Shooting Guard', points: 54 },
      { id: 't4', name: 'David Anton', number: '11', role: 'Center / Rebounder', points: 28 },
      { id: 't5', name: 'George Hanna', number: '3', role: 'Defensive Specialist', points: 19 },
      { id: 't6', name: 'Bishoy Kamal', number: '15', role: 'Power Forward', points: 22 },
      { id: 't7', name: 'Fady Nabil', number: '8', role: 'Guard', points: 14 },
      { id: 't8', name: 'Anthony Malak', number: '33', role: 'Forward', points: 30 },
    ],
  },
  {
    id: 'team_lions',
    name: 'Lions',
    code: 'lions',
    division: 'Varsity Division',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(29, 78, 216, 0.1) 100%)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    colorBadge: 'Royal Blue',
    motto: 'Courage of Judah: Standing United, Playing with Grace',
    leaderName: 'Coach Peter Youssef',
    captain: 'Andrew Aziz',
    wins: 6,
    losses: 3,
    ties: 1,
    points: 260,
    rank: 2,
    fairPlayStars: 5,
    roster: [
      { id: 'l1', name: 'Andrew Aziz', number: '1', role: 'Captain / Playmaker', points: 46 },
      { id: 'l2', name: 'Peter Youssef', number: '21', role: 'Servant Coach / Forward', points: 32 },
      { id: 'l3', name: 'Michael Magdy', number: '9', role: 'Shooting Guard', points: 48 },
      { id: 'l4', name: 'Youhanna Beshay', number: '14', role: 'Center', points: 36 },
      { id: 'l5', name: 'Matthew Guirguis', number: '24', role: 'Small Forward', points: 27 },
      { id: 'l6', name: 'Daniel Rofail', number: '5', role: 'Point Guard', points: 21 },
      { id: 'l7', name: 'Kirollos Ayoub', number: '12', role: 'Defender', points: 18 },
    ],
  },
  {
    id: 'team_eagles',
    name: 'Eagles',
    code: 'eagles',
    division: 'Junior Varsity',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 100%)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    colorBadge: 'Emerald Green',
    motto: 'Soaring on Wings of Faith: Rising Above Every Challenge',
    leaderName: 'Coach John Erian',
    captain: 'Youssef Talaat',
    wins: 5,
    losses: 4,
    ties: 1,
    points: 235,
    rank: 3,
    fairPlayStars: 4,
    roster: [
      { id: 'e1', name: 'Youssef Talaat', number: '2', role: 'Captain / Striker', points: 39 },
      { id: 'e2', name: 'John Erian', number: '13', role: 'Head Coach', points: 25 },
      { id: 'e3', name: 'Samir Rizk', number: '18', role: 'Winger', points: 31 },
      { id: 'e4', name: 'Thomas Shenouda', number: '6', role: 'Midfielder', points: 22 },
      { id: 'e5', name: 'Pearly George', number: '4', role: 'Libero / Defense', points: 16 },
      { id: 'e6', name: 'Martin Fahmy', number: '17', role: 'Goalkeeper / Anchor', points: 12 },
    ],
  },
  {
    id: 'team_sharks',
    name: 'Sharks',
    code: 'sharks',
    division: 'Junior Varsity',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(14, 116, 144, 0.1) 100%)',
    borderColor: 'rgba(6, 182, 212, 0.35)',
    colorBadge: 'Ocean Cyan',
    motto: 'Relentless Energy: Fast, Focused, and Full of Heart',
    leaderName: 'Coach Steven Halim',
    captain: 'Bassem Adel',
    wins: 5,
    losses: 5,
    ties: 0,
    points: 220,
    rank: 4,
    fairPlayStars: 5,
    roster: [
      { id: 's1', name: 'Bassem Adel', number: '4', role: 'Captain / Fast Break', points: 41 },
      { id: 's2', name: 'Steven Halim', number: '19', role: 'Head Coach', points: 20 },
      { id: 's3', name: 'Joseph Mounir', number: '88', role: 'Power Forward', points: 34 },
      { id: 's4', name: 'Paul Gerges', number: '16', role: 'Guard', points: 24 },
      { id: 's5', name: 'Luke Wafik', number: '77', role: 'Center', points: 28 },
      { id: 's6', name: 'Karim Zaki', number: '0', role: 'Defender', points: 15 },
    ],
  },
  {
    id: 'team_falcons',
    name: 'Falcons',
    code: 'falcons',
    division: 'High School Division',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.1) 100%)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    colorBadge: 'Crimson Red',
    motto: 'Swift as Lightning, Resilient in Defeat, Humble in Victory',
    leaderName: 'Coach Daniel Mansour',
    captain: 'Monica B.',
    wins: 4,
    losses: 5,
    ties: 1,
    points: 195,
    rank: 5,
    fairPlayStars: 4,
    roster: [
      { id: 'f1', name: 'Monica B.', number: '5', role: 'Captain / Point Guard', points: 35 },
      { id: 'f2', name: 'Daniel Mansour', number: '20', role: 'Head Coach', points: 18 },
      { id: 'f3', name: 'Sherif Salib', number: '99', role: 'Forward', points: 29 },
      { id: 'f4', name: 'Sandra Nashed', number: '8', role: 'Shooting Guard', points: 24 },
    ],
  },
  {
    id: 'team_wolves',
    name: 'Wolves',
    code: 'wolves',
    division: 'High School Division',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(126, 34, 206, 0.1) 100%)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    colorBadge: 'Royal Purple',
    motto: 'The Strength of the Pack: One Heart, One Court, One Spirit',
    leaderName: 'Coach Kerolos Wahba',
    captain: 'Miriam G.',
    wins: 3,
    losses: 6,
    ties: 1,
    points: 180,
    rank: 6,
    fairPlayStars: 5,
    roster: [
      { id: 'w1', name: 'Miriam G.', number: '11', role: 'Captain / Midfielder', points: 30 },
      { id: 'w2', name: 'Kerolos Wahba', number: '22', role: 'Head Coach', points: 16 },
      { id: 'w3', name: 'Remon Shawky', number: '31', role: 'Forward', points: 26 },
      { id: 'w4', name: 'Marina Samir', number: '6', role: 'Defense', points: 15 },
    ],
  },
];

const DEFAULT_FELLOWSHIP_CIRCLES = [
  {
    id: 'circle_worship',
    name: 'Praise & Worship Circle',
    category: 'Worship & Chanting',
    color: '#f59e0b',
    purpose:
      'Guiding the camp assembly in spiritual chants, hymnology, morning & evening praise, and preparing musical reflections before sports tournaments.',
    schedule: 'Fridays 6:00 PM – 7:00 PM (Weekly)',
    location: 'Upper Room Sanctuary & Main Hall',
    leaderName: 'Deacon Bishoy & Mary Habib',
    memberIds: ['u_demo_1', 'u_demo_2', 'u_demo_3'],
    maxMembers: 30,
  },
  {
    id: 'circle_operations',
    name: 'Logistics & Tournament Operations',
    category: 'Operations & Logistics',
    color: '#3b82f6',
    purpose:
      'Coordinating match timing clocks, ball management, hydration refilling, court boundary prep, digital scorekeeping, and crowd safety.',
    schedule: 'Fridays 5:30 PM & Saturdays 9:00 AM',
    location: 'Tournament Central Desk (Courtside)',
    leaderName: 'Mina Shenouda & Hany Raouf',
    memberIds: ['u_demo_4', 'u_demo_5'],
    maxMembers: 40,
  },
  {
    id: 'circle_prayer',
    name: 'Spiritual Counseling & Prayer Huddle',
    category: 'Spiritual Care & Prayer',
    color: '#10b981',
    purpose:
      'Providing intercessory prayer before tip-off, post-game devotional debriefs, and welcoming pastoral listening spaces for campers during rest breaks.',
    schedule: 'Saturdays 8:30 AM – 9:30 AM & Post-Match',
    location: 'Youth Center Room 204',
    leaderName: 'Abouna Advisor & Servant Christine',
    memberIds: ['u_demo_6'],
    maxMembers: 25,
  },
  {
    id: 'circle_media',
    name: 'Media, Photo Feed & Broadcasting',
    category: 'Media & Production',
    color: '#06b6d4',
    purpose:
      'Capturing tournament action photography, highlight reels, live scoreboard broadcasting, gym audio mixing, and camp memories for families.',
    schedule: 'Continuous Tournament Blocks',
    location: 'Media Booth & Audio Mixing Station',
    leaderName: 'Michael Magdy & Peter N.',
    memberIds: [],
    maxMembers: 20,
  },
  {
    id: 'circle_mentors',
    name: 'Youth Mentors & Huddle Leaders',
    category: 'Youth Mentorship',
    color: '#a855f7',
    purpose:
      'Walking alongside Junior High and High School athletes through small group faith discussions, character building, sportsmanship mentoring, and fellowship.',
    schedule: 'Sundays 1:00 PM – 2:30 PM',
    location: 'Fellowship Pergola / Classrooms',
    leaderName: 'Andrew Aziz & George Adel',
    memberIds: [],
    maxMembers: 30,
  },
  {
    id: 'circle_safety',
    name: 'First Aid, Safety & Hydration Crew',
    category: 'Health & Safety',
    color: '#ef4444',
    purpose:
      'Ensuring athlete wellness, rapid ice and taping support for athletic injuries, monitoring hydration levels, and maintaining court first aid readiness.',
    schedule: 'Active During All Match Blocks',
    location: 'Medical Station (Gym Locker Wing)',
    leaderName: 'Dr. Marina Fayez & Nurse Sarah',
    memberIds: [],
    maxMembers: 15,
  },
];

const COLOR_PRESETS = [
  { name: 'Amber / Gold', hex: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.1) 100%)', border: 'rgba(245, 158, 11, 0.35)' },
  { name: 'Royal Blue', hex: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(29, 78, 216, 0.1) 100%)', border: 'rgba(59, 130, 246, 0.35)' },
  { name: 'Emerald Green', hex: '#10b981', gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 100%)', border: 'rgba(16, 185, 129, 0.35)' },
  { name: 'Ocean Cyan', hex: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(14, 116, 144, 0.1) 100%)', border: 'rgba(6, 182, 212, 0.35)' },
  { name: 'Crimson Red', hex: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.1) 100%)', border: 'rgba(239, 68, 68, 0.35)' },
  { name: 'Royal Purple', hex: '#a855f7', gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(126, 34, 206, 0.1) 100%)', border: 'rgba(168, 85, 247, 0.35)' },
];

export default function TeamsHubTab({
  currentUser,
  currentUserProfile,
  isAdmin = false,
  isLeader = false,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  // Navigation: 'sports' | 'fellowship'
  const [activeTab, setActiveTab] = useState('sports');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sportsDivisionFilter, setSportsDivisionFilter] = useState('all');
  const [fellowshipCategoryFilter, setFellowshipCategoryFilter] = useState('all');

  // Datasets
  const [teams, setTeams] = useState(DEFAULT_SPORTS_TEAMS);
  const [circles, setCircles] = useState(DEFAULT_FELLOWSHIP_CIRCLES);

  // UI States
  const [expandedRosters, setExpandedRosters] = useState({});
  const [expandedCircles, setExpandedCircles] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(null); // team object or null

  // Form states for creating team
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamDivision, setNewTeamDivision] = useState('Varsity Division');
  const [newTeamMotto, setNewTeamMotto] = useState('');
  const [newTeamCoach, setNewTeamCoach] = useState('');
  const [newTeamCaptain, setNewTeamCaptain] = useState('');
  const [newTeamColorIdx, setNewTeamColorIdx] = useState(0);

  // Form states for creating circle
  const [newCircleName, setNewCircleName] = useState('');
  const [newCircleCategory, setNewCircleCategory] = useState('Worship & Chanting');
  const [newCirclePurpose, setNewCirclePurpose] = useState('');
  const [newCircleSchedule, setNewCircleSchedule] = useState('');
  const [newCircleLocation, setNewCircleLocation] = useState('');
  const [newCircleLeader, setNewCircleLeader] = useState('');

  // Form states for adding player to roster
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('Athlete');

  // Current user identification for membership and "My Team" matching
  const currentUserId = useMemo(() => {
    return (
      currentUserProfile?.id ||
      currentUser?.uid ||
      currentUser?.memberId ||
      currentUser?.servantPhone ||
      currentUser?.name ||
      'anon_user'
    );
  }, [currentUser, currentUserProfile]);

  const currentUserName = useMemo(() => {
    return (
      currentUserProfile?.displayName ||
      currentUserProfile?.firstName ||
      currentUser?.name ||
      'Servant'
    );
  }, [currentUser, currentUserProfile]);

  // Show auto-dismiss toast
  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage('');
    }, 3800);
    return () => clearTimeout(timer);
  }, []);

  // ── FIREBASE REALTIME SUBSCRIPTION ─────────────────────────────────────────

  useEffect(() => {
    const unsubTeams = subscribeToTeams(communityId, (fetched) => {
      if (Array.isArray(fetched) && fetched.length > 0) {
        // Merge fetched teams with default visual fields (gradients, rosters) if missing
        const merged = fetched.map((item, idx) => {
          const defaultMatch = DEFAULT_SPORTS_TEAMS.find(
            (dt) => dt.id === item.id || dt.code === item.code || dt.name.toLowerCase() === item.name?.toLowerCase()
          );
          const colorObj = COLOR_PRESETS.find((cp) => cp.hex === item.color) || COLOR_PRESETS[idx % COLOR_PRESETS.length];

          return {
            ...defaultMatch,
            ...item,
            id: item.id || defaultMatch?.id || `team_${idx}`,
            name: item.name || defaultMatch?.name || 'Unnamed Team',
            code: item.code || defaultMatch?.code || item.name?.toLowerCase() || 'team',
            division: item.division || defaultMatch?.division || 'Varsity Division',
            color: item.color || defaultMatch?.color || colorObj.hex,
            gradient: item.gradient || defaultMatch?.gradient || colorObj.gradient,
            borderColor: item.borderColor || defaultMatch?.borderColor || colorObj.border,
            colorBadge: item.colorBadge || defaultMatch?.colorBadge || colorObj.name,
            motto: item.motto || defaultMatch?.motto || 'Faith & Sportsmanship',
            leaderName: item.leaderName || defaultMatch?.leaderName || 'Coach',
            captain: item.captain || defaultMatch?.captain || 'Captain',
            wins: typeof item.wins === 'number' ? item.wins : (defaultMatch?.wins || 0),
            losses: typeof item.losses === 'number' ? item.losses : (defaultMatch?.losses || 0),
            ties: typeof item.ties === 'number' ? item.ties : (defaultMatch?.ties || 0),
            points: typeof item.points === 'number' ? item.points : (defaultMatch?.points || 0),
            rank: typeof item.rank === 'number' ? item.rank : (idx + 1),
            roster: Array.isArray(item.roster) && item.roster.length > 0 ? item.roster : (defaultMatch?.roster || []),
          };
        });
        merged.sort((a, b) => (a.rank || 99) - (b.rank || 99));
        setTeams(merged);
      }
    });

    const unsubGroups = subscribeToGroups(communityId, (fetched) => {
      if (Array.isArray(fetched) && fetched.length > 0) {
        const merged = fetched.map((item, idx) => {
          const defaultMatch = DEFAULT_FELLOWSHIP_CIRCLES.find(
            (dc) => dc.id === item.id || dc.name.toLowerCase() === item.name?.toLowerCase()
          );
          return {
            ...defaultMatch,
            ...item,
            id: item.id || defaultMatch?.id || `circle_${idx}`,
            name: item.name || defaultMatch?.name || 'Fellowship Circle',
            category: item.category || defaultMatch?.category || 'Worship & Chanting',
            color: item.color || defaultMatch?.color || '#3b82f6',
            purpose: item.description || item.purpose || defaultMatch?.purpose || 'Faith and service fellowship.',
            schedule: item.schedule || defaultMatch?.schedule || 'Weekly Gathering',
            location: item.location || item.meetingLocation || defaultMatch?.location || 'Sanctuary & Courts',
            leaderName: item.leaderName || defaultMatch?.leaderName || 'Servant in Charge',
            memberIds: Array.isArray(item.memberIds)
              ? item.memberIds
              : Array.isArray(item.members)
              ? item.members
              : (defaultMatch?.memberIds || []),
          };
        });
        setCircles(merged);
      }
    });

    return () => {
      if (typeof unsubTeams === 'function') unsubTeams();
      if (typeof unsubGroups === 'function') unsubGroups();
    };
  }, [communityId]);

  // ── TOGGLE ROSTER DRAWER ───────────────────────────────────────────────────

  const toggleRoster = useCallback((teamId) => {
    setExpandedRosters((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  }, []);

  const toggleCircleMembers = useCallback((circleId) => {
    setExpandedCircles((prev) => ({
      ...prev,
      [circleId]: !prev[circleId],
    }));
  }, []);

  // ── JOIN / LEAVE FELLOWSHIP CIRCLE ACTION ──────────────────────────────────

  const handleToggleJoinCircle = useCallback(
    async (circle) => {
      const currentList = Array.isArray(circle.memberIds) ? circle.memberIds : [];
      const isJoined = currentList.includes(currentUserId);
      const updatedMembers = isJoined
        ? currentList.filter((id) => id !== currentUserId)
        : [...currentList, currentUserId];

      // Optimistic state update
      setCircles((prev) =>
        prev.map((c) =>
          c.id === circle.id ? { ...c, memberIds: updatedMembers } : c
        )
      );

      triggerToast(
        isJoined
          ? `You have left ${circle.name}.`
          : `You joined ${circle.name}! Welcome to the circle.`
      );

      // Persist to Firestore service
      try {
        if (isJoined) {
          await leaveGroup(communityId, circle.id, currentUserId);
        } else {
          await joinGroup(communityId, circle.id, currentUserId);
        }
      } catch (error) {
        console.warn('[TeamsHubTab] Group membership sync notice:', error);
      }
    },
    [communityId, currentUserId, triggerToast]
  );

  // ── CREATE NEW SPORTS TEAM (LEADER / ADMIN) ────────────────────────────────

  const handleCreateTeamSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newTeamName.trim()) return;

      const colorData = COLOR_PRESETS[newTeamColorIdx] || COLOR_PRESETS[0];
      const teamId = `team_${Date.now()}`;
      const code = (newTeamCode.trim() || newTeamName.trim()).toLowerCase().replace(/\s+/g, '_');

      const createdTeam = {
        id: teamId,
        name: newTeamName.trim(),
        code,
        division: newTeamDivision,
        color: colorData.hex,
        gradient: colorData.gradient,
        borderColor: colorData.border,
        colorBadge: colorData.name,
        motto: newTeamMotto.trim() || 'Unity, Passion, and Fellowship in Faith',
        leaderName: newTeamCoach.trim() || currentUserName,
        captain: newTeamCaptain.trim() || 'TBD',
        wins: 0,
        losses: 0,
        ties: 0,
        points: 0,
        rank: teams.length + 1,
        fairPlayStars: 5,
        roster: [
          {
            id: `p_${Date.now()}`,
            name: newTeamCaptain.trim() || currentUserName,
            number: '1',
            role: 'Captain',
            points: 0,
          },
        ],
      };

      // Optimistic update
      setTeams((prev) => [...prev, createdTeam]);
      setShowCreateTeamModal(false);
      triggerToast(`Team "${createdTeam.name}" successfully created!`);

      // Reset form
      setNewTeamName('');
      setNewTeamCode('');
      setNewTeamMotto('');
      setNewTeamCoach('');
      setNewTeamCaptain('');

      // Persist via service
      try {
        await createTeam(communityId, createdTeam);
      } catch (err) {
        console.warn('[TeamsHubTab] Notice saving created team:', err);
      }
    },
    [
      communityId,
      currentUserName,
      newTeamCaptain,
      newTeamCoach,
      newTeamCode,
      newTeamColorIdx,
      newTeamDivision,
      newTeamMotto,
      newTeamName,
      teams.length,
      triggerToast,
    ]
  );

  // ── CREATE NEW FELLOWSHIP CIRCLE (LEADER / ADMIN) ──────────────────────────

  const handleCreateCircleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!newCircleName.trim()) return;

      const circleId = `circle_${Date.now()}`;
      const createdCircle = {
        id: circleId,
        name: newCircleName.trim(),
        category: newCircleCategory,
        color: '#3b82f6',
        description:
          newCirclePurpose.trim() ||
          'Dedicated to building up members in prayer, teamwork, and service excellence.',
        schedule: newCircleSchedule.trim() || 'Weekly Meeting (TBD)',
        location: newCircleLocation.trim() || 'Main Sanctuary & Sports Center',
        leaderName: newCircleLeader.trim() || currentUserName,
        memberIds: [currentUserId],
        maxMembers: 30,
      };

      setCircles((prev) => [...prev, createdCircle]);
      setShowCreateCircleModal(false);
      triggerToast(`Fellowship Circle "${createdCircle.name}" created!`);

      // Reset form
      setNewCircleName('');
      setNewCirclePurpose('');
      setNewCircleSchedule('');
      setNewCircleLocation('');
      setNewCircleLeader('');

      // Persist via service
      try {
        await createGroup(communityId, createdCircle);
      } catch (err) {
        console.warn('[TeamsHubTab] Notice saving created circle:', err);
      }
    },
    [
      communityId,
      currentUserId,
      currentUserName,
      newCircleCategory,
      newCircleLeader,
      newCircleLocation,
      newCircleName,
      newCirclePurpose,
      newCircleSchedule,
      triggerToast,
    ]
  );

  // ── ADD ATHLETE TO TEAM ROSTER ─────────────────────────────────────────────

  const handleAddPlayerSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!showAddPlayerModal || !newPlayerName.trim()) return;

      const newPlayer = {
        id: `ply_${Date.now()}`,
        name: newPlayerName.trim(),
        number: newPlayerNumber.trim() || String(Math.floor(Math.random() * 99) + 1),
        role: newPlayerRole.trim() || 'Athlete',
        points: 0,
      };

      const targetTeam = showAddPlayerModal;
      const updatedRoster = [...(targetTeam.roster || []), newPlayer];

      setTeams((prev) =>
        prev.map((t) =>
          t.id === targetTeam.id ? { ...t, roster: updatedRoster } : t
        )
      );

      setShowAddPlayerModal(null);
      setNewPlayerName('');
      setNewPlayerNumber('');
      setNewPlayerRole('Athlete');
      triggerToast(`Added ${newPlayer.name} to ${targetTeam.name} roster!`);

      // Persist to team update
      try {
        await updateTeam(communityId, targetTeam.id, {
          ...targetTeam,
          roster: updatedRoster,
          memberCount: updatedRoster.length,
        });
      } catch (err) {
        console.warn('[TeamsHubTab] Notice saving roster update:', err);
      }
    },
    [
      communityId,
      newPlayerName,
      newPlayerNumber,
      newPlayerRole,
      showAddPlayerModal,
      triggerToast,
    ]
  );

  // ── FILTERED DATA ──────────────────────────────────────────────────────────

  const filteredTeams = useMemo(() => {
    let result = teams;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.motto && t.motto.toLowerCase().includes(q)) ||
          (t.leaderName && t.leaderName.toLowerCase().includes(q)) ||
          (t.captain && t.captain.toLowerCase().includes(q)) ||
          (t.roster && t.roster.some((p) => p.name.toLowerCase().includes(q)))
      );
    }

    // Division filter
    if (sportsDivisionFilter !== 'all') {
      result = result.filter((t) => t.division === sportsDivisionFilter);
    }

    return result;
  }, [teams, searchQuery, sportsDivisionFilter]);

  const filteredCircles = useMemo(() => {
    let result = circles;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.category && c.category.toLowerCase().includes(q)) ||
          (c.purpose && c.purpose.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.leaderName && c.leaderName.toLowerCase().includes(q)) ||
          (c.location && c.location.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (fellowshipCategoryFilter !== 'all') {
      if (fellowshipCategoryFilter === 'my_circles') {
        result = result.filter((c) => (c.memberIds || []).includes(currentUserId));
      } else {
        result = result.filter((c) => c.category === fellowshipCategoryFilter);
      }
    }

    return result;
  }, [circles, searchQuery, fellowshipCategoryFilter, currentUserId]);

  // Aggregate stats
  const totalAthletesCount = useMemo(() => {
    return teams.reduce((acc, t) => acc + (t.roster?.length || 0), 0);
  }, [teams]);

  const myJoinedCirclesCount = useMemo(() => {
    return circles.filter((c) => (c.memberIds || []).includes(currentUserId)).length;
  }, [circles, currentUserId]);

  // Helper to test if a team is "My Team"
  const isMyTeam = useCallback(
    (team) => {
      const userSide = (currentUser?.side || '').toLowerCase();
      const userTeamCode = (currentUser?.teamCode || '').toLowerCase();
      const userTeamName = (currentUser?.teamName || '').toLowerCase();
      const tCode = (team.code || '').toLowerCase();
      const tName = (team.name || '').toLowerCase();

      if (userTeamCode && (userTeamCode === tCode || userTeamCode === tName)) {
        return true;
      }
      if (userSide && (userSide === tCode || userSide === tName)) {
        return true;
      }
      if (userTeamName && userTeamName === tName) {
        return true;
      }

      // Check if current user's name is on this roster
      if (
        team.roster &&
        team.roster.some((p) => {
          const pName = (p.name || '').toLowerCase();
          const cName = currentUserName.toLowerCase();
          return pName === cName || (cName.length > 3 && pName.includes(cName));
        })
      ) {
        return true;
      }

      return false;
    },
    [currentUser, currentUserName]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingBottom: '40px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#0f172a',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
            borderRadius: '12px',
            padding: '12px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'var(--font-title)',
          }}
        >
          <Sparkles size={18} color="#38bdf8" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
          <button
            onClick={() => setToastMessage('')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              marginLeft: '8px',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── TOP HERO HEADER ──────────────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          borderRadius: '20px',
          background:
            'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '8px',
              }}
            >
              <Shield size={14} /> VBT Community Roster Hub
            </div>
            <h1
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: '#ffffff',
                fontFamily: 'var(--font-title)',
                lineHeight: 1.2,
              }}
            >
              Teams & Groups Hub
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginTop: '4px',
                maxWidth: '650px',
              }}
            >
              Explore camp athletic teams, standings, rosters, and discover
              spiritual fellowship & servant circles dedicated to building our church community.
            </p>
          </div>

          {/* Action button for Leaders / Admins */}
          {(isAdmin || isLeader) && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {activeTab === 'sports' ? (
                <button
                  onClick={() => setShowCreateTeamModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-title)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                  }}
                >
                  <Plus size={16} /> Create Team
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateCircleModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-title)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <Plus size={16} /> Create Circle
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SEGMENTED VIEW SWITCHER ───────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            marginTop: '24px',
            padding: '4px',
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '6px',
          }}
        >
          <button
            onClick={() => setActiveTab('sports')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              fontFamily: 'var(--font-title)',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'sports' ? '#3b82f6' : 'transparent',
              color: activeTab === 'sports' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow:
                activeTab === 'sports' ? '0 4px 12px rgba(59, 130, 246, 0.35)' : 'none',
            }}
          >
            <Trophy size={18} color={activeTab === 'sports' ? '#ffffff' : '#60a5fa'} />
            <span>Sports Teams</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor:
                  activeTab === 'sports' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
              }}
            >
              {teams.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fellowship')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              fontFamily: 'var(--font-title)',
              transition: 'all 0.2s ease',
              backgroundColor: activeTab === 'fellowship' ? '#10b981' : 'transparent',
              color: activeTab === 'fellowship' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow:
                activeTab === 'fellowship'
                  ? '0 4px 12px rgba(16, 185, 129, 0.35)'
                  : 'none',
            }}
          >
            <Flame
              size={18}
              color={activeTab === 'fellowship' ? '#ffffff' : '#34d399'}
            />
            <span>Fellowship & Servant Circles</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor:
                  activeTab === 'fellowship'
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
              }}
            >
              {circles.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search input */}
        <div
          style={{
            flex: '1 1 280px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder={
              activeTab === 'sports'
                ? 'Search teams, mottos, coaches, athletes...'
                : 'Search fellowship circles, schedules, leaders...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: '14px',
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dynamic Filters */}
        {activeTab === 'sports' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={sportsDivisionFilter}
              onChange={(e) => setSportsDivisionFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-title)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Divisions</option>
              <option value="Varsity Division">Varsity Division</option>
              <option value="Junior Varsity">Junior Varsity</option>
              <option value="High School Division">High School Division</option>
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select
              value={fellowshipCategoryFilter}
              onChange={(e) => setFellowshipCategoryFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-title)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Categories</option>
              <option value="my_circles">★ My Joined Circles ({myJoinedCirclesCount})</option>
              <option value="Worship & Chanting">Worship & Chanting</option>
              <option value="Operations & Logistics">Operations & Logistics</option>
              <option value="Spiritual Care & Prayer">Spiritual Care & Prayer</option>
              <option value="Media & Production">Media & Production</option>
              <option value="Youth Mentorship">Youth Mentorship</option>
              <option value="Health & Safety">Health & Safety</option>
            </select>
          </div>
        )}
      </div>

      {/* ── TAB CONTENT 1: SPORTS TEAMS VIEW ───────────────────────────────── */}
      {activeTab === 'sports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              className="glass-panel"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trophy size={20} color="#f59e0b" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Teams
                </p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {teams.length} Teams
                </p>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={20} color="#60a5fa" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Registered Athletes
                </p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {totalAthletesCount} Athletes
                </p>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={20} color="#10b981" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Leader on Points
                </p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                  {teams[0]?.name || 'Tigers'} ({teams[0]?.points || 0} pts)
                </p>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredTeams.map((team) => {
              const myTeamFlag = isMyTeam(team);
              const isRosterOpen = Boolean(expandedRosters[team.id]);
              const winRate =
                team.wins + team.losses > 0
                  ? Math.round((team.wins / (team.wins + team.losses + (team.ties || 0))) * 100)
                  : 0;

              return (
                <div
                  key={team.id}
                  className="glass-panel"
                  style={{
                    borderRadius: '20px',
                    background: team.gradient || 'rgba(15, 23, 42, 0.8)',
                    border: myTeamFlag
                      ? `2px solid ${team.color}`
                      : `1px solid ${team.borderColor || 'rgba(255, 255, 255, 0.1)'}`,
                    boxShadow: myTeamFlag
                      ? `0 0 24px ${team.color}33`
                      : '0 8px 24px rgba(0, 0, 0, 0.25)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* My Team Glowing Badge */}
                  {myTeamFlag && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: team.color,
                        color: '#000000',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        boxShadow: `0 2px 8px ${team.color}88`,
                      }}
                    >
                      <Sparkles size={12} /> My Team
                    </div>
                  )}

                  {/* Team Card Header: Mascot + Name + Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        backgroundColor: `${team.color}22`,
                        border: `2px solid ${team.color}66`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: team.color,
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        fontFamily: 'var(--font-title)',
                      }}
                    >
                      <Shield size={28} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2
                          style={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            fontFamily: 'var(--font-title)',
                            lineHeight: 1.1,
                          }}
                        >
                          {team.name}
                        </h2>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: `${team.color}22`,
                            color: team.color,
                            border: `1px solid ${team.color}44`,
                            textTransform: 'uppercase',
                          }}
                        >
                          #{team.rank || 1}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                          }}
                        >
                          {team.colorBadge} • {team.division}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Motto Quote */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderLeft: `3px solid ${team.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Flame size={16} color={team.color} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontStyle: 'italic',
                        color: '#f1f5f9',
                        lineHeight: 1.3,
                      }}
                    >
                      &quot;{team.motto}&quot;
                    </span>
                  </div>

                  {/* Leaders & Coaches */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      padding: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '14px',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Head Coach
                      </p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                        {team.leaderName}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Captain
                      </p>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                        {team.captain}
                      </p>
                    </div>
                  </div>

                  {/* Win / Loss Stats Dashboard */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Record
                      </span>
                      <p style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                        {team.wins}W - {team.losses}L - {team.ties || 0}T
                      </p>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Win Rate
                      </span>
                      <p style={{ fontSize: '1rem', fontWeight: 800, color: team.color, marginTop: '2px' }}>
                        {winRate}%
                      </p>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Camp Points
                      </span>
                      <p style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1, marginTop: '2px' }}>
                        {team.points}
                      </p>
                    </div>
                  </div>

                  {/* Members Roster Accordion Toggle */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <button
                        onClick={() => toggleRoster(team.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-title)',
                          padding: '4px 0',
                        }}
                      >
                        <Users size={16} color={team.color} />
                        <span>Team Roster ({team.roster?.length || 0})</span>
                        {isRosterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {/* Add Player (Leader/Admin) */}
                      {(isAdmin || isLeader) && (
                        <button
                          onClick={() => setShowAddPlayerModal(team)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={12} /> Add Player
                        </button>
                      )}
                    </div>

                    {/* Expandable Roster List */}
                    {isRosterOpen && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          paddingRight: '4px',
                        }}
                      >
                        {team.roster && team.roster.length > 0 ? (
                          team.roster.map((player) => (
                            <div
                              key={player.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                                border: '1px solid rgba(255, 255, 255, 0.04)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '8px',
                                    backgroundColor: `${team.color}33`,
                                    color: team.color,
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  #{player.number}
                                </span>
                                <div>
                                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                                    {player.name}
                                  </p>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {player.role}
                                  </span>
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: team.color,
                                }}
                              >
                                {player.points} pts
                              </span>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                            No athletes registered on this roster yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTeams.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
              }}
            >
              <Trophy size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No sports teams found matching your filter.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try clearing your search query or division selector.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT 2: FELLOWSHIP & SERVANT CIRCLES VIEW ─────────────────── */}
      {activeTab === 'fellowship' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Fellowship Overview Card */}
          <div
            className="glass-panel"
            style={{
              padding: '18px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                }}
              >
                <Users size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)' }}>
                  Spiritual Circles & Servant Marketplace
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Connect with small groups, tournament logistics crews, praise chanting, and prayer support.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Circles
                </span>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399' }}>
                  {circles.length}
                </p>
              </div>

              <div
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  You Joined
                </span>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                  {myJoinedCirclesCount}
                </p>
              </div>
            </div>
          </div>

          {/* Fellowship Circles Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredCircles.map((circle) => {
              const memberList = Array.isArray(circle.memberIds) ? circle.memberIds : [];
              const isJoined = memberList.includes(currentUserId);
              const isCircleDrawerOpen = Boolean(expandedCircles[circle.id]);

              return (
                <div
                  key={circle.id}
                  className="glass-panel"
                  style={{
                    borderRadius: '20px',
                    background: isJoined
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)'
                      : 'rgba(15, 23, 42, 0.75)',
                    border: isJoined
                      ? '2px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isJoined
                      ? '0 0 20px rgba(16, 185, 129, 0.2)'
                      : '0 8px 24px rgba(0, 0, 0, 0.2)',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    position: 'relative',
                  }}
                >
                  {/* Category Pill + Joined indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        backgroundColor: `${circle.color || '#3b82f6'}22`,
                        color: circle.color || '#38bdf8',
                        border: `1px solid ${circle.color || '#3b82f6'}44`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {circle.category}
                    </span>

                    {isJoined && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(16, 185, 129, 0.2)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        <Check size={12} /> Joined Member
                      </span>
                    )}
                  </div>

                  {/* Title & Purpose */}
                  <div>
                    <h3
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        fontFamily: 'var(--font-title)',
                      }}
                    >
                      {circle.name}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '8px',
                        lineHeight: 1.45,
                      }}
                    >
                      {circle.purpose || circle.description}
                    </p>
                  </div>

                  {/* Meeting Details */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <Clock size={15} color="#94a3b8" />
                      <span>{circle.schedule}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <MapPin size={15} color="#94a3b8" />
                      <span>{circle.location}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <Shield size={15} color="#94a3b8" />
                      <span>Leader: <strong>{circle.leaderName}</strong></span>
                    </div>
                  </div>

                  {/* Bottom Bar: Member Count + Join / Leave Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '14px',
                    }}
                  >
                    <button
                      onClick={() => toggleCircleMembers(circle.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <Users size={15} />
                      <span>{memberList.length} Servants</span>
                      <ExternalLink size={12} />
                    </button>

                    <button
                      onClick={() => handleToggleJoinCircle(circle)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: isJoined
                          ? '1px solid rgba(239, 68, 68, 0.4)'
                          : '1px solid rgba(16, 185, 129, 0.5)',
                        backgroundColor: isJoined
                          ? 'rgba(239, 68, 68, 0.15)'
                          : '#10b981',
                        color: isJoined ? '#f87171' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-title)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isJoined ? (
                        <>
                          <UserMinus size={15} /> Leave Circle
                        </>
                      ) : (
                        <>
                          <UserPlus size={15} /> Join Group
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expandable circle details */}
                  {isCircleDrawerOpen && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <p style={{ fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                        Circle Roster & Roles:
                      </p>
                      <p>
                        This circle is coordinated by {circle.leaderName}. Enrolled servants participate in pre-tournament briefings and dedicated service rotations.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredCircles.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-muted)',
              }}
            >
              <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600 }}>No fellowship circles match your filter.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try switching the category filter back to &quot;All Categories&quot;.</p>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE SPORTS TEAM ───────────────────────────────────────── */}
      {showCreateTeamModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)' }}>
                  Create New Sports Team
                </h3>
              </div>
              <button
                onClick={() => setShowCreateTeamModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cheetahs, Panthers, Spartans"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Team Code / Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. cheetahs"
                    value={newTeamCode}
                    onChange={(e) => setNewTeamCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Division / Grade
                  </label>
                  <select
                    value={newTeamDivision}
                    onChange={(e) => setNewTeamDivision(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Varsity Division">Varsity Division</option>
                    <option value="Junior Varsity">Junior Varsity</option>
                    <option value="High School Division">High School Division</option>
                  </select>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  Team Color Theme
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewTeamColorIdx(idx)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: newTeamColorIdx === idx ? `2px solid ${preset.hex}` : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: newTeamColorIdx === idx ? `${preset.hex}22` : 'rgba(30, 41, 59, 0.5)',
                        color: preset.hex,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: preset.hex,
                          display: 'inline-block',
                        }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Team Motto / War Cry
                </label>
                <input
                  type="text"
                  placeholder="e.g. Unshakable Faith, Unstoppable Heart"
                  value={newTeamMotto}
                  onChange={(e) => setNewTeamMotto(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Head Coach
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Coach Mina"
                    value={newTeamCoach}
                    onChange={(e) => setNewTeamCoach(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Team Captain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Andrew Aziz"
                    value={newTeamCaptain}
                    onChange={(e) => setNewTeamCaptain(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Save & Publish Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE FELLOWSHIP CIRCLE ─────────────────────────────────── */}
      {showCreateCircleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)' }}>
                  Create Fellowship Circle
                </h3>
              </div>
              <button
                onClick={() => setShowCreateCircleModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCircleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Circle Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audio Engineering Guild, Hospitality Crew"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={newCircleCategory}
                  onChange={(e) => setNewCircleCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Worship & Chanting">Worship & Chanting</option>
                  <option value="Operations & Logistics">Operations & Logistics</option>
                  <option value="Spiritual Care & Prayer">Spiritual Care & Prayer</option>
                  <option value="Media & Production">Media & Production</option>
                  <option value="Youth Mentorship">Youth Mentorship</option>
                  <option value="Health & Safety">Health & Safety</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Purpose / Calling Statement
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe how this circle serves the camp and glorifies God through sports & fellowship..."
                  value={newCirclePurpose}
                  onChange={(e) => setNewCirclePurpose(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Meeting Schedule
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fridays 6:30 PM"
                    value={newCircleSchedule}
                    onChange={(e) => setNewCircleSchedule(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Meeting Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chapel Annex Room 102"
                    value={newCircleLocation}
                    onChange={(e) => setNewCircleLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Circle Leader
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deacon Mina"
                  value={newCircleLeader}
                  onChange={(e) => setNewCircleLeader(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateCircleModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Create & Launch Circle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD PLAYER TO TEAM ROSTER ─────────────────────────────────── */}
      {showAddPlayerModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)' }}>
                  Add Athlete to {showAddPlayerModal.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Register athlete onto the official camp roster.
                </p>
              </div>
              <button
                onClick={() => setShowAddPlayerModal(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPlayerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Athlete Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Shenouda"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Jersey #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7"
                    value={newPlayerNumber}
                    onChange={(e) => setNewPlayerNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                    Position / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Point Guard, Striker"
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Add to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
