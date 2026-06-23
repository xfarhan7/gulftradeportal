/* Gulf Trade Portal — lightweight cookie / privacy notice.
   No external dependencies. Shows once; remembers dismissal in
   localStorage so it never reappears for that visitor. The site uses
   only essential cookies (auth session), so a single acknowledgement
   is appropriate. If marketing/analytics cookies are added later,
   switch this to an Accept / Reject choice. */
(function () {
  var KEY = 'gtp_cookie_consent';
  try { if (localStorage.getItem(KEY) === '1') return; } catch (e) { /* storage blocked — show anyway */ }

  function build() {
    if (document.getElementById('gtp-cookie-bar')) return;

    var bar = document.createElement('div');
    bar.id = 'gtp-cookie-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie notice');
    bar.style.cssText = [
      'position:fixed', 'left:16px', 'right:16px', 'bottom:16px', 'z-index:2147483000',
      'max-width:760px', 'margin:0 auto',
      'background:linear-gradient(135deg,#0b3d34 0%,#062019 100%)', 'color:#F2EEE2',
      'border:1px solid rgba(255,255,255,.12)', 'border-radius:12px',
      'box-shadow:0 12px 40px rgba(0,0,0,.30)', 'padding:15px 18px',
      'display:flex', 'flex-wrap:wrap', 'align-items:center', 'gap:10px 16px',
      'font-family:Inter,system-ui,-apple-system,sans-serif', 'font-size:.82rem', 'line-height:1.55',
      'opacity:0', 'transform:translateY(10px)', 'transition:opacity .25s ease, transform .25s ease'
    ].join(';');

    bar.innerHTML =
      '<span style="flex:1 1 300px;min-width:240px;">We use only essential cookies to keep you signed in and run the site. ' +
      'By continuing you agree to our <a href="privacy.html" style="color:#E8B84B;text-decoration:underline;">Privacy Policy</a>.</span>' +
      '<div style="display:flex;gap:8px;flex-shrink:0;margin-left:auto;">' +
        '<a href="privacy.html" style="display:inline-flex;align-items:center;background:transparent;color:#F2EEE2;border:1px solid rgba(255,255,255,.25);font-weight:600;font-size:.8rem;padding:8px 14px;border-radius:7px;text-decoration:none;">Learn more</a>' +
        '<button id="gtp-cookie-ok" type="button" style="background:#C8922A;color:#062019;border:none;font-weight:700;font-family:inherit;font-size:.8rem;padding:9px 18px;border-radius:7px;cursor:pointer;">Got it</button>' +
      '</div>';

    document.body.appendChild(bar);
    // fade/slide in
    requestAnimationFrame(function () {
      bar.style.opacity = '1';
      bar.style.transform = 'translateY(0)';
    });

    document.getElementById('gtp-cookie-ok').addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
      bar.style.opacity = '0';
      bar.style.transform = 'translateY(10px)';
      setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 260);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
