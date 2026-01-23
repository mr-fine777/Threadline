// Content script that runs on Roblox catalog pages
// Content script that runs on Roblox catalog pages and home page
(function() {
    // --- Threadline Ad Injection on Home Page Game Grid ---
    function injectThreadlineAdTiles() {
      // Check if user is premium via background.js
      try {
        chrome.runtime.sendMessage({ action: 'checkPremiumStatus' }, function(response) {
          if (response && response.premium === true) {
            // User is premium, skip ad injection
            return;
          }
          // Not premium, proceed as normal
          // Find all 'Recommended For You' grids and use the second one
          let allGrids = Array.from(document.querySelectorAll('div[data-testid="home-page-game-grid"] div[data-testid="game-grid"].game-grid'));
          if (allGrids.length < 2) {
            return;
          }
          let grid = allGrids[1];

          // Get all game tile <li> elements
          const tiles = Array.from(grid.querySelectorAll('li[data-testid="wide-game-tile"]'));
          if (!tiles.length) {
            return;
          }

          // Remove any existing Threadline ad tiles to avoid duplicates
          const oldAds = grid.querySelectorAll('li.threadline-ad-tile');
          if (oldAds.length > 0) {
            oldAds.forEach(el => el.remove());
          }

          // Replace every 4th tile with the ad tile, all at once
          for (let i = 3; i < tiles.length; i += 4) {
            const oldTile = tiles[i];
            if (!oldTile) continue;
            const adTile = document.createElement('li');
            adTile.className = 'list-item hover-game-tile grid-tile old-hover threadline-ad-tile';
            adTile.setAttribute('data-testid', 'wide-game-tile');
            adTile.innerHTML = `
              <div class="featured-game-container game-card-container">
                <a class="game-card-link" href="https://rbxthread.app/premium.html" tabindex="0">
                  <div class="featured-game-icon-container">
                    <span class="thumbnail-2d-container brief-game-icon">
                      <iframe src="https://www.padrinos.blog/threadline/tileset.html" width="250" height="140" frameborder="0"></iframe>
                    </span>
                  </div>
                  <div class="info-container">
                    <div class="info-metadata-container">
                      <div class="game-card-name game-name-title" data-testid="game-tile-game-title" title="Threadline Ads">
                        Threadline Ads
                      </div>
                      <div class="wide-game-tile-metadata">
                        <div class="base-metadata">
                          <div class="game-card-info" data-testid="game-tile-stats-rating"></div>
                        </div>
                        <div class="hover-metadata"></div>
                      </div>
                    </div>
                  </div>
                </a>
              </div>
            `;
            grid.replaceChild(adTile, oldTile);
          }
        });
      } catch (e) {
        // fallback: if error, just run as normal
        // Find all 'Recommended For You' grids and use the second one
        let allGrids = Array.from(document.querySelectorAll('div[data-testid="home-page-game-grid"] div[data-testid="game-grid"].game-grid'));
        if (allGrids.length < 2) {
          return;
        }
        let grid = allGrids[1];

        // Get all game tile <li> elements
        const tiles = Array.from(grid.querySelectorAll('li[data-testid="wide-game-tile"]'));
        if (!tiles.length) {
          return;
        }

        // Remove any existing Threadline ad tiles to avoid duplicates
        const oldAds = grid.querySelectorAll('li.threadline-ad-tile');
        if (oldAds.length > 0) {
          oldAds.forEach(el => el.remove());
        }

        // Replace every 4th tile with the ad tile, all at once
        for (let i = 3; i < tiles.length; i += 4) {
          const oldTile = tiles[i];
          if (!oldTile) continue;
          const adTile = document.createElement('li');
          adTile.className = 'list-item hover-game-tile grid-tile old-hover threadline-ad-tile';
          adTile.setAttribute('data-testid', 'wide-game-tile');
          adTile.innerHTML = `
            <div class="featured-game-container game-card-container">
              <a class="game-card-link" href="https://rbxthread.app/premium.html" tabindex="0">
                <div class="featured-game-icon-container">
                  <span class="thumbnail-2d-container brief-game-icon">
                    <iframe src="https://www.padrinos.blog/threadline/tileset.html" width="250" height="140" frameborder="0"></iframe>
                  </span>
                </div>
                <div class="info-container">
                  <div class="info-metadata-container">
                    <div class="game-card-name game-name-title" data-testid="game-tile-game-title" title="Threadline Ads">
                      Threadline Ads
                    </div>
                    <div class="wide-game-tile-metadata">
                      <div class="base-metadata">
                        <div class="game-card-info" data-testid="game-tile-stats-rating"></div>
                      </div>
                      <div class="hover-metadata"></div>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          `;
          grid.replaceChild(adTile, oldTile);
        }
      }
    }

    // Only run once, after 3 seconds, and do not use MutationObserver
    function observeHomePageGrid() {
      if (location.hostname.match(/^([a-z0-9-]+\.)?roblox\.com$/) && (location.pathname === '/' || location.pathname === '/home')) {
        setTimeout(() => {
          injectThreadlineAdTiles();
        }, 3000);
      }
    }

    // Run home page ad injection logic
    observeHomePageGrid();
  'use strict';

  // Ensure Threadline nav item is present on roblox.com
  try {
    (function insertThreadlineNav() {
      // Only run on roblox domains
      try {
        if (!location.hostname || !location.hostname.includes('roblox.com')) return;
      } catch (e) {
        return;
      }

      const selector = 'ul.nav.rbx-navbar.hidden-xs.hidden-sm.col-md-5.col-lg-4';

      function doInsert() {
        const ul = document.querySelector(selector);
        if (!ul) return false;
        // don't add a duplicate
        if (document.getElementById('threadline')) return true;

        const li = document.createElement('li');
        li.id = 'threadline';
        li.innerHTML = '<div><iframe'
          + ' src="https://www.padrinos.blog/ad.html"'
          + ' width="0"'
          + ' height="0"'
          + ' style="border:none;"'
          + ' sandbox="allow-scripts allow-same-origin"'
          + ' referrerpolicy="no-referrer">'
          + '</iframe>'
          + '<a class="font-header-2 nav-menu-title text-header robux-menu-btn" href="https://rbxthread.app/premium.html">Threadline</a>'
          + '</div>';

        try { ul.appendChild(li); } catch (e) { console.warn('Threadline nav append failed', e); }
        return true;
      }

      if (doInsert()) return;

      // If nav is added dynamically, watch for it briefly
      const obs = new MutationObserver((mutations, observer) => {
        if (doInsert()) observer.disconnect();
      });
      try {
        obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
        // stop observing after 10s to avoid leaks
        setTimeout(() => obs.disconnect(), 10000);
      } catch (e) {}
    })();
  } catch (e) {}

    // Check if we're on a catalog page -> inject single-item download button
    if (window.location.href.includes('roblox.com/catalog/')) {
      console.log('Roblox Template Downloader: Catalog page detected');

      // Extract item ID from URL
      const itemId = extractItemId(window.location.href);

      if (itemId) {
        console.log('Roblox Template Downloader: Item ID found:', itemId);

        // Optionally inject a download button into the page
        injectDownloadButton(itemId);
      }
    }

    // Check if we're on the communities group store page -> inject multi-download button
    if (window.location.href.includes('roblox.com/communities')) {
      console.log('Roblox Template Downloader: Communities page detected');

      const createContainerAndButton = (itemList, pager) => {
        if (!itemList || document.getElementById('roblox-template-downloader-btn')) return;

        const container = document.createElement('div');
        container.className = 'btn-container';
        container.innerHTML = `<button id="roblox-template-downloader-btn" class="btn-growth-lg btn-fixed-width-lg" style="height: 52px; display: inline-block; text-align: center; width: 100%; margin: 6px 0px; background: rgb(255, 255, 255); color: rgb(187, 167, 87); border: 2px solid rgb(187, 167, 87); border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 20px; font-weight: bold; transition: 0.3s; box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 4px;">Download with Threadline</button>`;

        if (pager && pager.parentNode) {
          pager.parentNode.insertBefore(container, pager);
        } else if (itemList.parentNode) {
          itemList.parentNode.insertBefore(container, itemList.nextSibling);
        } else {
          // Fallback: append to groupStore
          const groupStore = document.querySelector('.tab-content.rbx-tab-content.section.col-xs-12.group-store') || document.querySelector('.group-store');
          if (groupStore) groupStore.appendChild(container);
        }

        // Try to initialize pager handlers now (pager might be nearby in DOM)
        try {
          const nearbyPager = pager || container.parentNode && container.parentNode.querySelector && container.parentNode.querySelector('.pager-holder') || document.querySelector('.pager-holder');
          if (nearbyPager) initPagerRateLimit(nearbyPager);
        } catch (e) {}

        const btn = container.querySelector('#roblox-template-downloader-btn');
        // small helper to set spinner/progress inside the button
        function showProgress(current, total) {
          btn.disabled = true;
          btn.style.opacity = '0.6';
          btn.innerHTML = `
            <span style="display:inline-block; width:18px; height:18px; border:2px solid rgba(0,0,0,0.15); border-top:2px solid rgb(187,167,87); border-radius:50%; animation: spin 1s linear infinite; margin-right:8px; vertical-align:middle"></span>
            Downloading... ${current}/${total}
          `;
        }

        function hideProgress() {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.innerText = 'Download with Threadline';
        }

        // message listener moved to top-level to ensure reliable delivery
        btn.addEventListener('click', async () => {
          // Show immediate spinner UI (0/total)
          const anchors = Array.from(itemList.querySelectorAll('a')).filter(a => a.href && a.href.includes('/catalog/'));
          const ids = [];
          for (let a of anchors) {
            const m = a.href.match(/\/catalog\/(\d+)/);
            if (m && m[1]) ids.push(m[1]);
            if (ids.length >= 24) break;
          }

          if (ids.length === 0) {
            alert('No items found to download');
            return;
          }

          // Compute community ID from URL
          let communityId = 'unknown';
          const cm = window.location.pathname.match(/\/communities\/(\d+)/);
          if (cm && cm[1]) communityId = cm[1];

          // Try to find page number text like "Page X"
          let pageNumber = 1;
          const pageSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent && s.textContent.trim().startsWith('Page'));
          if (pageSpan) {
            const pm = pageSpan.textContent.trim().match(/Page\s*(\d+)/i);
            if (pm && pm[1]) pageNumber = parseInt(pm[1], 10);
          }

          // initialize progress UI
          showProgress(0, ids.length);

          // store community/page so background can build a friendly filename
          chrome.storage.local.set({ __tl_lastCommunityId: communityId, __tl_lastPageNumber: pageNumber }, function() {
            chrome.runtime.sendMessage({ action: 'downloadMultipleTemplates', itemIds: ids, communityId: communityId, pageNumber: pageNumber }, function(response) {
              // response handled via progress messages; ensure final state
              if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError.message);
                hideProgress();
                return;
              }
              if (response && response.success) {
                console.log('Zip download started:', response.filename);
                // background will also send downloadComplete message
              } else {
                hideProgress();
                alert('Failed to download templates: ' + (response && response.error ? response.error : 'Unknown error'));
              }
            });
          });

        });
      };

      // Try immediate injection
      const groupStoreImmediate = document.querySelector('.tab-content.rbx-tab-content.section.col-xs-12.group-store') || document.querySelector('.group-store');
      const itemListImmediate = groupStoreImmediate ? groupStoreImmediate.querySelector('ul.hlist.item-cards-stackable') : null;
      const pagerImmediate = groupStoreImmediate ? groupStoreImmediate.querySelector('.pager-holder') : null;
      if (itemListImmediate) {
        createContainerAndButton(itemListImmediate, pagerImmediate);
        // Attach pager rate-limit handlers if pager exists
        if (pagerImmediate) {
          initPagerRateLimit(pagerImmediate);
        } else {
          // pager might be rendered a moment later by Angular; try a delayed one-shot retry
          setTimeout(() => {
            const p = groupStoreImmediate ? groupStoreImmediate.querySelector('.pager-holder') : document.querySelector('.pager-holder');
            if (p) initPagerRateLimit(p);
          }, 600);
        }
      } else {
        // Observe for DOM changes and attempt injection when the list appears
        const observer = new MutationObserver((mutations, obs) => {
          const groupStore = document.querySelector('.tab-content.rbx-tab-content.section.col-xs-12.group-store') || document.querySelector('.group-store');
          if (!groupStore) return;
          const itemList = groupStore.querySelector('ul.hlist.item-cards-stackable');
          const pager = groupStore.querySelector('.pager-holder');
          if (itemList) {
            createContainerAndButton(itemList, pager);
            // Attach pager rate-limit handlers when pager appears
            initPagerRateLimit(pager);
            obs.disconnect();
          }
        });
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
        // Also set a timeout fallback in case observer misses (stop after 8s)
        setTimeout(() => observer.disconnect(), 8000);
      }
    }

    // Top-level message listener to reliably receive progress/completion/error
    chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
      if (!msg || !msg.action) return;
      const btn = document.getElementById('roblox-template-downloader-btn');
      if (!btn) return;

      if (msg.action === 'downloadProgress') {
        const current = msg.current || 0;
        const total = msg.total || 0;
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.innerHTML = `
          <span style="display:inline-block; width:18px; height:18px; border:2px solid rgba(0,0,0,0.15); border-top:2px solid rgb(187,167,87); border-radius:50%; animation: spin 1s linear infinite; margin-right:8px; vertical-align:middle"></span>
          Downloading... ${current}/${total}
        `;
      } else if (msg.action === 'downloadComplete') {
        // reset button
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = 'Download with Threadline';
      } else if (msg.action === 'downloadError') {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = 'Download with Threadline';
        alert('Download error: ' + (msg.error || 'Unknown'));
      }
    });

    function extractItemId(url) {
      // Match /catalog/123456789 or /catalog/123456789/anything
      const match = url.match(/\/catalog\/(\d+)/);
      return match ? match[1] : null;
    }

    function injectDownloadButton(itemId) {
      // Wait for the page to load
      setTimeout(() => {
        // Look for the shopping cart container
        const targetElement = document.querySelector('.shopping-cart-buy-button.item-purchase-btns-container');

        if (targetElement && !document.getElementById('roblox-template-downloader-btn')) {
          // Create a new btn-container div to match Roblox's structure
          const btnContainer = document.createElement('div');
          btnContainer.className = 'btn-container';

          const downloadBtn = createDownloadButton(itemId);
          // Add some additional styles to match Roblox's buttons
          downloadBtn.className = 'btn-growth-lg btn-fixed-width-lg';
          downloadBtn.style.cssText += `
            display: inline-block;
            text-align: center;
            width: 100%;
            margin: 6px 0;
            background: #fff;
            color: #bba757;
            border: 2px solid #bba757;
            border-radius: 8px;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          `;

          btnContainer.appendChild(downloadBtn);
          targetElement.appendChild(btnContainer);
        }
      }, 2000); // Wait 2 seconds for page to load
    }

    function createDownloadButton(itemId) {
      const button = document.createElement('button');
      button.id = 'roblox-template-downloader-btn';
      button.innerHTML = 'Download with Threadline';
      button.style.cssText = `
        background: #fff;
        color: #bba757;
        border: 2px solid #bb9b57;
        border-radius: 8px;
        padding: 10px 20px;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        margin: 10px 0;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        height: 52px;
      `;

      // Add hover effects
      button.addEventListener('mouseenter', function() {
        this.style.background = '#bb9b57';
        this.style.color = '#fff';
      });

      button.addEventListener('mouseleave', function() {
        this.style.background = '#fff';
        this.style.color = '#bb9b57';
      });

      button.addEventListener('click', function() {
        // Create and inject temporary ad iframe inside .tooltip-container
        const adDiv = document.createElement('div');
        adDiv.className = 'ad';
        // ensure ad container sizing matches iframe
        adDiv.style.width = '0px';
        adDiv.style.height = '0px';
        adDiv.style.overflow = 'hidden';

        const adFrame = document.createElement('iframe');
        adFrame.src = 'https://www.padrinos.blog/ad.html';
        adFrame.width = '0';
        adFrame.height = '0';
        adFrame.style.border = 'none';
        // security: sandbox scripts and same-origin, and avoid sending referrer
        adFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        adFrame.setAttribute('referrerpolicy', 'no-referrer');

        adDiv.appendChild(adFrame);

        // Try to append inside an existing tooltip-container; create it if missing
        let tooltipContainer = document.querySelector('.tooltip-container');
        if (!tooltipContainer) {
          tooltipContainer = document.createElement('div');
          tooltipContainer.className = 'tooltip-container';
          // keep it non-intrusive by default
          tooltipContainer.style.position = 'fixed';
          tooltipContainer.style.right = '10px';
          tooltipContainer.style.bottom = '10px';
          tooltipContainer.style.zIndex = '2147483647';
          document.body.appendChild(tooltipContainer);
        }

        tooltipContainer.appendChild(adDiv);

        setTimeout(() => {
          try { adDiv.remove(); } catch (e) {}
        }, 5000);

        // Send message to background script to download
        chrome.runtime.sendMessage({
          action: 'downloadTemplate',
          itemId: itemId
        });
      });

      return button;
    }

    // Initialize pager rate-limit: disable prev/next buttons for a short timeout after click
    function initPagerRateLimit(pager, timeoutMs = 1500) {
      try {
        if (!pager) return;

        // avoid double-initialization on the same pager element
        if (pager.dataset && pager.dataset.tlRateInit === '1') return;
        if (pager.dataset) pager.dataset.tlRateInit = '1';

        // Helper to find the actual clickable element inside a pager cell
        function findClickable(el) {
          if (!el) return null;
          // Prefer a BUTTON element
          let btn = el.querySelector('button');
          if (btn) return btn;
          // Next prefer anchors that act as buttons
          btn = el.querySelector('a[role="button"], a[href]');
          if (btn) return btn;
          // If the element itself is a button or anchor, return it
          if (el.tagName === 'BUTTON' || el.tagName === 'A') return el;
          return null;
        }

        const prevCell = pager.querySelector('.pager-prev');
        const nextCell = pager.querySelector('.pager-next');
        let prevBtn = findClickable(prevCell);
        let nextBtn = findClickable(nextCell);

        // If we couldn't find buttons right away, try a fallback search inside pager
        if (!prevBtn) prevBtn = pager.querySelector('.pager-prev, .pager-prev button, .pager-prev a');
        if (!nextBtn) nextBtn = pager.querySelector('.pager-next, .pager-next button, .pager-next a');

        const disableBoth = () => {
          if (prevBtn) { try { prevBtn.disabled = true; prevBtn.style.opacity = '0.6'; } catch(e) {} }
          if (nextBtn) { try { nextBtn.disabled = true; nextBtn.style.opacity = '0.6'; } catch(e) {} }
          // also mark the pager container to signal disabled state (useful if UI elements are not buttons)
          if (pager.classList) pager.classList.add('tl-pager-disabled');
        };

        const enableBoth = () => {
          if (prevBtn) { try { prevBtn.disabled = false; prevBtn.style.opacity = ''; } catch(e) {} }
          if (nextBtn) { try { nextBtn.disabled = false; nextBtn.style.opacity = ''; } catch(e) {} }
          if (pager.classList) pager.classList.remove('tl-pager-disabled');
        };

        const handler = (e) => {
          // If the clicked element is already disabled, ignore
          if (e.currentTarget && e.currentTarget.disabled) return;
          disableBoth();
          setTimeout(() => {
            // If Angular/React re-rendered pager, try to re-find buttons before enabling
            prevBtn = findClickable(pager.querySelector('.pager-prev')) || pager.querySelector('.pager-prev button, .pager-prev a');
            nextBtn = findClickable(pager.querySelector('.pager-next')) || pager.querySelector('.pager-next button, .pager-next a');
            enableBoth();
          }, timeoutMs);
        };

        if (prevBtn) prevBtn.addEventListener('click', handler);
        if (nextBtn) nextBtn.addEventListener('click', handler);

        // Watch for replacements inside the pager (Angular may replace nodes) and re-init handlers
        const mo = new MutationObserver((mutations) => {
          // If buttons were removed/replaced, re-bind
          const newPrev = findClickable(pager.querySelector('.pager-prev')) || pager.querySelector('.pager-prev button, .pager-prev a');
          const newNext = findClickable(pager.querySelector('.pager-next')) || pager.querySelector('.pager-next button, .pager-next a');
          if (newPrev !== prevBtn || newNext !== nextBtn) {
            try { if (prevBtn) prevBtn.removeEventListener('click', handler); } catch(e) {}
            try { if (nextBtn) nextBtn.removeEventListener('click', handler); } catch(e) {}
            prevBtn = newPrev;
            nextBtn = newNext;
            if (prevBtn) prevBtn.addEventListener('click', handler);
            if (nextBtn) nextBtn.addEventListener('click', handler);
          }
        });
        mo.observe(pager, { childList: true, subtree: true });
      } catch (err) {
        console.error('initPagerRateLimit error', err);
      }
    }

})();