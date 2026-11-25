/* =========================================================
   Area pengelolaan: Trainer Internal, Enterprise Coach, Admin
   (materi, kuis, assessment, penilaian, kelas, laporan)
   ========================================================= */
(function () {
  'use strict';
  var Pages = window.Pages;
  var esc = UI.esc, icon = UI.icon;
  var TL = function () { return Pages.TYPE_LABEL; }, SL = function () { return Pages.SRC_LABEL; };
  function me() { return Auth.user(); }

  /* Program yang boleh dikelola user */
  function scopePrograms(u) {
    u = u || me();
    if (u.role === 'admin' || u.role === 'coach' || u.role === 'executive') return DB.all('programs');
    var mine = DB.where('classes', function (k) { return k.trainerId === u.id; }).map(function (k) { return k.programId; });
    return DB.where('programs', function (p) { return p.trainerId === u.id || mine.indexOf(p.id) > -1; });
  }
  Pages.scopePrograms = scopePrograms;
  function scopeClasses(u) {
    u = u || me();
    if (u.role !== 'trainer') return DB.all('classes');
    var pids = scopePrograms(u).map(function (p) { return p.id; });
    return DB.where('classes', function (k) { return k.trainerId === u.id || pids.indexOf(k.programId) > -1; });
  }
  function trainerOptions() { return DB.where('users', function (u) { return (u.role === 'trainer' || u.role === 'coach') && u.status === 'active'; }).map(function (u) { return [u.id, u.name + ' (' + ROLES[u.role] + ')']; }); }
  Pages.trainerOptions = trainerOptions;
  function pendingSubs(pids) { return DB.where('submissions', function (s) { var a = DB.find('assessments', s.assessmentId); return s.status === 'submitted' && a && pids.indexOf(a.programId) > -1; }); }

  /* ---------- Dashboard Trainer ---------- */
  Pages.dashTrainer = function () {
    var u = me(), progs = scopePrograms(u), pids = progs.map(function (p) { return p.id; });
    var classes = scopeClasses(u);
    var ens = DB.where('enrollments', function (e) { return pids.indexOf(e.programId) > -1; });
    var pend = pendingSubs(pids);
    var follow = ens.filter(function (e) { return DB.programProgress(e.userId, e.programId) < 50 && (Date.now() - new Date(e.enrolledAt)) > 7 * 864e5; });
    var html = '<div class="welcome"><div><h2>Selamat mengajar, ' + esc(u.name.split(' ')[0]) + '!</h2><p>' + pend.length + ' tugas menunggu penilaian • ' + follow.length + ' peserta perlu tindak lanjut.</p></div><div class="row"><a class="btn btn-primary" href="#/manage/content">' + icon('plus', 16) + ' Kelola Materi</a><a class="btn btn-outline-w" href="#/grading">Nilai Tugas</a></div></div>' +
      '<div class="stats">' + UI.stat('Kelas ditangani', classes.length, 'cal') + UI.stat('Total peserta', ens.length, 'users') + UI.stat('Menunggu penilaian', pend.length, 'task') + UI.stat('Materi dipublikasikan', pids.reduce(function (s, id) { return s + DB.programLessons(id).length; }, 0), 'book') + '</div>' +
      '<div class="grid-21"><div class="card"><div class="card-title"><h3>Kelas Saya</h3></div><div class="table-wrap"><table><thead><tr><th>Kelas</th><th>Peserta</th><th>Rata-rata progres</th><th>Status</th><th></th></tr></thead><tbody>' +
      classes.map(function (k) {
        var p = DB.find('programs', k.programId), ke = DB.where('enrollments', function (e) { return e.classId === k.id; });
        var avg = ke.length ? Math.round(ke.reduce(function (s, e) { return s + DB.programProgress(e.userId, e.programId); }, 0) / ke.length) : 0;
        return '<tr><td><b>' + esc(p ? p.title : '') + '</b><br><small class="muted">' + esc(k.name) + '</small></td><td>' + ke.length + '/' + k.capacity + '</td><td style="min-width:140px">' + UI.progressBar(avg) + '<small>' + avg + '%</small></td><td>' + UI.statusBadge(k.status) + '</td><td><a class="btn btn-soft btn-sm" href="#/manage/content/' + esc(k.programId) + '">Materi</a></td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-title"><h3>Jadwal Mengajar</h3></div>' + Pages.sessionList(Pages.upcomingSessions(classes.map(function (k) { return k.id; }))) + '</div></div>' +
      '<div class="grid2"><div class="card"><div class="card-title"><h3>Submission Terbaru</h3><a class="btn btn-ghost btn-sm" href="#/grading">Semua</a></div>' + subList(pend.slice(0, 5)) + '</div>' +
      '<div class="card"><div class="card-title"><h3>Perlu Tindak Lanjut</h3></div>' + (follow.length ? '<div class="list">' + follow.slice(0, 6).map(function (e) {
        var l = DB.find('users', e.userId), p = DB.find('programs', e.programId), pr = DB.programProgress(e.userId, e.programId);
        return '<div class="list-item">' + UI.avatar(l, 36) + '<div class="li-b"><b>' + esc(l ? l.name : '') + '</b><small>' + esc(p ? p.title : '') + ' • progres ' + pr + '%</small></div><button class="btn btn-ghost btn-xs" data-remind="' + esc(e.userId) + '" data-p="' + esc(e.programId) + '">Kirim pengingat</button></div>';
      }).join('') + '</div>' : UI.empty('Semua peserta berjalan baik.')) + '</div></div>';
    App.render(UI.appLayout(html, { title: 'Dashboard Trainer Internal' }));
    bindRemind();
  };
  function bindRemind() {
    UI.$$('[data-remind]').forEach(function (b) {
      b.onclick = function () { var p = DB.find('programs', b.dataset.p); DB.notify(b.dataset.remind, 'Pengingat dari trainer: yuk lanjutkan kelas ' + (p ? p.title : '') + '!', '#/learn/' + b.dataset.p); UI.toast('Pengingat terkirim.'); b.disabled = true; b.textContent = 'Terkirim'; };
    });
  }
  function subList(subs) {
    if (!subs.length) return UI.empty('Tidak ada tugas yang menunggu penilaian.');
    return '<div class="list">' + subs.map(function (s) {
      var l = DB.find('users', s.userId), a = DB.find('assessments', s.assessmentId);
      return '<div class="list-item">' + UI.avatar(l, 36) + '<div class="li-b"><b>' + esc(l ? l.name : '') + '</b><small>' + esc(a ? a.title : '') + ' • ' + UI.fmtDate(s.submittedAt, true) + '</small></div><button class="btn btn-soft btn-sm" data-grade="' + esc(s.id) + '">Nilai</button></div>';
    }).join('') + '</div>';
  }

  /* ---------- Dashboard Enterprise Coach (Program Manager) ---------- */
  Pages.dashCoach = function () {
    var u = me(), progs = DB.all('programs'), classes = DB.all('classes');
    var active = progs.filter(function (p) { return p.status === 'published'; });
    var running = classes.filter(function (k) { return k.status === 'ongoing'; });
    var ens = DB.all('enrollments');
    var done = ens.filter(function (e) { return DB.certificateOf(e.userId, e.programId); }).length;
    var rated = ens.filter(function (e) { return e.rating; });
    var sat = rated.length ? (rated.reduce(function (s, e) { return s + e.rating; }, 0) / rated.length).toFixed(1) : '-';
    var html = '<div class="stats">' + UI.stat('Program aktif', active.length, 'book') + UI.stat('Kelas berjalan', running.length, 'cal') + UI.stat('Total pendaftar', ens.length, 'users') + UI.stat('Tingkat penyelesaian', (ens.length ? Math.round(done / ens.length * 100) : 0) + '%', 'award') + UI.stat('Kepuasan peserta', sat + ' / 5', 'star') + '</div>' +
      '<div class="card"><div class="card-title"><h3>Pemantauan Kelas</h3><a class="btn btn-primary btn-sm" href="#/manage/classes">' + icon('plus', 14) + ' Kelola Kelas</a></div><div class="table-wrap"><table><thead><tr><th>Program / Kelas</th><th>Trainer</th><th>Jadwal</th><th>Kapasitas</th><th>Progres rata-rata</th><th>Status</th></tr></thead><tbody>' +
      classes.map(function (k) {
        var p = DB.find('programs', k.programId), t = DB.find('users', k.trainerId), ke = DB.where('enrollments', function (e) { return e.classId === k.id; });
        var avg = ke.length ? Math.round(ke.reduce(function (s, e) { return s + DB.programProgress(e.userId, e.programId); }, 0) / ke.length) : 0;
        return '<tr><td><b>' + esc(p ? p.title : '-') + '</b><br><small class="muted">' + esc(k.name) + '</small></td><td>' + esc(t ? t.name : '-') + '</td><td><small>' + UI.fmtDate(k.startAt) + ' – ' + UI.fmtDate(k.endAt) + '</small></td><td>' + ke.length + '/' + k.capacity + UI.progressBar(Math.min(100, Math.round(ke.length / k.capacity * 100))) + '</td><td>' + avg + '%</td><td>' + UI.statusBadge(k.status) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="grid2"><div class="card"><div class="card-title"><h3>Pendaftar per Program</h3></div>' + UI.barChart(progs.map(function (p) { return { label: p.title, value: ens.filter(function (e) { return e.programId === p.id; }).length }; })) + '</div>' +
      '<div class="card"><div class="card-title"><h3>Jadwal Mendatang</h3></div>' + Pages.sessionList(Pages.upcomingSessions()) + '</div></div>';
    App.render(UI.appLayout(html, { title: 'Dashboard Enterprise Coach', subtitle: 'Pengelolaan program, kelas, dan evaluasi' }));
  };

  /* ---------- Kelola Materi, Kuis & Assessment ---------- */
  Pages.manageContent = function (params) {
    var u = me(), progs = scopePrograms(u);
    if (!progs.length) return App.render(UI.appLayout('<div class="card">' + UI.empty('Belum ada program yang ditugaskan kepada Anda.') + '</div>', { title: 'Materi, Kuis & Assessment' }));
    var p = params.pid ? DB.find('programs', params.pid) : progs[0];
    if (!p || progs.indexOf(p) === -1) p = progs[0];
    var mods = DB.modulesOf(p.id), as = DB.assessmentsOf(p.id, true);
    var tIc = { text: 'text', pdf: 'file', video: 'video', link: 'link' }, tLab = { text: 'Teks', pdf: 'PDF', video: 'Video', link: 'Tautan' };

    var sel = '<div class="card flat"><div class="row"><label for="psel"><b>Program:</b></label><select id="psel" style="max-width:420px">' + progs.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === p.id ? ' selected' : '') + '>' + esc(x.title) + ' (' + x.status + ')</option>'; }).join('') + '</select><span class="grow"></span>' +
      '<label class="row" style="gap:.4rem;font-size:.88rem"><input type="checkbox" id="seq"' + (p.sequential ? ' checked' : '') + '> Wajib berurutan (materi prasyarat)</label><a class="btn btn-ghost btn-sm" href="#/preview/' + esc(p.id) + '">' + icon('eye', 14) + ' Pratinjau</a></div></div>';

    var modsHTML = mods.map(function (m, mi) {
      var ls = DB.lessonsOf(m.id, true);
      var qa = as.filter(function (a) { return a.moduleId === m.id; });
      return '<div class="mod-block"><div class="mod-block-h"><b>' + esc(m.title) + '</b><div class="row">' +
        '<button class="btn btn-ghost btn-xs" data-mup="' + esc(m.id) + '"' + (mi === 0 ? ' disabled' : '') + ' aria-label="Naikkan modul">' + icon('up', 14) + '</button><button class="btn btn-ghost btn-xs" data-mdown="' + esc(m.id) + '"' + (mi === mods.length - 1 ? ' disabled' : '') + ' aria-label="Turunkan modul">' + icon('down', 14) + '</button>' +
        '<button class="btn btn-soft btn-xs" data-addles="' + esc(m.id) + '">' + icon('plus', 13) + ' Materi</button><button class="btn btn-soft btn-xs" data-addas="' + esc(m.id) + '">' + icon('plus', 13) + ' Kuis/Tugas</button>' +
        '<button class="btn btn-ghost btn-xs" data-editmod="' + esc(m.id) + '" aria-label="Ubah modul">' + icon('edit', 14) + '</button><button class="btn btn-ghost btn-xs" data-delmod="' + esc(m.id) + '" aria-label="Hapus modul">' + icon('trash', 14) + '</button></div></div>' +
        (ls.map(function (l, li) {
          return '<div class="les-row"><div class="li-ic">' + icon(tIc[l.type]) + '</div><div class="grow"><b>' + esc(l.title) + '</b><br><small class="muted">' + tLab[l.type] + (l.fileName ? ' • ' + esc(l.fileName) : l.url ? ' • ' + esc(l.url.slice(0, 50)) : '') + ' • ' + esc(l.duration || '') + '</small></div>' +
            (l.published ? UI.badge('Published', 'purple') : UI.badge('Draft', 'gray')) + (l.required ? UI.badge('Wajib', 'dark') : '') +
            '<button class="btn btn-ghost btn-xs" data-lup="' + esc(l.id) + '"' + (li === 0 ? ' disabled' : '') + ' aria-label="Naikkan">' + icon('up', 14) + '</button><button class="btn btn-ghost btn-xs" data-ldown="' + esc(l.id) + '"' + (li === ls.length - 1 ? ' disabled' : '') + ' aria-label="Turunkan">' + icon('down', 14) + '</button>' +
            '<button class="btn btn-ghost btn-xs" data-editles="' + esc(l.id) + '" aria-label="Ubah">' + icon('edit', 14) + '</button><button class="btn btn-ghost btn-xs" data-delles="' + esc(l.id) + '" aria-label="Hapus">' + icon('trash', 14) + '</button></div>';
        }).join('') || '<div class="les-row muted"><small>Belum ada materi di modul ini.</small></div>') +
        qa.map(asRow).join('') + '</div>';
    }).join('');

    function asRow(a) {
      return '<div class="les-row" style="background:#FDFCFF"><div class="li-ic" style="background:var(--ink);color:#fff">' + icon(a.type === 'assignment' ? 'task' : 'quiz') + '</div><div class="grow"><b>' + esc(a.title) + '</b><br><small class="muted">' + TL()[a.type] + ' • ' + SL()[a.source] + (a.source === 'builtin' && a.type !== 'assignment' ? ' • ' + a.questions.length + ' soal' : '') + ' • min. ' + a.passingScore + ' • ' + (a.maxAttempts || '∞') + 'x percobaan</small></div>' +
        (a.published ? UI.badge('Published', 'purple') : UI.badge('Draft', 'gray')) + (a.required ? UI.badge('Wajib', 'dark') : '') +
        (a.source === 'builtin' && a.type !== 'assignment' ? '<a class="btn btn-soft btn-xs" href="#/manage/assessment/' + esc(a.id) + '">' + icon('list', 13) + ' Soal</a>' : '') +
        '<button class="btn btn-ghost btn-xs" data-editas="' + esc(a.id) + '" aria-label="Ubah">' + icon('edit', 14) + '</button><button class="btn btn-ghost btn-xs" data-delas="' + esc(a.id) + '" aria-label="Hapus">' + icon('trash', 14) + '</button></div>';
    }
    var general = as.filter(function (a) { return !a.moduleId; });
    var html = sel +
      '<div class="notice">' + icon('help', 16) + ' Tambahkan materi berupa <b>teks</b>, <b>file PDF</b> (unggah), <b>video</b> (link YouTube/Vimeo/MP4), atau <b>tautan</b>. Kuis & assessment dapat dibuat dengan <b>soal pilihan ganda di platform</b>, melalui <b>tautan</b> (mis. Google Form), atau <b>file PDF</b> yang dikerjakan peserta lalu dinilai trainer.</div>' +
      '<div class="grid-21"><div><div class="row between mb"><h3 style="margin:0">Modul & Materi</h3><button class="btn btn-primary btn-sm" id="addmod">' + icon('plus', 14) + ' Tambah Modul</button></div>' + (modsHTML || '<div class="card">' + UI.empty('Belum ada modul. Mulai dengan menambahkan modul.') + '</div>') + '</div>' +
      '<div><div class="row between mb"><h3 style="margin:0">Pretest / Post-test / Umum</h3><button class="btn btn-primary btn-sm" data-addas="">' + icon('plus', 14) + ' Assessment</button></div><div class="mod-block">' + (general.map(asRow).join('') || '<div class="les-row muted"><small>Belum ada assessment umum.</small></div>') + '</div>' +
      '<div class="card flat"><h3>Ringkasan</h3><dl class="kv"><dt>Modul</dt><dd>' + mods.length + '</dd><dt>Materi</dt><dd>' + DB.programLessons(p.id, true).length + '</dd><dt>Kuis/Assessment</dt><dd>' + as.length + '</dd><dt>Status program</dt><dd>' + UI.statusBadge(p.status) + '</dd></dl></div></div></div>';

    App.render(UI.appLayout(html, { title: 'Materi, Kuis & Assessment', subtitle: 'Kelola konten pembelajaran tanpa mengubah kode' }));
    var go = function () { App.refresh(); };
    UI.$('#psel').onchange = function (e) { location.hash = '#/manage/content/' + e.target.value; };
    UI.$('#seq').onchange = function (e) { p.sequential = e.target.checked; DB.save(); UI.toast(p.sequential ? 'Materi wajib diselesaikan berurutan.' : 'Materi dapat diakses bebas.'); };

    function reorder(list, id, dir) {
      var i = list.findIndex(function (x) { return x.id === id; }), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      list.forEach(function (x, k) { x.order = k + 1; });
      var t = list[i].order; list[i].order = list[j].order; list[j].order = t;
      DB.save(); go();
    }
    UI.$('#addmod').onclick = function () { moduleForm(p, null); };
    UI.$$('[data-editmod]').forEach(function (b) { b.onclick = function () { moduleForm(p, DB.find('modules', b.dataset.editmod)); }; });
    UI.$$('[data-delmod]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('Hapus modul beserta seluruh materi di dalamnya?', function () {
          var mid = b.dataset.delmod;
          DB.data.lessons.filter(function (l) { return l.moduleId === mid; }).forEach(function (l) { if (l.fileId) DB.Files.del(l.fileId); });
          DB.data.lessons = DB.data.lessons.filter(function (l) { return l.moduleId !== mid; });
          DB.data.assessments.forEach(function (a) { if (a.moduleId === mid) a.moduleId = null; });
          DB.remove('modules', mid); DB.log('Menghapus modul pada ' + p.title, 'module'); UI.toast('Modul dihapus.'); go();
        }, 'Hapus');
      };
    });
    UI.$$('[data-mup]').forEach(function (b) { b.onclick = function () { reorder(DB.modulesOf(p.id), b.dataset.mup, -1); }; });
    UI.$$('[data-mdown]').forEach(function (b) { b.onclick = function () { reorder(DB.modulesOf(p.id), b.dataset.mdown, 1); }; });
    UI.$$('[data-lup]').forEach(function (b) { b.onclick = function () { var l = DB.find('lessons', b.dataset.lup); reorder(DB.lessonsOf(l.moduleId, true), l.id, -1); }; });
    UI.$$('[data-ldown]').forEach(function (b) { b.onclick = function () { var l = DB.find('lessons', b.dataset.ldown); reorder(DB.lessonsOf(l.moduleId, true), l.id, 1); }; });
    UI.$$('[data-addles]').forEach(function (b) { b.onclick = function () { lessonForm(p, b.dataset.addles, null); }; });
    UI.$$('[data-editles]').forEach(function (b) { b.onclick = function () { var l = DB.find('lessons', b.dataset.editles); lessonForm(p, l.moduleId, l); }; });
    UI.$$('[data-delles]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('Hapus materi ini?', function () { var l = DB.find('lessons', b.dataset.delles); if (l.fileId) DB.Files.del(l.fileId); DB.remove('lessons', l.id); DB.data.progress = DB.data.progress.filter(function (x) { return x.lessonId !== l.id; }); DB.save(); DB.log('Menghapus materi "' + l.title + '"', 'lesson'); UI.toast('Materi dihapus.'); go(); }, 'Hapus');
      };
    });
    UI.$$('[data-addas]').forEach(function (b) { b.onclick = function () { assessmentForm(p, b.dataset.addas || null, null); }; });
    UI.$$('[data-editas]').forEach(function (b) { b.onclick = function () { var a = DB.find('assessments', b.dataset.editas); assessmentForm(p, a.moduleId, a); }; });
    UI.$$('[data-delas]').forEach(function (b) {
      b.onclick = function () {
        UI.confirm('Hapus assessment ini beserta riwayat nilainya?', function () {
          var a = DB.find('assessments', b.dataset.delas); if (a.fileId) DB.Files.del(a.fileId);
          DB.remove('assessments', a.id);
          DB.data.attempts = DB.data.attempts.filter(function (x) { return x.assessmentId !== a.id; });
          DB.data.submissions = DB.data.submissions.filter(function (x) { return x.assessmentId !== a.id; }); DB.save();
          DB.log('Menghapus assessment "' + a.title + '"', 'assessment'); UI.toast('Assessment dihapus.'); go();
        }, 'Hapus');
      };
    });
  };

  function moduleForm(p, m) {
    UI.formModal({
      title: m ? 'Ubah Modul' : 'Tambah Modul',
      fields: [{ name: 'title', label: 'Judul modul', value: m ? m.title : 'Modul ' + (DB.modulesOf(p.id).length + 1) + ' – ', required: true, full: true }],
      onSubmit: function (v) {
        if (m) DB.update('modules', m.id, { title: v.title });
        else DB.insert('modules', { programId: p.id, title: v.title, order: DB.modulesOf(p.id).length + 1 });
        DB.log((m ? 'Mengubah' : 'Menambah') + ' modul "' + v.title + '"', 'module'); UI.toast('Modul disimpan.'); App.refresh();
      }
    });
  }

  function lessonForm(p, moduleId, l) {
    var mods = DB.modulesOf(p.id);
    var fields = [
      { name: 'title', label: 'Judul materi', value: l ? l.title : '', required: true, full: true },
      { name: 'moduleId', label: 'Modul', type: 'select', value: moduleId, options: mods.map(function (m) { return [m.id, m.title]; }) },
      { name: 'type', label: 'Jenis materi', type: 'select', value: l ? l.type : 'text', options: [['text', 'Teks / bacaan'], ['pdf', 'File PDF'], ['video', 'Video (link)'], ['link', 'Tautan eksternal']] },
      { name: 'pdfSource', label: 'Sumber PDF', type: 'select', value: l && l.type === 'pdf' && !l.fileId && l.url ? 'url' : 'upload', options: [['upload', 'Unggah file PDF'], ['url', 'Link PDF (Google Drive, dsb.)']], show: function (v) { return v.type === 'pdf'; } },
      { name: 'file', label: 'Unggah PDF (maks. 15 MB)', type: 'file', accept: 'application/pdf', current: l && l.fileName, show: function (v) { return v.type === 'pdf' && v.pdfSource === 'upload'; }, full: true },
      { name: 'url', label: 'URL', type: 'url', value: l ? l.url : '', placeholder: 'https://…', help: 'Video: link YouTube/Vimeo/MP4. Tautan: Google Docs, artikel, dsb.', show: function (v) { return v.type === 'video' || v.type === 'link' || (v.type === 'pdf' && v.pdfSource === 'url'); }, full: true },
      { name: 'content', label: 'Isi materi / deskripsi', type: 'textarea', rows: 9, value: l ? l.content : '', help: 'Format: "## Judul", "- poin", "**tebal**", "*miring*". Untuk PDF/video/tautan diisi sebagai pengantar.' },
      { name: 'duration', label: 'Estimasi durasi', value: l ? l.duration : '10 menit' },
      { name: 'required', label: 'Wajib diselesaikan (syarat kelulusan)', type: 'checkbox', value: l ? l.required : true },
      { name: 'published', label: 'Publikasikan ke peserta', type: 'checkbox', value: l ? l.published : true }
    ];
    UI.formModal({
      title: l ? 'Ubah Materi' : 'Tambah Materi', size: 'lg', fields: fields,
      onSubmit: function (v) {
        if (v.type === 'text' && !v.content) { UI.toast('Isi materi teks wajib diisi.', 'error'); return false; }
        if ((v.type === 'video' || v.type === 'link' || (v.type === 'pdf' && v.pdfSource === 'url')) && !/^https?:\/\//i.test(v.url)) { UI.toast('Masukkan URL yang valid (diawali http:// atau https://).', 'error'); return false; }
        if (v.type === 'pdf' && v.pdfSource === 'upload' && !v.file && !(l && l.fileId)) { UI.toast('Pilih file PDF untuk diunggah.', 'error'); return false; }
        return UI.storeFile(v.type === 'pdf' && v.pdfSource === 'upload' ? v.file : null, { pdfOnly: true, maxMB: 15 }).then(function (f) {
          var patch = { title: v.title, moduleId: v.moduleId, type: v.type, content: v.content, duration: v.duration, required: v.required, published: v.published, url: v.url || '' };
          if (v.type === 'pdf' && v.pdfSource === 'upload') {
            if (f) { if (l && l.fileId) DB.Files.del(l.fileId); patch.fileId = f.id; patch.fileName = f.name; }
            patch.url = '';
          } else { if (l && l.fileId) DB.Files.del(l.fileId); patch.fileId = null; patch.fileName = ''; }
          if (l) DB.update('lessons', l.id, patch);
          else { patch.order = DB.lessonsOf(v.moduleId, true).length + 1; DB.insert('lessons', patch); notifyLearners(p, 'Materi baru: "' + v.title + '" di ' + p.title); }
          DB.log((l ? 'Mengubah' : 'Menambah') + ' materi "' + v.title + '"', 'lesson');
          UI.toast('Materi disimpan.'); App.refresh();
        });
      }
    });
  }
  function notifyLearners(p, text) {
    DB.where('enrollments', function (e) { return e.programId === p.id; }).forEach(function (e) { DB.notify(e.userId, text, '#/learn/' + p.id); });
  }

  function assessmentForm(p, moduleId, a) {
    var mods = DB.modulesOf(p.id);
    var fields = [
      { name: 'title', label: 'Judul', value: a ? a.title : '', required: true, full: true },
      { name: 'type', label: 'Jenis', type: 'select', value: a ? a.type : (moduleId ? 'quiz' : 'posttest'), options: [['pretest', 'Pretest'], ['quiz', 'Kuis per modul'], ['posttest', 'Post-test'], ['assignment', 'Tugas praktik']] },
      { name: 'moduleId', label: 'Letak', type: 'select', value: moduleId || '', options: [['', 'Umum (awal/akhir program)']].concat(mods.map(function (m) { return [m.id, m.title]; })) },
      { name: 'source', label: 'Metode pengerjaan', type: 'select', value: a ? a.source : 'builtin', options: [['builtin', 'Soal di platform (pilihan ganda / jawaban esai untuk tugas)'], ['link', 'Tautan eksternal (Google Form, dsb.)'], ['pdf', 'File PDF (lembar soal)']] },
      { name: 'url', label: 'URL tautan / PDF', type: 'url', value: a ? a.url : '', placeholder: 'https://forms.google.com/…', show: function (v) { return v.source === 'link' || (v.source === 'pdf' && v.pdfSource === 'url'); }, full: true },
      { name: 'pdfSource', label: 'Sumber PDF', type: 'select', value: a && a.source === 'pdf' && !a.fileId && a.url ? 'url' : 'upload', options: [['upload', 'Unggah file PDF'], ['url', 'Link PDF']], show: function (v) { return v.source === 'pdf'; } },
      { name: 'file', label: 'Unggah PDF soal (maks. 15 MB)', type: 'file', accept: 'application/pdf', current: a && a.fileName, show: function (v) { return v.source === 'pdf' && v.pdfSource === 'upload'; }, full: true },
      { name: 'instructions', label: 'Instruksi', type: 'textarea', rows: 4, value: a ? a.instructions : '' },
      { name: 'passingScore', label: 'Nilai minimal lulus (0–100)', type: 'number', min: 0, max: 100, value: a ? a.passingScore : 70, required: true },
      { name: 'maxAttempts', label: 'Maks. percobaan (0 = tanpa batas)', type: 'number', min: 0, max: 20, value: a ? a.maxAttempts : 3, required: true },
      { name: 'dueAt', label: 'Tenggat (opsional)', type: 'datetime-local', value: a ? UI.toLocalInput(a.dueAt) : '' },
      { name: 'required', label: 'Wajib lulus untuk sertifikat', type: 'checkbox', value: a ? a.required : true },
      { name: 'published', label: 'Publikasikan ke peserta', type: 'checkbox', value: a ? a.published : true }
    ];
    UI.formModal({
      title: a ? 'Ubah Kuis / Assessment' : 'Tambah Kuis / Assessment', size: 'lg', fields: fields,
      onSubmit: function (v) {
        if ((v.source === 'link' || (v.source === 'pdf' && v.pdfSource === 'url')) && !/^https?:\/\//i.test(v.url)) { UI.toast('Masukkan URL yang valid.', 'error'); return false; }
        if (v.source === 'pdf' && v.pdfSource === 'upload' && !v.file && !(a && a.fileId)) { UI.toast('Pilih file PDF soal.', 'error'); return false; }
        return UI.storeFile(v.source === 'pdf' && v.pdfSource === 'upload' ? v.file : null, { pdfOnly: true }).then(function (f) {
          var patch = { title: v.title, type: v.type, moduleId: v.moduleId || null, source: v.source, instructions: v.instructions, passingScore: v.passingScore || 0, maxAttempts: v.maxAttempts || 0, dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : null, required: v.required, published: v.published, url: v.source === 'builtin' ? '' : (v.url || '') };
          if (v.source === 'pdf' && v.pdfSource === 'upload') { if (f) { if (a && a.fileId) DB.Files.del(a.fileId); patch.fileId = f.id; patch.fileName = f.name; } patch.url = ''; }
          else { if (a && a.fileId) DB.Files.del(a.fileId); patch.fileId = null; patch.fileName = ''; }
          var saved;
          if (a) saved = DB.update('assessments', a.id, patch);
          else { patch.programId = p.id; patch.questions = []; saved = DB.insert('assessments', patch); notifyLearners(p, TL()[v.type] + ' baru: "' + v.title + '"'); }
          DB.log((a ? 'Mengubah' : 'Menambah') + ' assessment "' + v.title + '"', 'assessment');
          UI.toast('Assessment disimpan.');
          if (!a && v.source === 'builtin' && v.type !== 'assignment') location.hash = '#/manage/assessment/' + saved.id; else App.refresh();
        });
      }
    });
  }

  /* ---------- Editor soal ---------- */
  Pages.editQuestions = function (params) {
    var a = DB.find('assessments', params.id);
    if (!a || scopePrograms().map(function (p) { return p.id; }).indexOf(a.programId) === -1) return Pages.notFound();
    var p = DB.find('programs', a.programId);
    var qs = JSON.parse(JSON.stringify(a.questions || []));
    function draw() {
      UI.$('#qlist').innerHTML = qs.length ? qs.map(function (q, i) {
        return '<div class="qedit" data-i="' + i + '"><div class="row between mb"><b>Soal ' + (i + 1) + '</b><div class="row"><label class="row" style="gap:.3rem;font-size:.85rem">Bobot <input type="number" min="1" max="10" value="' + (q.weight || 1) + '" data-w style="width:70px"></label><button class="btn btn-ghost btn-xs" data-delq aria-label="Hapus soal">' + icon('trash', 14) + '</button></div></div>' +
          '<label class="sr" for="qt' + i + '">Pertanyaan</label><textarea id="qt' + i + '" rows="2" data-t placeholder="Tulis pertanyaan…">' + esc(q.text) + '</textarea><p class="help mt" style="margin-bottom:.4rem">Pilih jawaban benar dengan tombol bulat:</p>' +
          q.options.map(function (o, j) {
            return '<div class="opt-row"><input type="radio" name="ans' + i + '" value="' + j + '"' + (q.answer === j ? ' checked' : '') + ' data-a aria-label="Jawaban benar ' + (j + 1) + '"><input value="' + esc(o) + '" data-o="' + j + '" placeholder="Pilihan ' + String.fromCharCode(65 + j) + '"><button class="btn btn-ghost btn-xs" data-delo="' + j + '"' + (q.options.length <= 2 ? ' disabled' : '') + ' aria-label="Hapus pilihan">' + icon('x', 13) + '</button></div>';
          }).join('') + '<button class="btn btn-ghost btn-xs" data-addo>' + icon('plus', 13) + ' Tambah pilihan</button></div>';
      }).join('') : UI.empty('Belum ada soal. Klik "Tambah Soal".');
    }
    var html = '<div class="card flat"><div class="row between"><div><small class="muted">' + esc(p.title) + '</small><h3 style="margin:0">' + esc(a.title) + '</h3><small class="muted">' + TL()[a.type] + ' • nilai minimal ' + a.passingScore + '</small></div><div class="row"><a class="btn btn-ghost" href="#/manage/content/' + esc(p.id) + '">← Kembali</a><button class="btn btn-ghost" id="bulk">' + icon('upload', 14) + ' Impor teks</button><button class="btn btn-soft" id="addq">' + icon('plus', 14) + ' Tambah Soal</button><button class="btn btn-primary" id="saveq">' + icon('check', 14) + ' Simpan Soal</button></div></div></div>' +
      '<div id="qlist"></div>';
    App.render(UI.appLayout(html, { title: 'Editor Soal', subtitle: a.title }));
    draw();
    var list = UI.$('#qlist');
    list.addEventListener('input', function (e) {
      var box = e.target.closest('[data-i]'); if (!box) return; var q = qs[Number(box.dataset.i)];
      if (e.target.matches('[data-t]')) q.text = e.target.value;
      if (e.target.matches('[data-o]')) q.options[Number(e.target.dataset.o)] = e.target.value;
      if (e.target.matches('[data-w]')) q.weight = Math.max(1, Number(e.target.value) || 1);
    });
    list.addEventListener('change', function (e) { var box = e.target.closest('[data-i]'); if (box && e.target.matches('[data-a]')) qs[Number(box.dataset.i)].answer = Number(e.target.value); });
    list.addEventListener('click', function (e) {
      var box = e.target.closest('[data-i]'); if (!box) return; var i = Number(box.dataset.i), q = qs[i];
      if (e.target.closest('[data-delq]')) { qs.splice(i, 1); draw(); }
      else if (e.target.closest('[data-addo]')) { q.options.push(''); draw(); }
      else if (e.target.closest('[data-delo]')) { var j = Number(e.target.closest('[data-delo]').dataset.delo); q.options.splice(j, 1); if (q.answer >= q.options.length) q.answer = 0; else if (q.answer > j) q.answer--; draw(); }
    });
    UI.$('#addq').onclick = function () { qs.push({ id: DB.uid('q'), text: '', options: ['', '', '', ''], answer: 0, weight: 1 }); draw(); var t = UI.$$('[data-t]'); t[t.length - 1].focus(); };
    UI.$('#bulk').onclick = function () {
      UI.formModal({
        title: 'Impor soal dari teks', size: 'lg', submitLabel: 'Impor',
        fields: [{ name: 'txt', label: 'Tempel soal', type: 'textarea', rows: 12, required: true, placeholder: 'Apa kepanjangan CTA?\n*A. Call To Action\nB. Content To Ads\nC. Copy Text Area\n\nSoal berikutnya…', help: 'Pisahkan tiap soal dengan baris kosong. Baris pertama = pertanyaan, baris berikutnya = pilihan. Beri tanda * di depan jawaban benar.' }],
        onSubmit: function (v) {
          var n = 0;
          v.txt.split(/\n\s*\n/).forEach(function (blk) {
            var lines = blk.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
            if (lines.length < 3) return;
            var ans = 0, opts = lines.slice(1).map(function (o, j) { if (o[0] === '*') { ans = j; o = o.slice(1).trim(); } return o.replace(/^[A-Ha-h][.)]\s*/, ''); });
            qs.push({ id: DB.uid('q'), text: lines[0].replace(/^\d+[.)]\s*/, ''), options: opts, answer: ans, weight: 1 }); n++;
          });
          draw(); UI.toast(n + ' soal diimpor. Jangan lupa klik "Simpan Soal".', 'info');
        }
      });
    };
    UI.$('#saveq').onclick = function () {
      var bad = qs.findIndex(function (q) { return !q.text.trim() || q.options.filter(function (o) { return o.trim(); }).length < 2 || !String(q.options[q.answer] || '').trim(); });
      if (bad > -1) return UI.toast('Soal ' + (bad + 1) + ' belum lengkap (pertanyaan, min. 2 pilihan, jawaban benar).', 'error');
      qs.forEach(function (q) { var correct = q.options[q.answer]; q.options = q.options.filter(function (o) { return o.trim(); }); q.answer = q.options.indexOf(correct); });
      a.questions = qs; DB.save(); DB.log('Memperbarui ' + qs.length + ' soal "' + a.title + '"', 'assessment');
      UI.toast('Soal tersimpan (' + qs.length + ' soal).'); draw();
    };
  };

  /* ---------- Pratinjau program (staf) ---------- */
  Pages.previewProgram = function (params, q) {
    var p = DB.find('programs', params.pid);
    if (!p) return Pages.notFound();
    var view;
    if (q.l) {
      var l = DB.find('lessons', q.l);
      view = '<div class="viewer"><h2>' + esc(l.title) + '</h2>' + Pages.lessonBody(l) + '</div>';
      setTimeout(function () { Pages.mountLessonFile(l); });
    } else if (q.a) {
      var a = DB.find('assessments', q.a);
      view = '<div class="viewer"><h2>' + esc(a.title) + '</h2><p class="muted">' + TL()[a.type] + ' • ' + SL()[a.source] + '</p>' + (a.instructions ? '<div class="notice">' + UI.md(a.instructions) + '</div>' : '') +
        (a.url ? '<p class="mt"><a target="_blank" rel="noopener" href="' + UI.safeUrl(a.url) + '">' + esc(a.url) + '</a></p>' : '') + (a.fileId ? '<button class="btn btn-ghost mt" data-pf>' + icon('file', 14) + ' Buka ' + esc(a.fileName) + '</button>' : '') +
        (a.questions || []).map(function (qq, i) { return '<div class="qcard mt"><h4>' + (i + 1) + '. ' + esc(qq.text) + '</h4>' + qq.options.map(function (o, j) { return '<div class="opt ' + (j === qq.answer ? 'correct' : '') + '">' + esc(o) + '</div>'; }).join('') + '</div>'; }).join('') + '</div>';
      setTimeout(function () { var b = UI.$('[data-pf]'); if (b) b.onclick = function () { UI.openStoredFile(a.fileId, a.fileName); }; });
    } else view = '<div class="viewer"><h2>Pratinjau: ' + esc(p.title) + '</h2><p class="muted">Pilih materi atau assessment di sebelah kiri untuk melihat tampilan peserta.</p></div>';
    App.render(UI.appLayout('<div class="classroom">' + Pages.syllabus(p, null, q.l, true) + view + '</div>', { title: 'Pratinjau Materi', subtitle: p.title, actions: me().role !== 'executive' ? '<a class="btn btn-ghost btn-sm" href="#/manage/content/' + esc(p.id) + '">← Kembali ke pengelolaan</a>' : '' }));
  };

  /* ---------- Penilaian tugas ---------- */
  Pages.grading = function (params, q) {
    var pids = scopePrograms().map(function (p) { return p.id; });
    var filter = q.status || 'submitted';
    var subs = DB.where('submissions', function (s) { var a = DB.find('assessments', s.assessmentId); return a && pids.indexOf(a.programId) > -1 && (filter === 'all' || s.status === filter); }).slice().reverse();
    var tabs = [['submitted', 'Menunggu Penilaian'], ['graded', 'Sudah Dinilai'], ['all', 'Semua']];
    var html = '<div class="tabs">' + tabs.map(function (t) { return '<a class="tab ' + (filter === t[0] ? 'on' : '') + '" href="#/grading?status=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>' +
      '<div class="card">' + (subs.length ? '<div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Assessment</th><th>Dikirim</th><th>Status</th><th>Nilai</th><th></th></tr></thead><tbody>' + subs.map(function (s) {
        var l = DB.find('users', s.userId), a = DB.find('assessments', s.assessmentId), p = DB.find('programs', a.programId);
        return '<tr><td><div class="cell-user">' + UI.avatar(l, 32) + '<div><b>' + esc(l ? l.name : '-') + '</b><small>' + esc(l ? l.email : '') + '</small></div></div></td><td><b>' + esc(a.title) + '</b><br><small class="muted">' + esc(p ? p.title : '') + '</small></td><td>' + UI.fmtDate(s.submittedAt, true) + '</td><td>' + UI.statusBadge(s.status) + '</td><td><b>' + (s.score != null ? s.score : '-') + '</b></td><td><button class="btn btn-soft btn-sm" data-grade="' + esc(s.id) + '">' + (s.status === 'graded' ? 'Ubah' : 'Nilai') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' : UI.empty('Tidak ada submission pada kategori ini.')) + '</div>';
    App.render(UI.appLayout(html, { title: 'Penilaian Tugas & Feedback', subtitle: 'Periksa jawaban peserta dan berikan nilai serta umpan balik' }));
  };
  // handler global tombol nilai (dipakai juga di dashboard)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-grade]'); if (!b) return;
    gradeModal(DB.find('submissions', b.dataset.grade));
  });
  function gradeModal(s) {
    if (!s) return;
    var l = DB.find('users', s.userId), a = DB.find('assessments', s.assessmentId);
    var info = '<div class="card flat mb"><div class="cell-user">' + UI.avatar(l, 40) + '<div><b>' + esc(l ? l.name : '') + '</b><small>' + esc(a.title) + ' • ' + UI.fmtDate(s.submittedAt, true) + '</small></div></div>' +
      (s.text ? '<h4 class="mt">Jawaban</h4><div class="prose" style="background:var(--bg-2);padding:.8rem 1rem;border-radius:10px;white-space:pre-wrap;font-size:.92rem">' + esc(s.text) + '</div>' : '') +
      (s.url ? '<p class="mt"><b>Tautan:</b> <a href="' + UI.safeUrl(s.url) + '" target="_blank" rel="noopener">' + esc(s.url) + '</a></p>' : '') +
      (s.fileId ? '<p class="mt"><button type="button" class="btn btn-ghost btn-sm" id="sfile">' + icon('file', 14) + ' Buka lampiran: ' + esc(s.fileName) + '</button></p>' : '') + '</div>';
    UI.formModal({
      title: 'Penilaian', size: 'lg', submitLabel: 'Simpan Nilai',
      fields: [{ name: 'info', type: 'html', html: info }, { name: 'score', label: 'Nilai (0–100)', type: 'number', min: 0, max: 100, required: true, value: s.score }, { name: 'pass', type: 'html', html: '<div style="padding-top:1.8rem" class="muted">Nilai minimal lulus: <b>' + a.passingScore + '</b></div>' }, { name: 'feedback', label: 'Feedback untuk peserta', type: 'textarea', rows: 4, value: s.feedback, required: true }],
      onOpen: function (w) { var f = w.querySelector('#sfile'); if (f) f.onclick = function () { UI.openStoredFile(s.fileId, s.fileName); }; },
      onSubmit: function (v) {
        if (v.score == null || v.score < 0 || v.score > 100) { UI.toast('Nilai harus 0–100.', 'error'); return false; }
        Object.assign(s, { score: v.score, feedback: v.feedback, status: 'graded', gradedAt: new Date().toISOString(), gradedBy: me().id }); DB.save();
        DB.notify(s.userId, a.title + ' telah dinilai: ' + v.score + '. Lihat feedback trainer.', '#/assessment/' + a.id);
        DB.log('Menilai ' + a.title + ' milik ' + (l ? l.name : ''), 'submission');
        var c = DB.checkCompletion(s.userId, a.programId);
        UI.toast('Nilai disimpan' + (c ? ' • sertifikat peserta terbit' : '') + '.'); App.refresh();
      }
    });
  }

  /* ---------- Progres peserta ---------- */
  Pages.learnersProgress = function (params, q) {
    var u = me(), progs = scopePrograms(u), pid = q.p || '';
    var pids = progs.map(function (p) { return p.id; });
    var ens = DB.where('enrollments', function (e) { return pids.indexOf(e.programId) > -1 && (!pid || e.programId === pid); });
    var canManage = u.role !== 'trainer';
    var html = '<div class="card flat"><div class="row"><label for="pf"><b>Filter program:</b></label><select id="pf" style="max-width:360px"><option value="">Semua program</option>' + progs.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === pid ? ' selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') + '</select><span class="grow"></span><button class="btn btn-ghost btn-sm" id="csv">' + icon('download', 14) + ' Ekspor CSV</button></div></div>' +
      '<div class="card">' + (ens.length ? '<div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Program / Kelas</th><th>Progres</th><th>Pretest</th><th>Post-test</th><th>Sertifikat</th><th></th></tr></thead><tbody>' + ens.map(function (e) {
        var l = DB.find('users', e.userId), p = DB.find('programs', e.programId), k = DB.find('classes', e.classId);
        if (!l || !p) return '';
        var as = DB.assessmentsOf(p.id), pre = as.find(function (a) { return a.type === 'pretest'; }), post = as.find(function (a) { return a.type === 'posttest'; });
        var pr = DB.programProgress(l.id, p.id), c = DB.certificateOf(l.id, p.id);
        return '<tr><td><div class="cell-user">' + UI.avatar(l, 32) + '<div><b>' + esc(l.name) + '</b><small>' + esc(l.email) + '</small></div></div></td><td>' + esc(p.title) + '<br><small class="muted">' + esc(k ? k.name : '') + '</small></td><td style="min-width:130px">' + UI.progressBar(pr) + '<small>' + pr + '%</small>' + (pr < 50 && !c ? ' ' + UI.badge('Perlu tindak lanjut', 'amber') : '') + '</td><td>' + (pre ? (DB.assessmentStatus(l.id, pre).score != null ? DB.assessmentStatus(l.id, pre).score : '-') : '-') + '</td><td>' + (post ? (DB.assessmentStatus(l.id, post).score != null ? DB.assessmentStatus(l.id, post).score : '-') : '-') + '</td><td>' + (c ? UI.badge('Terbit', 'green') : '-') + '</td>' +
          '<td><div class="row"><button class="btn btn-ghost btn-xs" data-remind="' + esc(l.id) + '" data-p="' + esc(p.id) + '">Ingatkan</button>' + (canManage ? '<button class="btn btn-ghost btn-xs" data-unenroll="' + esc(e.id) + '" aria-label="Keluarkan dari kelas">' + icon('trash', 13) + '</button>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div>' : UI.empty('Belum ada peserta.')) + '</div>';
    App.render(UI.appLayout(html, { title: u.role === 'trainer' ? 'Progres Peserta' : 'Peserta & Progres', subtitle: ens.length + ' pendaftaran' }));
    UI.$('#pf').onchange = function (e) { location.hash = '#/manage/learners' + (e.target.value ? '?p=' + e.target.value : ''); };
    bindRemind();
    UI.$$('[data-unenroll]').forEach(function (b) { b.onclick = function () { UI.confirm('Keluarkan peserta dari kelas ini?', function () { DB.remove('enrollments', b.dataset.unenroll); DB.log('Mengeluarkan peserta dari kelas', 'enrollment'); UI.toast('Peserta dikeluarkan.'); App.refresh(); }, 'Keluarkan'); }; });
    UI.$('#csv').onclick = function () {
      var rows = [['Nama', 'Email', 'Program', 'Kelas', 'Progres (%)', 'Sertifikat']];
      ens.forEach(function (e) { var l = DB.find('users', e.userId), p = DB.find('programs', e.programId), k = DB.find('classes', e.classId); if (l && p) rows.push([l.name, l.email, p.title, k ? k.name : '', DB.programProgress(l.id, p.id), DB.certificateOf(l.id, p.id) ? 'Ya' : 'Tidak']); });
      downloadCSV('progres-peserta.csv', rows);
    };
  };
  function downloadCSV(name, rows) {
    var csv = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); if (/^[=+\-@]/.test(c)) c = "'" + c; return '"' + c.replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = name; a.click();
  }
  Pages.downloadCSV = downloadCSV;

  /* ---------- Jadwal mengajar ---------- */
  Pages.schedule = function () {
    var u = me(), classes = u.role === 'trainer' ? DB.where('classes', function (k) { return k.trainerId === u.id; }) : scopeClasses(u);
    var html = '<div class="grid-21"><div class="card"><div class="card-title"><h3>Sesi Mendatang</h3></div>' + Pages.sessionList(Pages.upcomingSessions(classes.map(function (k) { return k.id; }))) + '</div>' +
      '<div class="card"><div class="card-title"><h3>Kelas yang Diampu</h3></div><div class="list">' + classes.map(function (k) { var p = DB.find('programs', k.programId); return '<div class="list-item"><div class="li-ic">' + icon('cal') + '</div><div class="li-b"><b>' + esc(p ? p.title : '') + '</b><small>' + esc(k.name) + ' • ' + UI.fmtDate(k.startAt) + ' – ' + UI.fmtDate(k.endAt) + '</small></div>' + UI.statusBadge(k.status) + '</div>'; }).join('') + '</div></div></div>';
    App.render(UI.appLayout(html, { title: 'Jadwal Mengajar' }));
  };

  /* ---------- Kelas & Jadwal (Coach/Admin) ---------- */
  Pages.manageClasses = function () {
    var classes = DB.all('classes');
    var html = '<div class="card">' + (classes.length ? '<div class="table-wrap"><table><thead><tr><th>Program / Kelas</th><th>Trainer</th><th>Jadwal</th><th>Format</th><th>Peserta</th><th>Status</th><th></th></tr></thead><tbody>' + classes.map(function (k) {
      var p = DB.find('programs', k.programId), t = DB.find('users', k.trainerId), n = DB.where('enrollments', function (e) { return e.classId === k.id; }).length;
      return '<tr><td><b>' + esc(p ? p.title : '-') + '</b><br><small class="muted">' + esc(k.name) + '</small></td><td>' + esc(t ? t.name : '-') + '</td><td><small>' + UI.fmtDate(k.startAt) + ' – ' + UI.fmtDate(k.endAt) + '<br>' + (k.sessions || []).length + ' sesi</small></td><td><small>' + esc(k.mode) + '<br>' + esc(k.location || '') + '</small></td><td>' + n + '/' + k.capacity + '</td><td>' + UI.statusBadge(k.status) + '</td>' +
        '<td><div class="row"><button class="btn btn-soft btn-xs" data-sess="' + esc(k.id) + '">' + icon('cal', 13) + ' Sesi</button><button class="btn btn-ghost btn-xs" data-editk="' + esc(k.id) + '" aria-label="Ubah">' + icon('edit', 14) + '</button><button class="btn btn-ghost btn-xs" data-delk="' + esc(k.id) + '" aria-label="Hapus">' + icon('trash', 14) + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div>' : UI.empty('Belum ada kelas.')) + '</div>';
    App.render(UI.appLayout(html, { title: 'Kelas, Jadwal & Kuota', subtitle: 'Atur batch, trainer, kapasitas, dan status pendaftaran', actions: '<button class="btn btn-primary" id="addk">' + icon('plus', 16) + ' Tambah Kelas</button>' }));
    UI.$('#addk').onclick = function () { classForm(null); };
    UI.$$('[data-editk]').forEach(function (b) { b.onclick = function () { classForm(DB.find('classes', b.dataset.editk)); }; });
    UI.$$('[data-delk]').forEach(function (b) {
      b.onclick = function () {
        var n = DB.where('enrollments', function (e) { return e.classId === b.dataset.delk; }).length;
        if (n) return UI.toast('Kelas memiliki ' + n + ' peserta. Ubah status menjadi "Selesai" atau pindahkan peserta terlebih dahulu.', 'error');
        UI.confirm('Hapus kelas ini?', function () { DB.remove('classes', b.dataset.delk); DB.log('Menghapus kelas', 'class'); UI.toast('Kelas dihapus.'); App.refresh(); }, 'Hapus');
      };
    });
    UI.$$('[data-sess]').forEach(function (b) { b.onclick = function () { sessionsModal(DB.find('classes', b.dataset.sess)); }; });
  };
  function classForm(k) {
    UI.formModal({
      title: k ? 'Ubah Kelas' : 'Tambah Kelas', size: 'lg',
      fields: [
        { name: 'programId', label: 'Program', type: 'select', value: k ? k.programId : '', options: DB.all('programs').map(function (p) { return [p.id, p.title]; }), required: true },
        { name: 'name', label: 'Nama batch / kelas', value: k ? k.name : 'Batch ', required: true },
        { name: 'trainerId', label: 'Trainer', type: 'select', value: k ? k.trainerId : '', options: trainerOptions() },
        { name: 'mode', label: 'Format', type: 'select', value: k ? k.mode : 'Self-paced + Live', options: [['Self-paced', 'Self-paced (mandiri)'], ['Self-paced + Live', 'Self-paced + Live'], ['Kelas Live Daring', 'Kelas Live Daring'], ['Workshop Tatap Muka', 'Workshop Tatap Muka']] },
        { name: 'startAt', label: 'Mulai', type: 'date', value: k ? (k.startAt || '').slice(0, 10) : '', required: true },
        { name: 'endAt', label: 'Selesai', type: 'date', value: k ? (k.endAt || '').slice(0, 10) : '', required: true },
        { name: 'capacity', label: 'Kapasitas peserta', type: 'number', min: 1, value: k ? k.capacity : 30, required: true },
        { name: 'status', label: 'Status', type: 'select', value: k ? k.status : 'draft', options: [['draft', 'Draft'], ['published', 'Published (pendaftaran dibuka)'], ['closed', 'Pendaftaran ditutup'], ['ongoing', 'Berlangsung'], ['completed', 'Selesai']] },
        { name: 'location', label: 'Lokasi / platform', value: k ? k.location : '' },
        { name: 'meetingLink', label: 'Link meeting (opsional)', type: 'url', value: k ? k.meetingLink : '' }
      ],
      onSubmit: function (v) {
        if (new Date(v.endAt) < new Date(v.startAt)) { UI.toast('Tanggal selesai harus setelah tanggal mulai.', 'error'); return false; }
        var patch = Object.assign({}, v, { startAt: new Date(v.startAt + 'T09:00').toISOString(), endAt: new Date(v.endAt + 'T17:00').toISOString() });
        if (k) DB.update('classes', k.id, patch); else { patch.sessions = []; DB.insert('classes', patch); }
        if (v.trainerId && (!k || k.trainerId !== v.trainerId)) DB.notify(v.trainerId, 'Anda ditugaskan mengajar kelas ' + v.name + '.', '#/schedule');
        DB.log((k ? 'Mengubah' : 'Membuat') + ' kelas ' + v.name, 'class'); UI.toast('Kelas disimpan.'); App.refresh();
      }
    });
  }
  function sessionsModal(k) {
    function body() {
      return '<div class="list">' + ((k.sessions || []).map(function (s, i) { return '<div class="list-item"><div class="li-ic">' + icon('cal') + '</div><div class="li-b"><b>' + esc(s.title) + '</b><small>' + UI.fmtDate(s.at, true) + '</small></div><button class="btn btn-ghost btn-xs" data-dels="' + i + '" aria-label="Hapus sesi">' + icon('trash', 13) + '</button></div>'; }).join('') || '<p class="muted">Belum ada sesi.</p>') + '</div>' +
        '<form id="sf" class="form-grid mt" novalidate>' + UI.fieldHTML({ name: 'title', label: 'Judul sesi', required: true }) + UI.fieldHTML({ name: 'at', label: 'Waktu', type: 'datetime-local', required: true }) + '<div class="field full"><button class="btn btn-primary btn-sm">' + icon('plus', 14) + ' Tambah Sesi</button></div></form>';
    }
    UI.modal({
      title: 'Sesi Live / Workshop – ' + k.name, size: 'lg', body: '<div id="sbody">' + body() + '</div>',
      onOpen: function (w) {
        var bind = function () {
          w.querySelector('#sf').onsubmit = function (e) {
            e.preventDefault(); var f = e.target; if (!f.title.value || !f.at.value) return UI.toast('Lengkapi judul dan waktu.', 'error');
            k.sessions = k.sessions || []; k.sessions.push({ title: f.title.value, at: new Date(f.at.value).toISOString() }); k.sessions.sort(function (a, b) { return new Date(a.at) - new Date(b.at); }); DB.save();
            DB.where('enrollments', function (en) { return en.classId === k.id; }).forEach(function (en) { DB.notify(en.userId, 'Jadwal baru: ' + f.title.value + ' (' + UI.fmtDate(new Date(f.at.value).toISOString(), true) + ')', '#/dashboard'); });
            UI.toast('Sesi ditambahkan & peserta diberi notifikasi.'); w.querySelector('#sbody').innerHTML = body(); bind();
          };
          UI.$$('[data-dels]', w).forEach(function (b) { b.onclick = function () { k.sessions.splice(Number(b.dataset.dels), 1); DB.save(); w.querySelector('#sbody').innerHTML = body(); bind(); }; });
        };
        bind();
        w.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) App.refresh(); });
      }
    });
  }

  /* ---------- Laporan & analitik ---------- */
  Pages.reports = function () {
    var progs = DB.all('programs'), ens = DB.all('enrollments'), users = DB.all('users');
    var learners = users.filter(function (u) { return u.role === 'learner'; });
    var activeL = learners.filter(function (l) { return ens.some(function (e) { return e.userId === l.id && e.status === 'active'; }); });
    var certs = DB.all('certificates');
    // tren 6 bulan
    var labels = [], reg = [], comp = [];
    var BUL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      var m = d.getMonth(), y = d.getFullYear();
      labels.push(BUL[m]);
      reg.push(ens.filter(function (e) { var x = new Date(e.enrolledAt); return x.getMonth() === m && x.getFullYear() === y; }).length);
      comp.push(certs.filter(function (c) { var x = new Date(c.issuedAt); return x.getMonth() === m && x.getFullYear() === y; }).length);
    }
    var rows = progs.map(function (p) {
      var pe = ens.filter(function (e) { return e.programId === p.id; });
      var pc = certs.filter(function (c) { return c.programId === p.id; }).length;
      var post = DB.assessmentsOf(p.id, true).find(function (a) { return a.type === 'posttest'; });
      var pre = DB.assessmentsOf(p.id, true).find(function (a) { return a.type === 'pretest'; });
      var avgOf = function (a) { if (!a) return null; var sc = pe.map(function (e) { return DB.assessmentStatus(e.userId, a).score; }).filter(function (x) { return x != null; }); return sc.length ? Math.round(sc.reduce(function (s, x) { return s + x; }, 0) / sc.length) : null; };
      var rated = pe.filter(function (e) { return e.rating; });
      return { p: p, n: pe.length, done: pc, rate: pe.length ? Math.round(pc / pe.length * 100) : 0, pre: avgOf(pre), post: avgOf(post), sat: rated.length ? (rated.reduce(function (s, e) { return s + e.rating; }, 0) / rated.length).toFixed(1) : '-' };
    });
    var trainers = users.filter(function (u) { return u.role === 'trainer' || u.role === 'coach'; }).map(function (t) {
      var ks = DB.where('classes', function (k) { return k.trainerId === t.id; });
      var te = ens.filter(function (e) { return ks.some(function (k) { return k.id === e.classId; }); });
      var graded = DB.where('submissions', function (s) { return s.gradedBy === t.id; }).length;
      var rated = te.filter(function (e) { return e.rating; });
      return { t: t, classes: ks.length, learners: te.length, graded: graded, sat: rated.length ? (rated.reduce(function (s, e) { return s + e.rating; }, 0) / rated.length).toFixed(1) : '-' };
    }).filter(function (x) { return x.classes; });
    var allPost = rows.filter(function (r) { return r.post != null; });
    var avgPost = allPost.length ? Math.round(allPost.reduce(function (s, r) { return s + r.post; }, 0) / allPost.length) : '-';
    var rated = ens.filter(function (e) { return e.rating; });
    var sat = rated.length ? (rated.reduce(function (s, e) { return s + e.rating; }, 0) / rated.length).toFixed(1) : '-';

    var html = '<div class="stats">' + UI.stat('Peserta terdaftar', learners.length, 'users') + UI.stat('Peserta aktif', activeL.length, 'activity') + UI.stat('Sertifikat terbit', certs.length, 'award') + UI.stat('Rata-rata post-test', avgPost, 'quiz') + UI.stat('Kepuasan peserta', sat + ' / 5', 'star') + '</div>' +
      '<div class="card"><div class="card-title"><h3>Tren Pendaftaran & Penyelesaian (6 bulan)</h3></div>' + UI.lineChart(labels, [{ name: 'Pendaftaran', values: reg }, { name: 'Penyelesaian (sertifikat)', values: comp }], { label: 'Tren pendaftaran dan penyelesaian' }) + '</div>' +
      '<div class="grid2"><div class="card"><div class="card-title"><h3>Pendaftar per Program</h3></div>' + UI.barChart(rows.map(function (r) { return { label: r.p.title, value: r.n }; }).sort(function (a, b) { return b.value - a.value; })) + '</div>' +
      '<div class="card"><div class="card-title"><h3>Tingkat Penyelesaian</h3></div>' + UI.barChart(rows.map(function (r) { return { label: r.p.title, value: r.rate }; }).sort(function (a, b) { return b.value - a.value; }), { suffix: '%', max: 100 }) + '</div></div>' +
      '<div class="card"><div class="card-title"><h3>Kinerja Program</h3><button class="btn btn-ghost btn-sm" id="csvp">' + icon('download', 14) + ' Ekspor CSV</button></div><div class="table-wrap"><table><thead><tr><th>Program</th><th>Status</th><th>Pendaftar</th><th>Selesai</th><th>Penyelesaian</th><th>Rata-rata pretest</th><th>Rata-rata post-test</th><th>Kepuasan</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td><b>' + esc(r.p.title) + '</b></td><td>' + UI.statusBadge(r.p.status) + '</td><td>' + r.n + '</td><td>' + r.done + '</td><td>' + r.rate + '%</td><td>' + (r.pre != null ? r.pre : '-') + '</td><td>' + (r.post != null ? r.post : '-') + '</td><td>' + r.sat + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-title"><h3>Ringkasan Performa Trainer</h3></div><div class="table-wrap"><table><thead><tr><th>Trainer</th><th>Kelas</th><th>Peserta</th><th>Tugas dinilai</th><th>Kepuasan</th></tr></thead><tbody>' +
      (trainers.map(function (x) { return '<tr><td><div class="cell-user">' + UI.avatar(x.t, 30) + '<div><b>' + esc(x.t.name) + '</b><small>' + esc(ROLES[x.t.role]) + '</small></div></div></td><td>' + x.classes + '</td><td>' + x.learners + '</td><td>' + x.graded + '</td><td>' + x.sat + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="muted">Belum ada data.</td></tr>') + '</tbody></table></div></div>';
    App.render(UI.appLayout(html, { title: me().role === 'executive' ? 'Laporan Kinerja' : 'Laporan & Analitik', subtitle: 'Ringkasan peserta, program, evaluasi, dan trainer', actions: '<button class="btn btn-ghost btn-sm" onclick="window.print()">' + icon('download', 14) + ' Cetak laporan</button>' }));
    UI.$('#csvp').onclick = function () { downloadCSV('laporan-program.csv', [['Program', 'Status', 'Pendaftar', 'Selesai', 'Penyelesaian (%)', 'Rata-rata pretest', 'Rata-rata post-test', 'Kepuasan']].concat(rows.map(function (r) { return [r.p.title, r.p.status, r.n, r.done, r.rate, r.pre, r.post, r.sat]; }))); };
  };
})();
