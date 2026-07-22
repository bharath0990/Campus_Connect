import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [notification, setNotification] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function loadLiveUsers() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('joined_date', { ascending: false });

        if (error) throw error;

        if (data) {
          setUsers(data);
        }
        setIsOffline(false);
      } catch (err) {
        console.warn("Using offline user profile fallbacks.", err);
        setIsOffline(true);
        // Load fallback/mock users if database connection is failing
        setUsers([
          {
            id: 'mock_student_1',
            name: 'Aravind Swaminathan',
            email: 'aravind.s@example.com',
            phone: '9876543210',
            role: 'student',
            verified: true,
            trust_score: 95,
            joined_date: new Date().toISOString(),
            blocked: false,
            username: 'aravind_s'
          },
          {
            id: 'mock_owner_1',
            name: 'Rajesh PG Owner',
            email: 'rajesh.owner@example.com',
            phone: '9822114455',
            role: 'owner',
            verified: true,
            trust_score: 72,
            joined_date: new Date(Date.now() - 86400000 * 5).toISOString(),
            blocked: false,
            username: 'rajesh_owner'
          },
          {
            id: 'mock_student_2',
            name: 'Nisha Kapoor',
            email: 'nisha.k@example.com',
            phone: '9845127896',
            role: 'student',
            verified: false,
            trust_score: 85,
            joined_date: new Date(Date.now() - 86400000 * 2).toISOString(),
            blocked: true,
            username: 'nisha_k'
          }
        ]);
      }
    }

    loadLiveUsers();

    // Subscribe to public.users table real-time changes
    const channel = supabase
      .channel('user-management-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new : u));
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleBlockToggle = async (userId, currentBlockedStatus) => {
    const nextStatus = !currentBlockedStatus;
    const actionLabel = nextStatus ? 'Blocked' : 'Unblocked';

    if (isOffline) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: nextStatus } : u));
      setNotification(`User ${userId} status updated to ${actionLabel} (Offline Mock mode)`);
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ blocked: nextStatus })
        .eq('id', userId);

      if (error) throw error;

      // Realtime subscription will handle updating local state,
      // but let's update it immediately for responsiveness
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: nextStatus } : u));
      setNotification(`User status updated to ${actionLabel} successfully.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      console.error("Failed to update user block status in Supabase:", err);
      alert(`Error toggling block state: ${err.message || err}`);
    }
  };

  // Filter & Search users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'all' || 
      user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

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
          <span>Operating in Offline Fallback Mode. Supabase connection timed out. Showing mock user data.</span>
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

      {/* Search and Filters */}
      <div className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
          <input 
            type="text" 
            placeholder="Search by name, email, or username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={roleFilter === 'all' ? '' : 'secondary'}
            onClick={() => setRoleFilter('all')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            All Roles
          </button>
          <button 
            className={roleFilter === 'student' ? '' : 'secondary'}
            onClick={() => setRoleFilter('student')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Students
          </button>
          <button 
            className={roleFilter === 'owner' ? '' : 'secondary'}
            onClick={() => setRoleFilter('owner')}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Owners
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>User Profile</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Role</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Contact Information</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Trust Score</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Joined Date</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Account Status</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  👥 No matching users found in the system.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} style={{
                  borderBottom: '1px solid var(--border-glass)',
                  transition: 'var(--transition-smooth)'
                }} className="glass-hover">
                  
                  <td style={{ padding: '18px 12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <img 
                      src={user.profile_pic || `https://api.dicebear.com/7.x/adventurer/png?seed=${user.id}`} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.1)' }} 
                      alt={user.name}
                    />
                    <div>
                      <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0 }}>{user.name}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{user.username || 'user'}</span>
                    </div>
                  </td>

                  <td style={{ padding: '18px 12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: user.role === 'student' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                      color: user.role === 'student' ? 'var(--primary)' : 'var(--secondary)'
                    }}>
                      {user.role}
                    </span>
                  </td>

                  <td style={{ padding: '18px 12px', fontSize: '13px' }}>
                    <p style={{ margin: 0, color: 'var(--text-primary)' }}>{user.email}</p>
                    <span style={{ color: 'var(--text-muted)' }}>{user.phone || 'No phone'}</span>
                  </td>

                  <td style={{ padding: '18px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        height: '8px',
                        width: '60px',
                        background: 'rgba(0,0,0,0.06)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'inline-block'
                      }}>
                        <span style={{
                          height: '100%',
                          width: `${user.trust_score || 85}%`,
                          background: (user.trust_score || 85) > 80 ? 'var(--accent)' : 'var(--warning)',
                          display: 'block'
                        }}></span>
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.trust_score || 85}</span>
                    </div>
                  </td>

                  <td style={{ padding: '18px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date(user.joined_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>

                  <td style={{ padding: '18px 12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '4px 10px',
                      borderRadius: '50px',
                      background: user.blocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: user.blocked ? 'var(--danger)' : 'var(--accent)',
                      border: `1px solid ${
                        user.blocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                      }`
                    }}>
                      {user.blocked ? '🚫 Suspended' : '✓ Active'}
                    </span>
                  </td>

                  <td style={{ padding: '18px 12px', textAlign: 'right' }}>
                    <button 
                      id={`verify-btn-${user.id}`}
                      onClick={async () => {
                        try {
                          const nextVerified = !user.verified;
                          await supabase.from('users').update({ verified: nextVerified, trust_score: nextVerified ? 98 : 85 }).eq('id', user.id);
                          if (user.role === 'owner') {
                            await supabase.from('rooms').update({ verified: nextVerified }).eq('owner_id', user.id);
                          }
                          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verified: nextVerified, trust_score: nextVerified ? 98 : 85 } : u));
                          setNotification(`User ${user.name} KYC Verification status set to ${nextVerified ? 'APPROVED (Verified Badges Issued)' : 'REVOKED'}`);
                        } catch (e) {
                          alert("Failed to update verification status: " + e.message);
                        }
                      }}
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: '12px',
                        marginRight: '8px',
                        backgroundColor: user.verified ? 'rgba(16, 185, 129, 0.15)' : 'var(--primary)',
                        borderColor: user.verified ? 'rgba(16, 185, 129, 0.3)' : 'var(--primary)',
                        color: user.verified ? 'var(--accent)' : 'white'
                      }}
                    >
                      {user.verified ? '✓ Verified Badge' : '🛡️ Approve KYC & Issue Badge'}
                    </button>
                    <button 
                      id={`block-btn-${user.id}`}
                      onClick={() => handleBlockToggle(user.id, user.blocked)}
                      className={user.blocked ? '' : 'secondary'}
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: '12px',
                        backgroundColor: user.blocked ? 'var(--accent)' : 'rgba(239, 68, 68, 0.1)',
                        borderColor: user.blocked ? 'var(--accent)' : 'var(--danger)',
                        color: user.blocked ? 'white' : 'var(--danger)'
                      }}
                    >
                      {user.blocked ? 'Reactivate User' : 'Suspend User'}
                    </button>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
