# Saubhagya — setup guide

The website is plain HTML/CSS/JavaScript hosted free on **GitHub Pages**.
Accounts, profiles and photos are stored in **Google Firebase** (free Spark plan, no card needed).

## 1. Create the Firebase project (one time, ~10 minutes)

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. **Create a project** → name it `saubhagya` → you can turn Google Analytics off → **Create**.
3. **Add a web app:** on the project home page click the **</>** (Web) icon → nickname `saubhagya-web` → **Register app**.
   Firebase shows a `firebaseConfig = { ... }` block. Copy those six values into
   [`assets/js/config.js`](assets/js/config.js) (replace every `PASTE_...`).
4. **Turn on sign-in:** left menu **Build → Authentication → Get started**, then on the **Sign-in method** tab enable:
   - **Email/Password**
   - **Google** (choose a support email)
5. **Allow your website address:** Authentication → **Settings → Authorized domains → Add domain** → `rohanafomax.github.io`
6. **Create the database:** **Build → Firestore Database → Create database** → choose location `asia-south1 (Mumbai)` (closest to Sri Lanka) → **Start in production mode**.
7. **Security rules:** Firestore Database → **Rules** tab → delete everything → paste the whole of
   [`firestore.rules`](firestore.rules) → **Publish**.

## 2. Make yourself the admin

1. Open the website and register with your own email. Verify the email.
2. Firebase console → **Firestore Database → Data** → `users` → click your document.
3. Click the `role` field, change `member` to `admin`, **Update**.
4. Reload the website — an **Admin** link appears in the menu.

## 3. Change site settings

Everything you are likely to change is in [`assets/js/config.js`](assets/js/config.js):

| Setting | What it does |
|---|---|
| `PLANS` | Premium packages and prices (LKR) |
| `FREE_INTEREST_LIMIT` | Interests a free member may send per month |
| `BANK` | Account shown on the payment page |
| `SITE_CONTACT` | Email and phone in the footer |

## 4. Daily admin work

Open **Admin** on the website:

- **Profiles** — approve new/edited profiles, or send back with a reason.
- **Payments** — check the slip against your bank account, then *Approve & activate Premium*.
- **ID checks** — compare NIC, selfie and profile photo; approve to give the blue *ID verified* badge. The images are deleted when you decide.
- **Reports** — remove fake profiles or dismiss reports.
- **Find member** — look up anyone by reference code (e.g. `SB-4F7K2`).

## How privacy is enforced

Security is enforced by Firebase, not by hiding things on the page:

| Data | Who can read it |
|---|---|
| `profiles` (public details) | Signed-in members, and only once approved |
| `photos` | Members, or only accepted matches — the member chooses |
| `contacts` (phone, surname, birth time) | The owner, admins, and **Premium members with an accepted interest** |
| `users` (plan, role) | The owner and admins. Only admins can change plan/role |
| `payments`, `verifications` | The owner and admins |
| `reports` | Admins only |

## Free plan limits (Firebase Spark)

- 1 GiB database (photos are shrunk to ~100–180 KB each)
- 50,000 reads / 20,000 writes per day
- 50,000 monthly active users

When the site outgrows this, upgrade to Firebase **Blaze** (pay-as-you-go) and photos can move to Firebase Storage.

## Not built yet (planned next)

- Private chat between matched members
- Tamil language
- Gold / featured-profile tier and home-page featured profiles
- PayHere card payments (needs a PayHere merchant account)
- Email/SMS notifications (needs a server function on the Blaze plan)
