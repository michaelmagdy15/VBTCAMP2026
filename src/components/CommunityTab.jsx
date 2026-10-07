import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import {
  subscribeToMembers,
  searchMembers,
  createOrGetMemberProfile,
  COMMUNITY_ROLES,
  maskPhoneNumber,
} from '../services/memberService';
import { subscribeToCommunity } from '../services/communityService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';

const ROLE_BADGE_CONFIG = {
  admin: { label: 'Admin / Sports Head', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },
  coordinator: { label: 'Coordinator', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },
  service_leader: { label: 'Service Leader', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' },
  team_leader: { label: 'Team Leader', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
  leader: { label: 'Team Leader', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
  game_leader: { label: 'Game Leader', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
  referee: { label: 'Referee', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
  servant: { label: 'Servant', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },
  volunteer: { label: 'Volunteer', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)' },
  member: { label: 'Member', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.3)' },
};

export default function CommunityTab({
  currentUser,
  isAdmin = false,
  onSelectMember,
  onOpenMyProfile,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityConfig, setCommunityConfig] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // New Member Form State
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState(COMMUNITY_ROLES.MEMBER);
  const [submittingNew, setSubmittingNew] = useState(false);
  const [newMemberError, setNewMemberError] = useState('');

  // Subscribe to Community Config
  useEffect(() => {
    const unsub = subscribeToCommunity(DEFAULT_COMMUNITY_ID, (cfg) => {
      setCommunityConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Subscribe to Members
  useEffect(() => {
    const unsub = subscribeToMembers(DEFAULT_COMMUNITY_ID, (list) => {
      setMembers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    let result = members;

    // Search query filter
    if (searchQuery.trim()) {
      result = searchMembers(result, searchQuery);
    }

    // Role category filter
    if (selectedRoleFilter !== 'all') {
      if (selectedRoleFilter === 'leaders') {
        result = result.filter((m) =>
          ['admin', 'coordinator', 'team_leader', 'leader', 'game_leader', 'referee', 'service_leader'].includes(
            m.role
          )
        );
      } else if (selectedRoleFilter === 'servants') {
        result = result.filter((m) => m.role === 'servant');
      } else if (selectedRoleFilter === 'volunteers') {
        result = result.filter((m) => m.role === 'volunteer');
      } else if (selectedRoleFilter === 'members') {
        result = result.filter((m) => m.role === 'member' || !m.role);
      }
    }

    return result;
  }, [members, searchQuery, selectedRoleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = members.length;
    const leaders = members.filter((m) =>
      ['admin', 'coordinator', 'team_leader', 'leader', 'game_leader', 'service_leader'].includes(m.role)
    ).length;
    const servants = members.filter((m) => m.role === 'servant' || m.role === 'volunteer').length;
    return { total, leaders, servants };
  }, [members]);

  const handleCreateMember = async (e) => {
    e.preventDefault();
    const cleanPhone = newPhone.replace(/[^0-9+]/g, '').trim();
    if (!newFirstName.trim()) {
      setNewMemberError('First name is required');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 5) {
      setNewMemberError('Valid phone number is required');
      return;
    }

    setSubmittingNew(true);
    setNewMemberError('');

    try {
      const generatedMemberId = `vbt_m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await createOrGetMemberProfile(DEFAULT_COMMUNITY_ID, {
        memberId: generatedMemberId,
        phoneNumber: cleanPhone,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        role: newRole,
      });

      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      setNewRole(COMMUNITY_ROLES.MEMBER);
      setShowAddMemberModal(false);
    } catch (err) {
      console.error('[CommunityTab] Error creating member:', err);
      setNewMemberError(err.message || 'Failed to add member.');
    } finally {
      setSubmittingNew(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '16px 16px 80px',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Community Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
          borderRadius: 24,
          padding: '24px 28px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                Church Sports Community
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Year-Round Platform</span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                letterSpacing: '-0.02em',
                color: '#fff',
              }}
            >
              {communityConfig?.name || 'Value Blessings Team'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: '#94a3b8', maxWidth: 600, lineHeight: 1.5 }}>
              {communityConfig?.tagline || 'Faith, Service & Fellowship Through Sports'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {onOpenMyProfile && (
              <button
                type="button"
                onClick={onOpenMyProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 14,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={16} /> My Profile
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                <UserPlus size={16} /> Add Member
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 12,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Members</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 2 }}>{stats.total}</div>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leaders & Staff</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{stats.leaders}</div>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Servants & Vol.</span>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80', marginTop: 2 }}>{stats.servants}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: 260,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members by name, role, or sports interests..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: 14,
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { id: 'all', label: `All (${members.length})` },
            { id: 'leaders', label: 'Leaders' },
            { id: 'servants', label: 'Servants' },
            { id: 'volunteers', label: 'Volunteers' },
            { id: 'members', label: 'Members' },
          ].map((cat) => {
            const isSelected = selectedRoleFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedRoleFilter(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                  color: isSelected ? '#38bdf8' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Members Directory Grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={32} className="animate-spin" color="#38bdf8" />
          <p style={{ marginTop: 12, fontSize: 14, color: '#94a3b8' }}>Loading community directory...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: 20,
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <Users size={36} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>No members found</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8' }}>
            {searchQuery ? `No matches for "${searchQuery}". Try a different search term.` : 'No members registered in this category yet.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filteredMembers.map((member) => {
            const roleCfg = ROLE_BADGE_CONFIG[member.role] || ROLE_BADGE_CONFIG.member;
            const initials = (member.firstName?.[0] || member.displayName?.[0] || 'V').toUpperCase();
            const isSelf = currentUser && (currentUser.id === member.id || currentUser.memberId === member.id);

            return (
              <div
                key={member.id}
                onClick={() => onSelectMember && onSelectMember(member)}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: 20,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.2s ease',
                  cursor: onSelectMember ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top: Avatar and Role */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 800,
                        fontFamily: "'Outfit', sans-serif",
                        color: '#38bdf8',
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
                          {member.displayName || member.firstName || 'VBT Member'}
                        </span>
                        {isSelf && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 700 }}>
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                        {member.phoneNumberMasked || maskPhoneNumber(member.legacyServantPhone)}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: roleCfg.bg,
                      color: roleCfg.color,
                      border: `1px solid ${roleCfg.border}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {roleCfg.label}
                  </span>
                </div>

                {/* Bio snippet if available */}
                {member.bio && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: '#cbd5e1',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {member.bio}
                  </p>
                )}

                {/* Sports interests tags */}
                {member.sportsInterests && member.sportsInterests.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                    {member.sportsInterests.slice(0, 3).map((sport) => (
                      <span
                        key={sport}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#94a3b8',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        {sport}
                      </span>
                    ))}
                    {member.sportsInterests.length > 3 && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        +{member.sportsInterests.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal (Admin) */}
      {showAddMemberModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: '#0f172a',
              borderRadius: 24,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: 24,
              color: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserPlus size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Add Community Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {newMemberError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {newMemberError}
              </div>
            )}

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="Michael"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Mitry"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="01000680580"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  Initial Community Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value={COMMUNITY_ROLES.MEMBER}>Member</option>
                  <option value={COMMUNITY_ROLES.VOLUNTEER}>Volunteer</option>
                  <option value={COMMUNITY_ROLES.SERVANT}>Servant</option>
                  <option value={COMMUNITY_ROLES.TEAM_LEADER}>Team Leader</option>
                  <option value={COMMUNITY_ROLES.GAME_LEADER}>Game Leader / Referee</option>
                  <option value={COMMUNITY_ROLES.SERVICE_LEADER}>Service Day Leader</option>
                  <option value={COMMUNITY_ROLES.COORDINATOR}>Sports Head / Coordinator</option>
                  <option value={COMMUNITY_ROLES.ADMIN}>Community Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNew}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: submittingNew ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {submittingNew ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
