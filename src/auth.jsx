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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (!session) { setMe(null); return; }
      // Membership still active? (covers cancel/lapse between logins)
      const { data } = await supabase
        .from("approved_members")
        .select("active")
        .eq("email", (session.user.email || "").toLowerCase())
        .maybeSingle();
      if (data && data.active === false) {
        setNotice("Your Whop membership is no longer active.");
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

  if (session === undefined) return <Center>Loading the Cabal…</Center>;
  if (!session || !me) return <AuthScreens notice={notice} clearNotice={() => setNotice("")} />;
  return children({ me, updateMe, signOut });
}

function AuthScreens({ notice, clearNotice }) {
  const [view, setView] = useState("login"); // login | create | forgot
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState(notice || "");

  async function login() {
    setErr(""); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) setErr("Wrong email or password — or you haven't created a password yet.");
  }
  async function create() {
    setErr(""); setMsg("");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    const { error } = await supabase.auth.signUp({ email: email.trim(), password: pw });
    if (error) {
      if (String(error.message).includes("NO_ACTIVE_MEMBERSHIP"))
        setErr("No active Whop membership found for that email. Use the same email you paid with on Whop.");
      else setErr(error.message);
    }
  }
  async function forgot() {
    setErr(""); setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setErr(error.message);
    else setMsg("If that email has an account, a reset link is on its way.");
  }

  return (
    <div style={S.wrap}>
      <style>{FONT}</style>
      <div style={S.card}>
        <div style={S.brand}><div style={S.mark}>C</div><div><div style={S.small}>CLOSING CABAL</div><div style={S.h1}>Sales OS</div></div></div>

        {view === "login" && <>
          <h2 style={S.title}>Log in</h2>
          <p style={S.sub}>Use the email you paid with on Whop.</p>
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={pw} onChange={setPw} onEnter={login} />
          <button style={S.btn} onClick={login}>Log in</button>
          <button style={S.ghost} onClick={() => { setView("create"); setErr(""); setPw(""); }}>First time? Create your password</button>
          <button style={S.link} onClick={() => { setView("forgot"); setErr(""); }}>Forgot password?</button>
        </>}

        {view === "create" && <>
          <h2 style={S.title}>Create your password</h2>
          <p style={S.sub}>Enter the email you used on Whop and choose a password.</p>
          <Field label="Whop email" value={email} onChange={setEmail} />
          <Field label="New password" type="password" value={pw} onChange={setPw} onEnter={create} />
          <button style={S.btn} onClick={create}>Create account & enter</button>
          <button style={S.ghost} onClick={() => { setView("login"); setErr(""); setPw(""); }}>Back to log in</button>
        </>}

        {view === "forgot" && <>
          <h2 style={S.title}>Reset password</h2>
          <p style={S.sub}>We'll email you a reset link.</p>
          <Field label="Email" value={email} onChange={setEmail} />
          <button style={S.btn} onClick={forgot}>Send reset link</button>
          <button style={S.ghost} onClick={() => { setView("login"); setErr(""); }}>Back to log in</button>
        </>}

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
