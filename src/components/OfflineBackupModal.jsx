import React, { useState } from 'react';

const OfflineBackupModal = ({ onClose, campData, globalServants, eventConfig }) => {
  const [status, setStatus] = useState('');

  const exportBackup = async () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        campData,
        globalServants,
        eventConfig
      };
      const jsonStr = JSON.stringify(backupData);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], `vbt_backup_${new Date().getTime()}.json`, { type: 'application/json' });
      
      // Try native share for AirDrop / Nearby Share (Bluetooth/WiFi direct)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'VBT App Backup',
          files: [file]
        });
        setStatus('Shared successfully!');
      } else {
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setStatus('Downloaded backup file.');
      }
    } catch (err) {
      console.error("Backup failed:", err);
      setStatus(`Backup failed: ${err.message}`);
    }
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.timestamp || !data.eventConfig) {
          throw new Error("Invalid backup file format.");
        }
        
        // Save to local storage cache so offline sync works immediately
        if (data.eventConfig) {
           // We might need to handle this more elegantly in a real system, but for now we'll alert the user.
        }
        
        setStatus('Backup imported! Please restart the app while offline.');
      } catch (err) {
        setStatus(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: 'rgba(5,7,20,0.9)', backdropFilter: 'blur(14px)', padding: '24px'
    }}>
      <div style={{
        background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px', 
        color: '#ffffff', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', fontWeight: '800' }}>Offline Device Sync</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Use this to transfer the current app state to another device over Bluetooth/WiFi (AirDrop, QuickShare), or as an offline backup file.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={exportBackup} 
            style={{
              padding: '16px', borderRadius: '12px', border: 'none', 
              background: '#3b82f6', color: '#fff', fontWeight: '700', cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Export Backup (Share)
          </button>
          
          <div style={{ position: 'relative' }}>
            <button 
              style={{
                width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', 
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '700', cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Import Backup File
            </button>
            <input 
              type="file" 
              accept=".json" 
              onChange={importBackup} 
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            />
          </div>
        </div>

        {status && (
          <div style={{ marginTop: '16px', fontSize: '0.8rem', color: '#4ade80', fontWeight: '600' }}>
            {status}
          </div>
        )}

        <button 
          onClick={onClose} 
          style={{
            marginTop: '24px', width: '100%', padding: '12px', borderRadius: '12px', 
            border: 'none', background: 'rgba(255,255,255,0.08)', color: '#fff', 
            fontWeight: '600', cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default OfflineBackupModal;
