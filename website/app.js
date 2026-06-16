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
        
        document.getElementById('close-modal-btn').addEventListener('click', () => {
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
const SUPABASE_ANON_KEY = 'sb_publishable_u63gxFokU3EOzGIPFIIXCg_R0TTYaxt';

// Try real Supabase first; fall back to local simulator if unavailable
let db;
const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);

if (supabaseLib && SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    db = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
  const role = document.querySelector('#register-role-selector button.active').dataset.role;

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
  openAuthModal('login-tab');
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const role = document.querySelector('#login-role-selector button.active').dataset.role;

  const signInSubmitBtn = e.target.querySelector('button[type="submit"]');
  signInSubmitBtn.disabled = true;
  signInSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    alert(`Sign In Error: ${error.message}`);
    signInSubmitBtn.disabled = false;
    signInSubmitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    return;
  }

  // Fetch role and verify match
  const { data: profile, error: dbErr } = await db.from('users').select('*').eq('id', data.user.id).single();
  if (dbErr || !profile) {
    alert("Profile sync failure. Please contact administrator.");
    await db.auth.signOut();
    signInSubmitBtn.disabled = false;
    signInSubmitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    return;
  }

  if (profile.role !== role) {
    alert(`Account role mismatch. You requested ${role} portal, but you are registered as a ${profile.role}.`);
    await db.auth.signOut();
    signInSubmitBtn.disabled = false;
    signInSubmitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
    return;
  }

  currentUserProfile = profile;
  closeAuthModal();
  syncUIForLoggedInUser();
  signInSubmitBtn.disabled = false;
  signInSubmitBtn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
}

async function handleSignOut() {
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
    // Real Supabase OAuth redirect flow
    if (db.auth.signInWithOAuth) {
      const { data, error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.warn('Google OAuth error:', error.message);
        // Provider not enabled in Supabase → fall back to demo
        googleBtns.forEach(btn => { btn.disabled = false; btn.innerHTML = restoreGoogleBtnHTML(); });
        simulateGoogleLogin();
        return;
      }

      // Success: Supabase redirects the browser to Google.
      // Nothing more to do here — the page will navigate away.
      // (buttons stay disabled intentionally during redirect)
      return;
    }

    // Local simulator fallback
    googleBtns.forEach(btn => { btn.disabled = false; btn.innerHTML = restoreGoogleBtnHTML(); });
    simulateGoogleLogin();

  } catch (err) {
    console.warn('Google OAuth exception:', err);
    googleBtns.forEach(btn => { btn.disabled = false; btn.innerHTML = restoreGoogleBtnHTML(); });
    simulateGoogleLogin();
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

// Session checker on startup — handles email login, Google OAuth, and page reload sessions
db.auth.onAuthStateChange(async (event, session) => {
  // Handle: new sign-in, page reload with existing session, token refresh
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session && session.user) {
    const userId = session.user.id;
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
      currentUserProfile = profile;
      closeAuthModal();
      syncUIForLoggedInUser();
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
    { id: 'matcher', label: 'Roommate Matcher', icon: 'fa-people-arrows' },
    { id: 'bookings', label: 'Bookings & Split', icon: 'fa-calculator' },
    { id: 'student-bills', label: 'My Bills', icon: 'fa-file-invoice-dollar' },
    { id: 'tickets', label: 'Maintenance SLA', icon: 'fa-screwdriver-wrench' },
    { id: 'chat', label: 'Real-time Chat', icon: 'fa-comments' },
    { id: 'profile', label: 'My Profile', icon: 'fa-user-gear' }
  ] : [
    { id: 'listings', label: 'My Listings', icon: 'fa-house-medical' },
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
  else if (viewId === 'matcher') loadMatcherView(pane);
  else if (viewId === 'bookings') loadBookingsView(pane);
  else if (viewId === 'student-bills') loadStudentBillsView(pane);
  else if (viewId === 'tickets') loadTicketsView(pane);
  else if (viewId === 'chat') loadChatView(pane);
  else if (viewId === 'profile') loadProfileView(pane);
  
  // Owner Views
  else if (viewId === 'listings') loadOwnerListings(pane);
  else if (viewId === 'approvals') loadOwnerApprovals(pane);
  else if (viewId === 'bills') loadOwnerBills(pane);
  else if (viewId === 'sla') loadOwnerSLA(pane);
  else if (viewId === 'owner-chat') loadChatView(pane); // Uses same chat UI
  else if (viewId === 'trust') loadOwnerTrust(pane);
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

  document.getElementById('back-to-explore').addEventListener('click', () => loadExploreView(pane));

  // Render routing Leaflet map
  setTimeout(() => {
    try {
      const roomLat = room.latitude || 15.3900;
      const roomLng = room.longitude || 73.8800;
      
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
  document.getElementById('chat-landlord-btn').addEventListener('click', async () => {
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
    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px;">
      <div>
        <h2>Rent & Utilities Split Dashboard</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Dynamic room bills divided based on real headcount in flat.</p>
        
        <div class="glass-card" style="padding: 24px; margin-top: 20px;">
          <h3 style="font-size: 18px; margin-bottom: 15px;"><i class="fa-solid fa-hotel" style="color: var(--primary);"></i> Flat: ${activeBooking.rooms?.title}</h3>
          <p style="font-size: 13px; color: var(--text-muted);"><i class="fa-solid fa-map-pin"></i> ${activeBooking.rooms?.detailed_address}</p>
          
          <div style="display: flex; gap: 15px; margin-top: 20px;">
            <div style="flex: 1; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass);">
              <span style="font-size: 12px; color: var(--text-muted);">Current Active Tenant count</span>
              <div style="font-size: 24px; font-weight: 700; color: var(--cyan); margin-top: 4px;">${occupantCount} Members</div>
            </div>
            <div style="flex: 1; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 12px; border: 1px solid var(--border-glass);">
              <span style="font-size: 12px; color: var(--text-muted);">Billing cycle month</span>
              <div style="font-size: 24px; font-weight: 700; color: var(--green); margin-top: 4px;">${latestBill.billing_month}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="glass-card splitter-card" style="padding: 30px; border-color: var(--primary-glow);">
          <div class="splitter-header">
            <h3>Monthly share details</h3>
            <div class="roommate-counter-badge"><i class="fa-solid fa-receipt"></i> Split: 1/${occupantCount}</div>
          </div>
          
          <div class="splitter-breakdown">
            <div class="breakdown-row">
              <span>Rent Share</span>
              <span class="bold-val">₹${rentSplit.toLocaleString('en-IN')}</span>
            </div>
            <div class="breakdown-row">
              <span>Electricity Split</span>
              <span class="bold-val">₹${electricitySplit.toLocaleString('en-IN')}</span>
            </div>
            <div class="breakdown-row">
              <span>Maid Split</span>
              <span class="bold-val">₹${maidSplit.toLocaleString('en-IN')}</span>
            </div>
            <div class="breakdown-row">
              <span>WiFi Split</span>
              <span class="bold-val">₹${wifiSplit.toLocaleString('en-IN')}</span>
            </div>
            <hr class="card-divider">
            <div class="breakdown-total">
              <span>Your Total Share</span>
              <span class="total-val">₹${grandTotalShare.toLocaleString('en-IN')}</span>
            </div>
          </div>
          
          <button class="btn btn-primary pay-simulate-btn" id="pay-split-invoice-btn" style="width: 100%; justify-content: center;">
            <i class="fa-solid fa-credit-card"></i> Pay Share (₹${grandTotalShare.toLocaleString('en-IN')}) via Razorpay
          </button>
        </div>
      </div>
    </div>
  `;

  // Checkout Payment integration
  document.getElementById('pay-split-invoice-btn').addEventListener('click', async () => {
    const payBtn = document.getElementById('pay-split-invoice-btn');
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
        
        document.getElementById('success-ok-btn').addEventListener('click', () => {
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

    <div style="display: grid; grid-template-columns: 1.3fr 0.7fr; gap: 28px; margin-bottom: 28px;">
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

      <!-- Occupants Panel -->
      <div class="glass-card" style="padding: 24px;">
        <h3 style="font-size: 16px; margin-bottom: 16px;"><i class="fa-solid fa-users" style="color: var(--cyan);"></i> Room Members</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${confirmedOccupants.length === 0
            ? `<p style="color: var(--text-muted); font-size: 13px;">Only you in this room.</p>`
            : confirmedOccupants.map((b, i) => `
              <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 10px; border: 1px solid var(--border-glass);">
                <img src="https://api.dicebear.com/7.x/adventurer/png?seed=${b.student_id}" style="width: 36px; height: 36px; border-radius: 50%;" alt="Member">
                <div>
                  <div style="font-size: 13px; font-weight: 600;">${b.student_id === currentUserProfile.id ? 'You' : 'Member ' + (i + 1)}</div>
                  <div style="font-size: 11px; color: var(--green);">Active tenant</div>
                </div>
              </div>`).join('')
          }
        </div>

        <div style="margin-top: 20px; padding: 14px; background: rgba(46,125,50,0.06); border: 1px solid rgba(46,125,50,0.2); border-radius: 12px; text-align: center;">
          <div style="font-size: 11px; color: var(--text-muted);">Each person pays</div>
          <div style="font-size: 22px; font-weight: 900; color: var(--green);">₹${totalShare.toLocaleString('en-IN')}</div>
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
          document.getElementById('bill-success-ok').addEventListener('click', () => {
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
    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px;">
      <div>
        <h2>SLA Maintenance Request History</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Track maintenance issues. Landlords must respond inside 24 hours.</p>
        
        <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 16px;">
          ${tickets.length === 0 ? `
            <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-glass); border-radius: 12px;">
              <p style="color: var(--text-muted);">No maintenance tickets filed yet.</p>
            </div>
          ` : tickets.map(ticket => `
            <div class="ticket-row-card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="bold-val" style="font-size: 15px;"># ${ticket.id.substring(0, 8)}</span>
                <span class="tag" style="background: ${ticket.status === 'Resolved' ? 'rgba(0, 245, 160, 0.1)' : 'rgba(255, 75, 92, 0.1)'}; color: ${ticket.status === 'Resolved' ? 'var(--green)' : 'var(--primary)'}; border-color: ${ticket.status === 'Resolved' ? 'rgba(0,245,160,0.2)' : 'rgba(255,75,92,0.2)'};">${ticket.status}</span>
              </div>
              <p style="font-size: 14px; color: var(--text-main); font-weight: 500;">Issue: ${ticket.issue}</p>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-location-dot"></i> ${ticket.room_address}</p>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px; display: flex; gap: 15px;">
                <span>Filed: ${new Date(ticket.created_at).toLocaleDateString()}</span>
                ${ticket.resolved_at ? `<span>Resolved: ${new Date(ticket.resolved_at).toLocaleDateString()}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <div class="glass-card" style="padding: 24px;">
          <h3>Raise Maintenance Ticket</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px; margin-bottom: 20px;">Describe plumbing, electrical or utility complaints inside co-living flat.</p>
          
          ${!activeBooking ? `
            <div style="text-align: center; padding: 20px; background: rgba(255, 75, 92, 0.05); border-radius: 10px; border: 1px solid rgba(255,75,92,0.15);">
              <p style="font-size: 13px; color: var(--primary); font-weight: bold;">No active bookings found.</p>
              <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">You must have an approved flat booking before submitting maintenance requests.</p>
            </div>
          ` : `
            <form id="raise-ticket-form">
              <div class="input-group">
                <label>Issue Description</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-circle-exclamation input-icon"></i>
                  <input type="text" id="ticket-issue" placeholder="Leaking tap in bathroom" required>
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                <i class="fa-solid fa-paper-plane"></i> File SLA Ticket
              </button>
            </form>
          `}
        </div>
      </div>
    </div>
  `;

  if (activeBooking) {
    document.getElementById('raise-ticket-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const issue = document.getElementById('ticket-issue').value;
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

  // If no chats exist
  if (userChats.length === 0) {
    pane.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="fa-solid fa-comments fa-3x" style="color: var(--text-muted); margin-bottom: 20px;"></i>
        <h3>No Active Chats</h3>
        <p style="color: var(--text-muted); margin-top: 8px;">Start a chat with roommates or property owners from flat details page.</p>
      </div>
    `;
    return;
  }

  // Select first chat if activeChatRoomId is not set
  if (!activeChatRoomId && userChats.length > 0) {
    activeChatRoomId = userChats[0].id;
  }

  pane.innerHTML = `
    <div style="display: grid; grid-template-columns: 240px 1fr; height: 500px; background: rgba(0,0,0,0.15); border: 1px solid var(--border-glass); border-radius: 16px; overflow: hidden;">
      <!-- Sidebar Chats list -->
      <div class="chat-thread-list" id="chat-thread-container">
        <!-- Render chats threads -->
      </div>

      <!-- Live Messaging Box -->
      <div style="display: flex; flex-direction: column; height: 100%;">
        <div id="chat-header-pane" style="padding: 15px 20px; border-bottom: 1px solid var(--border-glass); font-weight: bold;">
          Chat Thread Details
        </div>
        <div class="chat-messages-container" id="chat-messages-scroll">
          <!-- Render messages dynamically -->
        </div>
        <form class="chat-input-row" id="chat-input-form">
          <input type="text" id="chat-msg-text" placeholder="Type message..." required autocomplete="off">
          <button type="submit" class="btn btn-primary" style="padding: 12px 20px; margin: 0;"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      </div>
    </div>
  `;

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

    const item = document.createElement('div');
    item.className = `chat-thread-item ${chat.id === activeChatRoomId ? 'active' : ''}`;
    item.innerHTML = `
      <div class="chat-thread-name">${peerName}</div>
      <div class="chat-thread-last">${chat.last_message || 'No messages yet'}</div>
    `;
    
    item.addEventListener('click', () => {
      activeChatRoomId = chat.id;
      document.querySelectorAll('.chat-thread-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      loadMessagesForChat(chat.id, peerName);
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
  document.getElementById('chat-header-pane').textContent = peerName;
  const messagesPane = document.getElementById('chat-messages-scroll');
  messagesPane.innerHTML = '';

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
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, payload => {
      const msg = payload.new;
      const bubble = document.createElement('div');
      const isSent = msg.sender_id === currentUserProfile.id;
      bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
      bubble.textContent = msg.text;
      messagesPane.appendChild(bubble);
      messagesPane.scrollTop = messagesPane.scrollHeight;
    })
    .subscribe();
}

// 6.6 STUDENT PROFILE SETUP VIEW
async function loadProfileView(pane) {
  const userPref = currentUserProfile.preferences || { budgetMin: 2000, budgetMax: 15000, sleepHabit: 'flexible', dietary: 'any', cleanliness: 'medium' };

  pane.innerHTML = `
    <h2>Edit Profile & Living Preferences</h2>
    <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Update details to refine compatible roommate calculations.</p>
    
    <form id="edit-profile-form" style="max-width: 550px; margin-top: 24px;">
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
          <button class="segment-btn ${userPref.sleepHabit === 'flexible' ? 'active' : ''}" data-value="flexible">Flexible</button>
          <button class="segment-btn ${userPref.sleepHabit === 'early' ? 'active' : ''}" data-value="early">Early Bird</button>
          <button class="segment-btn ${userPref.sleepHabit === 'night' ? 'active' : ''}" data-value="night">Night Owl</button>
        </div>
      </div>

      <div class="input-group">
        <label>Cleanliness Priority</label>
        <div class="segmented-control" id="profile-edit-clean">
          <button class="segment-btn ${userPref.cleanliness === 'low' ? 'active' : ''}" data-value="low">Chill</button>
          <button class="segment-btn ${userPref.cleanliness === 'medium' ? 'active' : ''}" data-value="medium">Medium</button>
          <button class="segment-btn ${userPref.cleanliness === 'high' ? 'active' : ''}" data-value="high">Clean Freak</button>
        </div>
      </div>

      <div class="input-group">
        <label>Dietary Choice</label>
        <div class="segmented-control" id="profile-edit-diet">
          <button class="segment-btn ${userPref.dietary === 'any' ? 'active' : ''}" data-value="any">Any Diet</button>
          <button class="segment-btn ${userPref.dietary === 'veg' ? 'active' : ''}" data-value="veg">Veg Only</button>
          <button class="segment-btn ${userPref.dietary === 'nonveg' ? 'active' : ''}" data-value="nonveg">Non-Veg</button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 15px;">
        <i class="fa-solid fa-circle-check"></i> Save Profile Details
      </button>
    </form>
  `;

  // Sync budget slider label text
  const budgetSl = document.getElementById('profile-edit-budget');
  const budgetLb = document.getElementById('profile-edit-budget-val');
  budgetSl.addEventListener('input', () => {
    budgetLb.textContent = `₹${parseInt(budgetSl.value).toLocaleString('en-IN')}`;
  });

  // Handle segmented controllers active class updates
  document.querySelectorAll('#edit-profile-form .segmented-control button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Handle profile update form submission
  document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-edit-name').value;
    const phone = document.getElementById('profile-edit-phone').value;
    const budgetMax = parseInt(budgetSl.value);
    
    const sleepHabit = document.querySelector('#profile-edit-sleep button.active').dataset.value;
    const cleanliness = document.querySelector('#profile-edit-clean button.active').dataset.value;
    const dietary = document.querySelector('#profile-edit-diet button.active').dataset.value;

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    const { error } = await db.from('users').update({
      name,
      phone,
      preferences: {
        budgetMin: 2000,
        budgetMax,
        sleepHabit,
        cleanliness,
        dietary,
        socialStatus: 'medium'
      }
    }).eq('id', currentUserProfile.id);

    if (error) {
      alert(`Error updating profile: ${error.message}`);
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Save Profile Details';
    } else {
      currentUserProfile.name = name;
      currentUserProfile.phone = phone;
      currentUserProfile.preferences = { budgetMin: 2000, budgetMax, sleepHabit, cleanliness, dietary, socialStatus: 'medium' };
      
      syncUIForLoggedInUser();
      alert("Profile and co-living preferences updated successfully!");
    }
  });
}


// ============================================================================
// 7. OWNER DASHBOARD VIEW IMPLEMENTATIONS
// ============================================================================

// 7.1 MY LISTINGS (OWNER)
async function loadOwnerListings(pane) {
  // Query flats listed by current owner
  const { data: rooms, error } = await db.from('rooms').select('*').eq('owner_id', currentUserProfile.id);
  if (error || !rooms) {
    pane.innerHTML = `<p style="color: var(--primary);">Error querying listings: ${error ? error.message : 'Unknown'}</p>`;
    return;
  }

  pane.innerHTML = `
    <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 40px;">
      <div>
        <h2>Properties Listed For Students</h2>
        <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Manage flats, capacity details, map coordinates & monthly rents.</p>
        
        <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 16px;">
          ${rooms.length === 0 ? `
            <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-glass); border-radius: 12px;">
              <p style="color: var(--text-muted);">No flats listed yet.</p>
            </div>
          ` : rooms.map(room => `
            <div class="ticket-row-card" style="display: flex; gap: 20px;">
              <img src="${room.images[0] || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=500&q=80'}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" alt="Room">
              <div style="flex-grow: 1;">
                <div style="display: flex; justify-content: space-between;">
                  <h3 style="font-size: 16px;">${room.title}</h3>
                  <span class="room-card-rent" style="font-size: 16px;">₹${room.rent.toLocaleString('en-IN')}/mo</span>
                </div>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="fa-solid fa-map-pin"></i> ${room.detailed_address}, ${room.city}</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <span class="tag" style="font-size: 10px;">Max Capacity: ${room.capacity || 4} Students</span>
                  <span class="tag" style="font-size: 10px; color: var(--green); border-color: rgba(0,245,160,0.2); background: rgba(0,245,160,0.03);">${room.verified ? 'Verified Flat' : 'Verification Pending'}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <div class="glass-card" style="padding: 24px;">
          <h3>List New Flat / PG</h3>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px; margin-bottom: 20px;">Provide specifications to display flat in student feeds sorted by GPS distance.</p>
          
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
                <label>City Location</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-city input-icon"></i>
                  <input type="text" id="room-city" placeholder="Goa" required>
                </div>
              </div>
              <div class="input-group" style="margin: 0;">
                <label>Monthly Rent (₹)</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-indian-rupee-sign input-icon"></i>
                  <input type="number" id="room-rent" placeholder="12000" required>
                </div>
              </div>
            </div>

            <div class="inputs-grid" style="margin-bottom: 20px;">
              <div class="input-group" style="margin: 0;">
                <label>Latitude Coordinates</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-location-dot input-icon"></i>
                  <input type="number" step="0.000001" id="room-lat" placeholder="15.391" required>
                </div>
              </div>
              <div class="input-group" style="margin: 0;">
                <label>Longitude Coordinates</label>
                <div class="input-wrapper">
                  <i class="fa-solid fa-location-dot input-icon"></i>
                  <input type="number" step="0.000001" id="room-lng" placeholder="73.878" required>
                </div>
              </div>
            </div>

            <div class="input-group">
              <label>Detailed Address</label>
              <div class="input-wrapper">
                <i class="fa-solid fa-map-pin input-icon"></i>
                <input type="text" id="room-address" placeholder="Zuarinagar, Sancoale" required>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;">
              <i class="fa-solid fa-plus"></i> Launch Listing
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('add-room-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('room-title').value;
    const city = document.getElementById('room-city').value;
    const rent = parseInt(document.getElementById('room-rent').value);
    const latitude = parseFloat(document.getElementById('room-lat').value);
    const longitude = parseFloat(document.getElementById('room-lng').value);
    const detailed_address = document.getElementById('room-address').value;

    const listBtn = e.target.querySelector('button[type="submit"]');
    listBtn.disabled = true;
    listBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Launching...';

    const { error } = await db.from('rooms').insert({
      owner_id: currentUserProfile.id,
      title,
      city,
      rent,
      latitude,
      longitude,
      detailed_address,
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
  document.getElementById('owner-bill-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = document.getElementById('bill-room-select').value;
    const electricity = parseInt(document.getElementById('bill-elec').value);
    const maid = parseInt(document.getElementById('bill-maid').value);
    const wifi = parseInt(document.getElementById('bill-wifi').value);
    const month = document.getElementById('bill-month').value;

    const saveBtn = e.target.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    // Insert or update room bill
    const { data: existing } = await db.from('room_bills').select('id').eq('room_id', roomId).eq('billing_month', month).maybeSingle();

    let saveErr = null;
    if (existing) {
      const { error } = await db.from('room_bills').update({
        electricity_bill: electricity,
        maid_bill: maid,
        wifi_bill: wifi
      }).eq('id', existing.id);
      saveErr = error;
    } else {
      const { error } = await db.from('room_bills').insert({
        room_id: roomId,
        electricity_bill: electricity,
        maid_bill: maid,
        wifi_bill: wifi,
        billing_month: month
      });
      saveErr = error;
    }

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

