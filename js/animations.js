/* =========================================================
   InsanAsia LMS – Animasi (page transition, scroll reveal,
   count-up angka, grafik, ripple tombol, tombol ke atas)
   Dimuat SETELAH app.js. Tidak mengubah logika halaman.
   ========================================================= */
(function () {
  'use strict';
  if (!window.App) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastPath = null;

  /* Elemen yang diberi efek muncul saat di-scroll */
  var REVEAL = [
    '.sec-head', '.cards > *', '.stats > *', '.grid2 > *', '.grid3 > *', '.grid-21 > *',
    '.feature', '.faq details', '.cta', '.footer-grid > *', '.detail-grid > *',
    '.curriculum .mod', '.batch', '.prose > *', '.filters', '.table-wrap', '.mod-block',
    '.qcard', '.app-content > .card', '.app-content > .welcome', '.app-content > .notice', '.list-item', '.empty'
  ].join(',');

  function currentPath() { return (location.hash.replace(/^#/, '') || '/').split('?')[0]; }

  /* ---------- Scroll reveal ---------- */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      el.classList.add('in');
      onVisible(el);
      // bersihkan kelas setelah selesai agar efek hover asli tetap berjalan
      var delay = parseInt(el.style.getPropertyValue('--d') || '0', 10);
      setTimeout(function () { el.classList.remove('rv', 'in', 'rv-left', 'rv-right', 'rv-zoom'); el.style.removeProperty('--d'); }, 800 + delay);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  function setupReveal(root) {
    var seen = new Set();
    root.querySelectorAll(REVEAL).forEach(function (el) {
      if (seen.has(el) || el.closest('.rv') || el.closest('.hero') || el.closest('.sidebar')) return;
      seen.add(el);
      // stagger berdasarkan urutan dalam induknya
      var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--d', Math.min(sibs, 8) * 80 + 'ms');
      el.classList.add('rv');
      var p = el.parentElement;
      if (p && (p.classList.contains('grid-21') || p.classList.contains('detail-grid'))) el.classList.add(sibs % 2 ? 'rv-right' : 'rv-left');
      if (el.classList.contains('cta')) el.classList.add('rv-zoom');
      io.observe(el);
    });
  }

  /* ---------- Saat elemen terlihat: angka, bar, grafik ---------- */
  function onVisible(el) {
    countUpIn(el);
    barsIn(el);
    el.querySelectorAll('.linechart').forEach(drawLine);
  }

  function parseNum(txt) {
    var m = /^(\D*?)(\d[\d.,]*)(.*)$/.exec(txt.trim());
    if (!m) return null;
    var raw = m[2], thousands = false, decimals = 0, val;
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) { thousands = true; val = parseFloat(raw.replace(/\./g, '')); }
    else if (/^\d{1,3}(,\d{3})+$/.test(raw)) { thousands = true; val = parseFloat(raw.replace(/,/g, '')); }
    else if (/^\d+([.,]\d+)?$/.test(raw)) { var sep = raw.match(/[.,]/); decimals = sep ? raw.split(sep[0])[1].length : 0; val = parseFloat(raw.replace(',', '.')); m.sep = sep ? sep[0] : '.'; }
    else return null;
    return { pre: m[1], suf: m[3], val: val, dec: decimals, sep: m.sep || '.', thousands: thousands };
  }
  function fmt(n, p) {
    if (p.thousands) return Math.round(n).toLocaleString('id-ID');
    return p.dec ? n.toFixed(p.dec).replace('.', p.sep) : String(Math.round(n));
  }
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var p = parseNum(el.textContent);
    if (!p || p.val === 0 || reduce) return;
    var final = el.textContent, start = null, dur = Math.min(1800, 700 + p.val * 8);
    function step(t) {
      if (!start) start = t;
      var k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = p.pre + fmt(p.val * e, p) + p.suf;
      if (k < 1) requestAnimationFrame(step); else el.textContent = final;
    }
    requestAnimationFrame(step);
  }
  function countUpIn(root) {
    if (root.matches && root.matches('.stat-v, .hero-stats b')) countUp(root);
    root.querySelectorAll('.stat-v, .hero-stats b').forEach(countUp);
  }
  function barsIn(root) {
    var host = root.matches('.progress, .hbars') ? root.parentElement : root;
    if (!host.querySelector('.progress span, .hbar-t span')) return;
    host.querySelectorAll('.hbar-t span').forEach(function (s, i) { s.style.setProperty('--d', i * 70 + 'ms'); });
    host.classList.add('anim-bars');
  }
  function drawLine(svg) {
    if (svg.classList.contains('drawn') || reduce) return;
    svg.querySelectorAll('.ln').forEach(function (ln) {
      if (!ln.getTotalLength) return;
      var L = ln.getTotalLength();
      ln.style.strokeDasharray = L; ln.style.strokeDashoffset = L;
      ln.getBoundingClientRect();
      requestAnimationFrame(function () { ln.style.strokeDashoffset = 0; });
    });
    svg.querySelectorAll('.dot').forEach(function (d, i) { d.style.setProperty('--d', 300 + i * 60 + 'ms'); });
    svg.classList.add('drawn');
  }

  /* Elemen di luar target reveal (mis. hero, header, tabel di dalam card) */
  function animateStatic(root) {
    root.querySelectorAll('.table-wrap').forEach(function (t) {
      t.querySelectorAll('tbody tr').forEach(function (tr, i) { if (i < 15) tr.style.setProperty('--d', i * 40 + 'ms'); });
      t.classList.add('anim-rows');
    });
    root.querySelectorAll('.hero, .hero-card').forEach(function (h) { setTimeout(function () { countUpIn(h); barsIn(h); }, 450); });
    root.querySelectorAll('.side-nav a').forEach(function (a, i) { a.style.animationDelay = (i * 35) + 'ms'; });
    // fallback tanpa IntersectionObserver
    if (!io) { countUpIn(root); barsIn(root); root.querySelectorAll('.linechart').forEach(drawLine); }
  }

  /* ---------- Hook ke App.render ---------- */
  var origRender = App.render;
  App.render = function (html) {
    origRender.apply(this, arguments);
    var root = document.getElementById('app'), page = root.firstElementChild;
    var path = currentPath(), isNew = path !== lastPath;
    lastPath = path;
    if (!page || reduce) return;
    if (isNew) {
      page.classList.add('page-enter');
      if (io) setupReveal(root);
      animateStatic(root);
      setTimeout(function () { page.classList.remove('page-enter'); }, 700);
    } else {
      // render ulang di halaman yang sama (filter, simpan data): langsung tampil tanpa animasi masuk
      root.querySelectorAll('.stat-v, .hero-stats b').forEach(function (el) { el.dataset.counted = '1'; });
    }
    onScroll();
  };

  /* Konten yang diganti sebagian (tab, filter) – animasikan bar & grafik baru */
  if ('MutationObserver' in window && !reduce) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1 || n.parentElement === document.getElementById('app')) return;
          if (n.querySelector && (n.querySelector('.progress, .hbars, .linechart'))) { barsIn(n); n.querySelectorAll('.linechart').forEach(drawLine); }
        });
      });
    }).observe(document.getElementById('app'), { childList: true, subtree: true });
  }

  /* ---------- Ripple pada tombol ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (reduce) return;
    var b = e.target.closest('.btn, .chip');
    if (!b || b.disabled) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2;
    var rp = document.createElement('span');
    rp.className = 'ripple';
    rp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.appendChild(rp);
    setTimeout(function () { rp.remove(); }, 650);
  });

  /* ---------- Scroll: progress bar, topbar, tombol ke atas ---------- */
  var bar = document.createElement('div'); bar.id = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
  var top = document.createElement('button'); top.id = 'to-top'; top.type = 'button'; top.setAttribute('aria-label', 'Kembali ke atas');
  top.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  top.onclick = function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); };
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(bar); document.body.appendChild(top); });

  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight, y = window.scrollY;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      top.classList.toggle('show', y > 500);
      var tb = document.querySelector('.topbar, .app-top');
      if (tb) tb.classList.toggle('scrolled', y > 10);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
