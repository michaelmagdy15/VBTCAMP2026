import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function ServiceSelectionDashboard({ onSelectService }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'vbt_services'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const svcs = [];
      snapshot.forEach((doc) => svcs.push({ id: doc.id, ...doc.data() }));
      setServices(svcs);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginBottom: '20px' }}>Active Services</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {services.map(svc => (
          <div 
            key={svc.id}
            onClick={() => onSelectService(svc.id)}
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: 'rgba(30, 41, 59, 0.7)',
              border: `2px solid ${svc.status === 'active' ? '#22d3ee' : 'rgba(148, 163, 184, 0.15)'}`,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              transform: 'scale(1)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <h3 style={{ fontSize: '18px', color: '#fff', margin: '0 0 8px 0' }}>{svc.name}</h3>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '14px' }}>Status: <strong style={{ color: svc.status === 'active' ? '#22d3ee' : '#cbd5e1', textTransform: 'uppercase' }}>{svc.status}</strong></p>
          </div>
        ))}
        {services.length === 0 && (
          <p style={{ color: '#94a3b8' }}>No services available.</p>
        )}
      </div>
    </div>
  );
}
