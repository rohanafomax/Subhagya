// Basic porondam (marriage compatibility) — an automatic guide, NOT a replacement
// for an astrologer. Calculated from the bride's and groom's nakatha (birth star)
// and rashi (moon sign) using common rules. Traditions differ, so every table is
// here in one place for an astrologer to check and adjust.
//
// Nakatha numbers follow NAKATH in data.js: 0 = Ashwini (අස්විද) … 26 = Revati (රේවතී).
// Rashi numbers follow LAGNA in data.js: 0 = Mesha (මේෂ) … 11 = Meena (මීන).
import { NAKATH, LAGNA } from './data.js';

const GANA = {        // Deva / Manushya / Rakshasa
    deva: [0, 4, 6, 7, 12, 14, 16, 21, 26],
    manushya: [1, 3, 5, 10, 11, 19, 20, 24, 25],
    rakshasa: [2, 8, 9, 13, 15, 17, 18, 22, 23]
};
const NADI = [        // Adi, Madhya, Antya
    [0, 5, 6, 11, 12, 17, 18, 23, 24],
    [1, 4, 7, 10, 13, 16, 19, 22, 25],
    [2, 3, 8, 9, 14, 15, 20, 21, 26]
];
const RAJJU = [       // Pada, Kati, Nabhi, Kantha, Shiro
    [0, 8, 9, 17, 18, 26],
    [1, 7, 10, 16, 19, 25],
    [2, 6, 11, 15, 20, 24],
    [3, 5, 12, 14, 21, 23],
    [4, 13, 22]
];
const VEDHA = [       // pairs (and one group of three) that obstruct each other
    [0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26],
    [10, 25], [11, 24], [12, 23], [4, 13, 22]
];
const DINA_GOOD = [0, 2, 4, 6, 8];                       // count from bride's star, remainder after ÷9 (0 = 9)
const MAHENDRA_GOOD = [4, 7, 10, 13, 16, 19, 22, 25];
const STHREE_DEERGHA_MIN = 13;                            // some astrologers use 9
const RASHI_BAD = [2, 12, 5, 9, 6, 8];                    // 2/12, 5/9 and 6/8 positions

export const PORONDAM_NAMES = {
    dina: ['Dina', 'දින'], gana: ['Gana', 'ගණ'], mahendra: ['Mahendra', 'මහේන්ද්‍ර'],
    sthree: ['Sthree Deergha', 'ස්ත්‍රී දීර්ඝ'], rashi: ['Rashi', 'රාශි'], rajju: ['Rajju', 'රජ්ජු'],
    vedha: ['Vedha', 'වේධ'], nadi: ['Nadi', 'නාඩි']
};

const nakIndex = v => NAKATH.findIndex(n => n.v === v);
const rashiIndex = v => LAGNA.findIndex(r => r.v === v);
const groupOf = (groups, i) => groups.findIndex(g => g.includes(i));
const ganaOf = i => Object.keys(GANA).find(k => GANA[k].includes(i));

/**
 * Basic porondam between a bride and a groom profile.
 * Returns null when either nakatha is missing, otherwise
 * { sameStar, matched, total, checks: [{ key, ok }] }.
 */
export function porondam(bride, groom) {
    const b = nakIndex(bride?.nakatha), g = nakIndex(groom?.nakatha);
    if (b < 0 || g < 0) return null;

    const count = ((g - b + 27) % 27) + 1;               // 1–27, counting the bride's star as 1
    const checks = [];
    const add = (key, ok) => checks.push({ key, ok });

    add('dina', DINA_GOOD.includes(count % 9));
    const gb = ganaOf(b), gg = ganaOf(g);
    add('gana', gb === gg || (gb !== 'rakshasa' && gg !== 'rakshasa'));
    add('mahendra', MAHENDRA_GOOD.includes(count));
    add('sthree', count >= STHREE_DEERGHA_MIN);

    const rb = rashiIndex(bride?.rasi), rg = rashiIndex(groom?.rasi);
    if (rb >= 0 && rg >= 0) add('rashi', !RASHI_BAD.includes(((rg - rb + 12) % 12) + 1));

    add('rajju', b === g ? false : groupOf(RAJJU, b) !== groupOf(RAJJU, g));
    add('vedha', !VEDHA.some(set => set.includes(b) && set.includes(g) && b !== g));
    add('nadi', groupOf(NADI, b) !== groupOf(NADI, g));

    return { sameStar: b === g, matched: checks.filter(c => c.ok).length, total: checks.length, checks };
}

/** Works out who is the bride and who is the groom, then calls porondam(). */
export function porondamFor(a, b) {
    if (!a?.gender || !b?.gender || a.gender === b.gender) return null;
    return a.gender === 'female' ? porondam(a, b) : porondam(b, a);
}
