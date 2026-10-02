import { isSignInWithEmailLink, signInWithEmailLink, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { doc, getDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, whenReady, t, $, esc, friendlyError } from '../app.js';
import { jobFirebase, pendingWorkEmail, clearPendingWorkEmail, syncJobBadge } from '../job.js';

const box = $('#box');
const uid = new URLSearchParams(location.search).get('uid') || '';
const { auth: jobAuth, db: jobDb } = jobFirebase();

const done = html => (box.innerHTML = html);
const fail = msg => done(`<div class="alert alert-err">${esc(msg)}</div>
    <a class="btn btn-outline mt-1" href="dashboard.html">${esc(t('nav_dashboard', 'My Account'))}</a>`);

async function confirm(email) {
    box.innerHTML = '<div class="spinner"></div>';
    try {
        const cred = await signInWithEmailLink(jobAuth, email, location.href);
        const workEmail = cred.user.email.toLowerCase();
        const domain = workEmail.split('@')[1];

        // one atomic write: claim this work email for this profile, and record the verification
        const batch = writeBatch(jobDb);
        batch.set(doc(jobDb, 'jobEmailIndex', workEmail), { uid, createdAt: serverTimestamp() });
        batch.set(doc(jobDb, 'jobEmails', uid), { uid, email: workEmail, domain, createdAt: serverTimestamp() });
        await batch.commit();
        await signOut(jobAuth);
        clearPendingWorkEmail();

        // if the member is logged in here too, switch the badge on straight away
        const m = await whenReady();
        if (m && m.user.uid === uid) {
            const p = await getDoc(doc(db, 'profiles', uid)).then(s => (s.exists() ? s.data() : null)).catch(() => null);
            await syncJobBadge(uid, p).catch(() => {});
        }
        done(`<div class="alert alert-ok">✓ ${esc(t('vj_ok', 'Your job is verified. A “Job verified” badge now shows on your profile with your workplace'))}: <b>${esc(domain)}</b></div>
            <p class="muted">${esc(t('vj_ok_note', 'Only the workplace name is shown — never your work email.'))}</p>
            <a class="btn btn-maroon mt-1" href="dashboard.html">${esc(t('nav_dashboard', 'My Account'))}</a>`);
    } catch (e) {
        await signOut(jobAuth).catch(() => {});
        if (e?.code === 'permission-denied') {
            fail(t('vj_denied', 'This work email could not be used. It may be a personal email (Gmail, Yahoo…), already verified for another profile, or different from the one you entered. Please try again from My Account → Verification.'));
        } else if (e?.code === 'auth/invalid-action-code' || e?.code === 'auth/expired-action-code') {
            fail(t('vj_expired', 'This link has expired or was already used. Please send a new one from My Account → Verification.'));
        } else {
            fail(friendlyError(e));
        }
    }
}

if (!uid || !isSignInWithEmailLink(jobAuth, location.href)) {
    fail(t('vj_bad_link', 'This page only works from the link in your work email.'));
} else if (pendingWorkEmail()) {
    confirm(pendingWorkEmail());
} else {
    // link opened on a different device or browser: ask which address it was sent to
    done(`<p>${esc(t('vj_which', 'Please type the work email address this link was sent to.'))}</p>
        <form id="f" class="mt-2"><div class="field"><input id="em" type="email" required autocomplete="email"></div>
        <button class="btn btn-maroon mt-1">${esc(t('vj_confirm', 'Confirm'))}</button></form>`);
    $('#f').addEventListener('submit', e => { e.preventDefault(); confirm($('#em').value.trim().toLowerCase()); });
}
