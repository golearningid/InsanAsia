/* =========================================================
   Area peserta (Learner) + halaman umum setelah login
   ========================================================= */
(function () {
  'use strict';
  var Pages = window.Pages;
  var esc = UI.esc, icon = UI.icon;
  var TYPE_LABEL = { pretest: 'Pretest', quiz: 'Kuis', posttest: 'Post-test', assignment: 'Tugas Praktik' };
  var SRC_LABEL = { builtin: 'Soal di platform', link: 'Tautan eksternal', pdf: 'File PDF' };
  Pages.TYPE_LABEL = TYPE_LABEL; Pages.SRC_LABEL = SRC_LABEL;

  function me() { return Auth.user(); }
  function myEnrollments(u) { return DB.where('enrollments', function (e) { return e.userId === u.id; }); }
  function upcomingSessions(classIds) {
    var out = [];
    DB.all('classes').forEach(function (k) {
      if (classIds && classIds.indexOf(k.id) === -1) return;
      (k.sessions || []).forEach(function (s) { if (new Date(s.at) >= new Date(Date.now() - 3600e3)) out.push({ cls: k, s: s }); });
    });
    return out.sort(function (a, b) { return new Date(a.s.at) - new Date(b.s.at); });
  }
  Pages.upcomingSessions = upcomingSessions;
  function sessionList(items) {
    if (!items.length) return UI.empty('Tidak ada jadwal sesi dalam waktu dekat.');
    return '<div class="list">' + items.slice(0, 5).map(function (x) {
      var p = DB.find('programs', x.cls.programId);
      return '<div class="list-item"><div class="li-ic">' + icon('cal') + '</div><div class="li-b"><b>' + esc(x.s.title) + '</b><small>' + esc(p ? p.title : '') + ' • ' + esc(x.cls.name) + '</small></div><div style="text-align:right"><b style="font-size:.85rem">' + UI.fmtDate(x.s.at, true) + '</b>' +
        (x.cls.meetingLink ? '<br><a href="' + UI.safeUrl(x.cls.meetingLink) + '" target="_blank" rel="noopener" style="font-size:.8rem">Buka link ' + icon('arrow', 12) + '</a>' : '<br><small class="muted">' + esc(x.cls.location || '') + '</small>') + '</div></div>';
    }).join('') + '</div>';
  }
  Pages.sessionList = sessionList;

  /* ---------- Dispatcher dashboard ---------- */
  Pages.dashboard = function (p, q) {
    var r = me().role;
    ({ learner: Pages.dashLearner, trainer: Pages.dashTrainer, coach: Pages.dashCoach, admin: Pages.dashAdmin, executive: Pages.dashExecutive }[r])(p, q);
  };

  /* ---------- Dashboard Learner ---------- */
  Pages.dashLearner = function () {
    var u = me(), ens = myEnrollments(u);
    var progs = ens.map(function (e) { return { e: e, p: DB.find('programs', e.programId), pr: DB.programProgress(u.id, e.programId) }; }).filter(function (x) { return x.p; });
    var active = progs.filter(function (x) { return x.pr < 100; });
    var last = active[0] || progs[0];
    var certs = DB.where('certificates', function (c) { return c.userId === u.id; });
    var attempts = DB.where('attempts', function (a) { return a.userId === u.id; }).slice(-5).reverse();
    var subs = DB.where('submissions', function (s) { return s.userId === u.id && s.status === 'graded'; }).slice(-3).reverse();
    var avg = progs.length ? Math.round(progs.reduce(function (s, x) { return s + x.pr; }, 0) / progs.length) : 0;
    var enrolledPids = ens.map(function (e) { return e.programId; });
    var cats = progs.map(function (x) { return x.p.categoryId; });
    var rec = DB.where('programs', function (p) { return p.status === 'published' && enrolledPids.indexOf(p.id) === -1; })
      .sort(function (a, b) { return (cats.indexOf(b.categoryId) > -1) - (cats.indexOf(a.categoryId) > -1); }).slice(0, 3);

    var nextLesson = null;
    if (last) { nextLesson = DB.programLessons(last.p.id).find(function (l) { return !DB.isDone(u.id, l.id); }); }

    var html = '<div class="welcome"><div><h2>Halo, ' + esc(u.name.split(' ')[0]) + '! 👋</h2><p>' + (progs.length ? 'Anda mengikuti ' + progs.length + ' program. Rata-rata progres ' + avg + '%. Terus semangat!' : 'Anda belum mengikuti kelas apa pun. Yuk mulai belajar!') + '</p></div>' +
      (last ? '<a class="btn btn-primary btn-lg" href="#/learn/' + esc(last.p.id) + (nextLesson ? '/' + esc(nextLesson.id) : '') + '">' + icon('play', 16) + ' Lanjutkan Belajar</a>' : '<a class="btn btn-primary btn-lg" href="#/programs">Jelajahi Program</a>') + '</div>' +
      '<div class="stats">' + UI.stat('Kelas diikuti', progs.length, 'book') + UI.stat('Rata-rata progres', avg + '%', 'chart') + UI.stat('Kuis dikerjakan', DB.where('attempts', function (a) { return a.userId === u.id; }).length, 'quiz') + UI.stat('Sertifikat', certs.length, 'award') + '</div>' +
      '<div class="grid-21"><div class="card"><div class="card-title"><h3>Kelas Saya</h3><a href="#/my-learning" class="btn btn-ghost btn-sm">Lihat semua</a></div>' +
      (progs.length ? '<div class="list">' + progs.map(function (x) {
        var k = DB.find('classes', x.e.classId);
        return '<div class="list-item"><div class="li-ic">' + icon('book') + '</div><div class="li-b"><b>' + esc(x.p.title) + '</b><small>' + esc(k ? k.name : '') + '</small>' + UI.progressBar(x.pr, 'Progres ' + x.p.title) + '</div><div class="row"><b>' + x.pr + '%</b><a class="btn btn-soft btn-sm" href="#/learn/' + esc(x.p.id) + '">Buka</a></div></div>';
      }).join('') + '</div>' : UI.empty('Belum ada kelas.', '<a class="btn btn-primary btn-sm" href="#/programs">Cari program</a>')) + '</div>' +
      '<div class="card"><div class="card-title"><h3>Jadwal Mendatang</h3></div>' + sessionList(upcomingSessions(ens.map(function (e) { return e.classId; }))) + '</div></div>' +
      '<div class="grid2"><div class="card"><div class="card-title"><h3>Hasil Assessment Terbaru</h3><a href="#/results" class="btn btn-ghost btn-sm">Detail</a></div>' +
      ((attempts.length || subs.length) ? '<div class="list">' + attempts.map(function (a) {
        var as = DB.find('assessments', a.assessmentId); if (!as) return '';
        var pass = a.score >= (as.passingScore || 0);
        return '<div class="list-item"><div class="li-ic">' + icon('quiz') + '</div><div class="li-b"><b>' + esc(as.title) + '</b><small>' + UI.fmtDate(a.submittedAt, true) + '</small></div><b>' + a.score + '</b>' + UI.badge(pass ? 'Lulus' : 'Belum lulus', pass ? 'green' : 'red') + '</div>';
      }).join('') + subs.map(function (s) {
        var as = DB.find('assessments', s.assessmentId); if (!as) return '';
        return '<div class="list-item"><div class="li-ic">' + icon('task') + '</div><div class="li-b"><b>' + esc(as.title) + '</b><small>Feedback: ' + esc(s.feedback || '-') + '</small></div><b>' + s.score + '</b></div>';
      }).join('') + '</div>' : UI.empty('Belum ada hasil assessment.')) + '</div>' +
      '<div class="card"><div class="card-title"><h3>Sertifikat Saya</h3><a href="#/certificates" class="btn btn-ghost btn-sm">Lihat semua</a></div>' +
      (certs.length ? '<div class="list">' + certs.map(function (c) { var p = DB.find('programs', c.programId); return '<div class="list-item"><div class="li-ic">' + icon('award') + '</div><div class="li-b"><b>' + esc(p ? p.title : '') + '</b><small>' + esc(c.number) + '</small></div><a class="btn btn-soft btn-sm" href="#/certificate/' + esc(c.id) + '">Lihat</a></div>'; }).join('') + '</div>' : UI.empty('Selesaikan program untuk mendapatkan sertifikat.')) + '</div></div>' +
      (rec.length ? '<div><h3>Rekomendasi Program</h3><div class="cards">' + rec.map(Pages.programCard).join('') + '</div></div>' : '');
    App.render(UI.appLayout(html, { title: 'Dashboard Peserta', subtitle: UI.fmtDate(new Date().toISOString()) }));
  };

  /* ---------- Kelas Saya ---------- */
  Pages.myLearning = function () {
    var u = me(), ens = myEnrollments(u);
    var html = ens.length ? '<div class="cards">' + ens.map(function (e) {
      var p = DB.find('programs', e.programId); if (!p) return '';
      var k = DB.find('classes', e.classId), pr = DB.programProgress(u.id, p.id), c = DB.certificateOf(u.id, p.id);
      return '<div class="card pcard">' + UI.programThumb(p) + '<div class="pc-body"><div class="row">' + (c ? UI.badge('Selesai', 'green') : UI.badge('Sedang berjalan', 'purple')) + '</div><h3>' + esc(p.title) + '</h3><p>' + esc(k ? k.name + ' • ' + k.mode : '') + '</p>' +
        '<div class="row between mt"><small class="muted">Progres</small><b>' + pr + '%</b></div>' + UI.progressBar(pr) +
        '<div class="row mt"><a class="btn btn-primary btn-sm grow" href="#/learn/' + esc(p.id) + '">' + (pr ? 'Lanjutkan' : 'Mulai Belajar') + '</a>' + (c ? '<a class="btn btn-ghost btn-sm" href="#/certificate/' + esc(c.id) + '">' + icon('award', 14) + '</a>' : '') + '</div></div></div>';
    }).join('') + '</div>' : '<div class="card">' + UI.empty('Anda belum mendaftar kelas apa pun.', '<a class="btn btn-primary" href="#/programs">Jelajahi Program</a>') + '</div>';
    App.render(UI.appLayout(html, { title: 'Kelas Saya', subtitle: 'Semua program yang Anda ikuti' }));
  };

  /* ---------- Ruang kelas ---------- */
  function embedVideo(url) {
    var m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    if (m) return '<div class="embed"><iframe src="https://www.youtube.com/embed/' + esc(m[1]) + '" title="Video materi" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>';
    var v = String(url || '').match(/vimeo\.com\/(\d+)/);
    if (v) return '<div class="embed"><iframe src="https://player.vimeo.com/video/' + esc(v[1]) + '" title="Video materi" allowfullscreen></iframe></div>';
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return '<div class="embed"><video controls src="' + UI.safeUrl(url) + '"></video></div>';
    return '<div class="linkbox">' + icon('video', 28) + '<div class="grow"><b>Video eksternal</b><br><small class="muted">' + esc(url) + '</small></div><a class="btn btn-primary" target="_blank" rel="noopener" href="' + UI.safeUrl(url) + '">Tonton Video</a></div>';
  }
  function lessonBody(l) {
    var desc = l.type !== 'text' && l.content ? '<div class="prose mb">' + UI.md(l.content) + '</div>' : '';
    if (l.type === 'text') return '<div class="prose">' + UI.md(l.content) + '</div>';
    if (l.type === 'video') return desc + (l.fileId ? '<div class="embed"><video controls id="lvid"></video></div>' : embedVideo(l.url));
    if (l.type === 'pdf') {
      if (l.fileId) return desc + '<div class="row mb"><button class="btn btn-ghost btn-sm" data-openfile>' + icon('eye', 14) + ' Buka di tab baru</button><button class="btn btn-ghost btn-sm" data-dlfile>' + icon('download', 14) + ' Unduh PDF</button><small class="muted">' + esc(l.fileName) + '</small></div><iframe class="pdf-frame" id="lpdf" title="Dokumen PDF"></iframe>';
      return desc + '<div class="row mb"><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + UI.safeUrl(l.url) + '">' + icon('eye', 14) + ' Buka PDF di tab baru</a></div><iframe class="pdf-frame" src="' + UI.safeUrl(l.url) + '" title="Dokumen PDF"></iframe>';
    }
    return desc + '<div class="linkbox">' + icon('link', 28) + '<div class="grow"><b>Tautan materi</b><br><small class="muted">' + esc(l.url) + '</small></div><a class="btn btn-primary" target="_blank" rel="noopener" href="' + UI.safeUrl(l.url) + '">Buka Tautan ' + icon('arrow', 14) + '</a></div>';
  }
  function mountLessonFile(l) {
    if (!l.fileId) return;
    DB.Files.get(l.fileId).then(function (b) {
      if (!b) return;
      var url = URL.createObjectURL(b);
      var f = UI.$('#lpdf'), v = UI.$('#lvid');
      if (f) f.src = url; if (v) v.src = url;
    });
    var o = UI.$('[data-openfile]'), d = UI.$('[data-dlfile]');
    if (o) o.onclick = function () { UI.openStoredFile(l.fileId, l.fileName); };
    if (d) d.onclick = function () { UI.openStoredFile(l.fileId, l.fileName, true); };
  }
  Pages.lessonBody = lessonBody; Pages.mountLessonFile = mountLessonFile;

  function syllabus(p, u, curLid, preview) {
    var mods = DB.modulesOf(p.id), as = DB.assessmentsOf(p.id), allLes = DB.programLessons(p.id);
    var locked = false, seq = p.sequential;
    var base = preview ? '#/preview/' + p.id + '?l=' : '#/learn/' + p.id + '/';
    function aItem(a) {
      var st = u ? DB.assessmentStatus(u.id, a) : {};
      return '<a href="' + (preview ? '#/preview/' + p.id + '?a=' + a.id : '#/assessment/' + a.id) + '"><span class="tick ' + (st.passed ? 'done' : '') + '">' + (st.passed ? icon('check', 12) : '') + '</span><span class="grow">' + esc(a.title) + '<br><small class="muted">' + TYPE_LABEL[a.type] + (a.required ? ' • wajib' : '') + (st.pending ? ' • menunggu nilai' : st.score != null ? ' • nilai ' + st.score : '') + '</small></span></a>';
    }
    var pre = as.filter(function (a) { return !a.moduleId && a.type === 'pretest'; });
    var post = as.filter(function (a) { return !a.moduleId && a.type !== 'pretest'; });
    var s = '<div class="sy-h"><b>' + esc(p.title) + '</b>' + (u && !preview ? '<div class="row between mt" style="font-size:.85rem"><span class="muted">Progres</span><b>' + DB.programProgress(u.id, p.id) + '%</b></div>' + UI.progressBar(DB.programProgress(u.id, p.id)) : '') + '</div>';
    if (pre.length) s += '<div class="sy-mod">Sebelum mulai</div>' + pre.map(aItem).join('');
    mods.forEach(function (m) {
      s += '<div class="sy-mod">' + esc(m.title) + '</div>';
      DB.lessonsOf(m.id).forEach(function (l) {
        var done = u && DB.isDone(u.id, l.id);
        var isLocked = !preview && seq && locked;
        s += isLocked ? '<a aria-disabled="true" style="opacity:.5;pointer-events:none"><span class="tick">' + icon('lock', 11) + '</span><span class="grow">' + esc(l.title) + '</span></a>' :
          '<a href="' + base + l.id + '" class="' + (l.id === curLid ? 'on' : '') + '"><span class="tick ' + (done ? 'done' : '') + '">' + (done ? icon('check', 12) : '') + '</span><span class="grow">' + esc(l.title) + '<br><small class="muted">' + icon({ text: 'text', pdf: 'file', video: 'video', link: 'link' }[l.type], 12) + ' ' + esc(l.duration || '') + '</small></span></a>';
        if (l.required && !done) locked = true;
      });
      as.filter(function (a) { return a.moduleId === m.id; }).forEach(function (a) { s += aItem(a); });
    });
    if (post.length) s += '<div class="sy-mod">Evaluasi akhir</div>' + post.map(aItem).join('');
    if (!allLes.length && !as.length) s += '<p class="muted" style="padding:1rem">Materi belum tersedia.</p>';
    return '<aside class="syllabus" aria-label="Daftar materi">' + s + '</aside>';
  }
  Pages.syllabus = syllabus;

  Pages.classroom = function (params) {
    var u = me(), p = DB.find('programs', params.pid);
    if (!p) return Pages.notFound();
    var en = DB.enrollment(u.id, p.id);
    if (!en) { UI.toast('Anda belum terdaftar di program ini.', 'error'); location.hash = '#/program/' + p.id; return; }
    var lessons = DB.programLessons(p.id);
    var l = params.lid ? DB.find('lessons', params.lid) : null;
    var cert = DB.certificateOf(u.id, p.id), pr = DB.programProgress(u.id, p.id);
    var k = DB.find('classes', en.classId);
    var view;
    if (!l) {
      var next = lessons.find(function (x) { return !DB.isDone(u.id, x.id); }) || lessons[0];
      var reqA = DB.assessmentsOf(p.id).filter(function (a) { return a.required; });
      view = '<div class="viewer"><h2>' + esc(p.title) + '</h2><p class="muted">' + esc(k ? k.name + ' • ' + k.mode + ' • ' + (k.location || '') : '') + '</p>' +
        (cert ? '<div class="notice mb" style="border-color:var(--green);background:var(--green-bg)">' + icon('award', 16) + ' <b>Selamat!</b> Anda telah menyelesaikan program ini. <a href="#/certificate/' + esc(cert.id) + '">Lihat sertifikat</a></div>' : '') +
        '<div class="stats">' + UI.stat('Progres', pr + '%', 'chart') + UI.stat('Materi selesai', lessons.filter(function (x) { return DB.isDone(u.id, x.id); }).length + '/' + lessons.length, 'book') + UI.stat('Assessment wajib lulus', reqA.filter(function (a) { return DB.assessmentStatus(u.id, a).passed; }).length + '/' + reqA.length, 'quiz') + '</div>' +
        '<h3 class="mt2">Syarat kelulusan & sertifikat</h3><ul class="objectives"><li>' + icon('check') + '<span>Menyelesaikan seluruh materi wajib</span></li>' + reqA.map(function (a) { return '<li>' + icon('check') + '<span>Lulus ' + esc(a.title) + ' (nilai minimal ' + a.passingScore + ')</span></li>'; }).join('') + '</ul>' +
        '<h3 class="mt2">Jadwal sesi</h3>' + sessionList(upcomingSessions([en.classId])) +
        (next ? '<a class="btn btn-primary btn-lg mt2" href="#/learn/' + esc(p.id) + '/' + esc(next.id) + '">' + icon('play', 16) + ' ' + (pr ? 'Lanjutkan' : 'Mulai') + ': ' + esc(next.title) + '</a>' : '') +
        (cert && !en.rating ? '<div class="card flat mt2"><h3>Beri penilaian program</h3><div class="row" id="rate">' + [1, 2, 3, 4, 5].map(function (n) { return '<button class="btn btn-ghost btn-sm" data-r="' + n + '">' + n + ' ★</button>'; }).join('') + '</div></div>' : '') + '</div>';
    } else {
      var idx = lessons.findIndex(function (x) { return x.id === l.id; });
      var prev = lessons[idx - 1], nxt = lessons[idx + 1], done = DB.isDone(u.id, l.id);
      view = '<div class="viewer"><div class="row between mb"><div><small class="muted">' + esc((DB.find('modules', l.moduleId) || {}).title || '') + '</small><h2 style="margin:0">' + esc(l.title) + '</h2></div>' + (done ? UI.badge('✓ Selesai', 'green') : UI.badge(l.required ? 'Wajib' : 'Opsional', 'gray')) + '</div>' +
        lessonBody(l) +
        '<div class="row between mt2" style="border-top:1px solid var(--line);padding-top:1.2rem">' +
        (prev ? '<a class="btn btn-ghost" href="#/learn/' + esc(p.id) + '/' + esc(prev.id) + '">← Sebelumnya</a>' : '<a class="btn btn-ghost" href="#/learn/' + esc(p.id) + '">Ringkasan kelas</a>') +
        '<div class="row">' + (done ? '' : '<button class="btn btn-primary" id="mark">' + icon('check', 16) + ' Tandai Selesai</button>') +
        (nxt ? '<a class="btn ' + (done ? 'btn-primary' : 'btn-ghost') + '" href="#/learn/' + esc(p.id) + '/' + esc(nxt.id) + '">Berikutnya →</a>' : '') + '</div></div></div>';
    }
    App.render(UI.appLayout('<div class="classroom">' + syllabus(p, u, l && l.id) + view + '</div>', { title: 'Ruang Kelas', subtitle: p.title }));
    if (l) {
      mountLessonFile(l);
      var mb = UI.$('#mark');
      if (mb) mb.onclick = function () {
        DB.data.progress.push({ userId: u.id, lessonId: l.id, completedAt: new Date().toISOString() }); DB.save();
        var c = DB.checkCompletion(u.id, p.id);
        UI.toast(c ? 'Selamat! Program selesai & sertifikat terbit 🎉' : 'Materi ditandai selesai.');
        var idx2 = lessons.findIndex(function (x) { return x.id === l.id; }), n2 = lessons[idx2 + 1];
        location.hash = n2 ? '#/learn/' + p.id + '/' + n2.id : '#/learn/' + p.id;
      };
    }
    var rate = UI.$('#rate');
    if (rate) rate.onclick = function (e) { var b = e.target.closest('[data-r]'); if (!b) return; en.rating = Number(b.dataset.r); DB.save(); UI.toast('Terima kasih atas penilaian Anda!'); App.refresh(); };
  };

  /* ---------- Mengerjakan assessment ---------- */
  Pages.takeAssessment = function (params) {
    var u = me(), a = DB.find('assessments', params.id);
    if (!a || !a.published) return Pages.notFound();
    var p = DB.find('programs', a.programId);
    if (!DB.enrollment(u.id, a.programId)) { UI.toast('Daftar program terlebih dahulu.', 'error'); location.hash = '#/program/' + a.programId; return; }
    var used = DB.attemptsCount(u.id, a.id), max = a.maxAttempts || 0, left = max ? max - used : Infinity;
    var st = DB.assessmentStatus(u.id, a);
    var head = '<div class="viewer"><div class="row between"><div><small class="muted">' + esc(p.title) + '</small><h2 style="margin:0">' + esc(a.title) + '</h2></div>' + UI.badge(TYPE_LABEL[a.type], 'purple') + '</div>' +
      '<dl class="kv mt"><dt>Sumber</dt><dd>' + SRC_LABEL[a.source] + '</dd><dt>Nilai minimal</dt><dd>' + (a.passingScore || 0) + '</dd><dt>Percobaan</dt><dd>' + used + (max ? ' / ' + max : ' (tanpa batas)') + '</dd>' + (a.dueAt ? '<dt>Tenggat</dt><dd>' + UI.fmtDate(a.dueAt, true) + '</dd>' : '') + '<dt>Status</dt><dd>' + (st.passed ? UI.badge('Lulus • ' + st.score, 'green') : st.pending ? UI.badge('Menunggu penilaian', 'amber') : st.done ? UI.badge('Belum lulus' + (st.score != null ? ' • ' + st.score : ''), 'red') : UI.badge('Belum dikerjakan', 'gray')) + '</dd></dl>' +
      (a.instructions ? '<div class="notice mt">' + UI.md(a.instructions) + '</div>' : '');
    var body = '';
    var isQuiz = a.source === 'builtin' && a.type !== 'assignment';
    if (isQuiz) {
      if (!a.questions.length) body = UI.empty('Soal belum tersedia.');
      else if (left <= 0) body = '<div class="notice warn mt">Batas percobaan telah habis.' + (st.score != null ? ' Nilai terbaik Anda: <b>' + st.score + '</b>.' : '') + '</div>';
      else body = '<form id="qz" class="mt2">' + a.questions.map(function (q, i) {
        return '<fieldset class="qcard"><legend class="sr">Soal ' + (i + 1) + '</legend><h4>' + (i + 1) + '. ' + esc(q.text) + '</h4>' + q.options.map(function (o, j) {
          return '<label class="opt"><input type="radio" name="q' + i + '" value="' + j + '"> <span>' + esc(o) + '</span></label>';
        }).join('') + '</fieldset>';
      }).join('') + '<div class="row between"><small class="muted">' + a.questions.length + ' soal • Sisa percobaan: ' + (left === Infinity ? '∞' : left) + '</small><button class="btn btn-primary btn-lg">Kumpulkan Jawaban</button></div></form>';
    } else {
      var resource = '';
      if (a.source === 'link' && a.url) resource = '<div class="linkbox mt">' + icon('link', 28) + '<div class="grow"><b>Kerjakan melalui tautan</b><br><small class="muted">' + esc(a.url) + '</small></div><a class="btn btn-primary" target="_blank" rel="noopener" href="' + UI.safeUrl(a.url) + '">Buka ' + icon('arrow', 14) + '</a></div>';
      if (a.source === 'pdf') resource = '<div class="linkbox mt">' + icon('file', 28) + '<div class="grow"><b>Lembar soal (PDF)</b><br><small class="muted">' + esc(a.fileName || a.url || '') + '</small></div>' + (a.fileId ? '<button class="btn btn-ghost" data-afile>' + icon('eye', 14) + ' Buka</button><button class="btn btn-primary" data-afile-dl>' + icon('download', 14) + ' Unduh</button>' : '<a class="btn btn-primary" target="_blank" rel="noopener" href="' + UI.safeUrl(a.url) + '">Buka PDF</a>') + '</div>';
      var subs = DB.where('submissions', function (s) { return s.userId === u.id && s.assessmentId === a.id; }).reverse();
      body = resource + '<h3 class="mt2">Riwayat pengumpulan</h3>' + (subs.length ? '<div class="list">' + subs.map(function (s) {
        return '<div class="list-item"><div class="li-ic">' + icon('task') + '</div><div class="li-b"><b>Dikirim ' + UI.fmtDate(s.submittedAt, true) + '</b><small>' + esc((s.text || '').slice(0, 120)) + (s.url ? ' • ' + esc(s.url) : '') + (s.fileName ? ' • ' + esc(s.fileName) : '') + '</small>' + (s.feedback ? '<div class="notice mt" style="padding:.6rem .8rem"><b>Feedback trainer:</b> ' + esc(s.feedback) + '</div>' : '') + '</div>' + (s.status === 'graded' ? '<b style="font-size:1.2rem">' + s.score + '</b>' : '') + UI.statusBadge(s.status) + '</div>';
      }).join('') + '</div>' : '<p class="muted">Belum ada pengumpulan.</p>') +
        (left > 0 && !st.passed ? '<h3 class="mt2">Kirim jawaban</h3><form id="sbf" class="form-1" novalidate>' +
          UI.fieldHTML({ name: 'text', label: 'Jawaban / catatan', type: 'textarea', rows: 6, placeholder: 'Tulis jawaban Anda di sini…' }) +
          UI.fieldHTML({ name: 'url', label: 'Tautan dokumen (opsional)', type: 'url', placeholder: 'https://docs.google.com/…' }) +
          UI.fieldHTML({ name: 'file', label: 'Lampiran PDF / gambar (opsional, maks 10 MB)', type: 'file', accept: 'application/pdf,image/*' }) +
          '<button class="btn btn-primary btn-lg">Kirim Jawaban</button></form>' : (st.passed ? '<div class="notice mt">' + icon('check', 16) + ' Anda telah lulus assessment ini.</div>' : '<div class="notice warn mt">Batas pengumpulan telah habis.</div>'));
    }
    App.render(UI.appLayout('<div class="classroom">' + syllabus(p, u, null) + head + body + '</div></div>', { title: TYPE_LABEL[a.type], subtitle: p.title }));
    var af = UI.$('[data-afile]'), afd = UI.$('[data-afile-dl]');
    if (af) af.onclick = function () { UI.openStoredFile(a.fileId, a.fileName); };
    if (afd) afd.onclick = function () { UI.openStoredFile(a.fileId, a.fileName, true); };

    var qz = UI.$('#qz');
    if (qz) qz.onsubmit = function (e) {
      e.preventDefault();
      var answers = a.questions.map(function (q, i) { var c = qz.querySelector('input[name="q' + i + '"]:checked'); return c ? Number(c.value) : null; });
      var empty = answers.filter(function (x) { return x === null; }).length;
      var go = function () {
        var tw = 0, got = 0;
        a.questions.forEach(function (q, i) { var w = q.weight || 1; tw += w; if (answers[i] === q.answer) got += w; });
        var score = tw ? Math.round(got / tw * 100) : 0, passed = score >= (a.passingScore || 0);
        DB.insert('attempts', { assessmentId: a.id, userId: u.id, score: score, answers: answers, submittedAt: new Date().toISOString(), passed: passed });
        DB.notify(u.id, 'Hasil ' + a.title + ': nilai ' + score + (passed ? ' (lulus)' : ' (belum lulus)'), '#/results');
        var cert = DB.checkCompletion(u.id, a.programId);
        App.refresh();
        UI.modal({
          title: 'Hasil ' + a.title, size: 'lg',
          body: '<div class="center"><div class="score-ring" style="--v:' + score + '"><b>' + score + '</b></div>' + UI.badge(passed ? 'Lulus' : 'Belum lulus (minimal ' + a.passingScore + ')', passed ? 'green' : 'red') + (cert ? '<p class="mt"><b>🎉 Program selesai! Sertifikat Anda telah terbit.</b></p>' : '') + '</div><h3 class="mt2">Pembahasan</h3>' +
            a.questions.map(function (q, i) {
              return '<div class="qcard"><h4>' + (i + 1) + '. ' + esc(q.text) + '</h4>' + q.options.map(function (o, j) { var cls = j === q.answer ? 'correct' : (answers[i] === j ? 'wrong' : ''); return '<div class="opt ' + cls + '">' + (j === q.answer ? icon('check', 14) : answers[i] === j ? icon('x', 14) : '<span style="width:14px"></span>') + ' ' + esc(o) + '</div>'; }).join('') + '</div>';
            }).join(''),
          footer: '<a class="btn btn-ghost" href="#/results">Lihat semua hasil</a><a class="btn btn-primary" href="#/learn/' + esc(a.programId) + '">Kembali ke kelas</a>'
        });
      };
      if (empty) UI.confirm(empty + ' soal belum dijawab. Tetap kumpulkan?', go, 'Kumpulkan'); else go();
    };
    var sbf = UI.$('#sbf');
    if (sbf) sbf.onsubmit = function (e) {
      e.preventDefault();
      var text = sbf.text.value.trim(), url = sbf.url.value.trim(), file = sbf.file.files[0];
      if (!text && !url && !file) return UI.toast('Isi jawaban, tautan, atau lampirkan file.', 'error');
      if (url && !/^https?:\/\//i.test(url)) return UI.toast('Tautan harus diawali http:// atau https://', 'error');
      if (file && !/^(application\/pdf|image\/)/.test(file.type)) return UI.toast('Lampiran harus PDF atau gambar.', 'error');
      var btn = sbf.querySelector('button'); btn.disabled = true; btn.textContent = 'Mengirim…';
      UI.storeFile(file, { maxMB: 10 }).then(function (f) {
        DB.insert('submissions', { assessmentId: a.id, userId: u.id, text: text, url: url, fileId: f ? f.id : null, fileName: f ? f.name : '', score: null, feedback: '', status: 'submitted', submittedAt: new Date().toISOString(), gradedAt: null, gradedBy: null });
        var k = DB.find('classes', (DB.enrollment(u.id, a.programId) || {}).classId);
        var tid = (k && k.trainerId) || p.trainerId;
        if (tid) DB.notify(tid, u.name + ' mengirim ' + a.title + '.', '#/grading');
        DB.log(u.name + ' mengirim jawaban ' + a.title, 'submission');
        UI.toast('Jawaban berhasil dikirim. Menunggu penilaian trainer.');
        App.refresh();
      }).catch(function (err) { btn.disabled = false; btn.textContent = 'Kirim Jawaban'; UI.toast(err.message, 'error'); });
    };
  };

  /* ---------- Kuis & Tugas saya ---------- */
  Pages.myAssessments = function () {
    var u = me(), ens = myEnrollments(u);
    var rows = [];
    ens.forEach(function (e) {
      DB.assessmentsOf(e.programId).forEach(function (a) { rows.push({ a: a, p: DB.find('programs', e.programId), st: DB.assessmentStatus(u.id, a) }); });
    });
    var html = '<div class="card">' + (rows.length ? '<div class="table-wrap"><table><thead><tr><th>Assessment</th><th>Program</th><th>Jenis</th><th>Tenggat</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td><b>' + esc(r.a.title) + '</b><br><small class="muted">' + SRC_LABEL[r.a.source] + (r.a.required ? ' • wajib' : '') + '</small></td><td>' + esc(r.p.title) + '</td><td>' + UI.badge(TYPE_LABEL[r.a.type], 'purple') + '</td><td>' + (r.a.dueAt ? UI.fmtDate(r.a.dueAt, true) : '-') + '</td><td>' +
        (r.st.passed ? UI.badge('Lulus • ' + r.st.score, 'green') : r.st.pending ? UI.badge('Menunggu nilai', 'amber') : r.st.done ? UI.badge('Belum lulus' + (r.st.score != null ? ' • ' + r.st.score : ''), 'red') : UI.badge('Belum dikerjakan', 'gray')) +
        '</td><td><a class="btn btn-soft btn-sm" href="#/assessment/' + esc(r.a.id) + '">' + (r.st.done ? 'Lihat' : 'Kerjakan') + '</a></td></tr>';
    }).join('') + '</tbody></table></div>' : UI.empty('Belum ada kuis atau tugas. Daftar kelas terlebih dahulu.')) + '</div>';
    App.render(UI.appLayout(html, { title: 'Kuis & Tugas', subtitle: 'Pretest, kuis, post-test, dan tugas praktik' }));
  };

  /* ---------- Hasil belajar ---------- */
  Pages.results = function () {
    var u = me(), ens = myEnrollments(u);
    var html = ens.length ? ens.map(function (e) {
      var p = DB.find('programs', e.programId); if (!p) return '';
      var as = DB.assessmentsOf(p.id);
      var pre = as.find(function (a) { return a.type === 'pretest'; }), post = as.find(function (a) { return a.type === 'posttest'; });
      var preS = pre ? DB.assessmentStatus(u.id, pre).score : null, postS = post ? DB.assessmentStatus(u.id, post).score : null;
      return '<div class="card"><div class="card-title"><h3>' + esc(p.title) + '</h3><b>' + DB.programProgress(u.id, p.id) + '% selesai</b></div>' +
        ((preS != null && postS != null) ? '<div class="notice mb">' + icon('chart', 16) + ' Peningkatan pemahaman: pretest <b>' + preS + '</b> → post-test <b>' + postS + '</b> (' + (postS - preS >= 0 ? '+' : '') + (postS - preS) + ' poin)</div>' : '') +
        '<div class="table-wrap"><table><thead><tr><th>Assessment</th><th>Jenis</th><th>Nilai</th><th>Minimal</th><th>Feedback</th></tr></thead><tbody>' + as.map(function (a) {
          var st = DB.assessmentStatus(u.id, a);
          return '<tr><td>' + esc(a.title) + '</td><td>' + TYPE_LABEL[a.type] + '</td><td><b>' + (st.score != null ? st.score : st.pending ? 'Menunggu' : '-') + '</b></td><td>' + a.passingScore + '</td><td>' + esc(st.feedback || '-') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('') : '<div class="card">' + UI.empty('Belum ada hasil belajar.') + '</div>';
    App.render(UI.appLayout(html, { title: 'Hasil Belajar', subtitle: 'Nilai, progres, dan feedback trainer' }));
  };

  /* ---------- Sertifikat ---------- */
  Pages.myCertificates = function () {
    var u = me(), cs = DB.where('certificates', function (c) { return c.userId === u.id; });
    var html = cs.length ? '<div class="cards">' + cs.map(function (c) {
      var p = DB.find('programs', c.programId);
      return '<div class="card"><div class="cat-ic">' + icon('award', 22) + '</div><h3 class="mt">' + esc(p ? p.title : '') + '</h3><dl class="kv"><dt>Nomor</dt><dd>' + esc(c.number) + '</dd><dt>Kode</dt><dd>' + esc(c.code) + '</dd><dt>Terbit</dt><dd>' + UI.fmtDate(c.issuedAt) + '</dd></dl><a class="btn btn-primary btn-sm mt" href="#/certificate/' + esc(c.id) + '">Lihat & Cetak</a></div>';
    }).join('') + '</div>' : '<div class="card">' + UI.empty('Belum ada sertifikat. Selesaikan seluruh materi dan assessment wajib untuk mendapatkannya.') + '</div>';
    App.render(UI.appLayout(html, { title: 'Sertifikat Saya' }));
  };
  Pages.certificateView = function (params) {
    var u = me(), c = DB.find('certificates', params.id);
    if (!c || (c.userId !== u.id && ['admin', 'coach', 'trainer', 'executive'].indexOf(u.role) === -1)) return Pages.notFound();
    var s = DB.settings(), owner = DB.find('users', c.userId), p = DB.find('programs', c.programId);
    var verifyUrl = location.href.split('#')[0] + '#/verify?code=' + encodeURIComponent(c.code);
    var html = '<div class="cert" id="cert"><div class="c-logo">' + UI.logoHTML(s).replace('<a href="#/"', '<span').replace('</a>', '</span>') + '</div><small style="letter-spacing:.2em;color:var(--muted)">' + esc(s.certIssuer || s.siteName) + '</small><h2>SERTIFIKAT</h2><p class="muted" style="margin:0">Nomor: ' + esc(c.number) + '</p><p style="margin:.8rem 0 0">Diberikan kepada</p><div class="c-name">' + esc(owner ? owner.name : '') + '</div><p style="margin:0">atas keberhasilannya menyelesaikan program pelatihan</p><div class="c-prog">' + esc(p ? p.title : '') + '</div><p class="muted">Diterbitkan pada ' + UI.fmtDate(c.issuedAt) + '</p>' +
      '<div class="c-foot"><div><small class="muted">Kode verifikasi</small><br><b>' + esc(c.code) + '</b><br><small class="muted">Verifikasi di: ' + esc(verifyUrl.replace(/^https?:\/\//, '').slice(0, 60)) + '</small></div><div class="c-sign"><small>' + esc(s.certSigner || '') + '</small><b>' + esc(s.certSignerName || '') + '</b></div></div></div>';
    App.render(UI.appLayout(html, { title: 'Sertifikat', subtitle: p ? p.title : '', actions: '<button class="btn btn-primary" onclick="window.print()">' + icon('download', 16) + ' Cetak / Simpan PDF</button><a class="btn btn-ghost" href="#/verify?code=' + encodeURIComponent(c.code) + '">Halaman verifikasi</a>' }));
  };

  /* ---------- Profil ---------- */
  Pages.profile = function () {
    var u = me();
    var html = '<div class="grid2" style="align-items:start"><div class="card"><div class="row mb">' + UI.avatar(u, 72) + '<div><h3 style="margin:0">' + esc(u.name) + '</h3><small class="muted">@' + esc(u.username) + ' • ' + esc(ROLES[u.role]) + '</small></div></div>' +
      '<form id="pf" class="form-grid" novalidate>' +
      UI.fieldHTML({ name: 'name', label: 'Nama lengkap', value: u.name, required: true, full: true }) +
      UI.fieldHTML({ name: 'email', label: 'Email', type: 'email', value: u.email, required: true }) +
      UI.fieldHTML({ name: 'phone', label: 'Telepon', value: u.phone }) +
      ((u.role === 'trainer' || u.role === 'coach') ? UI.fieldHTML({ name: 'expertise', label: 'Bidang keahlian', value: u.expertise, full: true }) : '') +
      UI.fieldHTML({ name: 'bio', label: u.role === 'learner' ? 'Usaha / pekerjaan' : 'Bio singkat', type: 'textarea', value: u.bio, rows: 3 }) +
      UI.fieldHTML({ name: 'avatar', label: 'Foto profil (PNG/JPG)', type: 'file', accept: 'image/*' }) +
      '<div class="field full"><button class="btn btn-primary">Simpan Profil</button></div></form></div>' +
      '<div class="card"><h3>Ubah kata sandi</h3><form id="pw" class="form-1" novalidate>' + UI.fieldHTML({ name: 'old', label: 'Kata sandi saat ini', type: 'password', required: true }) + UI.fieldHTML({ name: 'new1', label: 'Kata sandi baru', type: 'password', required: true, help: 'Minimal 8 karakter dengan huruf dan angka.' }) + UI.fieldHTML({ name: 'new2', label: 'Ulangi kata sandi baru', type: 'password', required: true }) + '<button class="btn btn-dark">Perbarui Kata Sandi</button></form>' +
      '<h3 class="mt2">Info akun</h3><dl class="kv"><dt>Bergabung</dt><dd>' + UI.fmtDate(u.createdAt) + '</dd><dt>Login terakhir</dt><dd>' + UI.fmtDate(u.lastLogin, true) + '</dd><dt>Status</dt><dd>' + UI.statusBadge(u.status) + '</dd></dl></div></div>';
    App.render(UI.appLayout(html, { title: 'Profil & Pengaturan Akun' }));
    UI.$('#pf').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      if (!f.name.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value)) return UI.toast('Nama dan email valid wajib diisi.', 'error');
      var dup = DB.all('users').some(function (x) { return x.id !== u.id && x.email.toLowerCase() === f.email.value.trim().toLowerCase(); });
      if (dup) return UI.toast('Email sudah digunakan akun lain.', 'error');
      UI.readImage(f.avatar.files[0], 300, 'image/jpeg').then(function (img) {
        var patch = { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), bio: f.bio.value.trim() };
        if (f.expertise) patch.expertise = f.expertise.value.trim();
        if (img) patch.avatar = img;
        DB.update('users', u.id, patch); UI.toast('Profil disimpan.'); App.refresh();
      }).catch(function (err) { UI.toast(err.message, 'error'); });
    };
    UI.$('#pw').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.new1.value)) return UI.toast('Kata sandi baru minimal 8 karakter dengan huruf dan angka.', 'error');
      if (f.new1.value !== f.new2.value) return UI.toast('Konfirmasi kata sandi tidak sama.', 'error');
      Auth.changePassword(f.old.value, f.new1.value).then(function (r) {
        if (!r.ok) return UI.toast(r.msg, 'error');
        DB.log('Mengubah kata sandi', 'auth'); f.reset(); UI.toast('Kata sandi diperbarui.');
      });
    };
  };

  /* ---------- Notifikasi ---------- */
  Pages.notifications = function () {
    var u = me(), ns = DB.where('notifications', function (n) { return n.userId === u.id; });
    var html = '<div class="card">' + (ns.length ? '<div class="list">' + ns.map(function (n) {
      return '<a class="list-item ' + (n.read ? '' : 'unread') + '" href="' + esc(n.link || '#/notifications') + '" data-n="' + esc(n.id) + '" style="color:inherit;text-decoration:none"><div class="li-ic">' + icon('bell') + '</div><div class="li-b"><b>' + esc(n.text) + '</b><small>' + UI.fmtDate(n.date, true) + '</small></div>' + (n.read ? '' : UI.badge('Baru', 'purple')) + '</a>';
    }).join('') + '</div>' : UI.empty('Belum ada notifikasi.')) + '</div>';
    App.render(UI.appLayout(html, { title: 'Notifikasi', actions: ns.length ? '<button class="btn btn-ghost btn-sm" id="readall">' + icon('check', 14) + ' Tandai semua dibaca</button>' : '' }));
    UI.$$('[data-n]').forEach(function (a) { a.addEventListener('click', function () { var n = DB.find('notifications', a.dataset.n); if (n) { n.read = true; DB.save(); } }); });
    var ra = UI.$('#readall'); if (ra) ra.onclick = function () { ns.forEach(function (n) { n.read = true; }); DB.save(); App.refresh(); };
  };
})();
