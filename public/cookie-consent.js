(function () {
  const key = 'threadline-cookie-choice';
  const choice = function () { try { return localStorage.getItem(key); } catch (_) { return null; } };
  function loadOptionalServices() {
    if (choice() !== 'accepted') return;
    const measurementId = document.body.dataset.gaId;
    if (measurementId && !window.threadlineAnalyticsLoaded) {
      window.threadlineAnalyticsLoaded = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', measurementId);
      const analytics = document.createElement('script');
      analytics.async = true;
      analytics.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
      document.head.appendChild(analytics);
    }
    if (document.body.dataset.adScript === 'true' && !window.threadlineAdLoaded) {
      window.threadlineAdLoaded = true;
      const advertising = document.createElement('script');
      advertising.src = 'https://nap5k.com/tag.min.js';
      advertising.async = true;
      document.head.appendChild(advertising);
    }
    if (document.body.dataset.impactTracking === 'true' && !window.threadlineImpactLoaded) {
      window.threadlineImpactLoaded = true;
      const tracking = document.createElement('script');
      tracking.async = true;
      tracking.src = 'https://utt.impactcdn.com/P-A7060140-c6f4-4816-ac85-13bc5b1acf7f1.js';
      tracking.onload = function () {
        if (window.impactStat) {
          window.impactStat('transformLinks');
          window.impactStat('trackImpression');
        }
      };
      document.head.appendChild(tracking);
    }
  }
  const savedChoice = choice();
  if (savedChoice) loadOptionalServices();
  const banner = document.createElement('section');
  banner.className = 'cookie-consent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie preferences');
  banner.innerHTML = '<p><strong>Your privacy choices</strong><br>Threadline uses optional analytics and affiliate measurement that may store cookies. Accept to enable them, or reject to keep them disabled. <a href="https://www.rbxthread.app/tos">Learn more</a>.</p><div class="cookie-actions"><button type="button" data-choice="accepted">Accept</button><button type="button" data-choice="rejected">Reject</button></div>';
  banner.addEventListener('click', function (event) {
    const button = event.target.closest('[data-choice]');
    if (!button) return;
    try { localStorage.setItem(key, button.dataset.choice); } catch (_) {}
    banner.remove();
    loadOptionalServices();
  });
  if (!savedChoice) document.body.appendChild(banner);
  document.querySelectorAll('.footer-right').forEach(function (footer) {
    if (footer.querySelector('.cookie-settings')) return;
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'footer-link cookie-settings';
    settings.textContent = 'Cookie settings';
    settings.addEventListener('click', function () {
      try { localStorage.removeItem(key); } catch (_) {}
      if (!banner.isConnected) document.body.appendChild(banner);
    });
    footer.appendChild(settings);
  });
})();
