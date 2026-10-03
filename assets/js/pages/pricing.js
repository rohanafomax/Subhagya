import {
    addDoc, getDocs, collection, query, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, whenReady, isPremium, siteConfig, t, $, esc, toast, fmtDate, toDate, friendlyError, applyI18n } from '../app.js';
import { compressImage } from '../image.js';
import { sha256 } from '../checks.js';
import { PLANS, BANK, FREE_INTEREST_LIMIT, FREE_LAUNCH_TARGET } from '../config.js';

const lkr = n => 'LKR ' + n.toLocaleString('en-LK');

const FREE = [
    t('pf_1', 'Create a full profile with photos'),
    t('pf_2', 'Browse all approved proposals'),
    t('pf_3', `Send ${FREE_INTEREST_LIMIT} interests per month`),
    t('pf_4', 'Accept interests you receive'),
    t('pf_5', 'Free ID verification badge')
];
const PREM = [
    t('pp_1', 'Everything in Free'),
    t('pp_2', 'See phone numbers & WhatsApp of your matches'),
    t('pp_3', 'Unlimited interests'),
    t('pp_4', 'Your profile shown first in search'),
    t('pp_5', 'Gold ★ Premium badge')
];

$('#plans').innerHTML = `
    <div class="card plan">
        <h3>${esc(t('free', 'Free'))}</h3>
        <div class="price">LKR 0</div>
        <p class="muted">${esc(t('forever', 'Forever'))}</p>
        <ul>${FREE.map(x => `<li>${esc(x)}</li>`).join('')}<li class="no">${esc(t('pf_no', 'Contact details of matches'))}</li></ul>
        <a class="btn btn-outline btn-block" href="login.html?mode=register">${esc(t('nav_register', 'Register Free'))}</a>
    </div>
    ${PLANS.map(p => `
    <div class="card plan${p.featured ? ' featured' : ''}" data-ribbon="${esc(t('popular', 'Most popular'))}">
        <h3>${esc(t('premium', 'Premium'))} · ${p.months} ${esc(t('months', 'months'))}</h3>
        <div class="price">${lkr(p.price)}</div>
        <p class="muted">≈ ${lkr(Math.round(p.price / p.months))} / ${esc(t('month', 'month'))}</p>
        <ul>${PREM.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <button class="btn ${p.featured ? 'btn-gold' : 'btn-maroon'} btn-block" data-choose="${p.id}">${esc(t('choose', 'Choose'))}</button>
    </div>`).join('')}`;

$('#bank').innerHTML = [
    [t('bank', 'Bank'), BANK.bank], [t('branch', 'Branch'), BANK.branch],
    [t('acc_name', 'Account name'), BANK.accountName], [t('acc_no', 'Account number'), BANK.accountNumber],
    [t('swift', 'SWIFT code (paying from abroad)'), BANK.swift]
].filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
if (BANK.qrImage) {
    $('#qr').innerHTML = `<img src="${esc(BANK.qrImage)}" alt="LankaQR"><p class="muted center" style="font-size:.8rem">${esc(t('pay_qr', 'Scan with any banking app (LankaQR)'))}</p>`;
    $('#qr').hidden = false;
}
$('#pkg').innerHTML = PLANS.map(p => `<option value="${p.id}">${p.months} ${esc(t('months', 'months'))} – ${lkr(p.price)}</option>`).join('');

/**
 * A payment code the member writes in the bank transfer remark, e.g. SB-4F7K2-6M-Q8T.
 * It lets the admin match money on the bank statement to the right member — a slip
 * photo alone can be edited.
 */
function newPayCode(uid, months) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';      // no 0/O, 1/I/L
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)), b => chars[b % chars.length]).join('');
    return `SB-${uid.slice(0, 5).toUpperCase()}-${months}M-${rand}`;
}

const m = await whenReady();

const { freeMode } = await siteConfig();
if (freeMode) {
    // Free launch: everyone already has the Premium features, so don't take payments yet.
    $('#plans').insertAdjacentHTML('beforebegin', `<div class="alert alert-ok" style="font-size:1rem">
        <b>★ ${esc(t('free_launch', 'Free launch'))}:</b> ${esc(t('free_launch_body', `all Premium features are free for every member until we reach ${FREE_LAUNCH_TARGET} members — including phone numbers of your accepted matches and unlimited interests. Prices below apply after the launch.`))}
        ${m ? '' : ` <a href="login.html?mode=register">${esc(t('nav_register', 'Register Free'))}</a>`}</div>`);
    document.querySelectorAll('[data-choose]').forEach(b => { b.disabled = true; b.textContent = t('after_launch', 'Available after launch'); });
}

document.addEventListener('click', e => {
    const b = e.target.closest('[data-choose]');
    if (!b) return;
    if (!m) { location.href = 'login.html?next=pricing.html'; return; }
    $('#pkg').value = b.dataset.choose;
    $('#pay-card').scrollIntoView({ behavior: 'smooth' });
});

if (freeMode && !isPremium(m?.account)) {
    // nothing to pay for during the free launch
} else if (!m) {
    $('#login-card').hidden = false;
} else {
    $('#pay-card').hidden = false;
    if (isPremium(m.account)) {
        $('#pay-status').innerHTML = `<div class="alert alert-ok">★ ${esc(t('you_premium', 'You are Premium until'))} ${fmtDate(m.account.premiumUntil)}. ${esc(t('extend_note', 'Paying again extends your membership.'))}</div>`;
    }

    // one payment code per package, kept while the page is open
    const codes = {};
    const showCode = () => {
        const plan = PLANS.find(p => p.id === $('#pkg').value);
        codes[plan.id] ||= newPayCode(m.user.uid, plan.months);
        $('#pay-code').textContent = codes[plan.id];
    };
    $('#pkg').addEventListener('change', showCode);
    showCode();

    async function showHistory() {
        try {
            const snap = await getDocs(query(collection(db, 'payments'), where('uid', '==', m.user.uid)));
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => toDate(b.createdAt) - toDate(a.createdAt));
            const pending = list.filter(p => p.status === 'pending');
            if (pending.length) {
                $('#pay-status').innerHTML += `<div class="alert alert-info">${esc(t('pay_pending', 'We received your payment receipt and are checking it. Premium will activate soon.'))}</div>`;
            }
            const rejected = list.find(p => p.status === 'rejected');
            if (rejected && !pending.length && rejected === list[0]) {
                $('#pay-status').innerHTML += `<div class="alert alert-err">${esc(t('pay_rejected', 'Your last receipt could not be confirmed.'))} ${esc(rejected.note || '')}</div>`;
            }
            if (!list.length) return;
            $('#history').innerHTML = `<h3>${esc(t('pay_history', 'Your payments'))}</h3>` + list.map(p => `
                <div class="list-row"><div class="info">
                    <strong>${fmtDate(p.createdAt)} · ${p.months} ${esc(t('months', 'months'))} · ${lkr(p.amount)}</strong>
                    <div class="muted">${esc(p.payCode || p.reference || '')}</div></div>
                    <span class="badge badge-${p.status}">${esc(t('pst_' + p.status, { pending: 'Checking', approved: 'Paid', rejected: 'Not confirmed' }[p.status] || p.status))}</span>
                    ${p.status === 'approved' ? `<a class="btn btn-sm btn-ghost" href="receipt.html?id=${p.id}" target="_blank">${esc(t('receipt', 'Receipt'))}</a>` : ''}
                </div>`).join('');
        } catch {}
    }
    showHistory();

    $('#pay-form').addEventListener('submit', async e => {
        e.preventDefault();
        const file = $('#slip').files[0];
        if (!file) { toast(t('slip_needed', 'Please attach the receipt.'), true); return; }
        const plan = PLANS.find(p => p.id === $('#pkg').value);
        const btn = e.submitter;
        btn.disabled = true;
        try {
            const slip = await compressImage(file, { maxSide: 1300, maxBytes: 400_000 });
            await addDoc(collection(db, 'payments'), {
                uid: m.user.uid, email: m.user.email, plan: plan.id, months: plan.months, amount: plan.price,
                payCode: codes[plan.id], reference: $('#ref').value.trim(), paidBy: $('#paid-by').value.trim(),
                slip, slipHash: await sha256(slip), status: 'pending', createdAt: serverTimestamp()
            });
            $('#pay-form').reset();
            delete codes[plan.id];
            showCode();
            $('#pay-status').innerHTML = `<div class="alert alert-ok">${esc(t('pay_thanks', 'Thank you! We will check your receipt and activate Premium soon.'))}</div>`;
            showHistory();
        } catch (err) { toast(friendlyError(err), true); }
        btn.disabled = false;
    });
}
applyI18n();
