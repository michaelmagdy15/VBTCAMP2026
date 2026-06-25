import React, { useState, useEffect, useMemo } from 'react';
import { Package, DollarSign, Shield, Plus, Trash2, Check, Lock, ClipboardList } from 'lucide-react';
import {
  subscribeToLogistics,
  updateMaterial,
  addMaterial,
  deleteMaterial,
  subscribeToFinancials,
  updateFinancials,
  subscribeToLogisticsAccess,
  updateLogisticsAccess
} from '../logistics';

/* ────────────────────────────────────────────
   Design-system tokens (inline usage)
   ──────────────────────────────────────────── */
const T = {
  bgDark:       '#0a1020',
  bgSurface:    'rgba(13,20,38,0.55)',
  borderGlow:   'rgba(41,182,246,0.15)',
  borderLight:  'rgba(255,255,255,0.06)',
  vbtBlue:      '#0070f3',
  vbtSky:       '#29b6f6',
  textPrimary:  '#ffffff',
  textSecondary:'rgba(255,255,255,0.85)',
  textMuted:    'rgba(255,255,255,0.6)',
  gradientVbt:  'linear-gradient(135deg, #0070f3 0%, #29b6f6 100%)',
  fontTitle:    "'Outfit', sans-serif",
  fontBody:     "'Plus Jakarta Sans', sans-serif",
  glass: {
    background:    'rgba(13,20,38,0.55)',
    backdropFilter:'blur(16px)',
    border:        '1px solid rgba(41,182,246,0.15)',
    borderRadius:  '16px',
  },
};

/* ────────────────────────────────────────────
   Shared inline style helpers
   ──────────────────────────────────────────── */
const glassPanel = {
  ...T.glass,
  padding: '24px',
  marginBottom: '16px',
  boxSizing: 'border-box',
  width: '100%',
  overflowX: 'hidden',
};

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: T.textPrimary,
  padding: '10px 14px',
  fontFamily: T.fontBody,
  fontSize: '15px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary = {
  background: T.gradientVbt,
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '12px 24px',
  fontFamily: T.fontBody,
  fontWeight: 650,
  fontSize: '15px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  transition: 'opacity .2s',
};

const btnDanger = {
  background: 'rgba(239,68,68,0.15)',
  color: '#ef4444',
  border: '1px solid rgba(239,68,68,0.25)',
  borderRadius: '8px',
  padding: '10px 12px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '42px',
  minHeight: '42px',
};

const thStyle = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: T.textSecondary,
  fontFamily: T.fontBody,
  borderBottom: `1px solid ${T.borderLight}`,
};

const tdStyle = {
  padding: '12px 14px',
  borderBottom: `1px solid ${T.borderLight}`,
  verticalAlign: 'middle',
};

/* ────────────────────────────────────────────
   Sub-tab button
   ──────────────────────────────────────────── */
function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(0,112,243,0.18)' : 'transparent',
        color: active ? T.vbtSky : T.textSecondary,
        border: active ? `1px solid ${T.vbtBlue}` : '1px solid transparent',
        borderRadius: '10px',
        padding: '12px 20px',
        fontFamily: T.fontBody,
        fontWeight: 600,
        fontSize: '15px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all .2s',
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

/* ════════════════════════════════════════════
   MATERIALS TAB
   ════════════════════════════════════════════ */
function MaterialsTab({ eventCode, campData }) {
  const [materials, setMaterials] = useState([]);
  const [materialsLost, setMaterialsLost] = useState(0);
  const [materialsCollected, setMaterialsCollected] = useState(0);

  useEffect(() => {
    if (!eventCode) return;
    const unsub = subscribeToLogistics(eventCode, setMaterials);
    return () => unsub();
  }, [eventCode]);

  const totalValue = useMemo(
    () => materials.reduce((sum, m) => sum + (m.quantityAvailable || 0) * (m.unitPrice || 0), 0),
    [materials]
  );

  const handleFieldChange = async (id, field, value) => {
    try {
      await updateMaterial(eventCode, id, { [field]: value });
    } catch (e) {
      console.error('Update failed:', e);
    }
  };

  const handleAdd = async () => {
    try {
      await addMaterial(eventCode, { name: 'New Item' });
    } catch (e) {
      console.error('Add failed:', e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material?')) return;
    try {
      await deleteMaterial(eventCode, id);
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // Derive per-game material breakdown from campData
  const games = campData?.games || campData?.stations || [];

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* ── Inventory Table ── */}
      <div style={glassPanel}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} style={{ color: T.vbtSky }} /> Materials Inventory
        </h3>

        <div style={{ fontSize: '12px', fontStyle: 'italic', color: T.vbtSky, marginBottom: '8px' }}>
          ← Swipe horizontally to view full table →
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Item Name</th>
                <th style={{ ...thStyle, width: '100px' }}>Qty Needed</th>
                <th style={{ ...thStyle, width: '110px' }}>Qty Available</th>
                <th style={{ ...thStyle, width: '100px' }}>Unit Price</th>
                <th style={{ ...thStyle, width: '70px', textAlign: 'center' }}>✓</th>
                <th style={thStyle}>Notes</th>
                <th style={{ ...thStyle, width: '50px' }} />
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id} style={{ transition: 'background .15s' }}>
                  <td style={tdStyle}>
                    <input
                      style={inputStyle}
                      value={m.name || ''}
                      onChange={(e) => handleFieldChange(m.id, 'name', e.target.value)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ ...inputStyle, textAlign: 'center' }}
                      type="number"
                      min="0"
                      value={m.quantityNeeded ?? 0}
                      onChange={(e) => handleFieldChange(m.id, 'quantityNeeded', Number(e.target.value))}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ ...inputStyle, textAlign: 'center' }}
                      type="number"
                      min="0"
                      value={m.quantityAvailable ?? 0}
                      onChange={(e) => handleFieldChange(m.id, 'quantityAvailable', Number(e.target.value))}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ ...inputStyle, textAlign: 'center' }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={m.unitPrice ?? 0}
                      onChange={(e) => handleFieldChange(m.id, 'unitPrice', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => handleFieldChange(m.id, 'verified', !m.verified)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '8px',
                        border: m.verified ? 'none' : '1px solid rgba(255,255,255,0.25)',
                        background: m.verified ? T.gradientVbt : 'rgba(255,255,255,0.06)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all .2s',
                      }}
                    >
                      {m.verified && <Check size={18} />}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={inputStyle}
                      value={m.notes || ''}
                      onChange={(e) => handleFieldChange(m.id, 'notes', e.target.value)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <button style={btnDanger} onClick={() => handleDelete(m.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: T.textMuted, padding: '32px' }}>
                    No materials yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <button style={btnPrimary} onClick={handleAdd}>
            <Plus size={15} /> Add Material
          </button>
          <span style={{ fontFamily: T.fontBody, fontSize: '14px', color: T.vbtSky, fontWeight: 600 }}>
            Total Value: EGP {totalValue.toLocaleString('en', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── Per-Game Breakdown ── */}
      {games.length > 0 && (
        <div style={glassPanel}>
          <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 12px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={16} style={{ color: T.vbtSky }} /> Per-Game Material Breakdown
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {games.map((g, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${T.borderLight}`,
                  borderRadius: '12px',
                  padding: '14px',
                }}
              >
                <div style={{ fontFamily: T.fontTitle, fontSize: '15px', fontWeight: 700, color: T.textPrimary, marginBottom: '6px' }}>
                  {g.name || g.title || `Station ${i + 1}`}
                </div>
                <div style={{ fontFamily: T.fontBody, fontSize: '14px', color: T.textSecondary }}>
                  {g.materials
                    ? g.materials.map((mat, j) => <div key={j}>• {mat}</div>)
                    : <span style={{ color: T.textMuted }}>No materials listed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── End-of-Day ── */}
      <div style={glassPanel}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 14px', fontSize: '15px' }}>
          End-of-Day Summary
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontFamily: T.fontBody, fontSize: '12px', color: T.textSecondary, display: 'block', marginBottom: '6px' }}>
              Materials Lost
            </label>
            <input
              style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', fontWeight: 700, color: '#ef4444' }}
              type="number"
              min="0"
              value={materialsLost}
              onChange={(e) => setMaterialsLost(Number(e.target.value))}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontFamily: T.fontBody, fontSize: '12px', color: T.textSecondary, display: 'block', marginBottom: '6px' }}>
              Materials Collected Back
            </label>
            <input
              style={{ ...inputStyle, textAlign: 'center', fontSize: '18px', fontWeight: 700, color: '#22c55e' }}
              type="number"
              min="0"
              value={materialsCollected}
              onChange={(e) => setMaterialsCollected(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   BALANCE SHEET TAB
   ════════════════════════════════════════════ */
const EXPENSE_CATEGORIES = [
  { key: 'general',       label: 'General Items',  color: '#3b82f6' },
  { key: 'tshirt',        label: 'T-Shirt Orders', color: '#8b5cf6' },
  { key: 'bus',           label: 'Bus / Transport', color: '#f59e0b' },
  { key: 'accommodation', label: 'Accommodation',   color: '#10b981' },
  { key: 'other',         label: 'Other',           color: '#6b7280' },
];

function BalanceSheetTab({ eventCode }) {
  const [financials, setFinancials] = useState({ expenses: [], income: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventCode) return;
    const unsub = subscribeToFinancials(eventCode, (data) => {
      setFinancials({
        expenses: data.expenses || [],
        income: data.income || [],
      });
    });
    return () => unsub();
  }, [eventCode]);

  // ── Persist helper ──
  const persist = async (next) => {
    setSaving(true);
    try {
      await updateFinancials(eventCode, next);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  // ── Expenses ──
  const setExpenses = (fn) => {
    setFinancials((prev) => {
      const next = { ...prev, expenses: typeof fn === 'function' ? fn(prev.expenses) : fn };
      persist(next);
      return next;
    });
  };

  const addExpense = (category = 'general') => {
    setExpenses((prev) => [...prev, { item: '', quantity: 1, unitPrice: 0, category }]);
  };

  const updateExpense = (idx, field, value) => {
    setExpenses((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const removeExpense = (idx) => {
    setExpenses((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Income ──
  const setIncome = (fn) => {
    setFinancials((prev) => {
      const next = { ...prev, income: typeof fn === 'function' ? fn(prev.income) : fn };
      persist(next);
      return next;
    });
  };

  const addIncome = () => {
    setIncome((prev) => [...prev, { source: '', amount: 0 }]);
  };

  const updateIncome = (idx, field, value) => {
    setIncome((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const removeIncome = (idx) => {
    setIncome((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Totals ──
  const totalExpenses = financials.expenses.reduce(
    (s, e) => s + (e.quantity || 0) * (e.unitPrice || 0),
    0
  );
  const totalIncome = financials.income.reduce((s, i) => s + (i.amount || 0), 0);
  const difference = totalIncome - totalExpenses;

  // Group expenses by category
  const grouped = EXPENSE_CATEGORIES.map((cat) => ({
    ...cat,
    items: financials.expenses
      .map((e, idx) => ({ ...e, _idx: idx }))
      .filter((e) => (e.category || 'general') === cat.key),
  }));

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* ── EXPENSES ── */}
      <div style={glassPanel}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={18} style={{ color: '#ef4444' }} /> Expenses
        </h3>

        {grouped.map((cat) => (
          <div key={cat.key} style={{ marginBottom: '20px' }}>
            {/* Category header */}
            <div
              style={{
                background: `${cat.color}22`,
                border: `1px solid ${cat.color}44`,
                borderRadius: '8px',
                padding: '8px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontFamily: T.fontTitle, fontSize: '13px', fontWeight: 700, color: cat.color }}>
                {cat.label}
              </span>
              <button
                style={{ ...btnPrimary, padding: '6px 12px', fontSize: '11px', background: `${cat.color}33`, color: cat.color }}
                onClick={() => addExpense(cat.key)}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {cat.items.length > 0 && (
              <>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: T.vbtSky, marginBottom: '8px' }}>
                  ← Swipe horizontally to view full table →
                </div>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Item</th>
                        <th style={{ ...thStyle, width: '90px' }}>Qty</th>
                        <th style={{ ...thStyle, width: '110px' }}>Unit Price</th>
                        <th style={{ ...thStyle, width: '110px' }}>Total</th>
                        <th style={{ ...thStyle, width: '50px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {cat.items.map((e) => (
                        <tr key={e._idx}>
                          <td style={tdStyle}>
                            <input style={inputStyle} value={e.item || ''} onChange={(ev) => updateExpense(e._idx, 'item', ev.target.value)} />
                          </td>
                          <td style={tdStyle}>
                            <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min="0" value={e.quantity ?? 1} onChange={(ev) => updateExpense(e._idx, 'quantity', Number(ev.target.value))} />
                          </td>
                          <td style={tdStyle}>
                            <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min="0" step="0.01" value={e.unitPrice ?? 0} onChange={(ev) => updateExpense(e._idx, 'unitPrice', Number(ev.target.value))} />
                          </td>
                          <td style={{ ...tdStyle, fontFamily: T.fontBody, fontWeight: 600, fontSize: '13px', color: T.textPrimary }}>
                            EGP {((e.quantity || 0) * (e.unitPrice || 0)).toLocaleString('en', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={tdStyle}>
                            <button style={btnDanger} onClick={() => removeExpense(e._idx)}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ))}

        <div style={{ textAlign: 'right', fontFamily: T.fontBody, fontSize: '15px', fontWeight: 700, color: '#ef4444', paddingTop: '8px', borderTop: `1px solid ${T.borderLight}` }}>
          Subtotal Expenses: EGP {totalExpenses.toLocaleString('en', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* ── INCOME ── */}
      <div style={glassPanel}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={18} style={{ color: '#22c55e' }} /> Income
        </h3>

        <div style={{ fontSize: '12px', fontStyle: 'italic', color: T.vbtSky, marginBottom: '8px' }}>
          ← Swipe horizontally to view full table →
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={{ ...thStyle, width: '140px' }}>Amount</th>
                <th style={{ ...thStyle, width: '50px' }} />
              </tr>
            </thead>
            <tbody>
              {financials.income.map((inc, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>
                    <input style={inputStyle} value={inc.source || ''} onChange={(e) => updateIncome(idx, 'source', e.target.value)} />
                  </td>
                  <td style={tdStyle}>
                    <input style={{ ...inputStyle, textAlign: 'center' }} type="number" min="0" step="0.01" value={inc.amount ?? 0} onChange={(e) => updateIncome(idx, 'amount', Number(e.target.value))} />
                  </td>
                  <td style={tdStyle}>
                    <button style={btnDanger} onClick={() => removeIncome(idx)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {financials.income.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', color: T.textMuted, padding: '24px' }}>
                    No income entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <button style={btnPrimary} onClick={addIncome}>
            <Plus size={15} /> Add Income
          </button>
          <span style={{ fontFamily: T.fontBody, fontSize: '15px', fontWeight: 700, color: '#22c55e' }}>
            Subtotal Income: EGP {totalIncome.toLocaleString('en', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── SUMMARY BAR ── */}
      <div
        style={{
          ...T.glass,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'rgba(13,20,38,0.75)',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontBody, fontSize: '11px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Total Expenses
          </div>
          <div style={{ fontFamily: T.fontTitle, fontSize: '22px', fontWeight: 800, color: '#ef4444' }}>
            EGP {totalExpenses.toLocaleString('en', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontBody, fontSize: '11px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Total Income
          </div>
          <div style={{ fontFamily: T.fontTitle, fontSize: '22px', fontWeight: 800, color: '#22c55e' }}>
            EGP {totalIncome.toLocaleString('en', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontBody, fontSize: '11px', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            {difference >= 0 ? 'Profit' : 'Loss'}
          </div>
          <div
            style={{
              fontFamily: T.fontTitle,
              fontSize: '28px',
              fontWeight: 900,
              color: difference >= 0 ? '#22c55e' : '#ef4444',
              textShadow: difference >= 0 ? '0 0 20px rgba(34,197,94,0.3)' : '0 0 20px rgba(239,68,68,0.3)',
            }}
          >
            {difference >= 0 ? '+' : ''}EGP {difference.toLocaleString('en', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {saving && (
        <div style={{ fontFamily: T.fontBody, fontSize: '11px', color: T.vbtSky, textAlign: 'center', marginTop: '8px', opacity: 0.7 }}>
          Saving…
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   ACCESS CONTROL TAB
   ════════════════════════════════════════════ */
function AccessControlTab({ eventCode, currentUser }) {
  const [accessList, setAccessList] = useState([]);
  const [newName, setNewName] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!eventCode) return;
    const unsub = subscribeToLogisticsAccess(eventCode, (data) => {
      setAccessList(data.allowedNames || ['Yohanna', 'Amy', 'Rita', 'Andrew']);
    });
    return () => unsub();
  }, [eventCode]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || accessList.includes(trimmed)) return;
    const next = [...accessList, trimmed];
    setAccessList(next);
    setNewName('');
    try {
      await updateLogisticsAccess(eventCode, next);
    } catch (e) {
      console.error('Failed to update access:', e);
    }
  };

  const handleRemove = async (name) => {
    const next = accessList.filter((n) => n !== name);
    setAccessList(next);
    try {
      await updateLogisticsAccess(eventCode, next);
    } catch (e) {
      console.error('Failed to update access:', e);
    }
  };

  return (
    <div style={glassPanel}>
      <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={18} style={{ color: T.vbtSky }} /> Logistics Access Control
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {accessList.map((name) => (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${T.borderLight}`,
              borderRadius: '10px',
              padding: '10px 16px',
            }}
          >
            <span style={{ fontFamily: T.fontBody, fontSize: '14px', color: T.textPrimary, fontWeight: 500 }}>
              {name}
            </span>
            {isAdmin && (
              <button style={btnDanger} onClick={() => handleRemove(name)}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Add a name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button style={btnPrimary} onClick={handleAdd}>
            <Plus size={15} /> Add
          </button>
        </div>
      )}

      {!isAdmin && (
        <div style={{ fontFamily: T.fontBody, fontSize: '12px', color: T.textMuted, marginTop: '8px' }}>
          Only admins can modify the access list.
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN COMPONENT — LogisticsPanel
   ════════════════════════════════════════════ */
export default function LogisticsPanel({ eventCode, currentUser, eventConfig, campData }) {
  const [activeTab, setActiveTab] = useState('materials');
  const [accessList, setAccessList] = useState(null);

  // Subscribe to access list to gate the panel
  useEffect(() => {
    if (!eventCode) return;
    const unsub = subscribeToLogisticsAccess(eventCode, (data) => {
      setAccessList(data.allowedNames || ['Yohanna', 'Amy', 'Rita', 'Andrew']);
    });
    return () => unsub();
  }, [eventCode]);

  // Determine authorisation
  const userName = currentUser?.name || '';
  const isAdmin = currentUser?.role === 'admin';
  const isAuthorized =
    isAdmin ||
    (accessList && accessList.some((n) => n.toLowerCase() === userName.toLowerCase()));

  // Still loading access list
  if (accessList === null) {
    return (
      <div style={{ ...glassPanel, textAlign: 'center', padding: '48px', color: T.textMuted, fontFamily: T.fontBody }}>
        Loading logistics…
      </div>
    );
  }

  // ── Access Gate ──
  if (!isAuthorized) {
    return (
      <div
        style={{
          ...T.glass,
          padding: '48px 32px',
          textAlign: 'center',
          background: 'rgba(13,20,38,0.7)',
        }}
      >
        <Lock size={48} style={{ color: T.textMuted, marginBottom: '16px' }} />
        <h2 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 8px', fontSize: '20px' }}>
          Logistics Panel Locked
        </h2>
        <p style={{ fontFamily: T.fontBody, color: T.textSecondary, fontSize: '14px', margin: 0 }}>
          You don't have access to the logistics panel. Contact an admin to request access.
        </p>
      </div>
    );
  }

  // ── Authorized View ──
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <TabButton active={activeTab === 'materials'} icon={Package} label="Materials" onClick={() => setActiveTab('materials')} />
        <TabButton active={activeTab === 'balance'} icon={DollarSign} label="Balance Sheet" onClick={() => setActiveTab('balance')} />
        <TabButton active={activeTab === 'access'} icon={Shield} label="Access Control" onClick={() => setActiveTab('access')} />
      </div>

      {/* Active tab content */}
      {activeTab === 'materials' && (
        <MaterialsTab eventCode={eventCode} campData={campData} />
      )}
      {activeTab === 'balance' && (
        <BalanceSheetTab eventCode={eventCode} />
      )}
      {activeTab === 'access' && (
        <AccessControlTab eventCode={eventCode} currentUser={currentUser} />
      )}
    </div>
  );
}
