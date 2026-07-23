import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'open', 'resolved'
  const [notification, setNotification] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  async function loadLiveComplaints() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*, complainant:complainant_id(name, email, phone), room:room_id(title, city)');

      if (error) throw error;

      if (data) {
        const formatted = data.map(c => ({
          id: c.id,
          room: c.room?.title || c.room_id || 'Student Flat',
          city: c.room?.city || 'Goa',
          type: c.type || 'Maintenance Issue',
          description: c.description,
          sla: c.sla || (c.status === 'Resolved' ? 'Resolved' : 'Active 24h SLA'),
          status: c.status || 'Open',
          complainant: c.complainant?.name || 'Student Tenant',
          complainantEmail: c.complainant?.email || '',
          complainantPhone: c.complainant?.phone || '',
          createdAt: c.created_at
        }));
        setComplaints(formatted);
      }
    } catch (err) {
      console.warn("Using demo fallback complaints.", err);
      setComplaints([
        {
          id: 'CP-901',
          room: 'RM-3042 Stanza Living Flat A',
          city: 'Panaji',
          type: 'Maintenance Escalation',
          description: 'Geyser failure reported 48 hours ago. Owner acknowledged but took no action. Water leaking in bathroom.',
          sla: 'Breached 24h SLA',
          status: 'Open',
          complainant: 'Aravind S. (Student)',
          complainantEmail: 'aravind.s@example.com',
          complainantPhone: '9876543210',
          createdAt: new Date().toISOString()
        },
        {
          id: 'CP-902',
          room: 'RM-2094 Premium Dual Sharing',
          city: 'Verna',
          type: 'Security Deposit Dispute',
          description: 'Owner did not return full refund of security deposit. Claiming deductions for pre-existing wall paint damage.',
          sla: 'Active SLA (Expires in 2 days)',
          status: 'Open',
          complainant: 'Nisha K. (Student)',
          complainantEmail: 'nisha.k@example.com',
          complainantPhone: '9845127896',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLiveComplaints();

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

  const handleResolveComplaint = async (id, resolutionNotes) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'Resolved', sla: 'Resolved' })
        .eq('id', id);

      if (error) throw error;

      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'Resolved', sla: 'Resolved' } : c));
      setSelectedComplaint(null);
      setNotification(`Dispute / Ticket #${id.substring(0, 8)} marked as RESOLVED.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(`Failed to resolve dispute: ${err.message || err}`);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'open') return c.status === 'Open';
    if (filter === 'resolved') return c.status === 'Resolved';
    return true;
  });

  const totalCount = complaints.length;
  const openCount = complaints.filter(c => c.status === 'Open').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;
  const breachedCount = complaints.filter(c => c.sla?.toLowerCase().includes('breach')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Complaints</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--text-primary)' }}>{totalCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(99, 102, 241, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⚠️
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Open Disputes</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--warning)' }}>{openCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(245, 158, 11, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⏳
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>SLA Breached</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--danger)' }}>{breachedCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(239, 68, 68, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🚨
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Resolved Tickets</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--accent)' }}>{resolvedCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(16, 185, 129, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✓
          </div>
        </div>
      </div>

      {notification && (
        <div className="fade-in" style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid var(--accent)',
          color: 'var(--text-primary)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          🛡️ SYSTEM LOG: {notification}
        </div>
      )}

      {/* Control Bar */}
      <div className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', margin: 0 }}>Tenant Security Disputes &amp; Maintenance SLA Monitor</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Real-time 24-hour maintenance SLA tracking and deposit settlement logs.</p>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button 
            className={filter === 'all' ? '' : 'secondary'}
            onClick={() => setFilter('all')}
            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
          >
            All ({totalCount})
          </button>
          <button 
            className={filter === 'open' ? '' : 'secondary'}
            onClick={() => setFilter('open')}
            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
          >
            Open ({openCount})
          </button>
          <button 
            className={filter === 'resolved' ? '' : 'secondary'}
            onClick={() => setFilter('resolved')}
            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Complaints Table Card */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Dispute Details</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Complainant</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Category</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>SLA Status</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Ticket Status</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="pulsing" style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
                  Loading complaints...
                </td>
              </tr>
            ) : filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  ✓ No complaints or SLA breaches reported.
                </td>
              </tr>
            ) : (
              filteredComplaints.map(comp => {
                const isBreached = comp.sla?.toLowerCase().includes('breach');
                const isResolved = comp.status === 'Resolved';
                return (
                  <tr key={comp.id} style={{
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <td style={{ padding: '16px', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}>
                      <div>
                        <strong style={{ fontSize: '15px', color: 'var(--text-primary)', display: 'block' }}>{comp.room}</strong>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', maxWidth: '300px' }}>{comp.description}</p>
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>{comp.complainant}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{comp.complainantEmail || 'Student'}</span>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--primary)'
                      }}>
                        {comp.type}
                      </span>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: isBreached ? 'var(--danger)' : isResolved ? 'var(--accent)' : 'var(--warning)'
                      }}>
                        {isBreached ? '🚨 ' : ''}{comp.sla}
                      </span>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: isResolved ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: isResolved ? 'var(--accent)' : 'var(--warning)'
                      }}>
                        {isResolved ? '✓ Resolved' : '⏳ Open'}
                      </span>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                      {!isResolved ? (
                        <button 
                          onClick={() => {
                            const notes = prompt(`Enter resolution summary for ticket ${comp.id}:`, "Resolved by CampusStay Support.");
                            if (notes) handleResolveComplaint(comp.id, notes);
                          }}
                          style={{ padding: '8px 16px', fontSize: '12px', background: 'var(--accent)', borderColor: 'var(--accent)', color: 'white', fontWeight: 'bold' }}
                        >
                          ✓ Resolve Dispute
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 'bold' }}>✓ Settled</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
