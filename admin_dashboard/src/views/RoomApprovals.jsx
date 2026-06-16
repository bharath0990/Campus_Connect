import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function RoomApprovals() {
  const [rooms, setRooms] = useState([]);

  const [notification, setNotification] = useState('');
  const [isOffline, setIsOffline] = useState(false);

  async function loadLiveRooms() {
    try {
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
          city: r.city,
          rent: `₹${r.rent}/mo`,
          docType: 'Aadhaar Card File',
          image: r.images[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=300&q=80',
          trustScore: r.owner?.trust_score || 80,
          status: r.verified ? 'Approved' : 'Pending Verification'
        }));
        setRooms(formatted);
      }
      setIsOffline(false);
    } catch (err) {
      console.warn("Using offline rooms fallback profiles.", err);
      setIsOffline(true);
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

  const handleAction = async (id, newStatus, message) => {
    if (isOffline) {
      setRooms(prev => prev.map(room => room.id === id ? { ...room, status: newStatus } : room));
      setNotification(message);
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    try {
      // If live, update status in Supabase table
      const { error } = await supabase
        .from('rooms')
        .update({ verified: (newStatus === 'Approved') })
        .eq('id', id);

      if (error) throw error;

      setRooms(prev => prev.map(room => room.id === id ? { ...room, status: newStatus } : room));
      setNotification(message);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      console.error("Supabase update failed:", err);
      alert(`Error: Failed to save changes to database. ${err.message || err}`);
    }
  };

  const handleDeleteRoom = async (id, title, ownerId) => {
    const reason = prompt(`Enter the reason for deleting the listing "${title}":`);
    if (reason === null) return; // Cancelled
    if (!reason.trim()) {
      alert("A deletion reason is required.");
      return;
    }

    if (isOffline) {
      setRooms(prev => prev.filter(room => room.id !== id));
      setNotification(`Mock Deleted room: "${title}"`);
      setTimeout(() => setNotification(''), 4000);
      return;
    }

    try {
      // 1. Send notification to owner first
      if (ownerId) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: ownerId,
            type: 'room_deleted',
            title: '🏢 Room Listing Deleted by Admin',
            message: `Your room listing "${title}" was deleted by CampusStay Admin. Reason: ${reason}`
          });
        if (notifError) console.warn("Failed to notify owner:", notifError);
      }

      // 2. Perform room deletion
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotification(`Successfully deleted listing "${title}" and notified the owner.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      console.error("Supabase delete failed:", err);
      alert(`Failed to delete room listing: ${err.message || err}`);
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
          <span>Operating in Offline Fallback Mode. Supabase connection timed out or tables are not initialized. Mock rooms are shown.</span>
        </div>
      )}
      
      {notification && (
        <div className="fade-in" style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid var(--accent)',
          color: 'var(--text-primary)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          ✅ SUCCESS: {notification}
        </div>
      )}

      <div className="glass" style={{ padding: '24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Property Details</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Owner & Trust Index</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Verification Documents</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Rent & Area</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>Review Status</th>
              <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  📭 No property listings found in the database.
                </td>
              </tr>
            ) : (
              rooms.map(room => (
              <tr key={room.id} style={{
                borderBottom: '1px solid var(--border-glass)',
                transition: 'var(--transition-smooth)'
              }} className="glass-hover">
                
                <td style={{ padding: '18px 12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img 
                    src={room.image} 
                    style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} 
                    alt={room.title}
                  />
                  <div>
                    <h4 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{room.title}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{room.id}</span>
                  </div>
                </td>

                <td style={{ padding: '18px 12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{room.owner}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      height: '8px',
                      width: '80px',
                      background: 'rgba(0,0,0,0.06)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      display: 'inline-block'
                    }}>
                      <span style={{
                        height: '100%',
                        width: `${room.trustScore}%`,
                        background: room.trustScore > 80 ? 'var(--accent)' : 'var(--warning)',
                        display: 'block'
                      }}></span>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{room.trustScore}</span>
                  </div>
                </td>

                <td style={{ padding: '18px 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  📄 {room.docType}
                  <span style={{ display: 'block', color: 'var(--primary)', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }}>
                    🔗 Download Attachments (PDF)
                  </span>
                </td>

                <td style={{ padding: '18px 12px' }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{room.rent}</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>{room.city}</span>
                </td>

                <td style={{ padding: '18px 12px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    borderRadius: '50px',
                    background: room.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' :
                                room.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: room.status === 'Approved' ? 'var(--accent)' :
                           room.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)',
                    border: `1px solid ${
                      room.status === 'Approved' ? 'rgba(16, 185, 129, 0.3)' :
                      room.status === 'Rejected' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                    }`
                  }}>
                    {room.status}
                  </span>
                </td>

                <td style={{ padding: '18px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                    {room.status === 'Pending Verification' ? (
                      <>
                        <button 
                          id={`reject-${room.id}`}
                          className="secondary" 
                          onClick={() => handleAction(room.id, 'Rejected', `Rejected property listing ${room.id}. Owner notified.`)}
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          Reject
                        </button>
                        <button 
                          id={`approve-${room.id}`}
                          onClick={() => handleAction(room.id, 'Approved', `Approved property listing ${room.id}. Now visible on Student feeds.`)}
                          style={{ padding: '8px 14px', fontSize: '12px' }}
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '8px' }}>Reviewed</span>
                    )}
                    <button 
                      id={`delete-${room.id}`}
                      className="secondary" 
                      onClick={() => handleDeleteRoom(room.id, room.title, room.owner_id)}
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: '12px', 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        borderColor: 'var(--danger)', 
                        color: 'var(--danger)' 
                      }}
                    >
                      Delete Listing
                    </button>
                  </div>
                </td>

              </tr>
            )))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
