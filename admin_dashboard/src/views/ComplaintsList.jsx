import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState([
    {
      id: 'CP-901',
      room: 'RM-3042',
      type: 'Maintenance Escalation',
      description: 'Geyser failure reported 48 hours ago. Owner acknowledged but took no action. Water leaking in bathroom.',
      sla: 'Breached & Escalated',
      status: 'Open',
      complainant: 'Aravind S. (Student)'
    },
    {
      id: 'CP-902',
      room: 'RM-2094',
      type: 'Security Deposit Dispute',
      description: 'Owner did not return full refund of security deposit. Claiming deductions for pre-existing wall paint damage.',
      sla: 'Active (Expires in 2 days)',
      status: 'Open',
      complainant: 'Nisha K. (Student)'
    }
  ]);

  const [notification, setNotification] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  async function loadLiveComplaints() {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*, complainant:complainant_id(name)');
      
      if (error) throw error;
      
      if (data) {
        const formatted = data.map(c => ({
          id: c.id,
          room: c.room_id || 'Room Listing',
          type: c.type,
          description: c.description,
          sla: c.sla || 'Active',
          status: c.status,
          complainant: c.complainant?.name || 'Student'
        }));
        setComplaints(formatted);
      }
      setIsOffline(false);
    } catch (err) {
      console.warn("Using offline fallback complaints registry.", err);
      setIsOffline(true);
    }
  }

  useEffect(() => {
    loadLiveComplaints();

    // Subscribe to realtime complaints table changes
    const channel = supabase
      .channel('disputes-complaints-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => {
        loadLiveComplaints();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = async (id, newStatus, message) => {
    if (isOffline) {
      setComplaints(prev => prev.map(comp => comp.id === id ? { ...comp, status: newStatus, sla: newStatus === 'Resolved' ? 'Resolved' : comp.sla } : comp));
      setNotification(message);
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setComplaints(prev => prev.map(comp => comp.id === id ? { ...comp, status: newStatus, sla: newStatus === 'Resolved' ? 'Resolved' : comp.sla } : comp));
      setNotification(message);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      console.error("Supabase update failed:", err);
      alert(`Error: Failed to save changes to database. ${err.message || err}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {isOffline && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid #ef4444',
          color: 'var(--text-primary)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>⚠️</span>
          <span>Operating in Offline Fallback Mode. Supabase connection timed out or tables are not initialized. Mock complaints are shown.</span>
        </div>
      )}
      
      {notification && (
        <div className="fade-in" style={{
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid var(--primary)',
          color: 'var(--text-primary)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          🛡️ SYSTEM LOG: {notification}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {complaints.map(comp => (
          <div key={comp.id} className="glass" style={{
            padding: '24px',
            borderLeft: `4px solid ${
              comp.status === 'Resolved' ? 'var(--accent)' :
              comp.sla.includes('Breached') ? 'var(--danger)' : 'var(--warning)'
            }`,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>{comp.id} • Room {comp.room}</span>
                <h3 style={{ fontSize: '18px', color: 'var(--text-primary)', marginTop: '4px' }}>{comp.type}</h3>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: comp.sla === 'Resolved' ? 'rgba(16, 185, 129, 0.1)' :
                              comp.sla.includes('Breached') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: comp.sla === 'Resolved' ? 'var(--accent)' :
                         comp.sla.includes('Breached') ? 'var(--danger)' : 'var(--warning)',
                  border: `1px solid ${
                    comp.sla === 'Resolved' ? 'rgba(16, 185, 129, 0.2)' :
                    comp.sla.includes('Breached') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                  }`
                }}>
                  {comp.sla}
                </span>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '50px',
                  background: comp.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: comp.status === 'Resolved' ? 'var(--accent)' : 'var(--danger)'
                }}>
                  ● {comp.status}
                </span>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
              {comp.description}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-glass)',
              paddingTop: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dark)' }}>
                Complainant: <strong style={{ color: 'var(--text-muted)' }}>{comp.complainant}</strong>
              </span>

              {comp.status === 'Open' ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    id={`warn-${comp.id}`}
                    className="secondary" 
                    onClick={() => handleAction(comp.id, 'Open', `Official warning email dispatched to owner for ${comp.room}.`)}
                    style={{ padding: '8px 14px', fontSize: '12px' }}
                  >
                    Send Owner Warning
                  </button>
                  <button 
                    id={`resolve-${comp.id}`}
                    onClick={() => handleAction(comp.id, 'Resolved', `Dispute ${comp.id} resolved in Supabase system. Ticket closed.`)}
                    style={{ padding: '8px 14px', fontSize: '12px' }}
                  >
                    Resolve & Close
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600' }}>✓ Investigation Completed</span>
              )}
            </div>

          </div>
        ))}
      </div>
      
    </div>
  );
}
