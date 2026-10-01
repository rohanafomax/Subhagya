import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
    sendPasswordResetEmail, updateProfile, GoogleAuthProvider, signInWithPopup
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { auth, configured, whenReady, t, $, $$, esc, friendlyError, applyI18n } from '../app.js';

const params = new URLSearchParams(location.search);
const next = params.get('next') && !params.get('next').includes('//') ? params.get('next') : 'dashboard.html';
let mode = params.get('mode') === 'register' ? 'register' : 'login';

const msg = (html, kind = 'err') => ($('#msg').innerHTML = html ? `<div class="alert alert-${kind}">${html}</div>` : '');

function setMode(m) {
    mode = m;
    $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    $$('[data-only]').forEach(el => (el.hidden = el.dataset.only !== m));
    const btn = $('#submit-btn');
    btn.dataset.i18n = m === 'login' ? 'tab_login' : 'create_account';
    btn.textContent = m === 'login' ? 'Log in' : 'Create account';
    $('#password').autocomplete = m === 'login' ? 'current-password' : 'new-password';
    $('#head-title').innerHTML = m === 'login'
        ? `<span data-i18n="login_welcome">Welcome</span> <em data-i18n="login_back">back</em>`
        : `<span data-i18n="reg_title1">Begin your</span> <em data-i18n="reg_title2">journey</em>`;
    applyI18n();
    msg('');
}

$$('.tabs button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
setMode(mode);

// Already signed in → go on
whenReady().then(m => { if (m) location.replace(next); });

function guard() {
    if (!configured) { msg('Firebase is not set up yet. Add your settings to assets/js/config.js.'); return false; }
    return true;
}

$('#google-btn').addEventListener('click', async () => {
    if (!guard()) return;
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
        location.replace(next);
    } catch (e) { msg(esc(friendlyError(e))); }
});

$('#auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!guard()) return;
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const btn = $('#submit-btn');
    btn.disabled = true;
    try {
        if (mode === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const name = $('#name').value.trim();
            if (!name) throw new Error(t('err_name', 'Please enter your name.'));
            if (password.length < 8) throw { code: 'auth/weak-password' };
            if (!$('#agree').checked) throw new Error(t('err_agree', 'Please accept the Terms and Privacy policy.'));
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
            await sendEmailVerification(cred.user);
        }
        location.replace(next);
    } catch (err) {
        msg(esc(friendlyError(err)));
        btn.disabled = false;
    }
});

$('#forgot').addEventListener('click', async e => {
    e.preventDefault();
    if (!guard()) return;
    const email = $('#email').value.trim();
    if (!email) { msg(t('err_email_first', 'Type your email address above first, then click “Forgot password?”.')); return; }
    try {
        await sendPasswordResetEmail(auth, email);
        msg(t('reset_sent', 'If an account exists for this email, a password reset link has been sent.'), 'ok');
    } catch (err) { msg(esc(friendlyError(err))); }
});
