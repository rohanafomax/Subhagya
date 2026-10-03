import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, requireAuth, t, $, esc, fmtDate, refCode, friendlyError } from '../app.js';
import { RECEIPT } from '../config.js';

const box = $('#box');
const id = new URLSearchParams(location.search).get('id');
const me = await requireAuth();

try {
    const snap = id ? await getDoc(doc(db, 'payments', id)) : null;
    if (!snap?.exists()) throw new Error(t('receipt_missing', 'Receipt not found.'));
    const p = snap.data();
    if (p.status !== 'approved') throw new Error(t('receipt_not_ready', 'A receipt is available once the payment has been confirmed.'));
    const lkr = n => 'LKR ' + Number(n).toLocaleString('en-LK');
    const row = (k, v) => (v ? `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>` : '');

    box.innerHTML = `
        <div class="head">
            <div>
                <h1>${esc(RECEIPT.businessName)}</h1>
                ${RECEIPT.address ? `<div class="muted">${esc(RECEIPT.address)}</div>` : ''}
                ${RECEIPT.registration ? `<div class="muted">${esc(t('reg_no', 'Reg. No.'))} ${esc(RECEIPT.registration)}</div>` : ''}
            </div>
            <span class="paid-stamp">${esc(t('paid', 'PAID'))}</span>
        </div>
        <h2 style="color:var(--maroon);margin-bottom:.2rem">${esc(t('receipt_title', 'Payment receipt'))}</h2>
        <div class="muted">${esc(t('receipt_no', 'Receipt no.'))} ${esc(id.slice(0, 10).toUpperCase())}</div>
        <table>
            ${row(t('member', 'Member'), `${me.user.uid === p.uid ? (me.user.displayName || '') : ''} (${refCode(p.uid)})`)}
            ${row(t('email', 'Email'), p.email)}
            ${row(t('pay_code', 'Payment code'), p.payCode)}
            ${row(t('paid_by', 'Paid by'), p.paidBy)}
            ${row(t('date_paid', 'Submitted'), fmtDate(p.createdAt))}
            ${row(t('date_confirmed', 'Confirmed'), fmtDate(p.reviewedAt))}
            ${row(t('package', 'Package'), `${t('premium', 'Premium')} · ${p.months} ${t('months', 'months')}`)}
            ${row(t('valid_until', 'Premium valid until'), fmtDate(p.activeUntil))}
            <tr class="total"><td>${esc(t('amount', 'Amount paid'))}</td><td>${lkr(p.amount)}</td></tr>
        </table>
        <p class="muted" style="font-size:.8rem">${esc(t('receipt_note', 'Thank you for your payment. Please keep this receipt for your records.'))}</p>
        <div class="row mt-2 no-print">
            <button class="btn btn-maroon" onclick="window.print()">${esc(t('print', 'Print / save as PDF'))}</button>
            <a class="btn btn-ghost" href="pricing.html">${esc(t('back', 'Back'))}</a>
        </div>`;
} catch (e) {
    box.innerHTML = `<div class="alert alert-err">${esc(e.message || friendlyError(e))}</div>
        <a class="btn btn-ghost no-print" href="pricing.html">${esc(t('back', 'Back'))}</a>`;
}
