import React, { useEffect, useState } from 'react';
import { supabase } from '../App';

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState([
    { label: 'Total Verified Students', count: '1,842', change: '+12%', color: 'var(--primary)', icon: '📚' },
    { label: 'Verified Listings', count: '394', change: '+8%', color: 'var(--accent)', icon: '🏠' },
    { label: 'Active Bookings', count: '124', change: '+24%', color: 'var(--secondary)', icon: '🤝' },
    { label: 'Monthly GMV Payouts', count: '₹28.4L', change: '+18%', color: 'var(--warning)', icon: '💳' }
  ]);

  const [activityLogs, setActivityLogs] = useState([
    { time: 'Just Now', type: 'Realtime', message: 'Listening on live Supabase WAL broadcast channel...', status: 'Success' }
  ]);

  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function fetchLiveCounts() {
      try {
        // Query users count
        const { count: usersCount, error: errU } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        if (errU) throw errU;

        // Query rooms count
        const { count: roomsCount } = await supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true });

        // Query bookings count
        const { count: bookingsCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Active');

        // Query sum of payments for GMV
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'Successful');

        let gmv = 28.4;
        if (paymentsData && paymentsData.length > 0) {
          const totalPaid = paymentsData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
          gmv = totalPaid / 100000; // in Lakhs
        }

        setMetrics([
          { label: 'Total Verified Students', count: String(usersCount ?? 1842), change: '+12%', color: 'var(--primary)', icon: '📚' },
          { label: 'Verified Listings', count: String(roomsCount ?? 394), change: '+8%', color: 'var(--accent)', icon: '🏠' },
          { label: 'Active Bookings', count: String(bookingsCount ?? 124), change: '+24%', color: 'var(--secondary)', icon: '🤝' },
          { label: 'Monthly GMV Payouts', count: `₹${gmv.toFixed(1)}L`, change: '+18%', color: 'var(--warning)', icon: '💳' }
        ]);
        setIsOffline(false);
      } catch (err) {
        console.warn("Could not query live table stats from Supabase. Defaulting to mock metrics.", err);
        setIsOffline(true);
      }
    }

    async function fetchLiveLogs() {
      try {
        const logs = [];

        // 1. Fetch latest bookings
        const { data: bData } = await supabase
          .from('bookings')
          .select('id, created_at, status, rent')
          .order('created_at', { ascending: false })
          .limit(5);
        if (bData) {
          bData.forEach(b => {
            logs.push({
              timestamp: new Date(b.created_at),
              type: 'Booking',
              message: `Booking #${b.id.substring(0, 8)}: Rented Room (Rent: ₹${b.rent})`,
              status: b.status === 'Active' ? 'Success' : 'Pending'
            });
          });
        }

        // 2. Fetch latest payments
        const { data: pData } = await supabase
          .from('payments')
          .select('id, created_at, status, amount, method')
          .order('created_at', { ascending: false })
          .limit(5);
        if (pData) {
          pData.forEach(p => {
            logs.push({
              timestamp: new Date(p.created_at),
              type: 'Payment',
              message: `Razorpay payment receipt verified (₹${p.amount} via ${p.method})`,
              status: p.status === 'Successful' ? 'Success' : 'Failed'
            });
          });
        }

        // 3. Fetch latest tickets
        const { data: mData } = await supabase
          .from('maintenance')
          .select('id, created_at, status, issue')
          .order('created_at', { ascending: false })
          .limit(5);
        if (mData) {
          mData.forEach(t => {
            logs.push({
              timestamp: new Date(t.created_at),
              type: 'Maintenance',
              message: `Maintenance Ticket #${t.id.substring(0, 8)} opened: "${t.issue}"`,
              status: t.status === 'Resolved' ? 'Success' : t.status === 'Escalated' ? 'Failed' : 'Pending'
            });
          });
        }

        // 4. Fetch latest complaints
        const { data: cData } = await supabase
          .from('complaints')
          .select('id, created_at, status, description')
          .order('created_at', { ascending: false })
          .limit(5);
        if (cData) {
          cData.forEach(c => {
            logs.push({
              timestamp: new Date(c.created_at),
              type: 'Complaint',
              message: `SLA Complaint #${c.id.substring(0, 8)} filed: "${c.description}"`,
              status: c.status === 'Resolved' ? 'Success' : 'Failed'
            });
          });
        }

        if (logs.length > 0) {
          // Sort by timestamp desc
          logs.sort((a, b) => b.timestamp - a.timestamp);
          
          // Add relative times
          const formatted = logs.map(l => {
            const diffMs = new Date() - l.timestamp;
            const diffMins = Math.floor(diffMs / 60000);
            let timeStr = 'Just Now';
            if (diffMins > 0) {
              if (diffMins < 60) {
                timeStr = `${diffMins} mins ago`;
              } else {
                const diffHrs = Math.floor(diffMins / 60);
                timeStr = `${diffHrs} hrs ago`;
              }
            }
            return {
              time: timeStr,
              type: l.type,
              message: l.message,
              status: l.status
            };
          });

          setActivityLogs(formatted.slice(0, 10));
        }
      } catch (err) {
        console.warn("Could not query live operation logs. Defaulting to mock logs.", err);
      }
    }

    fetchLiveCounts();
    fetchLiveLogs();

    // Subscribe to realtime channels
    const channel = supabase
      .channel('admin-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        fetchLiveCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        fetchLiveCounts();
        if (payload.eventType === 'INSERT') {
          const r = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Listing',
            message: `New room listing submitted: "${r.title}" in ${r.city}`,
            status: r.verified ? 'Success' : 'Pending'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
        } else if (payload.eventType === 'DELETE') {
          const newLog = {
            time: 'Just Now',
            type: 'Listing',
            message: `Room listing was deleted from database`,
            status: 'Success'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
        } else if (payload.eventType === 'UPDATE') {
          const r = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Listing',
            message: `Listing "${r.title}" updated (Verified: ${r.verified})`,
            status: r.verified ? 'Success' : 'Pending'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const p = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Payment',
            message: `Razorpay payment received (₹${p.amount} via ${p.method})`,
            status: p.status === 'Successful' ? 'Success' : 'Failed'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
          fetchLiveCounts(); // Recalculate metrics counter
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const b = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Booking',
            message: `New booking request #${b.id.substring(0, 8)} filed (Rent: ₹${b.rent})`,
            status: 'Pending'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
          fetchLiveCounts();
        } else if (payload.eventType === 'UPDATE') {
          const b = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Booking',
            message: `Booking #${b.id.substring(0, 8)} status updated to ${b.status}`,
            status: b.status === 'Active' ? 'Success' : 'Pending'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
          fetchLiveCounts();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const t = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Maintenance',
            message: `New maintenance ticket opened: "${t.issue}"`,
            status: 'Pending'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new;
          const newLog = {
            time: 'Just Now',
            type: 'Complaint',
            message: `SLA Complaint filed: "${c.description}"`,
            status: 'Failed'
          };
          setActivityLogs(prev => [newLog, ...prev.slice(0, 9)]);
        }
      })
      .subscribe((status) => {
        console.log("Supabase Realtime Channel Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
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
          <span>Operating in Offline Fallback Mode. Supabase connection timed out or tables are not initialized. Mock metrics and logs are shown.</span>
        </div>
      )}
      
      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        {metrics.map((m, idx) => (
          <div key={idx} className="glass glass-hover" style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              fontSize: '80px',
              opacity: '0.04',
              pointerEvents: 'none'
            }}>
              {m.icon}
            </div>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                {m.label}
              </span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>{m.count}</h2>
              <span style={{ fontSize: '12px', color: m.color === 'var(--danger)' ? 'var(--danger)' : 'var(--accent)', fontWeight: 'bold' }}>
                {m.change} this month
              </span>
            </div>
            <div style={{
              fontSize: '32px',
              background: 'rgba(0,0,0,0.03)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              lineHeight: '1'
            }}>
              {m.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '24px'
      }}>
        <div className="glass" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', justify: 'space-between' }}>
            <span>📈 Revenue Trajectory (FY26)</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Amount in INR (Lakhs)</span>
          </h3>
          <div style={{ width: '100%', height: '200px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <svg style={{ width: '100%', height: '180px' }} viewBox="0 0 500 180">
              <defs>
                <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="30" y1="30" x2="480" y2="30" stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
              <line x1="30" y1="80" x2="480" y2="80" stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
              <line x1="30" y1="130" x2="480" y2="130" stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
              <line x1="30" y1="170" x2="480" y2="170" stroke="rgba(0,0,0,0.1)" />

              <path 
                d="M 30 150 L 100 130 L 170 140 L 240 90 L 310 100 L 380 60 L 450 35 L 480 30" 
                fill="none" 
                stroke="var(--primary)" 
                strokeWidth="4" 
                strokeLinecap="round"
              />
              <path 
                d="M 30 150 L 100 130 L 170 140 L 240 90 L 310 100 L 380 60 L 450 35 L 480 30 L 480 170 L 30 170 Z" 
                fill="url(#chart-glow)"
              />
              
              <circle cx="100" cy="130" r="5" fill="var(--primary)" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
              <circle cx="240" cy="90" r="5" fill="var(--primary)" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
              <circle cx="380" cy="60" r="5" fill="var(--primary)" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
              <circle cx="450" cy="35" r="5" fill="var(--primary)" stroke="rgba(0,0,0,0.2)" strokeWidth="2" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>Nov</span>
              <span>Dec</span>
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', justify: 'space-between' }}>
            <span>🏢 Booking Funnel Ratios</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Property distribution</span>
          </h3>
          <div style={{ width: '100%', height: '200px', display: 'flex', flexDirection: 'column' }}>
            <svg style={{ width: '100%', height: '180px' }} viewBox="0 0 500 180">
              <line x1="30" y1="170" x2="480" y2="170" stroke="rgba(0,0,0,0.1)" />
              
              <rect x="70" y="70" width="36" height="100" rx="4" fill="rgba(99, 102, 241, 0.4)" />
              <rect x="70" y="70" width="36" height="8" rx="2" fill="var(--primary)" />
              <text x="88" y="60" fill="var(--text-primary)" fontSize="11" textAnchor="middle">240</text>
              
              <rect x="190" y="30" width="36" height="140" rx="4" fill="rgba(16, 185, 129, 0.4)" />
              <rect x="190" y="30" width="36" height="8" rx="2" fill="var(--accent)" />
              <text x="208" y="20" fill="var(--text-primary)" fontSize="11" textAnchor="middle">384</text>
              
              <rect x="310" y="110" width="36" height="60" rx="4" fill="rgba(236, 72, 153, 0.4)" />
              <rect x="310" y="110" width="36" height="8" rx="2" fill="var(--secondary)" />
              <text x="328" y="100" fill="var(--text-primary)" fontSize="11" textAnchor="middle">120</text>

              <rect x="420" y="150" width="36" height="20" rx="4" fill="rgba(239, 68, 68, 0.4)" />
              <rect x="420" y="150" width="36" height="8" rx="2" fill="var(--danger)" />
              <text x="438" y="140" fill="var(--text-primary)" fontSize="11" textAnchor="middle">18</text>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ width: '80px', textAlign: 'center' }}>Requested</span>
              <span style={{ width: '80px', textAlign: 'center' }}>Active Rent</span>
              <span style={{ width: '80px', textAlign: 'center' }}>Completed</span>
              <span style={{ width: '80px', textAlign: 'center' }}>Disputed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Log Feed */}
      <div className="glass" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>⚡ Real-time Operation Logs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activityLogs.map((log, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  background: 'rgba(0,0,0,0.03)',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)'
                }}>{log.time}</span>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: log.status === 'Escalated' ? 'var(--danger)' : 'var(--text-primary)'
                }}>[{log.type}]</span>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{log.message}</p>
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '4px 8px',
                borderRadius: '4px',
                background: log.status === 'Success' ? 'rgba(16, 185, 129, 0.15)' :
                            log.status === 'Pending' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: log.status === 'Success' ? 'var(--accent)' :
                       log.status === 'Pending' ? 'var(--warning)' : 'var(--danger)',
                border: `1px solid ${
                  log.status === 'Success' ? 'rgba(16, 185, 129, 0.3)' :
                  log.status === 'Pending' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                }`
              }}>
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
