/* =========================================================
   Halaman publik: beranda, katalog, detail, trainer, artikel,
   tentang, bantuan, verifikasi, auth
   ========================================================= */
(function () {
  'use strict';
  var Pages = window.Pages = window.Pages || {};
  var esc = UI.esc, icon = UI.icon;

  function pubPrograms() { return DB.where('programs', function (p) { return p.status === 'published'; }); }
  function openClasses(pid) { return DB.where('classes', function (k) { return k.programId === pid && (k.status === 'published' || k.status === 'ongoing'); }); }
  function enrolledCount(kid) { return DB.classCount(kid); }
  function catIcon(slug) { return { copywriting: 'edit', 'digital-marketing': 'activity', 'business-development': 'chart', 'personal-skills': 'user' }[slug] || 'book'; }

  function programCard(p) {
    var cat = DB.find('categories', p.categoryId), tr = DB.find('users', p.trainerId);
    var nLes = DB.programLessons(p.id).length;
    return '<a class="card pcard hover" href="#/program/' + esc(p.id) + '">' + UI.programThumb(p) +
      '<div class="pc-body"><div class="row">' + UI.badge(cat ? cat.name : 'Umum', 'purple') + UI.badge(p.level, 'gray') + '</div>' +
      '<h3>' + esc(p.title) + '</h3><p>' + esc(p.summary) + '</p>' +
      '<div class="pc-meta"><span>' + icon('book', 14) + ' ' + nLes + ' materi</span><span>' + icon('clock', 14) + ' ' + esc(p.duration) + '</span>' + (tr ? '<span>' + icon('user', 14) + ' ' + esc(tr.name) + '</span>' : '') + '</div></div></a>';
  }
  Pages.programCard = programCard;

  /* ---------- Beranda ---------- */
  Pages.home = function () {
    var s = DB.settings();
    var progs = pubPrograms();
    var featured = progs.filter(function (p) { return p.featured; }).slice(0, 3);
    if (!featured.length) featured = progs.slice(0, 3);
    var learners = DB.countLearners();
    var certs = DB.countCertificates();
    var cats = DB.all('categories');
    var testi = DB.where('testimonials', function (t) { return t.visible; });
    var arts = DB.where('articles', function (a) { return a.status === 'published'; }).slice(-3).reverse();
    var faqs = DB.where('faqs', function (f) { return f.visible; }).slice(0, 4);

    var heroRight = s.heroImage ? '<img class="hero-img" src="' + s.heroImage + '" alt="Suasana belajar InsanAsia">' :
      '<div class="hero-card" aria-hidden="true">' +
      '<div class="hc-row"><div class="hc-ic">' + icon('play') + '</div><div class="grow"><b>Modul 3 – Rumus 4P</b><small>Lanjutkan belajar • 20 menit</small>' + UI.progressBar(64) + '</div></div>' +
      '<div class="hc-row"><div class="hc-ic">' + icon('quiz') + '</div><div><b>Kuis lulus: 92</b><small>Feedback trainer tersedia</small></div></div>' +
      '<div class="hc-row"><div class="hc-ic">' + icon('award') + '</div><div><b>E-Sertifikat terbit</b><small>Kode verifikasi tersedia</small></div></div></div>';

    var html =
      '<section class="hero"><div class="container hero-in"><div>' +
      '<div class="eyebrow">' + icon('star', 14) + ' ' + esc(s.tagline) + '</div>' +
      '<h1>' + esc(s.heroTitle) + '</h1><p class="lead">' + esc(s.heroDesc) + '</p>' +
      '<div class="row mt2"><a href="#/programs" class="btn btn-primary btn-lg">Jelajahi Pelatihan ' + icon('arrow', 16) + '</a>' +
      (s.allowRegistration !== false ? '<a href="#/register" class="btn btn-outline-w btn-lg">Daftar Sekarang</a>' : '') + '</div>' +
      '<div class="hero-stats"><div><b>' + progs.length + '</b><span>Program aktif</span></div><div><b>' + learners + '+</b><span>Peserta terdaftar</span></div><div><b>' + certs + '</b><span>Sertifikat terbit</span></div></div>' +
      '</div><div>' + heroRight + '</div></div></section>' +

      '<section class="section"><div class="container"><div class="sec-head"><div class="eyebrow">Kategori</div><h2>Pilih bidang yang ingin Anda kuasai</h2><p>Program disusun bertahap, dimulai dari keterampilan yang paling dibutuhkan pelaku UMKM.</p></div>' +
      '<div class="cards c4">' + cats.map(function (c) {
        var n = progs.filter(function (p) { return p.categoryId === c.id; }).length;
        return '<a class="card hover cat-card" href="#/programs?cat=' + esc(c.id) + '"><div class="cat-ic">' + icon(catIcon(c.slug), 22) + '</div><h3>' + esc(c.name) + '</h3><p class="muted">' + esc(c.description) + '</p><small class="muted">' + n + ' program</small></a>';
      }).join('') + '</div></div></section>' +

      '<section class="section alt"><div class="container"><div class="row between sec-head" style="max-width:none"><div><div class="eyebrow">Program Unggulan</div><h2>Mulai dari program favorit peserta</h2></div><a href="#/programs" class="btn btn-ghost">Lihat semua program ' + icon('arrow', 16) + '</a></div>' +
      '<div class="cards">' + (featured.map(programCard).join('') || UI.empty('Belum ada program dipublikasikan.')) + '</div></div></section>' +

      '<section class="section dark"><div class="container"><div class="sec-head center"><div class="eyebrow">Keunggulan</div><h2>Kenapa belajar di ' + esc(s.siteName) + '?</h2><p>Belajar praktis yang langsung bisa diterapkan untuk usaha dan karier Anda.</p></div>' +
      '<div class="cards c4">' + [['layers', 'Materi terstruktur', 'Modul bertahap yang mudah dipahami, dari dasar hingga praktik.'], ['edit', 'Latihan langsung', 'Tugas praktik yang dapat langsung diterapkan pada produk Anda.'], ['users', 'Feedback trainer', 'Trainer praktisi memberikan masukan personal pada hasil kerja Anda.'], ['chart', 'Progres terpantau', 'Pantau progres, nilai, dan sertifikat melalui akun peserta.']].map(function (f) {
        return '<div class="feature"><div class="cat-ic">' + icon(f[0], 22) + '</div><div><h3>' + f[1] + '</h3><p>' + f[2] + '</p></div></div>';
      }).join('') + '</div></div></section>' +

      (testi.length ? '<section class="section"><div class="container"><div class="sec-head center"><div class="eyebrow">Testimoni</div><h2>Cerita dari para alumni</h2></div><div class="cards">' +
        testi.map(function (t) { return '<div class="card quote"><div class="row" style="color:var(--p);gap:.15rem">' + icon('star', 16) + icon('star', 16) + icon('star', 16) + icon('star', 16) + icon('star', 16) + '</div><p class="mt">"' + esc(t.text) + '"</p><div class="who">' + UI.avatar({ name: t.name }, 40) + '<div><b>' + esc(t.name) + '</b><small>' + esc(t.role) + '</small></div></div></div>'; }).join('') +
        '</div></div></section>' : '') +

      (arts.length ? '<section class="section alt"><div class="container"><div class="row between sec-head" style="max-width:none"><div><div class="eyebrow">Artikel & Insight</div><h2>Bacaan untuk mengembangkan usaha</h2></div><a href="#/articles" class="btn btn-ghost">Semua artikel</a></div><div class="cards">' +
        arts.map(articleCard).join('') + '</div></div></section>' : '') +

      (faqs.length ? '<section class="section"><div class="container grid2" style="align-items:start"><div><div class="eyebrow">FAQ</div><h2>Pertanyaan yang sering diajukan</h2><p class="muted">Belum menemukan jawaban? Kunjungi halaman bantuan atau hubungi kami.</p><a href="#/help" class="btn btn-ghost">Pusat Bantuan</a></div><div class="faq">' +
        faqs.map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div></div></section>' : '') +

      '<section class="section" style="padding-top:0"><div class="container"><div class="cta"><div><h2>Siap mengembangkan skill Anda?</h2><p>Buat akun gratis dan mulai belajar hari ini.</p></div><div class="row"><a href="#/register" class="btn btn-dark btn-lg">Buat Akun Gratis</a><a href="#/programs" class="btn btn-outline-w btn-lg">Lihat Program</a></div></div></div></section>';
    App.render(UI.publicLayout(html, 'home'));
  };

  function articleCard(a) {
    var au = DB.find('users', a.authorId);
    return '<a class="card pcard hover" href="#/article/' + esc(a.id) + '">' + (a.cover ? '<div class="thumb" style="background-image:url(' + a.cover + ')"></div>' : '<div class="thumb gen" style="--tc:#4C1D95"><span>Artikel</span><b>' + esc(a.title) + '</b></div>') +
      '<div class="pc-body"><h3>' + esc(a.title) + '</h3><p>' + esc(a.excerpt) + '</p><div class="pc-meta"><span>' + icon('cal', 14) + ' ' + UI.fmtDate(a.date) + '</span>' + (au ? '<span>' + icon('user', 14) + ' ' + esc(au.name) + '</span>' : '') + '</div></div></a>';
  }

  function pageHero(title, desc, crumbs) {
    return '<section class="page-hero"><div class="container">' + (crumbs ? '<div class="crumbs">' + crumbs + '</div>' : '') + '<h1>' + esc(title) + '</h1>' + (desc ? '<p>' + esc(desc) + '</p>' : '') + '</div></section>';
  }
  Pages.pageHero = pageHero;

  /* ---------- Katalog ---------- */
  Pages.programs = function (params, q) {
    var state = { q: q.q || '', cat: q.cat || '', level: q.level || '' };
    var cats = DB.all('categories');
    var html = pageHero('Program Pelatihan', 'Temukan program yang sesuai dengan kebutuhan pengembangan diri dan usaha Anda.', '<a href="#/">Beranda</a> / Program') +
      '<section class="section"><div class="container">' +
      '<div class="filters"><div class="search">' + icon('search', 16) + '<label class="sr" for="fq">Cari program</label><input id="fq" type="search" placeholder="Cari program, topik, atau trainer…" value="' + esc(state.q) + '"></div>' +
      '<label class="sr" for="flevel">Level</label><select id="flevel" style="width:auto"><option value="">Semua level</option><option>Pemula</option><option>Menengah</option><option>Lanjutan</option></select></div>' +
      '<div class="chips mb" id="fcats"><button class="chip" data-cat="">Semua</button>' + cats.map(function (c) { return '<button class="chip" data-cat="' + esc(c.id) + '">' + esc(c.name) + '</button>'; }).join('') + '</div>' +
      '<p class="muted" id="fcount"></p><div class="cards" id="plist"></div></div></section>';
    App.render(UI.publicLayout(html, 'programs'));
    UI.$('#flevel').value = state.level;
    function draw() {
      var term = state.q.toLowerCase();
      var list = pubPrograms().filter(function (p) {
        var tr = DB.find('users', p.trainerId);
        var hay = (p.title + ' ' + p.summary + ' ' + p.description + ' ' + (tr ? tr.name : '')).toLowerCase();
        return (!term || hay.indexOf(term) > -1) && (!state.cat || p.categoryId === state.cat) && (!state.level || p.level === state.level);
      });
      UI.$('#plist').innerHTML = list.map(programCard).join('') || UI.empty('Tidak ada program yang cocok dengan pencarian Anda.');
      UI.$('#fcount').textContent = list.length + ' program ditemukan';
      UI.$$('#fcats .chip').forEach(function (c) { c.classList.toggle('on', c.dataset.cat === state.cat); });
    }
    UI.$('#fq').addEventListener('input', function (e) { state.q = e.target.value; draw(); });
    UI.$('#flevel').addEventListener('change', function (e) { state.level = e.target.value; draw(); });
    UI.$('#fcats').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b) { state.cat = b.dataset.cat; draw(); } });
    draw();
  };

  /* ---------- Detail program ---------- */
  Pages.program = function (params) {
    var p = DB.find('programs', params.id), u = Auth.user();
    if (!p || (p.status !== 'published' && !(u && ['admin', 'coach', 'trainer'].indexOf(u.role) > -1))) return Pages.notFound();
    var cat = DB.find('categories', p.categoryId), tr = DB.find('users', p.trainerId);
    var mods = DB.modulesOf(p.id), assess = DB.assessmentsOf(p.id);
    var en = u ? DB.enrollment(u.id, p.id) : null;
    var classes = openClasses(p.id);
    var typeIc = { text: 'text', pdf: 'file', video: 'video', link: 'link' };

    var batches = classes.length ? classes.map(function (k) {
      var n = enrolledCount(k.id), full = n >= k.capacity;
      return '<div class="batch ' + (full ? 'full' : '') + '"><div class="row between"><b>' + esc(k.name) + '</b>' + UI.statusBadge(k.status) + '</div>' +
        '<dl class="kv mt"><dt>Jadwal</dt><dd>' + UI.fmtDate(k.startAt) + ' – ' + UI.fmtDate(k.endAt) + '</dd><dt>Format</dt><dd>' + esc(k.mode) + '</dd><dt>Lokasi</dt><dd>' + esc(k.location || '-') + '</dd><dt>Kuota</dt><dd>' + n + ' / ' + k.capacity + ' peserta</dd></dl>' +
        (en ? '' : '<button class="btn btn-primary btn-sm mt" style="width:100%" data-enroll="' + esc(k.id) + '"' + (full ? ' disabled' : '') + '>' + (full ? 'Kuota Penuh' : 'Daftar Kelas Ini') + '</button>') + '</div>';
    }).join('') : '<p class="muted">Belum ada jadwal kelas yang dibuka. Pantau terus halaman ini.</p>';

    var side = '<div class="card sticky">' +
      (en ? '<div class="notice mb">' + icon('check', 16) + ' Anda sudah terdaftar di program ini.</div><a class="btn btn-primary" style="width:100%" href="#/learn/' + esc(p.id) + '">Masuk Ruang Kelas</a>' :
        '<h3>Jadwal & Pendaftaran</h3>' + batches) +
      '<dl class="kv mt"><dt>Level</dt><dd>' + esc(p.level) + '</dd><dt>Durasi</dt><dd>' + esc(p.duration) + '</dd><dt>Biaya</dt><dd>' + (p.isFree !== false ? 'Gratis' : esc(p.price || 'Hubungi kami')) + '</dd><dt>Sertifikat</dt><dd>E-sertifikat + kode verifikasi</dd></dl></div>';

    var html = pageHero(p.title, p.summary, '<a href="#/">Beranda</a> / <a href="#/programs">Program</a> / ' + esc(cat ? cat.name : '')) +
      '<section class="section"><div class="container detail-grid"><div>' +
      (p.status !== 'published' ? '<div class="notice warn mb">Pratinjau: program ini berstatus <b>' + esc(p.status) + '</b> dan belum tampil untuk publik.</div>' : '') +
      UI.programThumb(p, 'big') +
      '<h2 class="mt2">Tentang program</h2><p>' + esc(p.description) + '</p>' +
      '<h2 class="mt2">Tujuan belajar</h2><ul class="objectives">' + (p.objectives || []).map(function (o) { return '<li>' + icon('check') + '<span>' + esc(o) + '</span></li>'; }).join('') + '</ul>' +
      '<h2 class="mt2">Kurikulum</h2><div class="curriculum">' + (mods.map(function (m) {
        var ls = DB.lessonsOf(m.id);
        var qa = assess.filter(function (a) { return a.moduleId === m.id; });
        return '<div class="mod"><div class="mod-h"><span>' + esc(m.title) + '</span><small class="muted">' + ls.length + ' materi</small></div>' +
          ls.map(function (l) { return '<div class="les">' + icon(typeIc[l.type]) + '<span class="grow">' + esc(l.title) + '</span><small class="muted">' + esc(l.duration || '') + '</small></div>'; }).join('') +
          qa.map(function (a) { return '<div class="les">' + icon(a.type === 'assignment' ? 'task' : 'quiz') + '<span class="grow">' + esc(a.title) + '</span>' + UI.badge(a.type === 'assignment' ? 'Tugas' : 'Kuis', 'purple') + '</div>'; }).join('') + '</div>';
      }).join('') || '<p class="muted">Kurikulum sedang disusun.</p>') +
      assess.filter(function (a) { return !a.moduleId; }).map(function (a) { return '<div class="mod"><div class="les">' + icon('quiz') + '<span class="grow"><b>' + esc(a.title) + '</b></span>' + UI.badge({ pretest: 'Pretest', posttest: 'Post-test', quiz: 'Kuis', assignment: 'Tugas' }[a.type], 'dark') + '</div></div>'; }).join('') + '</div>' +
      (tr ? '<h2 class="mt2">Trainer</h2><div class="card flat row" style="align-items:flex-start">' + UI.avatar(tr, 64) + '<div class="grow"><h3 style="margin:0">' + esc(tr.name) + '</h3><p class="muted" style="margin:.2rem 0 .5rem">' + esc(tr.expertise) + '</p><p style="margin:0">' + esc(tr.bio) + '</p></div></div>' : '') +
      '</div><aside>' + side + '</aside></div></section>';
    App.render(UI.publicLayout(html, 'programs'));
    UI.$$('[data-enroll]').forEach(function (b) { b.onclick = function () { Pages.enroll(p.id, b.dataset.enroll); }; });
  };

  Pages.enroll = function (pid, kid) {
    var u = Auth.user();
    if (!u) { UI.toast('Silakan masuk atau buat akun terlebih dahulu.', 'info'); location.hash = '#/login?next=' + encodeURIComponent('#/program/' + pid); return; }
    if (u.role !== 'learner') { UI.toast('Pendaftaran kelas hanya untuk akun Learner (peserta).', 'error'); return; }
    var k = DB.find('classes', kid), p = DB.find('programs', pid);
    if (DB.enrollment(u.id, pid)) return location.hash = '#/learn/' + pid;
    if (enrolledCount(kid) >= k.capacity) return UI.toast('Kuota kelas sudah penuh.', 'error');
    UI.modal({
      title: 'Konfirmasi Pendaftaran',
      body: '<p>Anda akan mendaftar ke:</p><div class="card flat"><b>' + esc(p.title) + '</b><p class="muted" style="margin:0">' + esc(k.name) + ' • ' + UI.fmtDate(k.startAt) + ' – ' + UI.fmtDate(k.endAt) + '</p></div><p class="mt muted">Dengan mendaftar, Anda menyetujui ketentuan penggunaan platform.</p>',
      footer: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-primary" id="do-enroll">Konfirmasi Daftar</button>',
      onOpen: function (w) {
        w.querySelector('#do-enroll').onclick = function () {
          DB.bumpClass(kid);
          DB.insert('enrollments', { userId: u.id, classId: kid, programId: pid, status: 'active', enrolledAt: new Date().toISOString(), rating: null, review: '' });
          DB.notify(u.id, 'Pendaftaran berhasil: ' + p.title + ' (' + k.name + ').', '#/learn/' + pid);
          if (k.trainerId) DB.notify(k.trainerId, u.name + ' mendaftar di kelas ' + p.title + '.', '#/manage/learners');
          DB.log(u.name + ' mendaftar kelas ' + p.title + ' – ' + k.name, 'enrollment');
          UI.closeModal(); UI.toast('Pendaftaran berhasil! Selamat belajar.');
          location.hash = '#/learn/' + pid;
        };
      }
    });
  };

  /* ---------- Trainer ---------- */
  Pages.trainers = function () {
    var trs = DB.where('users', function (u) { return (u.role === 'trainer' || u.role === 'coach') && u.status === 'active'; });
    var html = pageHero('Trainer Kami', 'Belajar langsung dari praktisi yang berpengalaman di bidangnya.', '<a href="#/">Beranda</a> / Trainer') +
      '<section class="section"><div class="container"><div class="cards">' + trs.map(function (t) {
        var ps = pubPrograms().filter(function (p) { return p.trainerId === t.id; });
        return '<div class="card"><div class="row">' + UI.avatar(t, 64) + '<div><h3 style="margin:0">' + esc(t.name) + '</h3>' + UI.badge(ROLES[t.role], 'purple') + '</div></div>' +
          '<p class="mt muted" style="font-weight:600">' + esc(t.expertise || '') + '</p><p>' + esc(t.bio || '') + '</p>' +
          (ps.length ? '<small class="muted">Mengajar:</small><div class="row mt" style="gap:.4rem">' + ps.map(function (p) { return '<a class="badge gray" href="#/program/' + esc(p.id) + '">' + esc(p.title) + '</a>'; }).join('') + '</div>' : '') + '</div>';
      }).join('') + '</div></div></section>';
    App.render(UI.publicLayout(html, 'trainers'));
  };

  /* ---------- Artikel ---------- */
  Pages.articles = function () {
    var arts = DB.where('articles', function (a) { return a.status === 'published'; }).slice().reverse();
    App.render(UI.publicLayout(pageHero('Artikel & Insight', 'Konten edukasi seputar copywriting, pemasaran, dan pengembangan UMKM.', '<a href="#/">Beranda</a> / Artikel') +
      '<section class="section"><div class="container"><div class="cards">' + (arts.map(articleCard).join('') || UI.empty('Belum ada artikel.')) + '</div></div></section>', 'articles'));
  };
  Pages.article = function (params) {
    var a = DB.find('articles', params.id);
    if (!a || a.status !== 'published') return Pages.notFound();
    var au = DB.find('users', a.authorId);
    App.render(UI.publicLayout(pageHero(a.title, a.excerpt, '<a href="#/">Beranda</a> / <a href="#/articles">Artikel</a>') +
      '<section class="section"><div class="container"><p class="muted">' + icon('cal', 14) + ' ' + UI.fmtDate(a.date) + (au ? ' • ' + esc(au.name) : '') + '</p>' +
      (a.cover ? '<img src="' + a.cover + '" alt="" style="border-radius:14px;margin-bottom:1.5rem;max-height:420px;width:100%;object-fit:cover">' : '') +
      '<article class="prose">' + UI.md(a.body) + '</article><a href="#/articles" class="btn btn-ghost mt2">← Kembali ke artikel</a></div></section>', 'articles'));
  };

  /* ---------- Tentang ---------- */
  Pages.about = function () {
    var s = DB.settings();
    var mission = (s.mission || '').split('\n').filter(Boolean);
    var html = pageHero('Tentang ' + s.siteName, s.tagline, '<a href="#/">Beranda</a> / Tentang') +
      '<section class="section"><div class="container grid2" style="align-items:start"><div><div class="eyebrow">Profil Lembaga</div><h2>' + esc(s.siteFullName || s.siteName) + '</h2><div class="prose">' + UI.md(s.profile) + '</div></div>' +
      '<div class="card"><h3>' + icon('star') + ' Visi</h3><p>' + esc(s.vision) + '</p><h3 class="mt">' + icon('layers') + ' Misi</h3><ul class="objectives">' + mission.map(function (m) { return '<li>' + icon('check') + '<span>' + esc(m) + '</span></li>'; }).join('') + '</ul></div></div></section>' +
      '<section class="section alt"><div class="container"><div class="sec-head"><h2>Hubungi kami</h2></div><div class="cards c4">' +
      [['mail', 'Email', '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>'], ['phone', 'Telepon', esc(s.phone)], ['phone', 'WhatsApp', s.whatsapp ? '<a target="_blank" rel="noopener" href="https://wa.me/' + esc(String(s.whatsapp).replace(/\D/g, '')) + '">+' + esc(String(s.whatsapp).replace(/\D/g, '')) + '</a>' : '-'], ['pin', 'Alamat', esc(s.address)]].map(function (c) {
        return '<div class="card flat"><div class="cat-ic">' + icon(c[0], 20) + '</div><h3 class="mt">' + c[1] + '</h3><p style="margin:0">' + c[2] + '</p></div>';
      }).join('') + '</div></div></section>';
    App.render(UI.publicLayout(html, 'about'));
  };

  /* ---------- Bantuan ---------- */
  Pages.help = function () {
    var s = DB.settings(), u = Auth.user();
    var faqs = DB.where('faqs', function (f) { return f.visible; });
    var html = pageHero('Pusat Bantuan', 'FAQ, panduan penggunaan, dan kanal bantuan.', '<a href="#/">Beranda</a> / Bantuan') +
      '<section class="section"><div class="container grid-21"><div><h2>Pertanyaan Umum</h2><div class="faq">' + faqs.map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('') + '</div>' +
      '<h2 class="mt2">Panduan Singkat</h2><div class="cards">' + [['Daftar akun', 'Klik "Daftar", isi data diri, dan akun peserta langsung aktif.'], ['Ikuti kelas', 'Pilih program → pilih batch → konfirmasi pendaftaran.'], ['Belajar & evaluasi', 'Selesaikan materi, kuis, dan tugas di ruang kelas.'], ['Dapatkan sertifikat', 'Sertifikat terbit otomatis setelah syarat kelulusan terpenuhi.']].map(function (g, i) {
        return '<div class="card flat"><div class="cat-ic"><b>' + (i + 1) + '</b></div><h3 class="mt">' + g[0] + '</h3><p class="muted" style="margin:0">' + g[1] + '</p></div>';
      }).join('') + '</div></div>' +
      '<div class="card sticky"><h3>Kirim pertanyaan</h3><form id="contact" class="form-1" novalidate>' +
      UI.fieldHTML({ name: 'name', label: 'Nama', required: true, value: u ? u.name : '' }) + UI.fieldHTML({ name: 'email', label: 'Email', type: 'email', required: true, value: u ? u.email : '' }) +
      UI.fieldHTML({ name: 'message', label: 'Pesan', type: 'textarea', required: true, rows: 4 }) + '<button class="btn btn-primary">Kirim Pesan</button></form>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:1.3rem 0"><p style="margin:.2rem 0">' + icon('mail', 14) + ' ' + esc(s.email) + '</p><p style="margin:.2rem 0">' + icon('phone', 14) + ' ' + esc(s.phone) + '</p><p class="muted" style="margin:.2rem 0">' + icon('clock', 14) + ' ' + esc(s.hours || '') + '</p></div></div></section>';
    App.render(UI.publicLayout(html, 'help'));
    UI.$('#contact').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      if (!f.checkValidity()) { UI.$$('input,textarea', f).forEach(function (i) { i.closest('.field').classList.toggle('invalid', !i.checkValidity()); }); return UI.toast('Lengkapi formulir dengan benar.', 'error'); }
      var d = DB.data; d.messages = d.messages || [];
      d.messages.unshift({ id: DB.uid('msg'), name: f.name.value, email: f.email.value, message: f.message.value, date: new Date().toISOString(), read: false });
      DB.save(); DB.notifyRole(['admin'], 'Pesan bantuan baru dari ' + f.name.value, '#/admin/cms?tab=messages');
      f.reset(); UI.toast('Pesan terkirim. Tim kami akan segera menghubungi Anda.');
    });
  };

  /* ---------- Verifikasi sertifikat ---------- */
  Pages.verify = function (params, q) {
    var code = (q.code || '').trim();
    var res = '';
    if (code && DB.online && !q._r) {
      App.render(UI.publicLayout(pageHero('Verifikasi Sertifikat', 'Memeriksa kode…') + '<section class="section"><div class="container"><p class="muted">Memeriksa…</p></div></section>', ''));
      DB.verify(code).then(function (r) { Pages._verifyRes = r || false; Pages.verify(params, Object.assign({}, q, { _r: 1 })); })
        .catch(function (e) { UI.toast(e.message, 'error'); Pages._verifyRes = false; Pages.verify(params, Object.assign({}, q, { _r: 1 })); });
      return;
    }
    if (code && DB.online) {
      var vr = Pages._verifyRes;
      res = vr ? '<div class="card mt" style="border-color:var(--green)"><div class="row">' + UI.badge('✓ Sertifikat Valid', 'green') + '</div><dl class="kv mt"><dt>Nama</dt><dd>' + esc(vr.name || '-') + '</dd><dt>Program</dt><dd>' + esc(vr.program || '-') + '</dd><dt>Nomor</dt><dd>' + esc(vr.number) + '</dd><dt>Kode</dt><dd>' + esc(vr.code) + '</dd><dt>Diterbitkan</dt><dd>' + UI.fmtDate(vr.issuedAt) + '</dd></dl></div>'
        : '<div class="card mt" style="border-color:var(--red)">' + UI.badge('Tidak ditemukan', 'red') + '<p class="mt" style="margin-bottom:0">Kode "' + esc(code) + '" tidak terdaftar. Periksa kembali penulisan kode.</p></div>';
    } else if (code) {
      var c = DB.all('certificates').find(function (x) { return x.code.toUpperCase() === code.toUpperCase() || x.number.toUpperCase() === code.toUpperCase(); });
      if (c) {
        var u = DB.find('users', c.userId), p = DB.find('programs', c.programId);
        res = '<div class="card mt" style="border-color:var(--green)"><div class="row">' + UI.badge('✓ Sertifikat Valid', 'green') + '</div><dl class="kv mt"><dt>Nama</dt><dd>' + esc(u ? u.name : '-') + '</dd><dt>Program</dt><dd>' + esc(p ? p.title : '-') + '</dd><dt>Nomor</dt><dd>' + esc(c.number) + '</dd><dt>Kode</dt><dd>' + esc(c.code) + '</dd><dt>Diterbitkan</dt><dd>' + UI.fmtDate(c.issuedAt) + '</dd></dl></div>';
      } else res = '<div class="card mt" style="border-color:var(--red)">' + UI.badge('Tidak ditemukan', 'red') + '<p class="mt" style="margin-bottom:0">Kode "' + esc(code) + '" tidak terdaftar. Periksa kembali penulisan kode.</p></div>';
    }
    App.render(UI.publicLayout(pageHero('Verifikasi Sertifikat', 'Masukkan kode verifikasi atau nomor sertifikat untuk memeriksa keasliannya.', '<a href="#/">Beranda</a> / Verifikasi') +
      '<section class="section"><div class="container" style="max-width:640px"><form id="vf" class="row"><label class="sr" for="vcode">Kode</label><input id="vcode" class="grow" style="flex:1" placeholder="Contoh: IA-DEMO-2026" value="' + esc(code) + '" required><button class="btn btn-primary">Verifikasi</button></form>' + res + '<p class="muted mt">Coba kode contoh: <code>IA-DEMO-2026</code></p></div></section>', ''));
    UI.$('#vf').onsubmit = function (e) { e.preventDefault(); location.hash = '#/verify?code=' + encodeURIComponent(UI.$('#vcode').value.trim()); };
  };

  Pages.legal = function (kind) {
    var s = DB.settings();
    var privacy = '## Data yang kami kumpulkan\nNama, email, nomor telepon, serta aktivitas belajar (progres, nilai, tugas) untuk keperluan penyelenggaraan pelatihan.\n\n## Penggunaan data\nData digunakan untuk mengelola akun, kelas, penilaian, dan sertifikat. Data pribadi hanya ditampilkan sesuai kebutuhan operasional.\n\n## Keamanan\nKata sandi disimpan dalam bentuk hash. Pada versi produksi, seluruh komunikasi menggunakan HTTPS.\n\n## Hubungi kami\nPermintaan terkait data pribadi dapat dikirim ke ' + s.email + '.';
    var terms = '## Akun\nPengguna bertanggung jawab menjaga kerahasiaan kata sandi.\n\n## Penggunaan materi\nMateri pelatihan hanya untuk keperluan belajar pribadi dan tidak boleh disebarluaskan tanpa izin.\n\n## Sertifikat\nSertifikat diterbitkan setelah peserta memenuhi syarat kelulusan program.\n\n## Perubahan\n' + s.siteName + ' dapat memperbarui ketentuan ini sewaktu-waktu.';
    App.render(UI.publicLayout(pageHero(kind === 'privacy' ? 'Kebijakan Privasi' : 'Ketentuan Penggunaan', '') + '<section class="section"><div class="container prose">' + UI.md(kind === 'privacy' ? privacy : terms) + '</div></section>', ''));
  };

  /* ---------- Setup database online (sekali saja) ---------- */
  Pages.setup = function () {
    App.render('<div class="auth"><div class="auth-side">' + UI.logoHTML(DB.settings(), true) + '<div><h2>Database terhubung!</h2><p>Website sudah tersambung ke Supabase. Langkah terakhir: isi database dengan data awal.</p></div><small style="color:#8F88A6">Langkah ini hanya dilakukan sekali.</small></div>' +
      '<div class="auth-form"><div class="auth-box"><h1>Isi Data Awal</h1><p class="muted">Database Anda masih kosong. Klik tombol di bawah untuk membuat 5 akun demo, program Copywriting for UMKM beserta materi, kuis, artikel, FAQ, dan pengaturan website.</p>' +
      '<div class="notice mb">' + icon('lock', 16) + ' Setelah selesai, <b>segera ganti kata sandi akun demo</b> (terutama <b>Adm</b>) melalui menu Profil & Akun, karena kata sandi demo diketahui umum.</div>' +
      '<button class="btn btn-primary btn-lg" id="doinit" style="width:100%">Isi Data Awal Sekarang</button><div id="ierr" class="err mt" role="alert"></div></div></div></div>');
    UI.$('#doinit').onclick = function () {
      var b = this; b.disabled = true; b.textContent = 'Memproses… (±10 detik)';
      DB.initOnline().then(function () {
        UI.toast('Database berhasil diisi. Silakan masuk dengan akun Adm.');
        location.hash = '#/login'; App.refresh();
      }).catch(function (e) { b.disabled = false; b.textContent = 'Coba Lagi'; UI.$('#ierr').textContent = e.message; });
    };
  };

  Pages.notFound = function () {
    App.render(UI.publicLayout('<section class="section"><div class="container center"><h1>404</h1><p class="muted">Halaman tidak ditemukan atau Anda tidak memiliki akses.</p><a href="#/" class="btn btn-primary">Kembali ke Beranda</a></div></section>', ''));
  };

  /* ---------- Auth pages ---------- */
  function authShell(form) {
    var s = DB.settings();
    return '<div class="auth"><div class="auth-side">' + UI.logoHTML(s, true) + '<div><div class="eyebrow" style="color:#C4B5FD">' + esc(s.tagline) + '</div><h2>Belajar keterampilan praktis untuk usaha dan karier Anda.</h2><p>Materi terstruktur, latihan langsung, feedback trainer, dan e-sertifikat — semuanya dalam satu platform.</p></div><small style="color:#8F88A6">© ' + new Date().getFullYear() + ' ' + esc(s.siteName) + '</small></div>' +
      '<div class="auth-form"><div class="auth-box">' + form + '</div></div></div>';
  }

  Pages.login = function (params, q) {
    if (Auth.user()) return (location.hash = '#/dashboard');
    var html = authShell('<a href="#/" class="muted" style="font-size:.88rem">← Kembali ke beranda</a><h1 class="mt">Masuk ke akun Anda</h1><p class="muted">Gunakan username atau email yang terdaftar.</p>' +
      '<form id="lf" class="form-1" novalidate>' + UI.fieldHTML({ name: 'identity', label: 'Username atau Email', required: true, placeholder: 'Username atau email Anda' }) +
      '<div class="field" data-field="password"><label for="f_password">Kata sandi <span class="req">*</span></label><div style="position:relative"><input type="password" id="f_password" name="password" required autocomplete="current-password"><button type="button" class="icon-btn" id="togglepw" aria-label="Tampilkan kata sandi" style="position:absolute;right:2px;top:1px">' + icon('eye') + '</button></div><small class="err"></small></div>' +
      '<div class="row between"><label class="row" style="gap:.4rem;font-size:.88rem"><input type="checkbox" name="remember"> Ingat saya</label><a href="#/forgot" style="font-size:.88rem">Lupa kata sandi?</a></div>' +
      '<div id="lerr" class="err" role="alert"></div><button class="btn btn-primary btn-lg">Masuk</button></form>' +
      '<p class="center mt">Belum punya akun? <a href="#/register"><b>Daftar sebagai peserta</b></a></p>');
    App.render(html);
    var f = UI.$('#lf');
    UI.$('#togglepw').onclick = function () { var i = UI.$('#f_password'); i.type = i.type === 'password' ? 'text' : 'password'; };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!f.identity.value.trim() || !f.password.value) { UI.$('#lerr').textContent = 'Username dan kata sandi wajib diisi.'; return; }
      var btn = f.querySelector('button.btn-primary'); btn.disabled = true; btn.textContent = 'Memproses…';
      Auth.login(f.identity.value, f.password.value, f.remember.checked).then(function (r) {
        btn.disabled = false; btn.textContent = 'Masuk';
        if (!r.ok) { UI.$('#lerr').textContent = r.msg; return; }
        UI.toast('Selamat datang, ' + r.user.name + '!');
        location.hash = q.next ? decodeURIComponent(q.next) : '#/dashboard';
      });
    });
  };

  Pages.register = function () {
    if (Auth.user()) return (location.hash = '#/dashboard');
    var s = DB.settings();
    if (s.allowRegistration === false) {
      return App.render(authShell('<h1>Pendaftaran ditutup</h1><p class="muted">Pendaftaran akun baru sedang ditutup sementara oleh admin. Silakan hubungi ' + esc(s.email) + '.</p><a href="#/login" class="btn btn-primary">Masuk</a>'));
    }
    var fields = [
      { name: 'name', label: 'Nama lengkap', required: true, full: true },
      { name: 'username', label: 'Username', required: true, help: 'Huruf, angka, titik, atau garis bawah (3–20 karakter).' },
      { name: 'phone', label: 'No. WhatsApp', type: 'tel', placeholder: '08xxxxxxxxxx' },
      { name: 'email', label: 'Email', type: 'email', required: true, full: true },
      { name: 'business', label: 'Nama usaha / pekerjaan (opsional)', full: true },
      { name: 'password', label: 'Kata sandi', type: 'password', required: true, minlength: 8, help: 'Minimal 8 karakter, mengandung huruf dan angka.' },
      { name: 'password2', label: 'Ulangi kata sandi', type: 'password', required: true },
      { name: 'agree', label: 'Saya menyetujui Ketentuan Penggunaan dan Kebijakan Privasi', type: 'checkbox' }
    ];
    App.render(authShell('<a href="#/" class="muted" style="font-size:.88rem">← Kembali ke beranda</a><h1 class="mt">Buat akun peserta</h1><p class="muted">Gratis. Setelah mendaftar, Anda bisa langsung mengikuti kelas.</p>' +
      '<form id="rf" class="form-grid" novalidate>' + fields.map(UI.fieldHTML).join('') + '<div class="field full"><div id="rerr" class="err" role="alert"></div><button class="btn btn-primary btn-lg">Daftar Sekarang</button></div></form>' +
      '<p class="center mt">Sudah punya akun? <a href="#/login"><b>Masuk</b></a></p>'));
    var f = UI.$('#rf');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = UI.readForm(f, fields), errs = {};
      if (!v.name) errs.name = 'Nama wajib diisi.';
      if (!/^[A-Za-z0-9._]{3,20}$/.test(v.username)) errs.username = 'Username 3–20 karakter (huruf, angka, titik, garis bawah).';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errs.email = 'Format email tidak valid.';
      if (v.phone && !/^[0-9+\s-]{8,16}$/.test(v.phone)) errs.phone = 'Nomor telepon tidak valid.';
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v.password)) errs.password = 'Minimal 8 karakter dengan huruf dan angka.';
      if (v.password !== v.password2) errs.password2 = 'Kata sandi tidak sama.';
      if (!v.agree) errs.agree = 'Anda perlu menyetujui ketentuan.';
      UI.$$('.field', f).forEach(function (b) { b.classList.remove('invalid'); var x = b.querySelector('.err'); if (x) x.textContent = ''; });
      Object.keys(errs).forEach(function (k) { var b = f.querySelector('[data-field="' + k + '"]'); if (b) { b.classList.add('invalid'); var x = b.querySelector('.err'); if (x) x.textContent = errs[k]; else UI.$('#rerr').textContent = errs[k]; } });
      if (Object.keys(errs).length) return;
      var btn = f.querySelector('button.btn-primary'); btn.disabled = true; btn.textContent = 'Memproses…';
      Auth.register(v).then(function (r) {
        btn.disabled = false; btn.textContent = 'Daftar Sekarang';
        if (!r.ok) { UI.$('#rerr').textContent = r.msg; return; }
        UI.toast('Akun berhasil dibuat. Selamat datang!');
        location.hash = '#/dashboard';
      });
    });
  };

  Pages.forgot = function () {
    if (DB.online) {
      var st = DB.settings();
      return App.render(authShell('<a href="#/login" class="muted" style="font-size:.88rem">← Kembali ke halaman masuk</a><h1 class="mt">Lupa kata sandi?</h1><p class="muted">Demi keamanan, kata sandi diatur ulang oleh Administrator.</p><div class="notice">' + icon('mail', 16) + ' Hubungi admin melalui <a href="mailto:' + esc(st.email) + '?subject=Reset%20kata%20sandi">' + esc(st.email) + '</a>' + (st.whatsapp ? ' atau <a target="_blank" rel="noopener" href="https://wa.me/' + esc(String(st.whatsapp).replace(/\D/g, '')) + '">WhatsApp</a>' : '') + ' dengan menyebutkan username dan email akun Anda. Admin dapat membuat kata sandi baru melalui menu Pengguna & Role.</div>'));
    }
    App.render(authShell('<a href="#/login" class="muted" style="font-size:.88rem">← Kembali ke halaman masuk</a><h1 class="mt">Pulihkan kata sandi</h1><p class="muted">Masukkan email akun Anda. Kami akan mengirimkan kode pemulihan.</p>' +
      '<form id="ff" class="form-1" novalidate>' + UI.fieldHTML({ name: 'email', label: 'Email', type: 'email', required: true }) + '<div id="ferr" class="err"></div><button class="btn btn-primary">Kirim Kode</button></form><div id="step2"></div>'));
    UI.$('#ff').onsubmit = function (e) {
      e.preventDefault();
      var email = e.target.email.value.trim().toLowerCase();
      var u = DB.all('users').find(function (x) { return x.email.toLowerCase() === email; });
      if (!u) { UI.$('#ferr').textContent = 'Email tidak terdaftar.'; return; }
      var code = String(Math.floor(100000 + Math.random() * 900000));
      DB.data.resets = (DB.data.resets || []).filter(function (r) { return r.userId !== u.id; });
      DB.data.resets.push({ userId: u.id, code: DB.hashPass(code), exp: Date.now() + 15 * 60000 }); DB.save();
      UI.$('#step2').innerHTML = '<div class="notice mt">' + icon('mail', 16) + ' <b>Mode prototype:</b> email tidak benar-benar dikirim. Kode pemulihan Anda: <b style="font-size:1.1rem;letter-spacing:.1em">' + code + '</b> (berlaku 15 menit)</div>' +
        '<form id="ff2" class="form-1 mt" novalidate>' + UI.fieldHTML({ name: 'code', label: 'Kode pemulihan', required: true }) + UI.fieldHTML({ name: 'pw', label: 'Kata sandi baru', type: 'password', required: true }) + '<div id="ferr2" class="err"></div><button class="btn btn-primary">Simpan Kata Sandi Baru</button></form>';
      UI.$('#ff2').onsubmit = function (ev) {
        ev.preventDefault();
        var r = (DB.data.resets || []).find(function (x) { return x.userId === u.id; });
        if (!r || r.exp < Date.now() || r.code !== DB.hashPass(ev.target.code.value.trim())) { UI.$('#ferr2').textContent = 'Kode salah atau kedaluwarsa.'; return; }
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(ev.target.pw.value)) { UI.$('#ferr2').textContent = 'Kata sandi minimal 8 karakter dengan huruf dan angka.'; return; }
        u.passHash = DB.hashPass(ev.target.pw.value);
        DB.data.resets = DB.data.resets.filter(function (x) { return x.userId !== u.id; }); DB.save();
        DB.log('Reset kata sandi akun ' + u.username, 'auth');
        UI.toast('Kata sandi berhasil diperbarui. Silakan masuk.');
        location.hash = '#/login';
      };
    };
  };
})();
