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
require('chromedriver');
const reportGenerator = require('./reportGenerator');

// Test configuration
const BASE_URL = 'http://localhost:8080';
const TEST_USER = {
  name: `Student Test ${Date.now()}`,
  email: `student_test_${Date.now()}@campusstay.com`,
  phone: '9999999999',
  password: 'password123'
};

const log = (message, level) => reportGenerator.log(message, level);
const addResult = (testName, passed, error) => reportGenerator.addResult(testName, passed, error);

describe('CampusStay Web E2E Workflow', function() {
  this.timeout(60000); // 1 minute timeout for entire suite

  let driver;

  before(async () => {
    reportGenerator.init();
    log('Initializing WebDriver...');
    try {
      const chrome = require('selenium-webdriver/chrome');
      const options = new chrome.Options();

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
      await driver.manage().window().maximize();
      await driver.manage().setTimeouts({ implicit: 5000, pageLoad: 15000 });
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
        await signInNav.click();

        // Wait for modal to be visible
        await driver.wait(until.elementLocated(By.css('.auth-tabs')), 5000);
        log('Auth modal opened');

        // Switch to Sign Up tab
        log('Switching to Sign Up tab...');
        const signUpTab = await driver.findElement(By.css('.auth-tab-btn[data-tab="register-tab"]'));
        await signUpTab.click();

        // Fill out registration details
        log('Filling registration details...');
        await driver.findElement(By.id('register-name')).sendKeys(TEST_USER.name);
        await driver.findElement(By.id('register-email')).sendKeys(TEST_USER.email);
        await driver.findElement(By.id('register-phone')).sendKeys(TEST_USER.phone);
        await driver.findElement(By.id('register-password')).sendKeys(TEST_USER.password);

        // Click Register Submit Button
        log('Submitting signup form...');
        const submitBtn = await driver.findElement(By.css('form#register-form button[type="submit"]'));
        await submitBtn.click();

        // Wait for registration complete & redirection to Dashboard
        await driver.sleep(3000);
        
        // Modal should close and nav dashboard button should be visible
        const dashboardBtn = await driver.wait(until.elementLocated(By.id('nav-dashboard-btn')), 5000);
        const text = await dashboardBtn.getText();
        if (text.includes('Dashboard')) {
          log('Signup successful. Dashboard navigation button is now visible.');
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
        await signOutBtn.click();
        await driver.sleep(1500);

        log('Clicking Sign In nav button...');
        const signInNav = await driver.findElement(By.id('login-nav-btn'));
        await signInNav.click();

        // Wait for login form
        await driver.wait(until.elementLocated(By.id('login-form')), 5000);
        
        log('Filling login form...');
        await driver.findElement(By.id('login-email')).sendKeys(TEST_USER.email);
        await driver.findElement(By.id('login-password')).sendKeys(TEST_USER.password);

        log('Submitting login form...');
        const submitBtn = await driver.findElement(By.css('form#login-form button[type="submit"]'));
        await submitBtn.click();

        await driver.sleep(2000);

        const dashboardBtn = await driver.wait(until.elementLocated(By.id('nav-dashboard-btn')), 5000);
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
        await dashboardBtn.click();

        // Wait for sidebar container to load
        await driver.wait(until.elementLocated(By.id('sidebar-nav-container')), 5000);
        log('Dashboard sidebar loaded');

        // Click on Roommate Matcher tab
        log('Navigating to Roommate Matcher tab...');
        const matcherBtn = await driver.findElement(By.css('.sidebar-link-btn[id*="matcher"], .sidebar-link-btn:nth-child(2)'));
        await matcherBtn.click();
        await driver.sleep(1500);

        // Click on Bookings & Split tab
        log('Navigating to Bookings & Split tab...');
        const bookingsBtn = await driver.findElement(By.css('.sidebar-link-btn[id*="bookings"], .sidebar-link-btn:nth-child(3)'));
        await bookingsBtn.click();
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

        await chatLink.click();
        await driver.sleep(2000);

        // Wait for chat window container
        const chatWindow = await driver.wait(until.elementLocated(By.css('.chat-window')), 5000);
        log('Chat window loaded');

        // Check dimensions of chat window and verify it is not squished (width > 500px)
        const size = await chatWindow.getSize();
        log(`Chat window width: ${size.width}px, height: ${size.height}px`);

        if (size.width < 500) {
          throw new Error(`Chat window width is restricted/squished: ${size.width}px. Expected > 500px.`);
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
});
