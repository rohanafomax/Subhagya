// ==========================================================
//  Core: Firebase, auth state, nav/footer, i18n, helpers
// ==========================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
    getAuth, onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
    getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig, SITE_CONTACT } from './config.js';
import { SI } from './i18n.js';
import { lists } from './data.js';

export const configured = !String(firebaseConfig.apiKey).startsWith('PASTE');
export const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured ? getFirestore(app) : null;

// ───────── i18n ─────────
export function getLang() {
    try { return localStorage.getItem('lang') || 'en'; } catch { return 'en'; }
}
export function setLang(l) {
    try { localStorage.setItem('lang', l); } catch {}
    location.reload();
}
/** t('key', 'English text') → Sinhala when selected and available. */
export function t(key, en) {
    return getLang() === 'si' && SI[key] ? SI[key] : en;
}
export function applyI18n(root = document) {
    document.documentElement.lang = getLang();
    if (getLang() !== 'si') return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
        const s = SI[el.dataset.i18n];
        if (s) el.textContent = s;
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const s = SI[el.dataset.i18nPh];
        if (s) el.placeholder = s;
    });
}
/** Label for a stored option value, e.g. label('religion', 'Buddhist'). */
export function label(list, v) {
    const o = (lists[list] || []).find(x => x.v === v);
    if (!o) return v || '—';
    return getLang() === 'si' ? o.si : o.en;
}
/** Fill a <select> with options from a list. */
export function fillSelect(sel, list, { any } = {}) {
    const items = lists[list] || [];
    sel.innerHTML = (any ? `<option value="">${esc(any)}</option>` : '<option value="">—</option>') +
        items.map(o => `<option value="${esc(o.v)}">${esc(getLang() === 'si' ? o.si : o.en)}</option>`).join('');
}

// ───────── helpers ─────────
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function toast(msg, isErr = false) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.toggle('err', isErr);
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3800);
}
export function ageFrom(dob) {
    if (!dob) return null;
    const d = new Date(dob), n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--;
    return a;
}
export function heightLabel(cm) {
    if (!cm) return '—';
    const inches = Math.round(cm / 2.54);
    return `${Math.floor(inches / 12)}' ${inches % 12}" (${cm} cm)`;
}
/** Short public reference like SB-4F7K2 so people can quote a profile. */
export function refCode(uid) { return 'SB-' + String(uid).slice(0, 5).toUpperCase(); }
export function toDate(ts) { return ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null; }
export function fmtDate(ts) {
    const d = toDate(ts);
    return d ? d.toLocaleDateString(getLang() === 'si' ? 'si-LK' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}
export function friendlyError(e) {
    const code = e?.code || '';
    const map = {
        'auth/invalid-credential': t('err_cred', 'Wrong email or password.'),
        'auth/wrong-password': t('err_cred', 'Wrong email or password.'),
        'auth/user-not-found': t('err_cred', 'Wrong email or password.'),
        'auth/email-already-in-use': t('err_inuse', 'An account with this email already exists. Please log in.'),
        'auth/weak-password': t('err_weak', 'Password must be at least 8 characters.'),
        'auth/invalid-email': t('err_email', 'Please enter a valid email address.'),
        'auth/too-many-requests': t('err_many', 'Too many attempts. Please wait a few minutes and try again.'),
        'auth/popup-closed-by-user': t('err_popup', 'Sign-in window was closed.'),
        'auth/network-request-failed': t('err_net', 'Network problem. Check your connection.'),
        'permission-denied': t('err_perm', 'You do not have permission to do that.')
    };
    console.error(e);
    return map[code] || e?.message || String(e);
}
export function modal(html) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-close]')) back.remove(); });
    document.body.appendChild(back);
    applyI18n(back);
    return back;
}

// ───────── auth state ─────────
let _me = null;            // { user, account }  account = users/{uid} doc data
let _resolve;
const ready = new Promise(r => (_resolve = r));

/** Resolves once Firebase knows whether someone is signed in. */
export function whenReady() { return ready; }
export function me() { return _me; }
export function isPremium(account) {
    const until = toDate(account?.premiumUntil);
    return account?.plan === 'premium' && until && until > new Date();
}

async function loadAccount(user) {
    const ref = doc(db, 'users', user.uid);
    let snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            email: user.email || '',
            displayName: user.displayName || '',
            role: 'member',
            plan: 'free',
            premiumUntil: null,
            createdAt: serverTimestamp()
        });
        snap = await getDoc(ref);
    }
    return snap.data();
}

if (configured) {
    onAuthStateChanged(auth, async user => {
        if (user) {
            try { _me = { user, account: await loadAccount(user) }; }
            catch (e) { console.error(e); _me = { user, account: { role: 'member', plan: 'free' } }; }
        } else {
            _me = null;
        }
        renderNavAuth();
        _resolve(_me);
        if (_me) updateBadges().catch(e => console.warn('badges', e));
    });
} else {
    _resolve(null);
}

/** Use on pages that need a signed-in user. Redirects to login otherwise. */
export async function requireAuth({ verified = false, admin = false } = {}) {
    const m = await whenReady();
    if (!m) {
        location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
        return new Promise(() => {});
    }
    if (admin && m.account.role !== 'admin') {
        location.href = 'dashboard.html';
        return new Promise(() => {});
    }
    if (verified && !m.user.emailVerified) {
        location.href = 'dashboard.html';
        return new Promise(() => {});
    }
    return m;
}

export async function logout() {
    await signOut(auth);
    location.href = 'index.html';
}

// ───────── shared chrome ─────────
const LOGO_SVG = `<svg viewBox="-100 -100 200 200" aria-hidden="true"><g fill="#6e0c1f"><circle r="16"/>${
    Array.from({ length: 8 }, (_, i) => `<ellipse cx="0" cy="-55" rx="18" ry="38" transform="rotate(${i * 45})"/>`).join('')
}</g><circle r="9" fill="#d4af37"/></svg>`;

function renderChrome() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const navHost = document.getElementById('site-nav');
    if (navHost) {
        navHost.outerHTML = `
        <nav class="site-nav" id="nav">
            <a href="index.html" class="logo" aria-label="Saubhagya home">
                ${LOGO_SVG}
                <div><div class="logo-text">Saubhagya</div><div class="logo-sub si">ශ්‍රී ලංකා මංගල යෝජනා</div></div>
            </a>
            <ul class="nav-links" id="nav-links">
                <li><a href="browse.html" data-i18n="nav_browse" class="${page === 'browse.html' ? 'active' : ''}">Browse</a></li>
                <li><a href="index.html#why-us" data-i18n="nav_why">Why Us</a></li>
                <li><a href="pricing.html" data-i18n="nav_pricing" class="${page === 'pricing.html' ? 'active' : ''}">Membership</a></li>
                <li data-auth="in" hidden><a href="dashboard.html" data-i18n="nav_dashboard" class="${page === 'dashboard.html' ? 'active' : ''}">My Account</a></li>
                <li data-auth="admin" hidden><a href="admin.html" data-i18n="nav_admin">Admin</a></li>
                <li data-auth="in" hidden><a href="#" data-logout data-i18n="nav_logout">Log out</a></li>
                <li data-auth="out"><a href="login.html" data-i18n="nav_login">Log in</a></li>
                <li data-auth="out" class="mobile-only"><a href="login.html?mode=register" data-i18n="nav_register">Register Free</a></li>
            </ul>
            <div class="nav-actions">
                <button class="lang-btn" id="lang-btn" type="button">${getLang() === 'si' ? 'English' : 'සිංහල'}</button>
                <a href="login.html?mode=register" class="btn btn-gold nav-cta" data-auth="out" data-i18n="nav_register">Register Free</a>
                <a href="dashboard.html" class="btn btn-gold nav-cta" data-auth="in" hidden data-i18n="nav_dashboard">My Account</a>
                <button class="menu-btn" id="menu-btn" type="button" aria-label="Menu" aria-expanded="false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                </button>
            </div>
        </nav>
        ${configured ? '' : '<div class="config-banner">Setup needed: paste your Firebase settings into <b>assets/js/config.js</b> to enable accounts and profiles.</div>'}`;

        const nav = document.getElementById('nav');
        const links = document.getElementById('nav-links');
        const btn = document.getElementById('menu-btn');
        const setH = () => document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
        setH(); addEventListener('resize', setH);
        btn.addEventListener('click', () => {
            const open = links.classList.toggle('open');
            btn.setAttribute('aria-expanded', open);
        });
        links.addEventListener('click', e => { if (e.target.closest('a')) links.classList.remove('open'); });
        document.getElementById('lang-btn').addEventListener('click', () => setLang(getLang() === 'si' ? 'en' : 'si'));
        document.addEventListener('click', e => {
            if (e.target.closest('[data-logout]')) { e.preventDefault(); logout(); }
        });
    }

    const footHost = document.getElementById('site-footer');
    if (footHost) {
        footHost.outerHTML = `
        <footer class="site-footer">
            <div class="footer-grid">
                <div>
                    <div class="footer-logo">Saubhagya</div>
                    <p data-i18n="foot_about">Sri Lanka's matrimony platform for professionals, combining traditional matchmaking values with modern technology. Safe, private, and built for families.</p>
                </div>
                <div>
                    <h4 data-i18n="foot_explore">Explore</h4>
                    <ul>
                        <li><a href="browse.html" data-i18n="nav_browse">Browse</a></li>
                        <li><a href="pricing.html" data-i18n="nav_pricing">Membership</a></li>
                        <li><a href="safety.html" data-i18n="foot_safety">Safety tips</a></li>
                    </ul>
                </div>
                <div>
                    <h4 data-i18n="foot_help">Help</h4>
                    <ul>
                        <li><a href="privacy.html" data-i18n="foot_privacy">Privacy policy</a></li>
                        <li><a href="terms.html" data-i18n="foot_terms">Terms of use</a></li>
                        <li><a href="mailto:${esc(SITE_CONTACT.email)}">${esc(SITE_CONTACT.email)}</a></li>
                        <li><a href="tel:${esc(SITE_CONTACT.phone.replace(/\s/g, ''))}">${esc(SITE_CONTACT.phone)}</a></li>
                    </ul>
                </div>
            </div>
            <p class="copyright">© ${new Date().getFullYear()} Saubhagya Matrimony · Made with ♥ for Sri Lankan families</p>
        </footer>`;
    }
}

function renderNavAuth() {
    const signedIn = !!_me;
    const admin = _me?.account?.role === 'admin';
    $$('[data-auth="in"]').forEach(el => (el.hidden = !signedIn));
    $$('[data-auth="out"]').forEach(el => (el.hidden = signedIn));
    $$('[data-auth="admin"]').forEach(el => (el.hidden = !admin));
}

// ───────── alert badges ─────────
/** When the member last opened the Matches tab (stored on this device). */
export function markMatchesSeen() {
    try { localStorage.setItem('matchesSeen_' + _me.user.uid, String(Date.now())); } catch {}
    updateBadges().catch(() => {});
}

/** Counts new interests/matches (and admin to-dos) and shows them on the menu. */
export async function updateBadges() {
    if (!_me) return;
    const uid = _me.user.uid;
    const count = async q => (await getCountFromServer(q)).data().count;
    const interests = collection(db, 'interests');

    let seen = 0;
    try { seen = Number(localStorage.getItem('matchesSeen_' + uid)) || 0; } catch {}
    const [newInterests, accepted] = await Promise.all([
        count(query(interests, where('to', '==', uid), where('status', '==', 'pending'))),
        getDocs(query(interests, where('from', '==', uid), where('status', '==', 'accepted')))
    ]);
    const newMatches = accepted.docs.filter(d => (toDate(d.data().respondedAt)?.getTime() || 0) > seen).length;
    const mine = newInterests + newMatches;

    let admin = 0;
    if (_me.account.role === 'admin') {
        const c = (coll, field, v) => count(query(collection(db, coll), where(field, '==', v)));
        const n = await Promise.all([c('profiles', 'status', 'pending'), c('payments', 'status', 'pending'),
            c('verifications', 'status', 'pending'), c('reports', 'status', 'open'),
            c('jobChecks', 'status', 'pending').catch(() => 0)]);
        admin = n.reduce((a, b) => a + b, 0);
    }

    const setCount = (sel, n, title) => $$(sel).forEach(a => {
        a.querySelector('.nav-count')?.remove();
        if (n > 0) a.insertAdjacentHTML('beforeend', `<span class="nav-count" title="${esc(title)}">${n > 99 ? '99+' : n}</span>`);
    });
    setCount('a[href="dashboard.html"]', mine, t('badge_mine', 'New interests and matches'));
    setCount('a[href="admin.html"]', admin, 'Items waiting for review');

    const total = mine + admin;
    document.getElementById('menu-btn')?.classList.toggle('has-alert', total > 0);
    document.title = document.title.replace(/^\(\d+\+?\) /, '');
    if (total) document.title = `(${total > 99 ? '99+' : total}) ${document.title}`;
    try { total ? navigator.setAppBadge?.(total) : navigator.clearAppBadge?.(); } catch {}
}

// Reveal-on-scroll for any .reveal element
function initReveal() {
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => io.observe(el));
}

// Shared mandala symbol for <use href="#mandala">
function injectMandala() {
    if (document.getElementById('mandala')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    let inner = '';
    [12, 30, 52, 74, 96].forEach(r => (inner += `<circle r="${r}"/>`));
    for (let i = 0; i < 16; i++) {
        const a = i * 22.5;
        inner += `<path d="M0,-30 C12,-45 12,-62 0,-74 C-12,-62 -12,-45 0,-30Z" transform="rotate(${a})"/>`;
        inner += `<path d="M0,-74 C8,-82 8,-90 0,-96 C-8,-90 -8,-82 0,-74Z" transform="rotate(${a})"/>`;
        inner += `<path d="M0,-12 Q9,-21 0,-30 Q-9,-21 0,-12Z" transform="rotate(${a + 11.25})"/>`;
        inner += `<circle cx="0" cy="-85" r="2.2" transform="rotate(${a + 11.25})"/>`;
    }
    svg.innerHTML = `<defs><symbol id="mandala" viewBox="-100 -100 200 200"><g fill="none" stroke="currentColor" stroke-width="0.8">${inner}</g></symbol></defs>`;
    document.body.prepend(svg);
}

// PWA service worker
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

injectMandala();
renderChrome();
applyI18n();
initReveal();
renderNavAuth();
