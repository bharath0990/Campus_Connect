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
      navLinks.style.background = '#070e1b';
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
  simulatePayBtn.textContent = `Pay Share (₹${totalSplit.toLocaleString('en-IN')}) via Razorpay`;
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
