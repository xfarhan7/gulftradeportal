// ============================================================
// GULF TRADE PORTAL — Supabase Configuration
// This connects your website to your Supabase database.
// Safe to commit publicly: the publishable key is browser-safe,
// and Row Level Security protects all data.
// ============================================================

const SUPABASE_URL = 'https://mynalmdopecpkgzbuyua.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lT-nl3e1ERprLF5SJaqFYg_adibJsOB';

// Initialise the Supabase client (loaded from CDN in each page)
let supabaseClient;
if (window.supabase && window.supabase.createClient) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.warn('Supabase library not loaded yet — check the CDN script tag is included before supabase-config.js');
}

// ---- Helper: get current logged-in user (or null) ----
async function gtpCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ---- Helper: get current user's company profile (or null) ----
async function gtpCurrentCompany() {
  const user = await gtpCurrentUser();
  if (!user) return null;
  const { data, error } = await supabaseClient
    .from('companies')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error) return null;
  return data;
}

// ---- Helper: is the user logged in? ----
async function gtpIsLoggedIn() {
  const user = await gtpCurrentUser();
  return !!user;
}

// ---- Helper: get the user's plan ('free' if none) ----
async function gtpUserPlan() {
  const company = await gtpCurrentCompany();
  return company ? (company.plan || 'free') : null;
}

// ---- Helper: sign out ----
async function gtpSignOut() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('gtp_plan');
  window.location.href = 'index.html';
}

// ---- Helper: make a URL-safe slug from a name ----
function gtpSlugify(text) {
  return (text || '').toLowerCase()
    .replace(/b&f/g, 'bf')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}
