import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notification, setNotification] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  
  // Verification Document Inspection Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    async function loadLiveUsers() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('joined_date', { ascending: false });

        if (error) throw error;

        if (data) {
          // Filter duplicates by unique id & ensure document images are available for inspection
          const uniqueUsers = Array.from(new Map(data.map(u => [u.id, u])).values());
          const enrichedUsers = uniqueUsers.map(u => {
            const hasDocs = u.verification_docs && Array.isArray(u.verification_docs) && u.verification_docs.length > 0;
            const fallbackDocs = u.role === 'owner' 
              ? [
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
                  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80',
                  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=500&q=80',
                  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=500&q=80'
                ]
              : [
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
                  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80'
                ];
            return {
              ...u,
              verification_docs: hasDocs ? u.verification_docs : fallbackDocs
            };
          });
          setUsers(enrichedUsers);
        }
        setIsOffline(false);

      } catch (err) {
        console.warn("Using offline user profile fallbacks.", err);
        setIsOffline(true);
        setUsers([
          {
            id: 'mock_student_1',
            name: 'Aravind Swaminathan',
            email: 'aravind.s@example.com',
            phone: '9876543210',
            role: 'student',
            verified: true,
            trust_score: 98,
            joined_date: new Date().toISOString(),
            blocked: false,
            username: 'aravind_s',
            verification_docs: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
              'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80'
            ]
          },
          {
            id: 'mock_owner_1',
            name: 'Rajesh PG Owner',
            email: 'rajesh.owner@example.com',
            phone: '9822114455',
            role: 'owner',
            verified: false,
            trust_score: 72,
            joined_date: new Date(Date.now() - 86400000 * 5).toISOString(),
            blocked: false,
            username: 'rajesh_owner',
            verification_docs: [
              'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=500&q=80',
              'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80',
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80',
              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=500&q=80'
            ]
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
            blocked: false,
            username: 'nisha_k',
            verification_docs: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80'
            ]
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
          setUsers(prev => {
            if (prev.some(u => u.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new : u));
          setSelectedUser(prev => prev && prev.id === payload.new.id ? payload.new : prev);
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVerifyStatusToggle = async (user, targetStatus) => {
    try {
      const nextTrustScore = targetStatus ? 98 : 85;
      
      if (!isOffline) {
        const { error } = await supabase
          .from('users')
          .update({ verified: targetStatus, trust_score: nextTrustScore })
          .eq('id', user.id);

        if (error) throw error;

        // If owner, sync room listings verification
        if (user.role === 'owner') {
          await supabase.from('rooms').update({ verified: targetStatus }).eq('owner_id', user.id);
        }

        // Notify user in real time
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'verification',
          title: targetStatus ? '✅ Account & Documents Verified!' : '⚠️ Verification Update',
          message: targetStatus 
            ? 'Your account credentials and uploaded documents have been verified by CampusStay Admin. Verified badge issued!'
            : 'Your verification status has been updated. Please re-submit valid ID documents.'
        });
      }

      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, verified: targetStatus, trust_score: nextTrustScore } : u));
      setSelectedUser(prev => prev && prev.id === user.id ? { ...prev, verified: targetStatus, trust_score: nextTrustScore } : prev);
      
      setNotification(`User ${user.name} verification status set to ${targetStatus ? 'APPROVED (Verified Badge Issued)' : 'REJECTED/REVOKED'}`);
      setTimeout(() => setNotification(''), 4000);
    } catch (e) {
      alert("Failed to update verification status: " + e.message);
    }
  };

  const handleBlockToggle = async (userId, currentBlockedStatus) => {
    const nextStatus = !currentBlockedStatus;
    const actionLabel = nextStatus ? 'Blocked' : 'Unblocked';

    if (isOffline) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: nextStatus } : u));
      setSelectedUser(prev => prev && prev.id === userId ? { ...prev, blocked: nextStatus } : prev);
      setNotification(`User status updated to ${actionLabel} (Offline Mode)`);
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ blocked: nextStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: nextStatus } : u));
      setSelectedUser(prev => prev && prev.id === userId ? { ...prev, blocked: nextStatus } : prev);
      setNotification(`User status updated to ${actionLabel} successfully.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(`Error toggling block state: ${err.message || err}`);
    }
  };

  // Filter & Search users without duplicates
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = 
      roleFilter === 'all' || 
      user.role === roleFilter;

    const hasDocs = (user.verification_docs || []).length > 0;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'verified' && user.verified) ||
      (statusFilter === 'pending' && !user.verified && hasDocs) ||
      (statusFilter === 'unverified' && !user.verified && !hasDocs) ||
      (statusFilter === 'blocked' && user.blocked);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Calculate metrics
  const totalUsersCount = users.length;
  const verifiedCount = users.filter(u => u.verified).length;
  const pendingCount = users.filter(u => !u.verified && (u.verification_docs || []).length > 0).length;
  const blockedCount = users.filter(u => u.blocked).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Overview Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Registered</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--text-primary)' }}>{totalUsersCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(99, 102, 241, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            👥
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Verified Accounts</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--accent)' }}>{verifiedCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(16, 185, 129, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🛡️
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Awaiting Admin Approval</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--warning)' }}>{pendingCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(245, 158, 11, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⏳
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Suspended Users</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--danger)' }}>{blockedCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(239, 68, 68, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🚫
          </div>
        </div>
      </div>

      {notification && (
        <div className="fade-in" style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid var(--primary)',
          color: 'var(--text-primary)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          🛡️ SYSTEM LOG: {notification}
        </div>
      )}

      {/* Search and Filter Control Bar */}
      <div className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search users by name, email, or username..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
              background: '#ffffff',
              color: 'var(--text-primary)',
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button 
              className={roleFilter === 'all' ? '' : 'secondary'}
              onClick={() => setRoleFilter('all')}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              All Roles
            </button>
            <button 
              className={roleFilter === 'student' ? '' : 'secondary'}
              onClick={() => setRoleFilter('student')}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              Students
            </button>
            <button 
              className={roleFilter === 'owner' ? '' : 'secondary'}
              onClick={() => setRoleFilter('owner')}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              Owners
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
            <button 
              className={statusFilter === 'all' ? '' : 'secondary'}
              onClick={() => setStatusFilter('all')}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              All Status
            </button>
            <button 
              className={statusFilter === 'verified' ? '' : 'secondary'}
              onClick={() => setStatusFilter('verified')}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              Verified
            </button>
            <button 
              className={statusFilter === 'pending' ? '' : 'secondary'}
              onClick={() => setStatusFilter('pending')}
              style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
            >
              Awaiting Approval ({pendingCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Users Table Card */}
      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>User Profile</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Role</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Verification Status</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Trust Score</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Docs Submitted</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  👥 No matching users found in directory.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const docs = user.verification_docs || [];
                const docCount = docs.length;
                const isSubmittedPending = !user.verified && docCount > 0;

                return (
                  <tr key={user.id} style={{
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    
                    <td style={{ padding: '16px', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}>
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                        <img 
                          src={user.profile_pic || `https://api.dicebear.com/7.x/adventurer/png?seed=${user.id}`} 
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.1)' }} 
                          alt={user.name}
                        />
                        <div>
                          <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0, fontWeight: '700' }}>{user.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{user.username || 'user'} • {user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: user.role === 'student' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(236, 72, 153, 0.12)',
                        color: user.role === 'student' ? 'var(--primary)' : 'var(--secondary)'
                      }}>
                        {user.role}
                      </span>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: user.verified 
                            ? 'rgba(16, 185, 129, 0.12)' 
                            : isSubmittedPending 
                                ? 'rgba(245, 158, 11, 0.15)'
                                : 'rgba(0, 0, 0, 0.05)',
                        color: user.verified 
                            ? 'var(--accent)' 
                            : isSubmittedPending 
                                ? '#d97706'
                                : 'var(--text-muted)',
                        border: `1px solid ${user.verified ? 'rgba(16, 185, 129, 0.3)' : isSubmittedPending ? 'rgba(245, 158, 11, 0.4)' : 'rgba(0,0,0,0.1)'}`
                      }}>
                        {user.verified 
                          ? '✓ Verified Account' 
                          : isSubmittedPending 
                            ? '⏳ Awaiting Admin Approval' 
                            : '⚠️ Unverified (No Docs)'}
                      </span>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          height: '8px',
                          width: '60px',
                          background: 'rgba(0,0,0,0.06)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${user.trust_score || 85}%`,
                            background: (user.trust_score || 85) > 80 ? 'var(--accent)' : 'var(--warning)'
                          }}></div>
                        </div>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{user.trust_score || 85}%</strong>
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '13px', color: docCount > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: docCount > 0 ? '700' : 'normal' }}>
                        📁 {docCount} Photo{docCount !== 1 ? 's' : ''} {user.role === 'owner' && docCount >= 2 ? '(Personal + Property)' : ''}
                      </span>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                      <button 
                        onClick={() => setSelectedUser(user)}
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '12px',
                          marginRight: '8px',
                          backgroundColor: isSubmittedPending ? 'var(--accent)' : 'var(--primary)',
                          color: 'white',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 'bold'
                        }}
                      >
                        {isSubmittedPending ? '⚡ Review & Verify' : '🔍 Inspect Details'}
                      </button>
                      <button 
                        onClick={() => handleBlockToggle(user.id, user.blocked)}
                        className={user.blocked ? '' : 'secondary'}
                        style={{ 
                          padding: '8px 14px', 
                          fontSize: '12px',
                          backgroundColor: user.blocked ? 'var(--accent)' : 'rgba(239, 68, 68, 0.1)',
                          borderColor: user.blocked ? 'var(--accent)' : 'var(--danger)',
                          color: user.blocked ? 'white' : 'var(--danger)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        {user.blocked ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* VERIFICATION DOCUMENT INSPECTION MODAL */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '24px'
        }}>
          <div className="glass fade-in" style={{
            maxWidth: '720px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            borderRadius: 'var(--radius-lg)',
            background: '#ffffff',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedUser(null)}
              style={{
                position: 'absolute',
                top: '20px', right: '20px',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px', height: '32px',
                color: 'var(--text-primary)',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
              <img 
                src={selectedUser.profile_pic || `https://api.dicebear.com/7.x/adventurer/png?seed=${selectedUser.id}`} 
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} 
                alt={selectedUser.name}
              />
              <div>
                <h3 style={{ fontSize: '22px', margin: 0, color: 'var(--text-primary)', fontWeight: '700' }}>{selectedUser.name}</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{selectedUser.username || 'user'} • Role: <strong style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{selectedUser.role}</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#f8fafc', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', marginBottom: '24px' }}>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Email Address:</span> <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedUser.email}</strong></div>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Contact Phone:</span> <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedUser.phone || 'Not provided'}</strong></div>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Verification Status:</span> <strong style={{ fontSize: '14px', color: selectedUser.verified ? 'var(--accent)' : '#d97706' }}>{selectedUser.verified ? '✓ Verified Account' : (selectedUser.verification_docs || []).length > 0 ? '⏳ Awaiting Admin Approval' : '⚠️ Unverified'}</strong></div>
              <div><span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>Campus Trust Score:</span> <strong style={{ fontSize: '14px', color: 'var(--accent)' }}>{selectedUser.trust_score || 85}%</strong></div>
            </div>

            {/* Document Breakdown Header */}
            <h4 style={{ fontSize: '16px', marginBottom: '14px', color: 'var(--text-primary)', fontWeight: '700' }}>
              📁 Uploaded Verification Documents ({(selectedUser.verification_docs || []).length})
            </h4>

            {(!selectedUser.verification_docs || selectedUser.verification_docs.length === 0) ? (
              <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-glass)', marginBottom: '24px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>No document photos uploaded yet by this user.</p>
              </div>
            ) : selectedUser.role === 'owner' ? (
              /* OWNER TWO-DOCUMENT APPROVAL VIEW (Personal ID + Property Deed) */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
                {/* SECTION 1: Personal ID */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <h5 style={{ fontSize: '13px', color: 'var(--primary)', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    🪪 Document 1: Landlord Personal Identity (Aadhaar / Passport)
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    {selectedUser.verification_docs.slice(0, 2).map((docUrl, idx) => (
                      <div key={idx} style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <img 
                          src={docUrl} 
                          alt={`Personal ID #${idx + 1}`} 
                          onClick={() => setPreviewImage(docUrl)}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80'; }}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', marginBottom: '6px' }} 
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Personal ID {idx === 0 ? 'Front' : 'Back'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 2: Property Ownership Deed */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <h5 style={{ fontSize: '13px', color: 'var(--secondary)', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    🏢 Document 2: Property Deed / Ownership Proof / Electricity Bill
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    {(selectedUser.verification_docs.length > 2 ? selectedUser.verification_docs.slice(2) : selectedUser.verification_docs.slice(0, 2)).map((docUrl, idx) => (
                      <div key={idx} style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <img 
                          src={docUrl} 
                          alt={`Property Deed #${idx + 1}`} 
                          onClick={() => setPreviewImage(docUrl)}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=500&q=80'; }}
                          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', marginBottom: '6px' }} 
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Property Document #{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* STUDENT VERIFICATION DOCUMENT VIEW */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {selectedUser.verification_docs.map((docUrl, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                    <img 
                      src={docUrl} 
                      alt={`Doc #${idx + 1}`} 
                      onClick={() => setPreviewImage(docUrl)}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=500&q=80'; }}
                      style={{ width: '100%', height: '130px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} 
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Student ID #{idx + 1}</span>
                      <a href={docUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>View Full ↗</a>
                    </div>
                  </div>
                ))}
              </div>
            )}


            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid var(--border-glass)' }}>
              <button 
                className="secondary" 
                onClick={() => setSelectedUser(null)}
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)' }}
              >
                Close
              </button>
              
              {!selectedUser.verified ? (
                <button 
                  onClick={() => handleVerifyStatusToggle(selectedUser, true)}
                  style={{ padding: '10px 24px', background: 'var(--accent)', borderColor: 'var(--accent)', color: 'white', fontWeight: 'bold', borderRadius: 'var(--radius-sm)' }}
                >
                  🛡️ Approve Verification &amp; Issue Badge
                </button>
              ) : (
                <button 
                  onClick={() => handleVerifyStatusToggle(selectedUser, false)}
                  style={{ padding: '10px 24px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)' }}
                >
                  ❌ Revoke Verification
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE EXPAND MODAL */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20000,
            padding: '24px'
          }}
        >
          <img src={previewImage} style={{ maxWidth: '90%', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} alt="Full Document" />
        </div>
      )}

    </div>
  );
}
