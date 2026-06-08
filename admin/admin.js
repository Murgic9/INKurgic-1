const STORAGE_KEYS = {
  users: 'ink_users',
  approvals: 'ink_approvals',
  settings: 'ink_site_settings',
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

function getApprovals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.approvals)) || [];
  } catch {
    return [];
  }
}

function saveApprovals(items) {
  localStorage.setItem(STORAGE_KEYS.approvals, JSON.stringify(items));
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

function renderStats() {
  const users = getUsers();
  const approvals = getApprovals();
  const paidCount = users.filter((u) => u.isPaid).length;
  const followers = users.reduce((sum, user) => sum + (user.followers || 0), 0);

  // Hide seeded/demo users count on deploy — show 0 as requested
  document.getElementById('adminUserCount').textContent = 0;
  document.getElementById('adminPaidCount').textContent = paidCount;
  document.getElementById('adminApprovalCount').textContent = approvals.length;
  document.getElementById('adminFollowerCount').textContent = followers;
}

function renderApprovals() {
  const approvals = getApprovals();
  const container = document.getElementById('approvalsList');
  container.innerHTML = '';

  if (!approvals.length) {
    container.innerHTML = '<p style="color:#666;">No payment records yet.</p>';
    return;
  }

  approvals
    .slice()
    .reverse()
    .forEach((record) => {
      const row = document.createElement('div');
      row.className = 'approval-item';
      row.innerHTML = `
            <div>
                <strong>${escapeHtml(record.username)}</strong>
                <div style="color:#777; font-size:13px;">Plan: ${escapeHtml(
                  record.planId
                )} • ${new Date(record.date).toLocaleString()}</div>
                <div style="color:#444;">Status: ${record.approved ? 'Approved' : 'Pending'}</div>
            </div>
        `;
      container.appendChild(row);
    });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderUsers() {
  const users = getUsers();
  const container = document.getElementById('usersList');
  container.innerHTML = '';

  if (!users.length) {
    container.innerHTML = '<p style="color:#666;">No registered writers yet.</p>';
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'user-item';
    row.innerHTML = `
            <div>
                <strong>${escapeHtml(user.displayName || user.username)}</strong>
                <div style="color:#777; font-size:13px;">${escapeHtml(
                  user.email || 'no-email'
                )}</div>
                <div style="color:#777; font-size:13px;">Role: ${
                  user.isAdmin ? 'Admin' : 'Writer'
                }</div>
                <div style="color:#777; font-size:13px;">Paid: ${user.isPaid ? 'Yes' : 'No'}</div>
            </div>
            <div class="actions">
                <button class="btn" onclick="toggleUserPaid('${user.username}')">${
      user.isPaid ? 'Revoke Paid' : 'Mark Paid'
    }</button>
                <button class="btn primary" onclick="toggleAdmin('${user.username}')">${
      user.isAdmin ? 'Remove Admin' : 'Make Admin'
    }</button>
            </div>
        `;
    container.appendChild(row);
  });
}

function loadSettings() {
  const settings = getSiteSettings();
  const hero = document.getElementById('heroText');
  const plan = document.getElementById('planDesc');

  hero.value = settings.heroMessage || 'Every idea is a spark. Write it into existence.';
  plan.value =
    settings.planDescription ||
    'Unlock analytics, priority tools, unlimited uploads, and the support writers need to publish faster.';
}

function saveSettings() {
  const hero = document.getElementById('heroText').value;
  const plan = document.getElementById('planDesc').value;

  saveSiteSettings({ heroMessage: hero, planDescription: plan });
  alert('Homepage settings saved. Refresh the main page to see changes.');
}

function toggleUserPaid(username) {
  const users = getUsers().map((user) => {
    if (user.username === username) {
      return { ...user, isPaid: !user.isPaid };
    }
    return user;
  });
  saveUsers(users);
  renderStats();
  renderUsers();
}

function toggleAdmin(username) {
  const users = getUsers().map((user) => {
    if (user.username === username) {
      return { ...user, isAdmin: !user.isAdmin };
    }
    return user;
  });
  saveUsers(users);
  renderUsers();
}

function initAdminPage() {
  renderStats();
  renderApprovals();
  renderUsers();
  loadSettings();

  // Ember inbox
  renderChatUsers();
  document.getElementById('closeConvBtn').addEventListener('click', () => {
    document.getElementById('chatWindow').innerHTML = '<p style="color:#666;">Select a conversation to view messages.</p>';
    document.getElementById('chatReply').style.display = 'none';
  });
  document.getElementById('sendReplyBtn').addEventListener('click', () => {
    const target = document.getElementById('chatWindow').dataset.target;
    const text = document.getElementById('replyText').value.trim();
    if (!target || !text) return;
    const chats = getChats();
    chats[target] = chats[target] || [];
    chats[target].push({ from: 'Ember', text, created: Date.now() });
    saveChats(chats);
    renderConversation(target);
    renderChatUsers();
    document.getElementById('replyText').value = '';
  });


function renderChatUsers() {
  const chats = getChats();
  const container = document.getElementById('chatUsersList');
  container.innerHTML = '';
  const users = Object.keys(chats).sort((a, b) => {
    const lastA = chats[a].length ? chats[a][chats[a].length - 1].created : 0;
    const lastB = chats[b].length ? chats[b][chats[b].length - 1].created : 0;
    return lastB - lastA;
  });
  if (!users.length) {
    container.innerHTML = '<p style="color:#666;">No conversations yet.</p>';
    return;
  }
  users.forEach((u) => {
    const item = document.createElement('div');
    item.className = 'approval-item';
    item.style.cursor = 'pointer';
    item.innerHTML = `<div><strong>${escapeHtml(u)}</strong><div style="font-size:12px;color:#777;">${chats[u].length} messages</div></div>`;
    item.addEventListener('click', () => renderConversation(u));
    container.appendChild(item);
  });
}

function renderConversation(username) {
  const chats = getChats();
  const conv = chats[username] || [];
  const win = document.getElementById('chatWindow');
  win.dataset.target = username;
  win.innerHTML = conv
    .map((m) => {
      const time = new Date(m.created).toLocaleString();
      return `<div style="margin-bottom:10px;"><div style="font-size:13px; font-weight:700;">${escapeHtml(m.from)} <span style=\"font-weight:400; font-size:12px; color:#777;\">${time}</span></div><div style=\"margin-top:6px;\">${escapeHtml(m.text)}</div></div>`;
    })
    .join('') || '<p style="color:#666;">No messages in this conversation.</p>';
  document.getElementById('chatReply').style.display = 'block';
}
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

window.addEventListener('DOMContentLoaded', initAdminPage);
