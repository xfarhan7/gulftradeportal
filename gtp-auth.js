// ============================================================
// GULF TRADE PORTAL — Shared Auth (runs on every page)
// Detects the real Supabase session and keeps login state
// consistent across all pages. Updates the nav automatically.
// ============================================================

// Wait for supabaseClient (from supabase-config.js) to be ready
async function gtpAuthInit() {
  const client = (typeof gtpClient === 'function') ? await gtpClient() : window.supabaseClient;
  if (!client) {
    // library still not ready — retry shortly
    setTimeout(gtpAuthInit, 400);
    return;
  }

  let session = null;
  try {
    const res = await client.auth.getSession();
    session = res.data.session;
    if (!session) {
      await new Promise(r => setTimeout(r, 400));
      const res2 = await client.auth.getSession();
      session = res2.data.session;
    }
  } catch (e) { /* ignore */ }

  const loggedIn = !!(session && session.user);
  window.GTP_LOGGED_IN = loggedIn;

  if (loggedIn) {
    // Cache plan for gating
    try {
      const company = await gtpCurrentCompany();
      if (company) localStorage.setItem('gtp_plan', company.plan || 'free');
    } catch (e) {}
  }

  gtpUpdateNav(loggedIn);

  // Let pages react (e.g. trade board unblur) if they define a hook
  if (typeof window.onGtpAuthReady === 'function') {
    window.onGtpAuthReady(loggedIn);
  }

  // React to login/logout happening on this page
  client.auth.onAuthStateChange((event, sess) => {
    const nowIn = !!(sess && sess.user);
    window.GTP_LOGGED_IN = nowIn;
    gtpUpdateNav(nowIn);
    if (typeof window.onGtpAuthReady === 'function') window.onGtpAuthReady(nowIn);
  });
}

// Update nav links to reflect logged-in state on ANY page
function gtpUpdateNav(loggedIn) {
  // Desktop "Sign In" link (points to portal.html)
  document.querySelectorAll('.nav-right a[href="portal.html"], a.btn-nav[href="portal.html"]').forEach(a => {
    a.textContent = loggedIn ? 'My Portal' : 'Sign In';
  });
  // "Register" button → becomes "My Portal" too when logged in (optional, keep Register visible)
  // Mobile drawer portal link
  document.querySelectorAll('.mob-link[href="portal.html"]').forEach(a => {
    a.textContent = loggedIn ? 'My Portal' : 'Client Portal';
  });

  // If a page has a #gtp-signout button, show it when logged in
  document.querySelectorAll('.gtp-signout').forEach(el => {
    el.style.display = loggedIn ? '' : 'none';
  });
}

// Universal sign-out (call from any "Sign Out" button)
async function gtpDoSignOut() {
  try { const c = await gtpClient(); if(c) await c.auth.signOut(); } catch (e) {}
  localStorage.removeItem('gtp_plan');
  window.location.href = 'index.html';
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', gtpAuthInit);
} else {
  gtpAuthInit();
}
