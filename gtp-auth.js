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
  // "Sign In" link (points to portal.html) → "My Portal" when logged in
  document.querySelectorAll('.nav-right a[href="portal.html"], a.btn-nav[href="portal.html"]').forEach(a => {
    a.textContent = loggedIn ? 'My Portal' : 'Sign In';
  });
  // Mobile drawer portal link
  document.querySelectorAll('.mob-link[href="portal.html"]').forEach(a => {
    a.textContent = loggedIn ? 'My Portal' : 'Client Portal';
  });

  // "Register Free" button → becomes "Sign Out" when logged in (so you can
  // sign out from ANY page). Restores to Register when logged out.
  document.querySelectorAll('.nav-right a[href="register.html"], a.btn-nav[href="register.html"]').forEach(a => {
    if (loggedIn) {
      a.textContent = 'Sign Out';
      a.setAttribute('href', 'javascript:void(0)');
      a.setAttribute('data-gtp-signout', '1');
      a.onclick = function(e){ e.preventDefault(); gtpDoSignOut(); };
    } else {
      // Only reset if we previously converted it
      if (a.getAttribute('data-gtp-signout') === '1') {
        a.textContent = 'Register Free';
        a.setAttribute('href', 'register.html');
        a.removeAttribute('data-gtp-signout');
        a.onclick = null;
      }
    }
  });

  // Any explicit .gtp-signout element
  document.querySelectorAll('.gtp-signout').forEach(el => {
    el.style.display = loggedIn ? '' : 'none';
  });
}

// Universal sign-out (call from any "Sign Out" button)
async function gtpDoSignOut() {
  // Sign out of Supabase, then GUARANTEE the session is gone by removing
  // the auth token from storage ourselves (signOut alone can lag or fail silently).
  try { const c = await gtpClient(); if(c) await c.auth.signOut(); } catch (e) {}
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.includes('-auth-token') || k === 'gtp_plan' || k.startsWith('gtp_replies_')) {
        localStorage.removeItem(k);
      }
    });
  } catch(e) {}
  window.GTP_LOGGED_IN = false;
  window.location.href = 'index.html';
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', gtpAuthInit);
} else {
  gtpAuthInit();
}
