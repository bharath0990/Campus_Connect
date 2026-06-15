import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import LoginView from './views/LoginView';
import DashboardOverview from './views/DashboardOverview';
import RoomApprovals from './views/RoomApprovals';
import ComplaintsList from './views/ComplaintsList';
import GoToMarketStrategy from './views/GoToMarketStrategy';

// Supabase Connection initialization
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://qynghqgbitcbczvfervg.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_u63gxFokU3EOzGIPFIIXCg_R0TTYaxt';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [connectionMode, setConnectionMode] = useState('Mock Session');
  const [isVerificationFlow, setIsVerificationFlow] = useState(false);

  useEffect(() => {
    // Check if the URL hash contains access token (redirect from Supabase Verify Link)
    if (window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery') || window.location.hash.includes('type=signup')) {
      setIsVerificationFlow(true);
    }
    
    // Evaluate if credentials are actual or dummy
    if (!SUPABASE_URL.includes('mock-stay') && !SUPABASE_ANON_KEY.includes('mock')) {
      setConnectionMode('Live Supabase');
    }
  }, []);

  if (isVerificationFlow) {
    return <EmailVerificationCallback />;
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Sidebar Navigation */}
      <aside className="glass" style={{
        width: '280px',
        padding: '24px',
        margin: '16px',
        marginRight: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        <div>
          <h2 style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '26px',
            fontWeight: '700',
            marginBottom: '4px'
          }}>CampusStay</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px', fontWeight: 'bold' }}>SUPABASE HUB</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <button 
            id="tab-overview"
            className={activeTab === 'overview' ? '' : 'secondary'}
            onClick={() => setActiveTab('overview')}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}
          >
            📊 System Analytics
          </button>
          <button 
            id="tab-approvals"
            className={activeTab === 'approvals' ? '' : 'secondary'}
            onClick={() => setActiveTab('approvals')}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}
          >
            🏠 Listings Approval
          </button>
          <button 
            id="tab-complaints"
            className={activeTab === 'complaints' ? '' : 'secondary'}
            onClick={() => setActiveTab('complaints')}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}
          >
            ⚠️ Disputes & SLA
          </button>
          <button 
            id="tab-gtm"
            className={activeTab === 'gtm' ? '' : 'secondary'}
            onClick={() => setActiveTab('gtm')}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px' }}
          >
            🚀 GTM Strategy
          </button>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <img 
              src="https://api.dicebear.com/7.x/bottts/svg?seed=supabase" 
              style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} 
              alt="Admin Avatar"
            />
            <div>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Admin Principal</p>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold' }}>● {connectionMode}</span>
            </div>
          </div>
          <button id="logout-btn" className="secondary" onClick={() => setIsAuthenticated(false)} style={{ width: '100%' }}>
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '16px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingTop: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', color: 'var(--text-primary)' }}>
              {activeTab === 'overview' && 'System Analytics'}
              {activeTab === 'approvals' && 'Room Listings Verification'}
              {activeTab === 'complaints' && 'Security Disputes & SLA Monitor'}
              {activeTab === 'gtm' && 'Go-To-Market Strategy'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
              Logged in from Terminal: Real-time PostgreSQL client streams active.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="glass" style={{ padding: '10px 18px', fontSize: '13px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(99, 102, 241, 0.05)' }}>
              🔑 Custom Claim: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>role="admin"</span>
            </div>
          </div>
        </header>

        <div className="fade-in" style={{ flex: 1 }}>
          {activeTab === 'overview' && <DashboardOverview />}
          {activeTab === 'approvals' && <RoomApprovals />}
          {activeTab === 'complaints' && <ComplaintsList />}
          {activeTab === 'gtm' && <GoToMarketStrategy />}
        </div>
      </main>
    </div>
  );
}

function EmailVerificationCallback() {
  const [deepLinkUrl, setDeepLinkUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Capture both hash and search params to pass to the app
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    
    // Construct the deep link
    const deepLink = `campusstay://login-callback${hash}${hash ? '' : search}`;
    setDeepLinkUrl(deepLink);

    // Attempt automatic redirect after 1 second
    const timer = setTimeout(() => {
      window.location.href = deepLink;
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenApp = () => {
    if (deepLinkUrl) {
      window.location.href = deepLinkUrl;
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      position: 'relative',
      padding: '24px',
      background: 'var(--bg-main)',
      fontFamily: 'var(--font-family)'
    }}>
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <div className="glass fade-in" style={{
        maxWidth: '450px',
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        boxShadow: 'var(--shadow-main)'
      }}>
        {/* Success Icon Badge */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '2px solid var(--accent)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '32px',
          color: 'var(--accent)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
          animation: 'pulse-slow 2s infinite ease-in-out'
        }}>
          ✓
        </div>

        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            marginBottom: '12px'
          }}>
            Verification Successful
          </h2>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '15px',
            lineHeight: '1.6'
          }}>
            Your email has been successfully confirmed. You are now verified and ready to use the app!
          </p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            id="open-app-btn"
            onClick={handleOpenApp}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '16px',
              background: 'linear-gradient(135deg, var(--accent) 0%, #059669 100%)',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
            🚀 Open CampusStay App
          </button>
          
          <button 
            className="secondary"
            onClick={() => {
              navigator.clipboard.writeText(deepLinkUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px'
            }}
          >
            {copied ? '📋 Copied Link!' : '🔗 Copy Redirect Link'}
          </button>
        </div>

        <div style={{
          marginTop: '8px',
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: '1.5'
        }}>
          If you are on your phone, the button will open the CampusStay app directly. If it doesn't redirect, click "Open CampusStay App".
        </div>
      </div>
    </div>
  );
}

