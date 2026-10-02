// Job verification helpers.
//
// Work-email route (automatic): the member records the work email they want to verify
// (jobEmailRequests/{uid}), then Firebase emails a sign-in link to that address. Opening
// the link signs in to a *separate* Firebase app instance as the work-email address,
// which proves the member controls it, and writes jobEmails/{uid}. The security rules
// only accept that write when the email matches the member's request, is not a free
// email provider, and has not been used for another profile.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, sendSignInLinkToEmail } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
    getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';
import { db } from './app.js';

let jobApp;
/** A second Firebase app, so signing in as the work email never touches the member's own login. */
export function jobFirebase() {
    jobApp ||= initializeApp(firebaseConfig, 'job-check');
    return { auth: getAuth(jobApp), db: getFirestore(jobApp) };
}

const STORE_KEY = 'jobEmailPending';

/** Step 1 (member is logged in): record the request and email the link. */
export async function sendWorkEmailLink(uid, email) {
    email = email.trim().toLowerCase();
    await setDoc(doc(db, 'jobEmailRequests', uid), { uid, email, createdAt: serverTimestamp() });
    const url = new URL('verify-job.html', location.href);
    url.search = '?uid=' + encodeURIComponent(uid);
    await sendSignInLinkToEmail(jobFirebase().auth, email, { url: url.href, handleCodeInApp: true });
    try { localStorage.setItem(STORE_KEY, email); } catch {}
}

export function pendingWorkEmail() {
    try { return localStorage.getItem(STORE_KEY) || ''; } catch { return ''; }
}
export function clearPendingWorkEmail() {
    try { localStorage.removeItem(STORE_KEY); } catch {}
}

/**
 * If the work email was confirmed (possibly on another device) but the profile
 * doesn't show the badge yet, switch it on. Returns true when it changed something.
 */
export async function syncJobBadge(uid, profile) {
    if (!profile || profile.jobVerified) return false;
    const snap = await getDoc(doc(db, 'jobEmails', uid)).catch(() => null);
    if (!snap?.exists()) return false;
    await updateDoc(doc(db, 'profiles', uid), { jobVerified: true, jobVia: 'email', jobWorkplace: snap.data().domain });
    profile.jobVerified = true;
    profile.jobVia = 'email';
    profile.jobWorkplace = snap.data().domain;
    return true;
}

/** Short public text for the badge, e.g. "works at slt.lk" or "SLMC registered". */
export function jobBadgeText(p, t) {
    if (!p?.jobVerified) return '';
    if (p.jobVia === 'email' && p.jobWorkplace) return `${t('job_verified', 'Job verified')} · ${p.jobWorkplace}`;
    return t('job_verified', 'Job verified');
}
