import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Users,
  Phone,
  HeartPulse,
  FileCheck,
  Lock,
  Unlock,
  Key,
  Search,
  Plus,
  RefreshCw,
  X,
  MessageSquare,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Heart,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import {
  DEFAULT_COMMUNITY_ID,
  AUDIT_EVENT_TYPE,
  SCREENING_STATUS,
  SUPERVISION_STANDARDS,
  isMinorUser,
  isAuthorizedMedicalRole,
  isAuthorizedSafetyCoordinator,
  isGuardianOfYouth,
  calculateSupervisionRatio,
  getYouthSafetyRecord,
  registerGuardianRelationship,
  updateYouthConsent,
  updateAuthorizedPickups,
  getAuthorizedPickups,
  verifyPickupPin,
  updateRestrictedMedicalInfo,
  getRestrictedMedicalInfo,
  verifyVolunteerScreening,
  checkCommunicationSafety,
  getYouthAuditLogs,
  subscribeToYouthSafetyRecord,
  subscribeToYouthAuditLogs,
} from '../../services/youthSafetyService';

export default function YouthSafetyManagerModal({
  isOpen,
  onClose,
  youthMember,
  currentUser,
  communityId = DEFAULT_COMMUNITY_ID,
  onRecordUpdated,
}) {
  const [activeTab, setActiveTab] = useState('guardians'); // 'guardians' | 'consents' | 'medical' | 'supervision' | 'audit'
  const [safetyRecord, setSafetyRecord] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Medical specific states
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [medicalAccessAllowed, setMedicalAccessAllowed] = useState(false);
  const [medicalLoading, setMedicalLoading] = useState(false);
  const [medicalError, setMedicalError] = useState('');
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [medicalForm, setMedicalForm] = useState({
    allergies: '',
    chronicConditions: '',
    dietaryRestrictions: '',
    emergencyDoctorPhone: '',
    notes: '',
  });

  // Guardian creation
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [newGuardian, setNewGuardian] = useState({
    name: '',
    relationship: 'Mother',
    phoneNumber: '',
    isPrimary: false,
  });

  // Pickup creation & PIN verification test
  const [showAddPickup, setShowAddPickup] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [newPickup, setNewPickup] = useState({
    name: '',
    relationship: 'Family Member',
    phone: '',
    verifiedPin: '',
  });

  // Camper Dismissal PIN Verifier tool
  const [testPickupId, setTestPickupId] = useState('');
  const [testPin, setTestPin] = useState('');
  const [pinVerifyResult, setPinVerifyResult] = useState(null);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Volunteer screening lookup state
  const [volunteerLookupId, setVolunteerLookupId] = useState('');
  const [screeningResult, setScreeningResult] = useState(null);
  const [checkingScreening, setCheckingScreening] = useState(false);

  // Ratio simulator
  const [calcChaperones, setCalcChaperones] = useState(2);
  const [calcYouth, setCalcYouth] = useState(12);
  const [calcHighRisk, setCalcHighRisk] = useState(false);

  // Communication safety tester
  const [commTester, setCommTester] = useState({
    senderIsAdult: true,
    recipientIsMinor: true,
    ccGuardian: '',
    isGroup: false,
  });
  const [commResult, setCommResult] = useState(null);

  const youthId = youthMember?.id || youthMember?.uid;
  const youthName = youthMember?.displayName || youthMember?.name || 'Youth Camper';

  // 1. Subscribe to Youth Safety Record
  useEffect(() => {
    if (!isOpen || !youthId) return;

    setLoading(true);
    setErrorMessage('');

    // Fetch initial record
    getYouthSafetyRecord(communityId, youthId, currentUser, { auditAccess: true })
      .then((record) => {
        setSafetyRecord(record);
        setLoading(false);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Error loading youth safety record');
        setLoading(false);
      });

    const unsubRecord = subscribeToYouthSafetyRecord(communityId, youthId, (rec) => {
      if (rec) setSafetyRecord(rec);
    });

    const unsubAudit = subscribeToYouthAuditLogs(communityId, youthId, (logs) => {
      if (logs) setAuditLogs(logs);
    });

    return () => {
      unsubRecord();
      unsubAudit();
    };
  }, [isOpen, youthId, communityId, currentUser]);

  // 2. Load Medical Info when on Medical tab
  useEffect(() => {
    if (!isOpen || !youthId || activeTab !== 'medical') return;

    let isMounted = true;
    setMedicalLoading(true);
    setMedicalError('');

    getRestrictedMedicalInfo(communityId, youthId, currentUser)
      .then((info) => {
        if (!isMounted) return;
        setMedicalInfo(info);
        setMedicalAccessAllowed(true);
        setMedicalForm({
          allergies: (info.allergies || []).join(', '),
          chronicConditions: (info.chronicConditions || []).join(', '),
          dietaryRestrictions: (info.dietaryRestrictions || []).join(', '),
          emergencyDoctorPhone: info.emergencyDoctorPhone || '',
          notes: info.notes || '',
        });
        setMedicalLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMedicalAccessAllowed(false);
        setMedicalError(
          err.code === 'UNAUTHORIZED_MEDICAL_ACCESS' || err.message.includes('UNAUTHORIZED')
            ? 'Access Denied: Ordinary servants and general community members are strictly restricted from accessing confidential minor health records. Medical access is reserved for Medical Leads, Pastors, Coordinators, and the child’s verified guardian.'
            : err.message
        );
        setMedicalLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, youthId, activeTab, communityId, currentUser]);

  // Flash notices helper
  const notifySuccess = (msg) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  // Check if current user is parent / coordinator
  const isAuthorizedLeader = useMemo(() => {
    return isAuthorizedSafetyCoordinator(currentUser) || isAuthorizedMedicalRole(currentUser);
  }, [currentUser]);

  const isParent = useMemo(() => {
    return safetyRecord ? isGuardianOfYouth(currentUser, safetyRecord) : false;
  }, [currentUser, safetyRecord]);

  // Handle Register Guardian
  const handleAddGuardian = async (e) => {
    e.preventDefault();
    if (!newGuardian.name.trim() || !newGuardian.phoneNumber.trim()) {
      alert('Guardian name and phone number are required.');
      return;
    }
    try {
      await registerGuardianRelationship(communityId, youthId, newGuardian, currentUser);
      setShowAddGuardian(false);
      setNewGuardian({ name: '', relationship: 'Mother', phoneNumber: '', isPrimary: false });
      notifySuccess('Guardian successfully linked and verified.');
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      alert(err.message || 'Failed to register guardian');
    }
  };

  // Handle Add Authorized Pickup
  const handleAddPickup = async (e) => {
    e.preventDefault();
    if (!newPickup.name.trim()) {
      alert('Pickup person name is required.');
      return;
    }
    const currentPickups = safetyRecord?.authorizedPickups || [];
    const updated = [
      ...currentPickups,
      {
        id: `p_${Date.now()}`,
        name: newPickup.name.trim(),
        relationship: newPickup.relationship.trim(),
        phone: newPickup.phone.trim(),
        verifiedPin: newPickup.verifiedPin.trim() || '0000',
        idVerified: true,
      },
    ];

    try {
      await updateAuthorizedPickups(communityId, youthId, updated, currentUser);
      setShowAddPickup(false);
      setNewPickup({ name: '', relationship: 'Family Member', phone: '', verifiedPin: '' });
      notifySuccess('Authorized pickup person added with secure checkout PIN.');
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      alert(err.message || 'Failed to add pickup');
    }
  };

  // Handle PIN verification check
  const handleVerifyCheckoutPin = async () => {
    if (!testPickupId || !testPin) {
      alert('Please select a pickup person and input the 4-digit PIN.');
      return;
    }
    setVerifyingPin(true);
    setPinVerifyResult(null);
    try {
      const res = await verifyPickupPin(communityId, youthId, testPickupId, testPin, currentUser);
      setPinVerifyResult(res);
    } catch (err) {
      setPinVerifyResult({ verified: false, reason: err.message });
    } finally {
      setVerifyingPin(false);
    }
  };

  // Handle Consent Toggle
  const handleToggleConsent = async (consentKey, currentValue) => {
    if (!isAuthorizedLeader && !isParent) {
      alert('Only guardians or authorized coordinators may sign consent forms.');
      return;
    }

    try {
      const consents = safetyRecord?.consents || {};
      const newGranted = !currentValue;
      const updated = {
        ...consents,
        [consentKey]: {
          granted: newGranted,
          signedBy: newGranted ? (currentUser?.displayName || currentUser?.name || 'Guardian') : '',
          signedAt: newGranted ? new Date().toISOString() : null,
          notes: newGranted ? 'Confirmed digitally via VBT Portal' : 'Revoked by user',
        },
      };

      await updateYouthConsent(communityId, youthId, updated, currentUser);
      notifySuccess(`Consent form updated successfully.`);
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update consent');
    }
  };

  // Handle Save Medical Notes
  const handleSaveMedical = async (e) => {
    e.preventDefault();
    try {
      const allergiesArr = medicalForm.allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const conditionsArr = medicalForm.chronicConditions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const dietaryArr = medicalForm.dietaryRestrictions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        allergies: allergiesArr,
        chronicConditions: conditionsArr,
        dietaryRestrictions: dietaryArr,
        emergencyDoctorPhone: medicalForm.emergencyDoctorPhone.trim(),
        notes: medicalForm.notes.trim(),
      };

      const updated = await updateRestrictedMedicalInfo(communityId, youthId, payload, currentUser);
      setMedicalInfo(updated);
      setIsEditingMedical(false);
      notifySuccess('Restricted medical record updated and logged to audit trail.');
      if (onRecordUpdated) onRecordUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update medical info');
    }
  };

  // Handle Volunteer Screening Verification Lookup
  const handleCheckScreening = async (e) => {
    e.preventDefault();
    if (!volunteerLookupId.trim()) return;
    setCheckingScreening(true);
    setScreeningResult(null);
    try {
      const res = await verifyVolunteerScreening(communityId, volunteerLookupId.trim());
      setScreeningResult(res);
    } catch (err) {
      setScreeningResult({ isCleared: false, reason: err.message, status: 'error' });
    } finally {
      setCheckingScreening(false);
    }
  };

  // Chaperone ratio computation
  const ratioCalcResult = useMemo(() => {
    return calculateSupervisionRatio(calcChaperones, calcYouth, calcHighRisk);
  }, [calcChaperones, calcYouth, calcHighRisk]);

  // Communication safety evaluation
  const handleTestCommunication = (e) => {
    e.preventDefault();
    const sender = commTester.senderIsAdult
      ? { id: 'adult_leader_1', displayName: 'Coach John', isMinor: false, age: 28, role: 'servant' }
      : { id: 'youth_camper_1', displayName: 'Timmy', isMinor: true, age: 13, role: 'youth' };

    const recipient = commTester.recipientIsMinor
      ? { id: youthId, displayName: youthName, isMinor: true, age: 14, role: 'youth', guardianId: 'g_parent' }
      : { id: 'adult_leader_2', displayName: 'Leader Sarah', isMinor: false, age: 31, role: 'servant' };

    const result = checkCommunicationSafety(sender, recipient, {
      ccGuardianId: commTester.ccGuardian.trim() || undefined,
      isGroupChannel: commTester.isGroup,
    });

    setCommResult(result);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="youth-safety-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="youth-safety-modal-title" className="text-lg font-bold text-white tracking-wide">
                  Youth Safety & Child Protection Officer
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Protected Minor
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Managing Child Protection, Consents, Authorized Pickups & Medical Safeguards for{' '}
                <span className="text-cyan-300 font-semibold">{youthName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            aria-label="Close safety modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Notice Banner */}
        {successNotice && (
          <div className="bg-emerald-950/70 border-b border-emerald-700/50 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-300 font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-900/90 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'guardians', label: 'Guardians & Pickups', icon: Users },
            { id: 'consents', label: 'Consent Forms (3)', icon: FileCheck },
            { id: 'medical', label: 'Restricted Medical', icon: HeartPulse, restricted: true },
            { id: 'supervision', label: 'Supervision & Safe Chat', icon: Shield },
            { id: 'audit', label: 'Safety Audit Trail', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-t border-x transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800/90 border-slate-700 text-cyan-400 font-bold shadow-inner'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.restricted && (
                  <span className="p-0.5 rounded bg-rose-500/20 text-rose-300">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/50">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <p className="text-sm font-medium">Securing and fetching youth child records...</p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: GUARDIANS & AUTHORIZED PICKUPS */}
          {!loading && activeTab === 'guardians' && (
            <div className="space-y-6">
              {/* Guardians Section */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Verified Guardians
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAddGuardian(!showAddGuardian)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Guardian</span>
                  </button>
                </div>

                {showAddGuardian && (
                  <form
                    onSubmit={handleAddGuardian}
                    className="p-4 mb-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      Add / Link New Guardian
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Full Legal Name</label>
                        <input
                          type="text"
                          required
                          value={newGuardian.name}
                          onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
                          placeholder="e.g. Mary Adams"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Relationship</label>
                        <select
                          value={newGuardian.relationship}
                          onChange={(e) =>
                            setNewGuardian({ ...newGuardian, relationship: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Mother">Mother</option>
                          <option value="Father">Father</option>
                          <option value="Legal Guardian">Legal Guardian</option>
                          <option value="Grandparent">Grandparent</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Phone Number (Verified)</label>
                        <input
                          type="tel"
                          required
                          value={newGuardian.phoneNumber}
                          onChange={(e) =>
                            setNewGuardian({ ...newGuardian, phoneNumber: e.target.value })
                          }
                          placeholder="+20 100 123 4567"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="isPrimaryGuard"
                          checked={newGuardian.isPrimary}
                          onChange={(e) =>
                            setNewGuardian({ ...newGuardian, isPrimary: e.target.checked })
                          }
                          className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <label htmlFor="isPrimaryGuard" className="text-slate-300">
                          Primary Emergency Guardian
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddGuardian(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                      >
                        Save Guardian
                      </button>
                    </div>
                  </form>
                )}

                {(!safetyRecord?.guardians || safetyRecord.guardians.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No verified guardians linked yet. Please register the child’s legal parent or guardian.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {safetyRecord.guardians.map((g, idx) => (
                      <div
                        key={g.guardianId || idx}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{g.name}</span>
                            {g.isPrimary && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Primary
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {g.relationship} • {g.phoneNumber || 'No phone'}
                          </p>
                          <p className="text-[10px] text-slate-500">ID: {g.guardianId}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Authorized Pickups Section */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Authorized Pickup List & Secure Checkout PINs
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPins(!showPins)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPins ? 'Hide PINs' : 'Reveal PINs'}</span>
                    </button>
                    <button
                      onClick={() => setShowAddPickup(!showAddPickup)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Pickup</span>
                    </button>
                  </div>
                </div>

                {showAddPickup && (
                  <form
                    onSubmit={handleAddPickup}
                    className="p-4 mb-4 rounded-xl bg-slate-900/90 border border-indigo-500/40 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Register Authorized Pickup Person
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Pickup Person Name</label>
                        <input
                          type="text"
                          required
                          value={newPickup.name}
                          onChange={(e) => setNewPickup({ ...newPickup, name: e.target.value })}
                          placeholder="e.g. Uncle Peter"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Relationship to Minor</label>
                        <input
                          type="text"
                          required
                          value={newPickup.relationship}
                          onChange={(e) =>
                            setNewPickup({ ...newPickup, relationship: e.target.value })
                          }
                          placeholder="e.g. Uncle / Family Friend"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={newPickup.phone}
                          onChange={(e) => setNewPickup({ ...newPickup, phone: e.target.value })}
                          placeholder="+20 100 000 0000"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">4-Digit Security Checkout PIN</label>
                        <input
                          type="password"
                          maxLength={6}
                          value={newPickup.verifiedPin}
                          onChange={(e) =>
                            setNewPickup({ ...newPickup, verifiedPin: e.target.value })
                          }
                          placeholder="4-digit PIN (e.g. 4829)"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddPickup(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Save Pickup
                      </button>
                    </div>
                  </form>
                )}

                {(!safetyRecord?.authorizedPickups || safetyRecord.authorizedPickups.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No authorized pickup persons designated. Only registered primary guardians will be allowed to check out this camper.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {safetyRecord.authorizedPickups.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 flex items-start justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{p.name}</span>
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> ID Verified
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {p.relationship} • {p.phone || 'No phone'}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">PIN:</span>
                            <span className="font-mono font-bold text-indigo-300">
                              {showPins ? p.verifiedPin || 'Not set' : '••••'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Secure Checkout PIN Verifier Tool */}
                <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                      Live Dismissal / Pickup PIN Verifier
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Verify authorization before releasing camper into an adult’s custody.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={testPickupId}
                      onChange={(e) => {
                        setTestPickupId(e.target.value);
                        setPinVerifyResult(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500 min-w-[160px]"
                    >
                      <option value="">Select pickup person...</option>
                      {(safetyRecord?.authorizedPickups || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.relationship})
                        </option>
                      ))}
                    </select>

                    <input
                      type="password"
                      maxLength={6}
                      value={testPin}
                      onChange={(e) => {
                        setTestPin(e.target.value);
                        setPinVerifyResult(null);
                      }}
                      placeholder="Enter 4-digit PIN"
                      className="w-32 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      type="button"
                      disabled={verifyingPin || !testPickupId || !testPin}
                      onClick={handleVerifyCheckoutPin}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {verifyingPin ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                      <span>Verify PIN</span>
                    </button>
                  </div>

                  {pinVerifyResult && (
                    <div
                      className={`mt-3 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                        pinVerifyResult.verified
                          ? 'bg-emerald-950/60 border border-emerald-600 text-emerald-300'
                          : 'bg-rose-950/60 border border-rose-600 text-rose-300'
                      }`}
                    >
                      {pinVerifyResult.verified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            AUTHORIZED CHECKOUT: Identity & PIN verified for{' '}
                            {pinVerifyResult.pickupPerson?.name}. Safe to release camper.
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>CHECKOUT BLOCKED: {pinVerifyResult.reason}. Do not dismiss camper.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONSENT FORMS */}
          {!loading && activeTab === 'consents' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-xs text-slate-300">
                <span className="font-bold text-white">VBT Legal & Safety Consent Protocol:</span> All youth participants must have verified guardian consent recorded prior to sports activities, off-campus travel, and media publication.
              </div>

              {[
                {
                  key: 'medicalEmergencyConsent',
                  title: 'Medical Emergency & First Aid Consent',
                  description:
                    'Authorizes certified first-aid staff and licensed emergency medical personnel to administer treatment, transport to hospital, and take necessary measures in the event of an emergency.',
                  critical: true,
                },
                {
                  key: 'sportsLiabilityWaiver',
                  title: 'Sports Liability & Camp Activity Waiver',
                  description:
                    'Acknowledges active participation in sports drills, team competitions, and athletics under adult chaperone supervision.',
                  critical: true,
                },
                {
                  key: 'photoReleaseConsent',
                  title: 'Photo & Media Release Consent',
                  description:
                    'Authorizes camp photographers to include the camper in church community highlights, photo walls, and annual retrospective videos.',
                  critical: false,
                },
              ].map((consentDef) => {
                const current = safetyRecord?.consents?.[consentDef.key];
                const isGranted = Boolean(current?.granted);

                return (
                  <div
                    key={consentDef.key}
                    className={`p-5 rounded-2xl border transition-all ${
                      isGranted
                        ? 'bg-emerald-950/20 border-emerald-800/60'
                        : 'bg-slate-800/50 border-slate-700/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{consentDef.title}</h4>
                          {isGranted ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Signed & Granted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Missing Signature
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{consentDef.description}</p>
                        {isGranted && current?.signedBy && (
                          <p className="text-[11px] text-slate-400">
                            Signed by <span className="text-cyan-300 font-semibold">{current.signedBy}</span> on{' '}
                            {current.signedAt ? new Date(current.signedAt).toLocaleDateString() : 'Record'}
                          </p>
                        )}
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => handleToggleConsent(consentDef.key, isGranted)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            isGranted
                              ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                          }`}
                        >
                          {isGranted ? 'Revoke Consent' : 'Sign Consent Form'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: RESTRICTED MEDICAL & ALLERGIES */}
          {!loading && activeTab === 'medical' && (
            <div className="space-y-5">
              {/* Privacy Warning Header */}
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-700/60 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-200 uppercase tracking-wide">
                    Strict Confidentiality: Protected Minor Health Records
                  </p>
                  <p className="text-amber-300/80">
                    To safeguard child privacy, access to emergency medical notes and allergy flags is strictly restricted to Medical Leads, Pastors, Coordinators, and the child's legal guardian. Ordinary servants cannot access this screen. Every view and modification is immutably logged to the audit trail.
                  </p>
                </div>
              </div>

              {medicalLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
                  <p className="text-xs">Verifying authorization clearance and generating audit entry...</p>
                </div>
              )}

              {!medicalLoading && !medicalAccessAllowed && (
                <div className="p-8 rounded-2xl bg-rose-950/40 border border-rose-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-rose-200">Confidential Medical Access Restricted</h4>
                  <p className="text-xs text-rose-300/80 max-w-md mx-auto">
                    {medicalError}
                  </p>
                </div>
              )}

              {!medicalLoading && medicalAccessAllowed && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clearance Confirmed (Audit Logged)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingMedical(!isEditingMedical)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
                    >
                      {isEditingMedical ? 'Cancel Editing' : 'Edit Medical Record'}
                    </button>
                  </div>

                  {isEditingMedical ? (
                    <form onSubmit={handleSaveMedical} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                        Update Confidential Health & Allergy Data
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1">
                            Allergies (comma-separated, flag severe/EpiPen)
                          </label>
                          <input
                            type="text"
                            value={medicalForm.allergies}
                            onChange={(e) => setMedicalForm({ ...medicalForm, allergies: e.target.value })}
                            placeholder="e.g. Peanuts (Severe - EpiPen), Penicillin"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Dietary Restrictions</label>
                          <input
                            type="text"
                            value={medicalForm.dietaryRestrictions}
                            onChange={(e) => setMedicalForm({ ...medicalForm, dietaryRestrictions: e.target.value })}
                            placeholder="e.g. Gluten-free, Lactose intolerant"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Chronic Conditions / Asthma</label>
                          <input
                            type="text"
                            value={medicalForm.chronicConditions}
                            onChange={(e) => setMedicalForm({ ...medicalForm, chronicConditions: e.target.value })}
                            placeholder="e.g. Asthma (Inhaler required)"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Emergency Physician / Doctor Phone</label>
                          <input
                            type="tel"
                            value={medicalForm.emergencyDoctorPhone}
                            onChange={(e) => setMedicalForm({ ...medicalForm, emergencyDoctorPhone: e.target.value })}
                            placeholder="+20 100 000 0000"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-slate-400 mb-1">Confidential Medical Notes & Care Instructions</label>
                          <textarea
                            rows={3}
                            value={medicalForm.notes}
                            onChange={(e) => setMedicalForm({ ...medicalForm, notes: e.target.value })}
                            placeholder="e.g. Inhaler stored in green team pouch; alert medical lead immediately on wheezing."
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingMedical(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                        >
                          Save & Log Audit
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Allergy Flags Card */}
                      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
                        <div className="flex items-center gap-2">
                          <HeartPulse className="w-4 h-4 text-rose-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Allergies & Dietary
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {medicalInfo?.allergies && medicalInfo.allergies.length > 0 ? (
                            medicalInfo.allergies.map((allergy, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-400" /> {allergy}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No known allergies recorded</span>
                          )}
                        </div>

                        {medicalInfo?.dietaryRestrictions && medicalInfo.dietaryRestrictions.length > 0 && (
                          <div className="pt-2 text-xs">
                            <span className="text-slate-400">Dietary: </span>
                            <span className="text-white font-medium">
                              {medicalInfo.dietaryRestrictions.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Chronic Conditions & Doctor */}
                      <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Chronic Conditions & Physician
                          </h4>
                        </div>
                        <div className="text-xs space-y-1 pt-1">
                          <p>
                            <span className="text-slate-400">Conditions: </span>
                            <span className="text-white font-medium">
                              {medicalInfo?.chronicConditions && medicalInfo.chronicConditions.length > 0
                                ? medicalInfo.chronicConditions.join(', ')
                                : 'None reported'}
                            </span>
                          </p>
                          <p>
                            <span className="text-slate-400">Physician Contact: </span>
                            <span className="text-cyan-300 font-mono">
                              {medicalInfo?.emergencyDoctorPhone || 'Not on file'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Confidential Notes */}
                      <div className="md:col-span-2 p-4 rounded-2xl bg-slate-800/40 border border-slate-700 space-y-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Confidential Medical Care Instructions
                        </h4>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {medicalInfo?.notes || 'No special clinical notes recorded.'}
                        </p>
                        {medicalInfo?.updatedBy && (
                          <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-700/60">
                            Last clinical update by {medicalInfo.updatedBy} on{' '}
                            {medicalInfo.updatedAt ? new Date(medicalInfo.updatedAt).toLocaleString() : 'N/A'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SUPERVISION & SCREENING & SAFE MESSAGING */}
          {!loading && activeTab === 'supervision' && (
            <div className="space-y-6">
              {/* Ratio Calculator */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Supervision Ratio Standards (1:8 Youth / 1:5 Children)
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Church child protection rules require a minimum of 1 chaperone per 8 youth (ages 11-17), or 1 chaperone per 5 young children (&lt;11) and high-risk sports activities. Two-deep leadership is always enforced.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Screened Adult Chaperones</label>
                    <input
                      type="number"
                      min={0}
                      value={calcChaperones}
                      onChange={(e) => setCalcChaperones(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Participating Minors</label>
                    <input
                      type="number"
                      min={0}
                      value={calcYouth}
                      onChange={(e) => setCalcYouth(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={calcHighRisk}
                        onChange={(e) => setCalcHighRisk(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Young Children (&lt;11) or Water Activity (1:5)</span>
                    </label>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    ratioCalcResult.compliant
                      ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ratioCalcResult.compliant ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>
                      {ratioCalcResult.compliant
                        ? `COMPLIANT RATIO: Current ratio is ${ratioCalcResult.actualRatioStr} (Standard: ${ratioCalcResult.standardRatio})`
                        : `RATIO DEFICIT: Need ${ratioCalcResult.deficit} more adult chaperone(s) for ${ratioCalcResult.youthCount} minors under ${ratioCalcResult.standardRatio} rule.`}
                    </span>
                  </div>
                  <span className="font-bold px-2 py-0.5 rounded bg-slate-900/60">
                    Required: {ratioCalcResult.requiredChaperones} Chaperones
                  </span>
                </div>
              </div>

              {/* Volunteer Screening Lookup */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Volunteer Background & Child Safety Screening Lookup
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Check if a volunteer servant is cleared to supervise children with up-to-date background checks and certifications.
                </p>

                <form onSubmit={handleCheckScreening} className="flex items-center gap-2 max-w-md">
                  <input
                    type="text"
                    placeholder="Enter Volunteer Member ID"
                    value={volunteerLookupId}
                    onChange={(e) => setVolunteerLookupId(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={checkingScreening || !volunteerLookupId.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    {checkingScreening ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Verify</span>
                  </button>
                </form>

                {screeningResult && (
                  <div
                    className={`mt-4 p-4 rounded-xl border text-xs space-y-2 ${
                      screeningResult.isCleared
                        ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-700/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        {screeningResult.isCleared
                          ? '✓ CLEARED FOR YOUTH SUPERVISION'
                          : '✗ NOT CLEARED / SCREENING REQUIRED'}
                      </span>
                      <span className="uppercase font-bold px-2 py-0.5 rounded bg-slate-900/60 text-[10px]">
                        Status: {screeningResult.status}
                      </span>
                    </div>
                    <p>{screeningResult.reason}</p>
                    {screeningResult.safetyCertificationValidThrough && (
                      <p className="text-[11px] text-slate-300">
                        Certification Valid Through:{' '}
                        {new Date(screeningResult.safetyCertificationValidThrough).toLocaleDateString()} (
                        {screeningResult.daysRemaining} days remaining)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Child-Safe Communication Rules Tester */}
              <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Child-Safe Messaging Protection Tester
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  VBT child-safe policy strictly prohibits unsupervised 1-on-1 direct messages between adult servants and minor campers. All communications must CC a verified guardian or take place in a supervised group channel.
                </p>

                <form onSubmit={handleTestCommunication} className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-indigo-500/20 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Sender Type</label>
                      <select
                        value={commTester.senderIsAdult ? 'adult' : 'minor'}
                        onChange={(e) => setCommTester({ ...commTester, senderIsAdult: e.target.value === 'adult' })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="adult">Adult Servant / Leader</option>
                        <option value="minor">Minor Camper</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Recipient Type</label>
                      <select
                        value={commTester.recipientIsMinor ? 'minor' : 'adult'}
                        onChange={(e) => setCommTester({ ...commTester, recipientIsMinor: e.target.value === 'minor' })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none"
                      >
                        <option value="minor">Minor Camper ({youthName})</option>
                        <option value="adult">Adult Servant</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={commTester.isGroup}
                        onChange={(e) => setCommTester({ ...commTester, isGroup: e.target.checked })}
                        className="rounded border-slate-700 text-indigo-500 focus:ring-0"
                      />
                      <span>Supervised Group Channel</span>
                    </label>

                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-slate-400 whitespace-nowrap">Guardian CC:</span>
                      <input
                        type="text"
                        placeholder="e.g. parent_mary"
                        value={commTester.ccGuardian}
                        onChange={(e) => setCommTester({ ...commTester, ccGuardian: e.target.value })}
                        className="flex-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                    >
                      Check Policy
                    </button>
                  </div>
                </form>

                {commResult && (
                  <div
                    className={`mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      commResult.allowed
                        ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-600 text-rose-300'
                    }`}
                  >
                    {commResult.allowed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>COMMUNICATION PERMITTED: {commResult.reason}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>COMMUNICATION BLOCKED: {commResult.reason}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SAFETY AUDIT TRAIL */}
          {!loading && activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold uppercase tracking-wider text-slate-300">
                    Immutable Safety Access Logs ({auditLogs.length} events)
                  </span>
                </div>
                <span className="text-slate-400">
                  Compliance Rule: All access to minor and medical files is logged.
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/60 text-center text-xs text-slate-400 italic">
                  No access logs recorded yet for this youth profile.
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-2xl bg-slate-800/40 border border-slate-700/80 overflow-hidden text-xs">
                  {auditLogs.map((log) => {
                    const isMedical = log.accessType === AUDIT_EVENT_TYPE.MEDICAL_NOTE_ACCESSED;
                    const isBlocked = log.accessType === AUDIT_EVENT_TYPE.UNAUTHORIZED_ACCESS_ATTEMPT;

                    return (
                      <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-800/60 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isBlocked
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : isMedical
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {log.accessType}
                            </span>
                            <span className="font-bold text-white">{log.actorName}</span>
                            <span className="text-[11px] text-slate-400">({log.actorRole})</span>
                          </div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <p className="text-[11px] text-slate-400 font-mono">
                              Details: {JSON.stringify(log.metadata)}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>VBT Child Protection Standard &copy; 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
