/* =========================================================
   Router & bootstrap
   ========================================================= */
(function () {
  'use strict';
  var P = window.Pages;
  var ALL = ['learner', 'trainer', 'coach', 'admin', 'executive'];
  var STAFF = ['trainer', 'coach', 'admin'];

  /* [pola, handler, roles (null = publik)] */
  var routes = [
    ['/', function () { P.home(); }, null],
    ['/programs', P.programs, null],
    ['/program/:id', P.program, null],
    ['/trainers', P.trainers, null],
    ['/articles', P.articles, null],
    ['/article/:id', P.article, null],
    ['/about', P.about, null],
    ['/help', P.help, null],
    ['/verify', P.verify, null],
    ['/privacy', function () { P.legal('privacy'); }, null],
    ['/terms', function () { P.legal('terms'); }, null],
    ['/login', P.login, null],
    ['/register', P.register, null],
    ['/forgot', P.forgot, null],

    ['/dashboard', function (p, q) { P.dashboard(p, q); }, ALL],
    ['/profile', function (p, q) { P.profile(p, q); }, ALL],
    ['/notifications', function (p, q) { P.notifications(p, q); }, ALL],
    ['/certificate/:id', function (p, q) { P.certificateView(p, q); }, ALL],

    ['/my-learning', function (p, q) { P.myLearning(p, q); }, ['learner']],
    ['/learn/:pid', function (p, q) { P.classroom(p, q); }, ['learner']],
    ['/learn/:pid/:lid', function (p, q) { P.classroom(p, q); }, ['learner']],
    ['/assessment/:id', function (p, q) { P.takeAssessment(p, q); }, ['learner']],
    ['/my-assessments', function (p, q) { P.myAssessments(p, q); }, ['learner']],
    ['/results', function (p, q) { P.results(p, q); }, ['learner']],
    ['/certificates', function (p, q) { P.myCertificates(p, q); }, ['learner']],

    ['/manage/content', function (p, q) { P.manageContent(p, q); }, STAFF],
    ['/manage/content/:pid', function (p, q) { P.manageContent(p, q); }, STAFF],
    ['/manage/assessment/:id', function (p, q) { P.editQuestions(p, q); }, STAFF],
    ['/preview/:pid', function (p, q) { P.previewProgram(p, q); }, STAFF.concat(['executive'])],
    ['/grading', function (p, q) { P.grading(p, q); }, STAFF],
    ['/manage/learners', function (p, q) { P.learnersProgress(p, q); }, STAFF],
    ['/schedule', function (p, q) { P.schedule(p, q); }, ['trainer', 'coach']],
    ['/manage/classes', function (p, q) { P.manageClasses(p, q); }, ['coach', 'admin']],
    ['/reports', function (p, q) { P.reports(p, q); }, ['coach', 'admin', 'executive']],

    ['/admin/users', function (p, q) { P.adminUsers(p, q); }, ['admin']],
    ['/admin/programs', function (p, q) { P.adminPrograms(p, q); }, ['admin']],
    ['/admin/certificates', function (p, q) { P.adminCertificates(p, q); }, ['admin']],
    ['/admin/cms', function (p, q) { P.adminCMS(p, q); }, ['admin']],
    ['/admin/logs', function (p, q) { P.adminLogs(p, q); }, ['admin']],
    ['/admin/settings', function (p, q) { P.adminSettings(p, q); }, ['admin']]
  ];

  function parse() {
    var h = location.hash.replace(/^#/, '') || '/';
    var parts = h.split('?'), path = parts[0] || '/', q = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (!kv) return; var x = kv.split('='); q[decodeURIComponent(x[0])] = decodeURIComponent((x[1] || '').replace(/\+/g, ' ')); });
    return { path: path.replace(/\/+$/, '') || '/', q: q };
  }
  function match(pattern, path) {
    var a = pattern.split('/'), b = path.split('/');
    if (a.length !== b.length) return null;
    var params = {};
    for (var i = 0; i < a.length; i++) {
      if (a[i][0] === ':') params[a[i].slice(1)] = decodeURIComponent(b[i]);
      else if (a[i] !== b[i]) return null;
    }
    return params;
  }

  var busy = false, routedKey = null;
  function hashKey() { return location.hash.split('?')[0] + '|' + (location.hash.split('?')[1] || ''); }
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  /* Pindah halaman: crossfade halus (View Transitions) tanpa memutar ulang animasi */
  function smooth(fn) {
    var key = hashKey(), isNew = key !== routedKey; routedKey = key;
    if (isNew && App.booted && document.startViewTransition && !reduceMotion()) {
      App.inTransition = true;
      var t = document.startViewTransition(function () { try { fn(); } finally { App.inTransition = false; } });
      if (t) ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { if (t[k] && t[k].catch) t[k].catch(function () { }); });
    } else fn();
  }
  function route() {
    if (DB.online && DB.needsInit) return P.setup();
    if (busy) return;
    var stale = DB.refreshIfStale();
    stale.then(function (changed) { if (changed) { busy = true; try { doRoute(); } finally { busy = false; } } })
      .catch(function (e) { UI.toast(e.message, 'error'); });
    smooth(doRoute);
  }
  function doRoute() {
    UI.closeModal();
    var r = parse();
    for (var i = 0; i < routes.length; i++) {
      var params = match(routes[i][0], r.path);
      if (!params) continue;
      var roles = routes[i][2];
      if (roles) {
        var u = Auth.user();
        if (!u) { location.hash = '#/login?next=' + encodeURIComponent(location.hash); return; }
        if (roles.indexOf(u.role) === -1) { forbidden(); return; }
      }
      try { routes[i][1](params, r.q); }
      catch (err) { console.error(err); App.render(UI.publicLayout('<section class="section"><div class="container"><h2>Terjadi kesalahan</h2><p class="muted">' + UI.esc(err.message) + '</p><a class="btn btn-primary" href="#/">Beranda</a></div></section>')); }
      return;
    }
    P.notFound();
  }
  function forbidden() {
    App.render(UI.appLayout('<div class="card center"><div class="empty">' + UI.icon('lock', 36) + '<h2>Akses ditolak</h2><p>Halaman ini hanya dapat diakses oleh role tertentu. Anda masuk sebagai <b>' + UI.esc(ROLES[Auth.user().role]) + '</b>.</p><a class="btn btn-primary" href="#/dashboard">Kembali ke Dashboard</a></div></div>', { title: 'Akses Ditolak' }));
  }

  var lastKey = null;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.body.classList.remove('nav-open'); });
  var App = window.App = {
    render: function (html) {
      var root = document.getElementById('app');
      var key = location.hash.split('?')[0] + '|' + (location.hash.split('?')[1] || '');
      var fresh = key !== lastKey; lastKey = key;
      var prevScroll = window.scrollY;
      document.body.classList.remove('nav-open', 'no-scroll');
      root.innerHTML = html;
      if (fresh) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      else window.scrollTo({ top: prevScroll, left: 0, behavior: 'instant' });
      UI.animate(root, fresh, { first: !App.booted, vt: !!App.inTransition });
      var s = DB.settings();
      document.title = s.siteName + ' – ' + s.tagline;
      var fav = document.getElementById('favicon');
      if (fav) fav.href = s.logo || 'assets/favicon.svg';
      // menu mobile publik
      var burger = document.getElementById('burger');
      if (burger) {
        var setNav = function (o) {
          document.body.classList.toggle('nav-open', o);
          burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Tutup menu' : 'Buka menu');
        };
        burger.onclick = function () { setNav(!document.body.classList.contains('nav-open')); };
        var tbm = document.getElementById('tb-menu'); if (tbm) tbm.onclick = function () { setNav(!document.body.classList.contains('nav-open')); };
        var scrim = document.getElementById('navscrim'); if (scrim) scrim.onclick = function () { setNav(false); };
        UI.$$('#mainnav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
      }
      // sidebar mobile
      var ba = document.getElementById('burger-app'), sb = document.getElementById('sidebar'), ov = document.getElementById('side-overlay');
      if (ba && sb) {
        ba.onclick = function () { sb.classList.add('open'); ov.classList.add('open'); };
        var tbs = document.getElementById('tb-side'); if (tbs) tbs.onclick = function () { sb.classList.add('open'); ov.classList.add('open'); };
        UI.$$('#sidebar a').forEach(function (a) { a.addEventListener('click', function () { sb.classList.remove('open'); ov.classList.remove('open'); }); });
        ov.onclick = function () { sb.classList.remove('open'); ov.classList.remove('open'); };
      }
      UI.$$('[data-logout]').forEach(function (a) {
        a.onclick = function (e) {
          e.preventDefault();
          Auth.logout().then(function () { UI.toast('Anda telah keluar.', 'info'); if (location.hash === '#/' || location.hash === '') route(); else location.hash = '#/'; });
        };
      });
    },
    refresh: route
  };

  window.addEventListener('hashchange', route);
  function bootError(err) {
    document.getElementById('app').innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;padding:2rem;font-family:system-ui"><div style="max-width:560px;text-align:center"><h2>Tidak dapat memuat data</h2><p style="color:#5F5B6E">' + UI.esc(err.message) + '</p><button onclick="location.reload()" style="padding:.7rem 1.2rem;border-radius:10px;border:0;background:#6D28D9;color:#fff;font-weight:700;cursor:pointer">Coba lagi</button></div></div>';
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('first-load');
    DB.load().then(function () {
      route(); App.booted = true;
      setTimeout(function () { document.body.classList.remove('first-load'); }, 1600);
    }).catch(bootError);
  });
})();
