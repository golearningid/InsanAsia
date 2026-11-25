/* =========================================================
   InsanAsia LMS – UI helpers, layout, komponen
   ========================================================= */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (/^(https?:|mailto:|tel:|#|blob:|data:image\/)/i.test(u)) return esc(u);
    if (!u) return '';
    return esc('https://' + u.replace(/^\/+/, ''));
  }
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fmtDate(iso, withTime) {
    if (!iso) return '-';
    var d = new Date(iso); if (isNaN(d)) return '-';
    var s = d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
    if (withTime) s += ', ' + String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');
    return s;
  }
  function toLocalInput(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function initials(n) { return String(n || '?').split(/\s+/).slice(0, 2).map(function (x) { return x[0] || ''; }).join('').toUpperCase(); }

  /* Markdown ringan (aman: di-escape dulu) */
  function md(src) {
    var lines = esc(src || '').split('\n'), out = [], list = null;
    function closeList() { if (list) { out.push('</' + list + '>'); list = null; } }
    function inline(t) {
      return t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    lines.forEach(function (ln) {
      var m;
      if ((m = ln.match(/^###?\s+(.*)/))) { closeList(); out.push('<h3>' + inline(m[1]) + '</h3>'); }
      else if ((m = ln.match(/^\s*[-•]\s+(.*)/))) { if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if (!ln.trim()) { closeList(); }
      else { closeList(); out.push('<p>' + inline(ln) + '</p>'); }
    });
    closeList();
    return out.join('');
  }

  /* ---------- Ikon (SVG inline) ---------- */
  var P = {
    home: 'M3 11l9-8 9 8M5 10v10h14V10', book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 19v-1a4 4 0 00-3-3.9M16 3.1a3.5 3.5 0 010 6.8',
    user: 'M20 21v-1a5 5 0 00-5-5H9a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    quiz: 'M9 9a3 3 0 115 2c-1 .7-2 1.3-2 3M12 17h.01M12 21a9 9 0 100-18 9 9 0 000 18z', task: 'M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9',
    award: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.2 13.9L7 22l5-3 5 3-1.2-8.1', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
    file: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6', news: 'M4 4h13v16H6a2 2 0 01-2-2zM17 8h3v10a2 2 0 01-2 2M8 8h5M8 12h5M8 16h5',
    bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0', logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
    plus: 'M12 5v14M5 12h14', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z', trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
    link: 'M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1', video: 'M23 7l-7 5 7 5zM1 5h15v14H1z', text: 'M4 6h16M4 12h16M4 18h10',
    check: 'M20 6L9 17l-5-5', x: 'M18 6L6 18M6 6l12 12', menu: 'M3 6h18M3 12h18M3 18h18', search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
    clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2', up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7', upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
    download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3', shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', mail: 'M4 4h16v16H4zM22 6l-10 7L2 6',
    phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z',
    pin: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z', help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01',
    layers: 'M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    play: 'M5 3l14 9-14 9z', star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z', arrow: 'M5 12h14M12 5l7 7-7 7', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4'
  };
  function icon(n, s) { return '<svg class="ic" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (P[n] || P.file) + '"/></svg>'; }

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    var box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'success');
    t.innerHTML = icon(type === 'error' ? 'x' : type === 'info' ? 'bell' : 'check', 16) + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  /* ---------- Modal ---------- */
  function modal(opts) {
    closeModal();
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap'; wrap.id = 'modal';
    wrap.innerHTML = '<div class="modal ' + (opts.size || '') + '" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h3 id="modal-title">' + esc(opts.title || '') + '</h3><button class="icon-btn" data-close aria-label="Tutup">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.footer !== false ? '<div class="modal-foot">' + (opts.footer || '<button class="btn btn-ghost" data-close>Tutup</button>') + '</div>' : '') + '</div>';
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('[data-close]')) closeModal(); });
    var f = wrap.querySelector('input,select,textarea,button:not([data-close])'); if (f) setTimeout(function () { f.focus(); }, 30);
    if (opts.onOpen) opts.onOpen(wrap);
    return wrap;
  }
  function closeModal() { var m = $('#modal'); if (m) m.remove(); document.body.classList.remove('no-scroll'); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function confirmBox(msg, onYes, yesLabel) {
    modal({
      title: 'Konfirmasi', body: '<p>' + esc(msg) + '</p>',
      footer: '<button class="btn btn-ghost" data-close>Batal</button><button class="btn btn-danger" id="cf-yes">' + esc(yesLabel || 'Ya, lanjutkan') + '</button>',
      onOpen: function (w) { w.querySelector('#cf-yes').onclick = function () { closeModal(); onYes(); }; }
    });
  }

  /* ---------- Form builder ----------
     fields: [{name,label,type,value,options:[[v,l]],required,help,placeholder,accept,rows,min,max,show:fn(values)}] */
  function fieldHTML(f) {
    var id = 'f_' + f.name, v = f.value == null ? '' : f.value, req = f.required ? ' required' : '';
    var lab = '<label for="' + id + '">' + esc(f.label) + (f.required ? ' <span class="req">*</span>' : '') + '</label>';
    var help = f.help ? '<small class="help">' + esc(f.help) + '</small>' : '';
    var inp;
    switch (f.type) {
      case 'textarea': inp = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 4) + '"' + req + ' placeholder="' + esc(f.placeholder || '') + '">' + esc(v) + '</textarea>'; break;
      case 'select': inp = '<select id="' + id + '" name="' + f.name + '"' + req + '>' + (f.options || []).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; break;
      case 'checkbox': return '<div class="field check" data-field="' + f.name + '"><label><input type="checkbox" id="' + id + '" name="' + f.name + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>' + help + '</div>';
      case 'file': inp = '<input type="file" id="' + id + '" name="' + f.name + '" accept="' + esc(f.accept || '') + '"' + req + '>' + (f.current ? '<small class="help">File saat ini: ' + esc(f.current) + '</small>' : ''); break;
      case 'html': return '<div class="field" data-field="' + f.name + '">' + f.html + '</div>';
      default: inp = '<input type="' + (f.type || 'text') + '" id="' + id + '" name="' + f.name + '" value="' + esc(v) + '"' + req + (f.min != null ? ' min="' + f.min + '"' : '') + (f.max != null ? ' max="' + f.max + '"' : '') + (f.minlength ? ' minlength="' + f.minlength + '"' : '') + ' placeholder="' + esc(f.placeholder || '') + '"' + (f.type === 'password' ? ' autocomplete="new-password"' : '') + '>';
    }
    return '<div class="field' + (f.full ? ' full' : '') + '" data-field="' + f.name + '">' + lab + inp + help + '<small class="err"></small></div>';
  }
  function readForm(form, fields) {
    var vals = {};
    fields.forEach(function (f) {
      var el = form.querySelector('[name="' + f.name + '"]'); if (!el) return;
      if (f.type === 'checkbox') vals[f.name] = el.checked;
      else if (f.type === 'file') vals[f.name] = el.files && el.files[0] ? el.files[0] : null;
      else if (f.type === 'number') vals[f.name] = el.value === '' ? null : Number(el.value);
      else vals[f.name] = el.value.trim();
    });
    return vals;
  }
  function applyShow(form, fields) {
    var vals = readForm(form, fields);
    fields.forEach(function (f) {
      if (!f.show) return;
      var box = form.querySelector('[data-field="' + f.name + '"]');
      var vis = f.show(vals);
      if (box) { box.style.display = vis ? '' : 'none'; $$('input,select,textarea', box).forEach(function (i) { if (f.required) i.required = vis; }); }
    });
  }
  function formModal(opts) {
    var fields = opts.fields;
    modal({
      title: opts.title, size: opts.size || '',
      body: '<form id="mform" class="form-grid" novalidate>' + fields.map(fieldHTML).join('') + '</form>',
      footer: '<button class="btn btn-ghost" data-close type="button">Batal</button><button class="btn btn-primary" id="mform-save" type="button">' + esc(opts.submitLabel || 'Simpan') + '</button>',
      onOpen: function (w) {
        var form = w.querySelector('#mform');
        form.addEventListener('change', function () { applyShow(form, fields); });
        applyShow(form, fields);
        var submit = function () {
          var ok = true;
          $$('.field', form).forEach(function (b) { b.classList.remove('invalid'); var e = b.querySelector('.err'); if (e) e.textContent = ''; });
          $$('input,select,textarea', form).forEach(function (el) {
            if (el.closest('[data-field]') && el.closest('[data-field]').style.display === 'none') return;
            if (!el.checkValidity()) {
              ok = false; var b = el.closest('.field'); b.classList.add('invalid');
              var e = b.querySelector('.err'); if (e) e.textContent = el.validationMessage || 'Wajib diisi.';
            }
          });
          if (!ok) { toast('Periksa kembali isian yang ditandai.', 'error'); return; }
          var vals = readForm(form, fields);
          var btn = w.querySelector('#mform-save'); btn.disabled = true; btn.textContent = 'Menyimpan…';
          Promise.resolve(opts.onSubmit(vals, form)).then(function (res) {
            if (res === false) { btn.disabled = false; btn.textContent = opts.submitLabel || 'Simpan'; return; }
            closeModal();
          }).catch(function (err) { btn.disabled = false; btn.textContent = opts.submitLabel || 'Simpan'; toast(err.message || 'Gagal menyimpan', 'error'); });
        };
        w.querySelector('#mform-save').onclick = submit;
        form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
        if (opts.onOpen) opts.onOpen(w, form);
      }
    });
  }

  /* ---------- Gambar: baca & perkecil ---------- */
  function readImage(file, maxW, type) {
    return new Promise(function (res, rej) {
      if (!file) return res(null);
      if (!/^image\//.test(file.type)) return rej(new Error('File harus berupa gambar (PNG, JPG, SVG, WEBP).'));
      if (file.size > 5 * 1024 * 1024) return rej(new Error('Ukuran gambar maksimal 5 MB.'));
      var fr = new FileReader();
      fr.onload = function () {
        if (file.type === 'image/svg+xml') return res(fr.result);
        var img = new Image();
        img.onload = function () {
          var w = img.width, h = img.height, s = Math.min(1, (maxW || 800) / w);
          var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL(type || (file.type === 'image/png' ? 'image/png' : 'image/jpeg'), 0.85));
        };
        img.onerror = function () { rej(new Error('Gambar tidak dapat dibaca.')); };
        img.src = fr.result;
      };
      fr.onerror = function () { rej(new Error('Gagal membaca file.')); };
      fr.readAsDataURL(file);
    });
  }
  /* Simpan file PDF/dokumen ke IndexedDB dengan validasi */
  function storeFile(file, opts) {
    opts = opts || {};
    var max = (opts.maxMB || 15) * 1024 * 1024;
    if (!file) return Promise.resolve(null);
    if (opts.pdfOnly && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return Promise.reject(new Error('File harus berformat PDF.'));
    if (file.size > max) return Promise.reject(new Error('Ukuran file maksimal ' + (opts.maxMB || 15) + ' MB.'));
    return DB.Files.put(file).then(function (id) { return { id: id, name: file.name, size: file.size }; });
  }
  function openStoredFile(fileId, fileName, download) {
    DB.Files.get(fileId).then(function (blob) {
      if (!blob) return toast('File tidak ditemukan di browser ini.', 'error');
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
      if (download) a.download = fileName || 'file';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }).catch(function () { toast('Gagal membuka file.', 'error'); });
  }

  /* ---------- Komponen kecil ---------- */
  function badge(text, kind) { return '<span class="badge ' + (kind || '') + '">' + esc(text) + '</span>'; }
  var STATUS = {
    draft: ['Draft', 'gray'], published: ['Published', 'purple'], closed: ['Pendaftaran Ditutup', 'dark'], ongoing: ['Berlangsung', 'green'], completed: ['Selesai', 'dark'],
    active: ['Aktif', 'green'], inactive: ['Nonaktif', 'gray'], submitted: ['Menunggu Penilaian', 'amber'], graded: ['Dinilai', 'green']
  };
  function statusBadge(s) { var x = STATUS[s] || [s, 'gray']; return badge(x[0], x[1]); }
  function progressBar(p, label) { return '<div class="progress" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(label || 'Progres') + '"><span style="width:' + p + '%"></span></div>'; }
  function avatar(u, size) {
    size = size || 36;
    if (u && u.avatar) return '<img class="avatar" src="' + u.avatar + '" alt="" style="width:' + size + 'px;height:' + size + 'px">';
    return '<span class="avatar" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * .38) + 'px">' + esc(initials(u ? u.name : '?')) + '</span>';
  }
  function empty(msg, cta) { return '<div class="empty">' + icon('layers', 32) + '<p>' + esc(msg) + '</p>' + (cta || '') + '</div>'; }
  function stat(label, value, ic, sub) {
    return '<div class="stat"><div class="stat-ic">' + icon(ic || 'chart', 20) + '</div><div><div class="stat-v">' + esc(value) + '</div><div class="stat-l">' + esc(label) + '</div>' + (sub ? '<div class="stat-s">' + esc(sub) + '</div>' : '') + '</div></div>';
  }
  function logoHTML(s, light) {
    s = s || DB.settings();
    var mark = s.logo ? '<img src="' + s.logo + '" alt="Logo ' + esc(s.siteName) + '" class="logo-img">' : '<span class="logo-mark">' + esc(initials(s.siteName).slice(0, 2)) + '</span>';
    return '<a href="#/" class="logo' + (light ? ' light' : '') + '">' + mark + '<span class="logo-text">' + esc(s.siteName) + '</span></a>';
  }
  function programThumb(p, cls) {
    if (p.thumbnail) return '<div class="thumb ' + (cls || '') + '" style="background-image:url(' + p.thumbnail + ')"></div>';
    var c = DB.find('categories', p.categoryId);
    return '<div class="thumb gen ' + (cls || '') + '" style="--tc:' + esc(p.color || '#6D28D9') + '"><span>' + esc(c ? c.name.split(' ')[0] : 'Program') + '</span><b>' + esc(p.title) + '</b></div>';
  }

  /* ---------- Grafik sederhana (SVG) ---------- */
  function barChart(items, opts) {
    opts = opts || {};
    if (!items.length) return empty('Belum ada data.');
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([opts.max || 1]));
    return '<div class="hbars">' + items.map(function (i) {
      var w = Math.max(2, Math.round(i.value / max * 100));
      return '<div class="hbar" title="' + esc(i.label + ': ' + i.value + (opts.suffix || '')) + '"><div class="hbar-l">' + esc(i.label) + '</div><div class="hbar-t"><span style="width:' + w + '%"></span></div><div class="hbar-v">' + esc(i.value + (opts.suffix || '')) + '</div></div>';
    }).join('') + '</div>';
  }
  function lineChart(labels, series, opts) {
    opts = opts || {};
    var W = 640, H = 240, pl = 36, pr = 16, pt = 16, pb = 32;
    var all = []; series.forEach(function (s) { all = all.concat(s.values); });
    var max = Math.max(1, Math.max.apply(null, all)); max = Math.ceil(max / 5) * 5 || 5;
    var x = function (i) { return pl + (labels.length < 2 ? 0 : i * (W - pl - pr) / (labels.length - 1)); };
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / max); };
    var grid = '';
    for (var g = 0; g <= 4; g++) { var gv = max * g / 4, gy = y(gv); grid += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '" class="grid"/><text x="' + (pl - 8) + '" y="' + (gy + 4) + '" text-anchor="end" class="axis">' + Math.round(gv) + '</text>'; }
    var xl = labels.map(function (l, i) { return '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" class="axis">' + esc(l) + '</text>'; }).join('');
    var lines = series.map(function (s, si) {
      var d = s.values.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ' ' + y(v); }).join(' ');
      var dots = s.values.map(function (v, i) { return '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="4.5" class="dot s' + si + '"><title>' + esc(s.name + ' • ' + labels[i] + ': ' + v) + '</title></circle>'; }).join('');
      return '<path d="' + d + '" class="ln s' + si + '"/>' + dots;
    }).join('');
    var legend = series.length > 1 ? '<div class="legend">' + series.map(function (s, si) { return '<span><i class="sw s' + si + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>' : '';
    return legend + '<svg viewBox="0 0 ' + W + ' ' + H + '" class="linechart" role="img" aria-label="' + esc(opts.label || 'Grafik') + '">' + grid + xl + lines + '</svg>';
  }

  /* ---------- Layout publik ---------- */
  function publicLayout(content, active) {
    var s = DB.settings(), u = Auth.user();
    var nav = [['#/', 'Beranda', 'home'], ['#/programs', 'Program Pelatihan', 'programs'], ['#/trainers', 'Trainer', 'trainers'], ['#/articles', 'Artikel', 'articles'], ['#/about', 'Tentang Kami', 'about'], ['#/help', 'Bantuan', 'help']];
    var NIC = { home: 'home', programs: 'book', trainers: 'users', articles: 'news', about: 'shield', help: 'help' };
    var navHTML = nav.map(function (n, i) { return '<a href="' + n[0] + '" class="' + (active === n[2] ? 'active' : '') + '" style="--i:' + i + '"><span class="nav-ic">' + icon(NIC[n[2]], 18) + '</span><span>' + n[1] + '</span></a>'; }).join('');
    var actions = u ? '<a href="#/dashboard" class="btn btn-primary btn-sm">' + icon('grid', 16) + ' Dashboard</a>'
      : '<a href="#/login" class="btn btn-ghost btn-sm">Masuk</a>' + (s.allowRegistration !== false ? '<a href="#/register" class="btn btn-primary btn-sm">Daftar</a>' : '');
    var ann = DB.all('announcements').filter(function (a) { return a.visible; })[0];
    return (ann ? '<div class="announce">' + icon('bell', 14) + ' <b>' + esc(ann.title) + '</b> <span>' + esc(ann.body) + '</span></div>' : '') +
      '<header class="topbar"><div class="container topbar-in">' + logoHTML(s) +
      '<nav class="mainnav" id="mainnav" aria-label="Navigasi utama">' + navHTML + '<div class="nav-actions-m" style="--i:' + nav.length + '">' + actions + '</div></nav>' +
      '<div class="nav-actions">' + actions + '</div>' +
      '<button class="icon-btn burger" id="burger" aria-label="Buka menu" aria-expanded="false" aria-controls="mainnav"><span></span><span></span><span></span></button></div></header>' +
      '<div class="nav-scrim" id="navscrim"></div>' +
      '<main id="main">' + content + '</main>' + footer() + publicTabbar(active, u);
  }
  /* ---------- Bottom tab bar (mobile) ---------- */
  function tabItem(href, label, ic, on) {
    return '<a href="' + href + '" class="tb-item' + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="tb-ic">' + icon(ic, 21) + '</span><span class="tb-l">' + esc(label) + '</span></a>';
  }
  function publicTabbar(active, u) {
    return '<nav class="tabbar" aria-label="Navigasi cepat">' +
      tabItem('#/', 'Beranda', 'home', active === 'home') +
      tabItem('#/programs', 'Program', 'book', active === 'programs') +
      tabItem('#/articles', 'Artikel', 'news', active === 'articles') +
      (u ? tabItem('#/dashboard', 'Dashboard', 'grid', false) : tabItem('#/login', 'Masuk', 'user', false)) +
      '<button type="button" class="tb-item" id="tb-menu" aria-controls="mainnav"><span class="tb-ic">' + icon('menu', 21) + '</span><span class="tb-l">Menu</span></button></nav>';
  }
  var SHORT = { 'Dashboard': 'Beranda', 'Executive Dashboard': 'Beranda', 'Kelas Saya': 'Kelas', 'Kuis & Tugas': 'Kuis', 'Hasil Belajar': 'Hasil', 'Sertifikat Saya': 'Sertifikat',
    'Jelajahi Program': 'Program', 'Materi, Kuis & Assessment': 'Materi', 'Penilaian Tugas': 'Nilai', 'Progres Peserta': 'Peserta', 'Jadwal Mengajar': 'Jadwal',
    'Kelas & Jadwal': 'Kelas', 'Peserta & Progres': 'Peserta', 'Pengguna & Role': 'Pengguna', 'Program & Kategori': 'Program', 'Laporan Kinerja': 'Laporan', 'Laporan': 'Laporan' };
  function appTabbar(u, cur) {
    var items = (MENUS[u.role] || []).slice(0, 4);
    var extra = [['#/notifications', 'Notifikasi', 'bell'], ['#/profile', 'Profil', 'user']];
    while (items.length < 4 && extra.length) items.push(extra.shift());
    return '<nav class="tabbar" aria-label="Navigasi cepat">' + items.map(function (m) {
      var on = cur === m[0] || (m[0] !== '#/dashboard' && cur.indexOf(m[0]) === 0);
      return tabItem(m[0], SHORT[m[1]] || m[1].split(' ')[0], m[2], on);
    }).join('') + '<button type="button" class="tb-item" id="tb-side"><span class="tb-ic">' + icon('menu', 21) + '</span><span class="tb-l">Menu</span></button></nav>';
  }
  function footer() {
    var s = DB.settings();
    var soc = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']].filter(function (x) { return s[x[0]]; })
      .map(function (x) { return '<a href="' + safeUrl(s[x[0]]) + '" target="_blank" rel="noopener">' + x[1] + '</a>'; }).join('');
    return '<footer class="footer"><div class="container footer-grid">' +
      '<div>' + logoHTML(s, true) + '<p class="muted-l">' + esc(s.footerText) + '</p><p class="tag">' + esc(s.tagline) + '</p></div>' +
      '<div><h4>Jelajahi</h4><a href="#/programs">Program Pelatihan</a><a href="#/trainers">Trainer</a><a href="#/articles">Artikel & Insight</a><a href="#/verify">Verifikasi Sertifikat</a></div>' +
      '<div><h4>Lembaga</h4><a href="#/about">Tentang Kami</a><a href="#/help">FAQ & Bantuan</a><a href="#/privacy">Kebijakan Privasi</a><a href="#/terms">Ketentuan Penggunaan</a></div>' +
      '<div><h4>Kontak</h4><p>' + icon('mail', 14) + ' <a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></p><p>' + icon('phone', 14) + ' ' + esc(s.phone) + '</p><p>' + icon('pin', 14) + ' ' + esc(s.address) + '</p><div class="socials">' + soc + '</div></div>' +
      '</div><div class="container copy">© ' + new Date().getFullYear() + ' ' + esc(s.siteFullName || s.siteName) + '. Seluruh hak cipta dilindungi.</div></footer>';
  }

  /* ---------- Layout aplikasi (setelah login) ---------- */
  var MENUS = {
    learner: [['#/dashboard', 'Dashboard', 'grid'], ['#/my-learning', 'Kelas Saya', 'book'], ['#/my-assessments', 'Kuis & Tugas', 'quiz'], ['#/results', 'Hasil Belajar', 'chart'], ['#/certificates', 'Sertifikat Saya', 'award'], ['#/programs', 'Jelajahi Program', 'search']],
    trainer: [['#/dashboard', 'Dashboard', 'grid'], ['#/manage/content', 'Materi, Kuis & Assessment', 'layers'], ['#/grading', 'Penilaian Tugas', 'task'], ['#/manage/learners', 'Progres Peserta', 'users'], ['#/schedule', 'Jadwal Mengajar', 'cal']],
    coach: [['#/dashboard', 'Dashboard', 'grid'], ['#/manage/classes', 'Kelas & Jadwal', 'cal'], ['#/manage/content', 'Materi, Kuis & Assessment', 'layers'], ['#/grading', 'Penilaian Tugas', 'task'], ['#/manage/learners', 'Peserta & Progres', 'users'], ['#/reports', 'Laporan', 'chart']],
    admin: [['#/dashboard', 'Dashboard', 'grid'], ['#/admin/users', 'Pengguna & Role', 'users'], ['#/admin/programs', 'Program & Kategori', 'book'], ['#/manage/classes', 'Kelas & Jadwal', 'cal'], ['#/manage/content', 'Materi, Kuis & Assessment', 'layers'], ['#/grading', 'Penilaian Tugas', 'task'], ['#/admin/certificates', 'Sertifikat', 'award'], ['#/admin/cms', 'Konten Website', 'news'], ['#/reports', 'Laporan & Analitik', 'chart'], ['#/admin/logs', 'Log Aktivitas', 'activity'], ['#/admin/settings', 'Pengaturan Website', 'cog']],
    executive: [['#/dashboard', 'Executive Dashboard', 'grid'], ['#/reports', 'Laporan Kinerja', 'chart']]
  };
  function appLayout(content, opts) {
    opts = opts || {};
    var u = Auth.user(), s = DB.settings();
    var cur = location.hash.split('?')[0] || '#/dashboard';
    var menu = (MENUS[u.role] || []).map(function (m) {
      var act = cur === m[0] || (m[0] !== '#/dashboard' && cur.indexOf(m[0]) === 0);
      return '<a href="' + m[0] + '" class="' + (act ? 'active' : '') + '">' + icon(m[2]) + '<span>' + m[1] + '</span></a>';
    }).join('');
    var unread = DB.where('notifications', function (n) { return n.userId === u.id && !n.read; }).length;
    return '<div class="app">' +
      '<aside class="sidebar" id="sidebar">' + logoHTML(s, true) +
      '<div class="role-chip">' + icon('shield', 14) + ' ' + esc(ROLES[u.role]) + '</div>' +
      '<nav class="side-nav" aria-label="Menu ' + esc(ROLES[u.role]) + '">' + menu + '</nav>' +
      '<div class="side-foot"><a href="#/profile">' + icon('user') + '<span>Profil & Akun</span></a><a href="#/" >' + icon('home') + '<span>Lihat Website</span></a><a href="#" data-logout>' + icon('logout') + '<span>Keluar</span></a></div></aside>' +
      '<div class="app-main"><header class="app-top"><button class="icon-btn burger-app" id="burger-app" aria-label="Buka menu">' + icon('menu', 22) + '</button>' +
      '<div class="app-title"><h1>' + esc(opts.title || '') + '</h1>' + (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
      '<div class="app-top-r"><a href="#/notifications" class="icon-btn notif" aria-label="Notifikasi">' + icon('bell', 20) + (unread ? '<i>' + unread + '</i>' : '') + '</a>' +
      '<a href="#/profile" class="me">' + avatar(u, 38) + '<span class="me-name"><b>' + esc(u.name) + '</b><small>' + esc(ROLES[u.role]) + '</small></span></a></div></header>' +
      '<main class="app-content" id="main">' + (opts.actions ? '<div class="page-actions">' + opts.actions + '</div>' : '') + content + '</main></div>' +
      '<div class="side-overlay" id="side-overlay"></div>' + appTabbar(u, cur) + '</div>';
  }


  /* ---------- Animasi: page enter, reveal saat scroll, hitung angka ---------- */
  var REVEAL = '.sec-head, .cards > *, .stats > *, .faq > details, .grid2 > *, .grid3 > *, .grid-21 > *, .detail-grid > *, ' +
    '.app-content > .card, .app-content > .tabs, .app-content > .notice, .app-content > .filters, .welcome, .cta, .footer-grid > *, .auth-box, .cert, .classroom > *, .curriculum > .mod, .objectives > li';
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function countUp(el) {
    if (el.dataset.counted) return; el.dataset.counted = '1';
    var m = /^(\d+)(%|\+)?$/.exec((el.textContent || '').trim()); if (!m) return;
    var end = Number(m[1]), suf = m[2] || '', t0 = null, dur = 900;
    if (end < 2) return;
    function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e) + suf;
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = '0' + suf; requestAnimationFrame(step);
  }
  function animate(root, fresh) {
    if (!fresh || reduceMotion()) return;
    var main = root.querySelector('#main'); if (main) main.classList.add('page-enter');
    var els = $$(REVEAL, root).filter(function (el) { return !el.closest('.modal'); });
    els.forEach(function (el) {
      var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--d', Math.min(idx, 8));
      el.classList.add('rv');
    });
    var show = function (el) { el.classList.add('in'); $$('.stat-v, .hero-stats b', el).forEach(countUp); };
    if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) { io.observe(el); });
    $$('.hero-stats b', root).forEach(function (b) { setTimeout(function () { countUp(b); }, 500); });
  }

  window.UI = {
    $: $, $$: $$, esc: esc, safeUrl: safeUrl, fmtDate: fmtDate, toLocalInput: toLocalInput, md: md, icon: icon, toast: toast, modal: modal, closeModal: closeModal,
    confirm: confirmBox, formModal: formModal, fieldHTML: fieldHTML, readForm: readForm, readImage: readImage, storeFile: storeFile, openStoredFile: openStoredFile,
    badge: badge, statusBadge: statusBadge, progressBar: progressBar, avatar: avatar, empty: empty, stat: stat, logoHTML: logoHTML, programThumb: programThumb,
    barChart: barChart, lineChart: lineChart, animate: animate, publicLayout: publicLayout, appLayout: appLayout, initials: initials, MENUS: MENUS
  };
})();
