// -----------------------------------------
// 1. MOBILE MENU TOGGLE
// -----------------------------------------
const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const icon = mobileToggle.querySelector('i');
    if (navLinks.classList.contains('active')) {
      icon.className = 'fa-solid fa-xmark';
      navLinks.style.display = 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '100%';
      navLinks.style.left = '0';
      navLinks.style.width = '100%';
      navLinks.style.background = '#ffffff'; navLinks.style.borderBottom = '1px solid rgba(0,0,0,0.08)';
      navLinks.style.padding = '20px';
      navLinks.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
    } else {
      icon.className = 'fa-solid fa-bars';
      navLinks.removeAttribute('style');
    }
  });
}

// -----------------------------------------
// 2. ROOMMATE MATCHER SIMULATOR
// -----------------------------------------
const budgetSlider = document.getElementById('budget-slider');
const budgetVal = document.getElementById('budget-val');
const sleepButtons = document.querySelectorAll('#sleep-habit .segment-btn');
const cleanButtons = document.querySelectorAll('#cleanliness .segment-btn');
const dietButtons = document.querySelectorAll('#dietary .segment-btn');

// Display Profile Elements
const matchPercentEl = document.getElementById('match-percent');
const matchSvgFill = document.getElementById('match-svg-fill');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileTags = document.getElementById('profile-tags');
const scoreBudget = document.getElementById('score-budget');
const scoreSleep = document.getElementById('score-sleep');
const scoreClean = document.getElementById('score-clean');

// Mock Profiles Database
const roommatesDb = [
  {
    name: "Felix Carter",
    avatar: "https://api.dicebear.com/7.x/adventurer/png?seed=Felix",
    college: "Bits Pilani Student",
    sleepHabit: "night",
    cleanliness: "medium",
    dietary: "veg",
    budgetMax: 9000,
  },
  {
    name: "Aneka Rao",
    avatar: "https://api.dicebear.com/7.x/adventurer/png?seed=Aneka",
    college: "Delhi University Student",
    sleepHabit: "early",
    cleanliness: "high",
    dietary: "veg",
    budgetMax: 14000,
  },
  {
    name: "Kabir Shah",
    avatar: "https://api.dicebear.com/7.x/adventurer/png?seed=Kabir",
    college: "IIT Bombay Student",
    sleepHabit: "night",
    cleanliness: "low",
    dietary: "nonveg",
    budgetMax: 6000,
  },
  {
    name: "Priya Nair",
    avatar: "https://api.dicebear.com/7.x/adventurer/png?seed=Priya",
    college: "SRM University Student",
    sleepHabit: "flexible",
    cleanliness: "high",
    dietary: "any",
    budgetMax: 12000,
  }
];

// Current simulator preferences state
let userPrefs = {
  budget: 8000,
  sleepHabit: 'flexible',
  cleanliness: 'medium',
  dietary: 'any'
};

// Update Match Score
function calculateMatch() {
  let bestMatch = null;
  let highestScore = -1;
  let bestBreakdown = {};

  for (const roommate of roommatesDb) {
    let score = 0;
    
    // Budget Match (30 pts)
    // Diff calculation: higher budget difference reduces score
    const budgetDiff = Math.abs(userPrefs.budget - roommate.budgetMax);
    const budgetScore = Math.max(10, 30 - Math.round(budgetDiff / 400));
    score += budgetScore;

    // Sleep Schedule Match (25 pts)
    let sleepScore = 5;
    if (userPrefs.sleepHabit === roommate.sleepHabit) {
      sleepScore = 25;
    } else if (userPrefs.sleepHabit === 'flexible' || roommate.sleepHabit === 'flexible') {
      sleepScore = 18;
    }
    score += sleepScore;

    // Cleanliness Habit Match (25 pts)
    let cleanScore = 10;
    if (userPrefs.cleanliness === roommate.cleanliness) {
      cleanScore = 25;
    } else if (
      (userPrefs.cleanliness === 'medium' && roommate.cleanliness !== 'medium') ||
      (roommate.cleanliness === 'medium' && userPrefs.cleanliness !== 'medium')
    ) {
      cleanScore = 18;
    }
    score += cleanScore;

    // Dietary Habits Match (20 pts)
    let dietScore = 5;
    if (userPrefs.dietary === roommate.dietary) {
      dietScore = 20;
    } else if (userPrefs.dietary === 'any' || roommate.dietary === 'any') {
      dietScore = 15;
    }
    score += dietScore;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = roommate;
      bestBreakdown = {
        budget: `${budgetScore}/30`,
        sleep: `${sleepScore}/25`,
        clean: `${cleanScore}/25`
      };
    }
  }

  // Render match details
  if (bestMatch) {
    // Round to max 100%
    const finalPercentage = Math.min(100, highestScore);
    
    // Animation ring update (stroke-dashoffset range is from 251.2 [0%] to 0 [100%])
    const strokeDashOffset = 251.2 * (1 - finalPercentage / 100);
    matchSvgFill.style.strokeDashoffset = strokeDashOffset;
    
    matchPercentEl.textContent = finalPercentage;
    profileAvatar.src = bestMatch.avatar;
    profileName.textContent = bestMatch.name;
    document.querySelector('.college-tag').textContent = bestMatch.college;
    
    // Tags rendering
    profileTags.innerHTML = '';
    const sleepTag = document.createElement('span');
    sleepTag.className = 'tag';
    sleepTag.textContent = bestMatch.sleepHabit === 'early' ? 'Early Bird' : (bestMatch.sleepHabit === 'night' ? 'Night Owl' : 'Flexible Sleep');
    
    const cleanTag = document.createElement('span');
    cleanTag.className = 'tag';
    cleanTag.textContent = bestMatch.cleanliness === 'high' ? 'Clean Freak' : (bestMatch.cleanliness === 'low' ? 'Chill' : 'Medium Clean');
    
    const dietTag = document.createElement('span');
    dietTag.className = 'tag';
    dietTag.textContent = bestMatch.dietary === 'veg' ? 'Veg Only' : (bestMatch.dietary === 'nonveg' ? 'Non-Veg' : 'Any Diet');
    
    profileTags.appendChild(sleepTag);
    profileTags.appendChild(cleanTag);
    profileTags.appendChild(dietTag);

    // Score breakdowns
    scoreBudget.textContent = bestBreakdown.budget;
    scoreSleep.textContent = bestBreakdown.sleep;
    scoreClean.textContent = bestBreakdown.clean;
  }
}

// Add event listeners for controls
if (budgetSlider) {
  budgetSlider.addEventListener('input', (e) => {
    userPrefs.budget = parseInt(e.target.value);
    budgetVal.textContent = `₹${userPrefs.budget.toLocaleString('en-IN')}`;
    calculateMatch();
  });
}

function handleSegmentClick(buttons, key) {
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      userPrefs[key] = btn.getAttribute('data-value');
      calculateMatch();
    });
  });
}

handleSegmentClick(sleepButtons, 'sleepHabit');
handleSegmentClick(cleanButtons, 'cleanliness');
handleSegmentClick(dietButtons, 'dietary');

// Initial trigger
calculateMatch();


// -----------------------------------------
// 3. DYNAMIC BILL SPLITTER WIDGET
// -----------------------------------------
const roommateButtons = document.querySelectorAll('.roommates-selector .count-btn');
const inputRent = document.getElementById('input-rent');
const inputElectricity = document.getElementById('input-electricity');
const inputMaid = document.getElementById('input-maid');
const inputWifi = document.getElementById('input-wifi');

const badgeMembers = document.getElementById('split-members-badge');
const splitRent = document.getElementById('split-rent');
const splitElectricity = document.getElementById('split-electricity');
const splitMaid = document.getElementById('split-maid');
const splitWifi = document.getElementById('split-wifi');
const splitTotal = document.getElementById('split-total');
const simulatePayBtn = document.getElementById('simulate-pay-btn');

let activeRoommateCount = 3;

function updateSplit() {
  const rent = parseFloat(inputRent.value) || 0;
  const electricity = parseFloat(inputElectricity.value) || 0;
  const maid = parseFloat(inputMaid.value) || 0;
  const wifi = parseFloat(inputWifi.value) || 0;
  
  const count = activeRoommateCount;
  
  const rentSplit = Math.round(rent / count);
  const electricitySplit = Math.round(electricity / count);
  const maidSplit = Math.round(maid / count);
  const wifiSplit = Math.round(wifi / count);
  const totalSplit = rentSplit + electricitySplit + maidSplit + wifiSplit;
  
  badgeMembers.textContent = count;
  splitRent.textContent = `₹${rentSplit.toLocaleString('en-IN')}`;
  splitElectricity.textContent = `₹${electricitySplit.toLocaleString('en-IN')}`;
  splitMaid.textContent = `₹${maidSplit.toLocaleString('en-IN')}`;
  splitWifi.textContent = `₹${wifiSplit.toLocaleString('en-IN')}`;
  splitTotal.textContent = `₹${totalSplit.toLocaleString('en-IN')}`;
  simulatePayBtn.innerHTML = `<i class="fa-solid fa-credit-card"></i> Pay Share (₹${totalSplit.toLocaleString('en-IN')}) via Razorpay`;
}

// Add event listeners
roommateButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    roommateButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeRoommateCount = parseInt(btn.getAttribute('data-count'));
    updateSplit();
  });
});

[inputRent, inputElectricity, inputMaid, inputWifi].forEach(input => {
  if (input) {
    input.addEventListener('input', updateSplit);
  }
});

// Initial load trigger
updateSplit();


// -----------------------------------------
// 4. RAZORPAY GATEWAY SIMULATION
// -----------------------------------------
if (simulatePayBtn) {
  simulatePayBtn.addEventListener('click', () => {
    const originalText = simulatePayBtn.innerHTML;
    simulatePayBtn.disabled = true;
    simulatePayBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Initializing Razorpay Gateway...`;
    
    setTimeout(() => {
      simulatePayBtn.innerHTML = `<i class="fa-solid fa-shield-check"></i> Authorizing UPI Pin...`;
      
      setTimeout(() => {
        // Create success modal container
        const modal = document.createElement('div');
        modal.className = 'payment-modal-overlay';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(4, 8, 17, 0.85)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.style.backdropFilter = 'blur(10px)';
        
        const txId = `pay_mock_${Date.now()}`;
        
        modal.innerHTML = `
          <div class="glass-card success-popup" style="text-align: center; max-width: 360px; padding: 40px; border-color: var(--green);">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--green); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 24px; color: #070e1b;">
              <i class="fa-solid fa-check"></i>
            </div>
            <h3 style="color: var(--green); font-size: 22px; margin-bottom: 8px;">PAYMENT SUCCESSFUL</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">Your room rent and bill share has been transferred to landlord successfully.</p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 10px; font-size: 11px; font-family: monospace; color: var(--text-main); margin-bottom: 24px;">
              Transaction: ${txId}
            </div>
            <button class="btn btn-primary" id="close-modal-btn" style="width: 100%; justify-content: center; background: var(--green); color: #070e1b; box-shadow: 0 4px 15px var(--green-glow);">
              Back to Portal
            </button>
          </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('close-modal-btn')?.addEventListener('click', () => {
          modal.remove();
          simulatePayBtn.disabled = false;
          simulatePayBtn.innerHTML = originalText;
        });
      }, 1500);
    }, 1500);
  });
}


// ============================================================================
// 5. SUPABASE BACKEND INTEGRATION & WEB PORTAL IMPLEMENTATION
// ============================================================================

const SUPABASE_URL = 'https://qynghqgbitcbczvfervg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5bmdocWdiaXRjYmN6dmZlcnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODQwMjQsImV4cCI6MjA5NjE2MDAyNH0.Bu5Zb5a9y2_mUfTB9TaPW1_fgPRce4VzLPgwWjucwJg';

// Try real Supabase first; fall back to local simulator if unavailable
let db;
const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);

if (supabaseLib && SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    db = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: window.sessionStorage,
        autoRefreshToken: true,
        persistSession: true
      }
    });
    console.log('✅ Connected to real Supabase backend');
  } catch (err) {
    console.warn('⚠️ Supabase init failed, using local simulator:', err);
    initSimulator();
  }
} else {
  console.warn('⚠️ Supabase not available, using local simulator');
  initSimulator();
}

function initSimulator() {
  db = {
    auth: {
      signUp: async ({ email, password, options }) => {
        const name = options?.data?.name || 'User';
        const role = options?.data?.role || 'student';
        const phone = options?.data?.phone || '';
        // Check for duplicate email
        let users = JSON.parse(localStorage.getItem('cs_users') || '[]');
        if (users.find(u => u.email === email)) {
          return { data: {}, error: { message: 'User with this email already exists. Please sign in instead.' } };
        }
        const user = { id: 'mock_user_' + Math.random().toString(36).substring(2, 9), email };
        const profile = { id: user.id, name, email, phone, role, trust_score: 85, verified: role === 'admin', preferences: { budgetMin: 2000, budgetMax: 10000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' } };
        users.push(profile);
        localStorage.setItem('cs_users', JSON.stringify(users));
        return { data: { user }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        let users = JSON.parse(localStorage.getItem('cs_users') || '[]');
        let profile = users.find(u => u.email === email);
        if (!profile) {
          // Auto-create default mock user based on email hint
          profile = {
            id: 'mock_' + (email.includes('owner') ? 'owner_' : 'student_') + Math.random().toString(36).substring(2, 6),
            name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            email,
            phone: '9999999999',
            role: email.includes('owner') ? 'owner' : 'student',
            trust_score: 85,
            preferences: { budgetMin: 2000, budgetMax: 10000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' }
          };
          users.push(profile);
          localStorage.setItem('cs_users', JSON.stringify(users));
        }
        localStorage.setItem('cs_session', JSON.stringify(profile));
        return { data: { user: { id: profile.id, email } }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem('cs_session');
      },
      onAuthStateChange: (callback) => {
        const sessionStr = localStorage.getItem('cs_session');
        const session = sessionStr ? { user: JSON.parse(sessionStr) } : null;
        setTimeout(() => callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session), 200);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from: (table) => {
      const lsKey = 'cs_' + table;
      const getItems = () => JSON.parse(localStorage.getItem(lsKey) || '[]');
      const saveItems = (items) => localStorage.setItem(lsKey, JSON.stringify(items));

      function applyJoin(items) {
        if (table === 'bookings') {
          const rooms = JSON.parse(localStorage.getItem('cs_rooms') || '[]');
          return items.map(b => ({ ...b, rooms: rooms.find(r => r.id === b.room_id) || null }));
        }
        return items;
      }

      const buildQuery = (initialItems) => {
        let filtered = [...initialItems];
        let _orderCol = null;
        let _ascending = true;
        let _limit = null;

        const finalize = () => {
          let result = [...filtered];
          if (_orderCol) {
            result.sort((a, b) => {
              const av = a[_orderCol] || '';
              const bv = b[_orderCol] || '';
              return _ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
            });
          }
          if (_limit !== null) result = result.slice(0, _limit);
          return applyJoin(result);
        };

        const chain = {
          eq: (col, val) => {
            filtered = filtered.filter(x => {
              if (typeof val === 'boolean') return x[col] === val;
              return String(x[col]) === String(val);
            });
            return chain;
          },
          neq: (col, val) => {
            filtered = filtered.filter(x => String(x[col]) !== String(val));
            return chain;
          },
          contains: (col, val) => {
            if (Array.isArray(val)) {
              filtered = filtered.filter(x => {
                const arr = x[col];
                if (!Array.isArray(arr)) return false;
                return val.every(v => arr.includes(v));
              });
            }
            return chain;
          },
          order: (col, opts = {}) => {
            _orderCol = col;
            _ascending = opts.ascending !== false;
            return chain;
          },
          limit: (n) => {
            _limit = n;
            return chain;
          },
          single: async () => {
            const result = finalize();
            return { data: result[0] || null, error: null };
          },
          maybeSingle: async () => {
            const result = finalize();
            return { data: result[0] || null, error: null };
          },
          then: (resolve) => {
            return Promise.resolve({ data: finalize(), error: null }).then(resolve);
          }
        };
        return chain;
      };

      return {
        select: (query = '*') => buildQuery(getItems()),
        insert: (data) => {
          let items = getItems();
          const newItem = {
            id: data.id || ('mock_' + Math.random().toString(36).substring(2, 9)),
            created_at: new Date().toISOString(),
            ...data
          };
          items.push(newItem);
          saveItems(items);
          return {
            select: () => ({ single: async () => ({ data: newItem, error: null }) }),
            then: (resolve) => Promise.resolve({ data: newItem, error: null }).then(resolve)
          };
        },
        update: (data) => ({
          eq: (col, val) => {
            let items = getItems();
            items = items.map(item => String(item[col]) === String(val) ? { ...item, ...data } : item);
            saveItems(items);
            return {
              select: () => ({ single: async () => ({ data, error: null }) }),
              then: (resolve) => Promise.resolve({ data, error: null }).then(resolve)
            };
          }
        }),
        upsert: (data) => {
          let items = getItems();
          const idx = items.findIndex(x => x.id === data.id);
          if (idx >= 0) {
            items[idx] = { ...items[idx], ...data };
          } else {
            items.push({ created_at: new Date().toISOString(), ...data });
          }
          saveItems(items);
          return {
            select: () => ({ single: async () => ({ data, error: null }) }),
            then: (resolve) => Promise.resolve({ data, error: null }).then(resolve)
          };
        }
      };
    },
    channel: (name) => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    removeChannel: () => {}
  };

  // Seed mock rooms if empty
  let rooms = JSON.parse(localStorage.getItem('cs_rooms') || '[]');
  if (rooms.length === 0) {
    rooms = [
      {
        id: 'room_1',
        title: 'Stanza Living Pearl (Single Flat)',
        city: 'Goa',
        rent: 8500,
        deposit: 17000,
        detailed_address: 'Zuarinagar, Sancoale',
        latitude: 15.3911,
        longitude: 73.8782,
        rating: 4.8,
        max_occupancy: 1,
        images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'],
        amenities: ['WiFi', 'AC', 'Maid'],
        available: true,
        verified: true,
        owner_id: 'mock_owner'
      },
      {
        id: 'room_2',
        title: 'Premium Co-Living Flat (Double Occupancy)',
        city: 'Goa',
        rent: 6500,
        deposit: 13000,
        detailed_address: 'Vidhyanagar Colony, Sancoale',
        latitude: 15.3895,
        longitude: 73.8812,
        rating: 4.6,
        max_occupancy: 2,
        images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=500&q=80'],
        amenities: ['WiFi', 'AC', 'Geyser'],
        available: true,
        verified: true,
        owner_id: 'mock_owner'
      },
      {
        id: 'room_3',
        title: 'Budget Student PG Near University',
        city: 'Pune',
        rent: 4500,
        deposit: 9000,
        detailed_address: 'Kothrud, Near Symbiosis University',
        latitude: 18.5074,
        longitude: 73.8077,
        rating: 4.2,
        max_occupancy: 3,
        images: ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=500&q=80'],
        amenities: ['WiFi', 'Maid', 'Parking'],
        available: true,
        verified: true,
        owner_id: 'mock_owner'
      }
    ];
    // Clear old rooms so max_occupancy is seeded fresh
    localStorage.setItem('cs_rooms', JSON.stringify(rooms));
  }

  // Seed mock students for the roommate matcher
  let users = JSON.parse(localStorage.getItem('cs_users') || '[]');
  const mockStudents = [
    {
      id: 'mock_student_felix',
      name: 'Felix Carter',
      email: 'felix@example.com',
      phone: '9876543210',
      role: 'student',
      trust_score: 92,
      preferences: { budgetMin: 5000, budgetMax: 9000, sleepHabit: 'night', dietary: 'veg', cleanliness: 'medium' }
    },
    {
      id: 'mock_student_aneka',
      name: 'Aneka Rao',
      email: 'aneka@example.com',
      phone: '9876543211',
      role: 'student',
      trust_score: 88,
      preferences: { budgetMin: 8000, budgetMax: 14000, sleepHabit: 'early', dietary: 'veg', cleanliness: 'high' }
    },
    {
      id: 'mock_student_priya',
      name: 'Priya Nair',
      email: 'priya@example.com',
      phone: '9876543212',
      role: 'student',
      trust_score: 80,
      preferences: { budgetMin: 6000, budgetMax: 12000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'high' }
    }
  ];
  mockStudents.forEach(ms => {
    if (!users.find(u => u.id === ms.id)) users.push(ms);
  });
  localStorage.setItem('cs_users', JSON.stringify(users));
}



let currentUserProfile = null;
let currentActiveTab = 'explore';
let mapInstance = null;
let activeChatRoomId = null;
let chatMessagesListener = null;

// 5.1 AUTH MODAL & FORM TOGGLES
const authModal = document.getElementById('auth-modal');
const loginNavBtn = document.getElementById('login-nav-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');
const userNavProfile = document.getElementById('user-nav-profile');
const navUsername = document.getElementById('nav-username');
const logoutNavBtn = document.getElementById('logout-nav-btn');
const navDashboardBtn = document.getElementById('nav-dashboard-btn');
const landingContent = document.getElementById('landing-content');
const dashboardPortal = document.getElementById('dashboard-portal');
const sidebarNavContainer = document.getElementById('sidebar-nav-container');

if (loginNavBtn) {
  loginNavBtn.addEventListener('click', () => openAuthModal('login-tab'));
}
if (closeAuthBtn) {
  closeAuthBtn.addEventListener('click', closeAuthModal);
}
if (logoutNavBtn) {
  logoutNavBtn.addEventListener('click', handleSignOut);
}
if (navDashboardBtn) {
  navDashboardBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showDashboard();
  });
}

// Auth Tab switching (Sign In vs Sign Up)
document.querySelectorAll('.auth-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-panel').forEach(p => p.style.display = 'none');
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).style.display = 'block';
  });
});

// Segment control selections
document.querySelectorAll('.segmented-control button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const parent = btn.parentElement;
    parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function openAuthModal(defaultTab) {
  if (authModal) {
    authModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scroll while modal is open
    const tabBtn = document.querySelector(`.auth-tab-btn[data-tab="${defaultTab}"]`);
    if (tabBtn) tabBtn.click();
  }
}

function closeAuthModal() {
  if (authModal) authModal.style.display = 'none';
  document.body.style.overflow = ''; // Restore scrolling when modal closes
}

function showDashboard() {
  if (landingContent) landingContent.style.display = 'none';
  if (dashboardPortal) dashboardPortal.style.display = 'block';
  document.body.style.overflow = ''; // Ensure scrolling is always enabled on dashboard
  document.querySelectorAll('.landing-nav').forEach(el => el.style.display = 'none');
  window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on dashboard open
  renderSidebar();
}

function hideDashboard() {
  if (landingContent) landingContent.style.display = 'block';
  if (dashboardPortal) dashboardPortal.style.display = 'none';
  document.body.style.overflow = ''; // Restore scrolling
  document.querySelectorAll('.landing-nav').forEach(el => el.style.display = 'inline-block');
}

// 5.2 AUTHENTICATION ACTION HANDLERS
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

if (loginForm) {
  loginForm.addEventListener('submit', handleSignIn);
}
if (registerForm) {
  registerForm.addEventListener('submit', handleSignUp);
}

async function handleSignUp(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const phone = document.getElementById('register-phone').value;
  const password = document.getElementById('register-password').value;
  const role = document.querySelector('#register-role-selector button.active')?.dataset?.role || 'student';

  const signUpSubmitBtn = e.target.querySelector('button[type="submit"]');
  signUpSubmitBtn.disabled = true;
  signUpSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, phone }
    }
  });

  if (error) {
    alert(`Registration Error: ${error.message}`);
    signUpSubmitBtn.disabled = false;
    signUpSubmitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
    return;
  }

  // Trigger auto-sync upsert fallback (Postgres triggers sync automatically, but just to be robust)
  try {
    if (data.user) {
      const uid = data.user.id;
      const username = email.split('@')[0] + '_' + uid.substring(0, 5);
      await db.from('users').upsert({
        id: uid,
        name,
        email,
        phone,
        role,
        trust_score: 85,
        verified: role === 'admin',
        username
      });
    }
  } catch (err) {
    console.log("Upsert sync fallback warning: ", err);
  }

  alert("Account created successfully! You can now log in.");
  signUpSubmitBtn.disabled = false;
  signUpSubmitBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';

  // Pre-fill email in login form and switch to login tab
  const loginEmailInput = document.getElementById('login-email');
  if (loginEmailInput) {
    loginEmailInput.value = email;
  }

  const loginRoleBtn = document.querySelector(`#login-role-selector button[data-role="${role}"]`);
  if (loginRoleBtn) {
    loginRoleBtn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    loginRoleBtn.classList.add('active');
  }

  openAuthModal('login-tab');

  const loginPasswordInput = document.getElementById('login-password');
  if (loginPasswordInput) {
    loginPasswordInput.focus();
  }
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const role = document.querySelector('#login-role-selector button.active')?.dataset.role || 'student';

  const signInSubmitBtn = e.target.querySelector('button[type="submit"]');
  const resetBtn = () => {
    signInSubmitBtn.disabled = false;
    signInSubmitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
  };

  signInSubmitBtn.disabled = true;
  signInSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

  // Safety timeout — if nothing happens in 12s, reset
  const timeoutId = setTimeout(() => {
    resetBtn();
    alert('Sign in timed out. Please check your internet connection and try again.');
  }, 12000);

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    clearTimeout(timeoutId);

    if (error) {
      let msg = error.message || 'Unknown error';
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        msg = 'Incorrect email or password. Please try again.';
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        msg = 'Please confirm your email first. Check your inbox for a verification email from Supabase.';
      } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
        msg = 'Network error. Please check your connection.';
      }
      resetBtn();
      alert('Sign In Error: ' + msg);
      return;
    }

    if (!data || !data.user) {
      resetBtn();
      alert('Sign in failed: No user session returned. Please try again.');
      return;
    }

    // Build profile directly from auth session (no extra DB call needed — avoids RLS issues)
    // onAuthStateChange will fire and sync the full profile from DB in the background
    const meta = data.user.user_metadata || {};
    const profileName = meta.name || meta.full_name || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    currentUserProfile = {
      id: data.user.id,
      name: profileName,
      email: data.user.email || email,
      phone: meta.phone || '',
      role: meta.role || role,
      trust_score: 85,
      verified: meta.verified || false,
      profile_pic: meta.avatar_url || meta.picture || 'https://api.dicebear.com/7.x/adventurer/png?seed=' + data.user.id,
      preferences: meta.preferences || { budgetMin: 2000, budgetMax: 15000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' }
    };

    // Now try to get the real DB profile in background (non-blocking)
    db.from('users').select('*').eq('id', data.user.id).single()
      .then(({ data: dbProfile }) => {
        if (dbProfile) {
          if (dbProfile.blocked) {
            alert("Your account has been suspended by the administrator.");
            handleSignOut();
            return;
          }
          currentUserProfile = dbProfile;
          if (navUsername) navUsername.textContent = dbProfile.name;
          const avatarEl = document.getElementById('dashboard-user-avatar');
          if (avatarEl) avatarEl.src = dbProfile.profile_pic || currentUserProfile.profile_pic;
          setupRealtimeBlockListener(db, data.user.id);
        }
      }).catch(() => {});

    resetBtn();
    closeAuthModal();
    syncUIForLoggedInUser();

  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Sign in exception:', err);
    resetBtn();
    alert('Sign in failed: ' + (err.message || 'Unexpected error. Please try again.'));
  }
}

let userBlockSubscription = null;

function setupRealtimeBlockListener(dbClient, userId) {
  if (userBlockSubscription) {
    userBlockSubscription.unsubscribe();
  }

  userBlockSubscription = dbClient.channel('realtime-user-block')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, (payload) => {
      if (payload.new && payload.new.blocked) {
        alert("Your account has been suspended by the administrator.");
        handleSignOut();
      }
    })
    .subscribe();
}

async function handleSignOut() {
  if (userBlockSubscription) {
    userBlockSubscription.unsubscribe();
    userBlockSubscription = null;
  }
  await db.auth.signOut();
  currentUserProfile = null;
  hideDashboard();
  if (userNavProfile) userNavProfile.style.display = 'none';
  if (loginNavBtn) loginNavBtn.style.display = 'inline-block';
}

// -----------------------------------------------
// GOOGLE OAUTH SIGN-IN
// Google Client ID: 179023479964-73tkfusn9qitgak1dinckosj6orebmd7.apps.googleusercontent.com
// Callback URL:     https://qynghqgbitcbczvfervg.supabase.co/auth/v1/callback
// -----------------------------------------------
async function handleGoogleSignIn() {
  // Show redirect loading state on all Google buttons
  const googleBtns = document.querySelectorAll('#google-login-btn, #google-signup-btn');
  googleBtns.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i> Redirecting to Google...`;
  });

  try {
    if (db.auth.signInWithOAuth) {
      const redirectTo = window.location.origin;

      const { data, error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });

      if (error) {
        console.warn('Google OAuth error:', error.message);
        googleBtns.forEach(btn => { btn.disabled = false; btn.innerHTML = restoreGoogleBtnHTML(); });
        alert('Google sign-in error: ' + error.message);
        return;
      }
      // Browser navigates away to Google — buttons stay disabled
      return;
    }

    googleBtns.forEach(btn => { btn.disabled = false; btn.innerHTML = restoreGoogleBtnHTML(); });
    alert('Google sign-in not available. Please use Magic Link instead.');

  } catch (err) {
    console.warn('Google OAuth exception:', err);
    googleBtns.forEach(btn => { btn.disabled = false; btn.innerHTML = restoreGoogleBtnHTML(); });
    alert('Google sign-in failed: ' + (err.message || 'Unknown error'));
  }
}

function restoreGoogleBtnHTML() {
  return `<svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M46.145 24.504c0-1.615-.145-3.169-.414-4.664H24v8.82h12.435c-.536 2.905-2.165 5.37-4.617 7.02v5.833h7.474c4.37-4.026 6.853-9.954 6.853-17.01z"/><path fill="#34A853" d="M24 47c6.237 0 11.465-2.069 15.286-5.6l-7.474-5.833c-2.07 1.387-4.717 2.207-7.812 2.207-6.007 0-11.093-4.057-12.907-9.506H3.398v6.022C7.2 42.637 15.02 47 24 47z"/><path fill="#FBBC05" d="M11.093 28.268A13.887 13.887 0 0 1 10.4 24c0-1.488.255-2.93.693-4.268v-6.022H3.398A22.994 22.994 0 0 0 1 24c0 3.724.893 7.244 2.398 10.29l7.695-6.022z"/><path fill="#EA4335" d="M24 10.226c3.384 0 6.421 1.163 8.81 3.447l6.61-6.61C35.459 3.296 30.232 1 24 1 15.02 1 7.2 5.363 3.398 13.71l7.695 6.022c1.814-5.449 6.9-9.506 12.907-9.506z"/></svg> Sign in with Google (Same as App)`;
}

// Demo Google login simulation (for when real OAuth is not configured)
function simulateGoogleLogin() {
  // Show a loading state before simulating login
  const googleBtns = document.querySelectorAll('#google-login-btn, #google-signup-btn');
  googleBtns.forEach(btn => {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i> Connecting to Google...`;
  });

  setTimeout(() => {
    // Create a demo Google user profile
    const demoGoogleProfile = {
      id: 'google_demo_' + Math.random().toString(36).substring(2, 9),
      name: 'Demo Google User',
      email: 'demo.google@gmail.com',
      phone: '',
      role: 'student',
      trust_score: 85,
      verified: true,
      profile_pic: 'https://api.dicebear.com/7.x/adventurer/png?seed=GoogleDemo',
      preferences: { budgetMin: 2000, budgetMax: 15000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' }
    };

    // Save to local session
    localStorage.setItem('cs_session', JSON.stringify(demoGoogleProfile));

    // Save to users store
    let users = JSON.parse(localStorage.getItem('cs_users') || '[]');
    if (!users.find(u => u.id === demoGoogleProfile.id)) {
      users.push(demoGoogleProfile);
      localStorage.setItem('cs_users', JSON.stringify(users));
    }

    currentUserProfile = demoGoogleProfile;
    closeAuthModal();
    syncUIForLoggedInUser();
    showToast('✅ Signed in with Google (Demo Mode)', 'success');

    // Re-enable buttons
    googleBtns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M46.145 24.504c0-1.615-.145-3.169-.414-4.664H24v8.82h12.435c-.536 2.905-2.165 5.37-4.617 7.02v5.833h7.474c4.37-4.026 6.853-9.954 6.853-17.01z"/><path fill="#34A853" d="M24 47c6.237 0 11.465-2.069 15.286-5.6l-7.474-5.833c-2.07 1.387-4.717 2.207-7.812 2.207-6.007 0-11.093-4.057-12.907-9.506H3.398v6.022C7.2 42.637 15.02 47 24 47z"/><path fill="#FBBC05" d="M11.093 28.268A13.887 13.887 0 0 1 10.4 24c0-1.488.255-2.93.693-4.268v-6.022H3.398A22.994 22.994 0 0 0 1 24c0 3.724.893 7.244 2.398 10.29l7.695-6.022z"/><path fill="#EA4335" d="M24 10.226c3.384 0 6.421 1.163 8.81 3.447l6.61-6.61C35.459 3.296 30.232 1 24 1 15.02 1 7.2 5.363 3.398 13.71l7.695 6.022c1.814-5.449 6.9-9.506 12.907-9.506z"/></svg> Sign in with Google (Same as App)`;
    });
  }, 1500);
}

// Wire up Google buttons
const googleLoginBtn = document.getElementById('google-login-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');
if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleSignIn);
if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleSignIn);

// Wire up Magic Link button
const magicLinkBtn = document.getElementById('magic-link-btn');
if (magicLinkBtn) {
  magicLinkBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
      alert('Please enter your email address above first, then click Magic Link.');
      emailInput && emailInput.focus();
      return;
    }
    magicLinkBtn.disabled = true;
    magicLinkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:8px;"></i> Sending link...';
    try {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
      });
      magicLinkBtn.disabled = false;
      magicLinkBtn.innerHTML = '<i class="fa-solid fa-envelope-open-text" style="color:#7c83fd;margin-right:8px;"></i> Send Magic Link (Passwordless)';
      if (error) {
        alert('Magic Link error: ' + error.message);
      } else {
        alert('✅ Magic link sent to ' + email + '! Check your inbox and click the link to sign in.');
      }
    } catch (err) {
      magicLinkBtn.disabled = false;
      magicLinkBtn.innerHTML = '<i class="fa-solid fa-envelope-open-text" style="color:#7c83fd;margin-right:8px;"></i> Send Magic Link (Passwordless)';
      alert('Failed to send magic link: ' + (err.message || 'Unknown error'));
    }
  });
}

// Wire up Forgot Password link
const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('login-email');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
      alert('Please enter your email address above first, then click "Forgot password?"');
      emailInput && emailInput.focus();
      return;
    }
    try {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) {
        alert('Password reset error: ' + error.message);
      } else {
        alert('✅ Password reset email sent to ' + email + '! Check your inbox and click the link to set a new password.');
      }
    } catch (err) {
      alert('Failed to send reset email: ' + (err.message || 'Unknown error'));
    }
  });
}

// Toast helper
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast-notification${type === 'success' ? ' success' : ''}`;
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

db.auth.onAuthStateChange(async (event, session) => {
  // Clear hash fragment from URL if it contains auth tokens to prevent loop triggers
  if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
    try {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    } catch (e) {
      console.warn("Failed to clear URL hash:", e);
    }
  }
  // Handle: new sign-in, page reload with existing session, token refresh
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session && session.user) {
    const userId = session.user.id;

    // Prevent auto-refreshing dashboard and resetting user tab view when browser tab is focused and token is refreshed
    if (currentUserProfile && currentUserProfile.id === userId) {
      console.log('Session already active, skipping redundant UI render');
      return;
    }
    let profile = null;

    try {
      const { data, error } = await db.from('users').select('*').eq('id', userId).single();
      if (!error && data) {
        profile = data;
      }
    } catch (err) {
      console.warn("Failed to fetch user profile:", err);
    }

    // If this is a new Google/OAuth user with no profile row yet, auto-create one
    if (!profile && session.user.email) {
      const meta = session.user.user_metadata || {};
      const name = meta.full_name || meta.name || session.user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const username = session.user.email.split('@')[0] + '_' + userId.substring(0, 5);
      
      try {
        await db.from('users').upsert({
          id: userId,
          name,
          email: session.user.email,
          phone: '',
          role: 'student',
          trust_score: 85,
          verified: false,
          username,
          profile_pic: meta.avatar_url || meta.picture || ''
        });
        const result = await db.from('users').select('*').eq('id', userId).single();
        if (result && result.data) {
          profile = result.data;
        }
      } catch (err) {
        console.warn("OAuth profile upsert fallback failed (likely RLS restrictions):", err);
      }
    }

    // Fallback: If profile row is still missing/unreadable, construct local state from session metadata
    if (!profile) {
      const meta = session.user.user_metadata || {};
      const name = meta.full_name || meta.name || session.user.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      profile = {
        id: userId,
        name,
        email: session.user.email || '',
        phone: '',
        role: 'student',
        trust_score: 85,
        verified: false,
        profile_pic: meta.avatar_url || meta.picture || 'https://api.dicebear.com/7.x/adventurer/png?seed=' + userId,
        preferences: { budgetMin: 2000, budgetMax: 15000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' }
      };
      console.log("Using OAuth session user metadata fallback profile:", profile);
    }

    if (profile) {
      if (profile.blocked) {
        alert("Your account has been suspended by the administrator.");
        db.auth.signOut();
        return;
      }
      currentUserProfile = profile;
      closeAuthModal();
      syncUIForLoggedInUser();
      setupRealtimeBlockListener(db, userId);
    }
    return;
  }

  if (event === 'SIGNED_OUT') {
    currentUserProfile = null;
    hideDashboard();
    if (userNavProfile) userNavProfile.style.display = 'none';
    if (loginNavBtn) loginNavBtn.style.display = 'inline-block';
  }
});


function syncUIForLoggedInUser() {
  if (!currentUserProfile) return;
  if (loginNavBtn) loginNavBtn.style.display = 'none';
  if (userNavProfile) {
    userNavProfile.style.display = 'flex';
    if (navUsername) navUsername.textContent = currentUserProfile.name;
  }

  document.getElementById('dashboard-user-avatar').src = currentUserProfile.profile_pic || 'https://api.dicebear.com/7.x/adventurer/png?seed=' + currentUserProfile.id;
  document.getElementById('dashboard-user-name').textContent = currentUserProfile.name;
  document.getElementById('dashboard-user-role').textContent = currentUserProfile.role.toUpperCase();
  document.getElementById('dashboard-user-score-val').textContent = currentUserProfile.trust_score || 85;

  showDashboard();
}

// 5.3 SIDEBAR NAV MENU POPULATION
function renderSidebar() {
  if (!currentUserProfile) return;
  sidebarNavContainer.innerHTML = '';
  
  const tabs = currentUserProfile.role === 'student' ? [
    { id: 'explore', label: 'Explore Rooms', icon: 'fa-hotel' },
    { id: 'my-room', label: 'My Room', icon: 'fa-house-user' },
    { id: 'matcher', label: 'Roommate Matcher', icon: 'fa-people-arrows' },
    { id: 'bookings', label: 'Bookings & Split', icon: 'fa-calculator' },
    { id: 'student-bills', label: 'My Bills', icon: 'fa-file-invoice-dollar' },
    { id: 'tickets', label: 'Maintenance SLA', icon: 'fa-screwdriver-wrench' },
    { id: 'chat', label: 'Real-time Chat', icon: 'fa-comments' },
    { id: 'profile', label: 'My Profile & Verification', icon: 'fa-id-card' }
  ] : currentUserProfile.role === 'admin' ? [
    { id: 'admin-panel', label: 'Admin Panel', icon: 'fa-shield-halved' },
    { id: 'explore', label: 'Explore Rooms', icon: 'fa-hotel' },
    { id: 'chat', label: 'All Chats', icon: 'fa-comments' },
    { id: 'profile', label: 'My Profile', icon: 'fa-user-gear' }
  ] : [
    { id: 'listings', label: 'My Listings', icon: 'fa-house-medical' },
    { id: 'owner-verification', label: 'Owner Verification', icon: 'fa-id-card' },
    { id: 'deletion-requests', label: 'Deletion Requests', icon: 'fa-trash-can' },
    { id: 'approvals', label: 'Booking Requests', icon: 'fa-clipboard-check' },
    { id: 'bills', label: 'Utility Split Bills', icon: 'fa-file-invoice-dollar' },
    { id: 'sla', label: 'SLA Tickets', icon: 'fa-wrench' },
    { id: 'owner-chat', label: 'Tenant Chat', icon: 'fa-message' },
    { id: 'trust', label: 'Trust Score Details', icon: 'fa-shield-halved' }
  ];

  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `sidebar-link-btn ${tab.id === currentActiveTab ? 'active' : ''}`;
    btn.innerHTML = `<i class="fa-solid ${tab.icon}"></i> ${tab.label}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-link-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentActiveTab = tab.id;
      renderActiveView(tab.id);
    });
    sidebarNavContainer.appendChild(btn);
  });

  renderActiveView(currentActiveTab);
}

// 5.4 VIEW DISPATCHER
function renderActiveView(viewId) {
  const pane = document.getElementById('dashboard-view-pane');
  if (!pane) return;
  pane.innerHTML = `<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color: var(--primary);"></i><p style="margin-top: 15px; color: var(--text-muted);">Fetching details from database...</p></div>`;

  if (viewId === 'explore') loadExploreView(pane);
  else if (viewId === 'my-room') loadMyRoomView(pane);
  else if (viewId === 'matcher') loadMatcherView(pane);
  else if (viewId === 'bookings') loadBookingsView(pane);
  else if (viewId === 'student-bills') loadStudentBillsView(pane);
  else if (viewId === 'tickets') loadTicketsView(pane);
  else if (viewId === 'chat') loadChatView(pane);
  else if (viewId === 'profile') loadProfileView(pane);
  
  // Owner Views
  else if (viewId === 'listings') loadOwnerListings(pane);
  else if (viewId === 'owner-verification') loadOwnerVerificationView(pane);
  else if (viewId === 'deletion-requests') loadOwnerDeletionRequests(pane);
  else if (viewId === 'approvals') loadOwnerApprovals(pane);
  else if (viewId === 'bills') loadOwnerBills(pane);
  else if (viewId === 'sla') loadOwnerSLA(pane);
  else if (viewId === 'owner-chat') loadChatView(pane);
  else if (viewId === 'trust') loadOwnerTrust(pane);
  // Admin Views
  else if (viewId === 'admin-panel') loadAdminPanel(pane);
}


// ============================================================================
// 6. STUDENT DASHBOARD VIEW IMPLEMENTATIONS
// ============================================================================

// Helper: Distance Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return parseFloat((R * c).toFixed(2));
}

// 6.1 EXPLORE VIEW
async function loadExploreView(pane) {
  const { data: rooms, error } = await db.from('rooms').select('*').eq('available', true);
  if (error || !rooms) {
    pane.innerHTML = `<p style="color: var(--primary);">Error loading rooms: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  // Check if THIS student already has an active/requested booking
  const { data: myBookings } = await db.from('bookings').select('*').eq('student_id', currentUserProfile.id);
  const myActiveBooking = myBookings ? myBookings.find(b => b.status === 'Active' || b.status === 'Requested') : null;

  // Get all confirmed bookings to compute vacancy per room
  const { data: allBookings } = await db.from('bookings').select('room_id, status');
  const confirmedBookings = allBookings || [];

  const studentLat = 15.3911;
  const studentLng = 73.8782;

  let sortedRooms = rooms.map(room => {
    const dist = getDistance(studentLat, studentLng, room.latitude, room.longitude);
    const occupants = confirmedBookings.filter(b => b.room_id === room.id && (b.status === 'Active' || b.status === 'Confirmed')).length;
    const maxOcc = room.max_occupancy || 2;
    const vacancyLeft = Math.max(0, maxOcc - occupants);
    return { ...room, distance: dist, occupants, vacancyLeft, maxOcc };
  });

  sortedRooms.sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const alreadyBookedBanner = myActiveBooking ? `
    <div style="background: rgba(211,47,47,0.08); border: 1px solid rgba(211,47,47,0.3); border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
      <i class="fa-solid fa-circle-exclamation" style="color: var(--primary); font-size: 18px;"></i>
      <div>
        <strong style="color: var(--primary);">You already have an active booking.</strong>
        <p style="font-size: 13px; color: var(--text-muted); margin: 2px 0 0 0;">You must cancel your current booking before requesting a new room.</p>
      </div>
    </div>
  ` : '';

  pane.innerHTML = `
    <div class="dashboard-section-header">
      <h2>Browse Student Housing Listings</h2>
      <span class="badge" style="background: rgba(0, 242, 254, 0.1); border-color: var(--cyan); color: var(--cyan);">
        <i class="fa-solid fa-location-crosshairs"></i> GPS Sort: Active (Nearby first)
      </span>
    </div>
    ${alreadyBookedBanner}
    <div class="rooms-grid">
      ${sortedRooms.map(room => {
        const isFull = room.vacancyLeft === 0;
        const vacancyLabel = isFull
          ? `<span style="background: rgba(211,47,47,0.12); color: var(--primary); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(211,47,47,0.25);"><i class="fa-solid fa-lock"></i> FULL</span>`
          : `<span style="background: rgba(46,125,50,0.10); color: var(--green); font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; border: 1px solid rgba(46,125,50,0.25);"><i class="fa-solid fa-door-open"></i> ${room.vacancyLeft} spot${room.vacancyLeft !== 1 ? 's' : ''} left</span>`;
        return `
        <div class="room-card" style="${isFull ? 'opacity:0.75;' : ''}">
          <div style="position: relative;">
            <img src="${room.images[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'}" class="room-card-image" alt="Room Image">
            ${isFull ? '<div style="position:absolute;top:10px;right:10px;background:rgba(211,47,47,0.9);color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;"><i class="fa-solid fa-ban"></i> FULLY BOOKED</div>' : ''}
          </div>
          <div class="room-card-content">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="tag" style="background: rgba(255, 75, 92, 0.08); color: var(--primary);">${room.city}</span>
              <span style="font-size: 12px; color: var(--green); font-weight: bold;"><i class="fa-solid fa-star"></i> ${room.rating || '4.5'}</span>
            </div>
            <h3 class="room-card-title">${room.title}</h3>
            <p class="room-card-address"><i class="fa-solid fa-map-pin"></i> ${room.detailed_address}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              ${vacancyLabel}
              <span style="font-size: 11px; color: var(--text-muted);"><i class="fa-solid fa-users"></i> ${room.occupants}/${room.maxOcc} occupied</span>
            </div>
            <div class="room-card-meta">
              <span class="room-card-rent">₹${room.rent.toLocaleString('en-IN')}<span style="font-size: 11px; font-weight: normal; color: var(--text-muted);">/mo</span></span>
              ${room.distance !== null ? `<span style="font-size: 12px; color: var(--cyan);"><i class="fa-solid fa-person-walking"></i> ${room.distance} km away</span>` : ''}
            </div>
            <button class="btn btn-secondary detail-btn" data-id="${room.id}" style="width: 100%; margin-top: 15px; justify-content: center; font-size: 13px;" ${isFull ? 'disabled style="width:100%;margin-top:15px;justify-content:center;font-size:13px;opacity:0.5;cursor:not-allowed;"' : ''}>
              ${isFull ? '<i class="fa-solid fa-ban"></i> Room Fully Booked' : 'View Walking Path & Details'}
            </button>
          </div>
        </div>
      `}).join('')}
    </div>
  `;

  document.querySelectorAll('.detail-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = sortedRooms.find(r => r.id === btn.dataset.id);
      if (room) showRoomDetail(pane, room, studentLat, studentLng, !!myActiveBooking);
    });
  });
}

function showRoomDetail(pane, room, studentLat, studentLng, alreadyBooked = false) {
  pane.innerHTML = `
    <div class="detail-view-container">
      <div class="detail-header-row">
        <div>
          <button class="btn btn-secondary" id="back-to-explore" style="padding: 6px 12px; font-size: 12px; margin-bottom: 15px;">
            <i class="fa-solid fa-arrow-left"></i> Back to Feed
          </button>
          <h2>${room.title}</h2>
          <p style="color: var(--text-muted); font-size: 14px; margin-top: 6px;"><i class="fa-solid fa-location-dot"></i> ${room.detailed_address}, ${room.city}</p>
        </div>
        <div style="text-align: right;">
          <div class="room-card-rent" style="font-size: 28px;">₹${room.rent.toLocaleString('en-IN')}</div>
          <span style="font-size: 12px; color: var(--text-muted);">Deposit: ₹${(room.deposit || room.rent * 2).toLocaleString('en-IN')}</span>
        </div>
      </div>

      <img src="${room.images[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'}" style="width: 100%; height: 320px; object-fit: cover; border-radius: 16px; border: 1px solid var(--border-glass);" alt="Room Image">

      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px; margin-top: 10px;">
        <div>
          <h3>Description</h3>
          <p style="color: var(--text-muted); margin-top: 8px; font-size: 14px; line-height: 1.7;">${room.description || 'No description listed for this co-living flat.'}</p>
          
          <h3 style="margin-top: 24px;">Amenities Included</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
            ${(room.amenities || ['WiFi', 'AC', 'Maid Services', 'Geyser']).map(am => `
              <span class="tag" style="background: rgba(255,255,255,0.03); color: var(--text-main); font-size: 12px; padding: 6px 12px; border-radius: 8px;">
                <i class="fa-solid fa-check" style="color: var(--green); margin-right: 6px;"></i> ${am}
              </span>
            `).join('')}
          </div>
        </div>

        <div>
          <div class="glass-card" style="padding: 24px; text-align: center; border-color: rgba(0, 242, 254, 0.2);">
            <h4 style="margin-bottom: 8px;">GPS Routing Guidance</h4>
            <p style="font-size: 12px; color: var(--text-muted);">Walking path from BITS Pilani campus coordinates to flat location.</p>
            <div id="routing-map" class="detail-map-box"></div>
            
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
              ${alreadyBooked
                ? `<button class="btn" disabled style="justify-content: center; width: 100%; background: rgba(211,47,47,0.1); color: var(--primary); border: 1px solid rgba(211,47,47,0.3); cursor: not-allowed;">
                    <i class="fa-solid fa-circle-exclamation"></i> Already Have a Booking
                   </button>
                   <p style="font-size: 11px; color: var(--text-muted); text-align:center; margin:0;">Cancel your current booking first to request a new room.</p>`
                : `<button class="btn btn-primary" id="book-room-btn" style="justify-content: center; width: 100%;">
                    <i class="fa-solid fa-bolt"></i> Book Co-Living Flat
                   </button>`
              }
              <button class="btn btn-secondary" id="chat-landlord-btn" style="justify-content: center; width: 100%;">
                <i class="fa-solid fa-comment-dots"></i> Chat with Landlord
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('back-to-explore')?.addEventListener('click', () => loadExploreView(pane));

  // Render routing Leaflet map
  setTimeout(() => {
    try {
      const roomLat = room.latitude || 15.3900;
      const roomLng = room.longitude || 73.8800;
      
      if (mapInstance) {
        try { mapInstance.remove(); } catch (e) {}
        mapInstance = null;
      }

      mapInstance = L.map('routing-map').setView([studentLat, studentLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance);

      L.marker([studentLat, studentLng]).addTo(mapInstance).bindPopup("Your Spot").openPopup();
      L.marker([roomLat, roomLng]).addTo(mapInstance).bindPopup("Flat Location");

      // Mock slightly winding walking route
      const points = [
        [studentLat, studentLng],
        [studentLat + 0.001, studentLng - 0.001],
        [roomLat, roomLng]
      ];
      L.polyline(points, { color: '#ff4b5c', weight: 4, dashArray: '5, 10' }).addTo(mapInstance);
    } catch (err) {
      console.log("Leaflet render error: ", err);
    }
  }, 100);

  // Book Room button (only rendered if student has no active booking)
  const bookBtn = document.getElementById('book-room-btn');
  if (bookBtn) {
    bookBtn.addEventListener('click', async () => {
      bookBtn.disabled = true;
      bookBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Booking...';

      // Double-check: prevent booking if student already has an active booking
      const { data: existingBookings } = await db.from('bookings').select('*').eq('student_id', currentUserProfile.id);
      const hasActive = existingBookings && existingBookings.find(b => b.status === 'Active' || b.status === 'Requested');
      if (hasActive) {
        showToast('You already have an active booking. Cancel it first before booking a new room.', 'error');
        bookBtn.disabled = false;
        bookBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Book Co-Living Flat';
        return;
      }

      // Check room vacancy
      const { data: roomBookings } = await db.from('bookings').select('id').eq('room_id', room.id);
      const currentOccupants = roomBookings ? roomBookings.filter(b => b.status === 'Active' || b.status === 'Confirmed').length : 0;
      const maxOcc = room.max_occupancy || 2;
      if (currentOccupants >= maxOcc) {
        showToast('This room is fully booked. Please choose another room.', 'error');
        bookBtn.disabled = false;
        bookBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Book Co-Living Flat';
        return;
      }

      const { data: booking, error } = await db.from('bookings').insert({
        student_id: currentUserProfile.id,
        room_id: room.id,
        owner_id: room.owner_id,
        status: 'Requested',
        move_in_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        rent: room.rent
      }).select().single();

      if (error) {
        showToast(`Booking Error: ${error.message}`, 'error');
        bookBtn.disabled = false;
        bookBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Book Co-Living Flat';
      } else {
        showToast('Booking request submitted successfully! Waiting for landlord approval.', 'success');
        bookBtn.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--green);"></i> Requested — Pending Approval';
      }
    });
  }

  // Chat Landlord
  document.getElementById('chat-landlord-btn')?.addEventListener('click', async () => {
    // Generate or fetch chat room
    const studentId = currentUserProfile.id;
    const ownerId = room.owner_id;
    const chatRoomId = `${studentId}_${ownerId}`;
    
    // Find or create chat
    const { data: existingChat } = await db.from('chats').select('*').contains('participants', [studentId, ownerId]).maybeSingle();
    
    if (!existingChat) {
      await db.from('chats').insert({
        id: chatRoomId,
        participants: [studentId, ownerId],
        last_message: `Inquiry for flat: ${room.title}`,
        last_message_at: new Date().toISOString()
      });
    }

    activeChatRoomId = existingChat ? existingChat.id : chatRoomId;
    currentActiveTab = 'chat';
    renderSidebar();
  });
}

// 6.2 ROOMMATE MATCHER VIEW
async function loadMatcherView(pane) {
  // Query all other students
  const { data: students, error } = await db.from('users').select('*').eq('role', 'student').neq('id', currentUserProfile.id);
  if (error || !students) {
    pane.innerHTML = `<p style="color: var(--primary);">Error querying roommate matching list: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  const userPref = currentUserProfile.preferences || { budgetMin: 2000, budgetMax: 15000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' };

  let roommateMatches = students.map(student => {
    const sPref = student.preferences || {};
    let score = 0;
    
    // Budget overlap logic (30 pts)
    const targetBudgetAvg = ((userPref.budgetMin || 2000) + (userPref.budgetMax || 12000)) / 2;
    const otherBudgetAvg = ((sPref.budgetMin || 2000) + (sPref.budgetMax || 12000)) / 2;
    const diff = Math.abs(targetBudgetAvg - otherBudgetAvg);
    const budgetScore = Math.max(10, 30 - Math.round(diff / 400));
    score += budgetScore;

    // Sleep habits (25 pts)
    let sleepScore = 5;
    if (userPref.sleepHabit === sPref.sleepHabit) sleepScore = 25;
    else if (userPref.sleepHabit === 'flexible' || sPref.sleepHabit === 'flexible') sleepScore = 18;
    score += sleepScore;

    // Cleanliness (25 pts)
    let cleanScore = 10;
    if (userPref.cleanliness === sPref.cleanliness) cleanScore = 25;
    else if (userPref.cleanliness === 'medium' || sPref.cleanliness === 'medium') cleanScore = 18;
    score += cleanScore;

    // Diet options (20 pts)
    let dietScore = 5;
    if (userPref.dietary === sPref.dietary) dietScore = 20;
    else if (userPref.dietary === 'any' || sPref.dietary === 'any') dietScore = 15;
    score += dietScore;

    return {
      profile: student,
      matchPercentage: Math.min(100, score),
      budgetScore,
      sleepScore,
      cleanScore
    };
  });

  // Sort match percentage descending
  roommateMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

  pane.innerHTML = `
    <div class="dashboard-section-header">
      <h2>Co-Living Roommate Matcher Simulator</h2>
      <p style="color: var(--text-muted); font-size: 13px; margin: 0;">Compatibility rankings compiled based on sleep, diet, cleanliness habits & budgets.</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
      ${roommateMatches.map(match => `
        <div class="glass-card match-card" style="padding: 24px;">
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
            <img src="${match.profile.profile_pic || 'https://api.dicebear.com/7.x/adventurer/png?seed=' + match.profile.id}" style="width: 60px; height: 60px; border-radius: 50%; background: #112240;" alt="Roommate Avatar">
            <div style="text-align: left;">
              <h3 style="font-size: 18px;">${match.profile.name}</h3>
              <span class="college-tag">Trust Score: ${match.profile.trust_score}%</span>
            </div>
            <div style="margin-left: auto; text-align: center;">
              <div style="font-size: 24px; font-weight: 900; color: var(--cyan);">${match.matchPercentage}%</div>
              <span style="font-size: 10px; color: var(--text-muted);">Match</span>
            </div>
          </div>

          <div style="display: flex; gap: 6px; margin-bottom: 16px;">
            <span class="tag" style="font-size: 10px;">${match.profile.preferences?.sleepHabit || 'Flexible Sleep'}</span>
            <span class="tag" style="font-size: 10px; color: var(--green); border-color: rgba(0, 245, 160, 0.2); background: rgba(0, 245, 160, 0.04);">${match.profile.preferences?.cleanliness || 'Medium'} Clean</span>
            <span class="tag" style="font-size: 10px; color: var(--primary); border-color: rgba(255, 75, 92, 0.2); background: rgba(255, 75, 92, 0.04);">${match.profile.preferences?.dietary || 'Veg/Nonveg'}</span>
          </div>

          <div class="compatibility-breakdown" style="border-top: 1px solid var(--border-glass); padding-top: 15px;">
            <div class="breakdown-item">
              <span>Budget Match</span>
              <span class="score">${match.budgetScore}/30</span>
            </div>
            <div class="breakdown-item">
              <span>Sleep Schedule</span>
              <span class="score">${match.sleepScore}/25</span>
            </div>
            <div class="breakdown-item">
              <span>Cleanliness Preference</span>
              <span class="score">${match.cleanScore}/25</span>
            </div>
          </div>

          <button class="btn btn-primary chat-match-btn" data-uid="${match.profile.id}" style="width: 100%; margin-top: 15px; justify-content: center; font-size: 13px;">
            <i class="fa-solid fa-message"></i> Send Inquiry Chat
          </button>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.chat-match-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const studentId = currentUserProfile.id;
      const peerId = btn.dataset.uid;
      const chatRoomId = `${studentId}_${peerId}`;
      
      const { data: existingChat } = await db.from('chats').select('*').contains('participants', [studentId, peerId]).maybeSingle();
      
      if (!existingChat) {
        await db.from('chats').insert({
          id: chatRoomId,
          participants: [studentId, peerId],
          last_message: 'Roommate match connection initialized.',
          last_message_at: new Date().toISOString()
        });
      }

      activeChatRoomId = existingChat ? existingChat.id : chatRoomId;
      currentActiveTab = 'chat';
      renderSidebar();
    });
  });
}

// 6.3 BOOKINGS & RENT SPLIT VIEW
async function loadBookingsView(pane) {
  // Query bookings with room details
  const { data: bookings, error } = await db.from('bookings').select('*, rooms(*)').eq('student_id', currentUserProfile.id);
  if (error || !bookings) {
    pane.innerHTML = `<p style="color: var(--primary);">Error loading bookings: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  if (bookings.length === 0) {
    pane.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="fa-solid fa-receipt fa-3x" style="color: var(--text-muted); margin-bottom: 20px;"></i>
        <h3>No Active Co-Living Bookings Found</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Explore flat listings and book a flat to split monthly rent & utility bills.</p>
        <button class="btn btn-primary" onclick="document.querySelector('button[data-id=explore]').click();" style="margin-top: 20px;">
          Find Rooms
        </button>
      </div>
    `;
    return;
  }

  // Pick first booking for split illustration
  const activeBooking = bookings.find(b => b.status === 'Active') || bookings[0];

  // If booking is pending request
  if (activeBooking.status === 'Requested') {
    pane.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="fa-solid fa-spinner fa-spin fa-3x" style="color: var(--cyan); margin-bottom: 20px;"></i>
        <h3>Booking Approval Pending</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Flat: <strong>${activeBooking.rooms?.title || 'Selected Room'}</strong></p>
        <p style="color: var(--text-muted); font-size: 13px;">The landlord is currently verifying your tenant profile and credentials. You will be notified shortly.</p>
      </div>
    `;
    return;
  }

  // Retrieve occupancy list to calculate rent split
  const { data: allActiveBookings } = await db.from('bookings').select('id').eq('room_id', activeBooking.room_id).eq('status', 'Active');
  const occupantCount = Math.max(1, allActiveBookings ? allActiveBookings.length : 1);

  // Retrieve landlord entered room bills for this flat
  const { data: bills } = await db.from('room_bills').select('*').eq('room_id', activeBooking.room_id).order('created_at', { ascending: false }).limit(1);
  const latestBill = bills && bills.length > 0 ? bills[0] : { electricity_bill: 1500, maid_bill: 2000, wifi_bill: 900, billing_month: 'June 2026' };

  const rentSplit = Math.round(activeBooking.rent / occupantCount);
  const electricitySplit = Math.round(latestBill.electricity_bill / occupantCount);
  const maidSplit = Math.round(latestBill.maid_bill / occupantCount);
  const wifiSplit = Math.round(latestBill.wifi_bill / occupantCount);
  const grandTotalShare = rentSplit + electricitySplit + maidSplit + wifiSplit;

  pane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div>
        <h2 style="font-size:22px;">Rent &amp; Utilities Split Dashboard</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Dynamic room bills divided based on real headcount in flat.</p>
      </div>

      <!-- Room Info Card -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size: 17px; margin-bottom: 10px;"><i class="fa-solid fa-hotel" style="color: var(--primary); margin-right:8px;"></i>${activeBooking.rooms?.title}</h3>
        <p style="font-size: 13px; color: var(--text-muted);"><i class="fa-solid fa-map-pin"></i> ${activeBooking.rooms?.detailed_address}</p>

        <div style="display: flex; gap: 15px; margin-top: 20px;">
          <div style="flex: 1; background: #f4f5f7; padding: 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.07);">
            <span style="font-size: 12px; color: var(--text-muted); display:block;">Current Active Tenant count</span>
            <div style="font-size: 24px; font-weight: 700; color: var(--primary); margin-top: 6px;">${occupantCount} Member${occupantCount !== 1 ? 's' : ''}</div>
          </div>
          <div style="flex: 1; background: #f4f5f7; padding: 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.07);">
            <span style="font-size: 12px; color: var(--text-muted); display:block;">Billing cycle month</span>
            <div style="font-size: 24px; font-weight: 700; color: var(--green); margin-top: 6px;">${latestBill.billing_month}</div>
          </div>
        </div>
      </div>

      <!-- Split Details Card -->
      <div class="glass-card" style="padding: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-size: 17px;">Monthly Share Details</h3>
          <span style="font-size: 12px; background: rgba(211,47,47,0.08); color: var(--primary); border: 1px solid rgba(211,47,47,0.2); padding: 4px 12px; border-radius: 20px; font-weight: 700;">
            <i class="fa-solid fa-receipt"></i> Split: 1/${occupantCount}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="padding: 14px 18px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <div style="font-size: 12px; color: var(--text-muted);">Rent Share</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-top: 4px;">₹${rentSplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding: 14px 18px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <div style="font-size: 12px; color: var(--text-muted);">Electricity Split</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-top: 4px;">₹${electricitySplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding: 14px 18px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <div style="font-size: 12px; color: var(--text-muted);">Maid Split</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-top: 4px;">₹${maidSplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="padding: 14px 18px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <div style="font-size: 12px; color: var(--text-muted);">WiFi Split</div>
            <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin-top: 4px;">₹${wifiSplit.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-top: 1px dashed rgba(0,0,0,0.1); margin-bottom: 20px;">
          <span style="font-size: 16px; font-weight: 700;">Your Total Share</span>
          <span style="font-size: 28px; font-weight: 900; color: var(--primary);">₹${grandTotalShare.toLocaleString('en-IN')}</span>
        </div>

        <button class="btn btn-primary" id="pay-split-invoice-btn" style="width: 100%; justify-content: center; padding: 16px; font-size: 15px;">
          <i class="fa-solid fa-credit-card"></i> Pay ₹${grandTotalShare.toLocaleString('en-IN')} via Razorpay
        </button>
      </div>
    </div>
  `;

  // Checkout Payment integration
  document.getElementById('pay-split-invoice-btn')?.addEventListener('click', async () => {
    const payBtn = document.getElementById('pay-split-invoice-btn');
    if (!payBtn) return;
    const origText = payBtn.innerHTML;
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading Razorpay secure gateway...';

    setTimeout(async () => {
      payBtn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Processing transaction...';

      // Insert billing payment log in database
      const { data: payment, error } = await db.from('payments').insert({
        booking_id: activeBooking.id,
        student_id: currentUserProfile.id,
        amount: grandTotalShare,
        method: 'UPI',
        status: 'Successful',
        razorpay_id: 'pay_' + Math.random().toString(36).substring(2, 11),
        receipt: 'rec_' + Date.now()
      }).select().single();

      setTimeout(() => {
        // Success dialog overlay
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = `
          <div class="glass-card success-popup" style="text-align: center; max-width: 380px; padding: 40px; border-color: var(--green);">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--green); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; font-size: 24px; color: #070e1b;">
              <i class="fa-solid fa-check"></i>
            </div>
            <h3 style="color: var(--green); font-size: 22px; margin-bottom: 8px;">PAYMENT VERIFIED</h3>
            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">Your co-living split bills have been successfully settled and receipts logged in backend.</p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 10px; font-size: 11px; font-family: monospace; color: var(--text-main); margin-bottom: 24px;">
              Razorpay ID: ${payment?.razorpay_id || 'pay_unknown'}
            </div>
            <button class="btn btn-primary" id="success-ok-btn" style="width: 100%; justify-content: center; background: var(--green); color: #070e1b;">
              Return to Portal
            </button>
          </div>
        `;
        document.body.appendChild(dialog);
        
        document.getElementById('success-ok-btn')?.addEventListener('click', () => {
          dialog.remove();
          payBtn.disabled = false;
          payBtn.innerHTML = origText;
          renderActiveView('bookings');
        });
      }, 1000);

    }, 1500);
  });
}

// 6.3b MY BILLS VIEW — Student sees actual bills split by real confirmed occupants only
async function loadStudentBillsView(pane) {
  // Get student's active booking
  const { data: bookings } = await db.from('bookings').select('*, rooms(*)').eq('student_id', currentUserProfile.id);
  const activeBooking = bookings ? (bookings.find(b => b.status === 'Active') || bookings.find(b => b.status === 'Confirmed') || bookings.find(b => b.status === 'Requested')) : null;

  if (!activeBooking) {
    pane.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-file-invoice-dollar fa-3x" style="color: var(--text-muted); margin-bottom: 20px;"></i>
        <h3>No Active Booking Found</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">You need an active room booking to view bills. Explore listings and book a room first.</p>
        <button class="btn btn-primary" style="margin-top: 20px;" onclick="currentActiveTab='explore'; renderSidebar();">
          <i class="fa-solid fa-hotel"></i> Explore Rooms
        </button>
      </div>`;
    return;
  }

  if (activeBooking.status === 'Requested') {
    pane.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-hourglass-half fa-3x" style="color: var(--cyan); margin-bottom: 20px;"></i>
        <h3>Booking Pending Approval</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Bills will be available once your landlord approves your booking for <strong>${activeBooking.rooms?.title || 'your selected room'}</strong>.</p>
      </div>`;
    return;
  }

  // Count ONLY real confirmed/active students in this room (no bots, no mock data)
  const { data: roomOccupants } = await db.from('bookings').select('student_id, status').eq('room_id', activeBooking.room_id);
  const confirmedOccupants = roomOccupants ? roomOccupants.filter(b => b.status === 'Active' || b.status === 'Confirmed') : [];
  const occupantCount = Math.max(1, confirmedOccupants.length);

  // Get latest landlord bills for this room
  const { data: bills } = await db.from('room_bills').select('*').eq('room_id', activeBooking.room_id).order('created_at', { ascending: false }).limit(1);
  const latestBill = bills && bills.length > 0 ? bills[0] : {
    electricity_bill: 1200,
    maid_bill: 0,
    wifi_bill: 900,
    billing_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  };

  // Accurate split — divided by ACTUAL occupant count only
  const rent = activeBooking.rent || 0;
  const electricity = latestBill.electricity_bill || 0;
  const maid = latestBill.maid_bill || 0;
  const wifi = latestBill.wifi_bill || 0;

  const rentSplit = Math.round(rent / occupantCount);
  const electricitySplit = Math.round(electricity / occupantCount);
  const maidSplit = Math.round(maid / occupantCount);
  const wifiSplit = Math.round(wifi / occupantCount);
  const totalShare = rentSplit + electricitySplit + maidSplit + wifiSplit;

  // Payment history
  const { data: payments } = await db.from('payments').select('*').eq('student_id', currentUserProfile.id).order('created_at', { ascending: false });
  const paymentHistory = payments || [];

  pane.innerHTML = `
    <div class="dashboard-section-header">
      <h2><i class="fa-solid fa-file-invoice-dollar" style="color: var(--primary);"></i> My Monthly Bills</h2>
      <span class="badge" style="background: rgba(46,125,50,0.1); border-color: var(--green); color: var(--green);">
        <i class="fa-solid fa-users"></i> ${occupantCount} Real Member${occupantCount !== 1 ? 's' : ''} in Room
      </span>
    </div>

    <!-- Room Info Banner -->
    <div class="glass-card" style="padding: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: 700; font-size: 16px;">${activeBooking.rooms?.title || 'Your Room'}</div>
        <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-map-pin"></i> ${activeBooking.rooms?.detailed_address || ''}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: var(--text-muted);">Billing Month</div>
        <div style="font-weight: 700; color: var(--cyan);">${latestBill.billing_month}</div>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Bill Breakdown -->
      <div class="glass-card" style="padding: 28px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-size: 17px;">Bill Breakdown</h3>
          <span style="font-size: 12px; background: rgba(211,47,47,0.08); color: var(--primary); border: 1px solid rgba(211,47,47,0.2); padding: 4px 12px; border-radius: 20px; font-weight: 700;">
            Split by ${occupantCount} member${occupantCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-glass);">
            <div>
              <div style="font-weight: 600; font-size: 14px;"><i class="fa-solid fa-house" style="color: var(--primary); margin-right: 8px;"></i> Room Rent</div>
              <div style="font-size: 11px; color: var(--text-muted);">₹${rent.toLocaleString('en-IN')} ÷ ${occupantCount}</div>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main);">₹${rentSplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-glass);">
            <div>
              <div style="font-weight: 600; font-size: 14px;"><i class="fa-solid fa-bolt" style="color: #f59e0b; margin-right: 8px;"></i> Electricity Bill</div>
              <div style="font-size: 11px; color: var(--text-muted);">₹${electricity.toLocaleString('en-IN')} ÷ ${occupantCount}</div>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main);">₹${electricitySplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-glass);">
            <div>
              <div style="font-weight: 600; font-size: 14px;"><i class="fa-solid fa-broom" style="color: #8b5cf6; margin-right: 8px;"></i> Maid Services</div>
              <div style="font-size: 11px; color: var(--text-muted);">₹${maid.toLocaleString('en-IN')} ÷ ${occupantCount}</div>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main);">₹${maidSplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--border-glass);">
            <div>
              <div style="font-weight: 600; font-size: 14px;"><i class="fa-solid fa-wifi" style="color: var(--cyan); margin-right: 8px;"></i> WiFi Bill</div>
              <div style="font-size: 11px; color: var(--text-muted);">₹${wifi.toLocaleString('en-IN')} ÷ ${occupantCount}</div>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: var(--text-main);">₹${wifiSplit.toLocaleString('en-IN')}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 0 0 0;">
            <div style="font-size: 15px; font-weight: 700;">Your Total Share</div>
            <div style="font-size: 26px; font-weight: 900; color: var(--primary);">₹${totalShare.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <button class="btn btn-primary" id="bills-pay-btn" style="width: 100%; justify-content: center; margin-top: 20px; font-size: 15px; padding: 16px;">
          <i class="fa-solid fa-credit-card"></i> Pay ₹${totalShare.toLocaleString('en-IN')} via Razorpay
        </button>
      </div>

      <!-- Room Members inline row -->
      <div class="glass-card" style="padding: 20px;">
        <h3 style="font-size: 15px; margin-bottom: 14px;"><i class="fa-solid fa-users" style="color: var(--primary); margin-right:8px;"></i>Room Members</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
          ${confirmedOccupants.length === 0
            ? `<p style="color: var(--text-muted); font-size: 13px;">Only you in this room.</p>`
            : [...new Map(confirmedOccupants.map(b => [b.student_id, b])).values()].map((b, i) => `
              <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(0,0,0,0.03); border-radius: 10px; border: 1px solid var(--border-glass);">
                <img src="https://api.dicebear.com/7.x/adventurer/png?seed=${b.student_id}" style="width: 32px; height: 32px; border-radius: 50%;" alt="Member">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">${b.student_id === currentUserProfile.id ? 'You' : 'Member ' + (i + 1)}</div>
                  <div style="font-size: 11px; color: var(--green);">Active tenant</div>
                </div>
              </div>`).join('')
          }
          <div style="margin-left: auto; padding: 12px 20px; background: rgba(46,125,50,0.07); border: 1px solid rgba(46,125,50,0.2); border-radius: 12px; text-align: center;">
            <div style="font-size: 11px; color: var(--text-muted);">Each person pays</div>
            <div style="font-size: 20px; font-weight: 900; color: var(--green);">₹${totalShare.toLocaleString('en-IN')}</div>
            <div style="font-size: 11px; color: var(--text-muted);">per month</div>
          </div>
        </div>
      </div>

    <!-- Payment History -->
    <div class="glass-card" style="padding: 24px;">
      <h3 style="font-size: 16px; margin-bottom: 20px;"><i class="fa-solid fa-clock-rotate-left" style="color: var(--primary);"></i> Payment History</h3>
      ${paymentHistory.length === 0
        ? `<div style="text-align: center; padding: 30px; border: 1px dashed var(--border-glass); border-radius: 12px;">
             <p style="color: var(--text-muted);">No payments made yet. Pay your first bill above!</p>
           </div>`
        : `<div style="display: flex; flex-direction: column; gap: 12px;">
             ${paymentHistory.map(p => `
               <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(0,0,0,0.02); border: 1px solid var(--border-glass); border-radius: 12px;">
                 <div style="display: flex; align-items: center; gap: 12px;">
                   <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(46,125,50,0.1); display: flex; align-items: center; justify-content: center; color: var(--green);">
                     <i class="fa-solid fa-circle-check"></i>
                   </div>
                   <div>
                     <div style="font-weight: 600; font-size: 14px;">Bill Payment — ${p.method || 'UPI'}</div>
                     <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${p.razorpay_id || p.id}</div>
                   </div>
                 </div>
                 <div style="text-align: right;">
                   <div style="font-size: 16px; font-weight: 700; color: var(--green);">₹${(p.amount || 0).toLocaleString('en-IN')}</div>
                   <div style="font-size: 11px; color: var(--text-muted);">${new Date(p.created_at).toLocaleDateString('en-IN')}</div>
                 </div>
               </div>`).join('')}
           </div>`
      }
    </div>
  `;

  // Pay button handler
  const billsPayBtn = document.getElementById('bills-pay-btn');
  if (billsPayBtn) {
    billsPayBtn.addEventListener('click', async () => {
      const origText = billsPayBtn.innerHTML;
      billsPayBtn.disabled = true;
      billsPayBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting to Razorpay...';

      setTimeout(async () => {
        billsPayBtn.innerHTML = '<i class="fa-solid fa-shield-check"></i> Authorizing...';

        const { data: payment } = await db.from('payments').insert({
          booking_id: activeBooking.id,
          student_id: currentUserProfile.id,
          amount: totalShare,
          method: 'UPI',
          status: 'Successful',
          razorpay_id: 'pay_' + Math.random().toString(36).substring(2, 11),
          receipt: 'rec_' + Date.now()
        }).select().single();

        setTimeout(() => {
          const dialog = document.createElement('div');
          dialog.className = 'modal-overlay';
          dialog.innerHTML = `
            <div class="glass-card" style="text-align: center; max-width: 380px; padding: 40px; border-color: var(--green);">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--green); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 26px; color: #fff;">
                <i class="fa-solid fa-check"></i>
              </div>
              <h3 style="color: var(--green); font-size: 22px; margin-bottom: 8px;">Payment Successful!</h3>
              <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 8px;">₹${totalShare.toLocaleString('en-IN')} paid for ${latestBill.billing_month}</p>
              <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">Your share split by ${occupantCount} real member${occupantCount !== 1 ? 's' : ''} — accurate & verified.</p>
              <div style="background: rgba(0,0,0,0.03); border: 1px solid var(--border-glass); padding: 12px; border-radius: 10px; font-size: 11px; font-family: monospace; color: var(--text-main); margin-bottom: 24px;">
                ${payment?.razorpay_id || 'pay_ref_' + Date.now()}
              </div>
              <button class="btn btn-primary" id="bill-success-ok" style="width: 100%; justify-content: center; background: var(--green);">
                Done
              </button>
            </div>`;
          document.body.appendChild(dialog);
          document.body.style.overflow = 'hidden';
          document.getElementById('bill-success-ok')?.addEventListener('click', () => {
            dialog.remove();
            document.body.style.overflow = '';
            loadStudentBillsView(pane); // Refresh to show payment in history
          });
        }, 1000);
      }, 1500);
    });
  }
}

// 6.4 MAINTENANCE SLA TICKETS VIEW
async function loadTicketsView(pane) {
  // Query active room to file ticket
  const { data: bookings } = await db.from('bookings').select('*, rooms(*)').eq('student_id', currentUserProfile.id).eq('status', 'Active');
  const activeBooking = bookings && bookings.length > 0 ? bookings[0] : null;

  // Query tickets
  const { data: tickets, error } = await db.from('maintenance').select('*').eq('student_id', currentUserProfile.id);
  if (error || !tickets) {
    pane.innerHTML = `<p style="color: var(--primary);">Error loading tickets: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  pane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 28px;">
      <!-- Raise Ticket Card at top -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size:16px; margin-bottom:6px;"><i class="fa-solid fa-screwdriver-wrench" style="color:var(--primary); margin-right:8px;"></i>Raise Maintenance Ticket</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Describe plumbing, electrical or utility complaints inside your co-living flat.</p>
        ${!activeBooking ? `
          <div style="text-align: center; padding: 20px; background: rgba(211,47,47,0.05); border-radius: 10px; border: 1px solid rgba(211,47,47,0.15);">
            <p style="font-size: 13px; color: var(--primary); font-weight: bold;">No active bookings found.</p>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">You must have an approved flat booking before submitting maintenance requests.</p>
          </div>
        ` : `
          <form id="raise-ticket-form" style="display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: flex-end;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Issue Description</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-circle-exclamation input-icon"></i>
                <input type="text" id="ticket-issue" placeholder="Leaking tap in bathroom" required>
              </div>
            </div>
            <button type="submit" class="btn btn-primary" style="white-space: nowrap; padding: 14px 20px;">
              <i class="fa-solid fa-paper-plane"></i> File SLA Ticket
            </button>
          </form>
        `}
      </div>

      <!-- Ticket History below -->
      <div>
        <h2 style="font-size:18px; margin-bottom:6px;">SLA Maintenance Request History</h2>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Track maintenance issues. Landlords must respond inside 24 hours.</p>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${tickets.length === 0 ? `
            <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-glass); border-radius: 12px;">
              <i class="fa-solid fa-check-circle fa-2x" style="color: var(--text-muted); margin-bottom: 12px;"></i>
              <p style="color: var(--text-muted);">No maintenance tickets filed yet. Use the form above to raise an issue.</p>
            </div>
          ` : tickets.map(ticket => `
            <div class="ticket-row-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="bold-val" style="font-size: 14px;"># ${ticket.id.substring(0, 8)}</span>
                <span class="tag" style="background: ${ticket.status === 'Resolved' ? 'rgba(46,125,50,0.1)' : 'rgba(211,47,47,0.1)'}; color: ${ticket.status === 'Resolved' ? 'var(--green)' : 'var(--primary)'}; border-color: ${ticket.status === 'Resolved' ? 'rgba(46,125,50,0.2)' : 'rgba(211,47,47,0.2)'}; border-radius: 20px; padding: 4px 12px;">${ticket.status}</span>
              </div>
              <p style="font-size: 14px; color: var(--text-main); font-weight: 600;"><i class="fa-solid fa-wrench" style="color:var(--text-muted); margin-right:6px;"></i>${ticket.issue}</p>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;"><i class="fa-solid fa-location-dot"></i> ${ticket.room_address}</p>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px; display: flex; gap: 15px;">
                <span>Filed: ${new Date(ticket.created_at).toLocaleDateString()}</span>
                ${ticket.resolved_at ? `<span>Resolved: ${new Date(ticket.resolved_at).toLocaleDateString()}</span>` : '<span style="color: var(--primary);">Awaiting Response (24h SLA)</span>'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;


  if (activeBooking) {
    document.getElementById('raise-ticket-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const issue = document.getElementById('ticket-issue')?.value || '';
      const fileBtn = e.target.querySelector('button[type="submit"]');
      fileBtn.disabled = true;
      fileBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

      const { error } = await db.from('maintenance').insert({
        room_id: activeBooking.room_id,
        owner_id: activeBooking.owner_id,
        student_id: currentUserProfile.id,
        status: 'Open',
        issue,
        room_address: activeBooking.rooms.detailed_address,
        photos: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&q=80']
      });

      if (error) {
        alert(`Error: ${error.message}`);
        fileBtn.disabled = false;
        fileBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> File SLA Ticket';
      } else {
        alert("Maintenance Ticket raised. Landlord notified under SLA mandate.");
        renderActiveView('tickets');
      }
    });
  }
}

// 6.5 REAL-TIME CHAT VIEW
async function loadChatView(pane) {
  // Fetch chats
  const { data: chats, error } = await db.from('chats').select('*');
  if (error || !chats) {
    pane.innerHTML = `<p style="color: var(--primary);">Error loading conversations: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  // Filter chats participant list
  const userChats = chats.filter(chat => chat.participants.includes(currentUserProfile.id));

  // Select first chat if activeChatRoomId is not set
  if (!activeChatRoomId && userChats.length > 0) {
    activeChatRoomId = userChats[0].id;
  }

  const hasChats = userChats.length > 0;

  pane.innerHTML = `
    <div class="chat-window">
      <div class="chat-pane-wrapper">
        <!-- Thread Sidebar -->
        <div class="chat-thread-list" id="chat-thread-container">
          ${!hasChats ? `
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">
              <i class="fa-solid fa-comments fa-2x" style="margin-bottom: 10px; opacity: 0.5;"></i>
              <p style="font-size: 12px;">No active conversations.</p>
            </div>
          ` : ''}
        </div>

        <!-- Message Panel -->
        <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
          <div id="chat-header-pane" style="padding: 13px 18px; border-bottom: 1px solid rgba(0,0,0,0.08); font-weight: 700; font-size: 15px; background: #fff; flex-shrink: 0;">
            ${hasChats ? 'Select a conversation' : 'No active conversation'}
          </div>
          <div class="chat-messages-container" id="chat-messages-scroll" style="${!hasChats ? 'display: flex; align-items: center; justify-content: center; background: #fafafa; color: var(--text-muted); flex-grow: 1;' : ''}">
            ${!hasChats ? `
              <div style="text-align: center; padding: 20px;">
                <i class="fa-solid fa-comments fa-3x" style="margin-bottom: 15px; opacity: 0.3;"></i>
                <p>Start a chat with roommates or property owners from flat details page.</p>
              </div>
            ` : '<!-- Messages rendered dynamically -->'}
          </div>
          <form class="chat-input-row" id="chat-input-form" style="flex-shrink: 0;">
            <input type="text" id="chat-msg-text" placeholder="${hasChats ? 'Type a message...' : 'Start a chat from flat details...'}" ${!hasChats ? 'disabled' : ''} required autocomplete="off">
            <button type="submit" class="btn btn-primary" ${!hasChats ? 'disabled' : ''} style="padding: 12px 20px; margin: 0; flex-shrink:0;"><i class="fa-solid fa-paper-plane"></i></button>
          </form>
        </div>
      </div>
    </div>
  `;

  if (!hasChats) return;

  // Render chat thread links sidebar
  const threadContainer = document.getElementById('chat-thread-container');
  
  for (const chat of userChats) {
    // Resolve other participant name
    const peerId = chat.participants.find(p => p !== currentUserProfile.id);
    let peerName = "Participant";
    
    if (peerId) {
      const { data: peer } = await db.from('users').select('name').eq('id', peerId).single();
      if (peer) peerName = peer.name;
    }

    // Query unread message count
    const { count } = await db
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chat.id)
      .neq('sender_id', currentUserProfile.id)
      .eq('is_read', false);

    const unreadBadge = (count && count > 0) ? `<span class="chat-thread-unread-badge">${count}</span>` : '';

    const item = document.createElement('div');
    item.className = `chat-thread-item ${chat.id === activeChatRoomId ? 'active' : ''}`;
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <div class="chat-thread-name">${peerName}</div>
        ${unreadBadge}
      </div>
      <div class="chat-thread-last">${chat.last_message || 'No messages yet'}</div>
    `;
    
    item.addEventListener('click', () => {
      activeChatRoomId = chat.id;
      document.querySelectorAll('.chat-thread-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      loadMessagesForChat(chat.id, peerName);
      // Remove badge locally upon opening
      const badge = item.querySelector('.chat-thread-unread-badge');
      if (badge) badge.remove();
    });

    threadContainer.appendChild(item);
  }

  // Load initial active chat room messages
  const initialActiveChat = userChats.find(c => c.id === activeChatRoomId);
  if (initialActiveChat) {
    const pId = initialActiveChat.participants.find(p => p !== currentUserProfile.id);
    let pName = "Landlord / Tenant";
    if (pId) {
      const { data: peer } = await db.from('users').select('name').eq('id', pId).single();
      if (peer) pName = peer.name;
    }
    loadMessagesForChat(activeChatRoomId, pName);
  }

  // Handle send message form
  const inputForm = document.getElementById('chat-input-form');
  inputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const textEl = document.getElementById('chat-msg-text');
    const msg = textEl.value.trim();
    if (!msg || !activeChatRoomId) return;

    textEl.value = '';

    const { error } = await db.from('messages').insert({
      chat_id: activeChatRoomId,
      sender_id: currentUserProfile.id,
      sender_name: currentUserProfile.name,
      text: msg
    });

    // Update parent chat last message metadata
    await db.from('chats').update({
      last_message: msg,
      last_message_at: new Date().toISOString()
    }).eq('id', activeChatRoomId);

    if (error) console.log("Failed to send message: ", error.message);
  });
}

async function loadMessagesForChat(chatId, peerName) {
  const headerPane = document.getElementById('chat-header-pane');
  if (headerPane) headerPane.textContent = peerName;
  const messagesPane = document.getElementById('chat-messages-scroll');
  if (!messagesPane) return;
  messagesPane.innerHTML = '';

  // Mark existing messages as read in Supabase
  await db.from('messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', currentUserProfile.id)
    .eq('is_read', false);

  // Retrieve message log
  const { data: messages, error } = await db.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
  if (error || !messages) return;

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    const isSent = msg.sender_id === currentUserProfile.id;
    bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
    bubble.textContent = msg.text;
    messagesPane.appendChild(bubble);
  });

  // Scroll to bottom
  messagesPane.scrollTop = messagesPane.scrollHeight;

  // Real-time channel message updates streaming
  if (chatMessagesListener) {
    db.removeChannel(chatMessagesListener);
  }

  chatMessagesListener = db.channel(`messages:${chatId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, async (payload) => {
      const msg = payload.new;
      
      // Mark as read in DB if sent by peer
      if (msg.sender_id !== currentUserProfile.id) {
        await db.from('messages').update({ is_read: true }).eq('id', msg.id);
      }

      const bubble = document.createElement('div');
      const isSent = msg.sender_id === currentUserProfile.id;
      bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
      bubble.textContent = msg.text;
      messagesPane.appendChild(bubble);
      messagesPane.scrollTop = messagesPane.scrollHeight;
    })
    .subscribe();
}

// 6.0 MY ROOM VIEW (STUDENT DEDICATED VIEW)
async function loadMyRoomView(pane) {
  // Query active or requested booking for current student
  const { data: bookings, error } = await db.from('bookings').select('*, rooms(*)').eq('student_id', currentUserProfile.id);
  if (error) {
    pane.innerHTML = `<p style="color: var(--primary);">Error querying room booking: ${error.message}</p>`;
    return;
  }

  const activeBooking = bookings ? bookings.find(b => b.status === 'Active' || b.status === 'Requested') : null;

  if (!activeBooking) {
    pane.innerHTML = `
      <div style="text-align: center; padding: 50px 20px;" class="glass-card">
        <i class="fa-solid fa-house-user fa-4x" style="color: var(--text-muted); margin-bottom: 20px;"></i>
        <h3 style="font-size: 22px;">No Active Room Booking Found</h3>
        <p style="color: var(--text-muted); max-width: 500px; margin: 10px auto 24px auto; font-size: 14px;">
          You haven't rented a co-living room yet. Explore listings, request flat bookings, and unlock your shared room dashboard, roommate chats, and bill splitter!
        </p>
        <button class="btn btn-primary" onclick="currentActiveTab='explore'; renderSidebar();" style="padding: 12px 28px; font-size: 15px;">
          <i class="fa-solid fa-magnifying-glass"></i> Explore Flat Listings
        </button>
      </div>
    `;
    return;
  }

  const room = activeBooking.rooms || {};
  const isRequested = activeBooking.status === 'Requested';

  // Fetch landlord/owner details
  const { data: ownerData } = await db.from('users').select('*').eq('id', activeBooking.owner_id).single();
  const landlordName = ownerData?.name || 'Property Landlord';
  const landlordPhone = ownerData?.phone || 'Contact via Chat';
  const landlordEmail = ownerData?.email || '';

  // Fetch roommates (other active bookings for the same room)
  const { data: roomBookings } = await db.from('bookings').select('student_id, users(*)').eq('room_id', activeBooking.room_id).in('status', ['Active', 'Confirmed']);
  const roommates = (roomBookings || []).map(b => b.users).filter(u => u && u.id !== currentUserProfile.id);

  // Fetch latest room bills
  const { data: bills } = await db.from('room_bills').select('*').eq('room_id', activeBooking.room_id).order('created_at', { ascending: false }).limit(1);
  const latestBill = bills && bills.length > 0 ? bills[0] : { electricity_bill: 1500, maid_bill: 2000, wifi_bill: 900, billing_month: 'Current Month' };

  // Fetch room expenses
  const { data: expenses } = await db.from('room_expenses').select('*, users(name)').eq('room_id', activeBooking.room_id).order('created_at', { ascending: false });

  // Fetch maintenance tickets for this room
  const { data: tickets } = await db.from('maintenance').select('*').eq('room_id', activeBooking.room_id).order('created_at', { ascending: false });

  const occupantCount = Math.max(1, (roomBookings || []).length);
  const rentSplit = Math.round((activeBooking.rent || room.rent || 0) / occupantCount);
  const elecSplit = Math.round(latestBill.electricity_bill / occupantCount);
  const maidSplit = Math.round(latestBill.maid_bill / occupantCount);
  const wifiSplit = Math.round(latestBill.wifi_bill / occupantCount);
  const totalShare = rentSplit + elecSplit + maidSplit + wifiSplit;

  pane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Section Title & Status -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <h2 style="font-size: 24px; font-weight: 800;">My Co-Living Room</h2>
          <p style="color: var(--text-muted); font-size: 14px; margin-top: 2px;">Your active residence, landlord contact, roommates, and utility manager.</p>
        </div>
        <span class="badge" style="background: ${isRequested ? 'rgba(255,152,0,0.1)' : 'rgba(46,125,50,0.1)'}; color: ${isRequested ? '#ff9800' : 'var(--green)'}; border-color: ${isRequested ? 'rgba(255,152,0,0.3)' : 'rgba(46,125,50,0.3)'}; font-size: 13px; padding: 6px 16px;">
          <i class="fa-solid ${isRequested ? 'fa-hourglass-half' : 'fa-house-circle-check'}"></i> ${isRequested ? 'Booking Request Pending' : 'Active Tenant'}
        </span>
      </div>

      <!-- 1. Room Header Overview Card -->
      <div class="glass-card" style="padding: 24px; background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,245,245,0.9));">
        <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center;">
          <img src="${room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'}" style="width: 130px; height: 110px; object-fit: cover; border-radius: 14px; flex-shrink: 0;" alt="Room">
          <div style="flex-grow: 1; min-width: 240px;">
            <h3 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">${room.title || 'Rented Flat'}</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;"><i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${room.detailed_address || ''}, ${room.city || ''}</p>
            
            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
              <div style="background: rgba(211,47,47,0.06); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(211,47,47,0.15);">
                <span style="font-size: 11px; color: var(--text-muted); display: block;">Monthly Rent</span>
                <strong style="font-size: 15px; color: var(--primary);">₹${(activeBooking.rent || room.rent || 0).toLocaleString('en-IN')}/mo</strong>
              </div>
              <div style="background: rgba(0,0,0,0.03); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08);">
                <span style="font-size: 11px; color: var(--text-muted); display: block;">Security Deposit</span>
                <strong style="font-size: 15px; color: var(--text-main);">₹${(room.deposit || 0).toLocaleString('en-IN')}</strong>
              </div>
              <div style="background: rgba(0,0,0,0.03); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08);">
                <span style="font-size: 11px; color: var(--text-muted); display: block;">Move-in Date</span>
                <strong style="font-size: 15px; color: var(--text-main);">${new Date(activeBooking.move_in_date).toLocaleDateString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Grid Layout: Landlord Contact & Roommates List -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
        <!-- Landlord Info Card -->
        <div class="glass-card" style="padding: 24px;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-user-tie" style="color: var(--primary);"></i> Property Owner / Landlord
          </h3>
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px;">
            <img src="${ownerData?.profile_pic || 'https://api.dicebear.com/7.x/adventurer/png?seed=Owner'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" alt="Landlord">
            <div>
              <h4 style="font-size: 15px; font-weight: 700; margin: 0;">${landlordName}</h4>
              <span style="font-size: 12px; color: var(--text-muted);"><i class="fa-solid fa-envelope"></i> ${landlordEmail}</span>
            </div>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;"><i class="fa-solid fa-phone"></i> Contact Phone: <strong>${landlordPhone}</strong></p>
          <button class="btn btn-primary" id="chat-landlord-btn" style="width: 100%; justify-content: center; padding: 10px;">
            <i class="fa-solid fa-comments"></i> Direct Message Owner
          </button>
        </div>

        <!-- Roommates Card -->
        <div class="glass-card" style="padding: 24px;">
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-users" style="color: var(--primary); margin-right: 8px;"></i> Roommates (${roommates.length})</span>
            <span style="font-size: 11px; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 12px; font-weight: 600;">Active Headcount: ${occupantCount}</span>
          </h3>

          ${roommates.length === 0 ? `
            <p style="font-size: 13px; color: var(--text-muted); padding: 15px 0;">No other active roommates currently sharing this flat.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${roommates.map(rm => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${rm.profile_pic || 'https://api.dicebear.com/7.x/adventurer/png?seed=' + rm.id}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;" alt="Roommate">
                    <div>
                      <strong style="font-size: 14px; display: block;">${rm.name}</strong>
                      <span style="font-size: 11px; color: var(--text-muted);">@${rm.username || 'student'} • Trust: ${rm.trust_score || 85}%</span>
                    </div>
                  </div>
                  <button class="btn btn-secondary chat-rm-btn" data-uid="${rm.id}" data-name="${rm.name}" style="padding: 6px 12px; font-size: 11px;">
                    <i class="fa-solid fa-comment"></i> Chat
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- 3. Bills & Shared Room Expense Division Card -->
      <div class="glass-card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 800;"><i class="fa-solid fa-calculator" style="color: var(--primary); margin-right: 8px;"></i>Utility Bills & Shared Expenses Splitter</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">Divided dynamically based on ${occupantCount} active roommate headcount.</p>
          </div>
          <button class="btn btn-primary" id="pay-myroom-share-btn" style="padding: 10px 20px; font-size: 13px;">
            <i class="fa-solid fa-credit-card"></i> Pay Total Share ₹${totalShare.toLocaleString('en-IN')}
          </button>
        </div>

        <!-- Expense Grid Shares -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px;">
          <div style="padding: 12px 16px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Rent Share</span>
            <strong style="font-size: 18px; color: var(--text-main);">₹${rentSplit.toLocaleString('en-IN')}</strong>
          </div>
          <div style="padding: 12px 16px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Electricity Share</span>
            <strong style="font-size: 18px; color: var(--text-main);">₹${elecSplit.toLocaleString('en-IN')}</strong>
          </div>
          <div style="padding: 12px 16px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <span style="font-size: 11px; color: var(--text-muted); display: block;">Maid Share</span>
            <strong style="font-size: 18px; color: var(--text-main);">₹${maidSplit.toLocaleString('en-IN')}</strong>
          </div>
          <div style="padding: 12px 16px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06);">
            <span style="font-size: 11px; color: var(--text-muted); display: block;">WiFi Share</span>
            <strong style="font-size: 18px; color: var(--text-main);">₹${wifiSplit.toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <hr class="card-divider" style="margin: 20px 0;">

        <!-- Log Shared Room Expense Form -->
        <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">Log Personal Room Expense (Groceries, Water Bottle, Cleaning)</h4>
        <form id="add-room-expense-form" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end;">
          <div class="input-group" style="flex: 2; min-width: 180px; margin: 0;">
            <label style="font-size: 12px;">Expense Description</label>
            <input type="text" id="expense-desc" placeholder="e.g. 20L Water Can" required style="padding: 8px 12px; font-size: 13px;">
          </div>
          <div class="input-group" style="flex: 1; min-width: 120px; margin: 0;">
            <label style="font-size: 12px;">Amount (₹)</label>
            <input type="number" id="expense-amount" placeholder="150" required min="1" style="padding: 8px 12px; font-size: 13px;">
          </div>
          <button type="submit" class="btn btn-primary" style="padding: 9px 18px; font-size: 13px;">
            <i class="fa-solid fa-plus"></i> Add Expense
          </button>
        </form>

        <!-- Room Expenses List -->
        <div style="margin-top: 20px;">
          <h5 style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">Recent Shared Room Log (${(expenses || []).length})</h5>
          ${(expenses || []).length === 0 ? `
            <p style="font-size: 12px; color: var(--text-muted);">No custom room expenses logged yet.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${expenses.slice(0, 5).map(ex => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(0,0,0,0.02); border-radius: 8px; font-size: 13px;">
                  <span><strong>${ex.description}</strong> (Paid by ${ex.users?.name || 'Roommate'})</span>
                  <span style="font-weight: 700; color: var(--primary);">₹${ex.amount}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- 4. Room Maintenance Tickets Section -->
      <div class="glass-card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <h3 style="font-size: 18px; font-weight: 800;"><i class="fa-solid fa-screwdriver-wrench" style="color: var(--primary); margin-right: 8px;"></i>Room Maintenance Tickets (24h SLA)</h3>
          <button class="btn btn-secondary" id="file-myroom-ticket-btn" style="padding: 8px 16px; font-size: 12px;">
            <i class="fa-solid fa-plus"></i> File New Ticket
          </button>
        </div>

        ${(tickets || []).length === 0 ? `
          <p style="font-size: 13px; color: var(--text-muted);">No maintenance tickets currently reported for this room.</p>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${tickets.map(tk => `
              <div style="padding: 12px 16px; background: #f9f9f9; border-radius: 10px; border: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <strong style="font-size: 14px; display: block;">${tk.issue}</strong>
                  <span style="font-size: 11px; color: var(--text-muted);">Filed: ${new Date(tk.created_at).toLocaleDateString('en-IN')} ${tk.resolution_notes ? '• Note: ' + tk.resolution_notes : ''}</span>
                </div>
                <span class="badge" style="font-size: 11px; background: ${tk.status === 'Resolved' ? 'rgba(46,125,50,0.1)' : 'rgba(255,152,0,0.1)'}; color: ${tk.status === 'Resolved' ? 'var(--green)' : '#ff9800'};">
                  ${tk.status}
                </span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Attach event handlers
  document.getElementById('chat-landlord-btn')?.addEventListener('click', () => {
    openChatWithUser(activeBooking.owner_id, landlordName);
  });

  document.querySelectorAll('.chat-rm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openChatWithUser(btn.dataset.uid, btn.dataset.name);
    });
  });

  document.getElementById('add-room-expense-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = document.getElementById('expense-desc').value.trim();
    const amount = parseInt(document.getElementById('expense-amount').value);
    if (!desc || !amount) return;

    const { error } = await db.from('room_expenses').insert({
      room_id: activeBooking.room_id,
      description: desc,
      amount: amount,
      paid_by: currentUserProfile.id
    });

    if (error) {
      alert("Failed to log expense: " + error.message);
    } else {
      alert("Expense logged successfully!");
      loadMyRoomView(pane);
    }
  });

  document.getElementById('file-myroom-ticket-btn')?.addEventListener('click', () => {
    const issue = prompt("Enter maintenance issue description (e.g. Bathroom Tap Leaking, AC not cooling):");
    if (!issue || !issue.trim()) return;

    db.from('maintenance').insert({
      room_id: activeBooking.room_id,
      owner_id: activeBooking.owner_id,
      student_id: currentUserProfile.id,
      issue: issue.trim(),
      status: 'Open',
      room_address: room.detailed_address || 'Rented Flat',
      photos: []
    }).then(({ error }) => {
      if (error) alert("Error filing ticket: " + error.message);
      else {
        alert("Maintenance ticket filed! Landlord notified under 24h SLA.");
        loadMyRoomView(pane);
      }
    });
  });

  document.getElementById('pay-myroom-share-btn')?.addEventListener('click', () => {
    simulateRazorpayPayment(totalShare, 'My Room Utility Share');
  });
}

// Helper: Navigate & Open Chat with specified User ID
async function openChatWithUser(peerId, peerName) {
  const participants = [currentUserProfile.id, peerId].sort();
  let { data: chat } = await db.from('chats').select('*').contains('participants', participants).maybeSingle();
  if (!chat) {
    const { data: newChat } = await db.from('chats').insert({
      participants,
      last_message: 'Chat initiated from My Room',
      last_message_at: new Date().toISOString()
    }).select().single();
    chat = newChat;
  }
  currentActiveTab = 'chat';
  renderSidebar();
}

// Helper: Simulate Razorpay Gateway Checkout
function simulateRazorpayPayment(amount, description) {
  const options = {
    key: 'rzp_test_placeholder',
    amount: amount * 100,
    currency: 'INR',
    name: 'CampusStay Co-Living',
    description: description || 'Rent & Utility Share',
    image: 'assets/app_hero_mockup.png',
    handler: function (response) {
      alert(`Payment Successful! Payment ID: ${response.razorpay_payment_id || 'pay_sim_' + Date.now()}`);
    },
    prefill: {
      name: currentUserProfile.name,
      email: currentUserProfile.email,
      contact: currentUserProfile.phone || '9876543210'
    },
    theme: { color: '#D32F2F' }
  };
  try {
    const rzp = new Razorpay(options);
    rzp.open();
  } catch (e) {
    alert(`Payment Gateway Simulation: Successfully processed ₹${amount.toLocaleString('en-IN')} for ${description}`);
  }
}

// Helper: Convert File object to Data URL string for reliable live preview & storage
async function uploadDocumentFile(file, prefix) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = function(e) {
      resolve(e.target.result);
    };
    reader.onerror = function() {
      resolve('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=500&q=80');
    };
    reader.readAsDataURL(file);
  });
}

// 6.6 STUDENT PROFILE & VERIFICATION VIEW
async function loadProfileView(pane) {
  const userPref = currentUserProfile.preferences || { budgetMin: 2000, budgetMax: 15000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' };
  const isVerified = currentUserProfile.verified === true;
  const docsList = currentUserProfile.verification_docs || [];
  const isSubmitted = !isVerified && docsList.length > 0;

  pane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div>
        <h2 style="font-size: 22px;">Student Profile &amp; Verification</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Update details and verify student credentials to boost trust score &amp; roommate match percentage.</p>
      </div>

      <!-- Verification Status Banner Card -->
      <div class="glass-card" style="padding: 24px; border-left: 5px solid ${isVerified ? 'var(--green)' : isSubmitted ? '#ff9800' : '#d32f2f'};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="badge" style="background: ${isVerified ? 'rgba(46,125,50,0.1)' : isSubmitted ? 'rgba(255,152,0,0.1)' : 'rgba(211,47,47,0.1)'}; color: ${isVerified ? 'var(--green)' : isSubmitted ? '#d97706' : '#d32f2f'}; border-color: ${isVerified ? 'rgba(46,125,50,0.3)' : isSubmitted ? 'rgba(255,152,0,0.3)' : 'rgba(211,47,47,0.3)'}; font-size: 13px; padding: 6px 14px;">
              <i class="fa-solid ${isVerified ? 'fa-circle-check' : isSubmitted ? 'fa-hourglass-half' : 'fa-triangle-exclamation'}"></i> ${isVerified ? '✓ Verified Student Profile' : isSubmitted ? '⏳ KYC Submitted - Awaiting Admin Approval' : '⚠️ Verification Required'}
            </span>
            <h3 style="font-size: 17px; margin-top: 10px;">Campus Trust Score: ${currentUserProfile.trust_score || 85}%</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              ${isVerified ? 'Your student ID and credentials have been verified by CampusStay admins.' : isSubmitted ? 'Your verification documents have been submitted to Admin. Please wait for approval.' : 'Upload your Aadhaar Card, Passport, or Student ID to get verified.'}
            </p>
          </div>
          <div style="font-size: 32px; color: ${isVerified ? 'var(--green)' : isSubmitted ? '#ff9800' : '#d32f2f'}; font-weight: 900;">
            ${currentUserProfile.trust_score || 85}%
          </div>
        </div>

        ${docsList.length > 0 ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06);">
            <span style="font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 8px;">Submitted Verification Documents (${docsList.length}):</span>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              ${docsList.map((doc, idx) => `
                <a href="${doc}" target="_blank" style="font-size: 12px; text-decoration: none; padding: 6px 12px; background: rgba(0,0,0,0.04); border-radius: 8px; color: var(--primary); font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-file-shield"></i> Document #${idx + 1}
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>


      <!-- Upload Student Verification Document Card -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;"><i class="fa-solid fa-id-card" style="color: var(--primary); margin-right: 8px;"></i>Submit Student Verification Documents</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Upload government ID or University student ID front and back photos for verification.</p>
        
        <form id="student-verification-form">
          <div class="input-group">
            <label>Select Document Type</label>
            <select id="student-doc-type" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-glass); background: #fff; font-size: 14px;">
              <option value="Aadhaar Card">Aadhaar Card</option>
              <option value="Student ID Card">Student ID Card</option>
              <option value="Passport">Passport</option>
            </select>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0;">
            <div class="input-group" style="margin: 0;">
              <label>Document Front Image</label>
              <input type="file" id="doc-front-file" accept="image/*" required style="font-size: 13px;">
            </div>
            <div class="input-group" style="margin: 0;">
              <label>Document Back Image</label>
              <input type="file" id="doc-back-file" accept="image/*" required style="font-size: 13px;">
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">
            <i class="fa-solid fa-cloud-arrow-up"></i> Upload &amp; Submit For Verification
          </button>
        </form>
      </div>

      <!-- Edit Profile & Living Preferences Card -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;"><i class="fa-solid fa-sliders" style="color: var(--primary); margin-right: 8px;"></i>Living Preferences &amp; Profile</h3>
        <form id="edit-profile-form">
          <div class="input-group">
            <label>Your Full Name</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-user input-icon"></i>
              <input type="text" id="profile-edit-name" value="${currentUserProfile.name}" required>
            </div>
          </div>

          <div class="input-group">
            <label>Contact Phone Number</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-phone input-icon"></i>
              <input type="tel" id="profile-edit-phone" value="${currentUserProfile.phone || ''}" required>
            </div>
          </div>

          <div class="input-group">
            <label>Monthly Budget Limit Range (₹)</label>
            <div class="range-sliders">
              <input type="range" id="profile-edit-budget" min="2000" max="15000" value="${userPref.budgetMax || 8000}" step="500">
              <div class="range-values">Max Budget Limit: <span id="profile-edit-budget-val">₹${(userPref.budgetMax || 8000).toLocaleString('en-IN')}</span>/mo</div>
            </div>
          </div>

          <div class="input-group">
            <label>Sleep Schedule Habit</label>
            <div class="segmented-control" id="profile-edit-sleep">
              <button type="button" class="segment-btn ${userPref.sleepHabit === 'flexible' ? 'active' : ''}" data-value="flexible">Flexible</button>
              <button type="button" class="segment-btn ${userPref.sleepHabit === 'early' ? 'active' : ''}" data-value="early">Early Bird</button>
              <button type="button" class="segment-btn ${userPref.sleepHabit === 'night' ? 'active' : ''}" data-value="night">Night Owl</button>
            </div>
          </div>

          <div class="input-group">
            <label>Cleanliness Priority</label>
            <div class="segmented-control" id="profile-edit-clean">
              <button type="button" class="segment-btn ${userPref.cleanliness === 'low' ? 'active' : ''}" data-value="low">Chill</button>
              <button type="button" class="segment-btn ${userPref.cleanliness === 'medium' ? 'active' : ''}" data-value="medium">Medium</button>
              <button type="button" class="segment-btn ${userPref.cleanliness === 'high' ? 'active' : ''}" data-value="high">Clean Freak</button>
            </div>
          </div>

          <div class="input-group">
            <label>Dietary Choice</label>
            <div class="segmented-control" id="profile-edit-diet">
              <button type="button" class="segment-btn ${userPref.dietary === 'any' ? 'active' : ''}" data-value="any">Any Diet</button>
              <button type="button" class="segment-btn ${userPref.dietary === 'veg' ? 'active' : ''}" data-value="veg">Veg Only</button>
              <button type="button" class="segment-btn ${userPref.dietary === 'nonveg' ? 'active' : ''}" data-value="nonveg">Non-Veg</button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 15px;">
            <i class="fa-solid fa-circle-check"></i> Save Living Preferences
          </button>
        </form>
      </div>
    </div>
  `;

  // Student verification form handler
  document.getElementById('student-verification-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const docType = document.getElementById('student-doc-type').value;
    const frontFile = document.getElementById('doc-front-file').files[0];
    const backFile = document.getElementById('doc-back-file').files[0];
    if (!frontFile || !backFile) return;

    const subBtn = e.target.querySelector('button[type="submit"]');
    subBtn.disabled = true;
    subBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading Documents...';

    try {
      const frontUrl = await uploadDocumentFile(frontFile, `student_${docType.replace(/\s+/g, '_')}_front`);
      const backUrl = await uploadDocumentFile(backFile, `student_${docType.replace(/\s+/g, '_')}_back`);

      const updatedDocs = [...(currentUserProfile.verification_docs || []), frontUrl, backUrl];
      const { error } = await db.from('users').update({
        verification_docs: updatedDocs
      }).eq('id', currentUserProfile.id);

      if (error) throw error;
      currentUserProfile.verification_docs = updatedDocs;
      alert("Verification documents uploaded successfully! Admin review pending.");
      loadProfileView(pane);
    } catch (err) {
      alert("Upload failed: " + err.message);
      subBtn.disabled = false;
      subBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload & Submit For Verification';
    }
  });

  // Sync budget slider label text
  const budgetSl = document.getElementById('profile-edit-budget');
  const budgetLb = document.getElementById('profile-edit-budget-val');
  budgetSl?.addEventListener('input', () => {
    budgetLb.textContent = `₹${parseInt(budgetSl.value).toLocaleString('en-IN')}`;
  });

  // Handle segmented controllers
  document.querySelectorAll('#edit-profile-form .segmented-control button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Save profile preferences
  document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-edit-name')?.value || '';
    const phone = document.getElementById('profile-edit-phone')?.value || '';
    const budgetMax = parseInt(budgetSl.value);
    
    const sleepHabit = document.querySelector('#profile-edit-sleep button.active')?.dataset?.value || 'flexible';
    const cleanliness = document.querySelector('#profile-edit-clean button.active')?.dataset?.value || 'medium';
    const dietary = document.querySelector('#profile-edit-diet button.active')?.dataset?.value || 'any';

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const { error } = await db.from('users').update({
      name, phone,
      preferences: { budgetMin: 2000, budgetMax, sleepHabit, cleanliness, dietary, socialStatus: 'medium' }
    }).eq('id', currentUserProfile.id);

    if (error) {
      alert(`Error updating profile: ${error.message}`);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Save Living Preferences';
    } else {
      currentUserProfile.name = name;
      currentUserProfile.phone = phone;
      currentUserProfile.preferences = { budgetMin: 2000, budgetMax, sleepHabit, cleanliness, dietary, socialStatus: 'medium' };
      syncUIForLoggedInUser();
      alert("Preferences updated successfully!");
      loadProfileView(pane);
    }
  });
}

// 7.0 OWNER VERIFICATION VIEW
async function loadOwnerVerificationView(pane) {
  const isVerified = currentUserProfile.verified === true;
  const docsList = currentUserProfile.verification_docs || [];

  pane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div>
        <h2 style="font-size: 22px;">Property Owner Verification</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Submit property deeds, electricity bills, or government ID to get the Verified Owner badge on flat listings.</p>
      </div>

      <!-- Owner Verification Status Banner -->
      <div class="glass-card" style="padding: 24px; border-left: 5px solid ${isVerified ? 'var(--green)' : '#ff9800'};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="badge" style="background: ${isVerified ? 'rgba(46,125,50,0.1)' : 'rgba(255,152,0,0.1)'}; color: ${isVerified ? 'var(--green)' : '#ff9800'}; border-color: ${isVerified ? 'rgba(46,125,50,0.3)' : 'rgba(255,152,0,0.3)'}; font-size: 13px; padding: 6px 14px;">
              <i class="fa-solid ${isVerified ? 'fa-building-circle-check' : 'fa-hourglass-half'}"></i> ${isVerified ? 'Verified Property Owner' : 'Owner Verification Pending'}
            </span>
            <h3 style="font-size: 17px; margin-top: 10px;">Trust Score: ${currentUserProfile.trust_score || 85}%</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              ${isVerified ? 'Your landlord verification status is active. All your room listings bear the verified badge.' : 'Upload property ownership documents or Aadhaar for fast admin verification.'}
            </p>
          </div>
          <div style="font-size: 32px; color: ${isVerified ? 'var(--green)' : '#ff9800'}; font-weight: 900;">
            ${currentUserProfile.trust_score || 85}%
          </div>
        </div>

        ${docsList.length > 0 ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06);">
            <span style="font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 8px;">Uploaded Landlord Documents (${docsList.length}):</span>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              ${docsList.map((doc, idx) => `
                <a href="${doc}" target="_blank" style="font-size: 12px; text-decoration: none; padding: 6px 12px; background: rgba(0,0,0,0.04); border-radius: 8px; color: var(--primary); font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-file-contract"></i> Document #${idx + 1}
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Upload Owner Document Card -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;"><i class="fa-solid fa-file-signature" style="color: var(--primary); margin-right: 8px;"></i>Upload Ownership Verification Documents</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">Provide clear photos of property deed, electricity bill, or government ID.</p>

        <form id="owner-verification-form">
          <div class="input-group">
            <label>Select Document Type</label>
            <select id="owner-doc-type" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-glass); background: #fff; font-size: 14px;">
              <option value="Property Deed">Property Deed / Title Agreement</option>
              <option value="Aadhaar Card">Owner Aadhaar Card</option>
              <option value="Electricity Bill">Recent Electricity Bill</option>
            </select>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0;">
            <div class="input-group" style="margin: 0;">
              <label>Document Front / Page 1</label>
              <input type="file" id="owner-front-file" accept="image/*" required style="font-size: 13px;">
            </div>
            <div class="input-group" style="margin: 0;">
              <label>Document Back / Page 2</label>
              <input type="file" id="owner-back-file" accept="image/*" required style="font-size: 13px;">
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">
            <i class="fa-solid fa-cloud-arrow-up"></i> Submit Ownership Documents
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('owner-verification-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const docType = document.getElementById('owner-doc-type').value;
    const frontFile = document.getElementById('owner-front-file').files[0];
    const backFile = document.getElementById('owner-back-file').files[0];
    if (!frontFile || !backFile) return;

    const subBtn = e.target.querySelector('button[type="submit"]');
    subBtn.disabled = true;
    subBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Documents...';

    try {
      const frontUrl = await uploadDocumentFile(frontFile, `owner_${docType.replace(/\s+/g, '_')}_front`);
      const backUrl = await uploadDocumentFile(backFile, `owner_${docType.replace(/\s+/g, '_')}_back`);

      const updatedDocs = [...(currentUserProfile.verification_docs || []), frontUrl, backUrl];
      const { error } = await db.from('users').update({
        verification_docs: updatedDocs
      }).eq('id', currentUserProfile.id);

      if (error) throw error;
      currentUserProfile.verification_docs = updatedDocs;
      alert("Property ownership documents submitted successfully! Admin verification pending.");
      loadOwnerVerificationView(pane);
    } catch (err) {
      alert("Upload failed: " + err.message);
      subBtn.disabled = false;
      subBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Submit Ownership Documents';
    }
  });
}

// Helper: Upload file to Supabase Storage or convert to Base64
async function uploadDocumentFile(file, prefix) {
  try {
    const fileName = `verifications/${currentUserProfile.id}_${prefix}_${Date.now()}_${file.name}`;
    const { error } = await db.storage.from('room-images').upload(fileName, file, { upsert: true });
    if (!error) {
      const { data } = db.storage.from('room-images').getPublicUrl(fileName);
      if (data && data.publicUrl) return data.publicUrl;
    }
  } catch (e) {
    console.warn("Supabase Storage upload fallback to base64 data URL: ", e);
  }

  // Base64 fallback if storage bucket or network policy blocks binary direct stream
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}



// ============================================================================
// 7. OWNER DASHBOARD VIEW IMPLEMENTATIONS
// ============================================================================

// 7.1 MY LISTINGS (OWNER)
async function loadOwnerListings(pane) {
  const { data: rooms, error } = await db.from('rooms').select('*').eq('owner_id', currentUserProfile.id);
  if (error || !rooms) {
    pane.innerHTML = `<p style="color: var(--primary);">Error querying listings: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  // Fetch existing deletion requests for this owner
  const { data: existingRequests } = await db.from('deletion_requests').select('room_id, status').eq('owner_id', currentUserProfile.id);
  const requestMap = {};
  (existingRequests || []).forEach(r => { requestMap[r.room_id] = r.status; });

  pane.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <div>
        <h2 style="font-size:22px;">Properties Listed For Students</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Manage flats, capacity, map coordinates & monthly rents. Request deletion for admin review.</p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        ${rooms.length === 0 ? `
          <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-glass); border-radius: 12px;">
            <p style="color: var(--text-muted);">No flats listed yet. Use the "List New Flat" button to add your property.</p>
          </div>
        ` : rooms.map(room => {
          const reqStatus = requestMap[room.id];
          const deleteBtnHtml = reqStatus === 'pending'
            ? `<span style="font-size:11px; background: rgba(255,152,0,0.1); color: #ff9800; border: 1px solid rgba(255,152,0,0.3); padding: 5px 12px; border-radius: 20px;"><i class="fa-solid fa-clock"></i> Deletion Pending Review</span>`
            : reqStatus === 'approved'
            ? `<span style="font-size:11px; background: rgba(46,125,50,0.1); color: var(--green); border: 1px solid rgba(46,125,50,0.3); padding: 5px 12px; border-radius: 20px;"><i class="fa-solid fa-check"></i> Deletion Approved</span>`
            : reqStatus === 'rejected'
            ? `<span style="font-size:11px; background: rgba(211,47,47,0.08); color: var(--primary); border: 1px solid rgba(211,47,47,0.2); padding: 5px 12px; border-radius: 20px;"><i class="fa-solid fa-ban"></i> Deletion Rejected</span>`
            : `<button class="btn request-del-btn" data-room-id="${room.id}" data-room-title="${room.title}" data-room-addr="${room.detailed_address}" style="padding:6px 14px; font-size:12px; background: rgba(211,47,47,0.08); color: var(--primary); border: 1px solid rgba(211,47,47,0.25); border-radius: 20px;"><i class="fa-solid fa-trash-can"></i> Request Deletion</button>`;
          return `
            <div class="ticket-row-card" style="display: flex; gap: 20px; align-items: center;">
              <img src="${room.images[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'}" style="width:90px; height:90px; object-fit:cover; border-radius:10px; flex-shrink:0;" alt="Room">
              <div style="flex-grow: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                  <h3 style="font-size: 16px; margin:0;">${room.title}</h3>
                  <span style="font-size: 16px; color: var(--primary); font-weight: 700;">₹${room.rent.toLocaleString('en-IN')}/mo</span>
                </div>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;"><i class="fa-solid fa-map-pin"></i> ${room.detailed_address}, ${room.city}</p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; align-items: center;">
                  <span class="tag" style="font-size: 10px;">Max: ${room.capacity || 4} Tenants</span>
                  <span class="tag" style="font-size: 10px; color: ${room.verified ? 'var(--green)' : 'var(--text-muted)'};">${room.verified ? '✓ Verified' : '⏳ Pending Approval'}</span>
                  ${deleteBtnHtml}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Add New Flat Card -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size:16px; margin-bottom:6px;"><i class="fa-solid fa-plus" style="color:var(--primary); margin-right:8px;"></i>List New Flat / PG</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 20px;">Provide specifications to display flat in student feeds sorted by GPS distance.</p>
        <form id="add-room-form">
          <div class="input-group">
            <label>Property Name / Title</label>
            <div class="input-wrapper">
              <i class="fa-solid fa-hotel input-icon"></i>
              <input type="text" id="room-title" placeholder="Stanza Living Pearl" required>
            </div>
          </div>
          <div class="inputs-grid" style="margin-bottom: 20px;">
            <div class="input-group" style="margin: 0;">
              <label>City</label>
              <div class="input-wrapper"><i class="fa-solid fa-city input-icon"></i><input type="text" id="room-city" placeholder="Goa" required></div>
            </div>
            <div class="input-group" style="margin: 0;">
              <label>Monthly Rent (₹)</label>
              <div class="input-wrapper"><i class="fa-solid fa-indian-rupee-sign input-icon"></i><input type="number" id="room-rent" placeholder="12000" required></div>
            </div>
          </div>
          <div class="inputs-grid" style="margin-bottom: 20px;">
            <div class="input-group" style="margin: 0;">
              <label>Latitude</label>
              <div class="input-wrapper"><i class="fa-solid fa-location-dot input-icon"></i><input type="number" step="0.000001" id="room-lat" placeholder="15.391" required></div>
            </div>
            <div class="input-group" style="margin: 0;">
              <label>Longitude</label>
              <div class="input-wrapper"><i class="fa-solid fa-location-dot input-icon"></i><input type="number" step="0.000001" id="room-lng" placeholder="73.878" required></div>
            </div>
          </div>
          <div class="input-group">
            <label>Detailed Address</label>
            <div class="input-wrapper"><i class="fa-solid fa-map-pin input-icon"></i><input type="text" id="room-address" placeholder="Zuarinagar, Sancoale" required></div>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">
            <i class="fa-solid fa-plus"></i> Launch Listing
          </button>
        </form>
      </div>
    </div>
  `;

  // Request Deletion button handlers
  document.querySelectorAll('.request-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const roomId = btn.dataset.roomId;
      const roomTitle = btn.dataset.roomTitle;
      const roomAddr = btn.dataset.roomAddr;
      showDeletionRequestModal(roomId, roomTitle, roomAddr);
    });
  });

  document.getElementById('add-room-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('room-title')?.value || '';
    const city = document.getElementById('room-city')?.value || '';
    const rent = parseInt(document.getElementById('room-rent')?.value || '0');
    const latitude = parseFloat(document.getElementById('room-lat')?.value || '0');
    const longitude = parseFloat(document.getElementById('room-lng')?.value || '0');
    const detailed_address = document.getElementById('room-address')?.value || '';

    const listBtn = e.target.querySelector('button[type="submit"]');
    listBtn.disabled = true;
    listBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching...';

    const { error } = await db.from('rooms').insert({
      owner_id: currentUserProfile.id,
      title, city, rent, latitude, longitude, detailed_address,
      description: 'Charming flat close to university campus with laundry and WiFi services.',
      amenities: ['WiFi', 'AC', 'Electricity split', 'Maid'],
      images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'],
      available: true,
      verified: true
    });

    if (error) {
      alert(`Listing Error: ${error.message}`);
      listBtn.disabled = false;
      listBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Launch Listing';
    } else {
      alert("Flat listed successfully!");
      renderActiveView('listings');
    }
  });
}

// Show modal for owner to submit deletion request
function showDeletionRequestModal(roomId, roomTitle, roomAddr) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="glass-card" style="max-width: 440px; padding: 36px; border-radius: 20px; background: #fff;">
      <h3 style="font-size:18px; margin-bottom:8px;"><i class="fa-solid fa-trash-can" style="color:var(--primary); margin-right:8px;"></i>Request Room Deletion</h3>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">Your request will be reviewed by an admin before the room is permanently deleted.</p>
      <div style="background:#f8f8f8; border-radius:10px; padding:12px; margin-bottom:20px; font-size:13px;">
        <strong>${roomTitle}</strong><br>
        <span style="color:var(--text-muted); font-size:12px;"><i class="fa-solid fa-map-pin"></i> ${roomAddr}</span>
      </div>
      <div class="input-group" style="margin-bottom:20px;">
        <label>Reason for Deletion <span style="color:var(--primary);">*</span></label>
        <textarea id="deletion-reason" placeholder="e.g. Property sold, renovating, no longer renting..." style="width:100%; padding:12px 14px; border:1px solid rgba(0,0,0,0.12); border-radius:10px; font-size:13px; resize:vertical; min-height:90px; font-family:inherit; box-sizing:border-box;" required></textarea>
      </div>
      <div style="display:flex; gap:12px;">
        <button id="cancel-del-btn" class="btn btn-secondary" style="flex:1; justify-content:center;">Cancel</button>
        <button id="submit-del-btn" class="btn btn-primary" style="flex:1; justify-content:center; background:var(--primary);">
          <i class="fa-solid fa-paper-plane"></i> Submit Request
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('cancel-del-btn')?.addEventListener('click', () => overlay.remove());

  document.getElementById('submit-del-btn')?.addEventListener('click', async () => {
    const reason = (document.getElementById('deletion-reason')?.value || '').trim();
    if (!reason) {
      alert('Please provide a reason for the deletion request.');
      return;
    }
    const submitBtn = document.getElementById('submit-del-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    const { error } = await db.from('deletion_requests').insert({
      room_id: roomId,
      owner_id: currentUserProfile.id,
      room_title: roomTitle,
      room_address: roomAddr,
      reason,
      status: 'pending'
    });

    if (error) {
      alert(`Error submitting request: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Request';
    } else {
      overlay.remove();
      showToast('✅ Deletion request submitted. Admin will review shortly.', 'success');
      renderActiveView('listings');
    }
  });
}

// 7.2 BOOKING REQUEST APPROVALS (OWNER)
async function loadOwnerApprovals(pane) {
  // Query booking requests on landlord properties
  const { data: bookings, error } = await db.from('bookings').select('*, rooms(*)').eq('owner_id', currentUserProfile.id);
  if (error || !bookings) {
    pane.innerHTML = `<p style="color: var(--primary);">Error loading requests: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  pane.innerHTML = `
    <h2>Booking Requests & Occupancies</h2>
    <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Approve booking requests or track current student occupancies.</p>
    
    <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 700px;">
      ${bookings.length === 0 ? `
        <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-glass); border-radius: 12px;">
          <p style="color: var(--text-muted);">No booking requests received yet.</p>
        </div>
      ` : bookings.map(req => `
        <div class="ticket-row-card" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="font-size: 16px;">Flat: ${req.rooms?.title}</h3>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Student ID: ${req.student_id.substring(0, 8)}</p>
            <p style="font-size: 12px; color: var(--cyan); margin-top: 4px;">Requested Move-in: ${new Date(req.move_in_date).toLocaleDateString()}</p>
          </div>
          <div style="text-align: right;">
            <span class="tag" style="margin-bottom: 10px; display: inline-block; background: ${req.status === 'Active' ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 75, 92, 0.1)'}; color: ${req.status === 'Active' ? 'var(--green)' : 'var(--primary)'};">${req.status}</span>
            <div>
              ${req.status === 'Requested' ? `
                <button class="btn btn-primary approve-req-btn" data-bid="${req.id}" style="padding: 6px 12px; font-size: 12px; background: var(--green); color: #070e1b;">
                  Approve Move-In
                </button>
              ` : `<span style="font-size: 12px; color: var(--text-muted);">Booking approved</span>`}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.approve-req-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';

      const { error } = await db.from('bookings').update({ status: 'Active' }).eq('id', btn.dataset.bid);

      if (error) {
        alert(`Approval error: ${error.message}`);
        btn.disabled = false;
        btn.textContent = 'Approve Move-In';
      } else {
        alert("Booking request approved! Student occupancy is active.");
        renderActiveView('approvals');
      }
    });
  });
}

// 7.3 UTILITY SPLIT BILLS MANAGEMENT (OWNER)
async function loadOwnerBills(pane) {
  // Query owner rooms
  const { data: rooms } = await db.from('rooms').select('id, title').eq('owner_id', currentUserProfile.id);
  
  if (!rooms || rooms.length === 0) {
    pane.innerHTML = `<p style="color: var(--text-muted);">List flats to manage monthly utility split bills.</p>`;
    return;
  }

  pane.innerHTML = `
    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px;">
      <div>
        <h2>Utility Billing Split Setup</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Update utility bill entries. Headcounts inside flats divide bills automatically.</p>
        
        <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 16px;" id="owner-bills-status-pane">
          <!-- Populated dynamically -->
        </div>
      </div>

      <div>
        <div class="glass-card" style="padding: 24px;">
          <h3>Enter Flat Monthly Utility Bills</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px; margin-bottom: 20px;">Provide electricity, maid, and internet totals for splitting.</p>
          
          <form id="owner-bill-form">
            <div class="input-group">
              <label>Select Room Flat</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-hotel input-icon"></i>
                <select id="bill-room-select" style="padding-left: 44px; width: 100%; border: 1px solid var(--border-glass); background: rgba(0,0,0,0.3); color: white; border-radius: 12px; height: 48px;">
                  ${rooms.map(r => `<option value="${r.id}">${r.title}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="inputs-grid" style="margin-bottom: 20px;">
              <div class="input-group" style="margin: 0;">
                <label>Electricity Bill (₹)</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-bolt input-icon"></i>
                  <input type="number" id="bill-elec" value="1500" required>
                </div>
              </div>
              <div class="input-group" style="margin: 0;">
                <label>Maid Charges (₹)</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-broom input-icon"></i>
                  <input type="number" id="bill-maid" value="2000" required>
                </div>
              </div>
            </div>

            <div class="inputs-grid" style="margin-bottom: 20px;">
              <div class="input-group" style="margin: 0;">
                <label>WiFi Bill (₹)</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-wifi input-icon"></i>
                  <input type="number" id="bill-wifi" value="900" required>
                </div>
              </div>
              <div class="input-group" style="margin: 0;">
                <label>Billing Month</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-calendar input-icon"></i>
                  <input type="text" id="bill-month" value="June 2026" required>
                </div>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">
              <i class="fa-solid fa-file-invoice"></i> Save Bills & Split
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Load status of current bills
  const statusPane = document.getElementById('owner-bills-status-pane');
  for (const r of rooms) {
    const { data: bills } = await db.from('room_bills').select('*').eq('room_id', r.id).order('created_at', { ascending: false }).limit(1);
    const b = bills && bills.length > 0 ? bills[0] : null;

    const div = document.createElement('div');
    div.className = 'ticket-row-card';
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span style="font-weight: bold;">${r.title}</span>
        <span style="font-size: 12px; color: var(--green); font-weight: bold;">${b ? b.billing_month : 'No Bill Saved'}</span>
      </div>
      ${b ? `
        <div style="display: flex; gap: 20px; font-size: 13px; color: var(--text-muted); margin-top: 8px;">
          <span>Electricity: ₹${b.electricity_bill}</span>
          <span>Maid: ₹${b.maid_bill}</span>
          <span>WiFi: ₹${b.wifi_bill}</span>
        </div>
      ` : '<p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">No bill history logged. Enter details to initiate split.</p>'}
    `;
    statusPane.appendChild(div);
  }

  // Handle form submit
  document.getElementById('owner-bill-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = document.getElementById('bill-room-select')?.value || '';
    const electricity = parseInt(document.getElementById('bill-elec')?.value || '0');
    const maid = parseInt(document.getElementById('bill-maid')?.value || '0');
    const wifi = parseInt(document.getElementById('bill-wifi')?.value || '0');
    const month = document.getElementById('bill-month')?.value || '';

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    // Check if bills for this room and month already exist
    const { data: existing } = await db.from('room_bills').select('id').eq('room_id', roomId).eq('billing_month', month).maybeSingle();

    if (existing) {
      alert(`Bills for ${month} have already been added for this room. You can only add bills once per month.`);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-file-invoice"></i> Save Bills & Split';
      return;
    }

    const { error: saveErr } = await db.from('room_bills').insert({
      room_id: roomId,
      electricity_bill: electricity,
      maid_bill: maid,
      wifi_bill: wifi,
      billing_month: month
    });

    if (saveErr) {
      alert(`Save Error: ${saveErr.message}`);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-file-invoice"></i> Save Bills & Split';
    } else {
      alert("Utility bills saved. Splits updated for tenant feeds!");
      renderActiveView('bills');
    }
  });
}

// 7.4 SLA MAINTENANCE TICKETS MANAGEMENT (OWNER)
async function loadOwnerSLA(pane) {
  // Query tickets raised on landlord properties
  const { data: tickets, error } = await db.from('maintenance').select('*').eq('owner_id', currentUserProfile.id);
  if (error || !tickets) {
    pane.innerHTML = `<p style="color: var(--primary);">Error loading SLA tickets: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  pane.innerHTML = `
    <h2>SLA Maintenance Request Portal</h2>
    <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Respond to tenant complaints. Unresolved tickets breach SLA guidelines and reduce trust score.</p>
    
    <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 16px; max-width: 750px;">
      ${tickets.length === 0 ? `
        <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-glass); border-radius: 12px;">
          <p style="color: var(--text-muted);">No open maintenance tickets found.</p>
        </div>
      ` : tickets.map(ticket => `
        <div class="ticket-row-card" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <span class="bold-val" style="font-size: 15px;"># ${ticket.id.substring(0, 8)}</span>
              <span class="tag" style="background: ${ticket.status === 'Resolved' ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 75, 92, 0.1)'}; color: ${ticket.status === 'Resolved' ? 'var(--green)' : 'var(--primary)'};">${ticket.status}</span>
            </div>
            <p style="font-size: 14px; color: var(--text-main); margin-top: 6px;">Issue: ${ticket.issue}</p>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-location-dot"></i> Address: ${ticket.room_address}</p>
          </div>
          <div>
            ${ticket.status === 'Open' ? `
              <button class="btn btn-secondary ack-ticket-btn" data-tid="${ticket.id}" style="padding: 6px 12px; font-size: 11px;">
                Acknowledge
              </button>
            ` : ''}
            ${ticket.status !== 'Resolved' ? `
              <button class="btn btn-primary resolve-ticket-btn" data-tid="${ticket.id}" style="padding: 6px 12px; font-size: 11px; background: var(--green); color: #070e1b;">
                Mark Resolved
              </button>
            ` : `<span style="font-size: 12px; color: var(--text-muted);">Resolved on ${new Date(ticket.resolved_at).toLocaleDateString()}</span>`}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.ack-ticket-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await db.from('maintenance').update({ status: 'Acknowledged' }).eq('id', btn.dataset.tid);
      renderActiveView('sla');
    });
  });

  document.querySelectorAll('.resolve-ticket-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      await db.from('maintenance').update({ 
        status: 'Resolved',
        resolved_at: new Date().toISOString()
      }).eq('id', btn.dataset.tid);
      renderActiveView('sla');
    });
  });
}

// 7.5 TRUST SCORE EXPLANATION (OWNER)
function loadOwnerTrust(pane) {
  pane.innerHTML = `
    <h2>Trust Compliance Meter Details</h2>
    <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Track trust ratings. High trust metrics promote flat listing exposure to student searches.</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
      <div class="glass-card" style="padding: 30px; text-align: center;">
        <div class="score-radial-progress" style="width: 140px; height: 140px; margin-bottom: 20px;">
          <svg viewBox="0 0 100 100" style="transform: rotate(-90deg);">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8"></circle>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--cyan)" stroke-width="8" stroke-dasharray="251.2" stroke-dashoffset="${251.2 * (1 - (currentUserProfile.trust_score || 85) / 100)}" stroke-linecap="round"></circle>
          </svg>
          <div class="percentage-text" style="font-size: 32px; font-weight: bold; position: absolute; top:50%; left:50%; transform:translate(-50%,-50%);">${currentUserProfile.trust_score || 85}%</div>
        </div>
        <h3>Landlord Rating: Excellent</h3>
        <p style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">Your profile maintains a trust metric score. Good job!</p>
      </div>

      <div>
        <h3>Compliance Regulations</h3>
        <ul style="list-style: none; margin-top: 15px; display: flex; flex-direction: column; gap: 15px;">
          <li style="display: flex; gap: 12px; font-size: 13px; color: var(--text-muted);">
            <i class="fa-solid fa-circle-check" style="color: var(--green); margin-top: 3px;"></i>
            <div>
              <strong style="color: var(--text-main);">Flat Listing Verification (+5 trust score)</strong>
              <p>Uploading authentic address proofs and amenities verification details increases rating.</p>
            </div>
          </li>
          <li style="display: flex; gap: 12px; font-size: 13px; color: var(--text-muted);">
            <i class="fa-solid fa-circle-xmark" style="color: var(--primary); margin-top: 3px;"></i>
            <div>
              <strong style="color: var(--text-main);">SLA Maintenance Breach (-5 trust score)</strong>
              <p>Unresolved maintenance tickets exceeding the 24-hour deadline are flagged for SLA breach penalties.</p>
            </div>
          </li>
          <li style="display: flex; gap: 12px; font-size: 13px; color: var(--text-muted);">
            <i class="fa-solid fa-circle-exclamation" style="color: var(--purple); margin-top: 3px;"></i>
            <div>
              <strong style="color: var(--text-main);">Verified Invoices Settlement</strong>
              <p>Secure online split invoice settlements with tenants logs reliable rental logs.</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `;
}


// ============================================================================
// 8. OWNER DELETION REQUESTS VIEW
// ============================================================================
async function loadOwnerDeletionRequests(pane) {
  const { data: requests, error } = await db.from('deletion_requests')
    .select('*')
    .eq('owner_id', currentUserProfile.id)
    .order('created_at', { ascending: false });

  if (error) {
    pane.innerHTML = `<p style="color:var(--primary);">Error loading requests: ${error.message}</p>`;
    return;
  }

  pane.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div>
        <h2 style="font-size:22px;"><i class="fa-solid fa-trash-can" style="color:var(--primary); margin-right:10px;"></i>My Room Deletion Requests</h2>
        <p style="color:var(--text-muted); font-size:14px; margin-top:4px;">Track the status of your room deletion requests submitted for admin review.</p>
      </div>

      ${!requests || requests.length === 0 ? `
        <div style="text-align:center; padding:50px; border:1px dashed var(--border-glass); border-radius:14px;">
          <i class="fa-solid fa-inbox fa-3x" style="color:var(--text-muted); margin-bottom:16px;"></i>
          <p style="color:var(--text-muted);">No deletion requests submitted yet.</p>
          <p style="font-size:12px; color:var(--text-muted); margin-top:6px;">Go to <strong>My Listings</strong> tab and click "Request Deletion" on any room.</p>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:14px;">
          ${requests.map(req => {
            const statusColor = req.status === 'pending' ? '#ff9800' : req.status === 'approved' ? 'var(--green)' : 'var(--primary)';
            const statusIcon = req.status === 'pending' ? 'fa-clock' : req.status === 'approved' ? 'fa-circle-check' : 'fa-circle-xmark';
            return `
              <div class="ticket-row-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <h3 style="font-size:15px; margin:0;">${req.room_title}</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin-top:4px;"><i class="fa-solid fa-map-pin"></i> ${req.room_address}</p>
                  </div>
                  <span style="font-size:12px; color:${statusColor}; border:1px solid ${statusColor}33; padding:5px 14px; border-radius:20px; font-weight:600; white-space:nowrap;">
                    <i class="fa-solid ${statusIcon}"></i> ${req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </span>
                </div>
                <div style="background:#f9f9f9; border-radius:8px; padding:12px; font-size:13px; margin-bottom:10px;"><strong>Reason:</strong> ${req.reason}</div>
                ${req.admin_notes ? `<div style="background:rgba(211,47,47,0.05); border-radius:8px; padding:10px; font-size:12px; color:var(--primary); border:1px solid rgba(211,47,47,0.15);"><i class="fa-solid fa-comment-dots"></i> <strong>Admin Note:</strong> ${req.admin_notes}</div>` : ''}
                <p style="font-size:11px; color:var(--text-muted); margin-top:10px;">Submitted: ${new Date(req.created_at).toLocaleString('en-IN')}</p>
              </div>`;
          }).join('')}
        </div>
      `}
    </div>
  `;
}


// ============================================================================
// 9. ADMIN PANEL VIEW (REAL-TIME DELETION REQUEST QUEUE)
// ============================================================================
let _adminDeletionSubscription = null;

async function loadAdminPanel(pane) {
  if (_adminDeletionSubscription) {
    _adminDeletionSubscription.unsubscribe();
    _adminDeletionSubscription = null;
  }

  async function renderAdminQueue() {
    const { data: requests, error } = await db.from('deletion_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch users for KYC Verification approval queue
    const { data: allUsers } = await db.from('users').select('*');
    const kycUsers = (allUsers || []).filter(u => u.verification_docs && u.verification_docs.length > 0);
    const pendingKyc = kycUsers.filter(u => !u.verified);
    const approvedKyc = kycUsers.filter(u => u.verified === true);

    if (error) {
      pane.innerHTML = `<p style="color:var(--primary);">Error: ${error.message}</p>`;
      return;
    }

    // Fetch owner names
    const ownerIds = [...new Set((requests || []).map(r => r.owner_id))];
    const ownerMap = {};
    if (ownerIds.length > 0) {
      const { data: owners } = await db.from('users').select('id, name, email').in('id', ownerIds);
      (owners || []).forEach(o => { ownerMap[o.id] = o; });
    }

    const pending = (requests || []).filter(r => r.status === 'pending');
    const processed = (requests || []).filter(r => r.status !== 'pending');

    pane.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 style="font-size:22px;"><i class="fa-solid fa-shield-halved" style="color:var(--primary); margin-right:10px;"></i>Admin Portal</h2>
            <p style="color:var(--text-muted); font-size:14px; margin-top:4px;">Approve Student/Owner KYC document submissions &amp; process room deletion requests.</p>
          </div>
          <div style="display:flex; gap:10px;">
            <span style="background:rgba(255,152,0,0.1); color:#ff9800; border:1px solid rgba(255,152,0,0.3); padding:8px 16px; border-radius:20px; font-size:13px; font-weight:700;"><i class="fa-solid fa-id-card"></i> ${pendingKyc.length} Pending KYC</span>
            <span style="background:rgba(46,125,50,0.08); color:var(--green); border:1px solid rgba(46,125,50,0.2); padding:8px 16px; border-radius:20px; font-size:13px; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ${approvedKyc.length} Verified Users</span>
          </div>
        </div>

        <!-- Student & Owner KYC Verifications Section -->
        <div>
          <h3 style="font-size:16px; margin-bottom:14px;"><i class="fa-solid fa-user-shield" style="color:var(--primary); margin-right:8px;"></i>⏳ Pending Student &amp; Owner KYC Verifications</h3>
          ${pendingKyc.length === 0 ? `
            <div style="text-align:center; padding:30px; border:1px dashed var(--border-glass); border-radius:14px; background:#fff;">
              <i class="fa-solid fa-user-check fa-2x" style="color:var(--green); margin-bottom:10px;"></i>
              <p style="color:var(--text-muted); font-size:13px;">No pending KYC document submissions. All users are verified!</p>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:14px;">
              ${pendingKyc.map(u => `
                <div class="ticket-row-card" style="border-left:4px solid #ff9800; background:#fff; padding:20px; border-radius:14px; border:1px solid var(--border-glass);">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div>
                      <h4 style="font-size:16px; margin:0;">${u.name} <span class="badge" style="font-size:11px; padding:3px 8px; margin-left:6px; background:rgba(0,0,0,0.05);">${(u.role || 'student').toUpperCase()}</span></h4>
                      <p style="font-size:12px; color:var(--text-muted); margin-top:3px;"><i class="fa-solid fa-envelope"></i> ${u.email} | <i class="fa-solid fa-phone"></i> ${u.phone || 'N/A'}</p>
                    </div>
                    <span style="font-size:11px; color:#ff9800; background:rgba(255,152,0,0.1); border:1px solid rgba(255,152,0,0.3); padding:4px 12px; border-radius:20px; font-weight:600;">⏳ Verification Pending</span>
                  </div>
                  <div style="background:#fafafa; border-radius:10px; padding:12px; margin-bottom:14px; border:1px solid rgba(0,0,0,0.06);">
                    <strong style="font-size:12px; color:var(--text-muted); display:block; margin-bottom:8px;">Uploaded Document Attachments (${(u.verification_docs || []).length}):</strong>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                      ${(u.verification_docs || []).map((doc, idx) => `
                        <a href="${doc}" target="_blank" style="font-size:12px; text-decoration:none; padding:6px 12px; background:#fff; border:1px solid rgba(0,0,0,0.1); border-radius:8px; color:var(--primary); font-weight:600; display:inline-flex; align-items:center; gap:6px;">
                          <i class="fa-solid fa-file-shield"></i> View Document #${idx + 1}
                        </a>
                      `).join('')}
                    </div>
                  </div>
                  <div style="display:flex; gap:10px;">
                    <button class="btn kyc-approve-btn" data-user-id="${u.id}" style="flex:1; justify-content:center; background:rgba(46,125,50,0.1); color:var(--green); border:1px solid rgba(46,125,50,0.25); border-radius:10px; padding:10px; font-weight:700; font-size:13px;">
                      <i class="fa-solid fa-circle-check"></i> Approve KYC &amp; Issue Badge
                    </button>
                    <button class="btn kyc-reject-btn" data-user-id="${u.id}" style="flex:1; justify-content:center; background:rgba(211,47,47,0.08); color:var(--primary); border:1px solid rgba(211,47,47,0.2); border-radius:10px; padding:10px; font-weight:700; font-size:13px;">
                      <i class="fa-solid fa-circle-xmark"></i> Reject KYC
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div>
          <h3 style="font-size:16px; margin-bottom:14px;"><i class="fa-solid fa-trash-can" style="color:var(--primary); margin-right:8px;"></i>⏳ Pending Room Deletion Requests</h3>
          ${pending.length === 0 ? `
            <div style="text-align:center; padding:30px; border:1px dashed var(--border-glass); border-radius:14px; background:#fff;">
              <i class="fa-solid fa-circle-check fa-2x" style="color:var(--green); margin-bottom:10px;"></i>
              <p style="color:var(--text-muted); font-size:13px;">No pending deletion requests. All clear!</p>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:14px;">
              ${pending.map(req => {
                const owner = ownerMap[req.owner_id] || {};
                return `
                  <div class="ticket-row-card" style="border-left:4px solid #ff9800; background:#fff; padding:20px; border-radius:14px; border:1px solid var(--border-glass);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                      <div>
                        <h3 style="font-size:16px; margin:0;">${req.room_title}</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:4px;"><i class="fa-solid fa-map-pin"></i> ${req.room_address}</p>
                        <p style="font-size:12px; color:var(--text-muted); margin-top:2px;"><i class="fa-solid fa-user"></i> ${owner.name || 'Owner'} (${owner.email || ''})</p>
                      </div>
                      <span style="font-size:11px; color:#ff9800; background:rgba(255,152,0,0.1); border:1px solid rgba(255,152,0,0.3); padding:4px 12px; border-radius:20px; font-weight:600;">⏳ Pending</span>
                    </div>
                    <div style="background:#fafafa; border-radius:8px; padding:12px; font-size:13px; margin-bottom:14px; border:1px solid rgba(0,0,0,0.06);"><strong>Reason:</strong> ${req.reason}</div>
                    <p style="font-size:11px; color:var(--text-muted); margin-bottom:14px;"><i class="fa-solid fa-clock"></i> ${new Date(req.created_at).toLocaleString('en-IN')}</p>
                    <div class="input-group" style="margin-bottom:12px;">
                      <input type="text" id="note-${req.id}" placeholder="Admin note (optional, shown to owner)..." style="width:100%; padding:10px 14px; border:1px solid rgba(0,0,0,0.12); border-radius:10px; font-size:13px; box-sizing:border-box; font-family:inherit;">
                    </div>
                    <div style="display:flex; gap:10px;">
                      <button class="btn admin-approve-btn" data-req-id="${req.id}" data-room-id="${req.room_id}" style="flex:1; justify-content:center; background:rgba(46,125,50,0.1); color:var(--green); border:1px solid rgba(46,125,50,0.25); border-radius:10px; padding:12px; font-weight:700;">
                        <i class="fa-solid fa-circle-check"></i> Approve &amp; Delete Room
                      </button>
                      <button class="btn admin-reject-btn" data-req-id="${req.id}" style="flex:1; justify-content:center; background:rgba(211,47,47,0.08); color:var(--primary); border:1px solid rgba(211,47,47,0.2); border-radius:10px; padding:12px; font-weight:700;">
                        <i class="fa-solid fa-circle-xmark"></i> Reject Request
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        ${processed.length > 0 ? `
          <div>
            <h3 style="font-size:16px; margin-bottom:14px; color:var(--text-muted);">📋 Processed History</h3>
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${processed.map(req => {
                const isApproved = req.status === 'approved';
                const owner = ownerMap[req.owner_id] || {};
                return `<div style="padding:16px 20px; background:${isApproved ? 'rgba(46,125,50,0.04)' : 'rgba(211,47,47,0.03)'}; border:1px solid ${isApproved ? 'rgba(46,125,50,0.15)' : 'rgba(211,47,47,0.12)'}; border-radius:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                  <div>
                    <p style="font-size:14px; font-weight:600; margin:0;">${req.room_title}</p>
                    <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">${owner.name || ''} • ${new Date(req.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span style="font-size:12px; color:${isApproved ? 'var(--green)' : 'var(--primary)'}; font-weight:700;"><i class="fa-solid ${isApproved ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${isApproved ? 'Approved' : 'Rejected'}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // KYC Approve Event Listeners
    document.querySelectorAll('.kyc-approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';
        try {
          const targetUser = (allUsers || []).find(u => u.id === userId) || {};
          const updatedScore = Math.min(100, (targetUser.trust_score || 85) + 15);
          await db.from('users').update({ verified: true, trust_score: updatedScore }).eq('id', userId);
          showToast('🎉 KYC Approved & Verified Badge Issued!', 'success');
          renderAdminQueue();
        } catch (e) {
          alert('KYC approval error: ' + e.message);
        }
      });
    });

    // KYC Reject Event Listeners
    document.querySelectorAll('.kyc-reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.userId;
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';
        try {
          await db.from('users').update({ verification_docs: [], verified: false }).eq('id', userId);
          showToast('KYC rejected & cleared.', 'info');
          renderAdminQueue();
        } catch (e) {
          alert('KYC rejection error: ' + e.message);
        }
      });
    });

    // Approve Deletion
    document.querySelectorAll('.admin-approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.reqId;
        const roomId = btn.dataset.roomId;
        const note = document.getElementById(`note-${reqId}`)?.value.trim() || 'Deletion approved by admin.';
        if (!confirm('Approve deletion? The room will be PERMANENTLY removed from the database.')) return;
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        document.querySelector(`.admin-reject-btn[data-req-id="${reqId}"]`).disabled = true;
        await db.from('deletion_requests').update({ status: 'approved', admin_notes: note, processed_at: new Date().toISOString() }).eq('id', reqId);
        const { error } = await db.from('rooms').delete().eq('id', roomId);
        if (error) alert(`Room deletion failed: ${error.message}`);
        else showToast('✅ Room permanently deleted.', 'success');
        renderAdminQueue();
      });
    });

    // Reject Deletion
    document.querySelectorAll('.admin-reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const reqId = btn.dataset.reqId;
        const note = document.getElementById(`note-${reqId}`)?.value.trim() || 'Request rejected by admin.';
        btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';
        document.querySelector(`.admin-approve-btn[data-req-id="${reqId}"]`).disabled = true;
        await db.from('deletion_requests').update({ status: 'rejected', admin_notes: note, processed_at: new Date().toISOString() }).eq('id', reqId);
        showToast('Request rejected. Owner notified.', 'info');
        renderAdminQueue();
      });
    });
  }

  await renderAdminQueue();

  // Real-time subscription
  _adminDeletionSubscription = db
    .channel('admin-deletion-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deletion_requests' }, () => { renderAdminQueue(); })
    .subscribe();
}

// -----------------------------------------
// RAZORPAY WEB PAYMENT GATEWAY INTEGRATION
// -----------------------------------------
window.triggerRazorpayWebPayment = async function(bookingId, amount, studentId, roomTitle) {
  if (typeof Razorpay === 'undefined') {
    alert('Razorpay Payment Gateway SDK loading... Please retry in a moment.');
    return;
  }

  const options = {
    "key": "rzp_test_campusstay",
    "amount": amount * 100, // Amount in paise
    "currency": "INR",
    "name": "CampusStay Accommodation",
    "description": "Payment for " + (roomTitle || "Room Rent / Deposit"),
    "handler": async function (response) {
      const razorpayId = response.razorpay_payment_id || 'pay_' + Date.now();
      try {
        if (window.supabase) {
          await window.supabase.from('payments').insert({
            booking_id: bookingId,
            student_id: studentId,
            amount: amount,
            method: 'Razorpay Gateway',
            status: 'Successful',
            razorpay_id: razorpayId,
            receipt: 'Web Rent Payment - ' + (roomTitle || 'Room')
          });
          await window.supabase.from('bookings').update({ status: 'Active' }).eq('id', bookingId);
        }
        alert('🎉 Payment Successful! Transaction ID: ' + razorpayId);
      } catch (err) {
        console.error("Payment recording error:", err);
        alert('Payment completed! Transaction ID: ' + razorpayId);
      }
    },
    "prefill": {
      "name": "CampusStay Student User",
      "email": "student@campusstay.com"
    },
    "theme": {
      "color": "#D32F2F"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
};
