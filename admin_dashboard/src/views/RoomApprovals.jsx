import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function RoomApprovals() {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadLiveRooms() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('rooms')
        .select('*, owner:owner_id(name, trust_score)');
      
      if (error) throw error;
      
      if (data) {
        const formatted = data.map(r => ({
          id: r.id,
          title: r.title,
          owner: r.owner?.name || 'Landlord',
          owner_id: r.owner_id,
          city: r.city || 'Goa',
          address: r.detailed_address || 'Near Campus',
          rent: r.rent,
          image: (r.images && r.images[0]) || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80',
          trustScore: r.owner?.trust_score || 85,
          verified: r.verified === true,
          status: r.verified ? 'Approved' : 'Pending Verification'
        }));
        setRooms(formatted);
      }
    } catch (err) {
      console.warn("Falling back to demo room listings.", err);
      setRooms([
        {
          id: 'room_demo_1',
          title: 'Stanza Living Student PG A',
          owner: 'Rajesh PG Owner',
          owner_id: 'mock_owner_1',
          city: 'Panaji, Goa',
          address: 'Near BITS Campus, Sancoale',
          rent: 12000,
          image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400&q=80',
          trustScore: 92,
          verified: true,
          status: 'Approved'
        },
        {
          id: 'room_demo_2',
          title: 'Co-Living Flat B (Dual Sharing)',
          owner: 'Suresh Kumar',
          owner_id: 'mock_owner_2',
          city: 'Verna, Goa',
          address: 'Block C, Highway Residency',
          rent: 8500,
          image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80',
          trustScore: 78,
          verified: false,
          status: 'Pending Verification'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLiveRooms();

    // Subscribe to realtime rooms table changes
    const channel = supabase
      .channel('room-listings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        loadLiveRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleVerification = async (room, newVerifiedState) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ verified: newVerifiedState })
        .eq('id', room.id);

      if (error) throw error;

      // Send notification to landlord
      if (room.owner_id) {
        await supabase.from('notifications').insert({
          user_id: room.owner_id,
          type: 'room_verified',
          title: newVerifiedState ? '✅ Room Listing Verified!' : '⚠️ Listing Status Updated',
          message: newVerifiedState 
            ? `Your room listing "${room.title}" has been approved and verified by CampusStay Admin!`
            : `Your room listing "${room.title}" status was changed to pending review.`
        });
      }

      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, verified: newVerifiedState, status: newVerifiedState ? 'Approved' : 'Pending Verification' } : r));
      setNotification(`Room "${room.title}" status updated to ${newVerifiedState ? 'VERIFIED (Public Badge Active)' : 'PENDING'}`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(`Error updating room status: ${err.message || err}`);
    }
  };

  const handleDeleteRoom = async (id, title, ownerId) => {
    const reason = prompt(`Enter deletion reason for listing "${title}":`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert("A deletion reason is required.");
      return;
    }

    try {
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'room_deleted',
          title: '🏢 Room Listing Deleted by Admin',
          message: `Your room listing "${title}" was deleted by Admin. Reason: ${reason}`
        });
      }

      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;

      setRooms(prev => prev.filter(r => r.id !== id));
      setNotification(`Successfully deleted listing "${title}". Owner notified.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(`Failed to delete room: ${err.message || err}`);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'approved' && r.verified) || 
      (filter === 'pending' && !r.verified);

    const matchesSearch = 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const totalCount = rooms.length;
  const approvedCount = rooms.filter(r => r.verified).length;
  const pendingCount = rooms.filter(r => !r.verified).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Overview Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Flat Listings</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--text-primary)' }}>{totalCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(99, 102, 241, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🏠
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Verified Listings</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--accent)' }}>{approvedCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(16, 185, 129, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✓
          </div>
        </div>

        <div className="glass glass-hover" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Pending Approvals</span>
            <h2 style={{ fontSize: '32px', margin: '6px 0 0 0', color: 'var(--warning)' }}>{pendingCount}</h2>
          </div>
          <div style={{ fontSize: '36px', background: 'rgba(245, 158, 11, 0.1)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⏳
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
      <div className="glass" style={{ padding: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search flat listings by title, city, or landlord..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
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

        <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button 
            className={filter === 'all' ? '' : 'secondary'}
            onClick={() => setFilter('all')}
            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
          >
            All Listings ({totalCount})
          </button>
          <button 
            className={filter === 'approved' ? '' : 'secondary'}
            onClick={() => setFilter('approved')}
            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
          >
            Verified ({approvedCount})
          </button>
          <button 
            className={filter === 'pending' ? '' : 'secondary'}
            onClick={() => setFilter('pending')}
            style={{ padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-sm)' }}
          >
            Pending ({pendingCount})
          </button>
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div className="pulsing" style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <p>Fetching real-time property listings from Supabase...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="glass" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px' }}>🏠 No matching flat listings found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredRooms.map(room => (
            <div key={room.id} className="glass glass-hover" style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
              <div>
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <img 
                    src={room.image} 
                    alt={room.title} 
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} 
                  />
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: room.verified ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}>
                    {room.verified ? '✓ Verified Listing' : '⏳ Pending Approval'}
                  </span>
                </div>

                <h3 style={{ fontSize: '17px', margin: '0 0 6px 0', color: 'var(--text-primary)', fontWeight: '700' }}>{room.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>📍 {room.address}, {room.city}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Monthly Rent</span>
                    <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>₹{room.rent.toLocaleString('en-IN')}/mo</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Landlord</span>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{room.owner} (Trust: {room.trustScore}%)</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
                {!room.verified ? (
                  <button 
                    onClick={() => handleToggleVerification(room, true)}
                    style={{ flex: 1, padding: '10px', fontSize: '13px', background: 'var(--accent)', borderColor: 'var(--accent)', color: 'white', fontWeight: 'bold' }}
                  >
                    🛡️ Approve Listing
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleVerification(room, false)}
                    className="secondary"
                    style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                  >
                    ⏳ Unverify
                  </button>
                )}
                
                <button 
                  onClick={() => handleDeleteRoom(room.id, room.title, room.owner_id)}
                  style={{ padding: '10px 14px', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
