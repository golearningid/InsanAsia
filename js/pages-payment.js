/* =========================================================
   Pembayaran program berbayar (QRIS / e-wallet / transfer)
   - Peserta: unggah bukti → kelas terkunci sampai disetujui
   - Admin & Enterprise Coach: verifikasi (setujui / tolak)
   ========================================================= */
(function () {
  'use strict';
  var Pages = window.Pages;
  var esc = UI.esc, icon = UI.icon;
  function me() { return Auth.user(); }

  var WALLETS = [['payDana', 'DANA'], ['payOvo', 'OVO'], ['payGopay', 'GoPay'], ['payShopeepay', 'ShopeePay'], ['payLinkaja', 'LinkAja']];
  function methods(s) {
    var m = [];
    if (s.payQris) m.push(['QRIS', 'QRIS']);
    WALLETS.forEach(function (w) { if (s[w[0]]) m.push([w[1], w[1]]); });
    if (s.payBankAccount) m.push(['Transfer Bank', 'Transfer Bank' + (s.payBankName ? ' ' + s.payBankName : '')]);
    if (!m.length) m.push(['Lainnya', 'Lainnya']);
    return m;
  }

  /* Info tujuan pembayaran (QRIS + nomor) */
  function payInfo(p) {
    var s = DB.settings();
    var rows = WALLETS.filter(function (w) { return s[w[0]]; }).map(function (w) {
      return '<div class="pay-row"><span class="pay-name">' + w[1] + '</span><b class="pay-num">' + esc(s[w[0]]) + '</b><button type="button" class="btn btn-ghost btn-xs" data-copy="' + esc(s[w[0]]) + '">' + icon('file', 12) + ' Salin</button></div>';
    }).join('');
    if (s.payBankAccount) rows += '<div class="pay-row"><span class="pay-name">' + esc(s.payBankName || 'Bank') + '</span><b class="pay-num">' + esc(s.payBankAccount) + '</b><button type="button" class="btn btn-ghost btn-xs" data-copy="' + esc(s.payBankAccount) + '">' + icon('file', 12) + ' Salin</button>' + (s.payBankHolder ? '<small class="muted" style="flex-basis:100%">a.n. ' + esc(s.payBankHolder) + '</small>' : '') + '</div>';
    var none = !s.payQris && !rows;
    return '<div class="pay-amount"><small>Total yang harus dibayar</small><b>' + esc(UI.priceLabel(p)) + '</b><span>' + esc(p.title) + '</span></div>' +
      (none ? '<div class="notice warn">Admin belum mengatur metode pembayaran. Hubungi ' + esc(s.email) + '.</div>' :
        '<div class="pay-grid">' +
        (s.payQris ? '<div class="qris-box"><img src="' + s.payQris + '" alt="QRIS ' + esc(s.payHolder || '') + '"><a class="btn btn-ghost btn-xs mt" href="' + s.payQris + '" download="QRIS-' + esc((s.siteName || 'pembayaran').replace(/\s+/g, '-')) + '.png">' + icon('download', 12) + ' Unduh QRIS</a></div>' : '') +
        '<div class="pay-list">' + (s.payHolder ? '<p class="muted" style="margin:0 0 .4rem;font-size:.85rem">Atas nama: <b style="color:var(--ink)">' + esc(s.payHolder) + '</b></p>' : '') + rows + '</div></div>') +
      (s.payInstructions ? '<p class="muted mt" style="font-size:.86rem">' + esc(s.payInstructions) + '</p>' : '');
  }
  function bindCopy(root) {
    UI.$$('[data-copy]', root).forEach(function (b) {
      b.onclick = function () {
        var t = b.dataset.copy;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { UI.toast('Nomor disalin: ' + t); })
          .catch(function () { UI.toast('Salin manual: ' + t, 'info'); });
      };
    });
  }
  Pages.payInfo = payInfo;

  /* Modal bayar + unggah bukti (pendaftaran baru atau kirim ulang) */
  Pages.payModal = function (p, k, en) {
    var u = me(), s = DB.settings();
    var fields = [
      { name: 'info', type: 'html', html: '<div class="card flat" style="padding:.8rem 1rem"><b>' + esc(p.title) + '</b><p class="muted" style="margin:0;font-size:.86rem">' + esc(k ? k.name + ' • ' + UI.fmtDate(k.startAt) + ' – ' + UI.fmtDate(k.endAt) : '') + '</p></div>' + payInfo(p) },
      { name: 'method', label: 'Metode yang Anda gunakan', type: 'select', options: methods(s), required: true },
      { name: 'senderName', label: 'Nama pengirim / pemilik akun', value: u.name, required: true },
      { name: 'proof', label: 'Bukti pembayaran (foto/screenshot atau PDF, maks. 5 MB)', type: 'file', accept: 'image/png,image/jpeg,image/webp,application/pdf', required: true, full: true },
      { name: 'note', label: 'Catatan (opsional)', type: 'textarea', rows: 2, placeholder: 'contoh: transfer pukul 10.15 WIB' }
    ];
    UI.formModal({
      title: en ? 'Kirim Ulang Bukti Pembayaran' : 'Pembayaran Program', size: 'lg', fields: fields, submitLabel: 'Kirim Bukti Pembayaran',
      onOpen: function (w) { bindCopy(w); },
      onSubmit: function (v) {
        if (!v.proof) { UI.toast('Unggah bukti pembayaran terlebih dahulu.', 'error'); return false; }
        if (!/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(v.proof.type)) { UI.toast('Bukti harus berupa gambar (PNG/JPG/WEBP) atau PDF.', 'error'); return false; }
        return UI.storeFile(v.proof, { maxMB: 5 }).then(function (f) {
          var kid = k ? k.id : (en ? en.classId : null);
          if (!en) {
            DB.bumpClass(kid);
            en = DB.insert('enrollments', { userId: u.id, classId: kid, programId: p.id, status: 'pending_payment', enrolledAt: new Date().toISOString(), rating: null, review: '' });
          } else { en.status = 'pending_payment'; DB.save(); }
          DB.insert('payments', {
            userId: u.id, programId: p.id, classId: kid, enrollmentId: en.id, amount: Number(p.priceAmount || String(p.price || '').replace(/[^\d]/g, '')) || 0,
            method: v.method, senderName: v.senderName, note: v.note, proofFileId: f.id, proofName: f.name, status: 'pending', createdAt: new Date().toISOString()
          });
          DB.notifyRole(['admin', 'coach'], 'Bukti bayar baru: ' + u.name + ' – ' + p.title + ' (' + UI.priceLabel(p) + ')', '#/payments');
          DB.notify(u.id, 'Bukti pembayaran ' + p.title + ' terkirim. Kelas terbuka setelah diverifikasi admin.', '#/learn/' + p.id);
          DB.log(u.name + ' mengirim bukti pembayaran ' + p.title, 'payment');
          UI.toast('Bukti pembayaran terkirim. Menunggu verifikasi admin.');
          if (location.hash === '#/learn/' + p.id) App.refresh(); else location.hash = '#/learn/' + p.id;
        });
      }
    });
  };

  /* Halaman status pembayaran (pengganti ruang kelas selama belum lunas) */
  Pages.paymentStatus = function (p) {
    var u = me(), en = DB.enrollment(u.id, p.id);
    var pays = DB.where('payments', function (x) { return x.userId === u.id && x.programId === p.id; }).slice().reverse();
    var last = pays[0];
    var rejected = en.status === 'payment_rejected';
    var head = rejected
      ? '<div class="pay-status rejected"><div class="ps-ic">' + icon('x', 26) + '</div><div><h2>Pembayaran ditolak</h2><p>' + esc(last && last.reason ? 'Alasan: ' + last.reason : 'Bukti pembayaran belum dapat diverifikasi.') + ' Silakan kirim ulang bukti yang benar.</p></div></div>'
      : '<div class="pay-status pending"><div class="ps-ic">' + icon('clock', 26) + '</div><div><h2>Menunggu verifikasi pembayaran</h2><p>Bukti pembayaran Anda sudah kami terima. Kelas <b>' + esc(p.title) + '</b> akan terbuka otomatis setelah admin menyetujuinya.</p></div></div>';
    var hist = pays.length ? '<div class="list">' + pays.map(function (x) {
      return '<div class="list-item"><div class="li-ic">' + icon('wallet') + '</div><div class="li-b"><b>' + esc(UI.rupiah(x.amount) || '-') + ' • ' + esc(x.method) + '</b><small>Dikirim ' + UI.fmtDate(x.createdAt, true) + (x.reason ? ' • Alasan ditolak: ' + esc(x.reason) : '') + '</small></div>' + payBadge(x.status) + '</div>';
    }).join('') + '</div>' : '<p class="muted">Belum ada bukti pembayaran.</p>';
    var html = head +
      '<div class="grid-21"><div class="card"><div class="card-title"><h3>Informasi Pembayaran</h3></div>' + payInfo(p) +
      (rejected || !last ? '<button class="btn btn-primary btn-lg mt" id="resend">' + icon('upload', 16) + ' ' + (last ? 'Kirim Ulang Bukti Pembayaran' : 'Kirim Bukti Pembayaran') + '</button>' : '') + '</div>' +
      '<div class="card"><div class="card-title"><h3>Riwayat Pembayaran</h3></div>' + hist +
      '<p class="muted mt" style="font-size:.85rem">Butuh bantuan? Hubungi ' + esc(DB.settings().email) + (DB.settings().whatsapp ? ' atau <a target="_blank" rel="noopener" href="https://wa.me/' + esc(String(DB.settings().whatsapp).replace(/\D/g, '')) + '">WhatsApp admin</a>' : '') + '.</p></div></div>';
    App.render(UI.appLayout(html, { title: 'Status Pembayaran', subtitle: p.title }));
    bindCopy(document);
    var r = UI.$('#resend'); if (r) r.onclick = function () { Pages.payModal(p, DB.find('classes', en.classId), en); };
  };
  function payBadge(st) { return st === 'approved' ? UI.badge('Disetujui', 'green') : st === 'rejected' ? UI.badge('Ditolak', 'red') : UI.badge('Menunggu verifikasi', 'amber'); }
  Pages.payBadge = payBadge;

  /* Penjaga akses: dipanggil sebelum ruang kelas / kuis */
  Pages.guardPaid = function (p) {
    var u = me(), acc = DB.accessOf(u.id, p.id);
    if (acc === 'pending' || acc === 'rejected') { Pages.paymentStatus(p); return false; }
    // Baru saja disetujui tetapi materi masih versi terkunci → muat ulang dari server
    if (acc === 'active' && DB.online && (DB.programLessons(p.id).some(function (l) { return l.locked; }) || DB.assessmentsOf(p.id).some(function (a) { return a.locked; }))) {
      App.render(UI.appLayout('<div class="card center"><div class="empty">' + icon('clock', 30) + '<p>Membuka materi kelas…</p></div></div>', { title: 'Ruang Kelas', subtitle: p.title }));
      DB.reload().then(function () { App.refresh(); }).catch(function (e) { UI.toast(e.message, 'error'); });
      return false;
    }
    return true;
  };

  /* ---------- Verifikasi pembayaran (Admin & Enterprise Coach) ---------- */
  Pages.payments = function (params, q) {
    var tab = q.status || 'pending';
    var all = DB.all('payments').slice().reverse();
    var list = all.filter(function (x) { return tab === 'all' || x.status === tab; });
    var pend = all.filter(function (x) { return x.status === 'pending'; }).length;
    var income = all.filter(function (x) { return x.status === 'approved'; }).reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
    var tabs = [['pending', 'Menunggu (' + pend + ')'], ['approved', 'Disetujui'], ['rejected', 'Ditolak'], ['all', 'Semua']];
    var html = '<div class="stats">' + UI.stat('Menunggu verifikasi', pend, 'clock') + UI.stat('Pembayaran disetujui', all.filter(function (x) { return x.status === 'approved'; }).length, 'check') + UI.stat('Total pemasukan', UI.rupiah(income) || 'Rp0', 'wallet') + '</div>' +
      '<div class="tabs">' + tabs.map(function (t) { return '<a class="tab ' + (tab === t[0] ? 'on' : '') + '" href="#/payments?status=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>' +
      '<div class="card">' + (list.length ? '<div class="table-wrap"><table><thead><tr><th>Peserta</th><th>Program / Kelas</th><th>Nominal</th><th>Metode</th><th>Dikirim</th><th>Bukti</th><th>Status</th><th></th></tr></thead><tbody>' + list.map(function (x) {
        var l = DB.find('users', x.userId), p = DB.find('programs', x.programId), k = DB.find('classes', x.classId);
        return '<tr><td><div class="cell-user">' + UI.avatar(l, 32) + '<div><b>' + esc(l ? l.name : '-') + '</b><small>' + esc(l ? l.email : '') + '</small></div></div></td>' +
          '<td><b>' + esc(p ? p.title : '-') + '</b><br><small class="muted">' + esc(k ? k.name : '') + '</small></td><td><b>' + esc(UI.rupiah(x.amount) || '-') + '</b></td>' +
          '<td>' + esc(x.method) + '<br><small class="muted">a.n. ' + esc(x.senderName || '-') + '</small>' + (x.note ? '<br><small class="muted">' + esc(x.note) + '</small>' : '') + '</td>' +
          '<td><small>' + UI.fmtDate(x.createdAt, true) + '</small></td>' +
          '<td>' + (x.proofFileId ? '<button class="btn btn-soft btn-xs" data-proof="' + esc(x.id) + '">' + icon('eye', 13) + ' Lihat</button>' : '-') + '</td>' +
          '<td>' + payBadge(x.status) + (x.reason ? '<br><small class="muted">' + esc(x.reason) + '</small>' : '') + '</td>' +
          '<td>' + (x.status === 'pending' ? '<div class="row"><button class="btn btn-primary btn-xs" data-ok="' + esc(x.id) + '">' + icon('check', 13) + ' Setujui</button><button class="btn btn-ghost btn-xs" data-no="' + esc(x.id) + '">Tolak</button></div>' : '<small class="muted">' + UI.fmtDate(x.reviewedAt) + '</small>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : UI.empty(tab === 'pending' ? 'Tidak ada pembayaran yang menunggu verifikasi.' : 'Belum ada data.')) + '</div>';
    App.render(UI.appLayout(html, { title: 'Verifikasi Pembayaran', subtitle: 'Periksa bukti transfer peserta program berbayar', actions: me().role === 'admin' ? '<a class="btn btn-ghost btn-sm" href="#/admin/settings?tab=pay">' + icon('cog', 14) + ' Atur QRIS & E-Wallet</a>' : '' }));

    UI.$$('[data-proof]').forEach(function (b) { b.onclick = function () { var x = DB.find('payments', b.dataset.proof); proofModal(x); }; });
    UI.$$('[data-ok]').forEach(function (b) { b.onclick = function () { approve(DB.find('payments', b.dataset.ok)); }; });
    UI.$$('[data-no]').forEach(function (b) { b.onclick = function () { reject(DB.find('payments', b.dataset.no)); }; });
  };
  function proofModal(x) {
    var isPdf = /\.pdf$/i.test(x.proofName || '') ;
    UI.modal({
      title: 'Bukti Pembayaran', size: 'lg',
      body: '<div id="pv" class="proof-view"><p class="muted">Memuat…</p></div>',
      footer: '<button class="btn btn-ghost" data-close>Tutup</button><button class="btn btn-ghost" id="pv-open">' + icon('eye', 14) + ' Buka di tab baru</button>' + (x.status === 'pending' ? '<button class="btn btn-primary" id="pv-ok">' + icon('check', 14) + ' Setujui</button>' : ''),
      onOpen: function (w) {
        DB.Files.get(x.proofFileId).then(function (blob) {
          var box = w.querySelector('#pv'); if (!box) return;
          if (!blob) { box.innerHTML = '<p class="muted">File tidak ditemukan.</p>'; return; }
          var url = URL.createObjectURL(blob);
          var asPdf = isPdf || (blob.type === 'application/pdf' && !/\.(png|jpe?g|webp)$/i.test(x.proofName || ''));
          box.innerHTML = asPdf ? '<iframe class="pdf-frame" src="' + url + '" title="Bukti PDF"></iframe>' : '<img src="' + url + '" alt="Bukti pembayaran">';
        });
        w.querySelector('#pv-open').onclick = function () { UI.openStoredFile(x.proofFileId, x.proofName); };
        var ok = w.querySelector('#pv-ok'); if (ok) ok.onclick = function () { UI.closeModal(); approve(x); };
      }
    });
  }
  function approve(x) {
    var l = DB.find('users', x.userId), p = DB.find('programs', x.programId);
    UI.confirm('Setujui pembayaran ' + (UI.rupiah(x.amount) || '') + ' dari ' + (l ? l.name : 'peserta') + '? Peserta langsung bisa masuk kelas.', function () {
      x.status = 'approved'; x.reviewedBy = me().id; x.reviewedAt = new Date().toISOString(); x.reason = '';
      var en = DB.find('enrollments', x.enrollmentId) || DB.enrollment(x.userId, x.programId);
      if (en) en.status = 'active';
      DB.save();
      DB.notify(x.userId, 'Pembayaran ' + (p ? p.title : '') + ' disetujui. Kelas Anda sudah terbuka — selamat belajar!', '#/learn/' + x.programId);
      var k = DB.find('classes', x.classId); if (k && k.trainerId) DB.notify(k.trainerId, (l ? l.name : 'Peserta') + ' resmi bergabung di ' + (p ? p.title : '') + '.', '#/manage/learners');
      DB.log('Menyetujui pembayaran ' + (l ? l.name : '') + ' – ' + (p ? p.title : ''), 'payment');
      UI.toast('Pembayaran disetujui. Kelas peserta terbuka.'); App.refresh();
    }, 'Setujui');
  }
  function reject(x) {
    var l = DB.find('users', x.userId), p = DB.find('programs', x.programId);
    UI.formModal({
      title: 'Tolak Pembayaran', submitLabel: 'Tolak Pembayaran',
      fields: [{ name: 'reason', label: 'Alasan penolakan (dikirim ke peserta)', type: 'textarea', rows: 3, required: true, placeholder: 'contoh: Nominal tidak sesuai / bukti tidak terbaca' }],
      onSubmit: function (v) {
        x.status = 'rejected'; x.reason = v.reason; x.reviewedBy = me().id; x.reviewedAt = new Date().toISOString();
        var en = DB.find('enrollments', x.enrollmentId) || DB.enrollment(x.userId, x.programId);
        if (en) en.status = 'payment_rejected';
        DB.save();
        DB.notify(x.userId, 'Pembayaran ' + (p ? p.title : '') + ' ditolak: ' + v.reason + '. Silakan kirim ulang bukti.', '#/learn/' + x.programId);
        DB.log('Menolak pembayaran ' + (l ? l.name : '') + ' – ' + (p ? p.title : ''), 'payment');
        UI.toast('Pembayaran ditolak & peserta diberi tahu.', 'info'); App.refresh();
      }
    });
  }
})();
