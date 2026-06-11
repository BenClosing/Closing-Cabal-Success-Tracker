import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { db } from "./lib/db";

const today = () => new Date().toISOString().slice(0, 10);

// Find or create this user's profile row inside the shared `users` list in kv.
async function loadProfile(user) {
  const users = (await db.get("users")) || [];
  let p = users.find((u) => u.id === user.id);
  if (!p) {
    p = {
      id: user.id,
      email: user.email,
      name: (user.email || "").split("@")[0],
      role: "student",
      goal: "",
      onboarded: false,
      active: true,
      joinDate: today(),
    };
    await db.set("users", [...users, p]);
  }
  return p;
}

export function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [me, setMe] = useState(null);
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("type=recovery")
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (!session) { setMe(null); return; }
      // Membership still active? (covers cancel/lapse between logins)
      const { data } = await supabase
        .from("approved_members")
        .select("active")
        .ilike("email", session.user.email || "")
        .maybeSingle();
      if (data && data.active === false) {
        setNotice("Your Whop membership is no longer active. Contact a coach if this is a mistake.");
        await supabase.auth.signOut();
        return;
      }
      setMe(await loadProfile(session.user));
    })();
  }, [session]);

  async function updateMe(patch) {
    const users = (await db.get("users")) || [];
    const next = users.map((u) => (u.id === me.id ? { ...u, ...patch } : u));
    await db.set("users", next);
    setMe((m) => ({ ...m, ...patch }));
  }
  function signOut() { supabase.auth.signOut(); }

  if (recovery) return <SetNewPassword onDone={() => setRecovery(false)} />;
  if (session === undefined) return <Center>Loading the Cabal…</Center>;
  if (!session || !me) return <AuthScreens notice={notice} />;
  return children({ me, updateMe, signOut });
}

function AuthScreens({ notice }) {
  const [view, setView] = useState("login"); // login | create | forgot
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(notice || "");
  const [busy, setBusy] = useState(false);

  async function login() {
    setErr(""); setMsg(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) setErr("Wrong email or password — or you haven't created a password yet. If you're new, tap 'Create your password' below.");
  }

  async function create() {
    setErr(""); setMsg("");
    const mail = email.trim();
    if (!mail) return setErr("Enter your email first.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    // Friendly pre-check: a missing membership shows a clear message instead of a raw database error.
    const { data: appr, error: aerr } = await supabase
      .from("approved_members").select("active").ilike("email", mail).maybeSingle();
    if (aerr) { setBusy(false); return setErr("Couldn't verify your membership right now. Please try again in a moment."); }
    if (!appr || appr.active === false) {
      setBusy(false);
      return setErr("We couldn't find an active membership for that email. Use the EXACT email you purchased with on Whop. Just bought? Give it a minute and try again — or ask a coach to approve you.");
    }
    const { error } = await supabase.auth.signUp({ email: mail, password: pw });
    setBusy(false);
    if (error) {
      const m = String(error.message).toLowerCase();
      if (m.includes("already") || m.includes("registered"))
        setErr("You already have an account with this email — use 'Log in' instead, or reset your password.");
      else setErr("Couldn't create your account. Please try again, or contact a coach.");
    }
  }

  async function forgot() {
    setErr(""); setMsg("");
    const mail = email.trim();
    if (!mail) return setErr("Enter your email first.");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("If that email has an account, a reset link is on its way. Check your spam folder too.");
  }

  return (
    <div style={S.wrap}>
      <style>{FONT}</style>
      <div style={S.card}>
        <div style={S.brand}><div style={S.mark}>C</div><div><div style={S.small}>CLOSING CABAL</div><div style={S.h1}>Success Tracker</div></div></div>

        {view === "login" && <>
          <h2 style={S.title}>Log in</h2>
          <p style={S.sub}>Use the email you paid with on Whop.</p>
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={pw} onChange={setPw} onEnter={login} />
          <button style={S.btn} onClick={login} disabled={busy}>{busy ? "…" : "Log in"}</button>
          <button style={S.ghost} onClick={() => { setView("create"); setErr(""); setMsg(""); setPw(""); }}>First time? Create your password</button>
          <button style={S.link} onClick={() => { setView("forgot"); setErr(""); setMsg(""); }}>Forgot password?</button>
        </>}

        {view === "create" && <>
          <h2 style={S.title}>Create your password</h2>
          <p style={S.sub}>Enter the email you used on Whop and choose a password.</p>
          <Field label="Whop email" value={email} onChange={setEmail} />
          <Field label="New password" type="password" value={pw} onChange={setPw} onEnter={create} />
          <button style={S.btn} onClick={create} disabled={busy}>{busy ? "…" : "Create account & enter"}</button>
          <button style={S.ghost} onClick={() => { setView("login"); setErr(""); setMsg(""); setPw(""); }}>Back to log in</button>
        </>}

        {view === "forgot" && <>
          <h2 style={S.title}>Reset password</h2>
          <p style={S.sub}>We'll email you a link to set a new password.</p>
          <Field label="Email" value={email} onChange={setEmail} onEnter={forgot} />
          <button style={S.btn} onClick={forgot} disabled={busy}>{busy ? "…" : "Send reset link"}</button>
          <button style={S.ghost} onClick={() => { setView("login"); setErr(""); setMsg(""); }}>Back to log in</button>
        </>}

        {err && <p style={S.err}>{err}</p>}
        {msg && <p style={S.ok}>{msg}</p>}
      </div>
    </div>
  );
}

function SetNewPassword({ onDone }) {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function save() {
    setErr(""); setMsg("");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg("Password updated — logging you in…");
    window.history.replaceState({}, "", window.location.pathname);
    setTimeout(onDone, 900);
  }
  return (
    <div style={S.wrap}>
      <style>{FONT}</style>
      <div style={S.card}>
        <div style={S.brand}><div style={S.mark}>C</div><div><div style={S.small}>CLOSING CABAL</div><div style={S.h1}>Success Tracker</div></div></div>
        <h2 style={S.title}>Set a new password</h2>
        <p style={S.sub}>Choose a new password for your account.</p>
        <Field label="New password" type="password" value={pw} onChange={setPw} />
        <Field label="Confirm password" type="password" value={pw2} onChange={setPw2} onEnter={save} />
        <button style={S.btn} onClick={save} disabled={busy}>{busy ? "…" : "Save new password"}</button>
        {err && <p style={S.err}>{err}</p>}
        {msg && <p style={S.ok}>{msg}</p>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", onEnter }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.label}>{label}</div>
      <input style={S.input} type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()} />
    </div>
  );
}
function Center({ children }) { return <div style={{ ...S.wrap }}><div style={{ color: "#22d3ee" }}>{children}</div></div>; }

const FONT = "@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;800&family=Hanken+Grotesk:wght@400;600&display=swap');";
const S = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#04080d", fontFamily: "'Hanken Grotesk',sans-serif", color: "#e6f1f5", padding: 24 },
  card: { width: "100%", maxWidth: 420, background: "#0a1118", border: "1px solid #19242f", borderRadius: 16, padding: 26, boxShadow: "0 0 40px rgba(34,211,238,.07)" },
  brand: { display: "flex", gap: 12, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  mark: { width: 38, height: 38, border: "1px solid #22d3ee", borderRadius: 10, display: "grid", placeItems: "center", color: "#22d3ee", fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 19, boxShadow: "0 0 22px rgba(34,211,238,.25)" },
  small: { color: "#22d3ee", letterSpacing: ".28em", fontSize: 9, fontWeight: 700 },
  h1: { fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 19 },
  title: { fontFamily: "'Sora',sans-serif", fontSize: 22, margin: "0 0 4px" },
  sub: { color: "#7e93a1", fontSize: 14, margin: "0 0 18px" },
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "#7e93a1", marginBottom: 6, fontWeight: 600 },
  input: { width: "100%", background: "#04080d", border: "1px solid #19242f", color: "#e6f1f5", borderRadius: 10, padding: "11px 12px", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" },
  btn: { width: "100%", background: "#22d3ee", color: "#04080d", border: "none", padding: 12, borderRadius: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14, marginTop: 6 },
  ghost: { width: "100%", background: "none", border: "1px solid #19242f", color: "#e6f1f5", padding: 11, borderRadius: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginTop: 8 },
  link: { width: "100%", background: "none", border: "none", color: "#7e93a1", cursor: "pointer", fontFamily: "inherit", fontSize: 12, marginTop: 12, textDecoration: "underline" },
  err: { color: "#fb7185", fontSize: 13, marginTop: 12 },
  ok: { color: "#34d399", fontSize: 13, marginTop: 12 },
};
