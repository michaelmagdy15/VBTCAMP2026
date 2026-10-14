import {
  Shield,
  Award,
  Users,
  Sparkles,
  Heart,
} from 'lucide-react';

/**
 * Standard Role Configurations for Badges & Styling
 */
export const ROLE_DASHBOARD_CONFIG = {
  admin: {
    key: 'admin',
    label: 'Admin / Director',
    rank: 'Director Level',
    badgeText: 'Admin Operations',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    accentColor: '#f43f5e',
    icon: Shield,
  },
  coordinator: {
    key: 'coordinator',
    label: 'Coordinator',
    rank: 'Lead Coordinator',
    badgeText: 'Service Coordinator',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    accentColor: '#f59e0b',
    icon: Award,
  },
  leader: {
    key: 'leader',
    label: 'Team Leader',
    rank: 'Team Shepherd',
    badgeText: 'Team Leadership',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    accentColor: '#3b82f6',
    icon: Users,
  },
  servant: {
    key: 'servant',
    label: 'Servant',
    rank: 'Faithful Servant',
    badgeText: 'Serving Duty',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    accentColor: '#06b6d4',
    icon: Sparkles,
  },
  member: {
    key: 'member',
    label: 'Community Member',
    rank: 'Valued Member',
    badgeText: 'Member Portal',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    accentColor: '#38bdf8',
    icon: Heart,
  },
};

/**
 * Normalize raw role strings into standard system roles.
 *
 * @param {string} rawRole
 * @returns {'admin'|'coordinator'|'leader'|'servant'|'member'|'guest'}
 */
export function normalizeUserRole(rawRole) {
  if (!rawRole) return 'member';
  const r = String(rawRole).trim().toLowerCase();
  if (r === 'guest') return 'guest';
  if (r === 'admin' || r === 'director' || r === 'super_admin') return 'admin';
  if (r === 'coordinator' || r === 'service_leader' || r === 'pastoral_care_leader' || r === 'pastoral_care') {
    return 'coordinator';
  }
  if (r === 'team_leader' || r === 'leader' || r === 'game_leader') return 'leader';
  if (r === 'servant' || r === 'active_servant' || r === 'trained_servant') return 'servant';
  return 'member';
}
