import {
    doc, getDoc, getDocs, updateDoc, collection, query, where, serverTimestamp, deleteField, Timestamp, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, requireAuth, $, $$, esc, toast, label, ageFrom, heightLabel, refCode, toDate, fmtDate, friendlyError, modal } from '../app.js';

await requireAuth({ admin: true });

const data = { profiles: [], payments: [], verifications: [], reports: [] };

async function get(path) {
    try { const s = await getDoc(doc(db, ...path)); return s.exists() ? s.data() : null; } catch { return null; }
}
async function photosOf(uid, count = 3) {
    const snaps = await Promise.all(Array.from({ length: count }, (_, i) => get(['photos', `${uid}_${i}`])));
    return snaps.filter(Boolean).map(s => s.data);
}
const byNewest = (a, b) => (toDate(b.createdAt || b.updatedAt) || 0) - (toDate(a.createdAt || a.updatedAt) || 0);
const kv = (k, v) => v ? `<div class="kv">${esc(k)}: <b>${esc(v)}</b></div>` : '';
const img = src => `<img src="${src}" alt="" data-zoom>`;

async function load() {
    const q = (c, f, v) => getDocs(query(collection(db, c), where(f, '==', v)));
    const [p, pay, v, r] = await Promise.all([
        q('profiles', 'status', 'pending'), q('payments', 'status', 'pending'),
        q('verifications', 'status', 'pending'), q('reports', 'status', 'open')
    ]);
    data.profiles = p.docs.map(d => d.data()).sort(byNewest).reverse();       // oldest first
    data.payments = pay.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest).reverse();
    data.verifications = v.docs.map(d => d.data()).sort(byNewest).reverse();
    data.reports = r.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNewest);
    for (const k of Object.keys(data)) {
        const el = $('#n-' + k);
        el.hidden = !data[k].length; el.textContent = data[k].length;
    }
    try {
        const [approved, users] = await Promise.all([
            getCountFromServer(query(collection(db, 'profiles'), where('status', '==', 'approved'))),
            getCountFromServer(collection(db, 'users'))
        ]);
        $('#stats').innerHTML = `
            <div class="stat"><b>${users.data().count}</b><span>Registered accounts</span></div>
            <div class="stat"><b>${approved.data().count}</b><span>Live profiles</span></div>
            <div class="stat"><b>${data.profiles.length}</b><span>Waiting for review</span></div>
            <div class="stat"><b>${data.reports.length}</b><span>Open reports</span></div>`;
    } catch {}
}

function profileFacts(p, c) {
    return `
        <h3>${esc(p.firstName)} ${esc(c?.lastName || '')}, ${ageFrom(p.dob)} <span class="muted">${refCode(p.uid)}</span>
            ${p.verified ? '<span class="badge badge-verified">ID verified</span>' : ''}</h3>
        ${kv('For', label('createdFor', p.createdFor))}
        ${kv('Gender', label('gender', p.gender))}
        ${kv('DOB', p.dob)} ${kv('Height', heightLabel(p.height))}
        ${kv('Marital', label('marital', p.marital))} ${kv('Children', p.children)}
        ${kv('Religion', label('religion', p.religion))} ${kv('Ethnicity', label('ethnicity', p.ethnicity))}
        ${kv('Location', [p.city, label('district', p.district), p.country].filter(Boolean).join(', '))}
        ${kv('Education', [label('education', p.education), p.educationDetail].filter(Boolean).join(' – '))}
        ${kv('Profession', p.profession)}
        ${kv('Contact', c ? `${c.contactName} (${c.contactRelation || '—'}) ${c.phone}` : '')}
        <p class="mt-1" style="white-space:pre-line;font-size:.9rem">${esc(p.about)}</p>`;
}

const tabs = {
    async profiles() {
        if (!data.profiles.length) return '<div class="empty"><p>No profiles waiting. 🎉</p></div>';
        const rows = await Promise.all(data.profiles.map(async p => {
            const [pics, c] = await Promise.all([photosOf(p.uid, p.photoCount || 0), get(['contacts', p.uid])]);
            return `<div class="review">
                <div class="pics">${pics.map(img).join('') || '<div class="muted">No photos</div>'}</div>
                <div>${profileFacts(p, c)}
                    <div class="row mt-2">
                        <button class="btn btn-sm btn-maroon" data-approve="${p.uid}">Approve</button>
                        <button class="btn btn-sm btn-danger" data-reject="${p.uid}">Needs changes…</button>
                    </div>
                </div></div>`;
        }));
        return `<p class="muted">Check: real photos of one person, age 18+, sensible details, no phone numbers or links inside the text.</p>` + rows.join('');
    },
    async payments() {
        if (!data.payments.length) return '<div class="empty"><p>No payments waiting.</p></div>';
        return data.payments.map(p => `<div class="review">
            <div class="pics">${img(p.slip)}</div>
            <div>
                <h3>LKR ${Number(p.amount).toLocaleString()} · ${p.months} months</h3>
                ${kv('Member', `${p.email} (${refCode(p.uid)})`)} ${kv('Reference', p.reference)} ${kv('Submitted', fmtDate(p.createdAt))}
                <p class="muted mt-1">Confirm the money reached your bank account before approving.</p>
                <div class="row mt-2">
                    <button class="btn btn-sm btn-maroon" data-pay-ok="${p.id}">Approve & activate Premium</button>
                    <button class="btn btn-sm btn-danger" data-pay-no="${p.id}">Reject…</button>
                </div>
            </div></div>`).join('');
    },
    async verifications() {
        if (!data.verifications.length) return '<div class="empty"><p>No ID checks waiting.</p></div>';
        const rows = await Promise.all(data.verifications.map(async v => {
            const [p, c, pics] = await Promise.all([get(['profiles', v.uid]), get(['contacts', v.uid]), photosOf(v.uid, 1)]);
            return `<div class="review">
                <div class="pics">${img(v.nic)}${img(v.selfie)}${pics.map(img).join('')}</div>
                <div>${p ? profileFacts(p, c) : '<p>Profile missing</p>'}
                    <p class="muted mt-1">Check: NIC photo matches the selfie and profile photo; name and date of birth on the NIC match the profile. Images are deleted when you decide.</p>
                    <div class="row mt-2">
                        <button class="btn btn-sm btn-maroon" data-ver-ok="${v.uid}">Verified</button>
                        <button class="btn btn-sm btn-danger" data-ver-no="${v.uid}">Reject…</button>
                    </div>
                </div></div>`;
        }));
        return rows.join('');
    },
    async reports() {
        if (!data.reports.length) return '<div class="empty"><p>No open reports.</p></div>';
        const rows = await Promise.all(data.reports.map(async r => {
            const p = await get(['profiles', r.target]);
            return `<div class="list-row"><div class="info">
                <strong><a href="profile.html?id=${r.target}" target="_blank">${esc(p?.firstName || 'Unknown')} ${refCode(r.target)}</a></strong>
                <span class="badge badge-rejected">${esc(label('reason', r.reason))}</span>
                <div class="muted">${esc(r.details || '')}</div>
                <div class="muted">Reported by ${refCode(r.by)} · ${fmtDate(r.createdAt)} · profile status: ${esc(p?.status || '—')}</div></div>
                <div class="row">
                    <button class="btn btn-sm btn-danger" data-takedown="${r.id}" data-target="${r.target}">Remove profile…</button>
                    <button class="btn btn-sm btn-ghost" data-dismiss="${r.id}">Dismiss</button>
                </div></div>`;
        }));
        return rows.join('');
    },
    async find() {
        return `<form id="find-form" class="row"><div class="field" style="flex:1"><input id="find-q" placeholder="Reference code (SB-XXXXX) or full user ID"></div><button class="btn btn-maroon">Find</button></form><div id="find-out" class="mt-2"></div>`;
    }
};

let current = 'profiles';
async function show(tab) {
    current = tab;
    $$('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('#tab-body').innerHTML = '<div class="spinner"></div>';
    $('#tab-body').innerHTML = await tabs[tab]();
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
async function refresh() { await load(); await show(current); }

function ask(title, placeholder) {
    return new Promise(resolve => {
        const m = modal(`<h3>${esc(title)}</h3><div class="field"><textarea id="ask-text" placeholder="${esc(placeholder)}"></textarea></div>
            <div class="row mt-2"><button class="btn btn-ghost" data-close>Cancel</button><span class="spacer"></span><button class="btn btn-maroon" id="ask-ok">OK</button></div>`);
        m.querySelector('#ask-ok').addEventListener('click', () => { const v = m.querySelector('#ask-text').value.trim(); m.remove(); resolve(v || null); });
        m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) resolve(null); });
    });
}

$('#tab-body').addEventListener('click', async e => {
    const z = e.target.closest('[data-zoom]');
    if (z) { modal(`<img src="${z.src}" style="width:100%"><div class="row mt-1"><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-close>Close</button></div>`).querySelector('.modal').style.width = 'min(100%, 900px)'; return; }
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    try {
        if (d.approve) {
            await updateDoc(doc(db, 'profiles', d.approve), { status: 'approved', rejectReason: deleteField(), reviewedAt: serverTimestamp() });
            toast('Approved');
        } else if (d.reject) {
            const reason = await ask('What needs to change?', 'e.g. Please upload a clear photo of yourself only.');
            if (!reason) return;
            await updateDoc(doc(db, 'profiles', d.reject), { status: 'rejected', rejectReason: reason, reviewedAt: serverTimestamp() });
            toast('Sent back for changes');
        } else if (d.payOk) {
            const pay = data.payments.find(p => p.id === d.payOk);
            const user = await get(['users', pay.uid]);
            const base = toDate(user?.premiumUntil) > new Date() ? toDate(user.premiumUntil) : new Date();
            const until = new Date(base); until.setMonth(until.getMonth() + pay.months);
            const ts = Timestamp.fromDate(until);
            await updateDoc(doc(db, 'users', pay.uid), { plan: 'premium', premiumUntil: ts });
            if (await get(['profiles', pay.uid])) await updateDoc(doc(db, 'profiles', pay.uid), { premium: true, premiumUntil: ts });
            await updateDoc(doc(db, 'payments', pay.id), { status: 'approved', reviewedAt: serverTimestamp(), activeUntil: ts });
            toast(`Premium active until ${fmtDate(ts)}`);
        } else if (d.payNo) {
            const note = await ask('Why is this payment rejected?', 'e.g. Amount not received. Please contact us.');
            if (!note) return;
            await updateDoc(doc(db, 'payments', d.payNo), { status: 'rejected', note, reviewedAt: serverTimestamp() });
        } else if (d.verOk) {
            await updateDoc(doc(db, 'profiles', d.verOk), { verified: true });
            await updateDoc(doc(db, 'verifications', d.verOk), { status: 'approved', nic: deleteField(), selfie: deleteField(), reviewedAt: serverTimestamp() });
            toast('Marked as ID verified');
        } else if (d.verNo) {
            const note = await ask('Why could it not be verified?', 'e.g. NIC photo is blurry. Please upload again.');
            if (!note) return;
            await updateDoc(doc(db, 'verifications', d.verNo), { status: 'rejected', note, nic: deleteField(), selfie: deleteField(), reviewedAt: serverTimestamp() });
        } else if (d.takedown) {
            const reason = await ask('Reason shown to the member', 'e.g. Removed after reports of a fake profile.');
            if (!reason) return;
            await updateDoc(doc(db, 'profiles', d.target), { status: 'rejected', rejectReason: reason, reviewedAt: serverTimestamp() });
            await updateDoc(doc(db, 'reports', d.takedown), { status: 'actioned', reviewedAt: serverTimestamp() });
        } else if (d.dismiss) {
            await updateDoc(doc(db, 'reports', d.dismiss), { status: 'dismissed', reviewedAt: serverTimestamp() });
        } else return;
        await refresh();
    } catch (err) { toast(friendlyError(err), true); }
});

$('#tab-body').addEventListener('submit', async e => {
    if (e.target.id !== 'find-form') return;
    e.preventDefault();
    const q = $('#find-q').value.trim();
    const out = $('#find-out');
    out.innerHTML = '<div class="spinner"></div>';
    let uid = q;
    if (/^SB-/i.test(q)) {
        // reference codes are the first 5 characters of the user ID
        const prefix = q.slice(3);
        const snap = await getDocs(collection(db, 'profiles'));
        const hit = snap.docs.find(d => d.id.toUpperCase().startsWith(prefix.toUpperCase()));
        uid = hit?.id;
    }
    const [p, c, u] = uid ? await Promise.all([get(['profiles', uid]), get(['contacts', uid]), get(['users', uid])]) : [];
    if (!p && !u) { out.innerHTML = '<p class="muted">Not found.</p>'; return; }
    out.innerHTML = `${u ? `${kv('Email', u.email)}${kv('Plan', u.plan + (u.premiumUntil ? ' until ' + fmtDate(u.premiumUntil) : ''))}${kv('Joined', fmtDate(u.createdAt))}` : ''}
        ${p ? `${kv('Profile status', p.status)}<div class="mt-1">${profileFacts(p, c)}</div>
        <div class="row mt-2"><a class="btn btn-sm btn-ghost" href="profile.html?id=${uid}" target="_blank">Open profile</a>
        <button class="btn btn-sm btn-danger" data-reject="${uid}">Remove / needs changes…</button>
        ${p.status !== 'approved' ? `<button class="btn btn-sm btn-maroon" data-approve="${uid}">Approve</button>` : ''}</div>` : '<p class="muted">No profile created.</p>'}`;
});

try { await refresh(); } catch (err) { toast(friendlyError(err), true); }
