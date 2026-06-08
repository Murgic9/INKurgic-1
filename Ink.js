// Writing platform - INKurgic v1.0
const STORAGE_KEYS = {
  posts: 'ink_posts',
  users: 'ink_users',
  current: 'ink_current_user',
  approvals: 'ink_approvals',
  settings: 'ink_site_settings',
  messages: 'ink_messages',
  chats: 'ink_chats',
};

function getChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.chats)) || {};
  } catch {
    return {};
  }
}

function saveChats(chats) {
  localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(chats));
}

function getChatIdForCurrent() {
  const current = getCurrentUser();
  if (current) return current.username;
  // anonymous guest id stored in session
  let guest = sessionStorage.getItem('ink_guest_name');
  if (!guest) return null;
  return `guest:${guest}`;
}

function setupChatUI() {
  // create floating button
  if (!document.querySelector('.ember-chat-btn')) {
    const btn = document.createElement('button');
    btn.className = 'ember-chat-btn';
    btn.style.position = 'fixed';
    btn.style.right = '18px';
    btn.style.bottom = '18px';
    btn.style.width = '56px';
    btn.style.height = '56px';
    btn.style.borderRadius = '50%';
    btn.style.border = 'none';
    btn.style.background = '#000';
    btn.style.color = 'white';
    btn.style.fontSize = '22px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 12px 30px rgba(0,0,0,0.18)';
    btn.title = 'Chat with Ember';
    btn.textContent = '💬';
    document.body.appendChild(btn);

    const modal = document.createElement('div');
    modal.className = 'ember-chat-modal hidden';
    modal.style.position = 'fixed';
    modal.style.right = '18px';
    modal.style.bottom = '86px';
    modal.style.width = '90vw';
    modal.style.maxWidth = '400px';
    modal.style.maxHeight = '70vh';
    modal.style.background = 'white';
    modal.style.borderRadius = '12px';
    modal.style.boxShadow = '0 18px 50px rgba(0,0,0,0.2)';
    modal.style.overflow = 'hidden';
    modal.style.zIndex = '2200';
    modal.innerHTML = `
      <div style="padding:12px; border-bottom:1px solid #f0f0f0; display:flex; justify-content:space-between; align-items:center;">
        <strong>Chat with Ember</strong>
        <button id="closeEmberChat" class="btn">✕</button>
      </div>
      <div id="emberChatBody" style="padding:12px; max-height:min(45vh,320px); overflow:auto; background:#fafafa;"></div>
      <div style="padding:12px; border-top:1px solid #f0f0f0; display:grid; gap:10px;">
        <div id="emberGuestRow" style="margin-bottom:0; display:none;"><input id="emberGuestName" placeholder="Your name (optional)" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;"/></div>
        <textarea id="emberMessageInput" rows="2" style="width:100%; padding:12px; border:1px solid #ddd; border-radius:10px; min-height:90px; max-height:130px; resize:vertical; font-family:inherit; line-height:1.5; overflow-y:auto;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px;">
          <button class="btn" id="emberClearBtn">Clear</button>
          <button class="btn primary" id="emberSendBtn">📩 Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    btn.addEventListener('click', () => {
      modal.classList.toggle('hidden');
      const chatId = getChatIdForCurrent();
      const guestRow = document.getElementById('emberGuestRow');
      if (!chatId) guestRow.style.display = 'block';
      else guestRow.style.display = 'none';
      renderEmberChat();
    });

    document.getElementById('closeEmberChat').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    document.getElementById('emberClearBtn').addEventListener('click', () => {
      document.getElementById('emberMessageInput').value = '';
    });

    document.getElementById('emberSendBtn').addEventListener('click', async () => {
      let chatId = getChatIdForCurrent();
      const guestInput = document.getElementById('emberGuestName');
      if (!chatId) {
        const name = (guestInput && guestInput.value.trim()) || prompt('Enter a display name to start chat:');
        if (!name) {
          showToast('Enter a name to start chatting.', 'info');
          return;
        }
        sessionStorage.setItem('ink_guest_name', name);
        chatId = getChatIdForCurrent();
      }

      const text = document.getElementById('emberMessageInput').value.trim();
      if (!text) {
        showToast('Write a message before sending.', 'info');
        return;
      }

      const chats = getChats();
      chats[chatId] = chats[chatId] || [];
      const authorName = getCurrentUser() ? getCurrentUser().username : sessionStorage.getItem('ink_guest_name');
      chats[chatId].push({ from: authorName || 'Guest', text, created: Date.now() });
      saveChats(chats);
      document.getElementById('emberMessageInput').value = '';
      renderEmberChat();
      showToast('Message sent to Ember.', 'success');
    });
  }
}

function renderEmberChat() {
  const body = document.getElementById('emberChatBody');
  const chatId = getChatIdForCurrent();
  if (!body) return;
  const chats = getChats();
  const conv = chatId ? chats[chatId] || [] : [];
  body.innerHTML = '';
  if (!conv.length) {
    body.innerHTML = '<p style="color:#666;">No messages yet. Say hello to Ember!</p>';
    body.scrollTop = body.scrollHeight;
    return;
  }
  conv.forEach((m) => {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '10px';
    const isEmber = m.from === 'Ember';
    wrapper.innerHTML = `
      <div style="display:flex; justify-content:${isEmber ? 'flex-start' : 'flex-end'};">
        <div style="max-width:80%; padding:10px; border-radius:14px; background:${isEmber ? '#f0f0f0' : '#000'}; color:${isEmber ? '#111' : '#fff'};">
          <div style="font-size:12px; font-weight:700; margin-bottom:6px;">${escapeHtml(m.from)}</div>
          <div style="white-space:pre-wrap; line-height:1.5;">${escapeHtml(m.text)}</div>
          <div style="font-size:11px; color:${isEmber ? '#666' : '#ddd'}; margin-top:6px; text-align:right;">${new Date(m.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>
    `;
    body.appendChild(wrapper);
  });
  body.scrollTop = body.scrollHeight;
}

// Detect API base URL dynamically
let API_BASE_URL = '';
async function detectApiBaseUrl() {
  const tryUrls = [
    '/api/paystack/config',
    `http://${window.location.hostname}:3000/api/paystack/config`,
    'http://localhost:3000/api/paystack/config',
    'http://127.0.0.1:3000/api/paystack/config',
  ];

  for (const url of tryUrls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        API_BASE_URL = url.startsWith('/') ? '' : url.replace(/\/api\/paystack\/config$/, '');
        return;
      }
    } catch (err) {
      // ignore and continue trying next URL
    }
  }
}

const SITE_SLIDES = [
  'Every idea is a spark. Write it into existence.',
  'Your voice belongs in the feed. Share it today.',
  'Stories, poems, and prompts for every writer.',
  'Turn emotion into ink and make the page sing.',
  'Write with courage, publish with pride.',
  'Build a 100-day habit one verse at a time.',
  'Keep the flame burning with a new line every day.',
  'Let your next poem be the one that changes everything.',
];

const PLANS = {
  'go-pro': {
    id: 'go-pro',
    title: 'Go Pro',
    price: 2.99,
    frequency: '/month',
    description:
      'Unlock profile uploads, post commenting, ad-free browsing, priority tools, and the support writers need to publish faster.',
    features: [
      'Unlimited uploads',
      'Comment on every writeup',
      'Profile picture support',
      'Ad-free experience',
    ],
  },
};

const PROMPT_LEADS = [
  'Write about',
  'Describe',
  'Imagine',
  'Recount',
  'Begin with',
  'Reveal',
  'Explore',
  'Capture',
  'Recall',
  'Invent',
  'Sketch',
  'Write a letter to',
  'Tell the story of',
  'Compose a scene where',
  'Dream about',
  'Craft a poem about',
  'Paint a memory of',
  'Tell us about',
  'In one paragraph, write',
  'Write from the perspective of',
  'Build a scene around',
  'Frame a moment with',
  'Describe a day when',
  'Imagine a future where',
  'Explore the emotions of',
];

const PROMPT_TOPICS = [
  'a hidden door in an old house',
  'a rainy city street at midnight',
  'a childhood memory that still glows',
  'a letter never sent',
  'a snowy morning on a mountain',
  'a secret garden tucked behind walls',
  'an unexpected conversation in a cafe',
  'the sound of waves on a distant shore',
  'an encounter with a stranger who changed you',
  'the scent of autumn leaves',
  'a midnight drive with the windows down',
  'an image from an old photograph',
  'a song that you can almost remember',
  'the taste of an unfamiliar fruit',
  'a dream you woke up from',
  'a journey that began with one breath',
  'a quiet promise made in secret',
  'the feeling of falling without fear',
  'a conversation with your future self',
  'a sunrise after a long night',
  'a forgotten voice calling your name',
  'a moment of courage in the smallest act',
  'a memory of the first page of a book',
  'an old road leading to somewhere new',
  'a blurred reflection in a rainy window',
];

const WRITE_PROMPTS = generateWritingPrompts();
let currentPromptIndex = 0;
let heroSlideIndex = 0;

function generateWritingPrompts() {
  return PROMPT_LEADS.flatMap((lead) => PROMPT_TOPICS.map((topic) => `${lead} ${topic}.`));
}

function showPrompt() {
  const promptText = document.getElementById('promptText');
  if (!promptText) return;
  promptText.textContent = WRITE_PROMPTS[currentPromptIndex] || 'Your next story starts here.';
}

function shufflePrompt() {
  currentPromptIndex = Math.floor(Math.random() * WRITE_PROMPTS.length);
  showPrompt();
}

function renderPromptSection() {
  const promptGrid = document.getElementById('promptGrid');
  if (!promptGrid) return;
  promptGrid.innerHTML = WRITE_PROMPTS.slice(0, 24)
    .map(
      (prompt) => `
        <div class="prompt-card prompt-tile">
            <p>${prompt}</p>
        </div>
    `
    )
    .join('');
}

function getSiteSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)) || {};
  } catch {
    return {};
  }
}

function saveSiteSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function updateHeroSlide() {
  const heroText = document.getElementById('heroSlideText');
  if (!heroText) return;
  heroText.textContent = SITE_SLIDES[heroSlideIndex];
  heroSlideIndex = (heroSlideIndex + 1) % SITE_SLIDES.length;
}

function startHeroSlider() {
  updateHeroSlide();
  setInterval(updateHeroSlide, 4200);
}

function renderPlanCard() {
  const featureList = document.getElementById('planFeatures');
  const title = document.getElementById('planPrice');
  const planTitle = document.querySelector('.plan-title');
  const description = document.getElementById('planDescription');
  const settings = getSiteSettings();
  const plan = PLANS['go-pro'];

  if (planTitle) planTitle.textContent = plan.title;
  if (title) title.innerHTML = `$${plan.price.toFixed(2)}<span>${plan.frequency}</span>`;
  if (description) description.textContent = settings.planDescription || plan.description;
  if (featureList) {
    featureList.innerHTML = plan.features.map((feature) => `<li>✓ ${feature}</li>`).join('');
  }
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function getMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.messages)) || {};
  } catch {
    return {};
  }
}

function saveMessages(messages) {
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
}

function sendWelcomeEmail(user) {
  const subject = `Welcome to INKurgic, ${user.displayName || user.username}!`;
  const body = `
        <p>Hi ${user.displayName || user.username},</p>
        <p>Welcome to INKurgic — your new space for poems, stories, and daily writing momentum.</p>
        <p>Here are a few things to try first:</p>
        <ul>
            <li>Shuffle a prompt for instant inspiration</li>
            <li>Choose a writing challenge and track your streak</li>
            <li>Publish your first poem in the Poetry Workshop</li>
            <li>Explore the Prompt Library for fresh ideas</li>
        </ul>
        <p>We’re excited to read what you create.</p>
        <p>— The INKurgic Team</p>
    `;

  const messages = getMessages();
  const userMessages = messages[user.username] || [];
  const welcome = {
    subject,
    body,
    image: './Img/Logo.jpg',
    sentAt: Date.now(),
  };
  messages[user.username] = [...userMessages, welcome];
  saveMessages(messages);
  return welcome;
}

// Password reset helpers (client-side flow using localStorage messages)
function getResetTokens() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.resetTokens)) || {};
  } catch {
    return {};
  }
}

function saveResetTokens(tokens) {
  localStorage.setItem(STORAGE_KEYS.resetTokens, JSON.stringify(tokens));
}

function generateToken(len = 32) {
  const arr = new Uint8Array(len / 2 || 16);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function requestPasswordResetByEmail(email) {
  if (!isValidEmail(email)) return showToast('Enter a valid email address.', 'info');
  const users = getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return showToast('No account matches that email.', 'error');

  const token = generateToken(40);
  const tokens = getResetTokens();
  tokens[user.username] = { token, expires: Date.now() + 1000 * 60 * 60 }; // 1 hour
  saveResetTokens(tokens);
  const mail = sendPasswordResetEmail(user, token);
  // Open the simulated email immediately so the user can click the reset link
  if (mail) showWelcomeEmailModal(mail);
  showToast('Password reset email opened (simulated).', 'success');
}

function sendPasswordResetEmail(user, token) {
  const resetLink = `${window.location.origin}${window.location.pathname}?reset=${encodeURIComponent(token)}&u=${encodeURIComponent(user.username)}`;
  const subject = `Reset your INKurgic password`;
  const body = `
    <p>Hi ${user.displayName || user.username},</p>
    <p>We received a request to reset your password. Click the link below to set a new password. This link expires in 1 hour.</p>
    <p><a href="#" onclick="openResetFromEmail('${encodeURIComponent(user.username)}','${token}')">Reset your password</a></p>
    <p>If you didn't request this, ignore this message.</p>
  `;
  const messages = getMessages();
  const userMessages = messages[user.username] || [];
  const mail = { subject, body, image: './Img/Logo.jpg', sentAt: Date.now() };
  messages[user.username] = [...userMessages, mail];
  saveMessages(messages);
  return mail;
}

// Called from the email preview link
function openResetFromEmail(encodedUsername, token) {
  const username = decodeURIComponent(encodedUsername);
  showResetModal(username, token);
}

function showResetModal(username, token) {
  let modal = document.getElementById('resetModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal hidden';
    modal.id = 'resetModal';
    modal.innerHTML = `
      <div class="sheet">
        <h4>Reset password</h4>
        <form id="resetForm">
          <input id="resetUser" type="hidden" />
          <div class="input-with-toggle">
            <input id="resetPass" type="password" placeholder="New password" required />
            <button type="button" class="toggle-eye">👁</button>
          </div>
          <div class="input-with-toggle">
            <input id="resetConfirm" type="password" placeholder="Confirm password" required />
            <button type="button" class="toggle-eye">👁</button>
          </div>
          <div class="form-actions">
            <button type="button" class="btn close-modal">Cancel</button>
            <button type="submit" class="btn primary">Set password</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    // close handlers
    modal.querySelectorAll('.close-modal').forEach((b) => b.addEventListener('click', () => modal.classList.add('hidden')));
    modal.querySelector('#resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('resetUser').value;
      const pass = document.getElementById('resetPass').value;
      const conf = document.getElementById('resetConfirm').value;
      if (!pass || pass !== conf) return showToast('Passwords do not match.', 'info');
      await performPasswordReset(user, token, pass);
      modal.classList.add('hidden');
    });
  }
  document.getElementById('resetUser').value = username;
  modal.classList.remove('hidden');
}

async function performPasswordReset(username, token, newPassword) {
  const tokens = getResetTokens();
  const entry = tokens[username];
  if (!entry || entry.token !== token || Date.now() > entry.expires) {
    return showToast('Invalid or expired reset link.', 'error');
  }
  try {
    const hashed = await hashPassword(newPassword);
    const users = getUsers();
    const updated = users.map((u) => (u.username === username ? { ...u, password: hashed } : u));
    saveUsers(updated);
    delete tokens[username];
    saveResetTokens(tokens);
    sendWelcomeEmail({ username, displayName: username });
    showToast('Password updated. You can now login with your new password.', 'success');
  } catch (err) {
    showToast('Failed to reset password.', 'error');
  }
}

function handleResetFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('reset');
  const u = params.get('u');
  if (token && u) {
    try {
      const username = decodeURIComponent(u);
      showResetModal(username, token);
      // remove query params
      const clean = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, document.title, clean);
    } catch (e) {
      // ignore
    }
  }
}

// Toast notifications
function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 260ms ease, transform 260ms ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

function showSuccessBadge(duration = 1400) {
  const badge = document.createElement('div');
  badge.className = 'success-badge';
  badge.innerHTML = `<div class="circle"><div class="check">✓</div></div>`;
  document.body.appendChild(badge);
  setTimeout(() => {
    badge.style.transition = 'opacity 400ms ease, transform 400ms ease';
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(-8px)';
    setTimeout(() => badge.remove(), 420);
  }, duration);
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.current)) || null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify(user));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/hash-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await parseJsonResponse(response);
    if (!data?.status) throw new Error(data?.message || 'Failed to hash password');
    return data.hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

async function verifyPassword(password, hash) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, hash }),
    });
    const data = await parseJsonResponse(response);
    if (!data?.status) return false;
    if (data.token) {
      localStorage.setItem('ink_auth_token', data.token);
    }
    return true;
  } catch (error) {
    console.warn('Password verification error:', error.message);
    return false;
  }
}

async function createUser(username, email, displayName, password, avatar = './Img/Logo.jpg') {
  username = username.trim();
  email = email.trim();
  displayName = displayName.trim();

  if (!username || !email || !displayName || !password) {
    return { ok: false, msg: 'Complete all fields.' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, msg: 'Enter a valid email address.' };
  }

  const users = getUsers();
  const usernameTaken = users.some(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );
  const emailTaken = users.some((user) => user.email.toLowerCase() === email.toLowerCase());

  if (usernameTaken) return { ok: false, msg: 'Username already exists.' };
  if (emailTaken) return { ok: false, msg: 'Email already registered.' };

  try {
    const hashedPassword = await hashPassword(password);
    users.push({
      username,
      email,
      displayName,
      password: hashedPassword,
      avatar,
      isPaid: false,
      isAdmin: false,
      followers: 0,
      challengeDays: 100,
    });

    saveUsers(users);
    setCurrentUser({ username });
    updateAuthUI();
    return { ok: true };
  } catch (error) {
    return { ok: false, msg: error.message };
  }
}

async function loginUser(identifier, password) {
  const users = getUsers();
  const normalized = identifier.trim().toLowerCase();
  const user = users.find(
    (user) => user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized
  );

  if (!user) return { ok: false, msg: 'Incorrect login details.' };

  try {
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return { ok: false, msg: 'Incorrect login details.' };

    setCurrentUser({ username: user.username });
    updateAuthUI();
    return { ok: true };
  } catch (error) {
    return { ok: false, msg: 'Login failed. Please try again.' };
  }
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.current);
  updateAuthUI();
  renderFeed();
}

function updateAuthUI() {
  const user = getCurrentUser();
  const authArea = document.getElementById('authArea');
  const userArea = document.getElementById('userArea');
  const publishBtn = document.getElementById('publishBtn');
  const adminBtn = document.getElementById('adminBtn');

  if (user) {
    authArea.style.display = 'none';
    userArea.style.display = 'flex';
    document.getElementById('currentUser').textContent = user.username;
    publishBtn.removeAttribute('disabled');
    renderUserAvatar();

    const activeUser = getUsers().find((u) => u.username === user.username);
    if (activeUser && activeUser.isAdmin) {
      adminBtn.style.display = 'block';
      adminBtn.onclick = () => (window.location.href = './admin/index.html');
    } else {
      adminBtn.style.display = 'none';
    }
  } else {
    authArea.style.display = 'flex';
    userArea.style.display = 'none';
    publishBtn.setAttribute('disabled', 'disabled');
  }
  renderChallengeInfo();
  renderAdBanner();
}

function updateHomeSettings() {
  const settings = getSiteSettings();
  const heroText = document.getElementById('heroSlideText');
  if (settings.heroMessage && heroText) {
    heroText.textContent = settings.heroMessage;
  }
}

function togglePassword(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁';
  }
}

function getUserData(username) {
  return getUsers().find((user) => user.username === username) || null;
}

function getUserAvatar(username) {
  const user = getUserData(username);
  return user?.avatar || './Img/Logo.jpg';
}

function updateUserData(username, updates) {
  const users = getUsers().map((user) => {
    if (user.username === username) {
      return { ...user, ...updates };
    }
    return user;
  });
  saveUsers(users);
}

function renderUserAvatar() {
  const current = getCurrentUser();
  const avatarEl = document.getElementById('currentAvatar');
  const profilePreview = document.getElementById('profilePicPreview');
  if (!current) {
    if (avatarEl) avatarEl.src = './Img/Logo.jpg';
    if (profilePreview) profilePreview.src = './Img/Logo.jpg';
    return;
  }

  const userData = getUserData(current.username);
  const avatar = userData?.avatar || './Img/Logo.jpg';
  if (avatarEl) avatarEl.src = avatar;
  if (profilePreview) profilePreview.src = avatar;
}

function getCurrentUserData() {
  const current = getCurrentUser();
  return current ? getUserData(current.username) : null;
}

function getUserChallengeDays() {
  const user = getCurrentUserData();
  return user && user.challengeDays ? user.challengeDays : 100;
}

function setUserChallengeDays(days) {
  const current = getCurrentUser();
  if (!current || !days || days < 1) return;
  updateUserData(current.username, { challengeDays: days });
  renderChallengeInfo();
}

function renderChallengeInfo() {
  const challengeValue = document.getElementById('challengeValue');
  const currentChallenge = document.getElementById('currentChallenge');
  const userChallenge = getUserChallengeDays();
  if (challengeValue) challengeValue.textContent = userChallenge;
  if (currentChallenge) currentChallenge.textContent = userChallenge;
  const select = document.getElementById('challengeSelect');
  const custom = document.getElementById('customChallenge');
  if (select) {
    select.value = [7, 14, 30, 100].includes(userChallenge) ? String(userChallenge) : 'custom';
  }
  if (custom) {
    custom.value = userChallenge;
    custom.style.display = select && select.value === 'custom' ? 'block' : 'none';
  }
}

function calculateUserStreak(username) {
  const userPosts = getPosts().filter((post) => post.author === username);
  if (!userPosts.length) return 0;

  const dayMs = 86400000;
  const days = new Set(
    userPosts.map((post) => {
      const date = new Date(post.created);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - dayMs).getTime();
  let cursor = days.has(today.getTime()) ? today.getTime() : days.has(yesterday) ? yesterday : null;
  if (cursor === null) return 0;

  let streak = 0;
  while (cursor !== null && days.has(cursor)) {
    streak += 1;
    cursor -= dayMs;
  }

  return streak;
}

function renderStreakSection() {
  const content = document.getElementById('engageContent');
  const user = getCurrentUser();
  if (!content) return;
  if (!user) {
    content.innerHTML = `
            <div class="engage-card">
                <h3>Login to see your streak</h3>
                <p>Start your writing habit and watch your streak grow every day.</p>
            </div>
        `;
    return;
  }

  const streak = calculateUserStreak(user.username);
  const challenge = getUserChallengeDays();
  content.innerHTML = `
        <div class="engage-card">
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:18px;">
                <div class="fire-icon">🔥</div>
                <div>
                    <h3>Your Streak</h3>
                    <p>Keep the flame alive by writing consistently.</p>
                </div>
            </div>
            <div class="streak-number">${streak}</div>
            <p style="margin-top:18px; color:#555;">Your current challenge is set to <strong>${challenge}</strong> days. Each post counts toward your streak.</p>
        </div>
        <div class="engage-card">
            <h3>How it works</h3>
            <p>Post every day to build momentum. Your streak stays alive when you write today or yesterday, and it resets if you miss two days.</p>
        </div>
    `;
}

// Navigation
function navigate(section) {
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  const el = document.getElementById(section + 'Section');
  if (el) el.classList.add('active');

  if (section === 'home') showPrompt();
  if (section === 'poems') renderPoemsSection();
  if (section === 'prompts') renderPromptSection();
  if (section === 'engage') renderStreakSection();
}

// Posts
function getPosts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.posts)) || [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON from server: ${error.message}`);
  }
}

function renderFeed() {
  const container = document.getElementById('posts');
  container.innerHTML = '';
  const currentUser = getCurrentUser();

  const posts = getPosts().sort((a, b) => b.created - a.created);
  if (!posts.length) {
    container.innerHTML = '<p style="color:#999; text-align:center;">No posts yet. Be first!</p>';
    return;
  }

  posts.forEach((post, index) => {
    const article = document.createElement('article');
    article.className = 'post';

    const authorData = getUserData(post.author) || {};
    const avatar = post.avatar || authorData.avatar || './Img/Logo.jpg';
    const displayName = authorData.displayName || post.author;
    const date = new Date(post.created).toLocaleDateString();
    const isEmberDemo = post.author === 'demo_poet' || displayName === 'Ember';
    const commentCount = isEmberDemo ? 0 : (post.comments || []).length;
    const isLatest = index === 0;
    const commentPreview = isEmberDemo
      ? ''
      : (post.comments || [])
          .slice(-3)
          .map(
            (comment) => `
              <div class="comment-item">
                  <strong>${escapeHtml(comment.author)}</strong>
                  <p>${escapeHtml(comment.text)}</p>
              </div>
          `
          )
          .join('') || '<p class="muted">No comments yet.</p>';
    const activeUser = currentUser ? getUserData(currentUser.username) : null;
    const commentControls = isEmberDemo
      ? ''
      : activeUser?.isPaid
      ? `
          <div class="comment-form">
            <textarea data-post-id="${post.id}" class="comment-input" rows="2" placeholder="Leave a supportive comment..."></textarea>
            <button class="btn primary add-comment-btn" data-post-id="${post.id}">Comment</button>
          </div>
        `
      : `
          <div class="comment-note">
            Upgrade to Go Pro to comment on writeups. <button class="btn" onclick="openSubscribeCard()">Subscribe</button>
          </div>
        `;

    article.innerHTML = `
            <div class="meta">
                <img src="${avatar}" alt="avatar" onerror="this.src='./Img/Logo.jpg'">
                <div>
                    <strong>${escapeHtml(displayName)}</strong>
                    <div class="muted">${date}</div>
                </div>
            </div>
            <h4>${escapeHtml(post.title)}</h4>
            <p>${escapeHtml(post.content)}</p>
            ${post.image ? `<img class="full" src="${post.image}" alt="post image">` : ''}
            <div class="reactions" data-id="${post.id}">
              <button class="react-btn" data-react="like">👍 <span>${isLatest ? 0 : post.reactions.like || 0}</span></button>
              <button class="react-btn" data-react="heart">❤️ <span>${isLatest ? 0 : post.reactions.heart || 0}</span></button>
              <button class="react-btn" data-react="clap">👏 <span>${isLatest ? 0 : post.reactions.clap || 0}</span></button>
            </div>
            ${isEmberDemo ? '' : `
            <div class="comment-block">
                <div class="comment-summary">💬 ${commentCount} comment${
      commentCount === 1 ? '' : 's'
    }</div>
                ${commentPreview}
                ${commentControls}
            </div>
            `}
        `;

    container.appendChild(article);
  });

  document.querySelectorAll('.reactions').forEach((el) => {
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.react-btn');
      if (!btn || btn.disabled) return;
      const react = btn.dataset.react;
      const id = el.dataset.id;
      addReaction(id, react);
    });
  });

  document.querySelectorAll('.add-comment-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const postId = button.dataset.postId;
      const textarea = document.querySelector(`textarea[data-post-id="${postId}"]`);
      if (!textarea) return;
      const text = textarea.value.trim();
      if (!text) {
        showToast('Write a comment before sending.', 'info');
        return;
      }
      addComment(postId, text);
      textarea.value = '';
    });
  });
}

function addReaction(postId, reaction) {
  const posts = getPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  post.reactions[reaction] = (post.reactions[reaction] || 0) + 1;
  savePosts(posts);
  renderFeed();
}

function addComment(postId, text) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to comment.', 'error');
    return;
  }
  const currentUser = getUserData(user.username);
  if (!currentUser?.isPaid) {
    showToast('Upgrade to Go Pro to leave comments.', 'info');
    return;
  }

  const posts = getPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return;

  post.comments = post.comments || [];
  post.comments.push({
    author: currentUser.displayName || currentUser.username,
    text,
    created: Date.now(),
  });

  savePosts(posts);
  renderFeed();
}

// Setup compose form
function setupCompose() {
  const form = document.getElementById('postForm');
  const clearBtn = document.getElementById('clearBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = getCurrentUser();
    if (!user) {
      showToast('Please log in to post.', 'error');
      return;
    }

    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const fileInput = document.getElementById('image');

    let imageData = null;
    if (fileInput.files[0]) {
      imageData = await readFileAsUrl(fileInput.files[0]);
    }

    const authorData = getUserData(user.username);
    const post = {
      id: generateId(),
      title,
      content,
      image: imageData,
      author: user.username,
      avatar: authorData?.avatar || './Img/Logo.jpg',
      reactions: {},
      comments: [],
      created: Date.now(),
    };

    const posts = getPosts();
    posts.push(post);
    savePosts(posts);

    form.reset();
    // Update both feed and poems view
    renderFeed();
    navigate('poems');
    renderPoemsSection();
    showToast('Posted! Your poem is published.', 'success');
    // Scroll the newly created poem into view in the Poems section
    setTimeout(() => {
      const el = document.getElementById(`poem-${post.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  });

  clearBtn.addEventListener('click', () => form.reset());

  const profilePicInput = document.getElementById('profilePic');
  if (profilePicInput) {
    profilePicInput.addEventListener('change', async () => {
      const user = getCurrentUser();
      if (!user || !profilePicInput.files[0]) return;
      const avatarData = await readFileAsUrl(profilePicInput.files[0]);
      updateUserData(user.username, { avatar: avatarData });
      renderUserAvatar();
      showToast('Profile picture updated.', 'success');
    });
  }

  const challengeSelect = document.getElementById('challengeSelect');
  const customChallenge = document.getElementById('customChallenge');

  if (challengeSelect) {
    challengeSelect.addEventListener('change', () => {
      if (challengeSelect.value === 'custom') {
        customChallenge.style.display = 'block';
        setUserChallengeDays(Number(customChallenge.value) || 100);
      } else {
        customChallenge.style.display = 'none';
        setUserChallengeDays(Number(challengeSelect.value));
      }
    });
  }

  if (customChallenge) {
    customChallenge.addEventListener('input', () => {
      const value = Number(customChallenge.value);
      if (value > 0) {
        setUserChallengeDays(value);
        challengeSelect.value = 'custom';
      }
    });
  }

  renderChallengeInfo();
}

function readFileAsUrl(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// Poems section
function renderPoemsSection() {
  const grid = document.getElementById('poemsGrid');
  grid.innerHTML = '';
  const currentUser = getCurrentUser();

  if (!currentUser) {
    grid.innerHTML = '<p>Please login to see your poems and keep your work private.</p>';
    return;
  }

  // Only show posts that explicitly belong to the current user
  const posts = getPosts()
    .filter((post) => post && post.author && post.author === currentUser.username)
    .sort((a, b) => b.created - a.created);

  if (!posts.length) {
    grid.innerHTML = '<p>You have no poems yet. Publish one from the Write Your Poem panel.</p>';
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.id = `poem-${post.id}`;
    card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div>
                <h3>${escapeHtml(post.title)}</h3>
                <p style="white-space:pre-wrap;">${escapeHtml(post.content)}</p>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                <div class="meta" style="text-align:right;">
                  <strong>${escapeHtml(post.author)}</strong>
                  <div style="font-size:12px; color:#999;">${new Date(post.created).toLocaleDateString()}</div>
                </div>
                <div>
                  <button class="btn" onclick="deletePost('${post.id}')">Delete</button>
                </div>
              </div>
            </div>
        `;
    grid.appendChild(card);
  });
}

// Delete a post if the current user is the author
function deletePost(postId) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to delete posts.', 'error');
    return;
  }

  const posts = getPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    showToast('Post not found.', 'error');
    return;
  }

  if (post.author !== user.username) {
    showToast('You can only delete your own posts.', 'error');
    return;
  }

  const ok = confirm('Are you sure you want to delete this poem? This action cannot be undone.');
  if (!ok) return;

  const remaining = posts.filter((p) => p.id !== postId);
  savePosts(remaining);
  renderFeed();
  renderPoemsSection();
  showToast('Poem deleted.', 'success');
}

// Engage section
function renderEngageSection() {
  const content = document.getElementById('engageContent');
  content.innerHTML = '';

  const totalPosts = getPosts().length;
  const totalUsers = 0; // hide real user count for deployment as requested
  const totalReactions = getPosts().reduce((sum, p) => {
    return sum + Object.values(p.reactions).reduce((a, b) => a + b, 0);
  }, 0);

  content.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; margin-bottom:24px;">
            <div style="background:white; padding:16px; border-radius:12px; text-align:center;">
                <div style="font-size:28px; font-weight:700;">${totalPosts}</div>
                <div style="color:#999;">Posts</div>
            </div>
            <div style="background:white; padding:16px; border-radius:12px; text-align:center;">
                <div style="font-size:28px; font-weight:700;">${totalUsers}</div>
                <div style="color:#999;">Writers</div>
            </div>
            <div style="background:white; padding:16px; border-radius:12px; text-align:center;">
                <div style="font-size:28px; font-weight:700;">${totalReactions}</div>
                <div style="color:#999;">Reactions</div>
            </div>
        </div>
        <div style="background:white; padding:20px; border-radius:12px;">
            <h3>Community Highlights</h3>
            <p>Connect with writers, share feedback, and grow together. Our community values authentic voices and creative expression.</p>
        </div>
    `;
}

// Admin dashboard
function renderAdminDashboard() {
  const users = getUsers();
  const posts = getPosts();
  const paidUsers = users.filter((u) => u.isPaid).length;
  const totalFollowers = users.reduce((sum, u) => sum + (u.followers || 0), 0);

  // Update stats
  document.getElementById('totalUsers').textContent = 0; // hide user count on admin dashboard
  document.getElementById('totalPosts').textContent = posts.length;
  document.getElementById('paidUsers').textContent = paidUsers;
  document.getElementById('followers').textContent = totalFollowers;

  // Pending approvals
  const appList = document.getElementById('approvalsList');
  appList.innerHTML = '';
  const pending = getApprovals().filter((a) => !a.approved);
  if (!pending.length) {
    appList.innerHTML = '<p>No pending approvals</p>';
  } else {
    pending.forEach((ap) => {
      const item = document.createElement('div');
      item.className = 'approval-item';
      item.innerHTML = `
                <div>
                    <strong>${escapeHtml(ap.username)}</strong>
                    <div style="font-size:12px; color:#999;">Requested: ${new Date(
                      ap.date
                    ).toLocaleDateString()}</div>
                </div>
                <div class="actions">
                    <button class="btn primary" onclick="approveUser('${
                      ap.username
                    }')">Approve</button>
                    <button class="btn" onclick="denyUser('${ap.username}')">Deny</button>
                </div>
            `;
      appList.appendChild(item);
    });
  }

  // User list
  const usersList = document.getElementById('usersList');
  usersList.innerHTML = '';
  users.slice(0, 10).forEach((u) => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.innerHTML = `
            <div>
                <strong>${escapeHtml(u.username)}</strong>
                <div style="font-size:12px; color:#999;">
                    ${u.isPaid ? '✓ Paid' : 'Free'} • ${u.followers || 0} followers
                </div>
            </div>
            <button class="btn" onclick="toggleUserPaid('${u.username}')">${
      u.isPaid ? 'Unpaid' : 'Mark Paid'
    }</button>
        `;
    usersList.appendChild(item);
  });
}

function getApprovals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.approvals)) || [];
  } catch {
    return [];
  }
}

function approveUser(username) {
  let approvals = getApprovals();
  approvals = approvals.map((a) => (a.username === username ? { ...a, approved: true } : a));
  localStorage.setItem(STORAGE_KEYS.approvals, JSON.stringify(approvals));

  let users = getUsers();
  users = users.map((u) => (u.username === username ? { ...u, isPaid: true } : u));
  saveUsers(users);

  renderAdminDashboard();
}

function denyUser(username) {
  let approvals = getApprovals();
  approvals = approvals.filter((a) => a.username !== username);
  localStorage.setItem(STORAGE_KEYS.approvals, JSON.stringify(approvals));
  renderAdminDashboard();
}

function toggleUserPaid(username) {
  let users = getUsers();
  users = users.map((u) => (u.username === username ? { ...u, isPaid: !u.isPaid } : u));
  saveUsers(users);
  renderAdminDashboard();
}

// Auth modals
function setupAuthModals() {
  const regModal = document.getElementById('regModal');
  const logModal = document.getElementById('logModal');
  const emailModal = document.getElementById('emailModal');

  const registerBtn = document.getElementById('registerBtn');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const regPassToggle = document.getElementById('regPassToggle');
  const regConfirmToggle = document.getElementById('regConfirmToggle');
  const logPassToggle = document.getElementById('logPassToggle');
  const regForm = document.getElementById('regForm');
  const logForm = document.getElementById('logForm');

  const closeButtons = document.querySelectorAll('.close-modal');
  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });

  if (registerBtn && regModal) {
    registerBtn.addEventListener('click', () => regModal.classList.remove('hidden'));
  }

  if (loginBtn && logModal) {
    loginBtn.addEventListener('click', () => logModal.classList.remove('hidden'));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  if (regPassToggle) {
    regPassToggle.addEventListener('click', () => togglePassword('regPass', 'regPassToggle'));
  }
  if (regConfirmToggle) {
    regConfirmToggle.addEventListener('click', () =>
      togglePassword('regConfirm', 'regConfirmToggle')
    );
  }
  if (logPassToggle) {
    logPassToggle.addEventListener('click', () => togglePassword('logPass', 'logPassToggle'));
  }

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('regUser').value;
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPass').value;
      const confirm = document.getElementById('regConfirm').value;
      const avatarFile = document.getElementById('regAvatar')?.files[0];

      if (password !== confirm) {
        showToast('Passwords do not match.', 'error');
        return;
      }

      let avatarData = './Img/Logo.jpg';
      if (avatarFile) {
        avatarData = await readFileAsUrl(avatarFile);
      }

      const result = await createUser(username, email, name, password, avatarData);
      if (result.ok) {
        const currentUser = { username, displayName: name };
        const welcomeEmail = sendWelcomeEmail(currentUser);
        showWelcomeEmailModal(welcomeEmail);
        if (regModal) regModal.classList.add('hidden');
        regForm.reset();
        renderFeed();
      } else {
        showToast(result.msg || 'Registration failed.', 'error');
      }
    });
  }

  if (logForm) {
    logForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('logUser').value;
      const password = document.getElementById('logPass').value;
      const result = await loginUser(identifier, password);
      if (result.ok) {
        if (logModal) logModal.classList.add('hidden');
        logForm.reset();
        renderFeed();
      } else {
        showToast(result.msg || 'Login failed.', 'error');
      }
    });
  }
}

function showWelcomeEmailModal(email) {
  const modal = document.getElementById('emailModal');
  if (!modal) return;
  const subjectNode = modal.querySelector('.email-subject');
  const bodyNode = modal.querySelector('.email-body');
  const imageNode = modal.querySelector('.email-image');
  if (subjectNode) subjectNode.textContent = email.subject;
  if (bodyNode) bodyNode.innerHTML = email.body;
  if (imageNode) imageNode.src = email.image;
  modal.classList.remove('hidden');
}

// Subscribe button
function renderAdBanner() {
  const banner = document.getElementById('adBanner');
  if (!banner) return;

  const user = getCurrentUser();
  const paid = user ? getUserData(user.username)?.isPaid : false;
  if (paid) {
    banner.classList.add('hidden');
  } else {
    banner.classList.remove('hidden');
  }
}

async function initializePaystackTransaction(planId) {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Please login first to subscribe.');
  }

  const userData = getUserData(user.username);
  const plan = PLANS[planId];
  if (!plan) {
    throw new Error('Subscription plan not found.');
  }

  const endpoint = `${API_BASE_URL}/api/paystack/initialize`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: userData.email,
      amount: Math.round(plan.price * 100),
      planId,
    }),
  });

  const data = await parseJsonResponse(response);
  if (!response.ok || !data?.status) {
    throw new Error(
      data?.message || `Unable to initialize Paystack transaction. Status ${response.status}`
    );
  }

  return data.data.authorization_url;
}

async function verifyPaystackPayment(reference) {
  const endpoint = `${API_BASE_URL}/api/paystack/verify?reference=${encodeURIComponent(reference)}`;
  const response = await fetch(endpoint);
  const data = await parseJsonResponse(response);
  if (!response.ok || !data?.status) {
    throw new Error(
      data?.message || `Unable to verify Paystack payment. Status ${response.status}`
    );
  }
  return data.data;
}

async function handlePaystackReturn() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get('reference');
  if (!reference) return;

  try {
    const user = getCurrentUser();
    if (!user) {
      showToast('Please log in again to complete payment verification.', 'error');
      return;
    }

    const payment = await verifyPaystackPayment(reference);
    if (payment.status === 'success') {
      const users = getUsers().map((u) => {
        if (u.username === user.username) {
          return { ...u, isPaid: true };
        }
        return u;
      });
      saveUsers(users);
      updateAuthUI();
      renderFeed();
      renderPoemsSection();
      showSuccessBadge();
      showToast('Payment verified — Go Pro is now active.', 'success');
    } else {
      showToast('Payment verification failed or was not completed.', 'error');
    }
  } catch (error) {
    showToast(error.message || 'Payment verification error.', 'error');
  } finally {
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

let PAYSTACK_CONFIG = { mode: 'test', publicKey: '' };

async function renderPaystackModeLabel() {
  const label = document.getElementById('paystackModeLabel');
  if (!label) return;

  if (PAYSTACK_CONFIG.publicKey) {
    if (PAYSTACK_CONFIG.mode === 'live') {
      label.textContent = 'Online';
      label.className = 'plan-status online';
    } else {
      label.textContent = 'Test';
      label.className = 'plan-status test';
    }
  } else {
    label.textContent = 'Offline';
    label.className = 'plan-status unavailable';
  }
}

async function loadPaystackConfig() {
  try {
    const endpoint = `${API_BASE_URL}/api/paystack/config`;
    const response = await fetch(endpoint);
    const data = await parseJsonResponse(response);
    if (response.ok && data?.status) {
      PAYSTACK_CONFIG = {
        mode: data.mode,
        publicKey: data.publicKey,
      };
    } else {
      console.warn('Paystack config response invalid', { endpoint, status: response.status, data });
    }
  } catch (error) {
    console.warn('Unable to load Paystack config', { error, apiBaseUrl: API_BASE_URL });
  }

  await renderPaystackModeLabel();
}

function setupSubscribe() {
  document.getElementById('subscribeBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      showToast('Please log in to subscribe.', 'error');
      const logModal = document.getElementById('logModal');
      if (logModal) logModal.classList.remove('hidden');
      return;
    }

    const planId = document.getElementById('planCard')?.dataset.planId || 'go-pro';
    // Directly initialize payment without a blocking confirmation
    try {
      const authorizationUrl = await initializePaystackTransaction(planId);
      window.location.href = authorizationUrl;
    } catch (error) {
      showToast(error.message || 'Unable to start payment.', 'error');
    }
  });
}

// Navigate to home and scroll the plan card into view
function openSubscribeCard() {
  navigate('home');
  const plan = document.getElementById('planCard');
  if (plan) {
    setTimeout(() => {
      plan.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const btn = document.getElementById('subscribeBtn');
      if (btn) btn.focus();
    }, 200);
  }
}

function setupPromptPanel() {
  const shuffleButton = document.getElementById('shufflePromptBtn');
  const moreButton = document.getElementById('seeMorePromptsBtn');
  if (shuffleButton) shuffleButton.addEventListener('click', shufflePrompt);
  if (moreButton) moreButton.addEventListener('click', () => navigate('prompts'));
  showPrompt();
}

// Navigation toggle for small screens
function setupNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = toggle.classList.toggle('open');
    links.classList.toggle('show', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close menu when a nav link is clicked
  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      toggle.classList.remove('open');
      links.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );

  // Ensure menu is closed when resizing to larger screens
  window.addEventListener('resize', () => {
    if (window.innerWidth > 600) {
      toggle.classList.remove('open');
      links.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Seed demo (ensure demo user exists and has display name Ember)
async function seedDemo() {
  const postsExist = getPosts().length > 0;

  const adminUser = 'admin_master';
  const demoUser = 'demo_poet';
  let users = getUsers();

  // Hash demo passwords
  const adminHash = await hashPassword('admin123').catch(() => 'admin123');
  const demoHash = await hashPassword('demo123').catch(() => 'demo123');

  if (!users.some((u) => u.username === adminUser)) {
    users.push({
      username: adminUser,
      email: 'admin@inkurgic.com',
      displayName: 'INKurgic Admin',
      password: adminHash,
      isPaid: true,
      isAdmin: true,
      followers: 20,
      challengeDays: 100,
    });
  }

  const existingDemo = users.find((u) => u.username === demoUser);
  if (!existingDemo) {
    users.push({
      username: demoUser,
      email: 'demo@inkurgic.com',
      displayName: 'Ember',
      password: demoHash,
      avatar: './Img/Logo.jpg',
      isPaid: true,
      isAdmin: false,
      followers: 5,
      challengeDays: 100,
    });
  } else {
    // ensure display name and avatar are up-to-date
    existingDemo.displayName = 'Ember';
    existingDemo.avatar = existingDemo.avatar || './Img/Logo.jpg';
    users = users.map((u) => (u.username === demoUser ? existingDemo : u));
  }

  saveUsers(users);

  if (!postsExist) {
    savePosts([
      {
        id: generateId(),
        title: 'Welcome to INKurgic',
        content:
          'A platform where writers share their voice. Create posts, upload images, and engage with our community.',
        image: null,
        author: demoUser,
        avatar: './Img/Logo.jpg',
        reactions: {},
        comments: [],
        created: Date.now() - 86400000,
      },
    ]);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await detectApiBaseUrl();
  await seedDemo();
  setupCompose();
  setupAuthModals();
  setupSubscribe();
  setupPromptPanel();
  setupNavToggle();
  setupChatUI();
  // Wire forgot-password link
  const forgotLink = document.getElementById('forgotPasswordLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', () => {
      const email = prompt('Enter the email associated with your account:');
      if (email) requestPasswordResetByEmail(email.trim());
    });
  }
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.chats) {
      renderEmberChat();
    }
  });
  renderPlanCard();
  startHeroSlider();
  updateHomeSettings();
  updateAuthUI();
  renderFeed();
  navigate('home');
  // Check for password reset links in URL
  handleResetFromUrl();
  await loadPaystackConfig();
  handlePaystackReturn();
});
