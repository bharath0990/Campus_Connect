import React, { useState, useEffect } from 'react';
import { supabase } from '../App';

export default function GoToMarketStrategy() {
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [citiesData, setCitiesData] = useState([]);
  const [summary, setSummary] = useState({ cities: 4, students: 0, listings: 0 });
  const [isOffline, setIsOffline] = useState(false);

  async function fetchLiveCityStats() {
    try {
      // Fetch rooms
      const { data: roomsData, error: rErr } = await supabase
        .from('rooms')
        .select('id, city');
      if (rErr) throw rErr;

      // Fetch bookings (Active)
      const { data: bookingsData, error: bErr } = await supabase
        .from('bookings')
        .select('id, room_id')
        .eq('status', 'Active');
      if (bErr) throw bErr;

      // Baseline targets
      const baseCities = [
        { name: 'Bangalore', colleges: 'IISc, RV College, Christ University, PES', status: 'Active', emoji: '🏙️', targetListings: 180, defaultStudents: 2400 },
        { name: 'Delhi NCR', colleges: 'IIT Delhi, DU, JNU, Amity', status: 'Active', emoji: '🏛️', targetListings: 140, defaultStudents: 1800 },
        { name: 'Mumbai', colleges: 'IIT Bombay, NMIMS, Xavier\'s, TISS', status: 'Launching', emoji: '🌊', targetListings: 60, defaultStudents: 800 },
        { name: 'Hyderabad', colleges: 'IIIT-H, Osmania, ISB, BITS Pilani', status: 'Planned', emoji: '🕌', targetListings: 20, defaultStudents: 200 }
      ];

      // Process actual counts from database
      const cityRoomsMap = {};
      const cityBookingsMap = {};

      roomsData?.forEach(r => {
        if (!r.city) return;
        const cName = r.city.toLowerCase().trim();
        cityRoomsMap[cName] = (cityRoomsMap[cName] || 0) + 1;
      });

      bookingsData?.forEach(b => {
        const room = roomsData?.find(r => r.id === b.room_id);
        if (room && room.city) {
          const cName = room.city.toLowerCase().trim();
          cityBookingsMap[cName] = (cityBookingsMap[cName] || 0) + 1;
        }
      });

      // Merge baseline cities with actual data, and add new cities from DB if any
      const processedCities = [];
      const seenProcessed = new Set();

      // 1. Process base list
      baseCities.forEach(base => {
        const key = base.name.toLowerCase();
        seenProcessed.add(key);

        const dbListings = cityRoomsMap[key] || 0;
        const dbStudents = cityBookingsMap[key] || 0;

        processedCities.push({
          name: base.name,
          colleges: base.colleges,
          status: dbListings > 0 ? 'Active' : base.status,
          students: `${dbStudents} active`,
          listings: `${dbListings} listed`,
          emoji: base.emoji,
          progress: Math.min(100, Math.round((dbListings / base.targetListings) * 100)) || 0,
          rawListings: dbListings,
          rawStudents: dbStudents
        });
      });

      // 2. Add any other cities from DB not in baseline
      Object.keys(cityRoomsMap).forEach(key => {
        if (!seenProcessed.has(key)) {
          const originalCityName = roomsData.find(r => r.city && r.city.toLowerCase().trim() === key)?.city || key;
          const dbListings = cityRoomsMap[key];
          const dbStudents = cityBookingsMap[key] || 0;
          const target = 50; 
          const progressVal = Math.min(100, Math.round((dbListings / target) * 100));

          processedCities.push({
            name: originalCityName,
            colleges: 'Local Student PGs & Hostels',
            status: 'Active',
            students: `${dbStudents} active`,
            listings: `${dbListings} listed`,
            emoji: '📍',
            progress: progressVal,
            rawListings: dbListings,
            rawStudents: dbStudents
          });
        }
      });

      const totalRooms = roomsData?.length || 0;
      const totalActiveStudents = bookingsData?.length || 0;
      const activeCitiesCount = processedCities.filter(c => c.rawListings > 0).length;

      setCitiesData(processedCities);
      setSummary({
        cities: activeCitiesCount || baseCities.length,
        students: totalActiveStudents,
        listings: totalRooms
      });
      setIsOffline(false);
    } catch (err) {
      console.warn("Using offline GTM fallback city stats.", err);
      setIsOffline(true);
      // Mock fallback
      setCitiesData([
        { name: 'Bangalore', colleges: 'IISc, RV College, Christ University, PES', status: 'Active', students: '2,400+', listings: '180+', emoji: '🏙️', progress: 78, rawListings: 180 },
        { name: 'Delhi NCR', colleges: 'IIT Delhi, DU, JNU, Amity', status: 'Active', students: '1,800+', listings: '140+', emoji: '🏛️', progress: 65, rawListings: 140 },
        { name: 'Mumbai', colleges: 'IIT Bombay, NMIMS, Xavier\'s, TISS', status: 'Launching', students: '800+', listings: '60+', emoji: '🌊', progress: 35, rawListings: 60 },
        { name: 'Hyderabad', colleges: 'IIIT-H, Osmania, ISB, BITS Pilani', status: 'Planned', students: '200+', listings: '20+', emoji: '🕌', progress: 15, rawListings: 20 },
      ]);
      setSummary({ cities: 4, students: 5200, listings: 400 });
    }
  }

  useEffect(() => {
    fetchLiveCityStats();

    // Subscribe to rooms and bookings to update in real-time
    const roomsChannel = supabase
      .channel('gtm-strategy-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchLiveCityStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchLiveCityStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  const phases = [
    {
      title: 'Phase 1: Manual Onboarding',
      timeline: 'Month 1-3',
      status: 'Complete',
      color: 'var(--accent)',
      icon: '🤝',
      description: 'Build trust by personally onboarding property owners. Visit PGs, verify listings, and take professional photos.',
      tactics: [
        'Door-to-door outreach to PG owners within 2km of top colleges',
        'Personal property verification with photo documentation',
        'Owner testimonials and case studies for marketing material',
        'Build a curated catalog of 50+ verified listings per city',
        'Offer free 3-month listing to early adopters',
      ],
      kpis: [
        { label: 'Properties Onboarded', target: '200', achieved: '234', status: 'exceeded' },
        { label: 'Owner Satisfaction', target: '90%', achieved: '94%', status: 'exceeded' },
        { label: 'Avg. Listing Quality Score', target: '8.0', achieved: '8.6', status: 'exceeded' },
      ],
    },
    {
      title: 'Phase 2: Student Ambassadors',
      timeline: 'Month 3-6',
      status: 'In Progress',
      color: 'var(--primary)',
      icon: '📢',
      description: 'Recruit campus ambassadors at each target college. Offer premium features in exchange for referrals and community building.',
      tactics: [
        'Recruit 5-10 ambassadors per college with free premium account',
        'WhatsApp/Telegram group per college for housing discussions',
        'Referral bonus: ₹500 credit per verified sign-up',
        'Campus events: "Housing Fair" at semester start',
        'Social media content: room tours, move-in vlogs, tips',
      ],
      kpis: [
        { label: 'Active Ambassadors', target: '100', achieved: '72', status: 'progress' },
        { label: 'Student Sign-ups via Referral', target: '2,000', achieved: '1,450', status: 'progress' },
        { label: 'Campus Events Conducted', target: '20', achieved: '14', status: 'progress' },
      ],
    },
    {
      title: 'Phase 3: College Partnerships',
      timeline: 'Month 6-9',
      status: 'Planned',
      color: 'var(--warning)',
      icon: '🎓',
      description: 'Partner with college administrations to get listed on official housing boards and orientation programs.',
      tactics: [
        'Official MOU with college housing/hostel departments',
        'Integration into freshers\' orientation kits',
        'Verified "College Recommended" badge for approved listings',
        'Dedicated college microsites with filtered listings',
        'Placement in college newsletters and notice boards',
      ],
      kpis: [
        { label: 'College MOUs Signed', target: '30', achieved: '—', status: 'pending' },
        { label: 'Official Housing Board Listings', target: '15', achieved: '—', status: 'pending' },
        { label: 'Freshers Kit Integrations', target: '10', achieved: '—', status: 'pending' },
      ],
    },
    {
      title: 'Phase 4: Community & Retention',
      timeline: 'Month 9-12',
      status: 'Planned',
      color: 'var(--secondary)',
      icon: '🏘️',
      description: 'Build sticky community features — semester-based booking, move-in guides, and social matching.',
      tactics: [
        'Semester-based booking: align leases with academic calendar',
        'City-specific move-in guides (transport, grocery, utilities)',
        'Roommate matching events and social mixers',
        'Loyalty program: rent payment streaks → rewards',
        'In-app community forum per college/city',
      ],
      kpis: [
        { label: 'Semester Booking Adoption', target: '40%', achieved: '—', status: 'pending' },
        { label: 'Move-in Guide Views', target: '10,000', achieved: '—', status: 'pending' },
        { label: 'Monthly Retention Rate', target: '85%', achieved: '—', status: 'pending' },
      ],
    },
  ];

  const ambassadorPerks = [
    { icon: '👑', title: 'Free Premium Account', desc: '12-month premium with all features unlocked' },
    { icon: '💰', title: 'Referral Bonuses', desc: '₹500 credit for every verified sign-up' },
    { icon: '📱', title: 'Early Access', desc: 'Beta features and new integrations first' },
    { icon: '🎪', title: 'Event Hosting', desc: 'Budget for campus housing fairs and meetups' },
    { icon: '📜', title: 'Experience Certificate', desc: 'Official CampusStay ambassador certificate' },
    { icon: '🏅', title: 'Leaderboard Rewards', desc: 'Top ambassadors get MacBooks, iPads, and more' },
  ];

  const currentPhase = phases[selectedPhase];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
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
          <span>Operating in Offline Fallback Mode. Supabase connection timed out. Showing mock city data.</span>
        </div>
      )}

      {/* Header */}
      <div className="glass" style={{ padding: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', marginBottom: '6px', color: 'var(--text-primary)' }}>
            🚀 Go-To-Market Strategy
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Hyperlocal college-town expansion — targeting India's top student cities
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="glass" style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Active Cities</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>{summary.cities}</span>
          </div>
          <div className="glass" style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Active Tenants</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent)' }}>{summary.students}</span>
          </div>
          <div className="glass" style={{ padding: '12px 20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Listings</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--secondary)' }}>{summary.listings}</span>
          </div>
        </div>
      </div>

      {/* Target Cities Grid */}
      <div>
        <h3 style={{ fontSize: '17px', marginBottom: '16px', color: 'var(--text-primary)' }}>🎯 Live City Statistics — Market Penetration</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {citiesData.map((city, idx) => (
            <div key={idx} className="glass glass-hover" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '60px', opacity: '0.06', pointerEvents: 'none' }}>
                {city.emoji}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{city.emoji} {city.name}</h4>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: city.rawListings > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: city.rawListings > 0 ? 'var(--accent)' : 'var(--warning)',
                  border: `1px solid ${
                    city.rawListings > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
                  }`
                }}>
                  {city.rawListings > 0 ? 'Active' : 'Planned'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>{city.colleges}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>👨‍🎓 {city.students}</span>
                <span style={{ color: 'var(--text-muted)' }}>🏠 {city.listings}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${city.progress}%`,
                  height: '100%',
                  background: city.rawListings > 0 ? 'var(--accent)' : 'var(--warning)',
                  borderRadius: '3px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                {city.progress}% target achieved
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Launch Phases */}
      <div>
        <h3 style={{ fontSize: '17px', marginBottom: '16px', color: 'var(--text-primary)' }}>📋 Launch Phases</h3>
        
        {/* Phase Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {phases.map((phase, idx) => (
            <button
              key={idx}
              className={selectedPhase === idx ? '' : 'secondary'}
              onClick={() => setSelectedPhase(idx)}
              style={{
                padding: '10px 20px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <span>{phase.icon}</span>
              <span>Phase {idx + 1}</span>
              <span style={{
                fontSize: '9px',
                padding: '2px 8px',
                borderRadius: '10px',
                background: phase.status === 'Complete' ? 'rgba(16, 185, 129, 0.2)' :
                            phase.status === 'In Progress' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: phase.status === 'Complete' ? 'var(--accent)' :
                       phase.status === 'In Progress' ? 'var(--primary)' : 'var(--warning)',
              }}>
                {phase.status}
              </span>
            </button>
          ))}
        </div>

        {/* Phase Detail Card */}
        <div className="glass fade-in" key={selectedPhase} style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {currentPhase.icon} {currentPhase.title}
              </h3>
              <span style={{ fontSize: '13px', color: currentPhase.color, fontWeight: 'bold' }}>
                {currentPhase.timeline}
              </span>
            </div>
            <span style={{
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '6px 16px',
              borderRadius: '20px',
              background: currentPhase.status === 'Complete' ? 'rgba(16, 185, 129, 0.15)' :
                          currentPhase.status === 'In Progress' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: currentPhase.status === 'Complete' ? 'var(--accent)' :
                     currentPhase.status === 'In Progress' ? 'var(--primary)' : 'var(--warning)',
            }}>
              {currentPhase.status}
            </span>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            {currentPhase.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Tactics */}
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>📌 Key Tactics</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentPhase.tactics.map((tactic, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    padding: '10px 14px',
                    background: 'rgba(0,0,0,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4'
                  }}>
                    <span style={{ color: currentPhase.color, fontWeight: 'bold', flexShrink: 0 }}>→</span>
                    {tactic}
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '12px' }}>📊 KPI Targets</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentPhase.kpis.map((kpi, idx) => (
                  <div key={idx} className="glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{kpi.label}</span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: kpi.status === 'exceeded' ? 'rgba(16, 185, 129, 0.15)' :
                                    kpi.status === 'progress' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: kpi.status === 'exceeded' ? 'var(--accent)' :
                               kpi.status === 'progress' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: 'bold',
                      }}>
                        {kpi.status === 'exceeded' ? '✓ Exceeded' : kpi.status === 'progress' ? '◎ In Progress' : '○ Pending'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Target: <strong>{kpi.target}</strong></span>
                      <span style={{ color: kpi.status === 'exceeded' ? 'var(--accent)' : 'var(--primary)', fontWeight: 'bold' }}>
                        Achieved: {kpi.achieved}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* College Ambassador Program */}
      <div>
        <h3 style={{ fontSize: '17px', marginBottom: '16px', color: 'var(--text-primary)' }}>📢 College Ambassador Program</h3>
        <div className="glass" style={{ padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
            Student representatives earn premium features, referral bonuses, and exclusive rewards for building the RoomMate community on their campus.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {ambassadorPerks.map((perk, idx) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'rgba(0,0,0,0.02)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <span style={{ fontSize: '28px' }}>{perk.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{perk.title}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{perk.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Community Features */}
      <div className="glass" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '17px', marginBottom: '16px', color: 'var(--text-primary)' }}>🏘️ Community & Retention Features</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>📅 Semester-Based Booking</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Align lease periods with academic semesters (Aug–Dec, Jan–May). Auto-renewal options and flexible checkout during exam periods.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>🗺️ City Move-in Guides</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Comprehensive guides per city — best transport routes, nearby grocery stores, WiFi providers, laundry services, and local tips from seniors.
            </p>
          </div>
          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '8px' }}>🏆 Rent Streak Rewards</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Consecutive on-time rent payments earn reward points redeemable for Amazon vouchers, food delivery credits, and trust score boosts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
