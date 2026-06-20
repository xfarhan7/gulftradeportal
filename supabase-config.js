// ============================================================
// GULF TRADE PORTAL — Supabase Configuration (robust init)
// ============================================================

const SUPABASE_URL = 'https://mynalmdopecpkgzbuyua.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lT-nl3e1ERprLF5SJaqFYg_adibJsOB';

// Create the client. If the CDN library isn't ready yet, we retry until it is,
// so supabaseClient is reliably available even on slow connections.
let supabaseClient = null;

function gtpCreateClient() {
  if (window.supabase && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.supabaseClient = supabaseClient;
    return true;
  }
  return false;
}

// Try immediately; if not ready, poll briefly until the CDN script finishes.
if (!gtpCreateClient()) {
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (gtpCreateClient() || tries > 50) clearInterval(iv); // up to ~10s
  }, 200);
}

// Returns the client once it's ready (awaitable). Use this before auth calls.
async function gtpClient() {
  for (let i = 0; i < 50; i++) {
    if (supabaseClient) return supabaseClient;
    if (gtpCreateClient()) return supabaseClient;
    await new Promise(r => setTimeout(r, 200));
  }
  return supabaseClient; // may still be null if CDN truly failed
}

// ---- Helpers ----
async function gtpCurrentUser() {
  const c = await gtpClient(); if (!c) return null;
  const { data: { user } } = await c.auth.getUser();
  return user;
}
async function gtpCurrentCompany() {
  const c = await gtpClient(); if (!c) return null;
  const user = await gtpCurrentUser();
  if (!user) return null;
  const { data, error } = await c.from('companies').select('*').eq('user_id', user.id).single();
  if (error) return null;
  return data;
}
async function gtpIsLoggedIn() {
  const user = await gtpCurrentUser();
  return !!user;
}
async function gtpUserPlan() {
  const company = await gtpCurrentCompany();
  return company ? (company.plan || 'free') : null;
}
async function gtpSignOut() {
  const c = await gtpClient();
  if (c) await c.auth.signOut();
  localStorage.removeItem('gtp_plan');
  window.location.href = 'index.html';
}
function gtpSlugify(text) {
  return (text || '').toLowerCase()
    .replace(/b&f/g, 'bf')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}
async function gtpReady() {
  const c = await gtpClient(); if (!c) return null;
  const { data: { session } } = await c.auth.getSession();
  return session;
}
