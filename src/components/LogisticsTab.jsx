import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Package, Plus, Trash2 } from 'lucide-react';

const T = {
  bgDark: '#0a1020',
  bgSurface: 'rgba(13,20,38,0.55)',
  borderLight: 'rgba(255,255,255,0.06)',
  vbtSky: '#29b6f6',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.85)',
  textMuted: 'rgba(255,255,255,0.6)',
  gradientVbt: 'linear-gradient(135deg, #0070f3 0%, #29b6f6 100%)',
  fontTitle: "'Outfit', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
  glass: {
    background: 'rgba(13,20,38,0.55)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(41,182,246,0.15)',
    borderRadius: '16px',
  },
};

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
  fontSize: '14px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary = {
  background: T.gradientVbt,
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 20px',
  fontFamily: T.fontBody,
  fontWeight: 600,
  fontSize: '14px',
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
  padding: '8px 10px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const thStyle = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: T.textSecondary,
  fontFamily: T.fontBody,
  borderBottom: \1px solid \\,
};

const tdStyle = {
  padding: '12px 14px',
  borderBottom: \1px solid \\,
  verticalAlign: 'middle',
};

export default function LogisticsTab({ eventCode, currentUser }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventCode) return;
    const docRef = doc(db, 'vbt_events', eventCode, 'logistics', 'main');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInventory(data.items || []);
      } else {
        setInventory([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [eventCode]);

  const saveInventory = async (newInventory) => {
    try {
      const docRef = doc(db, 'vbt_events', eventCode, 'logistics', 'main');
      await setDoc(docRef, { items: newInventory }, { merge: true });
    } catch (e) {
      console.error("Error saving logistics:", e);
    }
  };

  const handleFieldChange = (id, field, value) => {
    const newInventory = inventory.map(item => 
      item.material_id === id ? { ...item, [field]: value } : item
    );
    setInventory(newInventory);
    saveInventory(newInventory);
  };

  const handleAdd = () => {
    const newItem = {
      material_id: Date.now().toString(),
      name: 'New Material',
      station_allocation_count: 0,
      is_returnable: true,
      end_day_reconciliation_count: 0
    };
    const newInventory = [...inventory, newItem];
    setInventory(newInventory);
    saveInventory(newInventory);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this material?')) return;
    const newInventory = inventory.filter(item => item.material_id !== id);
    setInventory(newInventory);
    saveInventory(newInventory);
  };

  if (loading) {
    return <div style={{ color: T.textMuted, padding: '24px', textAlign: 'center' }}>Loading Logistics...</div>;
  }

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'coordinator') {
    return <div style={{ color: '#ef4444', padding: '24px', textAlign: 'center' }}>Access Denied. Only Coordinators can access this module.</div>;
  }

  return (
    <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <div style={glassPanel}>
        <h3 style={{ fontFamily: T.fontTitle, color: T.textPrimary, margin: '0 0 16px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} style={{ color: T.vbtSky }} /> Station Material Logistics
        </h3>
        <p style={{ color: T.textMuted, fontSize: '14px', marginBottom: '16px' }}>Manage station inventory allocations and end-of-day reconciliation.</p>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Material Name</th>
                <th style={{ ...thStyle, width: '140px' }}>Station Allocations</th>
                <th style={{ ...thStyle, width: '100px', textAlign: 'center' }}>Returnable</th>
                <th style={{ ...thStyle, width: '160px' }}>End of Day Reconciled</th>
                <th style={{ ...thStyle, width: '60px' }} />
              </tr>
            </thead>
            <tbody>
              {inventory.map((m) => (
                <tr key={m.material_id}>
                  <td style={tdStyle}>
                    <input
                      style={inputStyle}
                      value={m.name || ''}
                      onChange={(e) => handleFieldChange(m.material_id, 'name', e.target.value)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ ...inputStyle, textAlign: 'center' }}
                      type="number"
                      min="0"
                      value={m.station_allocation_count ?? 0}
                      onChange={(e) => handleFieldChange(m.material_id, 'station_allocation_count', Number(e.target.value))}
                    />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={m.is_returnable ?? true}
                      onChange={(e) => handleFieldChange(m.material_id, 'is_returnable', e.target.checked)}
                      style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      style={{ 
                        ...inputStyle, 
                        textAlign: 'center', 
                        color: (m.is_returnable && (m.end_day_reconciliation_count ?? 0) < (m.station_allocation_count ?? 0)) ? '#ef4444' : '#22c55e',
                        opacity: m.is_returnable ? 1 : 0.4
                      }}
                      type="number"
                      min="0"
                      value={m.end_day_reconciliation_count ?? 0}
                      onChange={(e) => handleFieldChange(m.material_id, 'end_day_reconciliation_count', Number(e.target.value))}
                      disabled={!m.is_returnable}
                    />
                  </td>
                  <td style={tdStyle}>
                    <button style={btnDanger} onClick={() => handleDelete(m.material_id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: T.textMuted, padding: '32px' }}>
                    No materials added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '16px' }}>
          <button style={btnPrimary} onClick={handleAdd}>
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>
    </div>
  );
}
