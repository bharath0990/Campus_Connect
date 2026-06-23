/**
 * CampusStay Web E2E Test Suite
 * Tests the complete user workflow:
 * 1. Signup (Student)
 * 2. Login
 * 3. Navigation & Dashboard Tabs
 * 4. Chat UI Layout verification
 *
 * Run with: npm run test-e2e
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const reportGenerator = require('./reportGenerator');

const PORT = process.env.PORT || 8080;
const BASE_URL = `http://localhost:${PORT}`;
const TEST_USER = {
  name: `Student Test ${Date.now()}`,
  email: `student_test_${Date.now()}@campusstay.com`,
  phone: '9999999999',
  password: 'password123'
};

const TEST_OWNER = {
  name: `Owner Test ${Date.now()}`,
  email: `owner_test_${Date.now()}@campusstay.com`,
  phone: '8888888888',
  password: 'password123'
};

const log = (message, level) => reportGenerator.log(message, level);
const addResult = (testName, passed, error) => reportGenerator.addResult(testName, passed, error);

let driver;

const safeClick = async (element) => {
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
  await driver.sleep(300);
  try {
    await element.click();
  } catch (e) {
    log(`Standard click failed, falling back to JS click: ${e.message}`, 'WARNING');
    await driver.executeScript("arguments[0].click();", element);
  }
};

describe('CampusStay Web E2E Workflow', function() {
  this.timeout(60000); // 1 minute timeout for entire suite

  before(async () => {
    reportGenerator.init();
    log('Initializing WebDriver...');
    try {
      const chrome = require('selenium-webdriver/chrome');
      const options = new chrome.Options();
      options.setPageLoadStrategy('eager');

      // Support headless run for environment flexibility
      if (process.env.HEADLESS === 'true' || process.env.CI === 'true') {
        options.addArguments('--headless');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-gpu');
      }
      options.addArguments('--window-size=1920,1080');

      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
      if (process.env.HEADLESS !== 'true' && process.env.CI !== 'true') {
        await driver.manage().window().maximize();
      }
      await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 30000 });
      log('WebDriver initialized successfully.');
    } catch (error) {
      log(`WebDriver init error: ${error.message}`, 'ERROR');
      throw error;
    }
  });

  after(async () => {
    if (driver) {
      try {
        log('Closing WebDriver...');
        await driver.quit();
      } catch (e) {
        log(`Driver quit error: ${e.message}`, 'ERROR');
      }
    }
    const report = await reportGenerator.generateAndPrint();
    log(`Tests completed: ${report.passed} passed, ${report.failed} failed`);
  });

  // ============================================================
  // TEST 1: SIGNUP
  // ============================================================
  describe('1. Signup Workflow', function() {
    it('should navigate to homepage, open signup modal, and create new student account', async function() {
      try {
        log('Navigating to homepage...');
        await driver.get(BASE_URL);

        // Click Sign In nav button to open modal
        log('Clicking Sign In nav button...');
        const signInNav = await driver.findElement(By.id('login-nav-btn'));
        await safeClick(signInNav);

        // Wait for modal to be visible
        await driver.wait(until.elementLocated(By.css('.auth-tabs')), 5000);
        log('Auth modal opened');

        // Switch to Sign Up tab
        log('Switching to Sign Up tab...');
        const signUpTab = await driver.findElement(By.css('.auth-tab-btn[data-tab="register-tab"]'));
        await safeClick(signUpTab);

        // Fill out registration details
        log('Filling registration details...');
        const nameInput = await driver.findElement(By.id('register-name'));
        await nameInput.clear();
        await nameInput.sendKeys(TEST_USER.name);
        
        const emailInput = await driver.findElement(By.id('register-email'));
        await emailInput.clear();
        await emailInput.sendKeys(TEST_USER.email);

        const phoneInput = await driver.findElement(By.id('register-phone'));
        await phoneInput.clear();
        await phoneInput.sendKeys(TEST_USER.phone);

        const passInput = await driver.findElement(By.id('register-password'));
        await passInput.clear();
        await passInput.sendKeys(TEST_USER.password);

        // Click Register Submit Button
        log('Submitting signup form...');
        const submitBtn = await driver.findElement(By.css('form#register-form button[type="submit"]'));
        await safeClick(submitBtn);

        // Wait for alert and accept it
        log('Waiting for signup success alert...');
        try {
          await driver.wait(until.alertIsPresent(), 10000);
          const alert = await driver.switchTo().alert();
          const alertText = await alert.getText();
          log(`Alert message: ${alertText}`);
          await alert.accept();
          log('Alert accepted.');
        } catch (alertError) {
          log(`No alert appeared or error accepting alert: ${alertError.message}`, 'WARNING');
        }

        // Wait for login form to be visible (modal tab automatically switched by app.js)
        log('Waiting for login form to appear...');
        await driver.wait(until.elementLocated(By.id('login-form')), 5000);

        // Fill in login details using the registered user credentials
        log('Filling login form after signup...');
        const signupEmailInput = await driver.findElement(By.id('login-email'));
        await signupEmailInput.clear();
        await signupEmailInput.sendKeys(TEST_USER.email);
        const signupPassInput = await driver.findElement(By.id('login-password'));
        await signupPassInput.clear();
        await signupPassInput.sendKeys(TEST_USER.password);

        log('Submitting login form...');
        const loginBtn = await driver.findElement(By.css('form#login-form button[type="submit"]'));
        await safeClick(loginBtn);

        // Now wait for redirection to Dashboard
        log('Waiting for Dashboard nav button...');
        const dashboardBtn = await driver.wait(until.elementLocated(By.id('nav-dashboard-btn')), 15000);
        const modal = await driver.findElement(By.id('auth-modal'));
        await driver.wait(until.elementIsNotVisible(modal), 10000);
        const text = await dashboardBtn.getText();
        if (text.includes('Dashboard')) {
          log('Signup & login successful. Dashboard navigation button is now visible.');
          addResult('Signup - Create new student account', true);
        } else {
          throw new Error('Dashboard nav button text mismatch');
        }
      } catch (error) {
        addResult('Signup - Create new student account', false, error.message);
        throw error;
      }
    });
  });

  // ============================================================
  // TEST 2: LOGIN
  // ============================================================
  describe('2. Login Workflow', function() {
    it('should log out and log back in successfully', async function() {
      try {
        log('Logging out from the current session...');
        const signOutBtn = await driver.findElement(By.id('logout-nav-btn'));
        await safeClick(signOutBtn);
        await driver.sleep(1500);

        log('Clicking Sign In nav button...');
        const signInNav = await driver.findElement(By.id('login-nav-btn'));
        await safeClick(signInNav);

        // Wait for login form
        await driver.wait(until.elementLocated(By.id('login-form')), 5000);
        
        log('Filling login form...');
        const loginEmailInput = await driver.findElement(By.id('login-email'));
        await loginEmailInput.clear();
        await loginEmailInput.sendKeys(TEST_USER.email);
        const loginPassInput = await driver.findElement(By.id('login-password'));
        await loginPassInput.clear();
        await loginPassInput.sendKeys(TEST_USER.password);

        log('Submitting login form...');
        const submitBtn = await driver.findElement(By.css('form#login-form button[type="submit"]'));
        await safeClick(submitBtn);

        await driver.sleep(2000);

        const dashboardBtn = await driver.wait(until.elementLocated(By.id('nav-dashboard-btn')), 15000);
        const modal = await driver.findElement(By.id('auth-modal'));
        await driver.wait(until.elementIsNotVisible(modal), 10000);
        if (await dashboardBtn.isDisplayed()) {
          log('Login successful. Redirected to active session.');
          addResult('Login - Sign in with credentials', true);
        } else {
          throw new Error('Failed to login and find Dashboard button');
        }
      } catch (error) {
        addResult('Login - Sign in with credentials', false, error.message);
        throw error;
      }
    });
  });

  // ============================================================
  // TEST 3: DASHBOARD TABS NAVIGATION
  // ============================================================
  describe('3. Dashboard Tabs Navigation', function() {
    it('should open dashboard and click through navigation links', async function() {
      try {
        log('Opening dashboard...');
        const dashboardBtn = await driver.findElement(By.id('nav-dashboard-btn'));
        await safeClick(dashboardBtn);

        // Wait for sidebar container to load
        await driver.wait(until.elementLocated(By.id('sidebar-nav-container')), 5000);
        log('Dashboard sidebar loaded');

        // Click on Roommate Matcher tab
        log('Navigating to Roommate Matcher tab...');
        const matcherBtn = await driver.findElement(By.css('.sidebar-link-btn[id*="matcher"], .sidebar-link-btn:nth-child(2)'));
        await safeClick(matcherBtn);
        await driver.sleep(1500);

        // Click on Bookings & Split tab
        log('Navigating to Bookings & Split tab...');
        const bookingsBtn = await driver.findElement(By.css('.sidebar-link-btn[id*="bookings"], .sidebar-link-btn:nth-child(3)'));
        await safeClick(bookingsBtn);
        await driver.sleep(1500);

        addResult('Dashboard - Click through tabs', true);
      } catch (error) {
        addResult('Dashboard - Click through tabs', false, error.message);
        throw error;
      }
    });
  });

  // ============================================================
  // TEST 4: CHAT UI VERIFICATION
  // ============================================================
  describe('4. Real-time Chat UI Layout Verification', function() {
    it('should load Real-time Chat and check width bounds to verify no layout clipping', async function() {
      try {
        log('Navigating to Real-time Chat tab...');
        
        const sidebarLinks = await driver.findElements(By.css('.sidebar-link-btn'));
        let chatLink = null;
        for (const link of sidebarLinks) {
          const text = await link.getText();
          if (text.toLowerCase().includes('chat') || text.toLowerCase().includes('message')) {
            chatLink = link;
            break;
          }
        }

        if (!chatLink) {
          throw new Error('Real-time Chat sidebar link not found');
        }

        await safeClick(chatLink);
        await driver.sleep(2000);

        // Wait for chat window container
        const chatWindow = await driver.wait(until.elementLocated(By.css('.chat-window')), 5000);
        log('Chat window loaded');

        // Check dimensions of chat window and verify it is not squished (width > 500px)
        const rect = await chatWindow.getRect();
        log(`Chat window width: ${rect.width}px, height: ${rect.height}px`);

        if (rect.width < 500) {
          throw new Error(`Chat window width is restricted/squished: ${rect.width}px. Expected > 500px.`);
        }

        // Verify that chat message container and input field are displayed and not overflowed
        const inputField = await driver.findElement(By.id('chat-msg-text'));
        if (await inputField.isDisplayed()) {
          log('Message input field is displayed correctly inside the layout.');
          addResult('Chat UI - Verify layout width and input field visibility', true);
        } else {
          throw new Error('Chat input field is hidden or clipped out of view');
        }
      } catch (error) {
        addResult('Chat UI - Verify layout width and input field visibility', false, error.message);
        throw error;
      }
    });
  });

  // ============================================================
  // TEST 5: OWNER SIGNUP & LOGIN
  // ============================================================
  describe('5. Owner Signup & Login Workflow', function() {
    it('should log out student, register new owner account, and login successfully', async function() {
      try {
        log('Logging out from student session...');
        try {
          const signOutBtn = await driver.findElement(By.id('logout-nav-btn'));
          await safeClick(signOutBtn);
          await driver.sleep(1500);
        } catch (e) {
          log(`Logout button not found: ${e.message}`, 'WARNING');
        }

        log('Clicking Sign In nav button...');
        const signInNav = await driver.findElement(By.id('login-nav-btn'));
        await safeClick(signInNav);

        // Wait for modal to be visible
        await driver.wait(until.elementLocated(By.css('.auth-tabs')), 5000);
        log('Auth modal opened');

        // Switch to Sign Up tab
        log('Switching to Sign Up tab...');
        const signUpTab = await driver.findElement(By.css('.auth-tab-btn[data-tab="register-tab"]'));
        await safeClick(signUpTab);

        // Select Join as Owner
        log('Selecting Owner signup role...');
        const ownerSignUpBtn = await driver.findElement(By.css('#register-role-selector button[data-role="owner"]'));
        await safeClick(ownerSignUpBtn);

        // Fill out registration details
        log('Filling owner registration details...');
        const nameInput = await driver.findElement(By.id('register-name'));
        await nameInput.clear();
        await nameInput.sendKeys(TEST_OWNER.name);
        
        const emailInput = await driver.findElement(By.id('register-email'));
        await emailInput.clear();
        await emailInput.sendKeys(TEST_OWNER.email);

        const phoneInput = await driver.findElement(By.id('register-phone'));
        await phoneInput.clear();
        await phoneInput.sendKeys(TEST_OWNER.phone);

        const passInput = await driver.findElement(By.id('register-password'));
        await passInput.clear();
        await passInput.sendKeys(TEST_OWNER.password);

        // Click Register Submit Button
        log('Submitting owner signup form...');
        const submitBtn = await driver.findElement(By.css('form#register-form button[type="submit"]'));
        await safeClick(submitBtn);

        // Wait for alert and accept it
        log('Waiting for owner signup success alert...');
        try {
          await driver.wait(until.alertIsPresent(), 10000);
          const alert = await driver.switchTo().alert();
          const alertText = await alert.getText();
          log(`Alert message: ${alertText}`);
          await alert.accept();
        } catch (alertError) {
          log(`No alert appeared or error: ${alertError.message}`, 'WARNING');
        }

        // Wait for login form
        log('Waiting for login form to appear...');
        await driver.wait(until.elementLocated(By.id('login-form')), 5000);

        // Select "Owner Account" login role
        log('Selecting Owner login role...');
        const ownerLoginBtn = await driver.findElement(By.css('#login-role-selector button[data-role="owner"]'));
        await safeClick(ownerLoginBtn);

        // Fill in login details
        log('Filling login form after owner signup...');
        const loginEmailInput = await driver.findElement(By.id('login-email'));
        await loginEmailInput.clear();
        await loginEmailInput.sendKeys(TEST_OWNER.email);
        const loginPassInput = await driver.findElement(By.id('login-password'));
        await loginPassInput.clear();
        await loginPassInput.sendKeys(TEST_OWNER.password);

        log('Submitting owner login form...');
        const loginBtn = await driver.findElement(By.css('form#login-form button[type="submit"]'));
        await safeClick(loginBtn);

        await driver.sleep(2000);

        // Now wait for redirection to Dashboard
        log('Waiting for Dashboard nav button...');
        const dashboardBtn = await driver.wait(until.elementLocated(By.id('nav-dashboard-btn')), 15000);
        await safeClick(dashboardBtn);
        const modal = await driver.findElement(By.id('auth-modal'));
        await driver.wait(until.elementIsNotVisible(modal), 10000);

        // Verify Dashboard User Role shows "OWNER"
        const roleVal = await driver.wait(until.elementLocated(By.id('dashboard-user-role')), 5000);
        const roleText = await roleVal.getText();
        if (roleText.toUpperCase().includes('OWNER')) {
          log('Owner Signup & login successful.');
          addResult('Owner Signup and Login - Create owner account and sign in', true);
        } else {
          throw new Error(`Expected role tag OWNER, found: ${roleText}`);
        }
      } catch (error) {
        try {
          const browserLogs = await driver.manage().logs().get('browser');
          log('--- Browser Console Logs on Failure ---');
          for (const entry of browserLogs) {
            log(`[Browser Console] [${entry.level.name}] ${entry.message}`);
          }
          log('----------------------------------------');
        } catch (logErr) {
          log(`Failed to fetch browser logs: ${logErr.message}`, 'WARNING');
        }
        addResult('Owner Signup and Login - Create owner account and sign in', false, error.message);
        throw error;
      }
    });
  });

  // ============================================================
  // TEST 6: OWNER DASHBOARD NAVIGATION & LISTING
  // ============================================================
  describe('6. Owner Dashboard Navigation & Add PG Listing', function() {
    it('should navigate owner tabs and successfully list a new PG flat property', async function() {
      try {
        log('Opening Owner listings...');
        await driver.wait(until.elementLocated(By.id('sidebar-nav-container')), 5000);

        // Click "Utility Split Bills" tab
        log('Navigating to Utility Split Bills tab...');
        const billsTab = await driver.findElement(By.css('.sidebar-link-btn:nth-child(4)'));
        await safeClick(billsTab);
        await driver.sleep(1500);

        // Click "My Listings" tab (1st item)
        log('Navigating back to My Listings tab...');
        const listingsTab = await driver.findElement(By.css('.sidebar-link-btn:nth-child(1)'));
        await safeClick(listingsTab);
        await driver.sleep(1500);

        // Fill out List New Flat PG Form
        log('Filling out List New Flat form...');
        await driver.findElement(By.id('room-title')).sendKeys('Premium Co-Living Flat A');
        await driver.findElement(By.id('room-city')).sendKeys('Panaji');
        const rentInput = await driver.findElement(By.id('room-rent'));
        await rentInput.clear();
        await rentInput.sendKeys('12000');
        const latInput = await driver.findElement(By.id('room-lat'));
        await latInput.clear();
        await latInput.sendKeys('15.4989');
        const lngInput = await driver.findElement(By.id('room-lng'));
        await lngInput.clear();
        await lngInput.sendKeys('73.8278');
        await driver.findElement(By.id('room-address')).sendKeys('Near BITS campus, Altinho, Goa');

        // Submit form
        log('Submitting new flat listing...');
        const addRoomFormSubmit = await driver.findElement(By.css('form#add-room-form button[type="submit"]'));
        await safeClick(addRoomFormSubmit);

        // Accept Flat Listed Successfully alert
        log('Waiting for listing success alert...');
        try {
          await driver.wait(until.alertIsPresent(), 10000);
          const alert = await driver.switchTo().alert();
          const alertText = await alert.getText();
          log(`Alert message: ${alertText}`);
          await alert.accept();
        } catch (alertError) {
          log(`No alert appeared or error: ${alertError.message}`, 'WARNING');
        }

        await driver.sleep(2000);

        // Verify that the listing is present in listed properties
        log('Verifying room listed correctly...');
        const pageContent = await driver.findElement(By.id('dashboard-view-pane')).getText();
        if (pageContent.includes('Premium Co-Living Flat A')) {
          log('Verified "Premium Co-Living Flat A" listed successfully.');
          addResult('Owner Dashboard - Navigate tabs and list new PG flat', true);
        } else {
          throw new Error('Listed property "Premium Co-Living Flat A" not found in dashboard main content');
        }
      } catch (error) {
        addResult('Owner Dashboard - Navigate tabs and list new PG flat', false, error.message);
        throw error;
      }
    });
  });
});
