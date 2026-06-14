# 🚀 Live Deployment Guide — DegreeAttest

Goal: a permanent public URL your teacher can open anytime.

```
Frontend (Vercel)  ──►  Backend (Render)  ──►  MongoDB Atlas
                              │
                              └──►  Smart contract on Sepolia testnet
```

You'll need (free): a **GitHub** account, **Vercel**, **Render**, **MongoDB Atlas**,
and an **Alchemy** account (for a Sepolia RPC URL). Follow the steps in order.

> 💡 The headline **public QR verification is read-only and free** (no gas). Only
> *issuing* and *revoking* degrees cost a little Sepolia test-ETH (free from a faucet).

---

## Step 1 — Generate wallets + secrets (5 min, local)

From the `degree-attestation` folder:

```bash
# 3 fresh wallets (deployer/university/employer)
node scripts/genwallet.js

# a JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# a 64-hex AES key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep the output somewhere safe — you'll paste these into env vars below.

> **Simplest path:** use **wallet #0 for everything**. Set `DEPLOYER_PRIVATE_KEY`
> to wallet #0's key and `ADMIN_WALLET = UNIVERSITY_WALLET = EMPLOYER_WALLET =`
> wallet #0's address. Then you only fund one wallet. (You can use 3 separate
> wallets for a more "realistic" demo — then run `scripts/fund.js`.)

---

## Step 2 — Sepolia RPC + faucet (10 min)

1. Create a free account at **alchemy.com** → **Create App** → chain **Ethereum**,
   network **Sepolia** → copy the **HTTPS URL**. That's your `SEPOLIA_RPC_URL`.
2. Get test ETH for wallet #0's address from a faucet:
   - https://sepoliafaucet.com  (Alchemy) or  https://www.infura.io/faucet/sepolia
   - 0.1–0.5 Sepolia ETH is plenty.
3. (If using 3 wallets) after Step 4 deploy, run `node scripts/fund.js` to send a
   little gas to the university + employer wallets.

---

## Step 3 — MongoDB Atlas (10 min)

1. **cloud.mongodb.com** → create a free **M0** cluster.
2. **Database Access** → add a user (username + password).
3. **Network Access** → **Add IP** → `0.0.0.0/0` (allow from anywhere — Render needs this).
4. **Connect → Drivers** → copy the connection string. It looks like:
   `mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/degree_attestation?retryWrites=true&w=majority`
   (add `/degree_attestation` before the `?` to name the database.) That's `MONGO_URI`.

---

## Step 4 — Deploy the contract to Sepolia (5 min, local)

Create `degree-attestation/.env` (copy from `.env.example`) and fill at least:

```
SEPOLIA_RPC_URL=...           # from Step 2
DEPLOYER_PRIVATE_KEY=0x...    # wallet #0 (funded)
```

Then:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

✅ This deploys `DegreeContract` to Sepolia and writes the address + ABI into
`backend/config/contractInfo.json`. **Commit that file** (Step 6 needs it).
Copy the printed address — that's your `CONTRACT_ADDRESS`.

---

## Step 5 — Seed the user accounts into Atlas (2 min, local)

Add the rest to your local `.env`:

```
MONGO_URI=...                 # from Step 3 (Atlas)
ADMIN_WALLET=0x...            # wallet #0 (or your admin wallet)
UNIVERSITY_WALLET=0x...       # wallet #0 (or wallet #1)
EMPLOYER_WALLET=0x...         # wallet #0 (or wallet #2)
JWT_SECRET=...                # from Step 1
ENCRYPTION_KEY=...            # 64-hex from Step 1
```

```bash
node backend/scripts/initAdmin.js
# (optional, if using 3 wallets) node scripts/fund.js
```

✅ Creates the admin / university / employer logins in Atlas.

---

## Step 6 — Push to GitHub (5 min)

```bash
cd degree-attestation
git init
git add .
git commit -m "Deploy: cloud-ready degree attestation"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/degree-attestation.git
git branch -M main
git push -u origin main
```

> `.env` is gitignored (good). Make sure `backend/config/contractInfo.json`
> **did** get committed (`git status` should not list it as ignored).

---

## Step 7 — Deploy the backend on Render (10 min)

1. **render.com** → **New → Web Service** → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
3. **Environment** → add these variables:

   | Key | Value |
   |---|---|
   | `RPC_URL` | your Sepolia RPC URL |
   | `CONTRACT_ADDRESS` | from Step 4 |
   | `MONGO_URI` | from Step 3 |
   | `DEPLOYER_PRIVATE_KEY` | wallet #0 key |
   | `JWT_SECRET` | from Step 1 |
   | `JWT_EXPIRES_IN` | `8h` |
   | `ENCRYPTION_KEY` | 64-hex from Step 1 |
   | `ADMIN_WALLET` / `UNIVERSITY_WALLET` / `EMPLOYER_WALLET` | your addresses |

4. Deploy. When live, note the URL, e.g. `https://degreeattest-api.onrender.com`.
5. Test it: open `https://<your-render-url>/api/public/chain-status` →
   you should see JSON with `"online": true` and a block number. ✅

> Free Render services **sleep after ~15 min idle**; the first request then takes
> ~30–50s to wake. Just open the API URL once a minute before your demo to keep it warm.

---

## Step 8 — Deploy the frontend on Vercel (5 min)

1. **vercel.com** → **Add New → Project** → import the same repo.
2. Settings:
   - **Root Directory:** `frontend`
   - Framework preset: **Vite** (auto-detected)
   - Build Command: `npm run build` · Output: `dist` (auto)
3. **Environment Variables** → add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-render-url>/api` |

4. Deploy. You'll get a URL like `https://degreeattest.vercel.app` — **this is the link for your teacher.** 🎉

> `vercel.json` (already in `frontend/`) makes deep links like `/verify-degree`
> work on refresh.

---

## Step 9 — Go live: grant roles & issue a degree (5 min)

Open your Vercel URL and:

1. **Sign in as admin** (`admin@iqra.edu.pk` / `Admin@1234`) → **Users** →
   Grant **UNIVERSITY** and **EMPLOYER** roles to your wallet address(es).
2. **Sign in as university** → **Issue Degree** (paste the university wallet key) →
   issue a real degree on Sepolia.
3. Open its **Certificate** → the QR now points to your live Vercel URL.
4. **Scan the QR with your phone** → public verifier shows ✅ **VALID** — anywhere in the world.

You can even check the transaction on **https://sepolia.etherscan.io** by pasting
the tx hash — great proof for your teacher that it's truly on a public blockchain.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| API `/chain-status` shows `online:false` | Check `RPC_URL` + `CONTRACT_ADDRESS` on Render; make sure the contract was deployed to Sepolia. |
| "No contract bytecode at …" on Render boot | `CONTRACT_ADDRESS` doesn't match the Sepolia deploy, or `contractInfo.json` wasn't committed. |
| Issue/verify fails with "insufficient funds" | The signing wallet has no Sepolia ETH — fund it (Step 2) or run `scripts/fund.js`. |
| Login works but data is empty | Run `initAdmin.js` against the **Atlas** `MONGO_URI` (Step 5). |
| First request very slow | Render free tier was asleep — it woke up; subsequent requests are fast. |
| CORS error in browser | Confirm `VITE_API_URL` points at the Render URL **with `/api`** and redeploy Vercel. |
