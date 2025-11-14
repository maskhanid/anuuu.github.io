/* app.js
   Perbaikan: - tombol ghost jadi jelas
              - konfirmasi WA hanya muncul setelah hasil tersedia & target valid
              - encodeURIComponent untuk WA
              - custom USD input handling
              - safe check untuk Swal
*/

(() => {
  // Element refs
  const modeSelect = document.getElementById('modeSelect');
  const cryptoBlock = document.getElementById('cryptoBlock');
  const pulsaBlock = document.getElementById('pulsaBlock');
  const ewalletBlock = document.getElementById('ewalletBlock');

  const targetSelect = document.getElementById('targetSelect');
  const networkRow = document.getElementById('networkRow');
  const networkSelect = document.getElementById('networkSelect');

  const usdSelect = document.getElementById('usdSelect');
  const usdCustomInput = document.getElementById('usdCustomInput');
  const maxBtn = document.getElementById('maxBtn');

  const resultCard = document.getElementById('resultCard');
  const resultAmount = document.getElementById('resultAmount');
  const feeAmount = document.getElementById('feeAmount');
  const invoiceText = document.getElementById('invoiceText');

  const targetDisplay = document.getElementById('targetDisplay');
  const targetValue = document.getElementById('targetValue');

  const confirmBtn = document.getElementById('confirmBtn');

  const openHistoryBtn = document.getElementById('openHistoryBtn');
  const resetBtn = document.getElementById('resetBtn');
  const historyOverlay = document.getElementById('historyOverlay');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const historyList = document.getElementById('historyList');

  // Pulsa / ewallet refs
  const pulsaOperator = document.getElementById('pulsaOperator');
  const pulsaNominal = document.getElementById('pulsaNominal');
  const pulsaResult = document.getElementById('pulsaResult');
  const pulsaResultAmount = document.getElementById('pulsaResultAmount');
  const pulsaTarget = document.getElementById('pulsaTarget');

  const ewalletNominal = document.getElementById('ewalletNominal');
  const ewalletResult = document.getElementById('ewalletResult');
  const ewalletResultAmount = document.getElementById('ewalletResultAmount');

  // Config / state
  const waAdmin = '6281234567890'; // Ganti dengan nomor admin (format internasional tanpa +)
  const BASE_RATE = 16500;
  let usdValue = Number(usdSelect.value) || 14;
  let currentRate = BASE_RATE;
  let lastResult = null;
  let history = [];

  // Helpers
  function formatIDR(n){
    if (typeof n !== 'number') n = Number(n) || 0;
    return n.toLocaleString('id-ID');
  }
  function randInvoice(){
    const t = Date.now().toString(36).toUpperCase();
    return 'ZEX' + t.slice(-8);
  }

  // Safe Swal check (if not ready, fallback to alert)
  function alertOk(title, text){
    if (typeof Swal !== 'undefined') {
      Swal.fire({ title, text, icon: 'info' });
    } else {
      alert(title + (text ? '\n\n' + text : ''));
    }
  }

  // Fetch USD->IDR
  async function fetchRate(){
    try {
      const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=IDR');
      const j = await res.json();
      if (j && j.rates && j.rates.IDR) {
        currentRate = Math.round(j.rates.IDR);
      } else currentRate = BASE_RATE;
    } catch(e){
      currentRate = BASE_RATE;
      console.warn('fetch rate failed, using base', e);
    }
  }

  // Calculate crypto result (simple model: USD * rate - fee)
  function calcCryptoResult(usd, destination){
    const rup = Math.round(usd * currentRate);
    // Example fee scheme
    let fee = 0;
    if (rup < 100000) fee = Math.round(rup * 0.02);
    else if (rup < 500000) fee = Math.round(rup * 0.015);
    else fee = Math.round(rup * 0.01);
    // adjust fee for onchain vs exch
    if (destination === 'onchain') fee += 5000;
    const result = Math.max(0, rup - fee);
    return { result, fee, rate: currentRate };
  }

  // Render / UI functions
  function show(el){ el.classList.remove('hidden'); }
  function hide(el){ el.classList.add('hidden'); }

  function updateModeUI(){
    const m = modeSelect.value;
    // toggle blocks
    if (m === 'crypto'){ show(cryptoBlock); hide(pulsaBlock); hide(ewalletBlock); }
    else if (m === 'pulsa'){ hide(cryptoBlock); show(pulsaBlock); hide(ewalletBlock); }
    else { hide(cryptoBlock); hide(pulsaBlock); show(ewalletBlock); }
    // reset result/confirm
    clearResult();
  }

  function clearResult(){
    lastResult = null;
    hide(resultCard);
    hide(targetDisplay);
    confirmBtn.classList.add('hidden');
    confirmBtn.disabled = true;
  }

  function buildResultCard({result, fee, invoice}){
    resultAmount.innerText = 'Rp ' + formatIDR(result);
    feeAmount.innerText = 'Rp ' + formatIDR(fee);
    invoiceText.innerText = invoice || randInvoice();
    show(resultCard);
  }

  async function computeCrypto(){
    // require target selected and USD value
    const target = targetSelect.value;
    if (!target) { clearResult(); return; }
    if (!usdValue || usdValue <= 0){ clearResult(); return; }
    // show network selection if onchain
    if (target === 'onchain') show(networkRow);
    else hide(networkRow);

    // fetch rate if necessary
    await fetchRate();

    const destType = (target === 'onchain') ? 'onchain' : 'exchange';
    const { result, fee } = calcCryptoResult(usdValue, destType);

    const invoice = randInvoice();
    lastResult = { mode:'crypto', target, network: networkSelect.value || '', usd: usdValue, result, fee, invoice, rate: currentRate };
    buildResultCard(lastResult);

    // show target details area
    targetValue.innerText = humanTargetText(lastResult);
    show(targetDisplay);

    // only enable confirm when both target and (if onchain) network filled
    const ready = (target && (!target.startsWith('onchain') || networkSelect.value));
    if (ready) {
      confirmBtn.classList.remove('hidden');
      confirmBtn.disabled = false;
    } else {
      confirmBtn.classList.add('hidden');
      confirmBtn.disabled = true;
    }
  }

  function humanTargetText(item){
    if (!item) return '-';
    let t = '';
    if (item.mode === 'crypto'){
      if (item.target === 'onchain') t = `On-chain • Network: ${item.network || '-'}`;
      else t = `Exchange • ${item.target}`;
      t += `\nNominal: ${item.usd} USD\nHasil: Rp ${formatIDR(item.result)}`;
    }
    return t;
  }

  // Pulsa calc
  function computePulsa(){
    const op = pulsaOperator.value;
    const nom = Number(pulsaNominal.value) || 0;
    if (!op || !nom){ hide(pulsaResult); return; }
    const fee = Math.round(nom * 0.05);
    const res = nom - fee;
    pulsaResultAmount.innerText = 'Rp ' + formatIDR(res);
    pulsaTarget.innerText = op.toUpperCase();
    show(pulsaResult);
    // create lastResult for confirm button behavior
    lastResult = { mode:'pulsa', operator:op, nominal:nom, result:res, fee, invoice: randInvoice() };
    confirmBtn.classList.remove('hidden');
    confirmBtn.disabled = false;
  }

  // Ewallet calc
  function computeEwallet(){
    const nom = Number(ewalletNominal.value) || 0;
    if (!nom){ hide(ewalletResult); clearResult(); return; }
    const fee = Math.round(nom * 0.02);
    const res = nom - fee;
    ewalletResultAmount.innerText = 'Rp ' + formatIDR(res);
    show(ewalletResult);
    lastResult = { mode:'ewallet', nominal:nom, result:res, fee, invoice: randInvoice() };
    confirmBtn.classList.remove('hidden');
    confirmBtn.disabled = false;
  }

  // WA confirm
  function openWhatsAppAndSave(item){
    if (!item) return;
    // Build message
    let body = `Halo admin,\nInvoice: ${item.invoice}\n`;
    if (item.mode === 'crypto'){
      body += `Jenis: Crypto\nTujuan: ${item.target}\n`;
      if (item.network) body += `Network: ${item.network}\n`;
      body += `Nominal: ${item.usd} USD\nHasil: Rp ${formatIDR(item.result)}\nFee: Rp ${formatIDR(item.fee)}\n`;
    } else if (item.mode === 'pulsa'){
      body += `Jenis: Pulsa\nOperator: ${item.operator}\nNominal: Rp ${formatIDR(item.nominal)}\nHasil: Rp ${formatIDR(item.result)}\n`;
    } else {
      body += `Jenis: E-Wallet\nNominal: Rp ${formatIDR(item.nominal)}\nHasil: Rp ${formatIDR(item.result)}\n`;
    }
    body += 'Mohon konfirmasi. Terima kasih.';
    const url = `https://wa.me/${waAdmin}?text=${encodeURIComponent(body)}`;

    // Save to history
    history.unshift({...item, createdAt: Date.now()});
    if (history.length > 200) history.pop();
    saveHistory();

    window.open(url, '_blank');
    alertOk('Dibuka ke WhatsApp', 'Silakan lanjutkan konfirmasi di WhatsApp.');
  }

  // History persistence
  function saveHistory(){
    try{ localStorage.setItem('mk_history', JSON.stringify(history)); } catch(e){ console.warn('save history failed', e) }
    renderHistory();
  }
  function loadHistory(){
    try{ history = JSON.parse(localStorage.getItem('mk_history') || '[]'); } catch(e){ history = [] }
    renderHistory();
  }
  function renderHistory(){
    historyList.innerHTML = '';
    if (!history.length) {
      historyList.innerHTML = '<div class="hint" style="padding:10px">Belum ada riwayat.</div>';
      return;
    }
    history.forEach((h, idx) => {
      const el = document.createElement('div');
      el.className = 'card';
      el.style.marginBottom = '8px';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">${h.mode.toUpperCase()}</div>
          <div style="font-size:12px;color:#9aa8b6">${new Date(h.createdAt).toLocaleString()}</div>
        </div>
        <div style="margin-top:6px">${h.invoice} • Hasil: Rp ${formatIDR(h.result)}</div>
        <div style="margin-top:8px"><button data-idx="${idx}" class="btn-ghost small open-wa">Buka WhatsApp</button> <button data-idx="${idx}" class="btn-ghost small del-item">Hapus</button></div>
      `;
      historyList.appendChild(el);
    });
    // attach listeners
    historyList.querySelectorAll('.open-wa').forEach(b => b.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.idx);
      openWhatsAppAndSave(history[i]);
    }));
    historyList.querySelectorAll('.del-item').forEach(b => b.addEventListener('click', (e) => {
      const i = Number(e.currentTarget.dataset.idx);
      history.splice(i,1); saveHistory();
    }));
  }

  // Events wiring
  modeSelect.addEventListener('change', () => { updateModeUI(); savePref('mode', modeSelect.value); });
  targetSelect.addEventListener('change', () => { computeCrypto(); savePref('target', targetSelect.value); });
  networkSelect.addEventListener('change', () => { computeCrypto(); savePref('network', networkSelect.value); });

  usdSelect.addEventListener('change', () => {
    if (usdSelect.value === 'custom'){
      usdCustomInput.value = '';
      show(usdCustomInput);
      usdCustomInput.focus();
      usdValue = 0;
      clearResult();
    } else {
      hide(usdCustomInput);
      usdValue = Number(usdSelect.value);
      computeCrypto();
    }
    savePref('usd_select', usdSelect.value);
  });
  usdCustomInput.addEventListener('input', () => {
    usdValue = Number(usdCustomInput.value) || 0;
    if (usdValue > 0) computeCrypto();
  });

  maxBtn.addEventListener('click', () => {
    // sample behavior: set USD to 50 as max
    usdSelect.value = '50'; hide(usdCustomInput);
    usdValue = 50; computeCrypto();
  });

  // Pulsa
  pulsaOperator.addEventListener('change', computePulsa);
  pulsaNominal.addEventListener('change', computePulsa);

  // Ewallet
  ewalletNominal.addEventListener('input', computeEwallet);

  // Confirm button
  confirmBtn.addEventListener('click', () => {
    if (!lastResult){ alertOk('Belum ada data', 'Pastikan tujuan dan nominal sudah dipilih'); return; }
    openWhatsAppAndSave(lastResult);
    clearResult();
  });

  // History overlay
  openHistoryBtn.addEventListener('click', () => { show(historyOverlay); });
  closeHistoryBtn && closeHistoryBtn.addEventListener('click', () => { hide(historyOverlay); });
  historyOverlay.addEventListener('click', (e) => { if (e.target === historyOverlay) hide(historyOverlay); });

  // Reset
  resetBtn.addEventListener('click', () => {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: 'Reset semua?',
        text: 'Riwayat dan preferensi akan dihapus.',
        showCancelButton: true
      }).then(res => {
        if (res.isConfirmed) {
          localStorage.clear(); history = []; renderHistory();
          alertOk('Berhasil', 'Data sudah direset.');
        }
      });
    } else {
      if (confirm('Reset semua data?')) { localStorage.clear(); history = []; renderHistory(); alert('Reset done'); }
    }
  });

  // Pref helpers
  function savePref(k,v){ try{ localStorage.setItem('mk_pref_'+k, String(v)); }catch(e){} }
  function loadPref(){
    try{
      const m = localStorage.getItem('mk_pref_mode'); if (m) modeSelect.value = m;
      const u = localStorage.getItem('mk_pref_usd_select'); if (u) { usdSelect.value = u; if (u==='custom') show(usdCustomInput) }
      const t = localStorage.getItem('mk_pref_target'); if (t) targetSelect.value = t;
      const n = localStorage.getItem('mk_pref_network'); if (n) networkSelect.value = n;
    }catch(e){}
  }

  // init
  (async function init(){
    loadPref();
    updateModeUI();
    await fetchRate();
    loadHistory();
    // compute initial if possible
    if (modeSelect.value === 'crypto') {
      if (usdSelect.value !== 'custom') usdValue = Number(usdSelect.value);
      computeCrypto();
    }
  })();

})();