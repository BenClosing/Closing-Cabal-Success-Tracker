# Closing Cabal Sales OS — Deployable App

Login = **your Whop email → create a password** (only paying Whop members can make an account). Cancel on Whop → access cut.

Stack: **React (Vite)** front-end on **Vercel** · **Supabase** for login + database · **one Vercel function** that listens to Whop.

This folder is the foundation: backend, login, and project scaffolding. The last file — `src/App.jsx`, your full UI — gets added next (it's your prototype with the storage swapped for Supabase). Everything here is real but **untested until you deploy**, so expect one round of "it errored, here's the message" with me.

---

## How login works (plain English)
1. Someone pays on Whop → Whop pings `api/whop-webhook.js` with their email → it's added to the `approved_members` list.
2. They visit your site, enter that email, and set a password. A database rule blocks anyone whose email isn't on the approved list, so only paying members can create an account.
3. If they cancel on Whop, the webhook flips them to inactive and they're signed out / locked out.

---

## Setup, in order

### 1. Supabase
1. Create a free Supabase project. From **Project Settings → API**, copy: **Project URL**, **anon key**, **service_role key**.
2. Open **SQL Editor**, paste all of `supabase-setup.sql`, run it.
3. **Authentication → Providers → Email:** turn **OFF** "Confirm email" (the Whop purchase already verified them, so they can log in right after setting a password).

### 2. Whop
1. Whop **Developer settings → create an app** (or use webhooks directly).
2. Add a **webhook** → URL `https://YOUR-SITE.vercel.app/api/whop-webhook` → subscribe to **membership went valid** and **membership went invalid**. (You'll set the real URL after the first deploy, then come back and update it.)

### 3. The code
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the values (see below).
3. `npm run dev` to test locally once `src/App.jsx` is in place.

### 4. Deploy (Vercel)
1. Push this folder to a GitHub repo.
2. Import it into Vercel → it auto-detects Vite → Deploy. You get a live URL.
3. In Vercel **Project → Settings → Environment Variables**, add everything from your `.env`.
4. Go back to Whop and set the webhook URL to your real Vercel domain.

---

## Environment variables
| Name | Where it's used | Where to get it |
|---|---|---|
| `VITE_SUPABASE_URL` | front-end | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | front-end | Supabase anon key |
| `SUPABASE_URL` | webhook function | same Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook function | Supabase service_role key (**server-only, never in front-end**) |
| `WHOP_WEBHOOK_SECRET` | webhook function (optional) | Whop webhook signing secret |

---

## What's left after this foundation
Add `src/App.jsx` — your full prototype UI with two changes I'll make for you:
1. Every `store.get/set/list` becomes `db.get/set/list` (same shape — that's why it's nearly a rename).
2. The fake login screen is removed; `App` now receives `{ me, updateMe, signOut }` from `AuthGate` (already built in `src/auth.jsx`).

Say the word and I'll output that file.
