import {
    doc, getDoc, getDocs, setDoc, addDoc, updateDoc, collection, query, where, serverTimestamp, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {
    db, requireAuth, isPremium, t, $, $$, esc, toast, label, ageFrom, heightLabel, refCode, toDate, fmtDate,
    friendlyError, applyI18n, modal, fillSelect, getLang
} from '../app.js';
import { FREE_INTEREST_LIMIT } from '../config.js';
import { employmentShort, countryName } from '../data.js';
import { matchScore } from '../match.js';
import { jobBadgeText } from '../job.js';

const id = new URLSearchParams(location.search).get('id');
const me = await requireAuth();
const myId = me.user.uid;
const own = id === myId;
const premium = isPremium(me.account);
const view = $('#view');

const ICON_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

async function safeGet(path) {
    try { const s = await getDoc(doc(db, ...path)); return s.exists() ? s.data() : null; } catch { return null; }
}

const fact = (k, en, v) => v ? `<div><dt data-i18n="${k}">${esc(en)}</dt><dd>${esc(v)}</dd></div>` : '';

async function render() {
    if (!id) { view.innerHTML = `<div class="empty">${esc(t('not_found', 'Profile not found.'))}</div>`; return; }
    const p = await safeGet(['profiles', id]);
    if (!p) {
        view.innerHTML = `<div class="card center"><h2>${esc(t('not_found', 'Profile not found'))}</h2><p class="muted">${esc(t('not_found_sub', 'It may be under review, hidden, or removed.'))}</p><a class="btn btn-outline mt-2" href="browse.html">${esc(t('nav_browse', 'Browse'))}</a></div>`;
        return;
    }
    document.title = `${p.firstName} | Saubhagya`;

    // interest in either direction
    const [out, inc, myProfile] = await Promise.all([
        own ? null : safeGet(['interests', `${myId}_${id}`]),
        own ? null : safeGet(['interests', `${id}_${myId}`]),
        own ? p : safeGet(['profiles', myId])
    ]);
    const accepted = out?.status === 'accepted' || inc?.status === 'accepted';

    // photos (the rules decide what we may read)
    const photos = (await Promise.all(Array.from({ length: p.photoCount || 0 }, (_, i) => safeGet(['photos', `${id}_${i}`]))))
        .filter(Boolean).map(x => x.data);

    // contact details
    let contact = null;
    if (own || (accepted && premium) || me.account.role === 'admin') contact = await safeGet(['contacts', id]);

    const age = ageFrom(p.dob);
    const isPrem = p.premium && toDate(p.premiumUntil) > new Date();
    const blocked = (me.account.blocked || []).includes(id);
    const shortlisted = (me.account.shortlist || []).includes(id);
    const score = own ? null : matchScore(myProfile, p);

    view.innerHTML = `
    ${own ? `<div class="alert alert-info">${esc(t('own_preview', 'This is how other members see your profile.'))} <a href="my-profile.html">${esc(t('edit_profile', 'Edit profile'))}</a></div>` : ''}
    <div class="profile-layout">
        <aside>
            <div class="gallery card" style="padding:12px">
                <div class="main" id="main-photo">${photos[0] ? `<img src="${photos[0]}" alt="${esc(p.firstName)}">` : `<div class="center" style="padding:1.5rem">${ICON_LOCK.replace('<svg', '<svg width="56" height="56"')}<p style="font-size:.85rem">${esc(p.photoCount ? t('photo_protected', 'Photo visible after interest is accepted') : t('no_photo', 'No photo'))}</p></div>`}</div>
                ${photos.length > 1 ? `<div class="thumbs">${photos.map((ph, i) => `<img src="${ph}" alt="" data-i="${i}" class="${i ? '' : 'active'}">`).join('')}</div>` : ''}
            </div>
            <div class="card mt-2" id="actions"></div>
        </aside>

        <section>
            <div class="card">
                <div class="row">
                    <h1 style="color:var(--maroon);font-size:2.3rem;line-height:1.1">${esc(p.firstName)}, ${age}</h1>
                    ${p.verified ? `<span class="badge badge-verified">${ICON_TICK}${esc(t('id_verified', 'ID verified'))}</span>` : ''}
                    ${p.jobVerified ? `<span class="badge badge-job">${ICON_TICK}${esc(jobBadgeText(p, t))}</span>` : ''}
                    ${isPrem ? `<span class="badge badge-premium">★ ${esc(t('premium', 'Premium'))}</span>` : ''}
                    ${score != null ? `<span class="badge badge-approved" title="${esc(t('match_hint', 'How well you fit each other’s stated preferences'))}">${score}% ${esc(t('pref_match_long', 'preference match'))}</span>` : ''}
                </div>
                <p class="muted">${refCode(id)} · ${esc(t('created_by', 'Profile created by'))}: ${esc(label('createdFor', p.createdFor))} · ${esc(t('updated', 'Updated'))} ${fmtDate(p.updatedAt)}</p>
                <p class="mt-2" style="white-space:pre-line">${esc(p.about)}</p>
            </div>

            <div class="card">
                <h3 data-i18n="st_basic">Basic details</h3>
                <dl class="facts">
                    ${fact('f_dob', 'Age', age + ' ' + t('yrs', 'yrs'))}
                    ${fact('f_height', 'Height', heightLabel(p.height))}
                    ${fact('f_marital', 'Marital status', label('marital', p.marital))}
                    ${fact('f_children', 'Children', p.children)}
                    ${fact('f_religion', 'Religion', label('religion', p.religion))}
                    ${fact('f_ethnicity', 'Ethnicity', label('ethnicity', p.ethnicity))}
                    ${fact('f_motherTongue', 'Mother tongue', p.motherTongue && label('motherTongue', p.motherTongue))}
                    ${fact('f_caste', 'Caste', p.caste)}
                    ${fact('f_district', 'District', label('district', p.district))}
                    ${fact('f_city', 'Home town', p.city)}
                    ${fact('f_country', 'Lives in', countryName(p, getLang()))}
                    ${fact('f_residencyStatus', 'Residency status', p.residence === 'abroad' && p.residencyStatus && label('residencyStatus', p.residencyStatus))}
                    ${fact('f_relocate', 'Willing to relocate', p.relocate && label('relocate', p.relocate))}
                </dl>
            </div>

            <div class="card">
                <h3 data-i18n="st_career">Education & career</h3>
                <dl class="facts">
                    ${fact('f_education', 'Education', label('education', p.education))}
                    ${fact('f_educationDetail', 'Field / institute', p.educationDetail)}
                    ${fact('f_school', 'School', p.school)}
                    ${fact('f_profession', 'Profession', p.profession)}
                    ${fact('f_position', 'Job position', p.position)}
                    ${fact('f_employment', 'Employment type', p.employment && employmentShort(p.employment, getLang()))}
                    ${fact('f_employer', 'Sector', p.employer)}
                    ${fact('f_income', 'Monthly income', p.income)}
                </dl>
            </div>

            <div class="card">
                <h3 data-i18n="st_family">Family & lifestyle</h3>
                <dl class="facts">
                    ${fact('f_fatherOcc', "Father's occupation", p.fatherOcc)}
                    ${fact('f_motherOcc', "Mother's occupation", p.motherOcc)}
                    ${fact('f_siblings', 'Brothers & sisters', p.siblings)}
                    ${fact('f_familyHome', 'Family residence', p.familyHome)}
                    ${fact('f_diet', 'Diet', p.diet && label('diet', p.diet))}
                    ${fact('f_smoking', 'Smoking', p.smoking && label('smoking', p.smoking))}
                    ${fact('f_drinking', 'Drinking', p.drinking && label('drinking', p.drinking))}
                </dl>
            </div>

            <div class="card">
                <h3 data-i18n="st_horo">Horoscope</h3>
                <dl class="facts">
                    ${fact('f_nakatha', 'Nakatha', p.nakatha && label('nakatha', p.nakatha))}
                    ${fact('f_lagna', 'Lagna', p.lagna && label('lagna', p.lagna))}
                    ${fact('f_rasi', 'Rasi', p.rasi && label('rasi', p.rasi))}
                    ${fact('f_gana', 'Gana', p.gana && label('gana', p.gana))}
                    ${fact('f_horoscopeMatch', 'Horoscope matching', p.horoscopeMatch && label('horoscopeMatch', p.horoscopeMatch))}
                </dl>
            </div>

            <div class="card">
                <h3 data-i18n="st_partner">Partner preferences</h3>
                <dl class="facts">
                    ${fact('f_prefAge', 'Age', p.prefAgeMin || p.prefAgeMax ? `${p.prefAgeMin || 18} – ${p.prefAgeMax || '…'}` : '')}
                    ${fact('f_prefReligion', 'Religion', p.prefReligion ? label('religion', p.prefReligion) : t('any', 'Any'))}
                    ${fact('f_prefDistrict', 'District', p.prefDistrict ? label('district', p.prefDistrict) : t('any', 'Any'))}
                    ${fact('f_prefEducation', 'Minimum education', p.prefEducation ? label('education', p.prefEducation) : t('any', 'Any'))}
                    ${fact('f_prefResidence', 'Living in', p.prefResidence ? label('residence', p.prefResidence) : t('any', 'Any'))}
                    ${fact('f_prefProfession', 'Profession', p.prefProfession)}
                </dl>
                ${p.prefNotes ? `<p class="mt-2" style="white-space:pre-line">${esc(p.prefNotes)}</p>` : ''}
            </div>

            <div class="card" id="contact-card">
                <h3 data-i18n="contact_details">Contact details</h3>
                ${contact ? `<dl class="facts">
                    ${fact('f_contactName', 'Contact person', [contact.contactName, contact.contactRelation && `(${contact.contactRelation})`].filter(Boolean).join(' '))}
                    ${fact('f_fullname', 'Full name', [p.firstName, contact.lastName].filter(Boolean).join(' '))}
                    ${contact.phone ? `<div><dt>${esc(t('f_phone', 'Phone'))}</dt><dd><a href="tel:${esc(contact.phone.replace(/[^\d+]/g, ''))}">${esc(contact.phone)}</a></dd></div>` : ''}
                    ${contact.whatsapp ? `<div><dt>WhatsApp</dt><dd><a href="https://wa.me/${esc(contact.whatsapp.replace(/\D/g, '').replace(/^0/, '94'))}" target="_blank" rel="noopener">${esc(contact.whatsapp)}</a></dd></div>` : ''}
                    ${fact('f_birthTime', 'Birth time', contact.birthTime)}
                    ${fact('f_birthPlace', 'Birth place', contact.birthPlace)}
                </dl>
                ${own ? '' : `<p class="muted mt-2">${esc(t('safety_line', 'Stay safe: meet families in public places and never send money to anyone you meet online.'))} <a href="safety.html">${esc(t('foot_safety', 'Safety tips'))}</a></p>`}`
                : `<div class="lock">${ICON_LOCK}<div>${
                    !accepted ? esc(t('contact_locked_interest', 'Contact details are shared after both sides agree. Send an interest — if it is accepted, Premium members can see the phone number.'))
                    : `${esc(t('contact_locked_premium', 'Your interest was accepted! Upgrade to Premium to see the phone number and contact details.'))} <a class="btn btn-sm btn-gold mt-1" href="pricing.html">${esc(t('upgrade', 'Upgrade to Premium'))}</a>`
                }</div></div>`}
            </div>
        </section>
    </div>`;

    // gallery thumbs
    $$('.thumbs img').forEach(img => img.addEventListener('click', () => {
        $('#main-photo').innerHTML = `<img src="${photos[+img.dataset.i]}" alt="">`;
        $$('.thumbs img').forEach(x => x.classList.toggle('active', x === img));
    }));

    renderActions({ p, out, inc, accepted, myProfile, blocked, shortlisted });
    applyI18n(view);
}

function renderActions({ p, out, inc, accepted, myProfile, blocked, shortlisted }) {
    const box = $('#actions');
    if (own) { box.innerHTML = `<a class="btn btn-maroon btn-block" href="my-profile.html">${esc(t('edit_profile', 'Edit profile'))}</a>`; return; }

    let main;
    if (accepted) main = `<div class="alert alert-ok" style="margin:0">✓ ${esc(t('its_match', 'You are matched!'))}</div>`;
    else if (inc?.status === 'pending') main = `<p class="muted">${esc(t('they_sent', 'This person sent you an interest.'))}</p>
        <div class="row mt-1"><button class="btn btn-maroon" id="accept">${esc(t('accept', 'Accept'))}</button><button class="btn btn-ghost" id="decline">${esc(t('decline', 'Decline'))}</button></div>`;
    else if (out?.status === 'pending') main = `<button class="btn btn-ghost btn-block" disabled>${esc(t('interest_sent', 'Interest sent — waiting for reply'))}</button>`;
    else if (out?.status === 'declined') main = `<p class="muted">${esc(t('was_declined', 'This person declined your interest.'))}</p>`;
    else main = `<button class="btn btn-gold btn-block" id="send-interest">♥ ${esc(t('send_interest', 'Send interest'))}</button>`;

    box.innerHTML = `${main}
        <button class="btn btn-outline btn-block mt-1" id="shortlist">${shortlisted ? '★ ' + esc(t('shortlisted', 'Shortlisted')) : '☆ ' + esc(t('shortlist', 'Add to shortlist'))}</button>
        <div class="row mt-2" style="justify-content:space-between">
            <button class="btn btn-sm btn-ghost" id="block">${esc(blocked ? t('unblock', 'Unblock') : t('block', 'Block'))}</button>
            <button class="btn btn-sm btn-danger" id="report">⚑ ${esc(t('report', 'Report profile'))}</button>
        </div>`;

    $('#send-interest')?.addEventListener('click', async e => {
        const b = e.currentTarget;
        if (!me.user.emailVerified) { toast(t('verify_first', 'Please verify your email address first.'), true); return; }
        if (!myProfile) { toast(t('need_profile', 'Create your own profile before sending interests.'), true); setTimeout(() => (location.href = 'my-profile.html'), 1500); return; }
        if (myProfile.gender === p.gender) { toast(t('same_gender', 'You can only send interests to brides/grooms of the opposite gender.'), true); return; }
        b.disabled = true;
        try {
            if (!premium) {
                const snap = await getDocs(query(collection(db, 'interests'), where('from', '==', myId)));
                const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
                const used = snap.docs.filter(d => toDate(d.data().createdAt) >= start).length;
                if (used >= FREE_INTEREST_LIMIT) {
                    modal(`<h3>${esc(t('limit_title', 'Monthly limit reached'))}</h3>
                        <p>${esc(t('limit_body', `Free members can send ${FREE_INTEREST_LIMIT} interests per month. Upgrade to Premium for unlimited interests and to see contact details.`))}</p>
                        <div class="row mt-2"><button class="btn btn-ghost" data-close>${esc(t('cancel', 'Cancel'))}</button><span class="spacer"></span><a class="btn btn-gold" href="pricing.html">${esc(t('upgrade', 'Upgrade to Premium'))}</a></div>`);
                    b.disabled = false;
                    return;
                }
            }
            await setDoc(doc(db, 'interests', `${myId}_${id}`), { from: myId, to: id, status: 'pending', createdAt: serverTimestamp() });
            toast(t('interest_done', 'Interest sent! We’ll show you when they reply.'));
            render();
        } catch (err) { toast(friendlyError(err), true); b.disabled = false; }
    });

    for (const [btnId, status] of [['accept', 'accepted'], ['decline', 'declined']]) {
        $('#' + btnId)?.addEventListener('click', async () => {
            try {
                await updateDoc(doc(db, 'interests', `${id}_${myId}`), { status, respondedAt: serverTimestamp() });
                render();
            } catch (err) { toast(friendlyError(err), true); }
        });
    }

    $('#shortlist').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, 'users', myId), { shortlist: shortlisted ? arrayRemove(id) : arrayUnion(id) });
            me.account.shortlist = shortlisted ? (me.account.shortlist || []).filter(x => x !== id) : [...(me.account.shortlist || []), id];
            toast(shortlisted ? t('unshortlisted', 'Removed from shortlist.') : t('shortlisted_msg', 'Added to your shortlist.'));
            render();
        } catch (err) { toast(friendlyError(err), true); }
    });

    $('#block').addEventListener('click', async () => {
        try {
            await updateDoc(doc(db, 'users', myId), { blocked: blocked ? arrayRemove(id) : arrayUnion(id) });
            me.account.blocked = blocked ? (me.account.blocked || []).filter(x => x !== id) : [...(me.account.blocked || []), id];
            toast(blocked ? t('unblocked', 'Unblocked.') : t('blocked', 'Blocked. They can no longer send you interests.'));
            render();
        } catch (err) { toast(friendlyError(err), true); }
    });

    $('#report').addEventListener('click', () => {
        const m = modal(`<h3>⚑ ${esc(t('report', 'Report profile'))}</h3>
            <p class="muted">${esc(t('report_sub', 'Reports are confidential. Our team checks every report.'))}</p>
            <div class="field mt-2"><label>${esc(t('reason', 'Reason'))}</label><select id="r-reason"></select></div>
            <div class="field mt-1"><label>${esc(t('details', 'Details (optional)'))}</label><textarea id="r-details" maxlength="1000"></textarea></div>
            <div class="row mt-2"><button class="btn btn-ghost" data-close>${esc(t('cancel', 'Cancel'))}</button><span class="spacer"></span><button class="btn btn-danger" id="r-send">${esc(t('send_report', 'Send report'))}</button></div>`);
        fillSelect(m.querySelector('#r-reason'), 'reason');
        m.querySelector('#r-send').addEventListener('click', async () => {
            const reason = m.querySelector('#r-reason').value;
            if (!reason) { toast(t('pick_reason', 'Please choose a reason.'), true); return; }
            try {
                await addDoc(collection(db, 'reports'), {
                    by: myId, target: id, reason, details: m.querySelector('#r-details').value.trim(),
                    status: 'open', createdAt: serverTimestamp()
                });
                m.remove();
                toast(t('report_done', 'Thank you. Our team will review this profile.'));
            } catch (err) { toast(friendlyError(err), true); }
        });
    });
}

render().catch(err => (view.innerHTML = `<div class="alert alert-err">${esc(friendlyError(err))}</div>`));
