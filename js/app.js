/* ═══════════════════════════════════════════════════
   CampusConnect — SHARED FRONTEND LOGIC
   This file manages API calls, Authentication, and Common UI Components
   ═══════════════════════════════════════════════════ */

// ── API CONFIGURATION ─────────────────────────────────────
// Backend exists at localhost:5000 during development
const BASE = 'https://campusconnect-backend-1v8l.onrender.com/api';

// ── AUTHENTICATION HELPERS ────────────────────────────────
// Manages Login state and Token storage in the Browser
const Auth = {
  // Returns current user object from storage
  get user() { try { return JSON.parse(localStorage.getItem('cc_user')); } catch { return null; } },
  // Returns the JWT token for API headers
  get token() { return localStorage.getItem('cc_token'); },
  // Check if someone is logged in
  get isLoggedIn() { return !!this.token; },
  // Save credentials after login
  save(user, token) { localStorage.setItem('cc_user', JSON.stringify(user)); localStorage.setItem('cc_token', token); },
  // Wipe session and redirect to home
  clear() { localStorage.removeItem('cc_user'); localStorage.removeItem('cc_token'); window.location.href = '../index.html'; },
};

// ── REUSABLE API CALLER ───────────────────────────────────
// Central function to handle all Fetch requests with error handling
async function api(method, path, body = null, auth = false) {
  const isFormData = body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  
  // Attach token if the endpoint requires authentication
  if (auth && Auth.token) headers['Authorization'] = `Bearer ${Auth.token}`;
  
  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(BASE + path, opts);
    const data = await res.json();
    
    // If server says "Unauthorized", it means the session expired
    if (!res.ok) {
        if (res.status === 401) { Auth.clear(); }
        throw new Error(data.message || 'Request failed');
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// ── ENDPOINT MAPPINGS ─────────────────────────────────────
// All available backend connections in one object
const API = {
  // Account Management
  register: (d) => api('POST', '/auth/register', d),
  login: (d) => api('POST', '/auth/login', d),
  getMe: () => api('GET', '/auth/me', null, true),
  updateInterests: (d) => api('PUT', '/auth/update-interests', d, true),
  updateProfile: (d) => api('PUT', '/auth/update-profile', d, true),

  // Event Management
  getEvents: (q = '') => api('GET', `/events${q}`).then(r => r.events || r),
  getRecommendedEvents: () => api('GET', '/events/recommended', null, true),
  getEvent: (id) => api('GET', `/events/${id}`),
  createEvent: (d) => api('POST', '/events', d, true),
  updateEvent: (id, d) => api('PUT', `/events/${id}`, d, true),
  deleteEvent: (id) => api('DELETE', `/events/${id}`, null, true),
  registerEvent: (id, d) => api('POST', `/events/${id}/register`, d, true),
  unregisterEvent: (id) => api('DELETE', `/events/${id}/register`, null, true),
  getAnnouncements: () => api('GET', '/clubs/announcements/feed', null, true),

  // Club Management
  getClubs: (q = '') => api('GET', `/clubs${q}`, null, Auth.isLoggedIn).then(r => r.clubs || r),
  getClub: (id) => api('GET', `/clubs/${id}`, null, Auth.isLoggedIn),
  getMyClub: () => api('GET', '/clubs/my-club', null, true),
  createClub: (d) => api('POST', '/clubs', d, true),
  updateClub: (id, d) => api('PUT', `/clubs/${id}`, d, true),
  followClub: (id) => api('POST', `/clubs/${id}/follow`, null, true),
  unfollowClub: (id) => api('DELETE', `/clubs/${id}/follow`, null, true),

  // SuperAdmin Moderation
  getAnalytics: () => api('GET', '/admin/analytics', null, true),
  getPendingClubs: () => api('GET', '/admin/pending-clubs', null, true),
  approveClub: (id) => api('PUT', `/admin/approve-club/${id}`, null, true),
  adminDeleteClub: (id) => api('DELETE', `/admin/clubs/${id}`, null, true),
  getAllUsers: () => api('GET', '/admin/users', null, true).then(r => r.users || r),
  deleteUser: (id) => api('DELETE', `/admin/users/${id}`, null, true),
  getAdminEvents: () => api('GET', '/admin/events', null, true).then(r => r.events || r),
  adminDeleteEvent: (id) => api('DELETE', `/admin/events/${id}`, null, true),

  // Student Profile Data
  getDashboard: () => api('GET', '/users/dashboard', null, true),

  // In-App Alerts
  getNotifications: () => api('GET', '/notifications', null, true),
  markNotifRead: (id) => api('PUT', `/notifications/${id}/read`, null, true),
  markAllNotifsRead: () => api('PUT', '/notifications/read-all', null, true),
};

// ── UI UI UTILITIES (TOAST) ────────────────────────────────
// Displays floating alerts at the bottom right
function toast(msg, type = 'success') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '📢'}</span><span>${msg}</span>`;
  wrap.appendChild(t);
  
  // Animation: Slide out and remove after 3.2 seconds
  setTimeout(() => { 
    t.style.cssText = 'opacity:0;transform:translateX(80px);transition:all .3s'; 
    setTimeout(() => t.remove(), 300); 
  }, 3200);
}

// ── NAVIGATION BUILDER ─────────────────────────────────────
// Dynamically generates the header menu based on Login status
function buildNav(active = '') {
  const nav = document.getElementById('mainNav'); if (!nav) return;
  const u = Auth.user;
  const links = [
    { label: 'Home', href: '../index.html', key: 'home' },
    { label: 'Events', href: 'events.html', key: 'events' },
    { label: 'Clubs', href: 'clubs.html', key: 'clubs' },
    { label: 'Calendar', href: 'calendar.html', key: 'calendar' },
    { label: 'About', href: 'about.html', key: 'about' },
  ];
  
  nav.innerHTML = `
    <a class="nav-logo" href="../index.html">CampusConnect</a>
    <ul class="nav-links" id="navLinks">
      ${links.map(l => `<li><a href="${l.href}" class="${l.key === active ? 'active' : ''}">${l.label}</a></li>`).join('')}
    </ul>
    <div class="nav-right">
      <div class="icon-btn" id="themeBtn">🌙</div>
      ${u
      ? `<button class="btn btn-sm btn-ghost" style="gap:.4rem" onclick="window.location.href='${u.role === 'clubAdmin' ? 'club-dashboard.html' : u.role === 'superAdmin' ? 'admin.html' : 'dashboard.html'}'">
             <div class="avatar av-sm">${u.name[0].toUpperCase()}</div>${u.name.split(' ')[0]}
           </button>
           <button class="btn btn-sm btn-ghost" onclick="Auth.clear()">Logout</button>`
      : `<a href="login.html" class="btn btn-sm btn-ghost">Login</a>
           <a href="register.html" class="btn btn-sm btn-primary">Sign Up</a>`
    }
      <div class="hamburger" id="ham"><span></span><span></span><span></span></div>
    </div>`;

  // --- Theme Toggler Logic ---
  const theme = localStorage.getItem('cc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '🌙' : '☀️';
  document.getElementById('themeBtn').onclick = () => {
    const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('cc_theme', n);
    document.getElementById('themeBtn').textContent = n === 'dark' ? '🌙' : '☀️';
  };
  
  // Mobile Menu Toggler
  document.getElementById('ham').onclick = () => document.getElementById('navLinks').classList.toggle('open');
}

// ── FOOTER BUILDER ────────────────────────────────────────
function buildFooter() {
  const el = document.getElementById('mainFooter'); if (!el) return;
  el.innerHTML = `<div class="container">
    <div class="footer-grid">
      <div class="footer-brand"><div class="footer-logo-text">CampusConnect</div><p>One Platform. All Clubs. Endless Opportunities.</p></div>
      <div class="footer-col"><h4>Platform</h4><ul><li><a href="events.html">Events</a></li><li><a href="clubs.html">Clubs</a></li><li><a href="register.html">Sign Up</a></li></ul></div>
      <div class="footer-col"><h4>Categories</h4><ul><li><a href="events.html?cat=Hackathons">Hackathons</a></li><li><a href="events.html?cat=Cultural">Cultural</a></li><li><a href="events.html?cat=Technical">Technical</a></li></ul></div>
      <div class="footer-col"><h4>About</h4><ul><li><a href="about.html">About Us</a></li><li><a href="about.html#contact">Contact</a></li></ul></div>
    </div>
    <div class="footer-bottom"><p>© 2025 CampusConnect. Built for students, by students.</p><p>Made with ❤️ for campus life</p></div>
  </div>`;
}

// ── FORMATTING HELPERS ────────────────────────────────────
// Returns a colored CSS class for category badges
function catTag(c) {
  const m = { Technical: 'tag-v', Cultural: 'tag-pk', Sports: 'tag-gn', Hackathons: 'tag-am', Workshops: 'tag-tl', Entrepreneurship: 'tag-am', Arts: 'tag-pk', Other: 'tag-v' };
  return `<span class="tag ${m[c] || 'tag-v'}">${c}</span>`;
}
// Localized date formatting (Indian Standard)
function fDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

// ── STATE INDICATORS ──────────────────────────────────────
function loading(el) { el.innerHTML = `<div style="display:flex;justify-content:center;padding:4rem"><div class="spinner"></div></div>`; }
function empty(el, msg = 'No results found.', icon = '🔍') { el.innerHTML = `<div style="text-align:center;padding:5rem 0;color:var(--tx2)"><div style="font-size:3rem;margin-bottom:1rem">${icon}</div><p>${msg}</p></div>`; }

// ── SCROLL ANIMATION (REVEAL) ─────────────────────────────
// Uses IntersectionObserver to fade in elements as you scroll
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => { 
      if (e.isIntersecting) { 
        setTimeout(() => e.target.classList.add('visible'), i * 70); 
        obs.unobserve(e.target); 
      } 
    });
  }, { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── GLOBAL INITIALIZATION ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme immediately on load
  const theme = localStorage.getItem('cc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  
  buildFooter(); // Inject footer HTML
  initReveal();  // Start scroll watcher
});

// ── UTILITY: LIGHTBOX ─────────────────────────────────────
// Opens an image in a full-screen overlay (Perfect for posters)
window.openLightbox = function(url) {
  if (!url) return;
  const lb = document.createElement('div');
  lb.className = 'lightbox-bg';
  lb.onclick = () => { lb.style.opacity='0'; setTimeout(()=>lb.remove(), 250); };
  lb.innerHTML = `
    <div class="lb-close">✕</div>
    <div class="lb-content">
      <img src="${url}" onclick="event.stopPropagation()" />
    </div>`;
  document.body.appendChild(lb);
  // Trigger animation
  setTimeout(() => lb.style.opacity = '1', 10);
};
