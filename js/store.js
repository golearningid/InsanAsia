/* =========================================================
   InsanAsia LMS – Data Store (prototype, tersimpan di browser)
   - Data terstruktur  : localStorage
   - File (PDF, dll)   : IndexedDB
   ========================================================= */
(function () {
  'use strict';

  /* ---------- SHA-256 (sinkron, tanpa dependensi) ---------- */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mp = Math.pow, max = mp(2, 32), result = '', words = [], i, j;
    var str = unescape(encodeURIComponent(ascii));
    var bitLen = str.length * 8;
    var hash = [], k = [], primeCounter = 0, isComposite = {};
    for (var c = 2; primeCounter < 64; c++) {
      if (!isComposite[c]) {
        for (i = 0; i < 313; i += c) isComposite[i] = c;
        hash[primeCounter] = (mp(c, .5) * max) | 0;
        k[primeCounter++] = (mp(c, 1 / 3) * max) | 0;
      }
    }
    hash = hash.slice(0, 8);
    str += '\x80';
    while (str.length % 64 - 56) str += '\x00';
    for (i = 0; i < str.length; i++) {
      j = str.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / max) | 0);
    words[words.length] = (bitLen);
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
    return result;
  }
  var SALT = 'insanasia::';
  function hashPass(p) { return sha256(SALT + p); }

  /* ---------- Util ---------- */
  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nowISO() { return new Date().toISOString(); }
  function daysFromNow(d, h) { var x = new Date(); x.setDate(x.getDate() + d); x.setHours(h || 9, 0, 0, 0); return x.toISOString(); }
  function monthsAgo(m, day) { var x = new Date(); x.setMonth(x.getMonth() - m); x.setDate(day || 10); return x.toISOString(); }

  /* ---------- Koneksi Supabase (mode online) ---------- */
  var CFG = window.LMS_CONFIG || {};
  var BADKEY = /^sb_secret_/.test(CFG.supabaseKey || '') || (function () {
    try { return JSON.parse(atob(String(CFG.supabaseKey).split('.')[1])).role === 'service_role'; } catch (e) { return false; }
  })();
  var ONLINE = !BADKEY && !!(CFG.supabaseUrl && CFG.supabaseKey && /^https?:\/\//.test(CFG.supabaseUrl));
  var API = ONLINE ? CFG.supabaseUrl.replace(/\/+$/, '') : '';
  var BUCKET = 'lms-files';
  function apiHeaders(extra) {
    return Object.assign({ apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey }, extra || {});
  }
  var Cloud = {
    rpc: function (fn, args) {
      return fetch(API + '/rest/v1/rpc/' + fn, { method: 'POST', headers: apiHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(args || {}) })
        .catch(function () { throw new Error('Tidak dapat terhubung ke server database. Periksa koneksi internet.'); })
        .then(function (r) {
          return r.text().then(function (t) {
            var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { }
            if (!r.ok) {
              var msg = (j && (j.message || j.hint)) || ('HTTP ' + r.status);
              if (r.status === 404) msg = 'Fungsi database "' + fn + '" tidak ditemukan. Pastikan supabase-setup.sql sudah dijalankan.';
              if (r.status === 401 || r.status === 403) msg = 'Kunci API Supabase ditolak. Periksa isi js/config.js.';
              throw new Error(msg);
            }
            return j;
          });
        });
    }
  };

  /* ---------- IndexedDB untuk file ---------- */
  var DBNAME = 'insanasia_lms_files', STORE = 'files', _db = null;
  function openDB() {
    return new Promise(function (res, rej) {
      if (_db) return res(_db);
      if (!window.indexedDB) return rej(new Error('IndexedDB tidak tersedia'));
      var r = indexedDB.open(DBNAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { _db = r.result; res(_db); };
      r.onerror = function () { rej(r.error); };
    });
  }
  var CloudFiles = {
    put: function (blob, id) {
      var im = /^image\/(\w+)/.exec(blob.type || '');
      var ext = blob.type === 'application/pdf' ? '.pdf' : im ? '.' + im[1] : '';
      id = id || uid('file') + ext;
      return fetch(API + '/storage/v1/object/' + BUCKET + '/' + encodeURIComponent(id), {
        method: 'POST', headers: apiHeaders({ 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'false' }), body: blob
      }).catch(function () { throw new Error('Gagal mengunggah file. Periksa koneksi internet.'); })
        .then(function (r) {
          if (r.ok) return id;
          return r.text().then(function (t) { var m = ''; try { m = JSON.parse(t).message; } catch (e) { m = t; } throw new Error('Unggah file ditolak server: ' + (m || r.status)); });
        });
    },
    url: function (id) { return API + '/storage/v1/object/public/' + BUCKET + '/' + encodeURIComponent(id); },
    get: function (id) { return fetch(CloudFiles.url(id)).then(function (r) { return r.ok ? r.blob() : null; }).catch(function () { return null; }); },
    del: function () { return Promise.resolve(); },
    all: function () { return Promise.resolve({}); },
    clear: function () { return Promise.resolve(); }
  };
  var Files = ONLINE ? CloudFiles : {
    put: function (blob, id) {
      id = id || uid('file');
      return openDB().then(function (db) {
        return new Promise(function (res, rej) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(blob, id);
          tx.oncomplete = function () { res(id); };
          tx.onerror = function () { rej(tx.error); };
        });
      });
    },
    get: function (id) {
      return openDB().then(function (db) {
        return new Promise(function (res, rej) {
          var r = db.transaction(STORE).objectStore(STORE).get(id);
          r.onsuccess = function () { res(r.result || null); };
          r.onerror = function () { rej(r.error); };
        });
      });
    },
    del: function (id) {
      return openDB().then(function (db) {
        return new Promise(function (res) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(id);
          tx.oncomplete = function () { res(); };
          tx.onerror = function () { res(); };
        });
      }).catch(function () { });
    },
    all: function () {
      return openDB().then(function (db) {
        return new Promise(function (res) {
          var out = {}, cur = db.transaction(STORE).objectStore(STORE).openCursor();
          cur.onsuccess = function (e) {
            var c = e.target.result;
            if (c) { out[c.key] = c.value; c.continue(); } else res(out);
          };
          cur.onerror = function () { res(out); };
        });
      });
    },
    clear: function () {
      return openDB().then(function (db) {
        return new Promise(function (res) {
          var tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          tx.oncomplete = function () { res(); };
        });
      }).catch(function () { });
    }
  };

  /* ---------- Data awal (demo) ---------- */
  function seed() {
    var U = function (id, username, name, email, role, pass, extra) {
      return Object.assign({
        id: id, username: username, name: name, email: email, phone: '', role: role,
        passHash: hashPass(pass), status: 'active', createdAt: monthsAgo(6, 2), bio: '', expertise: '', avatar: null
      }, extra || {});
    };
    var users = [
      U('u_lrn', 'Lrn', 'Rina Lestari', 'learner@insanasia.id', 'learner', 'Learner123', { phone: '081234560001', bio: 'Pemilik usaha keripik tempe "Renyah Rina" di Surakarta.', createdAt: monthsAgo(4, 5) }),
      U('u_trn', 'Trn', 'Dimas Prasetyo', 'trainer@insanasia.id', 'trainer', 'Trainer123', { phone: '081234560002', bio: 'Copywriter dan content strategist dengan 8 tahun pengalaman membantu brand lokal.', expertise: 'Copywriting, Content Writing, Brand Storytelling' }),
      U('u_enp', 'Enp', 'Sari Wulandari', 'coach@insanasia.id', 'coach', 'Enterprise123', { phone: '081234560003', bio: 'Enterprise coach dan pengelola program pelatihan UMKM.', expertise: 'Business Development, Program Management' }),
      U('u_adm', 'Adm', 'Admin InsanAsia', 'admin@insanasia.id', 'admin', 'Admin123', { phone: '081234560004' }),
      U('u_exe', 'Exe', 'Bapak Hendra Wijaya', 'executive@insanasia.id', 'executive', 'Executive123', { phone: '081234560005' }),
      U('u_trn2', 'trainer.ayu', 'Ayu Kusumawati', 'ayu@insanasia.id', 'trainer', 'Trainer123', { bio: 'Digital marketer spesialis media sosial untuk UMKM kuliner dan fesyen.', expertise: 'Digital Marketing, Social Media Ads' })
    ];
    var names = ['Budi Santoso', 'Citra Maharani', 'Eko Saputro', 'Fitri Handayani', 'Gilang Ramadhan', 'Hana Pertiwi', 'Indra Kurniawan', 'Joko Susilo', 'Kartika Dewi', 'Lukman Hakim', 'Maya Anggraini', 'Nanda Pratama', 'Oktavia Sari', 'Putra Wibowo'];
    names.forEach(function (n, i) {
      users.push(U('u_l' + i, 'peserta' + (i + 1), n, 'peserta' + (i + 1) + '@contoh.id', 'learner', 'Peserta123', { createdAt: monthsAgo(5 - (i % 6), 3 + i) }));
    });

    var categories = [
      { id: 'c_copy', name: 'Copywriting & Content Writing', slug: 'copywriting', description: 'Menulis pesan promosi yang membujuk dan menjual.' },
      { id: 'c_dm', name: 'Digital Marketing & Social Media', slug: 'digital-marketing', description: 'Strategi pemasaran digital dan media sosial.' },
      { id: 'c_biz', name: 'Business Development for UMKM', slug: 'business-development', description: 'Pengembangan model bisnis dan operasional UMKM.' },
      { id: 'c_pro', name: 'Personal & Professional Skills', slug: 'personal-skills', description: 'Keterampilan diri dan profesional (pengembangan bertahap).' }
    ];

    var programs = [
      {
        id: 'p_copy', categoryId: 'c_copy', title: 'Copywriting for UMKM', level: 'Pemula', duration: '6 modul • ±8 jam',
        summary: 'Belajar menyusun kata-kata promosi yang menarik, jelas, dan membujuk pelanggan untuk membeli produk UMKM Anda.',
        description: 'Program unggulan InsanAsia yang membantu pelaku UMKM memahami dan mempraktikkan copywriting: mulai dari pengenalan, langkah dasar, rumus 4P, iklan singkat, karakteristik bahasa, hingga manfaat copywriting untuk pertumbuhan usaha. Peserta akan membuat portofolio copy untuk produknya sendiri dan mendapat feedback langsung dari trainer.',
        objectives: ['Memahami konsep dan fungsi copywriting bagi UMKM', 'Menyusun copy dengan langkah dasar yang terstruktur', 'Menerapkan rumus 4P (Picture, Promise, Prove, Push)', 'Membuat iklan singkat dan caption media sosial yang efektif', 'Menggunakan karakteristik bahasa yang persuasif'],
        status: 'published', featured: true, trainerId: 'u_trn', thumbnail: null, color: '#6D28D9', isFree: true
      },
      {
        id: 'p_social', categoryId: 'c_dm', title: 'Social Media Marketing untuk UMKM', level: 'Pemula', duration: '4 modul • ±6 jam',
        summary: 'Kelola Instagram, TikTok, dan WhatsApp Business agar produk Anda dikenal dan dibeli lebih banyak orang.',
        description: 'Peserta mempelajari cara menyusun kalender konten, membuat konten yang konsisten, membaca insight, dan menjalankan iklan berbayar sederhana dengan anggaran terbatas.',
        objectives: ['Menyusun kalender konten bulanan', 'Membuat konten yang konsisten dengan identitas brand', 'Membaca insight dan metrik dasar', 'Menjalankan iklan berbayar sederhana'],
        status: 'published', featured: true, trainerId: 'u_trn2', thumbnail: null, color: '#111111', isFree: true
      },
      {
        id: 'p_biz', categoryId: 'c_biz', title: 'Business Model Canvas untuk UMKM', level: 'Menengah', duration: '3 modul • ±4 jam',
        summary: 'Petakan model bisnis Anda dalam satu halaman dan temukan peluang pertumbuhan baru.',
        description: 'Workshop praktis memetakan 9 blok Business Model Canvas, menguji asumsi, dan menyusun rencana aksi pengembangan usaha.',
        objectives: ['Memahami 9 blok Business Model Canvas', 'Memetakan model bisnis usaha sendiri', 'Menyusun rencana aksi pengembangan'],
        status: 'published', featured: true, trainerId: 'u_enp', thumbnail: null, color: '#8B5CF6', isFree: true
      },
      {
        id: 'p_prod', categoryId: 'c_copy', title: 'Menulis Deskripsi Produk Marketplace', level: 'Pemula', duration: '2 modul • ±3 jam',
        summary: 'Tulis judul dan deskripsi produk yang mudah ditemukan dan meyakinkan pembeli di marketplace.',
        description: 'Kelas singkat tentang struktur deskripsi produk, kata kunci pencarian, dan cara menjawab keraguan pembeli melalui tulisan.',
        objectives: ['Menyusun judul produk yang SEO-friendly', 'Menulis deskripsi yang menjawab kebutuhan pembeli'],
        status: 'draft', featured: false, trainerId: 'u_trn', thumbnail: null, color: '#4C1D95', isFree: true
      }
    ];

    var classes = [
      { id: 'k_copy1', programId: 'p_copy', name: 'Batch 1 – Kelas Daring', trainerId: 'u_trn', startAt: daysFromNow(-20), endAt: daysFromNow(25), capacity: 40, mode: 'Self-paced + Live', status: 'ongoing', location: 'Zoom Meeting', meetingLink: 'https://zoom.us/', sessions: [{ title: 'Live Q&A: Rumus 4P', at: daysFromNow(3, 19) }, { title: 'Workshop: Review Copy Peserta', at: daysFromNow(10, 19) }] },
      { id: 'k_copy2', programId: 'p_copy', name: 'Batch 2 – Workshop Surakarta', trainerId: 'u_trn', startAt: daysFromNow(30), endAt: daysFromNow(60), capacity: 25, mode: 'Workshop Tatap Muka', status: 'published', location: 'Aula InsanAsia, Surakarta', meetingLink: '', sessions: [{ title: 'Pembukaan & Pretest', at: daysFromNow(30, 9) }] },
      { id: 'k_social1', programId: 'p_social', name: 'Batch 1 – Kelas Daring', trainerId: 'u_trn2', startAt: daysFromNow(-5), endAt: daysFromNow(30), capacity: 50, mode: 'Self-paced + Live', status: 'ongoing', location: 'Google Meet', meetingLink: 'https://meet.google.com/', sessions: [{ title: 'Live: Membaca Insight Instagram', at: daysFromNow(5, 19) }] },
      { id: 'k_biz1', programId: 'p_biz', name: 'Batch 1 – Workshop', trainerId: 'u_enp', startAt: daysFromNow(14), endAt: daysFromNow(16), capacity: 30, mode: 'Workshop Tatap Muka', status: 'published', location: 'Surakarta', meetingLink: '', sessions: [{ title: 'Workshop Hari 1', at: daysFromNow(14, 9) }] }
    ];

    var modules = [
      { id: 'm1', programId: 'p_copy', title: 'Modul 1 – Pengenalan Copywriting', order: 1 },
      { id: 'm2', programId: 'p_copy', title: 'Modul 2 – Langkah Dasar Menyusun Copywriting', order: 2 },
      { id: 'm3', programId: 'p_copy', title: 'Modul 3 – Rumus Copywriting Metode 4P', order: 3 },
      { id: 'm4', programId: 'p_copy', title: 'Modul 4 – Iklan Singkat dan Sederhana', order: 4 },
      { id: 'm5', programId: 'p_copy', title: 'Modul 5 – Karakteristik Bahasa Copywriting', order: 5 },
      { id: 'm6', programId: 'p_copy', title: 'Modul 6 – Pentingnya Copywriting bagi UMKM', order: 6 },
      { id: 'ms1', programId: 'p_social', title: 'Modul 1 – Fondasi Media Sosial Bisnis', order: 1 },
      { id: 'ms2', programId: 'p_social', title: 'Modul 2 – Kalender & Produksi Konten', order: 2 },
      { id: 'mb1', programId: 'p_biz', title: 'Modul 1 – Mengenal Business Model Canvas', order: 1 }
    ];

    var L = function (id, moduleId, order, title, type, content, url, dur) {
      return { id: id, moduleId: moduleId, order: order, title: title, type: type, content: content || '', url: url || '', fileId: null, fileName: '', required: true, published: true, duration: dur || '10 menit' };
    };
    var lessons = [
      L('l1a', 'm1', 1, 'Apa itu Copywriting?', 'text',
        '## Pengertian Copywriting\nCopywriting adalah seni dan teknik menggunakan **bahasa yang tepat** untuk mempromosikan produk atau membujuk calon pelanggan agar melakukan tindakan tertentu, misalnya membeli, mendaftar, atau menghubungi penjual.\n\n## Di mana copywriting digunakan?\n- Caption media sosial (Instagram, TikTok, Facebook)\n- Deskripsi produk di marketplace\n- Brosur, spanduk, dan poster\n- Pesan broadcast WhatsApp\n- Iklan berbayar\n\n## Copywriting vs Content Writing\nCopywriting berfokus pada **tindakan** (menjual/membujuk), sedangkan content writing berfokus pada **informasi dan edukasi** untuk membangun kepercayaan.', '', '12 menit'),
      L('l1b', 'm1', 2, 'Video: Copywriting dalam 5 Menit', 'video', 'Tonton video pengantar berikut, lalu catat 3 hal yang paling Anda ingat.', 'https://www.youtube.com/watch?v=ysEN5RaKOlA', '5 menit'),
      L('l2a', 'm2', 1, 'Kenali Produk dan Target Pasar', 'text',
        '## Langkah 1 – Kenali produk Anda\nTuliskan keunggulan, bahan, proses, dan alasan produk Anda berbeda dari yang lain.\n\n## Langkah 2 – Kenali target pembeli\nSiapa mereka? Berapa usianya? Apa masalah yang ingin mereka selesaikan?\n\n## Langkah 3 – Ubah fitur menjadi manfaat\n- Fitur: *keripik tanpa pengawet*\n- Manfaat: **camilan aman untuk anak-anak Anda**\n\n## Langkah 4 – Tentukan satu ajakan bertindak (CTA)\nContoh: "Pesan sekarang via WhatsApp", "Klik link di bio".', '', '15 menit'),
      L('l2b', 'm2', 2, 'Lembar Kerja: Profil Produk & Pembeli', 'link', 'Unduh/isi lembar kerja berikut sebelum melanjutkan ke modul berikutnya.', 'https://docs.google.com/', '10 menit'),
      L('l3a', 'm3', 1, 'Rumus 4P: Picture, Promise, Prove, Push', 'text',
        '## Picture – Gambarkan situasi\nBuat pembaca membayangkan masalah atau keinginan mereka.\n\n## Promise – Janjikan solusi\nTunjukkan bagaimana produk Anda menyelesaikan masalah tersebut.\n\n## Prove – Buktikan\nGunakan testimoni, data, sertifikasi, atau foto hasil.\n\n## Push – Dorong tindakan\nBeri alasan untuk bertindak sekarang: promo terbatas, stok terbatas, bonus.\n\n**Contoh:**\n"Bingung cari camilan sehat untuk si kecil? (Picture) Keripik Tempe Renyah Rina dibuat tanpa pengawet dan MSG (Promise). Sudah dipercaya 1.000+ ibu di Solo (Prove). Pesan hari ini, gratis ongkir se-Solo Raya! (Push)"', '', '20 menit'),
      L('l4a', 'm4', 1, 'Menulis Iklan Singkat yang Mengena', 'text',
        '## Prinsip iklan singkat\n- Satu pesan utama per iklan\n- Kalimat pendek, kata kerja aktif\n- Gunakan angka spesifik\n- Akhiri dengan CTA yang jelas\n\n## Formula cepat\n**[Masalah] + [Solusi] + [CTA]**\n\nContoh: "Kopi pahit bikin mood turun? Coba Kopi Gula Aren Mbak Sri, manisnya pas! Order via link di bio."', '', '15 menit'),
      L('l5a', 'm5', 1, 'Karakteristik Bahasa Copywriting', 'text',
        '## Ciri bahasa copywriting yang efektif\n1. **Sederhana** – mudah dipahami semua kalangan\n2. **Personal** – menyapa langsung dengan "Anda" atau "Kak"\n3. **Emosional** – menyentuh perasaan pembaca\n4. **Spesifik** – menggunakan angka dan detail\n5. **Jujur** – tidak melebih-lebihkan atau menyesatkan\n\n## Kata-kata pemicu\nGratis, baru, terbatas, eksklusif, mudah, terbukti, hemat.', '', '12 menit'),
      L('l6a', 'm6', 1, 'Pentingnya Copywriting bagi UMKM', 'text',
        '## Mengapa UMKM perlu copywriting?\n- Membedakan produk dari kompetitor\n- Meningkatkan konversi penjualan tanpa menambah biaya iklan\n- Membangun citra dan kepercayaan brand\n- Menjangkau pasar lebih luas melalui media digital\n\n## Tugas Akhir (Capstone)\nSusun 3 copy untuk produk Anda sendiri: 1 caption Instagram, 1 deskripsi produk marketplace, dan 1 pesan broadcast WhatsApp menggunakan rumus 4P.', '', '10 menit'),
      L('ls1a', 'ms1', 1, 'Memilih Platform yang Tepat', 'text', '## Kenali karakter tiap platform\n- **Instagram**: visual, katalog produk\n- **TikTok**: video singkat, jangkauan organik besar\n- **WhatsApp Business**: layanan pelanggan & penjualan langsung', '', '10 menit'),
      L('ls2a', 'ms2', 1, 'Menyusun Kalender Konten', 'text', '## Pilar konten\nBagi konten menjadi edukasi, promosi, interaksi, dan di balik layar dengan rasio seimbang.', '', '12 menit'),
      L('lb1a', 'mb1', 1, '9 Blok Business Model Canvas', 'text', '## Sembilan blok\nCustomer Segments, Value Propositions, Channels, Customer Relationships, Revenue Streams, Key Resources, Key Activities, Key Partnerships, Cost Structure.', '', '15 menit')
    ];

    var Q = function (text, options, answer) { return { id: uid('q'), text: text, options: options, answer: answer, weight: 1 }; };
    var assessments = [
      {
        id: 'a_pre', programId: 'p_copy', moduleId: null, title: 'Pretest Copywriting', type: 'pretest', source: 'builtin', passingScore: 0, maxAttempts: 1, published: true, required: false, instructions: 'Kerjakan pretest untuk mengukur pemahaman awal Anda. Nilai tidak memengaruhi kelulusan.',
        questions: [
          Q('Copywriting adalah ...', ['Menyalin tulisan orang lain', 'Teknik menulis untuk membujuk pembaca melakukan tindakan', 'Menulis cerita fiksi', 'Mendesain logo'], 1),
          Q('Contoh media copywriting adalah ...', ['Caption Instagram', 'Laporan keuangan', 'Surat lamaran kerja', 'Jurnal ilmiah'], 0),
          Q('CTA adalah singkatan dari ...', ['Call To Action', 'Content To Ads', 'Copy Text Area', 'Customer Target Audience'], 0)
        ]
      },
      {
        id: 'a_q3', programId: 'p_copy', moduleId: 'm3', title: 'Kuis Modul 3 – Rumus 4P', type: 'quiz', source: 'builtin', passingScore: 70, maxAttempts: 3, published: true, required: true, instructions: 'Jawab semua pertanyaan tentang rumus 4P.',
        questions: [
          Q('Huruf P pertama dalam rumus 4P adalah ...', ['Price', 'Picture', 'Product', 'Place'], 1),
          Q('Bagian "Prove" berfungsi untuk ...', ['Memberi bukti agar pembaca percaya', 'Menentukan harga', 'Menutup penjualan', 'Membuat logo'], 0),
          Q('"Pesan hari ini, gratis ongkir!" termasuk bagian ...', ['Picture', 'Promise', 'Prove', 'Push'], 3),
          Q('Testimoni pelanggan paling tepat digunakan pada bagian ...', ['Picture', 'Prove', 'Push', 'Promise'], 1)
        ]
      },
      {
        id: 'a_q5link', programId: 'p_copy', moduleId: 'm5', title: 'Latihan Karakteristik Bahasa (Google Form)', type: 'quiz', source: 'link', url: 'https://forms.google.com/', passingScore: 70, maxAttempts: 1, published: true, required: false,
        instructions: 'Kerjakan latihan melalui tautan Google Form berikut. Setelah selesai, kirim tangkapan layar atau ringkasan jawaban Anda agar trainer dapat memberi nilai.', questions: []
      },
      {
        id: 'a_task', programId: 'p_copy', moduleId: 'm6', title: 'Tugas Akhir: Portofolio 3 Copy Produk', type: 'assignment', source: 'builtin', passingScore: 70, maxAttempts: 2, published: true, required: true, dueAt: daysFromNow(14, 23),
        instructions: 'Buat 3 copy untuk produk Anda: (1) caption Instagram, (2) deskripsi produk marketplace, (3) pesan broadcast WhatsApp. Gunakan rumus 4P. Kirim dalam bentuk teks, tautan dokumen, atau file PDF.', questions: []
      },
      {
        id: 'a_post', programId: 'p_copy', moduleId: null, title: 'Post-test Copywriting', type: 'posttest', source: 'builtin', passingScore: 70, maxAttempts: 3, published: true, required: true, instructions: 'Post-test mengukur pemahaman akhir. Nilai minimal kelulusan 70.',
        questions: [
          Q('Langkah pertama menyusun copywriting adalah ...', ['Menentukan harga', 'Mengenali produk dan target pasar', 'Membuat logo', 'Membuka toko online'], 1),
          Q('Mengubah fitur menjadi manfaat berarti ...', ['Menjelaskan apa yang didapat pembeli dari fitur tersebut', 'Menambah fitur baru', 'Menurunkan harga', 'Menghapus fitur'], 0),
          Q('Ciri bahasa copywriting yang efektif, KECUALI ...', ['Sederhana', 'Spesifik', 'Berbelit-belit', 'Personal'], 2),
          Q('Iklan singkat sebaiknya memiliki ...', ['Banyak pesan sekaligus', 'Satu pesan utama dan CTA jelas', 'Tanpa CTA', 'Kalimat sangat panjang'], 1),
          Q('Manfaat copywriting bagi UMKM adalah ...', ['Meningkatkan konversi penjualan', 'Mengurangi kualitas produk', 'Menambah biaya produksi', 'Menghapus kebutuhan pemasaran'], 0)
        ]
      },
      {
        id: 'a_spost', programId: 'p_social', moduleId: null, title: 'Kuis Akhir Social Media', type: 'posttest', source: 'builtin', passingScore: 70, maxAttempts: 3, published: true, required: true, instructions: 'Kuis akhir program.',
        questions: [
          Q('Platform yang paling cocok untuk layanan pelanggan langsung adalah ...', ['WhatsApp Business', 'LinkedIn', 'Pinterest', 'Email marketing'], 0),
          Q('Pilar konten yang bertujuan mengajarkan sesuatu disebut ...', ['Promosi', 'Edukasi', 'Hiburan', 'Iklan'], 1)
        ]
      }
    ];

    // Enrollments + aktivitas demo
    var enrollments = [], progress = [], attempts = [], submissions = [], certificates = [];
    var copyLessons = lessons.filter(function (l) { return ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].indexOf(l.moduleId) > -1; });
    enrollments.push({ id: 'e_lrn1', userId: 'u_lrn', classId: 'k_copy1', programId: 'p_copy', status: 'active', enrolledAt: daysFromNow(-18), rating: null, review: '' });
    ['l1a', 'l1b', 'l2a', 'l2b'].forEach(function (lid) { progress.push({ userId: 'u_lrn', lessonId: lid, completedAt: daysFromNow(-10) }); });
    attempts.push({ id: uid('at'), assessmentId: 'a_pre', userId: 'u_lrn', score: 67, answers: [1, 0, 1], submittedAt: daysFromNow(-17), passed: true });

    names.forEach(function (n, i) {
      var uidL = 'u_l' + i;
      var cls = i % 3 === 2 ? 'k_social1' : 'k_copy1';
      var pid = cls === 'k_social1' ? 'p_social' : 'p_copy';
      var done = i % 4 !== 3;
      var month = 5 - (i % 6);
      enrollments.push({ id: 'e_' + i, userId: uidL, classId: cls, programId: pid, status: (done && i % 2 === 0) ? 'completed' : 'active', enrolledAt: monthsAgo(month, 5 + i), rating: done ? (4 + (i % 2)) : null, review: '' });
      if (pid === 'p_copy') {
        var n2 = done ? copyLessons.length : Math.min(copyLessons.length, 2 + i % 4);
        copyLessons.slice(0, n2).forEach(function (l) { progress.push({ userId: uidL, lessonId: l.id, completedAt: monthsAgo(month, 15) }); });
        attempts.push({ id: uid('at'), assessmentId: 'a_pre', userId: uidL, score: 33 + (i % 3) * 17, answers: [], submittedAt: monthsAgo(month, 6), passed: true });
        if (done) {
          attempts.push({ id: uid('at'), assessmentId: 'a_q3', userId: uidL, score: 75 + (i % 3) * 8, answers: [], submittedAt: monthsAgo(month, 16), passed: true });
          attempts.push({ id: uid('at'), assessmentId: 'a_post', userId: uidL, score: 72 + (i % 4) * 7, answers: [], submittedAt: monthsAgo(month, 25), passed: true });
          submissions.push({ id: uid('sb'), assessmentId: 'a_task', userId: uidL, text: 'Caption IG: "Lapar tengah malam? ..." (contoh jawaban peserta)', url: '', fileId: null, fileName: '', score: i % 2 === 0 ? 85 : null, feedback: i % 2 === 0 ? 'Struktur 4P sudah jelas. Perkuat bagian Prove dengan testimoni.' : '', status: i % 2 === 0 ? 'graded' : 'submitted', submittedAt: monthsAgo(month, 22), gradedAt: i % 2 === 0 ? monthsAgo(month, 24) : null, gradedBy: 'u_trn' });
          if (i % 2 === 0) certificates.push({ id: uid('ct'), userId: uidL, programId: 'p_copy', classId: 'k_copy1', number: 'IA/CW/' + (2026) + '/' + String(100 + i), code: ('IA' + (Math.random().toString(36).slice(2, 8))).toUpperCase(), issuedAt: monthsAgo(month, 26) });
        }
      } else if (done) {
        progress.push({ userId: uidL, lessonId: 'ls1a', completedAt: monthsAgo(month, 15) });
        progress.push({ userId: uidL, lessonId: 'ls2a', completedAt: monthsAgo(month, 16) });
        attempts.push({ id: uid('at'), assessmentId: 'a_spost', userId: uidL, score: 80 + (i % 3) * 5, answers: [], submittedAt: monthsAgo(month, 20), passed: true });
        if (i % 2 === 0) certificates.push({ id: uid('ct'), userId: uidL, programId: 'p_social', classId: 'k_social1', number: 'IA/DM/2026/' + String(200 + i), code: ('IA' + (Math.random().toString(36).slice(2, 8))).toUpperCase(), issuedAt: monthsAgo(month, 26) });
      }
    });
    // Sertifikat contoh dengan kode tetap untuk uji verifikasi
    certificates.push({ id: 'ct_demo', userId: 'u_l0', programId: 'p_social', classId: 'k_social1', number: 'IA/DM/2026/001', code: 'IA-DEMO-2026', issuedAt: monthsAgo(1, 12) });

    var articles = [
      { id: 'ar1', title: '5 Kesalahan Copywriting yang Sering Dilakukan UMKM', slug: '5-kesalahan-copywriting', excerpt: 'Hindari kesalahan umum ini agar promosi Anda lebih efektif.', body: 'Banyak pelaku UMKM menulis caption hanya berisi harga dan foto produk. Padahal pembeli membutuhkan alasan untuk membeli.\n\n1. Hanya menjelaskan fitur, bukan manfaat.\n2. Tidak ada ajakan bertindak (CTA).\n3. Kalimat terlalu panjang dan berbelit.\n4. Tidak mengenal target pembeli.\n5. Tidak konsisten dengan gaya bahasa brand.\n\nMulailah dengan mengenali pembeli Anda, lalu tulis dengan bahasa mereka.', authorId: 'u_trn', status: 'published', date: daysFromNow(-12), cover: null },
      { id: 'ar2', title: 'Rumus 4P: Cara Cepat Menulis Caption yang Menjual', slug: 'rumus-4p', excerpt: 'Picture, Promise, Prove, Push — empat langkah sederhana untuk caption yang membujuk.', body: 'Rumus 4P adalah salah satu kerangka copywriting paling mudah dipraktikkan.\n\nPicture: gambarkan situasi pembaca.\nPromise: janjikan solusi.\nProve: berikan bukti.\nPush: dorong pembaca bertindak sekarang.\n\nCobalah menulis satu caption hari ini dengan rumus ini.', authorId: 'u_trn', status: 'published', date: daysFromNow(-6), cover: null },
      { id: 'ar3', title: 'Memanfaatkan WhatsApp Business untuk Meningkatkan Penjualan', slug: 'whatsapp-business', excerpt: 'Fitur katalog, label, dan pesan otomatis yang sering terlupakan.', body: 'WhatsApp Business memiliki fitur katalog, label pelanggan, balasan cepat, dan pesan sambutan otomatis. Gunakan fitur-fitur ini untuk melayani pelanggan lebih cepat dan profesional.', authorId: 'u_trn2', status: 'published', date: daysFromNow(-2), cover: null }
    ];
    var testimonials = [
      { id: 't1', name: 'Bu Siti', role: 'Pemilik Batik Siti, Laweyan', text: 'Setelah ikut kelas copywriting, caption Instagram saya jadi lebih hidup dan pesanan lewat DM meningkat.', visible: true },
      { id: 't2', name: 'Mas Agus', role: 'Kedai Kopi Agus', text: 'Materinya praktis dan langsung bisa dipakai. Feedback trainer sangat membantu memperbaiki tulisan saya.', visible: true },
      { id: 't3', name: 'Dewi', role: 'Mahasiswa & Reseller Skincare', text: 'Belajar mandiri jadi mudah karena progresnya terlihat jelas di dashboard.', visible: true }
    ];
    var faqs = [
      { id: 'f1', q: 'Apakah pelatihan di InsanAsia berbayar?', a: 'Pada tahap prototype, seluruh program dapat diikuti secara gratis. Informasi biaya akan diumumkan pada halaman detail program.', visible: true },
      { id: 'f2', q: 'Bagaimana cara mendaftar kelas?', a: 'Buat akun peserta melalui tombol "Daftar", pilih program di katalog, lalu klik "Daftar Kelas" pada batch yang tersedia.', visible: true },
      { id: 'f3', q: 'Kapan sertifikat diterbitkan?', a: 'Sertifikat terbit otomatis setelah Anda menyelesaikan seluruh materi wajib dan lulus assessment wajib (post-test dan tugas akhir) sesuai batas nilai.', visible: true },
      { id: 'f4', q: 'Bagaimana memverifikasi keaslian sertifikat?', a: 'Masukkan kode verifikasi yang tertera pada sertifikat di halaman "Verifikasi Sertifikat".', visible: true },
      { id: 'f5', q: 'Saya lupa kata sandi, apa yang harus dilakukan?', a: 'Gunakan menu "Lupa kata sandi" di halaman Masuk.', visible: true }
    ];
    var announcements = [
      { id: 'an1', title: 'Pendaftaran Batch 2 Copywriting for UMKM dibuka!', body: 'Kuota terbatas 25 peserta untuk workshop tatap muka di Surakarta.', visible: true, date: daysFromNow(-1) }
    ];

    var settings = {
      siteName: 'InsanAsia LMS',
      siteFullName: 'InsanAsia Learning Management System',
      tagline: 'Learn. Create. Grow.',
      logo: null,
      email: 'info@insanasia.id',
      phone: '(0271) 123456',
      whatsapp: '6281234567890',
      address: 'Jl. Slamet Riyadi No. 1, Surakarta, Jawa Tengah',
      hours: 'Senin – Jumat, 08.00 – 16.00 WIB',
      heroTitle: 'Tingkatkan Skill, Kembangkan Potensi, Wujudkan Peluang Baru.',
      heroDesc: 'Belajar keterampilan praktis bersama InsanAsia melalui program pelatihan yang terarah, fleksibel, dan aplikatif untuk mendukung perkembangan diri maupun bisnis.',
      heroImage: null,
      profile: 'InsanAsia adalah lembaga kursus dan pelatihan yang berfokus pada pengembangan keterampilan praktis bagi masyarakat dan pelaku UMKM. Melalui InsanAsia LMS, kami menghadirkan pengalaman belajar digital yang terstruktur — dari pendaftaran, materi, latihan, evaluasi, hingga e-sertifikat.',
      vision: 'Menjadi lembaga pelatihan terdepan yang membantu masyarakat dan UMKM Indonesia tumbuh melalui keterampilan praktis dan pembelajaran berkelanjutan.',
      mission: 'Menyediakan pelatihan yang aplikatif dan mudah dijangkau\nMenghadirkan trainer praktisi yang berpengalaman\nMendampingi peserta hingga mampu menerapkan ilmunya\nMembangun ekosistem belajar yang inklusif dan berkelanjutan',
      instagram: 'https://instagram.com/', facebook: 'https://facebook.com/', youtube: 'https://youtube.com/', linkedin: '',
      footerText: 'Lembaga kursus dan pelatihan keterampilan praktis untuk masyarakat dan UMKM.',
      certSigner: 'Direktur InsanAsia', certSignerName: 'Hendra Wijaya', certIssuer: 'InsanAsia Training Center',
      allowRegistration: true
    };

    return {
      meta: { version: 3, createdAt: nowISO(), siteVersion: null },
      settings: settings, users: users, categories: categories, programs: programs, classes: classes,
      modules: modules, lessons: lessons, assessments: assessments, enrollments: enrollments, progress: progress,
      attempts: attempts, submissions: submissions, certificates: certificates, articles: articles,
      testimonials: testimonials, faqs: faqs, announcements: announcements,
      notifications: [
        { id: uid('n'), userId: 'u_lrn', text: 'Selamat datang di InsanAsia LMS! Lanjutkan kelas Copywriting for UMKM Anda.', link: '#/my-learning', read: false, date: daysFromNow(-1) },
        { id: uid('n'), userId: 'u_lrn', text: 'Sesi live "Live Q&A: Rumus 4P" akan berlangsung 3 hari lagi.', link: '#/dashboard', read: false, date: daysFromNow(0) },
        { id: uid('n'), userId: 'u_trn', text: '7 tugas akhir menunggu penilaian Anda.', link: '#/grading', read: false, date: daysFromNow(0) }
      ],
      logs: [
        { id: uid('lg'), userId: 'u_adm', action: 'Menerbitkan program "Copywriting for UMKM"', entity: 'program', date: monthsAgo(6, 3) },
        { id: uid('lg'), userId: 'u_trn', action: 'Menambahkan materi "Rumus 4P"', entity: 'lesson', date: monthsAgo(5, 3) }
      ],
      resets: []
    };
  }

  /* ---------- Store ---------- */
  var KEY = 'insanasia_lms_v3';
  var SESSION = 'insanasia_lms_session';
  var data = null;

  /* ===== Mode online: muat, sinkronkan, inisialisasi ===== */
  var TOKEN = 'insanasia_lms_token';
  var COLLS = ['users', 'categories', 'programs', 'classes', 'modules', 'lessons', 'assessments', 'enrollments', 'progress', 'attempts',
    'submissions', 'certificates', 'articles', 'testimonials', 'faqs', 'announcements', 'notifications', 'logs', 'messages'];
  var snap = {}, meId = null, lastLoad = 0, syncTimer = null, syncing = null, stats = {};
  function getToken() { return sessionStorage.getItem(TOKEN) || localStorage.getItem(TOKEN); }
  function setToken(t, remember) { clearToken(); (remember ? localStorage : sessionStorage).setItem(TOKEN, t); }
  function clearToken() { sessionStorage.removeItem(TOKEN); localStorage.removeItem(TOKEN); }
  function recKey(r) { return r.id || (r.userId + '|' + r.lessonId); }
  function currentMap() {
    var m = {};
    COLLS.forEach(function (c) { (data[c] || []).forEach(function (r) { m[c + '\u0001' + recKey(r)] = JSON.stringify(r); }); });
    m['settings\u0001main'] = JSON.stringify(data.settings);
    return m;
  }
  function byDateDesc(a, b) { return new Date(b.date) - new Date(a.date); }
  function loadOnline() {
    return Cloud.rpc('lms_load', { p_token: getToken() }).then(function (res) {
      var d = { meta: { version: 3, online: true }, resets: [] };
      COLLS.forEach(function (c) { d[c] = []; });
      (res.records || []).forEach(function (r) {
        if (r.c === 'settings') d.settings = r.d;
        else if (d[r.c]) d[r.c].push(r.d);
      });
      d.users = res.users || [];
      if (!d.settings) d.settings = seed().settings;
      ['logs', 'notifications', 'messages'].forEach(function (c) { d[c].sort(byDateDesc); });
      stats = res.stats || {};
      DB.needsInit = !res.initialized;
      meId = res.me ? res.me.id : null;
      if (!res.me && getToken()) clearToken();
      data = d;
      snap = currentMap();
      lastLoad = Date.now();
    });
  }
  function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(flush, 250); }
  function flush() {
    clearTimeout(syncTimer); syncTimer = null;
    if (!ONLINE || !data) return Promise.resolve();
    if (syncing) return syncing.then(flush);
    var cur = currentMap(), changes = [], sent = {};
    Object.keys(cur).forEach(function (k) {
      if (snap[k] !== cur[k]) { var p = k.split('\u0001'); changes.push({ c: p[0], i: p[1], d: JSON.parse(cur[k]) }); sent[k] = cur[k]; }
    });
    Object.keys(snap).forEach(function (k) {
      if (!(k in cur)) { var p = k.split('\u0001'); changes.push({ c: p[0], i: p[1], d: null }); sent[k] = null; }
    });
    if (!changes.length) return Promise.resolve();
    syncing = Cloud.rpc('lms_sync', { p_token: getToken(), p_changes: changes }).then(function (res) {
      Object.keys(sent).forEach(function (k) { if (sent[k] === null) delete snap[k]; else snap[k] = sent[k]; });
      (data.users || []).forEach(function (u) { if ('passHash' in u) { delete u.passHash; snap['users\u0001' + u.id] = JSON.stringify(u); } });
      if (res && res.error) throw new Error(res.error);
      if (res && res.rejected && res.rejected.length) {
        if (window.UI) UI.toast('Sebagian perubahan tidak disimpan karena hak akses Anda.', 'error');
        return loadOnline().then(function () { if (window.App) App.refresh(); });
      }
    }).catch(function (err) {
      if (window.UI) UI.toast('Gagal menyimpan ke server: ' + err.message, 'error');
      return loadOnline().then(function () { if (window.App) App.refresh(); }).catch(function () { });
    }).then(function () { syncing = null; });
    return syncing;
  }
  window.addEventListener('beforeunload', function (e) {
    if (ONLINE && (syncTimer || syncing)) { flush(); e.preventDefault(); e.returnValue = 'Perubahan sedang disimpan.'; }
  });
  document.addEventListener('visibilitychange', function () { if (ONLINE && document.visibilityState === 'hidden') flush(); });

  function initOnline() {
    var s = seed(), records = [];
    records.push({ c: 'settings', i: 'main', d: s.settings });
    COLLS.forEach(function (c) { if (c === 'users') return; (s[c] || []).forEach(function (r) { records.push({ c: c, i: recKey(r), d: r }); }); });
    return Cloud.rpc('lms_init', { p_users: s.users, p_records: records }).then(function (res) {
      if (res && res.error) throw new Error(res.error);
      return loadOnline();
    });
  }

  function load() {
    if (BADKEY) return Promise.reject(new Error('Kunci di js/config.js adalah SECRET / service_role key yang tidak boleh dipasang di website. Ganti dengan Publishable key (sb_publishable_…) atau anon key, lalu segera buat ulang (rotate) secret key tersebut di Supabase.'));
    if (ONLINE) return loadOnline();
    var site = window.SITE_DATA;
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
    // Jika ada site-data.js (hasil "Publikasikan Data") versi baru, gunakan sebagai data awal
    if (site && site.meta && site.meta.siteVersion && (!data || data.meta.siteVersion !== site.meta.siteVersion)) {
      var files = site.files || {};
      data = JSON.parse(JSON.stringify(site));
      delete data.files;
      save();
      Object.keys(files).forEach(function (fid) {
        fetch(files[fid]).then(function (r) { return r.blob(); }).then(function (b) { Files.put(b, fid); }).catch(function () { });
      });
      return Promise.resolve();
    }
    if (!data || !data.meta || data.meta.version !== 3) { data = seed(); save(); }
    return Promise.resolve();
  }
  function save() {
    if (ONLINE) { scheduleSync(); return true; }
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) {
      if (window.UI) UI.toast('Penyimpanan browser penuh. Kurangi ukuran gambar atau hapus data lama.', 'error');
      return false;
    }
  }

  var DB = {
    sha256: sha256, hashPass: hashPass, uid: uid, Files: Files,
    online: ONLINE, needsInit: false,
    get data() { return data; },
    load: load, save: save, flush: flush, initOnline: initOnline,
    /* Muat ulang dari server bila data sudah lebih dari 30 detik */
    refreshIfStale: function () {
      if (!ONLINE || Date.now() - lastLoad < 30000) return Promise.resolve(false);
      return flush().then(loadOnline).then(function () { return true; });
    },
    verify: function (code) { return Cloud.rpc('lms_verify', { p_code: code }); },
    classCount: function (kid) {
      var local = data.enrollments.filter(function (e) { return e.classId === kid; }).length;
      return ONLINE && stats.classCounts ? Math.max(local, Number(stats.classCounts[kid] || 0)) : local;
    },
    bumpClass: function (kid) { if (stats.classCounts) stats.classCounts[kid] = Number(stats.classCounts[kid] || 0) + 1; },
    countLearners: function () { var n = data.users.filter(function (u) { return u.role === 'learner'; }).length; return ONLINE && stats.learners != null ? Math.max(n, stats.learners) : n; },
    countCertificates: function () { var n = data.certificates.length; return ONLINE && stats.certificates != null ? Math.max(n, stats.certificates) : n; },
    reset: function () { data = seed(); save(); return Files.clear(); },
    replaceAll: function (obj) { data = obj; save(); },
    all: function (t) { return data[t] || []; },
    find: function (t, id) { return (data[t] || []).find(function (x) { return x.id === id; }) || null; },
    where: function (t, fn) { return (data[t] || []).filter(fn); },
    insert: function (t, obj) { if (!obj.id) obj.id = uid(t.slice(0, 2)); data[t].push(obj); save(); return obj; },
    update: function (t, id, patch) { var o = DB.find(t, id); if (o) { Object.assign(o, patch); save(); } return o; },
    remove: function (t, id) { data[t] = data[t].filter(function (x) { return x.id !== id; }); save(); },
    settings: function () { return data.settings; },
    setSettings: function (patch) { Object.assign(data.settings, patch); save(); },

    /* --- Aktivitas & notifikasi --- */
    log: function (action, entity) {
      var u = Auth.user();
      data.logs.unshift({ id: uid('lg'), userId: u ? u.id : null, action: action, entity: entity || '', date: nowISO() });
      if (data.logs.length > 400) data.logs.length = 400;
      save();
    },
    notify: function (userId, text, link) {
      data.notifications.unshift({ id: uid('n'), userId: userId, text: text, link: link || '', read: false, date: nowISO() });
      save();
    },
    notifyRole: function (roles, text, link) {
      data.users.filter(function (u) { return roles.indexOf(u.role) > -1; }).forEach(function (u) { DB.notify(u.id, text, link); });
    },

    /* --- Query pembelajaran --- */
    modulesOf: function (pid) { return data.modules.filter(function (m) { return m.programId === pid; }).sort(function (a, b) { return a.order - b.order; }); },
    lessonsOf: function (mid, all) { return data.lessons.filter(function (l) { return l.moduleId === mid && (all || l.published); }).sort(function (a, b) { return a.order - b.order; }); },
    programLessons: function (pid, all) { var out = []; DB.modulesOf(pid).forEach(function (m) { out = out.concat(DB.lessonsOf(m.id, all)); }); return out; },
    assessmentsOf: function (pid, all) { return data.assessments.filter(function (a) { return a.programId === pid && (all || a.published); }); },
    isDone: function (uidv, lid) { return data.progress.some(function (p) { return p.userId === uidv && p.lessonId === lid; }); },
    enrollment: function (uidv, pid) { return data.enrollments.find(function (e) { return e.userId === uidv && e.programId === pid; }) || null; },
    bestAttempt: function (uidv, aid) {
      var at = data.attempts.filter(function (x) { return x.userId === uidv && x.assessmentId === aid; });
      if (!at.length) return null;
      return at.reduce(function (a, b) { return b.score > a.score ? b : a; });
    },
    attemptsCount: function (uidv, aid) {
      return data.attempts.filter(function (x) { return x.userId === uidv && x.assessmentId === aid; }).length +
        data.submissions.filter(function (x) { return x.userId === uidv && x.assessmentId === aid; }).length;
    },
    lastSubmission: function (uidv, aid) {
      var s = data.submissions.filter(function (x) { return x.userId === uidv && x.assessmentId === aid; });
      return s.length ? s[s.length - 1] : null;
    },
    /* Status satu assessment untuk peserta: {done, passed, score, pending} */
    assessmentStatus: function (uidv, a) {
      if (a.source === 'builtin' && a.type !== 'assignment') {
        var b = DB.bestAttempt(uidv, a.id);
        if (!b) return { done: false, passed: false, score: null };
        return { done: true, passed: b.score >= (a.passingScore || 0), score: b.score };
      }
      var subs = data.submissions.filter(function (x) { return x.userId === uidv && x.assessmentId === a.id; });
      if (!subs.length) return { done: false, passed: false, score: null };
      var graded = subs.filter(function (s) { return s.status === 'graded'; });
      if (!graded.length) return { done: true, passed: false, score: null, pending: true };
      var best = graded.reduce(function (x, y) { return (y.score || 0) > (x.score || 0) ? y : x; });
      return { done: true, passed: best.score >= (a.passingScore || 0), score: best.score, feedback: best.feedback };
    },
    programProgress: function (uidv, pid) {
      var ls = DB.programLessons(pid);
      var as = DB.assessmentsOf(pid).filter(function (a) { return a.required; });
      var total = ls.length + as.length;
      if (!total) return 0;
      var done = ls.filter(function (l) { return DB.isDone(uidv, l.id); }).length +
        as.filter(function (a) { return DB.assessmentStatus(uidv, a).passed; }).length;
      return Math.round(done / total * 100);
    },
    certificateOf: function (uidv, pid) { return data.certificates.find(function (c) { return c.userId === uidv && c.programId === pid; }) || null; },
    /* Terbitkan sertifikat bila syarat terpenuhi */
    checkCompletion: function (uidv, pid) {
      var en = DB.enrollment(uidv, pid);
      if (!en) return null;
      if (DB.programProgress(uidv, pid) < 100) return null;
      var c = DB.certificateOf(uidv, pid);
      if (c) return c;
      return DB.issueCertificate(uidv, pid, en.classId, true);
    },
    issueCertificate: function (uidv, pid, classId, auto) {
      var p = DB.find('programs', pid), cat = p ? DB.find('categories', p.categoryId) : null;
      var code = ('IA-' + Math.random().toString(36).slice(2, 6) + '-' + Math.random().toString(36).slice(2, 6)).toUpperCase();
      var num = 'IA/' + ((cat && cat.slug) ? cat.slug.slice(0, 2).toUpperCase() : 'GN') + '/' + new Date().getFullYear() + '/' + Date.now().toString(36).toUpperCase().slice(-6);
      var c = { id: uid('ct'), userId: uidv, programId: pid, classId: classId || null, number: num, code: code, issuedAt: nowISO() };
      data.certificates.push(c);
      var en = DB.enrollment(uidv, pid);
      if (en) en.status = 'completed';
      save();
      DB.notify(uidv, 'Selamat! Sertifikat "' + (p ? p.title : '') + '" telah terbit.', '#/certificates');
      if (!auto) DB.log('Menerbitkan sertifikat ' + num, 'certificate');
      return c;
    }
  };

  /* ---------- Auth ---------- */
  var Auth = {
    user: function () {
      if (!data) return null;
      var id = ONLINE ? meId : (sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION));
      if (!id) return null;
      var u = DB.find('users', id);
      return (u && u.status === 'active') ? u : null;
    },
    /* Semua fungsi akun mengembalikan Promise (berlaku untuk mode lokal & online) */
    login: function (identity, password, remember) {
      if (ONLINE) {
        return Cloud.rpc('lms_login', { p_identity: identity, p_hash: hashPass(password) }).then(function (res) {
          if (!res || res.error) return { ok: false, msg: (res && res.error) || 'Gagal masuk.' };
          setToken(res.token, remember);
          return loadOnline().then(function () { DB.log('Login', 'auth'); return { ok: true, user: Auth.user() }; });
        }).catch(function (e) { return { ok: false, msg: e.message }; });
      }
      identity = (identity || '').trim().toLowerCase();
      var u = data.users.find(function (x) { return x.username.toLowerCase() === identity || x.email.toLowerCase() === identity; });
      if (!u || u.passHash !== hashPass(password)) return Promise.resolve({ ok: false, msg: 'Username/email atau kata sandi salah.' });
      if (u.status !== 'active') return Promise.resolve({ ok: false, msg: 'Akun Anda sedang dinonaktifkan. Hubungi admin.' });
      sessionStorage.setItem(SESSION, u.id);
      if (remember) localStorage.setItem(SESSION, u.id); else localStorage.removeItem(SESSION);
      u.lastLogin = nowISO(); save();
      DB.log('Login', 'auth');
      return Promise.resolve({ ok: true, user: u });
    },
    logout: function () {
      DB.log('Logout', 'auth');
      if (ONLINE) {
        var t = getToken();
        return flush().then(function () { return Cloud.rpc('lms_logout', { p_token: t }).catch(function () { }); })
          .then(function () { clearToken(); meId = null; return loadOnline(); });
      }
      sessionStorage.removeItem(SESSION); localStorage.removeItem(SESSION);
      return Promise.resolve();
    },
    register: function (f) {
      var welcome = function (u) {
        DB.log('Registrasi akun peserta baru: ' + u.name, 'user');
        DB.notify(u.id, 'Selamat datang, ' + u.name + '! Jelajahi program pelatihan dan mulai belajar.', '#/programs');
        DB.notifyRole(['admin'], 'Peserta baru terdaftar: ' + u.name, '#/admin/users');
        return { ok: true, user: u };
      };
      if (ONLINE) {
        return Cloud.rpc('lms_register', { p_name: f.name, p_username: f.username, p_email: f.email, p_phone: f.phone || '', p_bio: f.business || '', p_hash: hashPass(f.password) })
          .then(function (res) {
            if (!res || res.error) return { ok: false, msg: (res && res.error) || 'Pendaftaran gagal.' };
            setToken(res.token, true);
            return loadOnline().then(function () { return welcome(Auth.user()); });
          }).catch(function (e) { return { ok: false, msg: e.message }; });
      }
      var exists = data.users.some(function (x) { return x.email.toLowerCase() === f.email.toLowerCase() || x.username.toLowerCase() === f.username.toLowerCase(); });
      if (exists) return Promise.resolve({ ok: false, msg: 'Email atau username sudah terdaftar.' });
      var u = { id: uid('u'), username: f.username, name: f.name, email: f.email, phone: f.phone || '', role: 'learner', passHash: hashPass(f.password), status: 'active', createdAt: nowISO(), bio: f.business || '', expertise: '', avatar: null };
      data.users.push(u); save();
      sessionStorage.setItem(SESSION, u.id);
      return Promise.resolve(welcome(u));
    },
    changePassword: function (oldPw, newPw) {
      if (ONLINE) {
        return Cloud.rpc('lms_change_password', { p_token: getToken(), p_old: hashPass(oldPw), p_new: hashPass(newPw) })
          .then(function (res) { return res && res.ok ? { ok: true } : { ok: false, msg: (res && res.error) || 'Gagal.' }; })
          .catch(function (e) { return { ok: false, msg: e.message }; });
      }
      var u = Auth.user();
      if (hashPass(oldPw) !== u.passHash) return Promise.resolve({ ok: false, msg: 'Kata sandi saat ini salah.' });
      u.passHash = hashPass(newPw); save();
      return Promise.resolve({ ok: true });
    },
    hasRole: function () { var u = Auth.user(); if (!u) return false; return Array.prototype.slice.call(arguments).indexOf(u.role) > -1; }
  };

  window.DB = DB;
  window.Auth = Auth;
  window.ROLES = {
    learner: 'Learner', trainer: 'Trainer Internal', coach: 'Enterprise Coach', admin: 'Administrator System', executive: 'Executive Viewer'
  };
})();
