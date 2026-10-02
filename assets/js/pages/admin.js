import {
    doc, getDoc, getDocs, updateDoc, collection, query, where, serverTimestamp, deleteField, Timestamp, getCountFromServer
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, requireAuth, $, $$, esc, toast, label, ageFrom, heightLabel, refCode, toDate, fmtDate, friendlyError, modal } from '../app.js';
import { contactInfoIn, PUBLIC_TEXT_FIELDS, isDisposableEmail, nameProblems, consistencyProblems } from '../checks.js';
import { JOB_BODIES, occupationLabel, tierOf, isBusiness } from '../data.js';

await requireAuth({ admin: true });

const data = { profiles: [], payments: [], verifications: [], jobChecks: [], reports: [] };

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
    const [p, pay, v, r, j] = await Promise.all([
        q('profiles', 'status', 'pending'), q('payments', 'status', 'pending'),
        q('verifications', 'status', 'pending'), q('reports', 'status', 'open'),
        q('jobChecks', 'status', 'pending').catch(() => ({ docs: [] }))
    ]);
    data.jobChecks = j.docs.map(d => d.data()).sort(byNewest).reverse();
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

// ───────── automatic warning flags ─────────
async function others(coll, field, value, uid) {
    if (!value) return [];
    try {
        const snap = await getDocs(query(collection(db, coll), where(field, '==', value)));
        return [...new Set(snap.docs.map(d => d.data().uid).filter(x => x && x !== uid))];
    } catch { return []; }
}

/**
 * Returns [{level: 'red'|'amber', text}] for one profile.
 * Red = strong sign of a fake/duplicate account; amber = worth a look.
 */
async function flagsFor(p, c, photoDocs) {
    const flags = [];
    const add = (level, text) => flags.push({ level, text });
    const age = ageFrom(p.dob);

    // what the profile says
    for (const f of PUBLIC_TEXT_FIELDS) {
        const { strict, soft } = contactInfoIn(p[f]);
        for (const h of strict) add('red', `${h.kind} in “${f}”: ${h.sample}`);
        for (const h of soft) add('amber', `mentions ${h.sample} in “${f}”`);
    }
    if (!photoDocs.length) add('red', 'No photo');
    for (const n of nameProblems(p.firstName)) add('amber', n);
    for (const n of consistencyProblems(p, age)) add('amber', n);
    if (String(p.about || '').length < 120) add('amber', 'Very short “About me”');
    const letters = String(p.about || '').replace(/[^a-z]/gi, '');
    if (letters.length > 40 && letters === letters.toUpperCase()) add('amber', '“About me” is all capitals');
    if (p.rejectReason) add('amber', `Sent back before: ${p.rejectReason}`);

    // comparison with other accounts, and behaviour
    const [user, reports, samePhone, samePhotos, sameAbout, sameDob, sent] = await Promise.all([
        get(['users', p.uid]),
        getDocs(query(collection(db, 'reports'), where('target', '==', p.uid))).then(s => s.docs.map(d => d.data())).catch(() => []),
        others('contacts', 'phoneKey', c?.phoneKey, p.uid),
        Promise.all(photoDocs.filter(ph => ph.hash).map(ph => others('photos', 'hash', ph.hash, p.uid))).then(a => [...new Set(a.flat())]),
        others('profiles', 'aboutHash', p.aboutHash, p.uid),
        getDocs(query(collection(db, 'profiles'), where('dob', '==', p.dob || '-'))).then(s => s.docs.map(d => d.data())
            .filter(o => o.uid !== p.uid && String(o.firstName).trim().toLowerCase() === String(p.firstName).trim().toLowerCase())
            .map(o => o.uid)).catch(() => []),
        getDocs(query(collection(db, 'interests'), where('from', '==', p.uid))).then(s => s.docs.map(d => d.data())).catch(() => [])
    ]);

    if (reports.length) {
        const by = new Set(reports.map(r => r.by)).size;
        add('red', `Reported ${reports.length}× by ${by} member${by > 1 ? 's' : ''} (${[...new Set(reports.map(r => label('reason', r.reason)))].join(', ')})`);
    }
    if (samePhone.length) add('red', `Same phone number as ${samePhone.map(refCode).join(', ')} — possible duplicate or fake account`);
    if (samePhotos.length) add('red', `Same photo used by ${samePhotos.map(refCode).join(', ')} — possible stolen photo`);
    if (sameAbout.length) add('red', `“About me” copied from/to ${sameAbout.map(refCode).join(', ')}`);
    if (sameDob.length) add('red', `Same name and date of birth as ${sameDob.map(refCode).join(', ')} — possible duplicate account`);
    if (isDisposableEmail(user?.email)) add('red', `Temporary email address (${user.email})`);

    const dayAgo = Date.now() - 864e5;
    const lastDay = sent.filter(i => (toDate(i.createdAt)?.getTime() || 0) > dayAgo).length;
    if (lastDay >= 15) add('red', `Sent ${lastDay} interests in the last 24 hours — possible spam`);
    else if (lastDay >= 8) add('amber', `Sent ${lastDay} interests in the last 24 hours`);
    const answered = sent.filter(i => i.status !== 'pending');
    const declined = answered.filter(i => i.status === 'declined').length;
    if (answered.length >= 8 && declined / answered.length >= 0.8) add('amber', `${declined} of ${answered.length} interests declined`);

    const joined = toDate(user?.createdAt);
    if (joined && Date.now() - joined.getTime() < 15 * 60 * 1000 && (p.photoCount || 0) <= 1) add('amber', 'Account created minutes before submitting, with one photo');

    return flags;
}

function flagsHtml(flags) {
    if (!flags.length) return '<div class="alert alert-ok" style="margin:.6rem 0">✓ No automatic warnings</div>';
    return `<div style="margin:.6rem 0;display:flex;flex-direction:column;gap:.35rem">${flags.map(f =>
        `<div class="alert ${f.level === 'red' ? 'alert-err' : 'alert-info'}" style="margin:0;padding:.45rem .8rem">${f.level === 'red' ? '⚠' : '•'} ${esc(f.text)}</div>`).join('')}</div>`;
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
        ${kv('Occupation', occupationLabel(p))} ${kv('Tier', 'Tier ' + tierOf(p))} ${kv('Seniority', p.seniority && label('seniority', p.seniority))}
        ${kv('Profession', p.profession)} ${kv('Income', p.incomeRange && label('income', p.incomeRange))}
        ${kv('Contact', c ? `${c.contactName} (${c.contactRelation || '—'}) ${c.phone}` : '')}
        <p class="mt-1" style="white-space:pre-line;font-size:.9rem">${esc(p.about)}</p>`;
}

const tabs = {
    async profiles() {
        if (!data.profiles.length) return '<div class="empty"><p>No profiles waiting. 🎉</p></div>';
        const items = await Promise.all(data.profiles.map(async p => {
            const [photoDocs, c] = await Promise.all([
                Promise.all(Array.from({ length: p.photoCount || 0 }, (_, i) => get(['photos', `${p.uid}_${i}`]))).then(a => a.filter(Boolean)),
                get(['contacts', p.uid])
            ]);
            const flags = await flagsFor(p, c, photoDocs);
            return { p, c, photoDocs, flags, red: flags.filter(f => f.level === 'red').length };
        }));
        items.sort((a, b) => b.red - a.red);        // most suspicious first
        const rows = items.map(({ p, c, photoDocs, flags }) => {
            return `<div class="review">
                <div class="pics">${photoDocs.map(ph => img(ph.data)).join('') || '<div class="muted">No photos</div>'}</div>
                <div>${profileFacts(p, c)}${flagsHtml(flags)}
                    <div class="row mt-2">
                        <button class="btn btn-sm btn-maroon" data-approve="${p.uid}">Approve</button>
                        <button class="btn btn-sm btn-danger" data-reject="${p.uid}">Needs changes…</button>
                    </div>
                </div></div>`;
        });
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
    async jobChecks() {
        if (!data.jobChecks.length) return '<div class="empty"><p>No job checks waiting.</p></div>';
        const rows = await Promise.all(data.jobChecks.map(async jc => {
            const p = await get(['profiles', jc.uid]);
            const body = JOB_BODIES.find(b => b.v === jc.body);
            const evidence = jc.method === 'register'
                ? `${kv('Professional body', body?.en || jc.body)} ${kv('Registration number', jc.number)}
                   ${body?.url ? `<a class="btn btn-sm btn-ghost mt-1" href="${body.url}" target="_blank" rel="noopener">Open ${esc(body.en.split(' (')[0])} website ↗</a>` : ''}
                   <p class="muted mt-1">Search the official register for this number and check the name matches the profile.</p>`
                : `<p class="muted">Staff ID / business registration photo. Check the name and workplace match the profile.</p>`;
            return `<div class="review">
                <div class="pics">${jc.method === 'document' && jc.image ? img(jc.image) : ''}</div>
                <div>${p ? `<h3>${esc(p.firstName)}, ${ageFrom(p.dob)} <span class="muted">${refCode(jc.uid)}</span></h3>
                        ${kv('Occupation', occupationLabel(p))} ${kv('Profession', p.profession)} ${kv('Sector', p.employer)}`
                    : '<p>Profile missing</p>'}
                    ${evidence}
                    <p class="muted">The number or photo is deleted when you decide.</p>
                    <div class="row mt-2">
                        <button class="btn btn-sm btn-maroon" data-job-ok="${jc.uid}">Job verified</button>
                        <button class="btn btn-sm btn-danger" data-job-no="${jc.uid}">Reject…</button>
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
    async scan() {
        return `<p>Checks every <b>live</b> profile for signs of fake or duplicate accounts: reports, the same phone number, photo,
            “About me” or name + birth date as another account, contact details hidden in text, temporary emails,
            interest spamming and details that don't fit together.</p>
            <p class="muted">It runs by itself when an admin opens this page and the last scan was more than ${SCAN_EVERY_DAYS} days ago.
            ${lastScanTime() ? `Last scan on this device: ${fmtDate(new Date(lastScanTime()))}.` : 'Not run yet on this device.'}
            Each scan uses roughly 10 database reads per profile (the free plan allows 50,000 a day).</p>
            <button class="btn btn-maroon mt-1" id="run-scan">Run scan now</button>
            <div id="scan-out" class="mt-2">${lastScan ? scanHtml(lastScan) : ''}</div>`;
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

// ───────── fake-profile scan (manual, and automatic weekly) ─────────
const SCAN_EVERY_DAYS = 7;
let lastScan = null;            // { total, results } from the most recent scan in this visit
let scanning = null;            // the scan in progress, so two never run at once

function lastScanTime() {
    try { return Number(localStorage.getItem('adminLastScan')) || 0; } catch { return 0; }
}

/** Checks every live profile. Calls onProgress(done, total) as it goes. */
async function scanAll(onProgress = () => {}) {
    if (scanning) return scanning;
    scanning = (async () => {
        const snap = await getDocs(query(collection(db, 'profiles'), where('status', '==', 'approved')));
        const profiles = snap.docs.map(d => d.data());
        const results = [];
        let done = 0;
        const queue = [...profiles];
        // check 5 profiles at a time
        await Promise.all(Array.from({ length: 5 }, async () => {
            while (queue.length) {
                const p = queue.shift();
                const [c, photoDocs] = await Promise.all([
                    get(['contacts', p.uid]),
                    Promise.all(Array.from({ length: p.photoCount || 0 }, (_, i) => get(['photos', `${p.uid}_${i}`]))).then(a => a.filter(Boolean))
                ]);
                const flags = (await flagsFor(p, c, photoDocs)).filter(f => !/^Very short|^Sent back before/.test(f.text));
                if (flags.length) results.push({ p, flags, photo: photoDocs[0]?.data, red: flags.filter(f => f.level === 'red').length });
                onProgress(++done, profiles.length);
            }
        }));
        results.sort((a, b) => b.red - a.red || b.flags.length - a.flags.length);
        try { localStorage.setItem('adminLastScan', String(Date.now())); } catch {}
        lastScan = { total: profiles.length, results };
        return lastScan;
    })();
    try { return await scanning; } finally { scanning = null; }
}

function scanHtml({ total, results }) {
    const red = results.filter(r => r.red).length;
    return `<div class="alert ${red ? 'alert-err' : 'alert-ok'}">Checked ${total} live profiles:
            <b>${red}</b> with serious warnings, <b>${results.length - red}</b> worth a look.</div>` +
        results.map(({ p, flags, photo }) => `<div class="review">
            <div class="pics">${photo ? img(photo) : '<div class="muted">No photo</div>'}</div>
            <div><h3>${esc(p.firstName)}, ${ageFrom(p.dob)} <span class="muted">${refCode(p.uid)}</span></h3>
                ${kv('Location', label('district', p.district))} ${kv('Profession', p.profession)}
                ${flagsHtml(flags)}
                <div class="row mt-1">
                    <a class="btn btn-sm btn-ghost" href="profile.html?id=${p.uid}" target="_blank">Open profile</a>
                    <button class="btn btn-sm btn-danger" data-reject="${p.uid}">Remove / needs changes…</button>
                </div></div></div>`).join('');
}

async function runScan(btn) {
    const out = $('#scan-out');
    btn.disabled = true;
    try {
        await scanAll((done, total) => {
            out.innerHTML = `<div class="spinner"></div><p class="center muted">Checked ${done} of ${total}…</p>`;
        });
        out.innerHTML = scanHtml(lastScan);
        showScanNotice();
    } catch (err) {
        out.innerHTML = `<div class="alert alert-err">${esc(friendlyError(err))}</div>`;
    }
    btn.disabled = false;
}

/** Banner at the top of Admin summarising the latest scan. */
function showScanNotice() {
    const el = $('#scan-notice');
    if (!lastScan) { el.innerHTML = ''; return; }
    const { total, results } = lastScan;
    const red = results.filter(r => r.red).length;
    el.innerHTML = results.length
        ? `<div class="alert ${red ? 'alert-err' : 'alert-info'} row" style="justify-content:space-between">
            <span>Fake-profile scan found <b>${results.length}</b> profile${results.length > 1 ? 's' : ''} to check${red ? ` (<b>${red}</b> serious)` : ''}.</span>
            <button class="btn btn-sm btn-maroon" id="view-scan">View</button></div>`
        : `<div class="alert alert-ok">Fake-profile scan: no problems found in ${total} live profile${total === 1 ? '' : 's'}.</div>`;
    $('#view-scan')?.addEventListener('click', () => show('scan'));
}

/** Runs the scan in the background if the last one was more than a week ago. */
async function autoScan() {
    if (Date.now() - lastScanTime() < SCAN_EVERY_DAYS * 864e5) return;
    $('#scan-notice').innerHTML = '<div class="alert alert-info">Running the weekly fake-profile scan in the background…</div>';
    try {
        await scanAll();
        showScanNotice();
        if (current === 'scan') show('scan');
    } catch {
        $('#scan-notice').innerHTML = '';
    }
}

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
    if (b.id === 'run-scan') { runScan(b); return; }
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
        } else if (d.jobOk) {
            const jc = data.jobChecks.find(x => x.uid === d.jobOk);
            const body = JOB_BODIES.find(b => b.v === jc?.body);
            const prof = await get(['profiles', d.jobOk]);
            await updateDoc(doc(db, 'profiles', d.jobOk), {
                jobVerified: true, jobVia: jc?.method || 'document',
                jobWorkplace: jc?.method === 'register' && body && !['other', 'overseas'].includes(body.v) ? body.en.split(' (')[0]
                    : isBusiness(prof) ? 'Registered business' : ''
            });
            await updateDoc(doc(db, 'jobChecks', d.jobOk), { status: 'approved', number: deleteField(), image: deleteField(), reviewedAt: serverTimestamp() });
            toast('Marked as job verified');
        } else if (d.jobNo) {
            const note = await ask('Why could the job not be verified?', 'e.g. Number not found on the register. Please check and try again.');
            if (!note) return;
            await updateDoc(doc(db, 'jobChecks', d.jobNo), { status: 'rejected', note, number: deleteField(), image: deleteField(), reviewedAt: serverTimestamp() });
        } else if (d.takedown) {
            const reason = await ask('Reason shown to the member', 'e.g. Removed after reports of a fake profile.');
            if (!reason) return;
            await updateDoc(doc(db, 'profiles', d.target), { status: 'rejected', rejectReason: reason, reviewedAt: serverTimestamp() });
            await updateDoc(doc(db, 'reports', d.takedown), { status: 'actioned', reviewedAt: serverTimestamp() });
        } else if (d.dismiss) {
            await updateDoc(doc(db, 'reports', d.dismiss), { status: 'dismissed', reviewedAt: serverTimestamp() });
        } else return;
        if (lastScan && (d.reject || d.target)) {   // a removed profile no longer needs checking
            lastScan.results = lastScan.results.filter(r => r.p.uid !== (d.reject || d.target));
            showScanNotice();
        }
        if (current === 'scan') {           // keep the scan results on screen
            b.closest('.review')?.remove();
            await load();
        } else {
            await refresh();
        }
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
autoScan();
