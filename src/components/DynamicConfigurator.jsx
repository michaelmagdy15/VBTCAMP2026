/**
 * DynamicConfigurator.jsx
 * ─────────────────────────────────────────────────────────────
 * Checked: UI mode toggle settings for dumb/simple layout are integrated in App.jsx.
 * Coordinator configuration panel for the VBT Sports Camp.
 * Provides dynamic team management, custom score categories,
 * service time profiles, and template management.
 *
 * Props:
 *   - eventConfig: Object — current event configuration
 *   - onSaveConfig: Function(updatedConfig) — callback to persist changes
 *   - campData: Object — supplementary camp data
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { Settings, Plus, Minus, Trash2, Save, Palette } from 'lucide-react';
import { saveAsTemplate, loadTemplates, deleteTemplate, PRESET_TEMPLATES } from '../templates';
import { calculateTimeSlots } from '../matchupEngine';

// ── Design Tokens ─────────────────────────────────────────────

const COLORS = {
  blue: '#1441a1',
  sky: '#29b6f6',
  bgDark: '#070a13',
  bgSurface: 'rgba(13, 20, 38, 0.65)',
  bgCard: 'rgba(15, 25, 50, 0.55)',
  bgCardHover: 'rgba(20, 35, 70, 0.65)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  border: 'rgba(41, 182, 246, 0.15)',
  borderActive: 'rgba(41, 182, 246, 0.4)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.12)',
};

const PRESET_TEAM_COLORS = [
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Black', hex: '#18181b' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Purple', hex: '#9333ea' },
  { name: 'Gold', hex: '#eab308' },
];

const DEFAULT_SCORE_CATEGORIES = [
  { name: 'Game Win', points: 15 },
  { name: 'Big Game Win', points: 30 },
];

// ── Inline Styles ─────────────────────────────────────────────

const styles = {
  container: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: COLORS.textPrimary,
    maxWidth: 840,
    margin: '0 auto',
    padding: 0,
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    fontFamily: "'Outfit', sans-serif",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: COLORS.textPrimary,
  },
  headerIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.sky})`,
    flexShrink: 0,
  },
  section: {
    background: COLORS.bgSurface,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: 16,
    border: `1px solid ${COLORS.border}`,
    padding: 24,
    marginBottom: 20,
    transition: 'border-color 0.2s ease',
  },
  sectionTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 16,
    fontWeight: 600,
    color: COLORS.textPrimary,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: COLORS.textSecondary,
    marginBottom: 6,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    background: 'rgba(7, 10, 19, 0.6)',
    color: COLORS.textPrimary,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  inputSmall: {
    width: 80,
    padding: '8px 12px',
    borderRadius: 8,
    border: `1px solid ${COLORS.border}`,
    background: 'rgba(7, 10, 19, 0.6)',
    color: COLORS.textPrimary,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14,
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  teamCard: {
    background: COLORS.bgCard,
    backdropFilter: 'blur(8px)',
    borderRadius: 12,
    border: `1px solid ${COLORS.border}`,
    padding: 16,
    marginBottom: 12,
    transition: 'border-color 0.2s ease, background 0.2s ease',
  },
  teamGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'start',
  },
  colorSwatch: (hex, isSelected, isMobile) => ({
    width: isMobile ? 32 : 28,
    height: isMobile ? 32 : 28,
    borderRadius: 8,
    backgroundColor: hex,
    border: isSelected ? '2px solid #fff' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    boxShadow: isSelected ? `0 0 12px ${hex}60` : 'none',
    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
    flexShrink: 0,
  }),
  swatchRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 10,
    border: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  btnPrimary: {
    background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.sky})`,
    color: '#fff',
  },
  btnDanger: {
    background: COLORS.dangerBg,
    color: COLORS.danger,
    border: `1px solid ${COLORS.danger}30`,
  },
  btnGhost: {
    background: 'rgba(255,255,255,0.05)',
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.border}`,
  },
  btnSmall: {
    padding: '6px 10px',
    fontSize: 12,
    borderRadius: 8,
  },
  slider: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  sliderValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 28,
    fontWeight: 700,
    color: COLORS.sky,
    minWidth: 40,
    textAlign: 'center',
  },
  sliderBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${COLORS.border}`,
    background: 'rgba(255,255,255,0.05)',
    color: COLORS.textPrimary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    padding: '8px 12px',
    borderRadius: 10,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
  },
  previewChip: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 6,
    background: 'rgba(41, 182, 246, 0.1)',
    border: `1px solid ${COLORS.border}`,
    fontSize: 12,
    color: COLORS.sky,
    marginRight: 6,
    marginBottom: 4,
  },
  templateCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderRadius: 10,
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    marginBottom: 8,
    transition: 'background 0.2s ease',
  },
  templateInfo: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  templateDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 1.4,
  },
  templateActions: {
    display: 'flex',
    gap: 6,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: COLORS.border,
    margin: '16px 0',
    border: 'none',
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 12,
    border: `2px dashed ${COLORS.border}`,
    background: 'transparent',
    color: COLORS.textSecondary,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'center',
    transition: 'border-color 0.2s ease',
  },
  presetBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    background: 'rgba(34, 197, 94, 0.12)',
    color: COLORS.success,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginLeft: 8,
  },
};

// ── Component ─────────────────────────────────────────────────

export default function DynamicConfigurator({ eventConfig, onSaveConfig, campData }) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Team State ──────────────────────────────────────────────
  const [teamCount, setTeamCount] = useState(eventConfig?.teamCount || 4);
  const [teams, setTeams] = useState(() => {
    if (eventConfig?.teams && eventConfig.teams.length > 0) {
      return eventConfig.teams;
    }
    return Array.from({ length: 4 }, (_, i) => ({
      name: `Team ${i + 1}`,
      color: PRESET_TEAM_COLORS[i % PRESET_TEAM_COLORS.length].hex,
    }));
  });

  // ── Score Categories ────────────────────────────────────────
  const [categories, setCategories] = useState(
    eventConfig?.scoreCategories || [...DEFAULT_SCORE_CATEGORIES]
  );
  const [newCatName, setNewCatName] = useState('');
  const [newCatPoints, setNewCatPoints] = useState(10);

  // ── Time Profile ────────────────────────────────────────────
  const [startTime, setStartTime] = useState(eventConfig?.startTime || '15:15');
  const [roundDuration, setRoundDuration] = useState(eventConfig?.roundDurationMinutes || 20);
  const [breakTime, setBreakTime] = useState(eventConfig?.breakMinutes || 0);

  // ── Location Map Key ────────────────────────────────────────
  const [locations, setLocations] = useState(() => {
    return eventConfig?.locationKey || [
      { id: '1', name: 'Football Field', label: '1. Football Field', games: ['Big Mac', 'Cheesy Strings', 'Big Bucket 1', 'Big Bucket 2', 'Golden Snitch 1', 'Golden Snitch 2'] },
      { id: '2', name: 'Terrace', label: '2. Terrace', games: ['Scale', 'Lift'] },
      { id: '3', name: 'Court', label: '3. Court', games: ['Cone Memory', 'Puzzle', 'Balloon Darts 1', 'Balloon Darts 2'] },
      { id: '4', name: 'Pool', label: '4. Pool', games: ['Chubby Bunny', 'Bible Whispers'] },
      { id: '5', name: 'Roof', label: '5. Roof', games: ['Nadala+ 1', 'Nadala+ 2'] },
      { id: 'MH', name: 'Main Hall', label: 'MH. Main Hall', games: ['Talk', 'Talk 1', 'Talk 2'] }
    ];
  });

  // ── Templates ───────────────────────────────────────────────
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // ── Load saved templates on mount ───────────────────────────
  useEffect(() => {
    fetchTemplates();
  }, []);

  // ── Sync team count with teams array ────────────────────────
  useEffect(() => {
    Promise.resolve().then(() => {
      setTeams((prev) => {
        if (teamCount > prev.length) {
          const additional = Array.from({ length: teamCount - prev.length }, (_, i) => ({
            name: `Team ${prev.length + i + 1}`,
            color: PRESET_TEAM_COLORS[(prev.length + i) % PRESET_TEAM_COLORS.length].hex,
          }));
          return [...prev, ...additional];
        }
        return prev.slice(0, teamCount);
      });
    });
  }, [teamCount]);

  async function fetchTemplates() {
    setLoadingTemplates(true);
    try {
      const list = await loadTemplates();
      setSavedTemplates(list);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }

  // ── Build the config object ─────────────────────────────────
  function buildConfig() {
    return {
      ...eventConfig,
      teamCount,
      teams,
      scoreCategories: categories,
      startTime,
      roundDurationMinutes: roundDuration,
      breakMinutes: breakTime,
      locationKey: locations,
    };
  }

  // ── Team Handlers ───────────────────────────────────────────
  function updateTeam(index, field, value) {
    setTeams((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // ── Category Handlers ───────────────────────────────────────
  function addCategory() {
    if (!newCatName.trim()) return;
    setCategories((prev) => [...prev, { name: newCatName.trim(), points: Number(newCatPoints) || 0 }]);
    setNewCatName('');
    setNewCatPoints(10);
  }

  function removeCategory(index) {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Template Handlers ───────────────────────────────────────
  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    setIsSaving(true);
    try {
      const config = buildConfig();
      await saveAsTemplate(templateName.trim(), config, campData || {}, '');
      setTemplateName('');
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) return;
    try {
      await deleteTemplate(id);
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  }

  // ── Time Preview ────────────────────────────────────────────
  function getTimePreview() {
    try {
      // Convert 24h input value to 12h string
      const [h, m] = startTime.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const formattedStart = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;

      const roundCount = Math.max(teamCount - 1, 1);
      return calculateTimeSlots(formattedStart, roundCount, roundDuration, breakTime);
    } catch {
      return [];
    }
  }

  // ── Render ──────────────────────────────────────────────────
  const timePreview = getTimePreview();

  return (
    <div style={{ ...styles.container, padding: isMobile ? '0 12px' : 0 }}>
      {/* Header */}
      <div style={{ ...styles.header, fontSize: isMobile ? 18 : 22, marginBottom: isMobile ? 16 : 28 }}>
        <div style={styles.headerIcon}>
          <Settings size={20} color="#fff" />
        </div>
        Service Configurator
      </div>

      {/* ═══════ Section 1: Team Count ═══════ */}
      <div style={{ ...styles.section, padding: isMobile ? 16 : 24, borderRadius: isMobile ? 12 : 16 }}>
        <div style={{ ...styles.sectionTitle, fontSize: isMobile ? 14 : 16 }}>
          <Palette size={16} color={COLORS.sky} />
          Teams
        </div>

        <div style={styles.slider}>
          <button
            style={styles.sliderBtn}
            onClick={() => setTeamCount((c) => Math.max(2, c - 1))}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.sky)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            <Minus size={16} />
          </button>
          <div style={styles.sliderValue}>{teamCount}</div>
          <button
            style={styles.sliderBtn}
            onClick={() => setTeamCount((c) => Math.min(8, c + 1))}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = COLORS.sky)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}
          >
            <Plus size={16} />
          </button>
          <span style={{ fontSize: isMobile ? 12 : 13, color: COLORS.textSecondary }}>teams (2–8)</span>
        </div>

        <hr style={styles.divider} />

        {/* Per-team cards */}
        {teams.map((team, idx) => (
          <div
            key={idx}
            style={{
              ...styles.teamCard,
              borderLeft: `3px solid ${team.color}`,
              padding: isMobile ? 12 : 16,
            }}
          >
            <div style={{ ...styles.teamGrid, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'start' }}>
              <div style={{ flex: isMobile ? 'none' : '1 1 240px', minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Team Name</label>
                <input
                  style={{ ...styles.input, fontSize: isMobile ? 13 : 14 }}
                  value={team.name}
                  onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                  placeholder={`Team ${idx + 1}`}
                />
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13, marginTop: 10 }}>Color</label>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row', 
                  alignItems: isMobile ? 'stretch' : 'center', 
                  gap: 10 
                }}>
                  <input
                    style={{ 
                      ...(isMobile ? styles.input : styles.inputSmall), 
                      width: isMobile ? '100%' : 80, 
                      textAlign: isMobile ? 'left' : 'center',
                      fontSize: isMobile ? 13 : 14
                    }}
                    value={team.color}
                    onChange={(e) => updateTeam(idx, 'color', e.target.value)}
                    placeholder="#hex"
                  />
                  <div style={{ 
                    ...styles.swatchRow, 
                    marginTop: isMobile ? 4 : 6, 
                    justifyContent: isMobile ? 'space-between' : 'flex-start',
                    width: isMobile ? '100%' : 'auto'
                  }}>
                    {PRESET_TEAM_COLORS.map((preset) => (
                      <div
                        key={preset.hex}
                        style={styles.colorSwatch(preset.hex, team.color === preset.hex, isMobile)}
                        onClick={() => updateTeam(idx, 'color', preset.hex)}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ flex: isMobile ? 'none' : '0 0 auto', width: isMobile ? '100%' : 'auto', marginTop: isMobile ? 12 : 0 }}>
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Logo</label>
                <button style={{ ...styles.uploadBtn, width: isMobile ? '100%' : 56, height: isMobile ? 44 : 56 }}>
                  <span>{isMobile ? 'Upload Logo' : 'Upload'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════ Section 2: Score Categories ═══════ */}
      <div style={{ ...styles.section, padding: isMobile ? 16 : 24, borderRadius: isMobile ? 12 : 16 }}>
        <div style={{ ...styles.sectionTitle, fontSize: isMobile ? 14 : 16 }}>Score Categories</div>

        {categories.map((cat, idx) => (
          <div 
            key={idx} 
            style={{ 
              ...styles.categoryRow, 
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? 8 : 10,
              padding: isMobile ? 12 : '8px 12px'
            }}
          >
            <span style={{ flex: 1, fontSize: 14, color: COLORS.textPrimary, textAlign: isMobile ? 'center' : 'left' }}>
              {cat.name}
            </span>
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? 8 : 10,
              marginLeft: isMobile ? 0 : 'auto'
            }}>
              <span style={{ 
                fontSize: 13, 
                color: COLORS.sky, 
                fontWeight: 600, 
                minWidth: isMobile ? 'none' : 50, 
                textAlign: isMobile ? 'center' : 'right' 
              }}>
                {cat.points} pts
              </span>
              <button
                style={{ 
                  ...styles.btn, 
                  ...styles.btnDanger, 
                  ...styles.btnSmall,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
                onClick={() => removeCategory(idx)}
              >
                <Trash2 size={12} />
                {isMobile && <span style={{ marginLeft: 6 }}>Remove Category</span>}
              </button>
            </div>
          </div>
        ))}

        <hr style={styles.divider} />

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 8, alignItems: isMobile ? 'stretch' : 'flex-end' }}>
          <div style={{ flex: isMobile ? 'none' : 1, minWidth: isMobile ? 0 : 140, width: isMobile ? '100%' : 'auto' }}>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Category Name</label>
            <input
              style={{ ...styles.input, fontSize: isMobile ? 13 : 14 }}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Bible Verse Memorization"
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            />
          </div>
          <div style={{ width: isMobile ? '100%' : 80 }}>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Points</label>
            <input
              style={{ 
                ...(isMobile ? styles.input : styles.inputSmall), 
                width: '100%',
                fontSize: isMobile ? 13 : 14
              }}
              type="number"
              value={newCatPoints}
              onChange={(e) => setNewCatPoints(e.target.value)}
              min={0}
            />
          </div>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
            onClick={addCategory}
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textSecondary }}>
          Examples: Bible Verse Memorization (10pts), Spirit Award (5pts), Clean-up (3pts)
        </div>
      </div>

      {/* ═══════ Section 3: Service Time Profile ═══════ */}
      <div style={{ ...styles.section, padding: isMobile ? 16 : 24, borderRadius: isMobile ? 12 : 16 }}>
        <div style={{ ...styles.sectionTitle, fontSize: isMobile ? 14 : 16 }}>Service Time Profile</div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: isMobile ? 'none' : '1 1 0px', width: isMobile ? '100%' : 'auto' }}>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Start Time</label>
            <input
              style={{ 
                ...(isMobile ? styles.input : styles.inputSmall), 
                width: '100%', 
                textAlign: isMobile ? 'left' : 'center',
                fontSize: isMobile ? 13 : 14
              }}
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div style={{ flex: isMobile ? 'none' : '1 1 0px', width: isMobile ? '100%' : 'auto' }}>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Round Duration (min)</label>
            <input
              style={{ 
                ...(isMobile ? styles.input : styles.inputSmall), 
                width: '100%',
                fontSize: isMobile ? 13 : 14
              }}
              type="number"
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value) || 1)}
              min={1}
              max={120}
            />
          </div>
          <div style={{ flex: isMobile ? 'none' : '1 1 0px', width: isMobile ? '100%' : 'auto' }}>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Break Between (min)</label>
            <input
              style={{ 
                ...(isMobile ? styles.input : styles.inputSmall), 
                width: '100%',
                fontSize: isMobile ? 13 : 14
              }}
              type="number"
              value={breakTime}
              onChange={(e) => setBreakTime(Number(e.target.value) || 0)}
              min={0}
              max={60}
            />
          </div>
        </div>

        {timePreview.length > 0 && (
          <div>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Schedule Preview</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {timePreview.map((time, idx) => (
                <span key={idx} style={styles.previewChip}>
                  Round {idx + 1}: {time}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ Section 4: Template Management ═══════ */}
      <div style={{ ...styles.section, padding: isMobile ? 16 : 24, borderRadius: isMobile ? 12 : 16 }}>
        <div style={{ ...styles.sectionTitle, fontSize: isMobile ? 14 : 16 }}>
          <Save size={16} color={COLORS.sky} />
          Templates
        </div>

        {/* Save as template */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 16 }}>
          <input
            style={{ ...styles.input, flex: 1 }}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name..."
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
          />
          <button
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
              opacity: isSaving || !templateName.trim() ? 0.5 : 1,
              pointerEvents: isSaving || !templateName.trim() ? 'none' : 'auto',
            }}
            onClick={handleSaveTemplate}
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save as Template'}
          </button>
        </div>

        {/* Saved templates */}
        {loadingTemplates ? (
          <div style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', padding: 16 }}>
            Loading templates...
          </div>
        ) : savedTemplates.length > 0 ? (
          <>
            <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13, marginBottom: 8 }}>Saved Templates</label>
            {savedTemplates.map((t) => (
              <div 
                key={t.id} 
                style={{ 
                  ...styles.templateCard,
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  gap: isMobile ? 12 : 0,
                  padding: isMobile ? 12 : '12px 16px',
                }}
              >
                <div style={{ ...styles.templateInfo, marginRight: isMobile ? 0 : 12 }}>
                  <div style={{ ...styles.templateName, fontSize: isMobile ? 13 : 14 }}>{t.name}</div>
                  {t.description && <div style={styles.templateDesc}>{t.description}</div>}
                </div>
                <div style={{ ...styles.templateActions, justifyContent: isMobile ? 'stretch' : 'flex-start', gap: 6 }}>
                  <button
                    style={{ 
                      ...styles.btn, 
                      ...styles.btnGhost, 
                      ...styles.btnSmall, 
                      flex: isMobile ? 1 : 'none', 
                      justifyContent: 'center' 
                    }}
                    onClick={() => {
                      if (onSaveConfig) onSaveConfig({ ...buildConfig(), _loadedTemplateId: t.id });
                    }}
                  >
                    Load
                  </button>
                  <button
                    style={{ 
                      ...styles.btn, 
                      ...styles.btnDanger, 
                      ...styles.btnSmall, 
                      flex: isMobile ? 1 : 'none', 
                      justifyContent: 'center' 
                    }}
                    onClick={() => handleDeleteTemplate(t.id)}
                  >
                    <Trash2 size={12} />
                    {isMobile && <span style={{ marginLeft: 6 }}>Delete</span>}
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 }}>
            No saved templates yet.
          </div>
        )}

        <hr style={styles.divider} />

        {/* Preset templates */}
        <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13, marginBottom: 8 }}>
          Preset Templates
          <span style={styles.presetBadge}>Built-in</span>
        </label>
        {PRESET_TEMPLATES.map((preset) => (
          <div 
            key={preset.id} 
            style={{ 
              ...styles.templateCard,
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? 12 : 0,
              padding: isMobile ? 12 : '12px 16px',
            }}
          >
            <div style={{ ...styles.templateInfo, marginRight: isMobile ? 0 : 12 }}>
              <div style={{ ...styles.templateName, fontSize: isMobile ? 13 : 14 }}>{preset.name}</div>
              <div style={preset.description ? styles.templateDesc : { display: 'none' }}>{preset.description}</div>
            </div>
            <div style={{ ...styles.templateActions, justifyContent: isMobile ? 'stretch' : 'flex-start' }}>
              <button
                style={{ 
                  ...styles.btn, 
                  ...styles.btnGhost, 
                  ...styles.btnSmall, 
                  flex: isMobile ? 1 : 'none', 
                  justifyContent: 'center' 
                }}
                onClick={() => {
                  setTeamCount(preset.config.teamCount || 4);
                  if (onSaveConfig) onSaveConfig({ ...buildConfig(), ...preset.config });
                }}
              >
                Load
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section: Location Map Key ── */}
      <div style={{ ...styles.section, padding: isMobile ? 16 : 24, borderRadius: isMobile ? 12 : 16 }}>
        <div style={{ ...styles.sectionTitle, fontSize: isMobile ? 14 : 16 }}>
          <Palette size={18} /> Location Map Key Configurator
        </div>
        <p style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 }}>
          Edit the name, display label, and associated games for each camp/service location. These will be reflected in the Map Key schedule breakdown.
        </p>

        {locations.map((loc, idx) => (
          <div 
            key={loc.id || idx} 
            style={{ 
              ...styles.teamCard, 
              border: '1px solid rgba(41, 182, 246, 0.15)', 
              background: 'rgba(0,0,0,0.15)',
              padding: isMobile ? 12 : 16,
              marginBottom: 12
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Location ID (unique, e.g. 1, MH)</label>
                <input
                  style={{ ...styles.input, fontSize: isMobile ? 13 : 14 }}
                  value={loc.id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocations(prev => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], id: val };
                      return copy;
                    });
                  }}
                />
              </div>
              <div>
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Display Label (e.g. 1. Football Field)</label>
                <input
                  style={{ ...styles.input, fontSize: isMobile ? 13 : 14 }}
                  value={loc.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocations(prev => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], label: val };
                      return copy;
                    });
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: 12, marginBottom: 10 }}>
              <div>
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Internal Name (e.g. Football Field)</label>
                <input
                  style={{ ...styles.input, fontSize: isMobile ? 13 : 14 }}
                  value={loc.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocations(prev => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], name: val };
                      return copy;
                    });
                  }}
                />
              </div>
              <div>
                <label style={{ ...styles.label, fontSize: isMobile ? 11 : 13 }}>Hosted Games (comma-separated)</label>
                <input
                  style={styles.input}
                  value={(loc.games || []).join(', ')}
                  onChange={(e) => {
                    const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                    setLocations(prev => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], games: val };
                      return copy;
                    });
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end', marginTop: isMobile ? 8 : 0 }}>
              <button
                style={{ 
                  ...styles.btn, 
                  background: COLORS.dangerBg, 
                  color: COLORS.danger, 
                  border: `1px solid ${COLORS.danger}30`,
                  padding: isMobile ? '10px 14px' : '4px 10px', 
                  fontSize: isMobile ? 13 : 11,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center'
                }}
                onClick={() => {
                  setLocations(prev => prev.filter((_, i) => i !== idx));
                }}
              >
                <Trash2 size={12} style={{ marginRight: 4 }} /> Remove Location
              </button>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, marginTop: 12 }}>
          <button
            style={{ ...styles.btn, width: isMobile ? '100%' : '50%', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
            onClick={() => {
              setLocations(prev => [
                ...prev,
                { id: (prev.length + 1).toString(), name: 'New Location', label: `${prev.length + 1}. New Location`, games: [] }
              ]);
            }}
          >
            <Plus size={14} style={{ marginRight: 4 }} /> Add Location Key
          </button>
          
          <button
            style={{ ...styles.btn, width: isMobile ? '100%' : '50%', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
            onClick={() => {
              if (window.confirm('Reset all map locations to the default 6 camp locations?')) {
                setLocations([
                  { id: '1', name: 'Football Field', label: '1. Football Field', games: ['Big Mac', 'Cheesy Strings', 'Big Bucket 1', 'Big Bucket 2', 'Golden Snitch 1', 'Golden Snitch 2'] },
                  { id: '2', name: 'Terrace', label: '2. Terrace', games: ['Scale', 'Lift'] },
                  { id: '3', name: 'Court', label: '3. Court', games: ['Cone Memory', 'Puzzle', 'Balloon Darts 1', 'Balloon Darts 2'] },
                  { id: '4', name: 'Pool', label: '4. Pool', games: ['Chubby Bunny', 'Bible Whispers'] },
                  { id: '5', name: 'Roof', label: '5. Roof', games: ['Nadala+ 1', 'Nadala+ 2'] },
                  { id: 'MH', name: 'Main Hall', label: 'MH. Main Hall', games: ['Talk', 'Talk 1', 'Talk 2'] }
                ]);
              }
            }}
          >
            Reset to Default Locations
          </button>
        </div>
      </div>

      {/* ═══════ Save Button ═══════ */}
      <button
        style={{
          ...styles.btn,
          background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.sky})`,
          border: 'none',
          width: '100%',
          justifyContent: 'center',
          padding: '14px 24px',
          fontSize: 15,
          borderRadius: 14,
          marginBottom: 32,
        }}
        onClick={() => onSaveConfig && onSaveConfig(buildConfig())}
      >
        <Save size={16} />
        Save Configuration
      </button>
    </div>
  );
}
