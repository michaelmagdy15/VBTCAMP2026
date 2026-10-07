import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  UserPlus,
  Copy,
  Check,
  QrCode,
  Shield,
  RotateCw,
} from 'lucide-react';
import {
  subscribeToServiceAttendance,
  recordAttendance,
  updateAttendanceStatus,
  calculateAttendanceStats,
  ATTENDANCE_STATUS,
  CHECKIN_METHOD,
} from '../services/attendanceService';
import { getMembers } from '../services/memberService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';

export default function AttendanceManagerModal({
  isOpen,
  onClose,
  service,
  currentUser,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  const [attendees, setAttendees] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'late' | 'excused'
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Subscribe to service attendance
  useEffect(() => {
    if (!isOpen || !service?.id) return;
    const unsubscribe = subscribeToServiceAttendance(communityId, service.id, (list) => {
      setAttendees(list);
    });
    return () => unsubscribe();
  }, [isOpen, service?.id, communityId]);

  // Load community members for manual check-in
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    async function loadMembers() {
      try {
        const members = await getMembers(communityId, 200);
        if (isMounted) setAllMembers(members);
      } catch (err) {
        console.error('Failed to load community members:', err);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [isOpen, communityId]);

  // Attendance stats
  const stats = useMemo(() => calculateAttendanceStats(attendees), [attendees]);

  // Filtered attendees
  const filteredAttendees = useMemo(() => {
    return attendees.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        (a.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.team || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || (a.status || ATTENDANCE_STATUS.PRESENT) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [attendees, searchQuery, statusFilter]);

  // Members not yet checked in (for manual drawer)
  const uncheckedMembers = useMemo(() => {
    const checkedInIds = new Set(attendees.map((a) => a.id || a.memberId));
    return allMembers.filter((m) => {
      if (checkedInIds.has(m.id)) return false;
      if (!memberSearchQuery) return true;
      return (
        (m.displayName || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        (m.team || '').toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(memberSearchQuery.toLowerCase())
      );
    });
  }, [allMembers, attendees, memberSearchQuery]);

  // Manual Check In
  const handleManualCheckIn = async (member, status = ATTENDANCE_STATUS.PRESENT) => {
    if (!service?.id || !member?.id) return;
    setActionLoading(member.id);
    try {
      await recordAttendance({
        communityId,
        serviceId: service.id,
        serviceInfo: {
          title: service.title,
          date: service.date,
        },
        member: {
          id: member.id,
          displayName: member.displayName || member.name,
          role: member.role || 'member',
          team: member.team || null,
          avatar: member.avatar || null,
        },
        status,
        checkInMethod: CHECKIN_METHOD.MANUAL_LEADER,
        markedBy: currentUser?.displayName || currentUser?.name || 'Leader',
      });
    } catch (err) {
      console.error('Manual check in failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Status toggle
  const handleStatusChange = async (memberId, newStatus) => {
    if (!service?.id || !memberId) return;
    try {
      await updateAttendanceStatus(
        communityId,
        service.id,
        memberId,
        newStatus,
        currentUser?.displayName || 'Leader'
      );
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  // Copy Summary Report to Clipboard
  const handleCopyReport = () => {
    const lines = [
      `📋 *${service.title || 'VBT Gathering'} Attendance Report*`,
      `📅 Date: ${service.date || 'Today'}`,
      `👥 Total Present: ${stats.present} | Late: ${stats.late} | Excused: ${stats.excused}`,
      `Total: ${stats.total}`,
      '',
      `*Present Attendees:*`,
      ...attendees.map(
        (a, i) =>
          `${i + 1}. ${a.displayName}${a.team ? ` (${a.team})` : ''} - ${a.status} [${a.checkInMethod === 'qr_scan' ? 'QR' : 'Manual'}]`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Attendance Roster
                </span>
                <span className="text-xs text-slate-400">{service.date}</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {service.title || 'VBT Weekly Service'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
              title="Copy attendance summary to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Report</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-slate-950/50 border-b border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-slate-400 font-medium">Total Checked In</span>
            <p className="text-xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40">
            <span className="text-emerald-400 font-medium">Present</span>
            <p className="text-xl font-bold text-emerald-300 mt-1">{stats.present}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40">
            <span className="text-amber-400 font-medium">Late</span>
            <p className="text-xl font-bold text-amber-300 mt-1">{stats.late}</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-800/40">
            <span className="text-indigo-400 font-medium">Excused</span>
            <p className="text-xl font-bold text-indigo-300 mt-1">{stats.excused}</p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search checked-in attendees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1">
              {['all', 'present', 'late', 'excused'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setStatusFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    statusFilter === filterKey
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAddDrawer(!showAddDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
              showAddDrawer
                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{showAddDrawer ? 'Hide Member List' : 'Manual Check-in'}</span>
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Main Attendance List */}
          <div
            className={`${
              showAddDrawer ? 'md:col-span-7 border-r border-slate-800' : 'md:col-span-12'
            } overflow-y-auto p-6 space-y-2`}
          >
            {filteredAttendees.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No attendees found</p>
                <p className="text-xs text-slate-600 mt-1">
                  Use "Manual Check-in" or project the QR code for members to scan.
                </p>
              </div>
            ) : (
              filteredAttendees.map((record) => (
                <div
                  key={record.id || record.memberId}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-sm text-white shadow">
                      {record.avatar ? (
                        <img
                          src={record.avatar}
                          alt=""
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        record.displayName?.[0]?.toUpperCase() || 'M'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {record.displayName}
                        </span>
                        {record.checkInMethod === 'qr_scan' ? (
                          <span
                            className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/60"
                            title="Scanned live QR code"
                          >
                            <QrCode className="w-3 h-3" /> QR
                          </span>
                        ) : (
                          <span
                            className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700"
                            title="Manually marked by leader"
                          >
                            <Shield className="w-3 h-3" /> Manual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span className="capitalize">{record.memberRole || 'member'}</span>
                        {record.team && (
                          <>
                            <span>•</span>
                            <span className="text-cyan-400 font-medium">{record.team}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Selector Pill Toggle */}
                  <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700/80">
                    <button
                      onClick={() => handleStatusChange(record.id || record.memberId, ATTENDANCE_STATUS.PRESENT)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        (record.status || ATTENDANCE_STATUS.PRESENT) === ATTENDANCE_STATUS.PRESENT
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mark Present"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Present</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(record.id || record.memberId, ATTENDANCE_STATUS.LATE)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        record.status === ATTENDANCE_STATUS.LATE
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mark Late"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Late</span>
                    </button>
                    <button
                      onClick={() => handleStatusChange(record.id || record.memberId, ATTENDANCE_STATUS.EXCUSED)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        record.status === ATTENDANCE_STATUS.EXCUSED
                          ? 'bg-indigo-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mark Excused"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Excused</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Side Drawer: Manual Member Check-in List */}
          {showAddDrawer && (
            <div className="md:col-span-5 bg-slate-950/70 p-5 flex flex-col overflow-hidden border-t md:border-t-0 border-slate-800">
              <div className="pb-3 border-b border-slate-800">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  Quick Check-in from Directory
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select members who are present without scanning
                </p>
                <div className="relative mt-2.5">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by member name or team..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Unchecked Members List */}
              <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                {uncheckedMembers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    All members in this query are already checked in!
                  </div>
                ) : (
                  uncheckedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                          {member.displayName?.[0]?.toUpperCase() || 'M'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {member.displayName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {member.team || member.role || 'Member'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          disabled={actionLoading === member.id}
                          onClick={() => handleManualCheckIn(member, ATTENDANCE_STATUS.PRESENT)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          {actionLoading === member.id ? (
                            <RotateCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                          <span>In</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
