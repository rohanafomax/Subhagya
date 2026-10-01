// ==========================================================
//  Site settings — edit these values, nothing else needed.
// ==========================================================

// 1. Firebase: paste the config object from
//    Firebase console → Project settings → Your apps → Web app.
//    These values are public by design; security comes from firestore.rules.
export const firebaseConfig = {
    apiKey: "PASTE_API_KEY",
    authDomain: "PASTE_PROJECT.firebaseapp.com",
    projectId: "PASTE_PROJECT_ID",
    storageBucket: "PASTE_PROJECT.appspot.com",
    messagingSenderId: "PASTE_SENDER_ID",
    appId: "PASTE_APP_ID"
};

// 2. Premium packages (prices in LKR). Change freely.
export const PLANS = [
    { id: 'p3',  months: 3,  price: 2500 },
    { id: 'p6',  months: 6,  price: 4000, featured: true },
    { id: 'p12', months: 12, price: 6500 }
];

// 3. How many interests a free member may send per calendar month.
export const FREE_INTEREST_LIMIT = 5;

// 4. Bank account shown on the payment page.
export const BANK = {
    bank: 'Your Bank Name',
    branch: 'Branch',
    accountName: 'Account Holder Name',
    accountNumber: '000000000000'
};

// 5. Contact details shown in the footer.
export const SITE_CONTACT = {
    email: 'hello@example.com',
    phone: '+94 7X XXX XXXX'
};
