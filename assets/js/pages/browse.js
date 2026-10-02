import {
    doc, getDoc, getDocs, collection, query, where, limit
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { db, configured, whenReady, me, t, $, esc, label, fillSelect, ageFrom, heightLabel, refCode, toDate, friendlyError, applyI18n, getLang } from '../app.js';
import {
    EDUCATION, countryName, tierOf, occupationLabel, occupationOf, isNotWorking, incomeIndex, seniorityIndex,
    areasOf, profilesKm, sameProvince
} from '../data.js';
import { matchScore } from '../match.js';

const PAGE = 24;
const params = new URLSearchParams(location.search);
let all = [], shown = 0, cache = {}, myProfile = null;

fillSelect($('#q-gender'), 'gender');
$('#q-gender').options[0].remove();
for (const [id, list, any] of [
    ['religion', 'religion', 'Any religion'], ['ethnicity', 'ethnicity', 'Any'], ['motherTongue', 'motherTongue', 'Any'],
    ['district', 'district', 'Any district'], ['residence', 'residence', 'Sri Lanka or overseas'], ['country', 'country', 'Any country'],
    ['marital', 'marital', 'Any'], ['education', 'education', 'Any'], ['occGroup', 'occGroup', 'Any'],
    ['seniority', 'seniority', 'Any'], ['income', 'incomeMin', 'Any']
]) fillSelect($('#q-' + id), list, { any: t('any', any) });

// Prefill from URL (home page search)
for (const k of ['gender', 'religion', 'district', 'agemin', 'agemax']) if (params.get(k)) $('#q-' + k).value = params.get(k);

const ICON_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const ICON_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5 9-10"/></svg>';

const isPrem = p => p.premium && toDate(p.premiumUntil) > new Date();

function card(p) {
    const age = ageFrom(p.dob);
    const photo = p.photoVisibility === 'members' && p.photoCount
        ? `<div class="ph" data-photo="${p.uid}">${ICON_USER}</div>`
        : `<div class="ph">${ICON_LOCK}${esc(t('photo_protected', 'Photo visible after interest is accepted'))}</div>`;
    const shortlisted = (me()?.account?.shortlist || []).includes(p.uid);
    return `<a class="p-card${isPrem(p) ? ' premium' : ''}" href="profile.html?id=${p.uid}">
        <div class="p-photo">${photo}<div class="badges">
            ${p.verified ? `<span class="badge badge-verified">${ICON_TICK}${esc(t('id_verified', 'ID verified'))}</span>` : ''}
            ${p.jobVerified ? `<span class="badge badge-job">${ICON_TICK}${esc(t('job_verified', 'Job verified'))}</span>` : ''}
            ${isPrem(p) ? `<span class="badge badge-premium">★</span>` : ''}
            ${shortlisted ? `<span class="badge badge-pending">☆</span>` : ''}
        </div></div>
        <div class="p-body">
            <h3>${esc(p.firstName)}, ${age}</h3>
            <div class="meta">${[label('religion', p.religion), label('ethnicity', p.ethnicity)].map(esc).join(' · ')}</div>
            <div class="meta">${esc(p.city || '')}${p.city ? ', ' : ''}${esc(label('district', p.district))}${p.liveDistrict ? ` (${esc(t('lives_in', 'lives in'))} ${esc(label('district', p.liveDistrict))})` : ''}${p._km != null ? ` · ${p._km === 0 ? esc(t('same_area', 'your area')) : '~' + p._km + ' km'}` : ''}${p.residence === 'abroad' ? ' · ' + esc(countryName(p, getLang())) + (p.residencyStatus ? ` (${esc(label('residencyStatus', p.residencyStatus))})` : '') : ''}</div>
            <div class="meta">${esc(occupationLabel(p, getLang()) || p.profession)}${p.seniority ? ' · ' + esc(label('seniority', p.seniority)) : ''}</div>
            <div class="meta">${esc(label('education', p.education))}${p.profession && occupationLabel(p) ? ' · ' + esc(p.profession) : ''}</div>
            <div class="meta">${heightLabel(p.height).split(' (')[0]} · ${esc(label('marital', p.marital))}</div>
            <div class="row" style="margin-top:.5rem;justify-content:space-between">
                <span class="ref">${refCode(p.uid)}</span>
                ${p._score != null ? `<span class="badge badge-approved" title="${esc(t('match_hint', 'How well you fit each other’s stated preferences'))}">${p._score}% ${esc(t('pref_match', 'match'))}</span>` : ''}
            </div>
        </div>
    </a>`;
}

async function loadPhotos(root) {
    for (const el of root.querySelectorAll('[data-photo]')) {
        const id = el.dataset.photo;
        el.removeAttribute('data-photo');
        getDoc(doc(db, 'photos', `${id}_0`)).then(s => {
            if (s.exists()) el.outerHTML = `<img src="${s.data().data}" alt="" loading="lazy">`;
        }).catch(() => {});
    }
}

function renderMore() {
    const grid = $('#grid');
    const slice = all.slice(shown, shown + PAGE);
    const tmp = document.createElement('div');
    tmp.innerHTML = slice.map(card).join('');
    loadPhotos(tmp);
    grid.append(...tmp.children);
    shown += slice.length;
    $('#more').hidden = shown >= all.length;
}

/** "Distance from my area" filter — uses home and current districts of both people. */
function nearEnough(p, near) {
    if (!near) return true;
    if (!myProfile || !areasOf(myProfile).length) return true;      // nothing to measure from
    if (near === 'province') return areasOf(myProfile).some(a => areasOf(p).some(b => sameProvince(a, b)));
    const km = profilesKm(myProfile, p);
    return km != null && km <= Number(near);
}

async function search() {
    const gender = $('#q-gender').value;
    const res = $('#results');
    res.innerHTML = '<div class="spinner"></div>';
    try {
        if (!cache[gender]) {
            const snap = await getDocs(query(collection(db, 'profiles'),
                where('status', '==', 'approved'), where('gender', '==', gender), limit(500)));
            cache[gender] = snap.docs.map(d => d.data());
        }
        const amin = +$('#q-agemin').value || 18, amax = +$('#q-agemax').value || 99;
        const f = id => $('#q-' + id).value;
        const eduRank = v => EDUCATION.findIndex(e => e.v === v);
        const account = me()?.account || {};
        const blocked = account.blocked || [];
        const shortlist = account.shortlist || [];
        const myId = me()?.user?.uid;

        all = cache[gender].filter(p => {
            const a = ageFrom(p.dob);
            return p.uid !== myId && a >= amin && a <= amax
                && (!f('religion') || p.religion === f('religion'))
                && (!f('ethnicity') || p.ethnicity === f('ethnicity'))
                && (!f('motherTongue') || p.motherTongue === f('motherTongue'))
                && (!f('district') || areasOf(p).includes(f('district')))
                && nearEnough(p, f('near'))
                && (!f('residence') || (p.residence || 'lk') === f('residence'))
                && (!f('country') || p.country === f('country'))
                && (!f('relocate') || ['either', 'discuss', f('relocate')].includes(p.relocate))
                && (!f('marital') || p.marital === f('marital'))
                && (!f('education') || eduRank(p.education) >= eduRank(f('education')))
                && (!f('occGroup') || occupationOf(p)?.group === f('occGroup'))
                && (!f('seniority') || seniorityIndex(p.seniority) >= seniorityIndex(f('seniority')))
                && (!f('income') || incomeIndex(p.incomeRange) >= incomeIndex(f('income')))
                && (!$('#q-verified').checked || p.verified)
                && (!$('#q-shortlist').checked || shortlist.includes(p.uid))
                && (!$('#q-working').checked || !isNotWorking(p))
                && (!$('#q-jobverified').checked || p.jobVerified)
                && !blocked.includes(p.uid);
        });
        for (const p of all) {
            p._score = matchScore(myProfile, p);
            p._km = myProfile ? profilesKm(myProfile, p) : null;
        }

        const newest = (a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0);
        const sort = f('sort');
        const score = p => p._score ?? -1;
        const verifiedCount = p => (p.verified ? 1 : 0) + (p.jobVerified ? 1 : 0);
        all.sort((a, b) => {
            if (isPrem(a) !== isPrem(b)) return isPrem(b) - isPrem(a);              // Premium always first
            if (sort === 'best') return score(b) - score(a) || newest(a, b);         // the member's own preferences
            if (sort === 'new') return newest(a, b);
            if (sort === 'verified') return verifiedCount(b) - verifiedCount(a) || newest(a, b);
            // 'recommended': provisional occupation tiers, then verified, then best match, then nearest, then newest
            const km = p => p._km ?? 9999;
            return tierOf(a) - tierOf(b) || verifiedCount(b) - verifiedCount(a) || score(b) - score(a) || km(a) - km(b) || newest(a, b);
        });

        shown = 0;
        res.innerHTML = `<div class="results-bar"><strong>${all.length} ${esc(t('profiles_found', 'profiles found'))}</strong>
                ${myProfile ? '' : `<span class="muted">${esc(t('match_tip', 'Create your profile and add partner preferences to see match %.'))}</span>`}</div>
            ${all.length ? '<div class="profile-grid" id="grid"></div>' : `<div class="empty"><p>${esc(t('no_results', 'No profiles match these filters yet. Try widening your search.'))}</p></div>`}
            <div class="center mt-3"><button class="btn btn-outline" id="more" hidden>${esc(t('load_more', 'Show more'))}</button></div>`;
        $('#more').addEventListener('click', renderMore);
        if (all.length) renderMore();
    } catch (e) {
        res.innerHTML = `<div class="alert alert-err">${esc(friendlyError(e))}</div>`;
    }
}

$('#filters').addEventListener('submit', e => { e.preventDefault(); search(); });

const m = await whenReady();
if (!configured || !m) {
    $('#results').innerHTML = `<div class="card center">
        <h2>${esc(t('login_to_browse', 'Log in to see proposals'))}</h2>
        <p class="muted">${esc(t('login_to_browse_sub', 'To protect our members’ privacy, profiles are only visible to registered members. Registration is free.'))}</p>
        <div class="row mt-2" style="justify-content:center">
            <a class="btn btn-gold" href="login.html?mode=register&next=browse.html">${esc(t('nav_register', 'Register Free'))}</a>
            <a class="btn btn-outline" href="login.html?next=browse.html">${esc(t('nav_login', 'Log in'))}</a>
        </div></div>`;
} else {
    try {
        const own = await getDoc(doc(db, 'profiles', m.user.uid));
        if (own.exists()) {
            myProfile = own.data();
            // default to the opposite of the member's own profile
            if (!params.get('gender')) $('#q-gender').value = myProfile.gender === 'male' ? 'female' : 'male';
        }
    } catch {}
    search();
}
applyI18n();
