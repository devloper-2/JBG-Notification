(function () {
  'use strict';

  var VAPID = 'BL7wtWV0SrcznOLOiglS1o42Ty6g03OuimhisbgpIaRv6R6TAJiWoiJQpqcZ6Ovl9EChMbcjLR7Br6SUUHhSGyw';

  // ── Step 1: pre-register Firebase messaging SW at its correct scope ──────
  //
  // Firebase's getToken() registers firebase-messaging-sw.js at scope
  // /firebase-cloud-messaging-push-scope (NOT /). Registering the same file
  // at scope / conflicts with Flutter's self-destructing cleanup SW (which
  // unregisters scope / and forces a reload on every visit).
  //
  // By pre-registering here at the CORRECT scope, the SW is fully active
  // before the user can tap anything. When the button click calls getToken(),
  // Firebase finds the already-active SW immediately (no installation wait),
  // so PushManager.subscribe() runs while the user-gesture context is still
  // valid — the root cause of failure on mobile.
  var _swReady = null;
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    _swReady = navigator.serviceWorker
      .register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      })
      .then(function (reg) {
        if (reg.active) return reg;
        var sw = reg.installing || reg.waiting;
        if (!sw) return reg;
        return new Promise(function (resolve) {
          sw.addEventListener('statechange', function () {
            if (sw.state === 'activated') resolve(reg);
          });
        });
      })
      .catch(function (e) {
        console.warn('[JBG] SW pre-registration failed:', e);
        return null;
      });
  }

  // ── Step 2: initialise Firebase compat (isolated from Flutter's bundle) ──
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey:            'AIzaSyDxYURwnQj3z0OmDd-huEIX1w_UnxnY1oc',
      authDomain:        'jgb-codezpark.firebaseapp.com',
      projectId:         'jgb-codezpark',
      storageBucket:     'jgb-codezpark.firebasestorage.app',
      messagingSenderId: '441380081715',
      appId:             '1:441380081715:web:28657c6b6755604136d346',
    });
  }

  // ── Step 3: foreground notification helper (called by Flutter/Dart) ──────
  window.showPushNotification = function (title, body, icon) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(function (reg) {
      reg.showNotification(title, {
        body:              body,
        icon:              icon || '/icons/Icon-192.png',
        badge:             '/icons/Icon-192.png',
        vibrate:           [200, 100, 200],
        tag:               'jbg-order',
        renotify:          true,
        requireInteraction: false,
      });
    }).catch(function () {
      new Notification(title, { body: body, icon: icon || '/icons/Icon-192.png' });
    });
  };

  // ── Step 4: unified token-request function (called by Dart) ─────────────
  //
  // Returns a Promise<string|null>.
  //
  // • If permission is already 'granted' → fetch token silently, no overlay.
  // • If permission is 'default'         → show overlay; token is obtained
  //   from inside the native button click (valid user gesture on all platforms).
  // • If permission is 'denied'          → resolve null immediately.
  window._jbgGetToken = function () {
    if (!('Notification' in window) || !('PushManager' in window)) {
      return Promise.resolve(null);
    }

    if (Notification.permission === 'denied') {
      return Promise.resolve(null);
    }

    if (Notification.permission === 'granted') {
      // Silent fetch — no user gesture required since subscription already exists.
      return (_swReady || Promise.resolve(null)).then(function (swReg) {
        return firebase.messaging().getToken({
          vapidKey:                  VAPID,
          serviceWorkerRegistration: swReg || undefined,
        });
      }).then(function (t) {
        return t || null;
      }).catch(function (e) {
        console.error('[JBG] silent getToken failed:', e);
        return null;
      });
    }

    // Permission not yet asked — show overlay, resolve via button click.
    return new Promise(function (resolve) {
      window._jbgTokenResolve = resolve;
      document.getElementById('_jbg-notif-overlay').classList.add('_active');
    });
  };

  // ── Step 5: overlay button handlers ─────────────────────────────────────

  // "Allow" — this is a REAL native click → valid user gesture on every browser.
  document.getElementById('_jbg-notif-allow').addEventListener('click', async function () {
    document.getElementById('_jbg-notif-overlay').classList.remove('_active');

    function deliver(token) {
      if (window._jbgTokenResolve) {
        window._jbgTokenResolve(token || null);
        window._jbgTokenResolve = null;
      }
    }

    try {
      // _swReady is almost certainly already resolved (page loaded seconds ago).
      // If still pending, await it — it's fast and still within the gesture chain.
      var swReg = _swReady ? await _swReady : null;
      var token = await firebase.messaging().getToken({
        vapidKey:                  VAPID,
        serviceWorkerRegistration: swReg || undefined,
      });
      deliver(token);
    } catch (e) {
      console.error('[JBG] getToken in overlay failed:', e);
      deliver(null);
    }
  });

  document.getElementById('_jbg-notif-skip').addEventListener('click', function () {
    document.getElementById('_jbg-notif-overlay').classList.remove('_active');
    if (window._jbgTokenResolve) {
      window._jbgTokenResolve(null);
      window._jbgTokenResolve = null;
    }
  });

}());
