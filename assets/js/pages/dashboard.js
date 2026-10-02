import {
    doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {
    sendEmailVerification, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
    db, requireAuth, isPremium, t, $, $$, esc, toast, label, ageFrom, fmtDate, toDate, refCode,
    friendlyError, applyI18n, modal, setLang, getLang, logout, markMatchesSeen, updateBadges
} from '../app.js';
import { compressImage } from '../image.js';
import { JOB_BODIES } from '../data.js';
import { isFreeMail } from '../checks.js';
import { sendWorkEmailLink, pendingWorkEmail, syncJobBadge } from '../job.js';

const me = await requireAuth();
const uid = me.user.uid;
const premium = isPremium(me.account);

let profile = null, received = [], sent = [], verification = null, jobCheck = null;
const people = new Map();   // uid → profile (or null if not visible)

$('#hello-name').textContent = me.user.displayName || me.user.email;
$('#plan-line').innerHTML = premium
    ? `<span class="badge badge-premium">★ ${esc(t('premium', 'Premium'))}</span> ${esc(t('until', 'until'))} ${fmtDate(me.account.premiumUntil)}`
    : `${esc(t('free_plan', 'Free membership'))} · <a href="pricing.html" style="color:var(--gold-light)">${esc(t('upgrade', 'Upgrade to Premium'))}</a>`;

async function loadPerson(id) {
    if (people.has(id)) return people.get(id);
    let p = null;
    try { const s = await getDoc(doc(db, 'profiles', id)); p = s.exists() ? s.data() : null; } catch {}
    people.set(id, p);
    return p;
}
async function photoOf(id) {
    try { const s = await getDoc(doc(db, 'photos', `${id}_0`)); return s.exists() ? s.data().data : null; } catch { return null; }
}

async function load() {
    const [p, r, s, v, j] = await Promise.all([
        getDoc(doc(db, 'profiles', uid)),
        getDocs(query(collection(db, 'interests'), where('to', '==', uid))),
        getDocs(query(collection(db, 'interests'), where('from', '==', uid))),
        getDoc(doc(db, 'verifications', uid)),
        getDoc(doc(db, 'jobChecks', uid)).catch(() => null)
    ]);
    profile = p.exists() ? p.data() : null;
    jobCheck = j?.exists() ? j.data() : null;
    // work email confirmed on another device? switch the badge on now
    if (await syncJobBadge(uid, profile).catch(() => false)) toast(t('job_ok_toast', 'Job verified ✓'));
    const sortNew = (a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0);
    received = r.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortNew);
    sent = s.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortNew);
    verification = v.exists() ? v.data() : null;
}

function renderAlerts() {
    const a = [];
    const params = new URLSearchParams(location.search);
    if (params.get('saved')) a.push(`<div class="alert alert-ok">${esc(t('saved_review', 'Thank you! Your profile was submitted. Our team reviews new profiles, usually within 24 hours.'))}</div>`);
    if (!me.user.emailVerified) {
        a.push(`<div class="alert alert-info">${esc(t('verify_email', 'Please verify your email address. We sent a link to'))} <b>${esc(me.user.email)}</b>.
            <div class="mt-1">${esc(t('check_spam', 'Not in your inbox? Check the Spam / Junk folder — Yahoo and Hotmail often put it there. Mark it “Not spam”.'))}</div>
            <div class="row mt-1"><button class="btn btn-sm btn-maroon" id="resend">${esc(t('resend', 'Resend email'))}</button>
            <button class="btn btn-sm btn-ghost" id="recheck">${esc(t('verified_done', "I've verified — continue"))}</button></div></div>`);
    } else if (!profile) {
        a.push(`<div class="alert alert-info">${esc(t('no_profile', 'You have not created your marriage proposal yet.'))} <a class="btn btn-sm btn-maroon" href="my-profile.html" style="margin-left:.5rem">${esc(t('create_profile', 'Create profile'))}</a></div>`);
    } else if (profile.status === 'pending') {
        a.push(`<div class="alert alert-info">${esc(t('pending_note', 'Your profile is waiting for review. It will appear in search once approved.'))}</div>`);
    } else if (profile.status === 'rejected') {
        a.push(`<div class="alert alert-err">${esc(t('rejected_note', 'Your profile needs changes before it can be shown.'))} ${profile.rejectReason ? '<b>' + esc(profile.rejectReason) + '</b>' : ''} <a href="my-profile.html">${esc(t('edit_profile', 'Edit profile'))}</a></div>`);
    }
    $('#alerts').innerHTML = a.join('');
    $('#resend')?.addEventListener('click', async () => {
        try { await sendEmailVerification(me.user); toast(t('sent', 'Email sent. Check your inbox and spam folder.')); }
        catch (e) { toast(friendlyError(e), true); }
    });
    $('#recheck')?.addEventListener('click', async () => {
        await me.user.reload();
        if (me.user.emailVerified) { await me.user.getIdToken(true); location.reload(); }
        else toast(t('not_yet', 'Not verified yet. Please click the link in the email.'), true);
    });
}

const STATUS_EN = { none: 'Not created', pending: 'In review', approved: 'Live', rejected: 'Needs changes', hidden: 'Hidden' };
const statusLabel = st => t('status_' + st, STATUS_EN[st] || st);

function renderStats() {
    const pending = received.filter(i => i.status === 'pending').length;
    const matches = [...received, ...sent].filter(i => i.status === 'accepted').length;
    const st = profile ? profile.status : 'none';
    $('#stats').innerHTML = `
        <div class="stat"><b><span class="badge badge-${esc(st)}">${esc(statusLabel(st))}</span></b><span>${esc(t('profile_status', 'Profile status'))}</span></div>
        <div class="stat"><b>${pending}</b><span>${esc(t('new_interests', 'New interests'))}</span></div>
        <div class="stat"><b>${matches}</b><span>${esc(t('tab_matches', 'Matches'))}</span></div>
        <div class="stat"><b>${profile?.verified ? '✓' : '—'}</b><span>${esc(t('id_verified', 'ID verified'))}</span></div>`;
    const c = $('#c-received');
    c.hidden = !pending; c.textContent = pending;
}

async function personRow(otherId, extra) {
    const p = await loadPerson(otherId);
    const img = p && (await photoOf(otherId));
    const name = p ? esc(p.firstName) : esc(t('profile_unavailable', 'Profile not available'));
    const meta = p ? [ageFrom(p.dob) + ' ' + t('yrs', 'yrs'), label('religion', p.religion), label('district', p.district), p.profession].filter(Boolean).map(esc).join(' · ') : '';
    return `<div class="list-row">
        <div class="avatar">${img ? `<img src="${img}" alt="">` : name.charAt(0)}</div>
        <div class="info"><strong>${p ? `<a href="profile.html?id=${otherId}">${name}</a>` : name}</strong> <span class="muted">${refCode(otherId)}</span><div class="muted">${meta}</div></div>
        ${extra}
    </div>`;
}

const tabs = {
    async received() {
        if (!received.length) return empty(t('none_received', 'No interests yet. A complete profile with good photos gets more interest.'));
        const rows = await Promise.all(received.map(i => personRow(i.from, i.status === 'pending'
            ? `<div class="row"><button class="btn btn-sm btn-maroon" data-accept="${i.id}">${esc(t('accept', 'Accept'))}</button><button class="btn btn-sm btn-ghost" data-decline="${i.id}">${esc(t('decline', 'Decline'))}</button></div>`
            : `<span class="badge badge-${i.status}">${esc(t('st_' + i.status, i.status))}</span>`)));
        return rows.join('');
    },
    async sent() {
        if (!sent.length) return empty(t('none_sent', 'You have not sent any interests yet.') + ` <a href="browse.html">${esc(t('nav_browse', 'Browse'))}</a>`);
        const rows = await Promise.all(sent.map(i => personRow(i.to,
            `<span class="badge badge-${i.status}">${esc(t('st_' + i.status, i.status))}</span>` +
            (i.status === 'pending' ? ` <button class="btn btn-sm btn-ghost" data-withdraw="${i.id}">${esc(t('withdraw', 'Withdraw'))}</button>` : ''))));
        return rows.join('');
    },
    async matches() {
        const list = [...received.map(i => ({ ...i, other: i.from })), ...sent.map(i => ({ ...i, other: i.to }))].filter(i => i.status === 'accepted');
        if (!list.length) return empty(t('none_matches', 'When someone accepts your interest (or you accept theirs) they appear here.'));
        const note = premium ? '' : `<div class="alert alert-info">${esc(t('match_upgrade', 'Upgrade to Premium to see phone numbers and contact details of your matches.'))} <a href="pricing.html">${esc(t('upgrade', 'Upgrade to Premium'))}</a></div>`;
        const rows = await Promise.all(list.map(i => personRow(i.other, `<a class="btn btn-sm btn-gold" href="profile.html?id=${i.other}">${esc(premium ? t('view_contact', 'View contact') : t('view', 'View'))}</a>`)));
        return note + rows.join('');
    },
    async shortlist() {
        const list = me.account.shortlist || [];
        if (!list.length) return empty(t('none_shortlist', 'Tap “Add to shortlist” on any profile to save it here.'));
        const rows = await Promise.all(list.map(id => personRow(id, `<a class="btn btn-sm btn-ghost" href="profile.html?id=${id}">${esc(t('view', 'View'))}</a>`)));
        return rows.join('');
    },
    async profile() {
        if (!profile) return `<div class="empty"><p>${esc(t('no_profile', 'You have not created your marriage proposal yet.'))}</p><a class="btn btn-maroon mt-2" href="my-profile.html">${esc(t('create_profile', 'Create profile'))}</a></div>`;
        return `${await personRow(uid, `<span class="badge badge-${profile.status}">${esc(statusLabel(profile.status))}</span>`)}
            <div class="row mt-2">
                <a class="btn btn-maroon" href="my-profile.html">${esc(t('edit_profile', 'Edit profile'))}</a>
                <a class="btn btn-ghost" href="profile.html?id=${uid}">${esc(t('preview', 'Preview'))}</a>
                ${profile.status === 'hidden'
                    ? `<button class="btn btn-ghost" id="unhide">${esc(t('unhide', 'Show my profile again'))}</button>`
                    : `<button class="btn btn-ghost" id="hide">${esc(t('hide', 'Hide my profile'))}</button>`}
            </div>
            <p class="muted mt-2">${esc(t('hide_note', 'Hiding removes you from search (e.g. while talking to a match). Showing it again sends it for a quick review.'))}</p>`;
    },
    async verify() {
        return `<h3>${esc(t('id_check', 'ID verification'))}</h3>${idSection()}
            <h3 class="mt-3">${esc(t('job_check', 'Job verification'))} <span class="muted" style="font-size:.8rem">(${esc(t('optional', 'optional'))})</span></h3>${jobSection()}`;
    },
    async settings() {
        return `
            <div class="list-row"><div class="info"><strong>${esc(t('language', 'Language'))}</strong><div class="muted">English / සිංහල</div></div>
                <button class="btn btn-sm btn-ghost" id="lang-toggle">${getLang() === 'si' ? 'English' : 'සිංහල'}</button></div>
            <div class="list-row"><div class="info"><strong>${esc(t('membership', 'Membership'))}</strong><div class="muted">${premium ? esc(t('premium', 'Premium')) + ' · ' + fmtDate(me.account.premiumUntil) : esc(t('free_plan', 'Free membership'))}</div></div>
                <a class="btn btn-sm btn-gold" href="pricing.html">${esc(premium ? t('extend', 'Extend') : t('upgrade', 'Upgrade to Premium'))}</a></div>
            ${me.user.providerData.some(p => p.providerId === 'password') ? `
            <div class="list-row"><div class="info"><strong>${esc(t('change_pw', 'Change password'))}</strong><div class="muted">${esc(t('change_pw_note', 'Use a password you do not use anywhere else.'))}</div></div>
                <button class="btn btn-sm btn-ghost" id="pw-btn">${esc(t('change', 'Change'))}</button></div>` : ''}
            <div class="list-row"><div class="info"><strong>${esc(t('nav_logout', 'Log out'))}</strong></div>
                <button class="btn btn-sm btn-ghost" id="logout-btn">${esc(t('nav_logout', 'Log out'))}</button></div>
            <div class="list-row"><div class="info"><strong>${esc(t('delete_account', 'Delete my account'))}</strong><div class="muted">${esc(t('delete_note', 'Permanently removes your profile, photos and contact details.'))}</div></div>
                <button class="btn btn-sm btn-danger" id="delete-btn">${esc(t('delete', 'Delete'))}</button></div>`;
    }
};

function idSection() {
    if (profile?.verified) return `<div class="alert alert-ok">✓ ${esc(t('verified_ok', 'Your identity is verified. A blue “ID verified” badge appears on your profile.'))}</div>`;
    if (verification?.status === 'pending') return `<div class="alert alert-info">${esc(t('verify_pending', 'Your documents were received and are being checked. This usually takes 1–2 days.'))}</div>`;
    const rejected = verification?.status === 'rejected' ? `<div class="alert alert-err">${esc(t('verify_rejected', 'We could not verify the last upload.'))} ${esc(verification.note || '')}</div>` : '';
    return `${rejected}
        <p>${esc(t('verify_why', 'Verified profiles get up to 3× more responses. Upload a photo of your NIC (front) and a selfie holding the NIC. We only use these to confirm your identity and delete the images after checking.'))}</p>
        <div class="form-grid mt-2">
            <div class="field"><label>${esc(t('nic_front', 'NIC – front side'))}</label><input type="file" accept="image/*" id="nic"></div>
            <div class="field"><label>${esc(t('selfie', 'Selfie holding your NIC'))}</label><input type="file" accept="image/*" capture="user" id="selfie"></div>
        </div>
        <button class="btn btn-maroon mt-2" id="send-verify" ${profile ? '' : 'disabled'}>${esc(t('submit_verify', 'Submit for verification'))}</button>
        ${profile ? '' : `<p class="muted mt-1">${esc(t('verify_need_profile', 'Create your profile first.'))}</p>`}`;
}

function jobSection() {
    if (!profile) return `<p class="muted">${esc(t('verify_need_profile', 'Create your profile first.'))}</p>`;
    if (profile.jobVerified) {
        return `<div class="alert alert-ok">✓ ${esc(t('job_ok', 'Your job is verified. A “Job verified” badge shows on your profile'))}${profile.jobWorkplace ? ` (${esc(profile.jobWorkplace)})` : ''}.</div>`;
    }
    if (jobCheck?.status === 'pending') return `<div class="alert alert-info">${esc(t('job_pending', 'Your job details were received and are being checked, usually within 1–2 days.'))}</div>`;
    const rejected = jobCheck?.status === 'rejected' ? `<div class="alert alert-err">${esc(t('job_rejected', 'We could not verify your job last time.'))} ${esc(jobCheck.note || '')}</div>` : '';
    const sentTo = pendingWorkEmail();
    return `${rejected}
        <p>${esc(t('job_why', 'A “Job verified” badge shows families your job is genuine, and verified profiles are listed first among similar profiles. Other members only see the badge — never your documents or numbers. Choose one way:'))}</p>

        <div class="card mt-2" style="box-shadow:none">
            <strong>1. ${esc(t('job_m1', 'Work email — instant'))}</strong>
            <p class="muted">${esc(t('job_m1_note', 'If you have an email at your workplace (e.g. name@company.lk, name@health.gov.lk), we send a link to it. Click it and you are verified immediately. Personal emails like Gmail or Yahoo are not accepted. Only the workplace name (e.g. “company.lk”) is shown.'))}</p>
            ${sentTo ? `<div class="alert alert-info">${esc(t('job_m1_sent', 'Link sent to'))} <b>${esc(sentTo)}</b>. ${esc(t('job_m1_check', 'Open that inbox (check Spam too) and click the link.'))}</div>` : ''}
            <div class="row"><div class="field" style="flex:1;min-width:220px"><input id="work-email" type="email" placeholder="name@yourworkplace.lk" autocomplete="off"></div>
                <button class="btn btn-maroon" id="send-work-link">${esc(t('job_send_link', 'Send link'))}</button></div>
        </div>

        <div class="card mt-2" style="box-shadow:none">
            <strong>2. ${esc(t('job_m2', 'Professional registration number'))}</strong>
            <p class="muted">${esc(t('job_m2_note', 'For doctors, engineers, lawyers and accountants. We check the number on the official public register, then delete it. No documents needed.'))}</p>
            <div class="form-grid">
                <div class="field"><select id="job-body">${JOB_BODIES.map(b => `<option value="${b.v}">${esc(b.en)}</option>`).join('')}</select></div>
                <div class="field"><input id="job-number" placeholder="${esc(t('job_reg_no', 'Registration number'))}" maxlength="40"></div>
            </div>
            <button class="btn btn-maroon mt-1" id="send-job-number">${esc(t('submit', 'Submit'))}</button>
        </div>

        <div class="card mt-2" style="box-shadow:none">
            <strong>3. ${esc(t('job_m3', 'Staff ID card or business registration'))}</strong>
            <p class="muted">${esc(t('job_m3_note', 'A photo of your staff ID card, or business registration (BR) if you run a business. Please cover your ID number, address and any salary details first — we only need your name, workplace and job title. The photo is deleted after checking.'))}</p>
            <div class="field"><input type="file" accept="image/*" id="job-doc"></div>
            <button class="btn btn-maroon mt-1" id="send-job-doc">${esc(t('submit', 'Submit'))}</button>
        </div>`;
}

function empty(html) { return `<div class="empty"><p>${html}</p></div>`; }

let current = 'received';
async function show(tab) {
    current = tab;
    $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('#tab-body').innerHTML = '<div class="spinner"></div>';
    $('#tab-body').innerHTML = await tabs[tab]();
    if (tab === 'matches') markMatchesSeen();
    applyI18n($('#tab-body'));
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));

async function refresh() { await load(); renderAlerts(); renderStats(); await show(current); updateBadges().catch(() => {}); }

$('#tab-body').addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
        if (b.dataset.accept || b.dataset.decline) {
            b.disabled = true;
            await updateDoc(doc(db, 'interests', b.dataset.accept || b.dataset.decline), {
                status: b.dataset.accept ? 'accepted' : 'declined', respondedAt: serverTimestamp()
            });
            toast(b.dataset.accept ? t('accepted_msg', 'Accepted! You can now see each other’s photos.') : t('declined_msg', 'Declined.'));
            await refresh();
        } else if (b.dataset.withdraw) {
            await deleteDoc(doc(db, 'interests', b.dataset.withdraw));
            await refresh();
        } else if (b.id === 'hide' || b.id === 'unhide') {
            await updateDoc(doc(db, 'profiles', uid), { status: b.id === 'hide' ? 'hidden' : 'pending', updatedAt: serverTimestamp() });
            await refresh();
        } else if (b.id === 'send-verify') {
            const nic = $('#nic').files[0], selfie = $('#selfie').files[0];
            if (!nic || !selfie) { toast(t('both_images', 'Please choose both images.'), true); return; }
            b.disabled = true;
            const [a, s] = await Promise.all([compressImage(nic, { maxSide: 1100, maxBytes: 300_000 }), compressImage(selfie, { maxSide: 900, maxBytes: 250_000 })]);
            await setDoc(doc(db, 'verifications', uid), { uid, nic: a, selfie: s, status: 'pending', createdAt: serverTimestamp() });
            toast(t('verify_sent', 'Submitted. We will check it soon.'));
            await refresh();
        } else if (b.id === 'send-work-link') {
            const email = $('#work-email').value.trim().toLowerCase();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast(t('err_email', 'Please enter a valid email address.'), true); return; }
            if (isFreeMail(email)) { toast(t('job_free_mail', 'Please use your workplace email — personal emails like Gmail or Yahoo cannot prove where you work.'), true); return; }
            b.disabled = true;
            try {
                await sendWorkEmailLink(uid, email);
                toast(t('job_link_sent', 'Link sent. Open your work inbox and click it.'));
                await show('verify');
            } catch (err) {
                b.disabled = false;
                if (err.code === 'auth/operation-not-allowed') toast(t('job_link_off', 'Work-email verification is not switched on yet. Please use another method for now.'), true);
                else throw err;
            }
        } else if (b.id === 'send-job-number') {
            const number = $('#job-number').value.trim();
            if (number.length < 3) { toast(t('job_need_number', 'Please enter your registration number.'), true); return; }
            b.disabled = true;
            await setDoc(doc(db, 'jobChecks', uid), {
                uid, method: 'register', body: $('#job-body').value, number, status: 'pending', createdAt: serverTimestamp()
            });
            toast(t('job_sent', 'Submitted. We will check it soon.'));
            await refresh();
        } else if (b.id === 'send-job-doc') {
            const file = $('#job-doc').files[0];
            if (!file) { toast(t('job_need_doc', 'Please choose a photo.'), true); return; }
            b.disabled = true;
            const image = await compressImage(file, { maxSide: 1200, maxBytes: 350_000 });
            await setDoc(doc(db, 'jobChecks', uid), { uid, method: 'document', image, status: 'pending', createdAt: serverTimestamp() });
            toast(t('job_sent', 'Submitted. We will check it soon.'));
            await refresh();
        } else if (b.id === 'lang-toggle') {
            setLang(getLang() === 'si' ? 'en' : 'si');
        } else if (b.id === 'logout-btn') {
            logout();
        } else if (b.id === 'delete-btn') {
            confirmDelete();
        } else if (b.id === 'pw-btn') {
            changePassword();
        }
    } catch (err) { toast(friendlyError(err), true); b.disabled = false; }
});

function changePassword() {
    const m = modal(`<h3>${esc(t('change_pw', 'Change password'))}</h3>
        <div class="field"><label>${esc(t('current_pw', 'Current password'))}</label><input type="password" id="pw-old" autocomplete="current-password"></div>
        <div class="field mt-1"><label>${esc(t('new_pw', 'New password'))}</label><input type="password" id="pw-new" autocomplete="new-password" minlength="8"></div>
        <div class="field mt-1"><label>${esc(t('new_pw2', 'New password again'))}</label><input type="password" id="pw-new2" autocomplete="new-password"></div>
        <p class="muted mt-1">${esc(t('pw_hint', 'At least 8 characters.'))}</p>
        <div class="row mt-2"><button class="btn btn-ghost" data-close>${esc(t('cancel', 'Cancel'))}</button><span class="spacer"></span><button class="btn btn-maroon" id="pw-save">${esc(t('save', 'Save'))}</button></div>`);
    m.querySelector('#pw-save').addEventListener('click', async e => {
        const oldPw = m.querySelector('#pw-old').value, pw = m.querySelector('#pw-new').value;
        if (pw.length < 8) { toast(t('err_weak', 'Password must be at least 8 characters.'), true); return; }
        if (pw !== m.querySelector('#pw-new2').value) { toast(t('pw_mismatch', 'The new passwords do not match.'), true); return; }
        if (pw === oldPw) { toast(t('pw_same', 'Choose a different password from your current one.'), true); return; }
        e.target.disabled = true;
        try {
            await reauthenticateWithCredential(me.user, EmailAuthProvider.credential(me.user.email, oldPw));
            await updatePassword(me.user, pw);
            m.remove();
            toast(t('pw_changed', 'Password changed.'));
        } catch (err) {
            toast(friendlyError(err), true);
            e.target.disabled = false;
        }
    });
}

function confirmDelete() {
    const m = modal(`<h3>${esc(t('delete_account', 'Delete my account'))}</h3>
        <p>${esc(t('delete_confirm', 'This permanently deletes your profile, photos, contact details and interests. This cannot be undone. Type DELETE to confirm.'))}</p>
        <div class="field mt-2"><input id="del-confirm" autocomplete="off"></div>
        <div class="row mt-2"><button class="btn btn-ghost" data-close>${esc(t('cancel', 'Cancel'))}</button><span class="spacer"></span><button class="btn btn-danger" id="del-go">${esc(t('delete', 'Delete'))}</button></div>`);
    m.querySelector('#del-go').addEventListener('click', async () => {
        if (m.querySelector('#del-confirm').value.trim().toUpperCase() !== 'DELETE') return;
        try {
            for (let i = 0; i < 3; i++) await deleteDoc(doc(db, 'photos', `${uid}_${i}`)).catch(() => {});
            for (const i of [...received, ...sent]) await deleteDoc(doc(db, 'interests', i.id)).catch(() => {});
            await deleteDoc(doc(db, 'verifications', uid)).catch(() => {});
            await deleteDoc(doc(db, 'jobChecks', uid)).catch(() => {});
            await deleteDoc(doc(db, 'jobEmailRequests', uid)).catch(() => {});
            const je = await getDoc(doc(db, 'jobEmails', uid)).catch(() => null);
            if (je?.exists()) await deleteDoc(doc(db, 'jobEmailIndex', je.data().email)).catch(() => {});
            await deleteDoc(doc(db, 'jobEmails', uid)).catch(() => {});
            await deleteDoc(doc(db, 'contacts', uid)).catch(() => {});
            await deleteDoc(doc(db, 'profiles', uid)).catch(() => {});
            await deleteDoc(doc(db, 'users', uid)).catch(() => {});
            await deleteUser(me.user);
            location.href = 'index.html';
        } catch (err) {
            if (err.code === 'auth/requires-recent-login') toast(t('relogin', 'For security, please log out, log in again, then delete.'), true);
            else toast(friendlyError(err), true);
        }
    });
}

try { await refresh(); } catch (err) { toast(friendlyError(err), true); }
