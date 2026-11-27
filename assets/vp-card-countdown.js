(function () {
  if (window.VpCardCountdown) return;

  var CARD_SELECTOR = '.card__countdown .samita-countdown';
  var syncing = false;
  var reinitTimer = null;
  var observedNodes = new WeakSet();

  function isDisplayNone(el) {
    if (!el) return true;
    var inline = el.getAttribute('style') || '';
    if (/display\s*:\s*none/i.test(inline)) return true;
    try {
      return window.getComputedStyle(el).display === 'none';
    } catch (e) {
      return false;
    }
  }

  function isRendered(el) {
    if (!el) return false;
    if (el.querySelector('.samita_countdown_timer_container, samita-countdown-timer, .samiCountdown-timer__container')) {
      return true;
    }
    return el.children.length > 0;
  }

  function callSamitaInit() {
    try {
      if (window.Samita && window.Samita.Countdowns && typeof window.Samita.Countdowns.init === 'function') {
        window.Samita.Countdowns.init();
      }
    } catch (e) {
      /* App missing or init failed — fail silently */
    }
  }

  function getReference(id) {
    return (
      document.getElementById('samita-countdown-' + id) ||
      document.querySelector('.samita-countdown[data-id="' + id + '"]')
    );
  }

  function syncDuplicates() {
    if (syncing) return;
    syncing = true;

    try {
      var cardTimers = document.querySelectorAll(CARD_SELECTOR);
      if (!cardTimers.length) return;

      var ids = {};
      for (var i = 0; i < cardTimers.length; i++) {
        var id = cardTimers[i].getAttribute('data-id');
        if (!id || ids[id]) continue;
        ids[id] = true;

        var ref = getReference(id);
        if (!ref) continue;

        var refOk = !isDisplayNone(ref) && isRendered(ref);
        if (!refOk) continue;

        var duplicates = document.querySelectorAll(
          '.card__countdown .samita-countdown[data-id="' + id + '"]'
        );
        for (var j = 0; j < duplicates.length; j++) {
          var el = duplicates[j];
          if (el === ref) continue;
          if (isDisplayNone(el)) {
            el.style.display = 'block';
          }
        }
      }
    } finally {
      syncing = false;
    }
  }

  function observeCardTimer(el) {
    if (!el || observedNodes.has(el)) return;
    observedNodes.add(el);

    var observer = new MutationObserver(function () {
      if (syncing) return;
      syncDuplicates();
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true
    });
  }

  function observeAllCardTimers(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll
      ? scope.querySelectorAll(CARD_SELECTOR)
      : [];
    for (var i = 0; i < nodes.length; i++) {
      observeCardTimer(nodes[i]);
    }
    if (scope.matches && scope.matches(CARD_SELECTOR)) {
      observeCardTimer(scope);
    }
  }

  function scheduleReinit(delay) {
    window.clearTimeout(reinitTimer);
    reinitTimer = window.setTimeout(function () {
      callSamitaInit();
      observeAllCardTimers(document);
      syncDuplicates();
      window.setTimeout(syncDuplicates, 400);
      window.setTimeout(syncDuplicates, 1200);
    }, typeof delay === 'number' ? delay : 50);
  }

  function onDomMutations(mutations) {
    var needsWork = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var node = m.addedNodes[j];
          if (node.nodeType !== 1) continue;
          if (
            (node.matches && node.matches(CARD_SELECTOR)) ||
            (node.querySelector && node.querySelector(CARD_SELECTOR))
          ) {
            needsWork = true;
            break;
          }
        }
      }
      if (needsWork) break;
    }
    if (needsWork) scheduleReinit(80);
  }

  function init() {
    observeAllCardTimers(document);
    syncDuplicates();
    scheduleReinit(200);

    var gridObserver = new MutationObserver(onDomMutations);
    gridObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('shopify:section:load', function () {
      scheduleReinit(100);
    });
  }

  window.VpCardCountdown = {
    init: init,
    sync: syncDuplicates,
    reinit: scheduleReinit
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
