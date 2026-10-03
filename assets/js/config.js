// ==========================================================
//  Site settings — edit these values, nothing else needed.
// ==========================================================

// 1. Firebase: paste the config object from
//    Firebase console → Project settings → Your apps → Web app.
//    These values are public by design; security comes from firestore.rules.
export const firebaseConfig = {
    apiKey: "AIzaSyAZ7Yb_pKie4uOo5Yu78fj0A0BirniRZbQ",
    authDomain: "soubhagya-d4d68.firebaseapp.com",
    projectId: "soubhagya-d4d68",
    storageBucket: "soubhagya-d4d68.firebasestorage.app",
    messagingSenderId: "799244401099",
    appId: "1:799244401099:web:ff932d37c6beff729d5e4e"
};

// Show "Continue with Google" on the login page. Set to true once Google is
// enabled in Firebase → Authentication → Sign-in method.
export const GOOGLE_SIGNIN = false;

// 2. Premium packages (prices in LKR). Change freely.
export const PLANS = [
    { id: 'p3',  months: 3,  price: 2500 },
    { id: 'p6',  months: 6,  price: 4000, featured: true },
    { id: 'p12', months: 12, price: 6500 }
];

// 2b. Free launch: while on (the default), every member gets the Premium features free.
//     Admin switches it off with one click; this number is the target shown in Admin.
export const FREE_LAUNCH_TARGET = 100;   // live profiles

// 3. How many interests a free member may send per calendar month.
export const FREE_INTEREST_LIMIT = 5;

// 3b. Preference-match weights (percent). Change freely; they don't need to add up to 100.
//     These are illustrative weights for organising search, not a measure of relationship success.
export const MATCH_WEIGHTS = {
    career: 40,      // occupation area, education, seniority
    financial: 30,   // income range
    lifestyle: 30    // age, religion, location, overseas / relocation
};

// 4. Bank account shown on the payment page.
export const BANK = {
    bank: 'Your Bank Name',
    branch: 'Branch',
    accountName: 'Account Holder Name',
    accountNumber: '000000000000',
    swift: '',             // e.g. 'BKCHLKLX' — shown to members paying from abroad; leave '' to hide
    qrImage: ''            // e.g. 'images/lankaqr.png' — your bank's LankaQR code; leave '' to hide
};

// Business details printed on payment receipts.
export const RECEIPT = {
    businessName: 'Saubhagya Matrimony',
    address: '',           // e.g. 'No. 1, Main Street, Kandy'
    registration: ''       // e.g. business registration number, once registered
};

// 5. Contact details shown in the footer.
export const SITE_CONTACT = {
    email: 'hello@example.com',
    phone: '+94 7X XXX XXXX'
};
