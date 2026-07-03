import { useState, useEffect, useMemo } from "react";
import {
  Trophy, AlertTriangle, Target, Phone, Send, DollarSign, CheckCircle2, Circle, LogOut,
  Users, LayoutDashboard, ClipboardList, Link2, PartyPopper, TrendingUp, Lock, Briefcase,
  Mail, KeyRound, RotateCcw, Copy, Star, ExternalLink, Quote, Settings as Cog, CalendarDays,
  PlayCircle, ChevronDown, ChevronRight, Video, MessageSquare, Menu, X, BookOpen, Trash2
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { db as store } from "./lib/db";
import { supabase } from "./lib/supabase";

/* ============================ STORAGE (Supabase-backed; mirrors the prototype's key-value API) ============================ */
const K = {
  users: "users",
  roadmap: (id) => `cc3:roadmap:${id}`,
  eod: (id) => `cc3:eod:${id}`,
  applied: (id) => `cc3:applied:${id}`,
  intake: (id) => `cc3:intake:${id}`,
  opps: "cc3:opps",
  wins: "cc3:wins",
  config: "cc3:config",
  schedule: "cc3:schedule",
};
async function hashPw(pw) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw)); return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""); }
const uid = () => Math.random().toString(36).slice(2, 9);
const code6 = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const daysAgo = (d) => d ? Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / 86400000) : null;
const fmtMoney = (n) => "$" + (Number(n) || 0).toLocaleString();
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/* ============================ 30-DAY ROADMAP (mapped to real Closing Cabal curriculum) ============================
   Each day: videos[] are real lessons (admin sets the URL per video in Roadmap Links);
   actions[] are the do-the-work tasks. A day completes when every video + action is checked. */
const V = (t, dur, doc) => ({ t, dur, doc: !!doc });
const ROADMAP = [
  { d: 1, phase: "Foundations & Outreach", title: "Start Here", focus: "Get oriented and plant your flag.", videos: [V("My Story...", "7:52"), V("The Reality of Being in The Inner Circle", "3:49"), V("Your Step by Step Blueprint", "4:44")], actions: ["Introduce yourself in the community chat", "Post your #1 goal in #accountability", "Set your goal in Settings", "Comment on 2 other intros in Discord"] },
  { d: 2, phase: "Foundations & Outreach", title: "Mindset & The Toolkit", focus: "Know what the job takes and set your standard.", videos: [V("The Tools required to Be a 6 Figure Closer", "5:02"), V("Routine/Mindset", "13:36")], actions: ["Join today's live coaching call (Mon–Fri)", "Run 1 mock call", "Post your daily takeaway in #accountability", "React to 3 wins in the Wins tab"] },
  { d: 3, phase: "Foundations & Outreach", title: "Outreach Starts — Who To Target", focus: "Start filling your pipeline on Day 3 — the lag is real, so begin now.", videos: [V("Key to Doing Outreach", "17:04"), V("Perfect Example of Who to Find to DM", "")], actions: ["Build your outreach list (25 prospects)", "Send 10 outreach DMs", "Post your numbers in #accountability"] },
  { d: 4, phase: "Foundations & Outreach", title: "The DM", focus: "Open conversations that actually get replies.", videos: [V("How to Send a DM With or Without Experience", "", true), V("What to Look For in an Offer", "3:57")], actions: ["Send 15 outreach DMs", "Run 1 mock call", "Post your numbers in #accountability", "Comment on 3 posts in the community"] },
  { d: 5, phase: "Foundations & Outreach", title: "Build Your Presence", focus: "Make inbound easier while you push outbound.", videos: [V("How to Make Your FYP Perfect for Mass Outreach", "9:20")], actions: ["Send 15 outreach DMs", "Post or engage on content to warm your FYP", "Run 1 mock call", "Post your daily update in #accountability"] },
  { d: 6, phase: "Foundations & Outreach", title: "Mindset To Sustain It", focus: "Outreach is a grind — build the mind for it.", videos: [V("You NEED This Mindset for Sales", "26:50")], actions: ["Send 15 outreach DMs", "Join the live coaching call", "Run 1 mock call", "Post in #accountability"] },
  { d: 7, phase: "Core Sales Skill", title: "1-on-1 With Coach Josiah", focus: "Your first personal checkpoint.", videos: [V("Blueprint to Key Sales Process", "20:32")], actions: ["Book & complete your 1-on-1 with Coach Josiah", "Send 15 outreach DMs", "Post your biggest takeaway in #accountability"] },
  { d: 8, phase: "Core Sales Skill", title: "The Call Framework", focus: "The map of a winning call.", videos: [V("Sales Call Framework", "13:46"), V("Using Tone of Voice", "6:22")], actions: ["Send 20 outreach DMs", "Run 2 mock calls", "Join the live coaching call", "Post in #accountability"] },
  { d: 9, phase: "Core Sales Skill", title: "Drive To Keep Pushing", focus: "Protect your standard while volume climbs.", videos: [V("Thinking Patterns to Get Rich", "14:19"), V("You NEED to Have an Ego in Sales", "19:50")], actions: ["Send 20 outreach DMs", "Run 2 mock calls", "Post in #accountability", "Engage on 3 posts in Discord"] },
  { d: 10, phase: "Core Sales Skill", title: "The Sales Gap", focus: "Create the gap, then close it.", videos: [V("THE SALES GAP", "9:38"), V("The 'Why' Sales Technique", "12:38")], actions: ["Send 20 outreach DMs", "Run 2 mock calls", "Join the live coaching call", "Post in #accountability"] },
  { d: 11, phase: "Core Sales Skill", title: "Discovery: Start Digging", focus: "Questions that do the selling.", videos: [V("Current Situation Questions (Start Digging)", "7:00"), V("Figuring Out Goals and Desires", "8:53")], actions: ["Send 25 outreach DMs", "Run 3 mock calls", "Post in #accountability", "React to 3 wins"] },
  { d: 12, phase: "Core Sales Skill", title: "Open The Pain — Start Applying", focus: "You can run a call now — go get a seat.", videos: [V("Opening Up Pain & Understanding Problems", "7:21"), V("Using Consequence Questions", "9:06")], actions: ["Send 25 outreach DMs", "Apply to your first offer in the Opportunities tab", "Run 2 mock calls", "Post that you applied in #accountability"] },
  { d: 13, phase: "Core Sales Skill", title: "Make The Offer", focus: "Present the offer and ask.", videos: [V("Making The Offer and Closing the Deal", "8:36"), V("Past, Present, Future Sales Technique", "8:40")], actions: ["Send 25 outreach DMs", "Apply to 2 more opportunities", "Run 2 mock calls", "Post your numbers in #accountability"] },
  { d: 14, phase: "Core Sales Skill", title: "Objections I", focus: "The psychology behind 'no'.", videos: [V("The Psychology of Objections", "11:51"), V("Pre-Handling Objections", "3:13")], actions: ["Send 30 outreach DMs", "Run a mock interview", "Follow up on every application sent", "Post in #accountability"] },
  { d: 15, phase: "Core Sales Skill", title: "Objections II", focus: "Master the full objection game.", videos: [V("Step by Step to Master Objection Handling", "15:45"), V("The 1-10 Sales Technique", "7:27"), V("How Important is This For You", "", true)], actions: ["Send 30 outreach DMs", "Run 1 full mock call start-to-finish & get it reviewed", "Apply to 1 more opportunity", "Post your reps in #accountability"] },
  { d: 16, phase: "Apply & Interview", title: "Live Objection Reps", focus: "Watch it done live, then do it.", videos: [V("Objection Handling Live Mock Call", "14:15"), V("Objection Handling Lesson Live Mock Call", "8:24")], actions: ["Send 30 outreach DMs", "Run 2 mock calls", "Run a mock interview with a partner", "Post your numbers in #accountability"] },
  { d: 17, phase: "Apply & Interview", title: "Consistency Under Pressure", focus: "Keep the machine running while you interview.", videos: [V("How to Stay Consistent in Sales", "7:12")], actions: ["Send 35 outreach DMs", "Follow up on every open application", "Run 1 mock call", "Post in #accountability"] },
  { d: 18, phase: "Apply & Interview", title: "Nail The Interview", focus: "Treat the interview like a sales call.", videos: [V("How to Nail An Interview", "16:39")], actions: ["Send 35 outreach DMs", "Run a mock interview", "Apply to 2 more opportunities", "Post in #accountability"] },
  { d: 19, phase: "Apply & Interview", title: "Live Call Breakdown", focus: "Study real calls in detail.", videos: [V("Bringing Resistance Down (Live Call)", "26:05"), V("Live Sales Call Review/Breakdown", "37:51")], actions: ["Send 35 outreach DMs", "Run 2 mock calls", "Follow up on all open applications", "Post in #accountability"] },
  { d: 20, phase: "Apply & Interview", title: "Accountability & The Climb", focus: "Hold your standard as offers come in.", videos: [V("Holding Yourself Accountable", "8:57"), V("Going From a Good > Great as a Closer", "9:19")], actions: ["Send 40 outreach DMs", "Run a mock interview", "Push every open offer forward", "Post in #accountability"] },
  { d: 21, phase: "Apply & Interview", title: "Setting Foundations", focus: "The setter seat that pays.", videos: [V("Step by Step Setting Guide", "51:39")], actions: ["Send 40 outreach DMs", "Run 2 mock calls", "Apply to 1 new opportunity", "Post your numbers in #accountability"] },
  { d: 22, phase: "Apply & Interview", title: "Setting Reps", focus: "Reps on the dials.", videos: [V("Setting Mock Calls", "32:25"), V("More Setting Mocks / Call Reviews", "27:00")], actions: ["Send 40 outreach DMs", "Run 2 mock calls", "Follow up on every open application", "Post in #accountability"] },
  { d: 23, phase: "Apply & Interview", title: "Deep Coaching Session", focus: "A full coaching call, end to end.", videos: [V("Coaching Call: Psychology", "58:42")], actions: ["Send 50 outreach DMs", "Run a closing-the-interview mock", "Push every open offer to a yes or no", "Post your numbers in #accountability"] },
  { d: 24, phase: "Momentum to Offer", title: "Stay Sharp", focus: "Don't go cold — keep the machine running.", videos: [], actions: ["Send 50 outreach DMs", "Run 2 mock calls", "Join the live coaching call", "Post in #accountability"] },
  { d: 25, phase: "Momentum to Offer", title: "Be The Perfect Rep", focus: "Recorded coaching call.", videos: [V("Coaching Call: How to be the Perfect Sales Rep", "")], actions: ["Send 50 outreach DMs", "Run 1 mock call", "Apply to any new fits", "Post in #accountability"] },
  { d: 26, phase: "Momentum to Offer", title: "Outreach Help", focus: "Recorded coaching call.", videos: [V("Coaching Call: Outreach Help", "")], actions: ["Send 60 outreach DMs", "Join the live coaching call", "Follow up on all conversations", "Post in #accountability"] },
  { d: 27, phase: "Momentum to Offer", title: "Objection Handling Call", focus: "Recorded coaching call.", videos: [V("Coaching Call: Objection Handling", "")], actions: ["Send 60 outreach DMs", "Run 2 mock calls", "Post in #accountability", "Comment on 3 wins to keep the room hot"] },
  { d: 28, phase: "Momentum to Offer", title: "Close Out Applications", focus: "Push every live opportunity to a decision.", videos: [], actions: ["Send 60 outreach DMs", "Follow up on all open applications", "Join the live coaching call", "Post in #accountability"] },
  { d: 29, phase: "Momentum to Offer", title: "Pre-Graduation Check-In", focus: "Prove you're seat-ready.", videos: [], actions: ["Send 60 outreach DMs", "Run a final full mock call", "Get final feedback in the community", "Post in #accountability"] },
  { d: 30, phase: "Momentum to Offer", title: "Graduation — Land The Seat", focus: "GOAL (not a promise): on an offer, making money.", videos: [], actions: ["Confirm an offer or your strongest live opportunity", "Write your 90-day income goal", "Post your win in the Wins tab", "Celebrate a teammate's win"] },
];
const PHASES = ["Foundations & Outreach", "Core Sales Skill", "Apply & Interview", "Momentum to Offer"];
const itemsOf = (day) => [...day.videos.map((v) => ({ kind: "video", ...v })), ...day.actions.map((a) => ({ kind: "action", t: a }))];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const REACTIONS = [["money", "💰"], ["clap", "👏"], ["fire", "🔥"], ["heart", "❤️"]];

/* ============================ APP ============================ */
export default function App({ me, updateMe, signOut }) {
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  const isCoach = (r) => r === "coach" || r === "admin";
  const homeTab = (r) => isCoach(r) ? "dashboard" : "roadmap";
  const refreshUsers = async () => { const u = (await store.get(K.users)) || []; setUsers(u); return u; };

  useEffect(() => { refreshUsers(); }, []);
  useEffect(() => { if (tab === null && me) setTab(homeTab(me.role)); }, [me, tab]);

  async function persistUsers(next) { setUsers(next); await store.set(K.users, next); }

  if (!isCoach(me.role) && !me.intakeDone) return <Shell><Intake me={me} onDone={(patch) => updateMe(patch)} /></Shell>;
  if (tab === null) return <Shell><div className="center"><span className="cyan">Loading…</span></div></Shell>;

  const tabs = isCoach(me.role)
    ? [["dashboard", "Dashboard", LayoutDashboard], ["members", "Members", Users], ["intake", "Intake Forms", ClipboardList], ["schedule", "Call Schedule", CalendarDays], ["opps", "Opportunities", Briefcase], ["leaderboard", "Leaderboard", Trophy], ["wins", "Wins", PartyPopper], ["links", "Roadmap Links", Link2], ["settings", "Settings", Cog]]
    : [["roadmap", "30-Day Roadmap", Target], ["eod", "EOD Report", ClipboardList], ["stats", "My Stats", TrendingUp], ["schedule", "Call Schedule", CalendarDays], ["leaderboard", "Leaderboard", Trophy], ["opps", "Opportunities", Briefcase], ["wins", "Wins", PartyPopper], ["settings", "Settings", Cog]];

  return (
    <Shell>
      <div className="applayout">
        {navOpen && <div className="navback" onClick={() => setNavOpen(false)} />}
        <div className="sidewrap">
          <aside className={`sidebar ${navOpen ? "open" : ""}`}>
            <button className="navtoggle" onClick={() => setNavOpen((o) => !o)} title="Menu">
              {navOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="tablabel navbrand"><small>Closing Cabal</small><b>Sales OS</b></span>
            </button>
            <nav className="tabs">
              {tabs.map(([id, label, Icon]) => (
                <button key={id} className={`tab ${tab === id ? "active" : ""}`} title={label} onClick={() => { setTab(id); setNavOpen(false); }}>
                  <Icon size={18} /><span className="tablabel">{label}</span>
                </button>
              ))}
            </nav>
            <div className="sidefoot">
              <div className="sideuser tablabel"><span className="b">{me.name}</span><span className="pill">{me.role}</span></div>
              <div className="footicons">
                <button className="iconbtn" title="Refresh" onClick={refreshUsers}><RotateCcw size={15} /></button>
                <button className="iconbtn" title="Log out" onClick={signOut}><LogOut size={15} /></button>
              </div>
            </div>
          </aside>
        </div>
        <main className="maincol">
          {tab === "roadmap" && <RoadmapView me={me} />}
          {tab === "eod" && <EodView me={me} />}
          {tab === "stats" && <StatsView me={me} />}
          {tab === "schedule" && <Schedule isCoach={isCoach(me.role)} />}
          {tab === "leaderboard" && <Leaderboard users={users} />}
          {tab === "opps" && <Opportunities me={me} isCoach={isCoach(me.role)} />}
          {tab === "wins" && <Wins me={me} />}
          {tab === "dashboard" && <Dashboard users={users} />}
          {tab === "members" && <Members me={me} users={users} persistUsers={persistUsers} />}
          {tab === "intake" && <IntakeView users={users} />}
          {tab === "links" && <RoadmapLinks />}
          {tab === "settings" && <SettingsView me={me} isCoach={isCoach(me.role)} updateMe={updateMe} />}
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }) { return <div className="ccos"><style>{STYLE}</style><div className="wrap">{children}</div></div>; }

/* ============================ ONBOARDING ============================ */
const INTAKE_QS = [
  ["loc", "Where are you located?"],
  ["content", "What piece of my content made you decide to join the Closing Cabal?"],
  ["why", "Why did you choose to work with me over someone else? What set me apart?"],
  ["push", "What was the final thing that pushed you over the edge to invest in yourself?"],
  ["problems", "What are the top 3 problems you want solved in the next 90 days?"],
  ["income", "What is your realistic 90-day income goal through HTS?"],
  ["satisfy", "What is the #1 thing you want to achieve right now that would make you 100% satisfied with your investment?"],
  ["fears", "What are your biggest fears or doubts about hitting your goals?"],
  ["forward", "What are you most looking forward to inside the Closing Cabal?"],
];

function Intake({ me, onDone }) {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState({});
  const [busy, setBusy] = useState(false);
  const total = INTAKE_QS.length;
  const [qid, q] = INTAKE_QS[step];
  const val = ans[qid] || "";
  const canNext = val.trim().length > 0;
  const setVal = (v) => setAns((a) => ({ ...a, [qid]: v }));
  function next() { if (canNext && step < total - 1) setStep(step + 1); }
  function back() { if (step > 0) setStep(step - 1); }
  async function submit() {
    if (!canNext) return;
    setBusy(true);
    const record = { userId: me.id, name: me.name, email: me.email, role: me.role, answers: ans, submittedAt: new Date().toISOString() };
    await store.set(K.intake(me.id), record);
    await onDone({ intakeDone: true, onboarded: true, goal: ans.income || "" });
  }
  return (
    <div className="center">
      <div className="auth" style={{ maxWidth: 580 }}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 18 }}><div className="mark">C</div><div><small>Closing Cabal</small><h1>Success Tracker</h1></div></div>
        <div className="card glow">
          <div className="intake-top">
            <span className="intake-count">Question {step + 1} of {total}</span>
            <div className="intake-bar"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
          </div>
          <p className="intake-note"><i>Make sure to take your time and respond to each question in depth. This allows us to understand your situation and be able to give you the guidance needed to succeed.</i></p>
          <label className="intake-q">{q}</label>
          <textarea className="intake-input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Type your answer…" rows={5} />
          <div className="intake-actions">
            {step > 0 ? <button className="btn ghost" onClick={back}><ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Back</button> : <span />}
            {step < total - 1
              ? <button className="btn" disabled={!canNext} onClick={next}>Next <ChevronRight size={15} /></button>
              : <button className="btn" disabled={!canNext || busy} onClick={submit}>{busy ? "Submitting…" : "Submit & enter"}</button>}
          </div>
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 12 }}>All questions are required. Your answers are shared only with your coaches.</p>
      </div>
    </div>
  );
}

function IntakeView({ users }) {
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  useEffect(() => { (async () => {
    const students = users.filter((u) => ["student", "setter", "closer"].includes(u.role) && u.active !== false);
    const out = await Promise.all(students.map(async (u) => ({ user: u, rec: await store.get(K.intake(u.id)) })));
    setData(out);
  })(); }, [users]);
  if (!data) return <div className="empty">Loading…</div>;
  const done = data.filter((d) => d.rec);
  const pending = data.filter((d) => !d.rec);
  return (
    <div>
      <h2 className="section">Intake Forms</h2>
      <p className="sub">New-student intake answers. {done.length} completed{pending.length ? ` · ${pending.length} not yet submitted` : ""}.</p>
      {done.length === 0 && <div className="empty">No intake forms submitted yet.</div>}
      {done.map(({ user, rec }) => (
        <div key={user.id} className="card intake-card">
          <div className="row-between intake-head" onClick={() => setOpenId(openId === user.id ? null : user.id)}>
            <div><span className="b">{user.name}</span> <span className={`tag ${user.role}`} style={{ marginLeft: 6 }}>{user.role}</span><div className="mono dim" style={{ fontSize: 12 }}>{user.email}</div></div>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="dim" style={{ fontSize: 12 }}>{(rec.submittedAt || "").slice(0, 10)}</span><ChevronDown size={16} className="dim" style={{ transform: openId === user.id ? "rotate(180deg)" : "none" }} /></span>
          </div>
          {openId === user.id && <div className="intake-answers">
            {INTAKE_QS.map(([id2, question]) => <div key={id2} className="intake-a"><div className="intake-a-q">{question}</div><div className="intake-a-v">{rec.answers?.[id2] || <span className="dim">—</span>}</div></div>)}
          </div>}
        </div>
      ))}
      {pending.length > 0 && <div className="card"><h3 className="disp h3">Not yet submitted</h3>{pending.map(({ user }) => <div key={user.id} className="row-between" style={{ padding: "6px 0" }}><span>{user.name} <span className="dim mono" style={{ fontSize: 12 }}>{user.email}</span></span><span className="tag" style={{ opacity: .6 }}>pending</span></div>)}</div>}
    </div>
  );
}

/* ============================ AUTH ============================ */
function AuthScreen({ users, persistUsers, onLogin, refreshUsers }) {
  const [view, setView] = useState(users.length === 0 ? "bootstrap" : "login");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState(""); const [err, setErr] = useState("");

  async function doLogin() {
    setErr(""); const u = await refreshUsers();
    const user = u.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return setErr("No account with that email. Ask a coach for an invite.");
    if (user.status !== "active" || !user.passwordHash) return setErr("No password set yet — use 'Join with access code'.");
    if ((await hashPw(pw)) !== user.passwordHash) return setErr("Wrong password.");
    onLogin(user);
  }
  async function doJoin() {
    setErr(""); if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    const u = await refreshUsers();
    const i = u.findIndex((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.inviteCode === accessCode.trim().toUpperCase());
    if (i === -1) return setErr("Email + access code don't match any invite.");
    const next = [...u]; next[i] = { ...next[i], passwordHash: await hashPw(pw), status: "active", inviteCode: null };
    await persistUsers(next); onLogin(next[i]);
  }
  async function doBootstrap() {
    setErr(""); if (!name.trim() || !email.trim()) return setErr("Name and email required.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    const admin = { id: uid(), name: name.trim(), email: email.trim(), role: "admin", position: "admin", goal: "", onboarded: true, status: "active", passwordHash: await hashPw(pw), inviteCode: null, createdAt: today() };
    await persistUsers([admin]); await store.set(K.roadmap(admin.id), { checked: {} }); onLogin(admin);
  }

  return (
    <div className="ccos"><style>{STYLE}</style>
      <div className="center"><div className="auth">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 22 }}><div className="mark">C</div><div><small>Closing Cabal</small><h1>Sales OS</h1></div></div>

        {view === "bootstrap" && <div className="card glow">
          <h2 className="section" style={{ fontSize: 20 }}>Create the first Admin</h2>
          <p className="sub">No accounts exist yet. This first account becomes the Admin who invites everyone.</p>
          <label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} />
          <label style={{ marginTop: 12 }}>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label style={{ marginTop: 12 }}>Password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p className="err">{err}</p>}
          <button className="btn full" style={{ marginTop: 16 }} onClick={doBootstrap}>Create Admin & enter</button>
        </div>}

        {view === "login" && <div className="card glow">
          <h2 className="section" style={{ fontSize: 20 }}>Log in</h2>
          <p className="sub">Use the email a coach invited.</p>
          <label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label style={{ marginTop: 12 }}>Password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} />
          {err && <p className="err">{err}</p>}
          <button className="btn full" style={{ marginTop: 16 }} onClick={doLogin}>Log in</button>
          <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => { setView("join"); setErr(""); setPw(""); }}><KeyRound size={15} /> Join with access code</button>
          <p className="hint" style={{ marginTop: 10 }}>Forgot your password? A coach can reset it — they'll send a new access code to your email, then use “Join with access code.”</p>
        </div>}

        {view === "join" && <div className="card glow">
          <h2 className="section" style={{ fontSize: 20 }}>Join with access code</h2>
          <p className="sub">Enter your email and the code your coach sent, then set your password.</p>
          <label>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} />
          <label style={{ marginTop: 12 }}>Access code</label><input className="mono" value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} placeholder="7K2Q9X" />
          <label style={{ marginTop: 12 }}>Create a password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          {err && <p className="err">{err}</p>}
          <button className="btn full" style={{ marginTop: 16 }} onClick={doJoin}>Set password & enter</button>
          <button className="btn ghost full" style={{ marginTop: 8 }} onClick={() => { setView("login"); setErr(""); setPw(""); }}>Back to log in</button>
        </div>}

        <p className="disclaimer"><b>Prototype auth.</b> Passwords are hashed (SHA-256) and never shown — but this is a demo stand-in; production moves login to Supabase/Clerk with real email delivery.</p>
      </div></div>
    </div>
  );
}

/* ============================ ROADMAP (collapse previous, multi-video) ============================ */
function RoadmapView({ me }) {
  const [rm, setRm] = useState(null);
  const [links, setLinks] = useState({});
  const [booking, setBooking] = useState("");
  const [open, setOpen] = useState(null); // set of manually toggled days
  useEffect(() => { (async () => {
    setRm((await store.get(K.roadmap(me.id))) || { checked: {} });
    const cfg = (await store.get(K.config)) || {};
    setLinks(cfg.links || {});
    setBooking(cfg.bookingUrl || "");
  })(); }, [me.id]);
  if (!rm) return <div className="empty">Loading roadmap…</div>;

  const checked = (d) => rm.checked[d] || [];
  const dayDone = (d) => { const day = ROADMAP.find((x) => x.d === d); return day && checked(d).length >= itemsOf(day).length; };
  const unlocked = (d) => d === 1 || dayDone(d - 1);
  const totalDone = ROADMAP.filter((x) => dayDone(x.d)).length;
  const active = (ROADMAP.find((x) => !dayDone(x.d)) || { d: 30 }).d;
  if (open === null) setOpen(new Set([active]));
  const isOpen = (d) => open && open.has(d);

  function toggleDay(d) { if (!unlocked(d)) return; const n = new Set(open); n.has(d) ? n.delete(d) : n.add(d); setOpen(n); }
  async function toggleItem(d, idx) {
    if (!unlocked(d)) return;
    const cur = new Set(checked(d)); cur.has(idx) ? cur.delete(idx) : cur.add(idx);
    const next = { ...rm, checked: { ...rm.checked, [d]: [...cur] } };
    setRm(next); await store.set(K.roadmap(me.id), next);
  }

  return (
    <div>
      <h2 className="section">The 30-Day Path to Success</h2>
      <p className="sub">Finish every item in your current day to unlock the next. Applying starts Day 15 — the Day-30 goal (not a promise) is to be on an offer making money.</p>
      <div className="card" style={{ marginBottom: 22 }}>
        <div className="row-between" style={{ marginBottom: 10 }}><b>{totalDone} of 30 days complete</b><span className="mono cyan b">{pct(totalDone, 30)}%</span></div>
        <div className="bar"><div style={{ width: pct(totalDone, 30) + "%" }} /></div>
      </div>

      {PHASES.map((phase) => (
        <div key={phase}>
          <div className="phase-h">{phase}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {ROADMAP.filter((x) => x.phase === phase).map((day) => {
              const locked = !unlocked(day.d), done = dayDone(day.d), opened = isOpen(day.d) && !locked, items = itemsOf(day);
              const isActive = day.d === active;
              return (
                <div key={day.d} className={`day ${done ? "done" : ""} ${locked ? "locked" : ""} ${isActive ? "active" : ""}`}>
                  <div className="day-head" onClick={() => toggleDay(day.d)} style={{ cursor: locked ? "default" : "pointer" }}>
                    <span className="day-no">{String(day.d).padStart(2, "0")}</span>
                    <div style={{ flex: 1 }}>
                      <div className="day-title">{day.title}{isActive && <span className="now">TODAY</span>}{locked && <Lock size={13} style={{ marginLeft: 6, color: "var(--faint)" }} />}</div>
                      <div className="day-focus">{opened ? day.focus : (done ? "Completed" : locked ? `Finish Day ${day.d - 1} to unlock` : `${items.length} items`)}</div>
                    </div>
                    {done ? <CheckCircle2 size={20} style={{ color: "var(--green)" }} /> : !locked ? (opened ? <ChevronDown size={18} className="dim" /> : <ChevronRight size={18} className="dim" />) : null}
                  </div>
                  {opened && <div className="day-body">
                    {day.d === 7 && booking && <a className="book-call" href={booking} target="_blank" rel="noreferrer"><CalendarDays size={16} /> Book your 1-on-1 with Coach Josiah</a>}
                    {items.map((it, i) => {
                      const on = checked(day.d).includes(i);
                      if (it.kind === "video") {
                        const vIdx = day.videos.findIndex((v) => v.t === it.t);
                        const url = links[`${day.d}-${vIdx}`];
                        const isDoc = it.doc;
                        return (
                          <div key={i} className="vrow">
                            <button className="ck" onClick={() => toggleItem(day.d, i)}>{on ? <CheckCircle2 size={17} style={{ color: "var(--green)" }} /> : <Circle size={17} className="dim" />}</button>
                            {isDoc ? <BookOpen size={15} className="cyan" style={{ flexShrink: 0 }} /> : <Video size={15} className="cyan" style={{ flexShrink: 0 }} />}
                            <span className="vtitle" style={{ textDecoration: on ? "line-through" : "none", color: on ? "var(--faint)" : "inherit" }}>{it.t}{it.dur ? <span className="vdur">{it.dur}</span> : null}</span>
                            {url ? <a className="watch" href={url} target="_blank" rel="noreferrer">{isDoc ? <><BookOpen size={14} /> Read</> : <><PlayCircle size={14} /> Watch</>}</a> : <span className="watch off">link not set</span>}
                          </div>
                        );
                      }
                      return (
                        <div key={i} className="task click" onClick={() => toggleItem(day.d, i)}>
                          {on ? <CheckCircle2 size={16} style={{ color: "var(--green)" }} /> : <Circle size={16} className="dim" />}
                          <span style={{ textDecoration: on ? "line-through" : "none", color: on ? "var(--faint)" : "inherit" }}>{it.t}</span>
                        </div>
                      );
                    })}
                  </div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ EOD ============================ */
function EodView({ me }) {
  const role = me.role;
  const [reports, setReports] = useState([]); const [ok, setOk] = useState(false);
  const blanks = {
    student: { date: today(), coachingWatched: "", mocks: "", outreach: "", responses: "", interviews: "", effort: "7", encouragement: "" },
    setter: { date: today(), dials: "", pickups: "", booked: "", cash: "", rating: "7", better: "" },
    closer: { date: today(), onCalendar: "", taken: "", qualified: "", noShows: "", closed: "", cash: "", rating: "7", better: "" },
  };
  const [form, setForm] = useState(blanks[role] || blanks.student);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEffect(() => { (async () => setReports((await store.get(K.eod(me.id))) || []))(); }, [me.id]);
  useEffect(() => { setForm({ ...blanks[role] }); }, [role]); // reset when role changes in settings

  async function submit() {
    const next = [{ ...form, role }, ...reports.filter((r) => r.date !== form.date)].sort((a, b) => b.date.localeCompare(a.date));
    setReports(next); await store.set(K.eod(me.id), next); setOk(true); setTimeout(() => setOk(false), 2500); setForm({ ...blanks[role] });
  }

  return (
    <div>
      <h2 className="section">End-of-Day Report</h2>
      <p className="sub">One report per day. {role === "student" ? "No deals or cash here — your job is reps and outreach." : "Log today's numbers honestly."}</p>
      <div className="card">
        <div className="grid3">
          <div><label>Date</label><input type="date" value={form.date} onChange={set("date")} /></div>
          {role === "student" && <>
            <div><label>Coaching calls watched</label><input className="mono" value={form.coachingWatched} onChange={set("coachingWatched")} placeholder="0" /></div>
            <div><label>Mock calls ran</label><input className="mono" value={form.mocks} onChange={set("mocks")} placeholder="0" /></div>
            <div><label>Outreach sent</label><input className="mono" value={form.outreach} onChange={set("outreach")} placeholder="0" /></div>
            <div><label>Responses</label><input className="mono" value={form.responses} onChange={set("responses")} placeholder="0" /></div>
            <div><label>Interviews booked</label><input className="mono" value={form.interviews} onChange={set("interviews")} placeholder="0" /></div>
          </>}
          {role === "setter" && <>
            <div><label># of dials</label><input className="mono" value={form.dials} onChange={set("dials")} placeholder="0" /></div>
            <div><label>Pickups (answered)</label><input className="mono" value={form.pickups} onChange={set("pickups")} placeholder="0" /></div>
            <div><label>Calls booked</label><input className="mono" value={form.booked} onChange={set("booked")} placeholder="0" /></div>
            <div><label>Cash collected ($)</label><input className="mono" value={form.cash} onChange={set("cash")} placeholder="0" /></div>
          </>}
          {role === "closer" && <>
            <div><label>Calls on calendar</label><input className="mono" value={form.onCalendar} onChange={set("onCalendar")} placeholder="0" /></div>
            <div><label>Calls taken</label><input className="mono" value={form.taken} onChange={set("taken")} placeholder="0" /></div>
            <div><label>Qualified calls</label><input className="mono" value={form.qualified} onChange={set("qualified")} placeholder="0" /></div>
            <div><label>No shows</label><input className="mono" value={form.noShows} onChange={set("noShows")} placeholder="0" /></div>
            <div><label>Calls closed</label><input className="mono" value={form.closed} onChange={set("closed")} placeholder="0" /></div>
            <div><label>Cash collected ($)</label><input className="mono" value={form.cash} onChange={set("cash")} placeholder="0" /></div>
          </>}
        </div>
        <div className="grid2" style={{ marginTop: 14 }}>
          <div>
            <label>{role === "student" ? "Rate your effort today (1–10)" : "Rate your day (1–10)"}</label>
            <select value={role === "student" ? form.effort : form.rating} onChange={set(role === "student" ? "effort" : "rating")}>{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n}>{n}</option>)}</select>
            <p className="hint">Private — only you see this.</p>
          </div>
          <div>
            <label>{role === "student" ? "Words of encouragement for future-you" : "One thing you could've done better"}</label>
            <textarea value={role === "student" ? form.encouragement : form.better} onChange={set(role === "student" ? "encouragement" : "better")} />
            <p className="hint">Private — only you see this.</p>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 16 }} onClick={submit}><ClipboardList size={15} /> Submit EOD</button>
        {ok && <span className="ok" style={{ marginLeft: 14 }}>✓ Logged.</span>}
      </div>
      <div className="card">
        <h3 className="disp h3">Recent Reports</h3>
        {reports.length === 0 ? <div className="empty">Nothing logged yet.</div> :
          <table><thead><tr><th>Date</th><th>Key numbers</th></tr></thead><tbody>
            {reports.slice(0, 14).map((r) => <tr key={r.date}><td className="mono">{r.date}</td><td className="mono dim">
              {r.role === "student" && `${r.mocks || 0} mocks · ${r.outreach || 0} outreach · ${r.responses || 0} resp`}
              {r.role === "setter" && `${r.dials || 0} dials · ${r.booked || 0} booked · ${fmtMoney(r.cash)}`}
              {r.role === "closer" && `${r.taken || 0} taken · ${r.closed || 0} closed · ${fmtMoney(r.cash)}`}
            </td></tr>)}
          </tbody></table>}
      </div>
    </div>
  );
}

/* ============================ STATS ============================ */
function aggregate(reports, role) {
  const s = (f) => reports.reduce((a, r) => a + (Number(r[f]) || 0), 0);
  const ratings = reports.map((r) => Number(role === "student" ? r.effort : r.rating) || 0).filter(Boolean);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  if (role === "student") return { coachingWatched: s("coachingWatched"), mocks: s("mocks"), outreach: s("outreach"), responses: s("responses"), interviews: s("interviews"), responseRate: pct(s("responses"), s("outreach")), avgRating };
  if (role === "setter") return { dials: s("dials"), pickups: s("pickups"), booked: s("booked"), cash: s("cash"), pickupRate: pct(s("pickups"), s("dials")), setRate: pct(s("booked"), s("dials")), cashPerSet: s("booked") > 0 ? Math.round(s("cash") / s("booked")) : 0, avgRating };
  return { onCalendar: s("onCalendar"), taken: s("taken"), qualified: s("qualified"), noShows: s("noShows"), closed: s("closed"), cash: s("cash"), showRate: pct(s("taken"), s("onCalendar")), closeRate: pct(s("closed"), s("taken")), avgRating };
}
function StatsView({ me }) {
  const [reports, setReports] = useState([]);
  useEffect(() => { (async () => setReports((await store.get(K.eod(me.id))) || []))(); }, [me.id]);
  const agg = useMemo(() => aggregate(reports, me.role), [reports, me.role]);
  const encouragement = useMemo(() => {
    if (me.role !== "student") return null;
    const notes = reports.map((r) => r.encouragement).filter((x) => x && x.trim());
    if (!notes.length) return null;
    return notes[Number(today().replace(/-/g, "")) % notes.length];
  }, [reports, me.role]);
  const chartData = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); const r = reports.find((x) => x.date === key); let v = 0; if (r) v = me.role === "closer" ? Number(r.closed || 0) : me.role === "setter" ? Number(r.booked || 0) : Number(r.mocks || 0); out.push({ day: key.slice(5), val: v, logged: !!r }); }
    return out;
  }, [reports, me.role]);
  const metricLabel = me.role === "closer" ? "Closes/day" : me.role === "setter" ? "Booked/day" : "Mocks/day";
  const Stat = ({ icon: Icon, k, v, cls }) => <div className="stat"><div className="k"><Icon size={13} /> {k}</div><div className={`v ${cls || ""}`}>{v}</div></div>;

  return (
    <div>
      <h2 className="section">Your Numbers</h2>
      <p className="sub">Pulled from your EOD reports. Ratings and notes here are private to you.</p>
      {me.goal && <div className="card goal"><Target size={18} className="cyan" /><div><div className="hint" style={{ marginBottom: 2 }}>Your biggest goal</div><div className="disp" style={{ fontSize: 18 }}>{me.goal}</div></div></div>}

      {me.role === "student" && <>
        {encouragement && <div className="card encourage"><Quote size={18} className="cyan" /><div><div className="hint" style={{ marginBottom: 4 }}>A note from a past you</div><div className="disp" style={{ fontSize: 18 }}>{encouragement}</div></div></div>}
        <div className="grid4" style={{ margin: "16px 0" }}>
          <Stat icon={ClipboardList} k="Coaching Watched" v={agg.coachingWatched} />
          <Stat icon={Phone} k="Mock Calls" v={agg.mocks} cls="cyan" />
          <Stat icon={Send} k="Outreach" v={agg.outreach} />
          <Stat icon={Mail} k="Responses" v={agg.responses} />
          <Stat icon={Target} k="Interviews Booked" v={agg.interviews} cls="green" />
          <Stat icon={TrendingUp} k="Response Rate" v={agg.responseRate + "%"} />
          <Stat icon={Star} k="Avg Daily Rating" v={agg.avgRating.toFixed(1)} cls="cyan" />
        </div>
      </>}
      {me.role === "setter" && <div className="grid4" style={{ margin: "16px 0" }}>
        <Stat icon={Phone} k="Total Dials" v={agg.dials} /><Stat icon={TrendingUp} k="Pickup Rate" v={agg.pickupRate + "%"} />
        <Stat icon={Target} k="Calls Booked" v={agg.booked} cls="cyan" /><Stat icon={TrendingUp} k="Set Rate" v={agg.setRate + "%"} />
        <Stat icon={DollarSign} k="Cash Collected" v={fmtMoney(agg.cash)} cls="green" /><Stat icon={Star} k="Avg Daily Rating" v={agg.avgRating.toFixed(1)} cls="cyan" />
      </div>}
      {me.role === "closer" && <div className="grid4" style={{ margin: "16px 0" }}>
        <Stat icon={ClipboardList} k="On Calendar" v={agg.onCalendar} /><Stat icon={Phone} k="Calls Taken" v={agg.taken} />
        <Stat icon={TrendingUp} k="Show Rate" v={agg.showRate + "%"} /><Stat icon={CheckCircle2} k="Qualified" v={agg.qualified} />
        <Stat icon={AlertTriangle} k="No Shows" v={agg.noShows} cls="red" /><Stat icon={Trophy} k="Closed" v={agg.closed} cls="cyan" />
        <Stat icon={TrendingUp} k="Close Rate" v={agg.closeRate + "%"} /><Stat icon={DollarSign} k="Cash Collected" v={fmtMoney(agg.cash)} cls="green" />
        <Stat icon={Star} k="Avg Daily Rating" v={agg.avgRating.toFixed(1)} cls="cyan" />
      </div>}

      <div className="card">
        <h3 className="disp h3">Last 14 Days — {metricLabel}</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#19242f" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "#7e93a1", fontSize: 11 }} /><YAxis tick={{ fill: "#7e93a1", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#0a1118", border: "1px solid #19242f", borderRadius: 8, color: "#e6f1f5" }} cursor={{ fill: "rgba(34,211,238,.08)" }} />
            <Bar dataKey="val" radius={[4, 4, 0, 0]}>{chartData.map((d, i) => <Cell key={i} fill={d.logged ? "#22d3ee" : "#19242f"} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {(me.role === "setter" || me.role === "closer") && <div className="card">
        <h3 className="disp h3">Things To Improve (private)</h3>
        {reports.filter((r) => r.better && r.better.trim()).length === 0 ? <div className="empty">Nothing logged yet.</div> :
          reports.filter((r) => r.better && r.better.trim()).slice(0, 10).map((r, i) => <div key={i} className="note"><span className="mono dim">{r.date}</span> — {r.better}</div>)}
      </div>}
    </div>
  );
}

/* ============================ LEADERBOARD ============================ */
function Leaderboard({ users }) {
  const [data, setData] = useState(null);
  useEffect(() => { (async () => {
    const out = { closer: [], setter: [], student: [] };
    const month = thisMonth();
    for (const u of users.filter((x) => ["closer", "setter", "student"].includes(x.role) && x.active !== false)) {
      const all = (await store.get(K.eod(u.id))) || [];
      const reports = all.filter((r) => (r.date || "").slice(0, 7) === month);
      out[u.role].push({ name: u.name, ...aggregate(reports, u.role) });
    }
    setData(out);
  })(); }, [users]);
  if (!data) return <div className="empty">Tallying the board…</div>;
  const Board = ({ title, rows, cols, sortKey, accent }) => {
    const ranked = [...rows].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
    return <div className="card" style={{ borderTop: `2px solid ${accent}` }}>
      <h3 className="disp h3" style={{ color: accent }}>{title}</h3>
      {ranked.length === 0 ? <div className="empty">No active members in this tier yet.</div> :
        <table><thead><tr><th>#</th><th>Name</th>{cols.map((c) => <th key={c.key} style={{ textAlign: "right" }}>{c.label}</th>)}</tr></thead><tbody>
          {ranked.map((r, i) => <tr key={r.name}><td className="mono b" style={{ color: i === 0 ? accent : "var(--faint)" }}>{i + 1}</td><td className="b">{r.name}</td>{cols.map((c) => <td key={c.key} className="mono" style={{ textAlign: "right", color: c.key === sortKey ? accent : "var(--text)" }}>{c.fmt ? c.fmt(r[c.key]) : (r[c.key] || 0)}</td>)}</tr>)}
        </tbody></table>}
    </div>;
  };
  return (
    <div>
      <h2 className="section">The Leaderboard</h2>
      <p className="sub">{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })} standings — resets on the 1st. Closers on top, setters next, students below.</p>
      <Board title="Closers" rows={data.closer} sortKey="cash" accent="#22d3ee" cols={[{ key: "showRate", label: "Show %", fmt: (v) => v + "%" }, { key: "closeRate", label: "Close %", fmt: (v) => v + "%" }, { key: "cash", label: "Cash", fmt: fmtMoney }]} />
      <Board title="Setters" rows={data.setter} sortKey="dials" accent="#34d399" cols={[{ key: "dials", label: "# Dials" }, { key: "setRate", label: "Set %", fmt: (v) => v + "%" }, { key: "cashPerSet", label: "Cash/Set", fmt: fmtMoney }]} />
      <Board title="Students" rows={data.student} sortKey="mocks" accent="#7e93a1" cols={[{ key: "mocks", label: "# Mocks" }, { key: "outreach", label: "# Outreach" }, { key: "responseRate", label: "Resp %", fmt: (v) => v + "%" }]} />
    </div>
  );
}

/* ============================ OPPORTUNITIES ============================ */
const parseOte = (s = "") => {
  const nums = String(s).toLowerCase().match(/\d[\d,.]*\s*k?/g) || [];
  const vals = nums.map((n) => { const k = n.includes("k"); const v = parseFloat(n.replace(/[^\d.]/g, "")) || 0; return k ? v * 1000 : v; });
  return vals.length ? Math.max(...vals) : 0;
};
const timeAgo = (ts, dateStr) => {
  const t = ts || (dateStr ? new Date(dateStr + "T00:00:00").getTime() : Date.now());
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7); if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
};
function Opportunities() {
  const url = "https://noreplyjobs.com/signup/closing-cabal";
  return (
    <div className="embed-wrap">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <div><h2 className="section">Opportunities</h2><p className="sub">Browse and apply to open closer & setter roles.</p></div>
        <a className="btn ghost sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open full page</a>
      </div>
      <div className="jobs-note">If this is your first time logging in to the job board, click <b>SIGN-UP</b> and wait for approval!</div>
      <iframe className="embed-frame" src={url} title="Opportunities board" loading="lazy"></iframe>
      <p className="hint" style={{ marginTop: 8 }}>If the board doesn't load above, your browser or the site blocked the embed — use "Open full page" to open it in a new tab.</p>
    </div>
  );
}

/* ============================ WINS (with reactions) ============================ */
function Wins({ me }) {
  const [wins, setWins] = useState([]); const [text, setText] = useState("");
  const isCoach = me.role === "coach" || me.role === "admin";
  useEffect(() => { (async () => setWins((await store.get(K.wins)) || []))(); }, []);
  async function remove(winId) { const next = wins.filter((w) => w.id !== winId); setWins(next); await store.set(K.wins, next); }
  async function post() { if (!text.trim()) return; const next = [{ id: uid(), name: me.name, role: me.role, text: text.trim(), date: today(), reactions: {} }, ...wins]; setWins(next); await store.set(K.wins, next); setText(""); }
  async function react(winId, type) {
    const next = wins.map((w) => {
      if (w.id !== winId) return w;
      const r = { ...(w.reactions || {}) }; const arr = new Set(r[type] || []);
      arr.has(me.id) ? arr.delete(me.id) : arr.add(me.id); r[type] = [...arr];
      return { ...w, reactions: r };
    });
    setWins(next); await store.set(K.wins, next);
  }
  return (
    <div>
      <h2 className="section">Wins</h2>
      <p className="sub">Post the moments that move the room.</p>
      <div className="card examples"><b className="cyan">What counts as a win?</b><div className="dim" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.6 }}>First mock call done · first outreach sent · first response · interview booked · landed an offer · first dial day · first set · first close · first cash collected · biggest cash day · a breakthrough on a skill you were stuck on. Big or small — if it moved you forward, post it.</div></div>
      <div className="card" style={{ marginBottom: 16 }}><label>Drop your win</label><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Booked my first interview today…" /><button className="btn" style={{ marginTop: 12 }} onClick={post}><PartyPopper size={15} /> Post win</button></div>
      {wins.length === 0 ? <div className="empty">No wins posted yet. Be the first.</div> :
        wins.map((w) => {
          const r = w.reactions || {};
          return (
            <div key={w.id} className="win">
              <div className="row-between" style={{ marginBottom: 6 }}><span className="b">{w.name} <span className={`tag ${w.role}`} style={{ marginLeft: 6 }}>{w.role}</span></span><span style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="mono" style={{ color: "var(--faint)", fontSize: 12 }}>{w.date}</span>{isCoach && <button className="iconbtn" title="Delete win" onClick={() => remove(w.id)}><Trash2 size={14} /></button>}</span></div>
              <div style={{ marginBottom: 12 }}>{w.text}</div>
              <div className="reactbar">
                {REACTIONS.map(([type, emoji]) => {
                  const count = (r[type] || []).length; if (count === 0) return null;
                  const mine = (r[type] || []).includes(me.id);
                  return <button key={type} className={`react-chip ${mine ? "mine" : ""}`} onClick={() => react(w.id, type)}>{emoji} <span className="mono">{count}</span></button>;
                })}
                <div className="react-add">
                  {REACTIONS.map(([type, emoji]) => <button key={type} className="add-emoji" title={`React ${emoji}`} onClick={() => react(w.id, type)}>{emoji}</button>)}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}

/* ============================ COACHING CALL SCHEDULE ============================ */
function Schedule({ isCoach }) {
  const [sched, setSched] = useState(null); const [draft, setDraft] = useState(null); const [editing, setEditing] = useState(false); const [ok, setOk] = useState(false);
  useEffect(() => { (async () => { const s = (await store.get(K.schedule)) || {}; setSched(s); setDraft(s); })(); }, []);
  if (!sched) return <div className="empty">Loading schedule…</div>;
  const setD = (day, k, v) => setDraft((d) => ({ ...d, [day]: { ...(d[day] || {}), [k]: v } }));
  async function save() { await store.set(K.schedule, draft); setSched(draft); setEditing(false); setOk(true); setTimeout(() => setOk(false), 2500); }
  return (
    <div>
      <div className="row-between"><div><h2 className="section">Coaching Call Schedule</h2><p className="sub">Live coaching calls, Monday–Friday.</p></div>
        {isCoach && (editing ? <div style={{ display: "flex", gap: 8 }}><button className="btn ghost" onClick={() => { setDraft(sched); setEditing(false); }}>Cancel</button><button className="btn" onClick={save}>Save schedule</button></div> : <button className="btn" onClick={() => setEditing(true)}><Cog size={15} /> Edit schedule</button>)}
      </div>
      {ok && <p className="ok">✓ Schedule saved for everyone.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {WEEKDAYS.map((day) => {
          const c = (editing ? draft : sched)[day] || {};
          return (
            <div key={day} className="card sched">
              <div className="sched-day">{day}{c.time && !editing && <span className="sched-time mono">{c.time}</span>}</div>
              {editing ? (
                <div className="grid2" style={{ marginTop: 10 }}>
                  <div><label>Coach running it</label><input value={c.coach || ""} onChange={(e) => setD(day, "coach", e.target.value)} placeholder="Josiah" /></div>
                  <div><label>Time</label><input value={c.time || ""} onChange={(e) => setD(day, "time", e.target.value)} placeholder="1:00 PM EST" /></div>
                  <div style={{ gridColumn: "span 2" }}><label>What the call covers</label><input value={c.topic || ""} onChange={(e) => setD(day, "topic", e.target.value)} placeholder="Objection handling roleplay + call reviews" /></div>
                  <div><label>Join via</label><select value={c.linkType || "meet"} onChange={(e) => setD(day, "linkType", e.target.value)}><option value="meet">Google Meet</option><option value="discord">Discord</option></select></div>
                  <div><label>{(c.linkType || "meet") === "discord" ? "Discord link / channel" : "Google Meet link"}</label><input value={c.link || ""} onChange={(e) => setD(day, "link", e.target.value)} placeholder={(c.linkType || "meet") === "discord" ? "#coaching-stage or invite link" : "https://meet.google.com/…"} /></div>
                </div>
              ) : (
                c.topic || c.coach ? (
                  <div style={{ marginTop: 8 }}>
                    <div className="disp" style={{ fontSize: 17 }}>{c.topic || "Coaching call"}</div>
                    <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>{c.coach ? `Run by ${c.coach}` : ""}</div>
                    {c.link ? <a className="btn ghost sm" style={{ marginTop: 10 }} href={c.linkType === "discord" ? c.link : c.link} target="_blank" rel="noreferrer">{c.linkType === "discord" ? <><MessageSquare size={14} /> Join in Discord</> : <><Video size={14} /> Join Google Meet</>}</a> : <div className="hint" style={{ marginTop: 8 }}>No link set yet.</div>}
                  </div>
                ) : <div className="empty" style={{ padding: "16px 0", textAlign: "left" }}>No call scheduled.</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ users }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { (async () => {
    const out = [];
    for (const u of users.filter((x) => ["student", "setter", "closer"].includes(x.role))) {
      const reports = (await store.get(K.eod(u.id))) || []; const rm = (await store.get(K.roadmap(u.id))) || { checked: {} };
      const daysDone = ROADMAP.filter((d) => (rm.checked[d.d] || []).length >= itemsOf(d).length).length;
      out.push({ ...u, lastEod: reports[0]?.date || null, reportCount: reports.length, roadmapPct: pct(daysDone, 30), agg: aggregate(reports, u.role) });
    }
    setRows(out);
  })(); }, [users]);
  if (!rows) return <div className="empty">Loading the cohort…</div>;
  const invited = users.filter((u) => u.status === "invited").length; const stale = (d) => !d || daysAgo(d) > 2;
  return (
    <div>
      <h2 className="section">Cohort Command Center</h2>
      <p className="sub">{rows.length} active members · {invited} pending invites.</p>
      <div className="card"><h3 className="disp h3">Everyone</h3>
        {rows.length === 0 ? <div className="empty">No members yet — invite people from the Members tab.</div> :
          <table><thead><tr><th>Name</th><th>Role</th><th>Roadmap</th><th>Reports</th><th>Key metric</th><th>Last EOD</th></tr></thead><tbody>
            {rows.map((m) => <tr key={m.id}><td className="b">{m.name}</td><td><span className={`tag ${m.role}`}>{m.role}</span></td><td className="mono">{m.roadmapPct}%</td><td className="mono">{m.reportCount}</td><td className="mono dim">{m.role === "closer" ? `${m.agg.closeRate}% close · ${fmtMoney(m.agg.cash)}` : m.role === "setter" ? `${m.agg.dials} dials · ${m.agg.setRate}% set` : `${m.agg.mocks} mocks · ${m.agg.responseRate}% resp`}</td><td className="mono" style={{ color: stale(m.lastEod) ? "var(--red)" : "var(--dim)" }}>{m.lastEod || "never"}</td></tr>)}
          </tbody></table>}
      </div>
    </div>
  );
}

/* ============================ MEMBERS ============================ */
function Members({ me, users }) {
  const [mail, setMail] = useState(""); const [out, setOut] = useState(null); const [busy, setBusy] = useState(false);
  async function approve() {
    const e = mail.trim().toLowerCase();
    if (!e || !e.includes("@")) { setOut({ ok: false, msg: "Enter a valid email." }); return; }
    setBusy(true);
    const { error } = await supabase.from("approved_members").upsert({ email: e, active: true, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) setOut({ ok: false, msg: "Couldn't approve — " + error.message });
    else { setOut({ ok: true, msg: `${e} is approved. They can now go to the login screen and tap "Create your password."` }); setMail(""); }
  }
  return (
    <div>
      <h2 className="section">Members</h2>
      <p className="sub">If Whop missed someone, approve their email here so they can log in. This is the same list Whop purchases add to automatically.</p>
      <div className="card"><h3 className="disp h3">Approve a member</h3>
        <p className="hint" style={{ marginBottom: 10 }}>Use the exact email they purchased with on Whop. After approving, they tap “Create your password” on the login screen.</p>
        <div className="grid2"><div><label>Email</label><input value={mail} placeholder="member@email.com" onChange={(e) => setMail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && approve()} /></div><div style={{ display: "flex", alignItems: "flex-end" }}><button className="btn" onClick={approve} disabled={busy} style={{ width: "100%" }}><CheckCircle2 size={15} /> {busy ? "Approving…" : "Approve member"}</button></div></div>
        {out && <p style={{ marginTop: 10, fontSize: 13, color: out.ok ? "var(--green)" : "var(--red)" }}>{out.msg}</p>}
      </div>
      <div className="card"><h3 className="disp h3">Roster</h3>
        <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>
          {users.map((u) => <tr key={u.id}><td className="b">{u.name}</td><td className="mono dim" style={{ fontSize: 12 }}>{u.email}</td><td><span className={`tag ${u.role}`}>{u.role}</span></td><td className="dim" style={{ fontSize: 12 }}>{u.joinDate || u.createdAt || "—"}</td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}

/* ============================ ROADMAP LINKS ============================ */
function RoadmapLinks() {
  const [draft, setDraft] = useState({}); const [booking, setBooking] = useState(""); const [ok, setOk] = useState(false);
  useEffect(() => { (async () => { const cfg = (await store.get(K.config)) || {}; setDraft(cfg.links || {}); setBooking(cfg.bookingUrl || ""); })(); }, []);
  async function save() { const cfg = (await store.get(K.config)) || {}; await store.set(K.config, { ...cfg, links: draft, bookingUrl: booking.trim() }); setOk(true); setTimeout(() => setOk(false), 2500); }
  return (
    <div>
      <h2 className="section">Roadmap Video Links</h2>
      <p className="sub">Paste each lesson's URL (Whop, Loom, YouTube, Google Doc, etc.). Students see “Watch” (or “Read” for docs) once a link is set. Days can have multiple lessons.</p>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="links-day-h"><CalendarDays size={14} className="cyan" style={{ verticalAlign: "-2px", marginRight: 6 }} />Day 7 — 1-on-1 booking link</div>
        <div className="link-row"><span style={{ minWidth: 230, fontSize: 13 }}>Book a call with Coach Josiah</span><input value={booking} placeholder="https://calendly.com/…" onChange={(e) => setBooking(e.target.value)} /></div>
        <p className="hint" style={{ marginTop: 6 }}>Students see a “Book your 1-on-1 with Coach Josiah” button on Day 7 once this is set.</p>
      </div>
      <div className="card">
        {ROADMAP.filter((d) => d.videos.length > 0).map((d) => (
          <div key={d.d} className="links-day">
            <div className="links-day-h"><span className="mono cyan b">{String(d.d).padStart(2, "0")}</span> {d.title}</div>
            {d.videos.map((v, i) => (
              <div key={i} className="link-row"><span style={{ minWidth: 230, fontSize: 13 }}>{v.doc ? <BookOpen size={13} className="cyan" style={{ verticalAlign: "-2px", marginRight: 6 }} /> : <Video size={13} className="cyan" style={{ verticalAlign: "-2px", marginRight: 6 }} />}{v.t}{v.dur ? ` (${v.dur})` : ""}{v.doc ? " · doc" : ""}</span><input value={draft[`${d.d}-${i}`] || ""} placeholder="https://…" onChange={(e) => setDraft((p) => ({ ...p, [`${d.d}-${i}`]: e.target.value }))} /></div>
            ))}
          </div>
        ))}
        <button className="btn" style={{ marginTop: 14 }} onClick={save}><Link2 size={15} /> Save all links</button>
        {ok && <span className="ok" style={{ marginLeft: 14 }}>✓ Saved for all students.</span>}
      </div>
    </div>
  );
}

/* ============================ SETTINGS ============================ */
function SettingsView({ me, isCoach, updateMe }) {
  const [name, setName] = useState(me.name); const [goal, setGoal] = useState(me.goal || ""); const [position, setPosition] = useState(me.role); const [ok, setOk] = useState(false);
  const opts = [["student", "Student"], ["setter", "Setter"], ["closer", "Closer"]];
  async function save() { const patch = { name: name.trim() || me.name, goal: goal.trim() }; if (!isCoach) { patch.role = position; patch.position = position; } await updateMe(patch); setOk(true); setTimeout(() => setOk(false), 2500); }
  return (
    <div>
      <h2 className="section">Settings</h2>
      <p className="sub">Update your profile as you progress.</p>
      <div className="card" style={{ maxWidth: 560 }}>
        <label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} />
        {!isCoach && <>
          <label style={{ marginTop: 16 }}>Your position</label>
          <div className="role-grid">{opts.map(([id, t]) => <div key={id} className={`role-opt ${position === id ? "sel" : ""}`} onClick={() => setPosition(id)}><div className="rt">{t}</div></div>)}</div>
          <p className="hint" style={{ marginTop: 6 }}>Coach/Admin roles can only be assigned by an Admin.</p>
        </>}
        <label style={{ marginTop: 16 }}>Your biggest goal</label><input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Land a closer seat and hit $10k/mo" />
        <button className="btn" style={{ marginTop: 18 }} onClick={save}>Save changes</button>
        {ok && <span className="ok" style={{ marginLeft: 14 }}>✓ Saved.</span>}
      </div>
    </div>
  );
}

/* ============================ STYLE (black + cyan) ============================ */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
.ccos *{ box-sizing:border-box; }
.ccos{ --bg:#04080d; --surface:#0a1118; --surface2:#0f1822; --border:#19242f; --text:#e6f1f5; --dim:#7e93a1; --faint:#52646f; --cyan:#22d3ee; --cyan2:#67e8f9; --green:#34d399; --red:#fb7185;
  font-family:'Hanken Grotesk',sans-serif; color:var(--text); min-height:100vh; letter-spacing:.01em;
  background:radial-gradient(1100px 560px at 82% -12%, rgba(34,211,238,.10), transparent 60%), radial-gradient(900px 520px at -8% 112%, rgba(34,211,238,.06), transparent 55%), var(--bg); }
.ccos .disp{ font-family:'Sora',sans-serif; } .ccos .mono{ font-family:'JetBrains Mono',monospace; } .ccos .b{ font-weight:700; }
.ccos .dim{ color:var(--dim); } .ccos .cyan{ color:var(--cyan); } .ccos .green{ color:var(--green); } .ccos .red{ color:var(--red); }
.ccos .wrap{ max-width:1240px; margin:0 auto; padding:0 22px 80px; }
.ccos .center{ display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
.ccos .applayout{ display:flex; gap:20px; align-items:flex-start; padding-top:24px; }
.ccos .sidewrap{ width:60px; flex-shrink:0; }
.ccos .sidebar{ position:sticky; top:24px; width:60px; background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:10px 9px; display:flex; flex-direction:column; gap:14px; overflow:hidden; transition:width .22s ease, box-shadow .22s ease; z-index:50; }
.ccos .sidebar.open{ width:248px; box-shadow:0 24px 70px rgba(0,0,0,.55); border-color:var(--cyan); }
.ccos .navback{ position:fixed; inset:0; background:rgba(2,6,12,.5); z-index:40; backdrop-filter:blur(1px); }
.ccos .maincol{ flex:1; min-width:0; }
.ccos .navtoggle{ background:none; border:1px solid var(--border); color:var(--cyan); border-radius:11px; padding:0; height:40px; min-width:40px; display:flex; align-items:center; gap:12px; cursor:pointer; font-family:inherit; transition:.15s; overflow:hidden; padding-left:11px; }
.ccos .navtoggle:hover{ border-color:var(--cyan); background:rgba(34,211,238,.07); }
.ccos .navbrand{ display:flex; flex-direction:column; line-height:1.1; }
.ccos .navbrand small{ color:var(--cyan); text-transform:uppercase; letter-spacing:.26em; font-size:8px; font-weight:700; }
.ccos .navbrand b{ font-family:'Sora',sans-serif; font-weight:800; font-size:15px; color:var(--text); }
.ccos .mark{ width:38px; height:38px; border:1px solid var(--cyan); border-radius:10px; display:grid; place-items:center; color:var(--cyan); font-family:'Sora',sans-serif; font-weight:800; font-size:19px; background:linear-gradient(160deg, rgba(34,211,238,.18), transparent); box-shadow:0 0 22px rgba(34,211,238,.25); }
.ccos .brand{ display:flex; align-items:center; gap:12px; }
.ccos .brand h1{ font-family:'Sora',sans-serif; font-weight:800; font-size:19px; margin:0; letter-spacing:-.01em; }
.ccos .brand small{ color:var(--cyan); text-transform:uppercase; letter-spacing:.3em; font-size:9px; font-weight:700; }
.ccos .pill{ text-transform:uppercase; letter-spacing:.12em; font-size:10px; font-weight:700; padding:4px 9px; border-radius:999px; border:1px solid var(--border); color:var(--cyan); background:rgba(34,211,238,.08); }
.ccos .iconbtn{ background:none; border:1px solid var(--border); color:var(--dim); border-radius:8px; padding:7px 9px; cursor:pointer; display:grid; place-items:center; transition:.15s; }
.ccos .iconbtn:hover{ color:var(--text); border-color:var(--cyan); }
.ccos .sidefoot{ margin-top:auto; padding-top:14px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:10px; }
.ccos .sideuser{ display:flex; flex-direction:column; gap:5px; align-items:flex-start; font-size:13px; white-space:nowrap; }
.ccos .sidebar:not(.open) .sideuser{ display:none; }
.ccos .footicons{ display:flex; flex-direction:column; gap:8px; }
.ccos .sidebar.open .footicons{ flex-direction:row; }
.ccos nav.tabs{ display:flex; flex-direction:column; gap:4px; }
.ccos .tab{ background:none; border:1px solid transparent; color:var(--dim); height:40px; padding:0 0 0 11px; border-radius:10px; cursor:pointer; font-size:13px; font-weight:600; display:flex; align-items:center; gap:12px; transition:.15s; font-family:inherit; width:100%; text-align:left; overflow:hidden; white-space:nowrap; }
.ccos .tab > svg{ flex-shrink:0; }
.ccos .tab:hover{ color:var(--text); background:var(--surface2); } .ccos .tab.active{ color:var(--bg); background:var(--cyan); box-shadow:0 0 18px rgba(34,211,238,.4); }
.ccos .tablabel{ opacity:0; transition:opacity .18s ease; }
.ccos .sidebar.open .tablabel{ opacity:1; }
@media(max-width:560px){ .ccos .sidebar.open{ width:80vw; } }

.ccos .card{ background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:20px; } .ccos .card + .card{ margin-top:14px; }
.ccos .card.glow{ box-shadow:0 0 40px rgba(34,211,238,.07); }
.ccos h2.section{ font-family:'Sora',sans-serif; font-weight:800; font-size:25px; margin:0 0 4px; letter-spacing:-.02em; }
.ccos h3.h3{ margin:0 0 12px; font-size:18px; font-weight:700; } .ccos p.sub{ color:var(--dim); margin:0 0 20px; font-size:14px; max-width:760px; }
.ccos label{ display:block; font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--dim); margin-bottom:6px; font-weight:600; }
.ccos input,.ccos textarea,.ccos select{ width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:11px 12px; font-family:inherit; font-size:14px; outline:none; transition:.15s; }
.ccos input:focus,.ccos textarea:focus,.ccos select:focus{ border-color:var(--cyan); box-shadow:0 0 0 3px rgba(34,211,238,.12); } .ccos textarea{ resize:vertical; min-height:64px; }
.ccos .btn{ background:var(--cyan); color:var(--bg); border:none; padding:12px 18px; border-radius:11px; font-weight:700; cursor:pointer; font-family:inherit; font-size:14px; display:inline-flex; align-items:center; gap:8px; transition:.15s; }
.ccos .btn:hover{ background:var(--cyan2); box-shadow:0 0 20px rgba(34,211,238,.35); } .ccos .btn:disabled{ opacity:.4; cursor:not-allowed; box-shadow:none; }
.ccos .btn.ghost{ background:none; border:1px solid var(--border); color:var(--text); } .ccos .btn.ghost:hover{ border-color:var(--cyan); background:rgba(34,211,238,.06); box-shadow:none; }
.ccos .btn.full{ width:100%; justify-content:center; } .ccos .btn.sm{ padding:8px 12px; font-size:12px; }
.ccos .grid2{ display:grid; grid-template-columns:1fr 1fr; gap:14px; } .ccos .grid3{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; } .ccos .grid4{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
@media(max-width:760px){ .ccos .grid2,.ccos .grid3,.ccos .grid4{ grid-template-columns:1fr 1fr; } }
.ccos .row-between{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.ccos .stat{ background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:16px; }
.ccos .stat .k{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--dim); display:flex; align-items:center; gap:6px; }
.ccos .stat .v{ font-family:'JetBrains Mono',monospace; font-size:26px; font-weight:700; margin-top:8px; }
.ccos .stat .v.cyan{ color:var(--cyan); } .ccos .stat .v.green{ color:var(--green); } .ccos .stat .v.red{ color:var(--red); }
.ccos .phase-h{ font-family:'Sora',sans-serif; font-size:13px; font-weight:700; color:var(--cyan); text-transform:uppercase; letter-spacing:.16em; margin:26px 0 12px; display:flex; align-items:center; gap:10px; }
.ccos .phase-h::after{ content:''; flex:1; height:1px; background:var(--border); }
.ccos .day{ background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px; transition:.15s; }
.ccos .day.done{ border-color:rgba(52,211,153,.3); } .ccos .day.locked{ opacity:.45; }
.ccos .day.active{ border-color:var(--cyan); box-shadow:0 0 26px rgba(34,211,238,.12); }
.ccos .day-head{ display:flex; align-items:center; gap:12px; }
.ccos .day-no{ font-family:'Sora',sans-serif; font-weight:800; font-size:20px; color:var(--faint); min-width:34px; }
.ccos .day.done .day-no{ color:var(--green); } .ccos .day.active .day-no{ color:var(--cyan); }
.ccos .day-title{ font-weight:700; font-size:15px; display:flex; align-items:center; } .ccos .day-focus{ color:var(--dim); font-size:13px; margin-top:2px; }
.ccos .now{ font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:700; color:var(--bg); background:var(--cyan); padding:2px 6px; border-radius:5px; margin-left:8px; letter-spacing:.1em; }
.ccos .day-body{ margin-top:12px; padding-top:4px; padding-left:46px; }
.ccos .book-call{ display:inline-flex; align-items:center; gap:8px; margin-bottom:12px; padding:11px 16px; border-radius:10px; background:linear-gradient(135deg, rgba(34,211,238,.18), rgba(34,211,238,.06)); border:1px solid var(--cyan); color:var(--cyan); font-weight:700; font-size:14px; text-decoration:none; transition:.15s; } .ccos .book-call:hover{ background:rgba(34,211,238,.22); }
.ccos .task{ display:flex; align-items:center; gap:9px; font-size:14px; padding:6px 0; } .ccos .task.click{ cursor:pointer; } .ccos .task.click:hover span{ color:var(--text); }
.ccos .vrow{ display:flex; align-items:center; gap:9px; padding:7px 0; font-size:14px; }
.ccos .ck{ background:none; border:none; padding:0; cursor:pointer; display:grid; place-items:center; }
.ccos .vtitle{ flex:1; } .ccos .vdur{ font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--faint); margin-left:8px; }
.ccos .watch{ color:var(--cyan); font-size:12px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:5px; border:1px solid var(--border); padding:5px 9px; border-radius:8px; transition:.15s; } .ccos .watch:hover{ border-color:var(--cyan); background:rgba(34,211,238,.07); } .ccos .watch.off{ color:var(--faint); border-style:dashed; cursor:default; }
.ccos .bar{ height:9px; background:var(--bg); border-radius:99px; overflow:hidden; border:1px solid var(--border); }
.ccos .bar > div{ height:100%; background:linear-gradient(90deg,var(--cyan),var(--cyan2)); border-radius:99px; transition:width .4s; box-shadow:0 0 14px rgba(34,211,238,.5); }
.ccos table{ width:100%; border-collapse:collapse; }
.ccos th{ text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--dim); padding:10px 12px; border-bottom:1px solid var(--border); font-weight:700; }
.ccos td{ padding:12px; border-bottom:1px solid var(--border); font-size:13px; } .ccos tr:hover td{ background:var(--surface2); }
.ccos .tag{ font-size:10px; text-transform:uppercase; letter-spacing:.08em; padding:3px 8px; border-radius:6px; font-weight:700; }
.ccos .tag.student{ background:rgba(126,147,161,.15); color:var(--dim); } .ccos .tag.setter{ background:rgba(52,211,153,.15); color:var(--green); }
.ccos .tag.closer{ background:rgba(34,211,238,.15); color:var(--cyan); } .ccos .tag.coach{ background:rgba(251,113,133,.15); color:var(--red); } .ccos .tag.admin{ background:rgba(251,113,133,.22); color:var(--red); }
.ccos .win{ border:1px solid var(--border); border-radius:14px; padding:14px 16px; margin-bottom:10px; background:var(--surface); }
.ccos .reactbar{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.ccos .react-chip{ background:var(--surface2); border:1px solid var(--border); border-radius:999px; padding:4px 11px; font-size:13px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; transition:.15s; color:var(--text); font-family:inherit; }
.ccos .react-chip:hover{ border-color:var(--cyan); } .ccos .react-chip.mine{ border-color:var(--cyan); background:rgba(34,211,238,.12); }
.ccos .react-add{ display:inline-flex; gap:2px; margin-left:auto; opacity:.5; transition:.15s; } .ccos .win:hover .react-add{ opacity:1; }
.ccos .add-emoji{ background:none; border:none; cursor:pointer; font-size:16px; padding:3px 5px; border-radius:7px; transition:.15s; } .ccos .add-emoji:hover{ background:var(--surface2); transform:scale(1.15); }
.ccos .opp{ border:1px solid var(--border); border-radius:14px; padding:18px; background:var(--surface); display:flex; flex-direction:column; min-width:0; overflow-wrap:anywhere; word-break:break-word; }
.ccos .opp-grid{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:14px; }
.ccos .opp > .row-between:last-child{ margin-top:auto; }
@media(max-width:620px){ .ccos .opp-grid{ grid-template-columns:1fr; } }
.ccos .appcode{ display:flex; align-items:center; gap:10px; padding:9px 12px; margin-bottom:12px; border:1px dashed var(--cyan); border-radius:10px; background:rgba(34,211,238,.06); }
.ccos .appcode-lbl{ font-size:10px; text-transform:uppercase; letter-spacing:.1em; color:var(--dim); font-weight:700; }
.ccos .appcode-val{ font-size:15px; font-weight:700; color:var(--cyan); letter-spacing:.04em; margin-left:auto; }
.ccos .posted{ font-size:12px; color:var(--faint); white-space:nowrap; }
.ccos .niche-tag{ font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--dim); border:1px solid var(--border); border-radius:6px; padding:2px 8px; }
.ccos .applied-btn{ display:inline-flex; align-items:center; gap:7px; align-self:flex-start; margin-bottom:12px; padding:8px 12px; border-radius:9px; border:1px solid var(--border); background:none; color:var(--dim); font-weight:700; font-size:13px; cursor:pointer; transition:.15s; font-family:inherit; }
.ccos .applied-btn:hover{ border-color:var(--cyan); color:var(--text); }
.ccos .applied-btn.on{ border-color:var(--green); color:var(--green); background:rgba(52,211,153,.08); }
.ccos .opp.applied{ border-color:rgba(52,211,153,.45); }
.ccos .nichesel{ margin-left:8px; background:var(--surface); border:1px solid var(--border); color:var(--text); border-radius:999px; padding:6px 12px; font-size:12px; font-family:inherit; cursor:pointer; }
.ccos .embed-frame{ width:100%; height:calc(100vh - 190px); min-height:540px; border:1px solid var(--border); border-radius:14px; background:var(--surface); display:block; }
.ccos .jobs-note{ background:linear-gradient(135deg, rgba(34,211,238,.16), rgba(34,211,238,.05)); border:1px solid var(--cyan); color:var(--cyan2); border-radius:12px; padding:12px 16px; margin-bottom:12px; font-size:14px; font-weight:600; }
.ccos .jobs-note b{ color:var(--cyan); letter-spacing:.03em; }
.ccos .intake-top{ display:flex; align-items:center; gap:12px; margin-bottom:14px; }
.ccos .intake-count{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--cyan); font-weight:700; white-space:nowrap; }
.ccos .intake-bar{ flex:1; height:6px; background:var(--surface2); border-radius:999px; overflow:hidden; }
.ccos .intake-bar span{ display:block; height:100%; background:var(--cyan); border-radius:999px; transition:width .25s; }
.ccos .intake-note{ font-size:13px; color:var(--dim); margin:0 0 18px; line-height:1.5; }
.ccos .intake-q{ display:block; font-family:'Sora',sans-serif; font-size:19px; font-weight:600; color:var(--text); margin-bottom:12px; line-height:1.35; }
.ccos .intake-input{ width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:12px; padding:13px 14px; font-family:inherit; font-size:15px; outline:none; box-sizing:border-box; resize:vertical; }
.ccos .intake-input:focus{ border-color:var(--cyan); }
.ccos .intake-actions{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:18px; }
.ccos .intake-card{ padding:0; overflow:hidden; }
.ccos .intake-head{ padding:16px 18px; cursor:pointer; }
.ccos .intake-head:hover{ background:var(--surface2); }
.ccos .intake-answers{ border-top:1px solid var(--border); padding:6px 18px 14px; }
.ccos .intake-a{ padding:12px 0; border-bottom:1px solid var(--border); }
.ccos .intake-a:last-child{ border-bottom:none; }
.ccos .intake-a-q{ font-size:13px; font-weight:700; color:var(--cyan); margin-bottom:5px; }
.ccos .intake-a-v{ font-size:14px; color:var(--text); white-space:pre-wrap; line-height:1.5; }
.ccos .sortbar{ display:flex; align-items:center; gap:8px; margin-bottom:14px; }
.ccos .sortlbl{ font-size:11px; text-transform:uppercase; letter-spacing:.1em; color:var(--dim); font-weight:600; margin-right:2px; }
.ccos .sortpill{ background:var(--surface); border:1px solid var(--border); color:var(--dim); padding:7px 13px; border-radius:999px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:.15s; }
.ccos .sortpill:hover{ color:var(--text); border-color:var(--cyan); }
.ccos .sortpill.on{ background:rgba(34,211,238,.12); border-color:var(--cyan); color:var(--cyan); }
.ccos .examples{ background:linear-gradient(160deg, rgba(34,211,238,.07), var(--surface)); margin-bottom:14px; }
.ccos .encourage,.ccos .goal{ display:flex; gap:14px; align-items:flex-start; background:linear-gradient(160deg, rgba(34,211,238,.08), var(--surface)); }
.ccos .goal{ margin-bottom:16px; }
.ccos .note{ font-size:13px; padding:8px 0; border-bottom:1px solid var(--border); }
.ccos .invite-out{ margin-top:14px; padding:14px; border:1px dashed var(--cyan); border-radius:12px; background:rgba(34,211,238,.06); }
.ccos .links-day{ padding:10px 0; border-bottom:1px solid var(--border); } .ccos .links-day-h{ font-size:13px; font-weight:700; margin-bottom:8px; display:flex; gap:8px; align-items:center; }
.ccos .link-row{ display:flex; gap:12px; align-items:center; padding:5px 0; }
.ccos .sched .sched-day{ font-family:'Sora',sans-serif; font-weight:700; font-size:16px; display:flex; align-items:center; justify-content:space-between; }
.ccos .sched-time{ font-size:13px; color:var(--cyan); }
.ccos .role-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:6px; } @media(max-width:560px){ .ccos .role-grid{ grid-template-columns:1fr; } }
.ccos .role-opt{ border:1px solid var(--border); border-radius:12px; padding:14px; cursor:pointer; text-align:center; transition:.15s; } .ccos .role-opt.sel{ border-color:var(--cyan); background:rgba(34,211,238,.08); box-shadow:0 0 18px rgba(34,211,238,.12); }
.ccos .role-opt .rt{ font-weight:700; font-size:14px; } .ccos .role-opt .rd{ font-size:11px; color:var(--dim); margin-top:3px; }
.ccos .empty{ text-align:center; color:var(--faint); padding:40px 20px; font-size:14px; }
.ccos .auth{ width:100%; max-width:440px; }
.ccos .err{ color:var(--red); font-size:13px; margin-top:10px; } .ccos .ok{ color:var(--green); font-size:13px; }
.ccos .hint{ font-size:12px; color:var(--dim); } .ccos .disclaimer{ font-size:11px; color:var(--faint); line-height:1.5; margin-top:16px; border-top:1px solid var(--border); padding-top:14px; }
`;
