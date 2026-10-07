import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Users,
  Plus,
  Shield,
  Sparkles,
  RotateCw,
  Trash2,
} from 'lucide-react';
import {
  subscribeToUpcomingServices,
  createService,
  deleteService,
  formatTimeRange,
  getNextDayOfWeekDate,
  SERVICE_TYPES,
  SERVICE_STATUS,
} from '../services/serviceMeetingService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';
import QRAttendanceHostModal from './QRAttendanceHostModal';
import QRScannerModal from './QRScannerModal';
import AttendanceManagerModal from './AttendanceManagerModal';

export default function WeeklyServicesTab({
  currentUser,
  currentUserProfile,
  isAdmin = false,
  isLeader = false,
  communityId = DEFAULT_COMMUNITY_ID,
}) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  // Modals state
  const [hostModalService, setHostModalService] = useState(null);
  const [rosterModalService, setRosterModalService] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // New service form state
  const [newService, setNewService] = useState({
    title: '',
    type: SERVICE_TYPES.WEEKLY_SERVICE,
    date: getNextDayOfWeekDate(5), // Default to next Friday
    startTime: '18:30',
    endTime: '21:30',
    location: 'Main Sanctuary & Gym Court',
    description: '',
  });

  // Subscribe to real-time upcoming services
  useEffect(() => {
    const unsubscribe = subscribeToUpcomingServices(communityId, (list) => {
      setServices(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [communityId]);

  // Filter services
  const filteredServices = useMemo(() => {
    if (activeFilter === 'all') return services;
    return services.filter((s) => s.type === activeFilter);
  }, [services, activeFilter]);

  // Seed standard VBT weekly schedule if empty
  const handleSeedSchedule = async () => {
    setCreating(true);
    try {
      const nextFriday = getNextDayOfWeekDate(5);
      const nextSunday = getNextDayOfWeekDate(0);

      await createService(communityId, {
        title: 'Friday VBT Fellowship & Sports',
        type: SERVICE_TYPES.WEEKLY_SERVICE,
        date: nextFriday,
        startTime: '18:30',
        endTime: '21:30',
        location: 'Church Sanctuary & Sports Court',
        description: 'Weekly praise, spiritual word, followed by basketball, volleyball, and fellowship games.',
      });

      await createService(communityId, {
        title: 'Sunday Servants Prep & Briefing',
        type: SERVICE_TYPES.SERVANT_MEETING,
        date: nextSunday,
        startTime: '13:00',
        endTime: '14:30',
        location: 'Youth Center Room 204',
        description: 'Servants weekly prayer, logistics alignment, and sports tournament team planning.',
      });
    } catch (err) {
      console.error('Failed to seed schedule:', err);
    } finally {
      setCreating(false);
    }
  };

  // Create custom service
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newService.title.trim()) return;
    setCreating(true);
    try {
      await createService(communityId, {
        ...newService,
        status: SERVICE_STATUS.SCHEDULED,
      });
      setCreateModalOpen(false);
      setNewService({
        title: '',
        type: SERVICE_TYPES.WEEKLY_SERVICE,
        date: getNextDayOfWeekDate(5),
        startTime: '18:30',
        endTime: '21:30',
        location: 'Main Sanctuary & Gym Court',
        description: '',
      });
    } catch (err) {
      console.error('Failed to create service:', err);
    } finally {
      setCreating(false);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this scheduled gathering?')) return;
    try {
      await deleteService(communityId, serviceId);
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const getServiceTypeBadge = (type) => {
    switch (type) {
      case SERVICE_TYPES.WEEKLY_SERVICE:
        return { label: 'Weekly Service', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case SERVICE_TYPES.SERVANT_MEETING:
        return { label: 'Servant Meeting', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case SERVICE_TYPES.SPORTS_PRACTICE:
        return { label: 'Sports Practice', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case SERVICE_TYPES.TOURNAMENT:
        return { label: 'Tournament', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: 'Gathering', bg: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Quick Check-in CTA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 border border-slate-700/80 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>VBT Gatherings & Services</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Weekly Services & Gatherings
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Join weekly services, servant meetings, and sports activities. Fast QR check-in records your attendance seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Member Scan Button */}
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <QrCode className="w-5 h-5" />
              <span>Scan QR Check-in</span>
            </button>

            {/* Admin/Leader Add Service Button */}
            {(isAdmin || isLeader) && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm border border-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Gathering</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'all', label: 'All Gatherings' },
          { key: SERVICE_TYPES.WEEKLY_SERVICE, label: 'Weekly Services' },
          { key: SERVICE_TYPES.SERVANT_MEETING, label: 'Servant Meetings' },
          { key: SERVICE_TYPES.SPORTS_PRACTICE, label: 'Practices' },
          { key: SERVICE_TYPES.TOURNAMENT, label: 'Tournaments' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === tab.key
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Services List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RotateCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading scheduled gatherings...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-6 text-center rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No gatherings scheduled</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            There are currently no scheduled gatherings matching this filter.
          </p>

          {(isAdmin || isLeader) && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                disabled={creating}
                onClick={handleSeedSchedule}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Seed Standard Weekly Schedule</span>
              </button>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Create Custom Service
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((service) => {
            const badge = getServiceTypeBadge(service.type);
            const timeRange = formatTimeRange(service.startTime, service.endTime);

            return (
              <div
                key={service.id}
                className="relative rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 p-5 sm:p-6 transition-all shadow-lg flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        {service.date}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteService(service.id, e)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors ml-1"
                          title="Remove gathering"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {service.title}
                  </h3>
                  {service.description && (
                    <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                  )}

                  {/* Logistics Info */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    {timeRange && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{timeRange}</span>
                      </div>
                    )}
                    {service.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{service.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-5 mt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  {/* Member Quick Check-in */}
                  <button
                    onClick={() => setScannerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Check In</span>
                  </button>

                  {/* Leader Host & Roster Buttons */}
                  {(isAdmin || isLeader) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHostModalService(service)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        title="Display projector QR code for in-person check-in"
                      >
                        <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Host QR</span>
                      </button>
                      <button
                        onClick={() => setRosterModalService(service)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        title="View and manage attendance roster"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Roster</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Host QR Session Modal */}
      {hostModalService && (
        <QRAttendanceHostModal
          isOpen={!!hostModalService}
          service={hostModalService}
          currentUser={currentUser}
          communityId={communityId}
          onClose={() => setHostModalService(null)}
          onOpenRoster={(svc) => {
            setHostModalService(null);
            setRosterModalService(svc);
          }}
        />
      )}

      {/* Member QR Scanner Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        currentUserProfile={currentUserProfile}
        communityId={communityId}
      />

      {/* Attendance Manager Modal */}
      {rosterModalService && (
        <AttendanceManagerModal
          isOpen={!!rosterModalService}
          service={rosterModalService}
          currentUser={currentUser}
          communityId={communityId}
          onClose={() => setRosterModalService(null)}
        />
      )}

      {/* Create Service Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-auto">
            <h3 className="text-xl font-bold mb-1">Schedule New Gathering</h3>
            <p className="text-xs text-slate-400 mb-6">
              Create a weekly service, servant meeting, practice, or tournament.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Friday VBT Praise & Basketball"
                  value={newService.title}
                  onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Gathering Type
                  </label>
                  <select
                    value={newService.type}
                    onChange={(e) => setNewService({ ...newService, type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value={SERVICE_TYPES.WEEKLY_SERVICE}>Weekly Service</option>
                    <option value={SERVICE_TYPES.SERVANT_MEETING}>Servant Meeting</option>
                    <option value={SERVICE_TYPES.SPORTS_PRACTICE}>Sports Practice</option>
                    <option value={SERVICE_TYPES.TOURNAMENT}>Tournament</option>
                    <option value={SERVICE_TYPES.OUTREACH}>Outreach</option>
                    <option value={SERVICE_TYPES.SPECIAL_EVENT}>Special Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newService.date}
                    onChange={(e) => setNewService({ ...newService, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newService.startTime}
                    onChange={(e) => setNewService({ ...newService, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newService.endTime}
                    onChange={(e) => setNewService({ ...newService, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Church Hall, Court B"
                  value={newService.location}
                  onChange={(e) => setNewService({ ...newService, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief agenda or details..."
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
                >
                  {creating && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Gathering</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
