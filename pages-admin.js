/* =========================================================
   Area Administrator System & Executive Viewer
   ========================================================= */
(function () {
  'use strict';
  var Pages = window.Pages;
  var esc = UI.esc, icon = UI.icon;
  function me() { return Auth.user(); }

  /* ---------- Dashboard Admin ---------- */
  Pages.dashAdmin = function () {
    var users = DB.all('users'), cnt = function (r) { return users.filter(function (u) { return u.role === r; }).length; };
    var ens = DB.all('enrollments');
    var activeL = users.filter(function (u) { return u.role === 'learner' && ens.some(function (e) { return e.userId === u.id && e.status === 'active'; }); }).length;
    var logs = DB.all('logs').slice(0, 8);
    var msgs = (DB.data.messages || []).filter(function (m) { return !m.read; }).length;
    var html = '<div class="stats">' + UI.stat('Total akun', users.length, 'users', cnt('learner') + ' learner • ' + (cnt('trainer') + cnt('coach')) + ' trainer/coach') + UI.stat('Peserta aktif', activeL, 'activity') + UI.stat('Program', DB.all('programs').length, 'book', DB.where('programs', function (p) { return p.status === 'published'; }).length + ' dipublikasikan') + UI.stat('Sertifikat terbit', DB.all('certificates').length, 'award') + '</div>' +
      '<div class="grid3">' +
      '<div class="card"><div class="card-title"><h3>Learning Overview</h3></div><dl class="kv"><dt>Kelas</dt><dd>' + DB.all('classes').length + '</dd><dt>Modul</dt><dd>' + DB.all('modules').length + '</dd><dt>Materi</dt><dd>' + DB.all('lessons').length + '</dd><dt>Kuis & assessment</dt><dd>' + DB.all('assessments').length + '</dd><dt>Tugas menunggu nilai</dt><dd>' + DB.where('submissions', function (s) { return s.status === 'submitted'; }).length + '</dd></dl><a class="btn btn-soft btn-sm mt" href="#/manage/content">Kelola materi</a></div>' +
      '<div class="card"><div class="card-title"><h3>Konten Website</h3></div><dl class="kv"><dt>Artikel</dt><dd>' + DB.all('articles').length + '</dd><dt>Testimoni</dt><dd>' + DB.all('testimonials').length + '</dd><dt>FAQ</dt><dd>' + DB.all('faqs').length + '</dd><dt>Pengumuman</dt><dd>' + DB.all('announcements').length + '</dd><dt>Pesan baru</dt><dd>' + msgs + '</dd></dl><a class="btn btn-soft btn-sm mt" href="#/admin/cms">Kelola konten</a></div>' +
      '<div class="card"><div class="card-title"><h3>Akses Cepat</h3></div><div class="list">' +
      [['#/admin/settings', 'cog', 'Pengaturan website', 'Nama, logo, kontak, profil'], ['#/admin/users', 'users', 'Pengguna & role', 'Tambah, ubah, nonaktifkan'], ['#/admin/programs', 'book', 'Program & kategori', 'Katalog pelatihan'], ['#/admin/certificates', 'award', 'Sertifikat', 'Terbitkan & verifikasi']].map(function (x) { return '<a class="list-item" href="' + x[0] + '" style="color:inherit;text-decoration:none"><div class="li-ic">' + icon(x[1]) + '</div><div class="li-b"><b>' + x[2] + '</b><small>' + x[3] + '</small></div>' + icon('arrow', 14) + '</a>'; }).join('') + '</div></div></div>' +
      '<div class="card"><div class="card-title"><h3>Aktivitas Sistem Terbaru</h3><a class="btn btn-ghost btn-sm" href="#/admin/logs">Semua log</a></div>' + logList(logs) + '</div>';
    App.render(UI.appLayout(html, { title: 'Dashboard Administrator', subtitle: 'Ringkasan pengguna, pembelajaran, konten, dan sistem' }));
  };
  function logList(logs) {
    if (!logs.length) return UI.empty('Belum ada aktivitas.');
    return '<div class="list">' + logs.map(function (l) { var u = DB.find('users', l.userId); return '<div class="list-item"><div class="li-ic">' + icon('activity') + '</div><div class="li-b"><b>' + esc(l.action) + '</b><small>' + esc(u ? u.name + ' (' + ROLES[u.role] + ')' : 'Sistem') + ' • ' + UI.fmtDate(l.date, true) + '</small></div>' + (l.entity ? UI.badge(l.entity, 'gray') : '') + '</div>'; }).join('') + '</div>';
  }

  /* ---------- Executive Dashboard ---------- */
  Pages.dashExecutive = function () { Pages.reports(); var t = UI.$('.app-title h1'); if (t) t.textContent = 'Executive Dashboard'; };

  /* ---------- Pengguna & role ---------- */
  Pages.adminUsers = function (params, q) {
    var term = (q.q || '').toLowerCase(), role = q.role || '';
    var list = DB.where('users', function (u) { return (!role || u.role === role) && (!term || (u.name + u.email + u.username).toLowerCase().indexOf(term) > -1); });
    var html = '<div class="filters"><form class="search" id="us">' + icon('search', 16) + '<label class="sr" for="uq">Cari</label><input id="uq" type="search" placeholder="Cari nama, email, username…" value="' + esc(q.q || '') + '"></form><label class="sr" for="ur">Role</label><select id="ur" style="width:auto"><option value="">Semua role</option>' + Object.keys(ROLES).map(function (r) { return '<option value="' + r + '"' + (r === role ? ' selected' : '') + '>' + ROLES[r] + '</option>'; }).join('') + '</select></div>' +
      '<div class="card"><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Username</th><th>Role</th><th>Status</th><th>Kelas</th><th>Bergabung</th><th></th></tr></thead><tbody>' + list.map(function (u) {
        var n = DB.where('enrollments', function (e) { return e.userId === u.id; }).length;
        return '<tr><td><div class="cell-user">' + UI.avatar(u, 32) + '<div><b>' + esc(u.name) + '</b><small>' + esc(u.email) + '</small></div></div></td><td><code>' + esc(u.username) + '</code></td><td>' + UI.badge(ROLES[u.role], u.role === 'admin' ? 'dark' : 'purple') + '</td><td>' + UI.statusBadge(u.status) + '</td><td>' + n + '</td><td>' + UI.fmtDate(u.createdAt) + '</td>' +
          '<td><div class="row"><button class="btn btn-ghost btn-xs" data-hist="' + esc(u.id) + '">Riwayat</button><button class="btn btn-ghost btn-xs" data-edit="' + esc(u.id) + '" aria-label="Ubah">' + icon('edit', 14) + '</button>' + (u.id !== me().id ? '<button class="btn btn-ghost btn-xs" data-toggle="' + esc(u.id) + '">' + (u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan') + '</button><button class="btn btn-ghost btn-xs" data-del="' + esc(u.id) + '" aria-label="Hapus">' + icon('trash', 14) + '</button>' : '') + '</div></td></tr>';
      }).join('') + '</tbody></table></div><p class="muted mt" style="margin-bottom:0">' + list.length + ' akun</p></div>';
    App.render(UI.appLayout(html, { title: 'Manajemen Pengguna & Role', actions: '<button class="btn btn-primary" id="addu">' + icon('plus', 16) + ' Tambah Pengguna</button>' }));
    var nav = function () { var qq = UI.$('#uq').value.trim(), r = UI.$('#ur').value; location.hash = '#/admin/users?' + (qq ? 'q=' + encodeURIComponent(qq) + '&' : '') + (r ? 'role=' + r : ''); };
    UI.$('#us').onsubmit = function (e) { e.preventDefault(); nav(); };
    UI.$('#ur').onchange = nav;
    UI.$('#addu').onclick = function () { userForm(null); };
    UI.$$('[data-edit]').forEach(function (b) { b.onclick = function () { userForm(DB.find('users', b.dataset.edit)); }; });
    UI.$$('[data-toggle]').forEach(function (b) { b.onclick = function () { var u = DB.find('users', b.dataset.toggle); u.status = u.status === 'active' ? 'inactive' : 'active'; DB.save(); DB.log((u.status === 'active' ? 'Mengaktifkan' : 'Menonaktifkan') + ' akun ' + u.username, 'user'); UI.toast('Status akun diperbarui.'); App.refresh(); }; });
    UI.$$('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var u = DB.find('users', b.dataset.del);
        UI.confirm('Hapus akun ' + u.name + '? Seluruh data pendaftaran, progres, dan nilai akun ini juga akan dihapus.', function () {
          ['enrollments', 'attempts', 'submissions', 'notifications'].forEach(function (t) { DB.data[t] = DB.data[t].filter(function (x) { return x.userId !== u.id; }); });
          DB.data.progress = DB.data.progress.filter(function (x) { return x.userId !== u.id; });
          DB.remove('users', u.id); DB.log('Menghapus akun ' + u.username, 'user'); UI.toast('Akun dihapus.'); App.refresh();
        }, 'Hapus Akun');
      };
    });
    UI.$$('[data-hist]').forEach(function (b) {
      b.onclick = function () {
        var u = DB.find('users', b.dataset.hist), ens = DB.where('enrollments', function (e) { return e.userId === u.id; }), logs = DB.where('logs', function (l) { return l.userId === u.id; }).slice(0, 10);
        UI.modal({
          title: 'Riwayat – ' + u.name, size: 'lg',
          body: '<h4>Kelas</h4>' + (ens.length ? '<div class="list">' + ens.map(function (e) { var p = DB.find('programs', e.programId); return '<div class="list-item"><div class="li-ic">' + icon('book') + '</div><div class="li-b"><b>' + esc(p ? p.title : '') + '</b><small>Daftar ' + UI.fmtDate(e.enrolledAt) + '</small></div><b>' + DB.programProgress(u.id, e.programId) + '%</b></div>'; }).join('') + '</div>' : '<p class="muted">Tidak ada.</p>') +
            '<h4 class="mt">Aktivitas</h4>' + logList(logs)
        });
      };
    });
  };
  function userForm(u) {
    UI.formModal({
      title: u ? 'Ubah Pengguna' : 'Tambah Pengguna',
      fields: [
        { name: 'name', label: 'Nama lengkap', value: u ? u.name : '', required: true, full: true },
        { name: 'username', label: 'Username', value: u ? u.username : '', required: true },
        { name: 'email', label: 'Email', type: 'email', value: u ? u.email : '', required: true },
        { name: 'phone', label: 'Telepon', value: u ? u.phone : '' },
        { name: 'role', label: 'Role', type: 'select', value: u ? u.role : 'learner', options: Object.keys(ROLES).map(function (r) { return [r, ROLES[r]]; }) },
        { name: 'expertise', label: 'Keahlian (untuk trainer/coach)', value: u ? u.expertise : '', full: true },
        { name: 'password', label: u ? 'Kata sandi baru (kosongkan bila tidak diubah)' : 'Kata sandi', type: 'password', required: !u, help: 'Minimal 8 karakter dengan huruf dan angka.', full: true },
        { name: 'status', label: 'Status', type: 'select', value: u ? u.status : 'active', options: [['active', 'Aktif'], ['inactive', 'Nonaktif']] }
      ],
      onSubmit: function (v) {
        var dup = DB.all('users').some(function (x) { return (!u || x.id !== u.id) && (x.username.toLowerCase() === v.username.toLowerCase() || x.email.toLowerCase() === v.email.toLowerCase()); });
        if (dup) { UI.toast('Username atau email sudah digunakan.', 'error'); return false; }
        if (v.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v.password)) { UI.toast('Kata sandi minimal 8 karakter dengan huruf dan angka.', 'error'); return false; }
        if (u && u.id === me().id && v.role !== 'admin') { UI.toast('Anda tidak dapat menurunkan role akun sendiri.', 'error'); return false; }
        var patch = { name: v.name, username: v.username, email: v.email, phone: v.phone, role: v.role, expertise: v.expertise, status: v.status };
        if (v.password) patch.passHash = DB.hashPass(v.password);
        if (u) DB.update('users', u.id, patch); else DB.insert('users', Object.assign(patch, { id: DB.uid('u'), createdAt: new Date().toISOString(), bio: '', avatar: null }));
        DB.log((u ? 'Mengubah' : 'Menambah') + ' akun ' + v.username + ' (' + ROLES[v.role] + ')', 'user'); UI.toast('Pengguna disimpan.'); App.refresh();
      }
    });
  }

  /* ---------- Program & kategori ---------- */
  Pages.adminPrograms = function (params, q) {
    var tab = q.tab || 'programs';
    var html = '<div class="tabs"><a class="tab ' + (tab === 'programs' ? 'on' : '') + '" href="#/admin/programs">Program</a><a class="tab ' + (tab === 'categories' ? 'on' : '') + '" href="#/admin/programs?tab=categories">Kategori</a></div>';
    if (tab === 'categories') {
      html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>Kategori</th><th>Slug</th><th>Program</th><th></th></tr></thead><tbody>' + DB.all('categories').map(function (c) {
        return '<tr><td><b>' + esc(c.name) + '</b><br><small class="muted">' + esc(c.description) + '</small></td><td><code>' + esc(c.slug) + '</code></td><td>' + DB.where('programs', function (p) { return p.categoryId === c.id; }).length + '</td><td><div class="row"><button class="btn btn-ghost btn-xs" data-ec="' + esc(c.id) + '">' + icon('edit', 14) + '</button><button class="btn btn-ghost btn-xs" data-dc="' + esc(c.id) + '">' + icon('trash', 14) + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div></div>';
      App.render(UI.appLayout(html, { title: 'Program & Kategori', actions: '<button class="btn btn-primary" id="addc">' + icon('plus', 16) + ' Tambah Kategori</button>' }));
      UI.$('#addc').onclick = function () { catForm(null); };
      UI.$$('[data-ec]').forEach(function (b) { b.onclick = function () { catForm(DB.find('categories', b.dataset.ec)); }; });
      UI.$$('[data-dc]').forEach(function (b) { b.onclick = function () { if (DB.where('programs', function (p) { return p.categoryId === b.dataset.dc; }).length) return UI.toast('Kategori masih digunakan program.', 'error'); UI.confirm('Hapus kategori?', function () { DB.remove('categories', b.dataset.dc); UI.toast('Kategori dihapus.'); App.refresh(); }, 'Hapus'); }; });
      return;
    }
    html += '<div class="cards">' + DB.all('programs').map(function (p) {
      var cat = DB.find('categories', p.categoryId), n = DB.where('enrollments', function (e) { return e.programId === p.id; }).length;
      return '<div class="card pcard">' + UI.programThumb(p) + '<div class="pc-body"><div class="row">' + UI.statusBadge(p.status) + (p.featured ? UI.badge('Unggulan', 'dark') : '') + '</div><h3>' + esc(p.title) + '</h3><p>' + esc(cat ? cat.name : '') + ' • ' + esc(p.level) + ' • ' + n + ' peserta</p>' +
        '<div class="row mt"><button class="btn btn-soft btn-xs" data-ep="' + esc(p.id) + '">' + icon('edit', 13) + ' Ubah</button><a class="btn btn-ghost btn-xs" href="#/manage/content/' + esc(p.id) + '">' + icon('layers', 13) + ' Materi</a><a class="btn btn-ghost btn-xs" href="#/program/' + esc(p.id) + '">' + icon('eye', 13) + ' Lihat</a><button class="btn btn-ghost btn-xs" data-dp="' + esc(p.id) + '" aria-label="Hapus">' + icon('trash', 13) + '</button></div></div></div>';
    }).join('') + '</div>';
    App.render(UI.appLayout(html, { title: 'Program & Kategori', actions: '<button class="btn btn-primary" id="addp">' + icon('plus', 16) + ' Tambah Program</button>' }));
    UI.$('#addp').onclick = function () { programForm(null); };
    UI.$$('[data-ep]').forEach(function (b) { b.onclick = function () { programForm(DB.find('programs', b.dataset.ep)); }; });
    UI.$$('[data-dp]').forEach(function (b) {
      b.onclick = function () {
        var p = DB.find('programs', b.dataset.dp);
        if (DB.where('enrollments', function (e) { return e.programId === p.id; }).length) return UI.toast('Program memiliki peserta. Ubah status ke "Selesai" atau "Draft" sebagai gantinya.', 'error');
        UI.confirm('Hapus program "' + p.title + '" beserta modul, materi, kuis, dan kelasnya?', function () {
          var mids = DB.modulesOf(p.id).map(function (m) { return m.id; });
          DB.data.lessons = DB.data.lessons.filter(function (l) { if (mids.indexOf(l.moduleId) > -1) { if (l.fileId) DB.Files.del(l.fileId); return false; } return true; });
          DB.data.modules = DB.data.modules.filter(function (m) { return m.programId !== p.id; });
          DB.data.assessments = DB.data.assessments.filter(function (a) { return a.programId !== p.id; });
          DB.data.classes = DB.data.classes.filter(function (k) { return k.programId !== p.id; });
          DB.remove('programs', p.id); DB.log('Menghapus program ' + p.title, 'program'); UI.toast('Program dihapus.'); App.refresh();
        }, 'Hapus Program');
      };
    });
  };
  function catForm(c) {
    UI.formModal({
      title: c ? 'Ubah Kategori' : 'Tambah Kategori',
      fields: [{ name: 'name', label: 'Nama kategori', value: c ? c.name : '', required: true, full: true }, { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 2, value: c ? c.description : '' }],
      onSubmit: function (v) {
        var slug = v.name.toLowerCase().replace(/&/g, 'dan').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (c) DB.update('categories', c.id, { name: v.name, description: v.description, slug: slug }); else DB.insert('categories', { name: v.name, description: v.description, slug: slug });
        DB.log((c ? 'Mengubah' : 'Menambah') + ' kategori ' + v.name, 'category'); UI.toast('Kategori disimpan.'); App.refresh();
      }
    });
  }
  function programForm(p) {
    UI.formModal({
      title: p ? 'Ubah Program' : 'Tambah Program', size: 'lg',
      fields: [
        { name: 'title', label: 'Judul program', value: p ? p.title : '', required: true, full: true },
        { name: 'categoryId', label: 'Kategori', type: 'select', value: p ? p.categoryId : '', options: DB.all('categories').map(function (c) { return [c.id, c.name]; }) },
        { name: 'trainerId', label: 'Trainer utama', type: 'select', value: p ? p.trainerId : '', options: Pages.trainerOptions() },
        { name: 'level', label: 'Level', type: 'select', value: p ? p.level : 'Pemula', options: [['Pemula', 'Pemula'], ['Menengah', 'Menengah'], ['Lanjutan', 'Lanjutan']] },
        { name: 'duration', label: 'Durasi', value: p ? p.duration : '', placeholder: 'contoh: 6 modul • ±8 jam' },
        { name: 'summary', label: 'Ringkasan singkat', value: p ? p.summary : '', required: true, full: true },
        { name: 'description', label: 'Deskripsi lengkap', type: 'textarea', rows: 4, value: p ? p.description : '' },
        { name: 'objectives', label: 'Tujuan belajar (satu per baris)', type: 'textarea', rows: 4, value: p ? (p.objectives || []).join('\n') : '' },
        { name: 'status', label: 'Status', type: 'select', value: p ? p.status : 'draft', options: [['draft', 'Draft'], ['published', 'Published'], ['closed', 'Pendaftaran ditutup'], ['ongoing', 'Berlangsung'], ['completed', 'Selesai']] },
        { name: 'isFree', label: 'Biaya', type: 'select', value: p && p.isFree === false ? 'paid' : 'free', options: [['free', 'Gratis'], ['paid', 'Berbayar']] },
        { name: 'price', label: 'Keterangan biaya', value: p ? p.price : '', placeholder: 'contoh: Rp150.000', show: function (v) { return v.isFree === 'paid'; } },
        { name: 'color', label: 'Warna thumbnail', type: 'color', value: p ? p.color : '#6D28D9' },
        { name: 'thumb', label: 'Gambar thumbnail (opsional)', type: 'file', accept: 'image/*' },
        { name: 'removeThumb', label: 'Hapus gambar thumbnail', type: 'checkbox', value: false, show: function () { return !!(p && p.thumbnail); } },
        { name: 'featured', label: 'Tampilkan sebagai program unggulan di beranda', type: 'checkbox', value: p ? p.featured : false }
      ],
      onSubmit: function (v) {
        return UI.readImage(v.thumb, 800, 'image/jpeg').then(function (img) {
          var patch = { title: v.title, categoryId: v.categoryId, trainerId: v.trainerId, level: v.level, duration: v.duration, summary: v.summary, description: v.description, objectives: v.objectives.split('\n').map(function (x) { return x.trim(); }).filter(Boolean), status: v.status, isFree: v.isFree === 'free', price: v.price || '', color: v.color, featured: v.featured };
          if (img) patch.thumbnail = img; else if (v.removeThumb) patch.thumbnail = null;
          if (p) DB.update('programs', p.id, patch); else DB.insert('programs', Object.assign(patch, { thumbnail: patch.thumbnail || null, sequential: false }));
          DB.log((p ? 'Mengubah' : 'Membuat') + ' program ' + v.title, 'program'); UI.toast('Program disimpan.'); App.refresh();
        });
      }
    });
  }

  /* ---------- Sertifikat ---------- */
  Pages.adminCertificates = function () {
    var cs = DB.all('certificates').slice().reverse();
    var eligible = DB.where('enrollments', function (e) { return !DB.certificateOf(e.userId, e.programId); });
    var s = DB.settings();
    var html = '<div class="grid-21"><div class="card"><div class="card-title"><h3>Sertifikat Terbit (' + cs.length + ')</h3></div><div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Program</th><th>Nomor</th><th>Kode verifikasi</th><th>Terbit</th><th></th></tr></thead><tbody>' + cs.map(function (c) {
      var u = DB.find('users', c.userId), p = DB.find('programs', c.programId);
      return '<tr><td>' + esc(u ? u.name : '-') + '</td><td>' + esc(p ? p.title : '-') + '</td><td><small>' + esc(c.number) + '</small></td><td><code>' + esc(c.code) + '</code></td><td>' + UI.fmtDate(c.issuedAt) + '</td><td><div class="row"><a class="btn btn-ghost btn-xs" href="#/certificate/' + esc(c.id) + '">' + icon('eye', 13) + '</a><button class="btn btn-ghost btn-xs" data-revoke="' + esc(c.id) + '">Cabut</button></div></td></tr>';
    }).join('') + '</tbody></table></div></div>' +
      '<div><div class="card"><h3>Template & Penerbit</h3><dl class="kv"><dt>Penerbit</dt><dd>' + esc(s.certIssuer) + '</dd><dt>Penandatangan</dt><dd>' + esc(s.certSignerName) + '</dd><dt>Jabatan</dt><dd>' + esc(s.certSigner) + '</dd></dl><a class="btn btn-soft btn-sm mt" href="#/admin/settings?tab=cert">Ubah template</a></div>' +
      '<div class="card mt"><h3>Terbitkan Manual</h3><p class="muted" style="font-size:.88rem">Sertifikat terbit otomatis saat syarat terpenuhi. Gunakan ini untuk kasus khusus (mis. workshop tatap muka).</p><form id="mc" class="form-1">' +
      UI.fieldHTML({ name: 'en', label: 'Peserta & program', type: 'select', options: eligible.map(function (e) { var u = DB.find('users', e.userId), p = DB.find('programs', e.programId); return [e.id, (u ? u.name : '?') + ' — ' + (p ? p.title : '?') + ' (' + DB.programProgress(e.userId, e.programId) + '%)']; }) }) +
      '<button class="btn btn-primary"' + (eligible.length ? '' : ' disabled') + '>Terbitkan Sertifikat</button></form></div></div></div>';
    App.render(UI.appLayout(html, { title: 'Manajemen Sertifikat', actions: '<a class="btn btn-ghost" href="#/verify">' + icon('shield', 16) + ' Halaman verifikasi</a>' }));
    UI.$('#mc').onsubmit = function (e) { e.preventDefault(); var en = DB.find('enrollments', e.target.en.value); if (!en) return; DB.issueCertificate(en.userId, en.programId, en.classId, false); UI.toast('Sertifikat diterbitkan.'); App.refresh(); };
    UI.$$('[data-revoke]').forEach(function (b) { b.onclick = function () { UI.confirm('Cabut sertifikat ini? Kode verifikasi tidak akan valid lagi.', function () { var c = DB.find('certificates', b.dataset.revoke); DB.remove('certificates', c.id); var en = DB.enrollment(c.userId, c.programId); if (en) { en.status = 'active'; DB.save(); } DB.log('Mencabut sertifikat ' + c.number, 'certificate'); UI.toast('Sertifikat dicabut.'); App.refresh(); }, 'Cabut'); }; });
  };

  /* ---------- Konten website (CMS) ---------- */
  var CMS = {
    articles: { label: 'Artikel', fields: function (x) { return [{ name: 'title', label: 'Judul', value: x ? x.title : '', required: true, full: true }, { name: 'excerpt', label: 'Ringkasan', value: x ? x.excerpt : '', full: true }, { name: 'body', label: 'Isi artikel', type: 'textarea', rows: 10, value: x ? x.body : '', required: true, help: 'Format: "## Judul", "- poin", "**tebal**".' }, { name: 'cover', label: 'Gambar sampul (opsional)', type: 'file', accept: 'image/*' }, { name: 'status', label: 'Status', type: 'select', value: x ? x.status : 'published', options: [['published', 'Tampilkan'], ['draft', 'Sembunyikan (draft)']] }]; }, cols: function (x) { return '<b>' + esc(x.title) + '</b><br><small class="muted">' + UI.fmtDate(x.date) + '</small>'; }, visible: function (x) { return x.status === 'published'; } },
    testimonials: { label: 'Testimoni', fields: function (x) { return [{ name: 'name', label: 'Nama', value: x ? x.name : '', required: true }, { name: 'role', label: 'Usaha / peran', value: x ? x.role : '' }, { name: 'text', label: 'Testimoni', type: 'textarea', rows: 3, value: x ? x.text : '', required: true }, { name: 'visible', label: 'Tampilkan di website (sudah mendapat persetujuan)', type: 'checkbox', value: x ? x.visible : true }]; }, cols: function (x) { return '<b>' + esc(x.name) + '</b><br><small class="muted">' + esc(x.text.slice(0, 90)) + '…</small>'; }, visible: function (x) { return x.visible; } },
    faqs: { label: 'FAQ', fields: function (x) { return [{ name: 'q', label: 'Pertanyaan', value: x ? x.q : '', required: true, full: true }, { name: 'a', label: 'Jawaban', type: 'textarea', rows: 3, value: x ? x.a : '', required: true }, { name: 'visible', label: 'Tampilkan', type: 'checkbox', value: x ? x.visible : true }]; }, cols: function (x) { return '<b>' + esc(x.q) + '</b>'; }, visible: function (x) { return x.visible; } },
    announcements: { label: 'Pengumuman / Banner', fields: function (x) { return [{ name: 'title', label: 'Judul', value: x ? x.title : '', required: true, full: true }, { name: 'body', label: 'Isi singkat', value: x ? x.body : '', full: true }, { name: 'visible', label: 'Tampilkan sebagai banner di atas website', type: 'checkbox', value: x ? x.visible : true }, { name: 'notify', label: 'Kirim juga sebagai notifikasi ke semua pengguna', type: 'checkbox', value: false }]; }, cols: function (x) { return '<b>' + esc(x.title) + '</b><br><small class="muted">' + esc(x.body) + '</small>'; }, visible: function (x) { return x.visible; } }
  };
  Pages.adminCMS = function (params, q) {
    var tab = q.tab || 'articles';
    var tabs = Object.keys(CMS).map(function (k) { return '<a class="tab ' + (tab === k ? 'on' : '') + '" href="#/admin/cms?tab=' + k + '">' + CMS[k].label + '</a>'; }).join('') + '<a class="tab ' + (tab === 'messages' ? 'on' : '') + '" href="#/admin/cms?tab=messages">Pesan Masuk</a>';
    if (tab === 'messages') {
      var ms = DB.data.messages || [];
      App.render(UI.appLayout('<div class="tabs">' + tabs + '</div><div class="card">' + (ms.length ? '<div class="list">' + ms.map(function (m) { return '<div class="list-item ' + (m.read ? '' : 'unread') + '"><div class="li-ic">' + icon('mail') + '</div><div class="li-b"><b>' + esc(m.name) + ' &lt;' + esc(m.email) + '&gt;</b><small>' + UI.fmtDate(m.date, true) + '</small><p style="margin:.3rem 0 0">' + esc(m.message) + '</p></div><a class="btn btn-ghost btn-xs" href="mailto:' + esc(m.email) + '">Balas</a></div>'; }).join('') + '</div>' : UI.empty('Belum ada pesan.')) + '</div>', { title: 'Konten Website' }));
      ms.forEach(function (m) { m.read = true; }); DB.save();
      return;
    }
    var cfg = CMS[tab], items = DB.all(tab);
    var html = '<div class="tabs">' + tabs + '</div><div class="card"><div class="table-wrap"><table><thead><tr><th>' + cfg.label + '</th><th>Tampil</th><th></th></tr></thead><tbody>' + (items.map(function (x) {
      return '<tr><td>' + cfg.cols(x) + '</td><td>' + (cfg.visible(x) ? UI.badge('Tampil', 'green') : UI.badge('Tersembunyi', 'gray')) + '</td><td><div class="row"><button class="btn btn-ghost btn-xs" data-vis="' + esc(x.id) + '">' + (cfg.visible(x) ? 'Sembunyikan' : 'Tampilkan') + '</button><button class="btn btn-ghost btn-xs" data-e="' + esc(x.id) + '">' + icon('edit', 14) + '</button><button class="btn btn-ghost btn-xs" data-d="' + esc(x.id) + '">' + icon('trash', 14) + '</button></div></td></tr>';
    }).join('') || '<tr><td colspan="3" class="muted">Belum ada data.</td></tr>') + '</tbody></table></div></div>';
    App.render(UI.appLayout(html, { title: 'Konten Website', subtitle: 'Artikel, testimoni, FAQ, banner, dan pengumuman', actions: '<button class="btn btn-primary" id="addx">' + icon('plus', 16) + ' Tambah ' + cfg.label + '</button>' }));
    function form(x) {
      UI.formModal({
        title: (x ? 'Ubah ' : 'Tambah ') + cfg.label, size: tab === 'articles' ? 'lg' : '', fields: cfg.fields(x),
        onSubmit: function (v) {
          return UI.readImage(v.cover, 1000, 'image/jpeg').then(function (img) {
            var patch = Object.assign({}, v); delete patch.cover; delete patch.notify;
            if (img) patch.cover = img;
            if (tab === 'articles') { patch.slug = v.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'); if (!x) { patch.authorId = me().id; patch.date = new Date().toISOString(); patch.cover = patch.cover || null; } }
            if (tab === 'announcements' && !x) patch.date = new Date().toISOString();
            if (x) DB.update(tab, x.id, patch); else DB.insert(tab, patch);
            if (v.notify) DB.notifyRole(Object.keys(ROLES), 'Pengumuman: ' + v.title, '#/');
            DB.log((x ? 'Mengubah ' : 'Menambah ') + cfg.label.toLowerCase() + ': ' + (v.title || v.name || v.q), 'content');
            UI.toast(cfg.label + ' disimpan.'); App.refresh();
          });
        }
      });
    }
    UI.$('#addx').onclick = function () { form(null); };
    UI.$$('[data-e]').forEach(function (b) { b.onclick = function () { form(DB.find(tab, b.dataset.e)); }; });
    UI.$$('[data-d]').forEach(function (b) { b.onclick = function () { UI.confirm('Hapus item ini?', function () { DB.remove(tab, b.dataset.d); DB.log('Menghapus ' + cfg.label.toLowerCase(), 'content'); UI.toast('Dihapus.'); App.refresh(); }, 'Hapus'); }; });
    UI.$$('[data-vis]').forEach(function (b) { b.onclick = function () { var x = DB.find(tab, b.dataset.vis); if (tab === 'articles') x.status = x.status === 'published' ? 'draft' : 'published'; else x.visible = !x.visible; DB.save(); App.refresh(); }; });
  };

  /* ---------- Log ---------- */
  Pages.adminLogs = function () {
    App.render(UI.appLayout('<div class="card">' + logList(DB.all('logs').slice(0, 200)) + '</div>', { title: 'Log Aktivitas Sistem', subtitle: 'Catatan aktivitas penting untuk audit dan pemantauan' }));
  };

  /* ---------- Pengaturan Website (khusus Admin) ---------- */
  Pages.adminSettings = function (params, q) {
    var tab = q.tab || 'identity', s = DB.settings();
    var tabs = [['identity', 'Identitas & Logo'], ['contact', 'Kontak & Media Sosial'], ['profile', 'Profil Lembaga'], ['home', 'Beranda'], ['cert', 'Sertifikat'], ['system', 'Sistem & Data']];
    var F = {
      identity: [
        { name: 'siteName', label: 'Nama website', value: s.siteName, required: true },
        { name: 'siteFullName', label: 'Nama lengkap lembaga / platform', value: s.siteFullName },
        { name: 'tagline', label: 'Slogan / tagline', value: s.tagline, full: true },
        { name: 'footerText', label: 'Deskripsi singkat (footer)', type: 'textarea', rows: 2, value: s.footerText }
      ],
      contact: [
        { name: 'email', label: 'Email resmi', type: 'email', value: s.email, required: true },
        { name: 'phone', label: 'Telepon', value: s.phone },
        { name: 'whatsapp', label: 'WhatsApp (format 62…)', value: s.whatsapp },
        { name: 'hours', label: 'Jam layanan', value: s.hours },
        { name: 'address', label: 'Alamat', type: 'textarea', rows: 2, value: s.address },
        { name: 'instagram', label: 'Instagram (URL)', type: 'url', value: s.instagram },
        { name: 'facebook', label: 'Facebook (URL)', type: 'url', value: s.facebook },
        { name: 'youtube', label: 'YouTube (URL)', type: 'url', value: s.youtube },
        { name: 'linkedin', label: 'LinkedIn (URL)', type: 'url', value: s.linkedin }
      ],
      profile: [
        { name: 'profile', label: 'Profil lembaga', type: 'textarea', rows: 6, value: s.profile, required: true },
        { name: 'vision', label: 'Visi', type: 'textarea', rows: 3, value: s.vision },
        { name: 'mission', label: 'Misi (satu per baris)', type: 'textarea', rows: 5, value: s.mission }
      ],
      home: [
        { name: 'heroTitle', label: 'Headline beranda', value: s.heroTitle, required: true, full: true, help: 'Beri tanda bintang pada kata yang ingin bergaya huruf miring elegan, contoh: Tingkatkan *Skill*, Wujudkan Peluang. Tanpa tanda bintang, kata kedua otomatis dibuat miring.' },
        { name: 'heroDesc', label: 'Deskripsi hero', type: 'textarea', rows: 3, value: s.heroDesc },
        { name: 'heroImage', label: 'Gambar latar hero (opsional, menggantikan latar pita animasi)', type: 'file', accept: 'image/*', full: true },
        { name: 'removeHero', label: 'Hapus gambar hero', type: 'checkbox', value: false }
      ],
      cert: [
        { name: 'certIssuer', label: 'Nama penerbit sertifikat', value: s.certIssuer, required: true },
        { name: 'certSignerName', label: 'Nama penandatangan', value: s.certSignerName },
        { name: 'certSigner', label: 'Jabatan penandatangan', value: s.certSigner }
      ]
    };
    var body = '';
    if (tab === 'identity') {
      body = '<div class="grid-21"><div class="card"><form id="sf" class="form-grid" novalidate>' + F.identity.map(UI.fieldHTML).join('') + '<div class="field full"><button class="btn btn-primary">' + icon('check', 16) + ' Simpan Identitas</button></div></form></div>' +
        '<div class="card"><h3>Logo Website</h3><div class="row" style="align-items:flex-start"><div class="logo-preview" id="lp">' + (s.logo ? '<img src="' + s.logo + '" alt="Logo saat ini">' : '<span class="logo-mark" style="width:64px;height:64px;font-size:1.3rem">' + esc(UI.initials(s.siteName)) + '</span>') + '</div>' +
        '<div class="grow"><p class="muted" style="font-size:.86rem">Format PNG, JPG, SVG, atau WEBP. Maks. 5 MB. Gambar akan diperkecil otomatis (maks. lebar 400px). Logo tampil di header, sidebar, footer, sertifikat, dan ikon tab.</p>' +
        '<label class="btn btn-primary btn-sm" for="logoin">' + icon('upload', 14) + ' Unggah Logo</label><input type="file" id="logoin" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="sr">' + (s.logo ? ' <button class="btn btn-ghost btn-sm" id="rmlogo">Hapus logo</button>' : '') + '</div></div>' +
        '<h4 class="mt2">Pratinjau header</h4><div class="card flat" style="padding:.8rem 1rem">' + UI.logoHTML(s) + '</div><div class="card flat mt" style="padding:.8rem 1rem;background:var(--ink)">' + UI.logoHTML(s, true) + '</div></div></div>';
    } else if (tab === 'system' && DB.online) {
      body = '<div class="grid2" style="align-items:start"><div class="card"><h3>Pendaftaran Peserta</h3><label class="row" style="gap:.5rem"><input type="checkbox" id="allowreg"' + (s.allowRegistration !== false ? ' checked' : '') + '> Izinkan pengunjung membuat akun peserta sendiri</label>' +
        '<h3 class="mt2">Cadangan Data</h3><p class="muted" style="font-size:.9rem">Unduh salinan seluruh data (tanpa file PDF) sebagai arsip.</p><button class="btn btn-ghost" id="exp">' + icon('download', 16) + ' Ekspor backup (.json)</button></div>' +
        '<div class="card"><h3>Status Database</h3><div class="notice" style="border-color:var(--green);background:var(--green-bg)">' + icon('check', 16) + ' <b>Terhubung ke database online (Supabase).</b> Setiap perubahan yang Anda simpan langsung tampil untuk semua pengunjung.</div>' +
        '<dl class="kv mt"><dt>Pengguna</dt><dd>' + DB.all('users').length + '</dd><dt>Program</dt><dd>' + DB.all('programs').length + '</dd><dt>Pendaftaran</dt><dd>' + DB.all('enrollments').length + '</dd></dl>' +
        '<p class="muted mt" style="font-size:.85rem">Backup otomatis harian tersedia di dashboard Supabase (menu Database › Backups) sesuai paket Anda.</p></div></div>';
    } else if (tab === 'system') {
      body = '<div class="grid2" style="align-items:start"><div class="card"><h3>Pendaftaran Peserta</h3><label class="row" style="gap:.5rem"><input type="checkbox" id="allowreg"' + (s.allowRegistration !== false ? ' checked' : '') + '> Izinkan pengunjung membuat akun peserta sendiri</label>' +
        '<h3 class="mt2">Publikasikan Perubahan ke Semua Pengunjung</h3><p class="muted" style="font-size:.9rem">Prototype ini menyimpan data di browser. Agar perubahan Anda (pengaturan, program, materi, PDF) tampil di perangkat lain saat website di-hosting, unduh file <code>site-data.js</code> lalu ganti file dengan nama yang sama di folder <code>js/</code> project, kemudian unggah ulang ke hosting.</p>' +
        '<button class="btn btn-primary" id="pub">' + icon('upload', 16) + ' Unduh site-data.js</button>' +
        '<h3 class="mt2">Cadangan Data</h3><div class="row"><button class="btn btn-ghost" id="exp">' + icon('download', 16) + ' Ekspor backup (.json)</button><label class="btn btn-ghost" for="imp">' + icon('upload', 16) + ' Impor backup</label><input type="file" id="imp" accept="application/json" class="sr"></div></div>' +
        '<div class="card"><h3>Penyimpanan</h3><dl class="kv"><dt>Data terstruktur</dt><dd id="lsz">-</dd><dt>File (PDF, dll.)</dt><dd id="fsz">menghitung…</dd></dl><div class="notice warn mt">' + icon('shield', 16) + ' Untuk versi produksi, gunakan backend (REST API + PostgreSQL/MySQL) sesuai PRD agar data tersimpan terpusat dan aman.</div>' +
        '<h3 class="mt2">Reset Data Demo</h3><p class="muted" style="font-size:.9rem">Kembalikan seluruh data ke kondisi awal (akun demo, program, materi). Semua perubahan akan hilang.</p><button class="btn btn-danger" id="reset">' + icon('trash', 16) + ' Reset ke Data Demo</button></div></div>';
    } else {
      body = '<div class="card" style="max-width:860px"><form id="sf" class="form-grid" novalidate>' + F[tab].map(UI.fieldHTML).join('') + '<div class="field full"><button class="btn btn-primary">' + icon('check', 16) + ' Simpan Perubahan</button></div></form></div>';
    }
    var html = '<div class="notice">' + icon('lock', 16) + ' Halaman ini hanya dapat diakses oleh <b>Administrator System</b>. Perubahan langsung diterapkan ke seluruh tampilan website tanpa mengubah kode' + (DB.online ? ' dan langsung terlihat oleh semua pengunjung.' : '.') + '</div>' +
      '<div class="tabs">' + tabs.map(function (t) { return '<a class="tab ' + (tab === t[0] ? 'on' : '') + '" href="#/admin/settings?tab=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>' + body;
    App.render(UI.appLayout(html, { title: 'Pengaturan Website', subtitle: 'Identitas, logo, kontak, profil, dan konfigurasi' }));

    var sf = UI.$('#sf');
    if (sf) sf.onsubmit = function (e) {
      e.preventDefault();
      var fields = F[tab], ok = true;
      UI.$$('input,textarea', sf).forEach(function (el) { var b = el.closest('.field'); if (!b) return; var bad = !el.checkValidity(); b.classList.toggle('invalid', bad); var x = b.querySelector('.err'); if (x) x.textContent = bad ? el.validationMessage : ''; if (bad) ok = false; });
      if (!ok) return UI.toast('Periksa kembali isian.', 'error');
      var v = UI.readForm(sf, fields);
      UI.readImage(v.heroImage, 1400, 'image/jpeg').then(function (img) {
        var patch = Object.assign({}, v); delete patch.heroImage; delete patch.removeHero;
        if (tab === 'home') { if (img) patch.heroImage = img; else if (v.removeHero) patch.heroImage = null; }
        DB.setSettings(patch); DB.log('Memperbarui pengaturan website (' + tab + ')', 'settings');
        UI.toast('Pengaturan disimpan.'); App.refresh();
      }).catch(function (err) { UI.toast(err.message, 'error'); });
    };
    var li = UI.$('#logoin');
    if (li) li.onchange = function () {
      UI.readImage(li.files[0], 400, 'image/png').then(function (img) {
        if (!img) return;
        DB.setSettings({ logo: img }); DB.log('Mengunggah logo baru', 'settings'); UI.toast('Logo berhasil diperbarui.'); App.refresh();
      }).catch(function (err) { UI.toast(err.message, 'error'); });
    };
    var rl = UI.$('#rmlogo'); if (rl) rl.onclick = function () { DB.setSettings({ logo: null }); UI.toast('Logo dihapus.'); App.refresh(); };

    if (tab === 'system') {
      if (!DB.online) try { UI.$('#lsz').textContent = (new Blob([localStorage.getItem('insanasia_lms_v3') || '']).size / 1024).toFixed(0) + ' KB (batas ±5 MB)'; } catch (e) { }
      if (!DB.online) DB.Files.all().then(function (all) { var n = Object.keys(all).length, sz = Object.keys(all).reduce(function (s, k) { return s + (all[k].size || 0); }, 0); UI.$('#fsz').textContent = n + ' file • ' + (sz / 1048576).toFixed(2) + ' MB'; }).catch(function () { UI.$('#fsz').textContent = '-'; });
      UI.$('#allowreg').onchange = function (e) { DB.setSettings({ allowRegistration: e.target.checked }); DB.log((e.target.checked ? 'Membuka' : 'Menutup') + ' pendaftaran peserta', 'settings'); UI.toast(e.target.checked ? 'Pendaftaran dibuka.' : 'Pendaftaran ditutup.'); };
      UI.$('#exp').onclick = function () { exportData(false); };
      if (DB.online) return;
      UI.$('#pub').onclick = function () { exportData(true); };
      UI.$('#imp').onchange = function (e) {
        var f = e.target.files[0]; if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var obj = JSON.parse(fr.result);
            if (!obj.settings || !obj.users || !obj.programs) throw new Error('Format backup tidak dikenali.');
            UI.confirm('Impor akan mengganti seluruh data saat ini. Lanjutkan?', function () {
              var files = obj.files || {}; delete obj.files;
              DB.replaceAll(obj);
              Promise.all(Object.keys(files).map(function (id) { return fetch(files[id]).then(function (r) { return r.blob(); }).then(function (b) { return DB.Files.put(b, id); }); })).then(function () {
                UI.toast('Backup berhasil diimpor.'); App.refresh();
              });
            }, 'Impor');
          } catch (err) { UI.toast(err.message || 'File tidak valid.', 'error'); }
        };
        fr.readAsText(f);
      };
      UI.$('#reset').onclick = function () {
        UI.confirm('Reset seluruh data ke kondisi demo? Tindakan ini tidak dapat dibatalkan.', function () {
          DB.reset().then(function () { sessionStorage.clear(); localStorage.removeItem('insanasia_lms_session'); UI.toast('Data direset. Silakan masuk kembali.', 'info'); location.hash = '#/login'; });
        }, 'Reset Data');
      };
    }
  };

  function blobToDataURL(b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); }
  function exportData(asSite) {
    UI.toast('Menyiapkan file…', 'info');
    DB.Files.all().then(function (all) {
      var ids = Object.keys(all);
      return Promise.all(ids.map(function (id) { return blobToDataURL(all[id]); })).then(function (urls) { var o = {}; ids.forEach(function (id, i) { o[id] = urls[i]; }); return o; });
    }).catch(function () { return {}; }).then(function (files) {
      var obj = JSON.parse(JSON.stringify(DB.data));
      obj.files = files;
      var name, content, type;
      if (asSite) {
        obj.meta.siteVersion = 'v' + Date.now();
        obj.notifications = []; obj.resets = [];
        DB.data.meta.siteVersion = obj.meta.siteVersion; DB.save();
        content = '/* Dibuat otomatis dari menu Pengaturan Website › Sistem & Data (' + new Date().toLocaleString('id-ID') + ').\n   Ganti file js/site-data.js di project dengan file ini agar perubahan tampil untuk semua pengunjung. */\nwindow.SITE_DATA = ' + JSON.stringify(obj) + ';\n';
        name = 'site-data.js'; type = 'application/javascript';
        DB.log('Mempublikasikan data situs (site-data.js)', 'settings');
      } else {
        content = JSON.stringify(obj, null, 1); name = 'backup-insanasia-lms-' + new Date().toISOString().slice(0, 10) + '.json'; type = 'application/json';
        DB.log('Mengekspor backup data', 'settings');
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      UI.toast('File ' + name + ' diunduh.');
    });
  }
})();
