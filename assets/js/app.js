(function(){
  // CONFIG
  const BASE_RATE = 16500;
  const MAX_USD = 200;
  const QR_IMAGE_URL = 'https://framerusercontent.com/images/rwTDmDDGQ0rl2rN2URuukiBlzgU.png';
  const waAdmin = '6281234567890'; // <-- ganti dengan nomor WA admin kamu
  const CACHE_TTL = 5 * 60 * 1000;

  const pulsaRates = { axis:85, indosat:80 };
  const pulsaTargets = { axis: '083121196257', indosat: '08557112334' };

  const exchangeIds = {
    "Binance":"491222749"
  };

  // ON-CHAIN addresses (update sesuai kebutuhan)
  const onchainAddrs = {
    evm: "0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf", // EVM (BSC/ETH/Polygon/... BEP20)
    tron: "TP1FxRhfQQEj6cNvYGMpnMCSSmR67s7fAE",       // TRC20
    aptos: "0xf459b005f7e2d5f34ad7b32f72c86ace5f84d67a0f7174640a64b7e7b9d81c36",
    solana: "DCuvyPMxzMTnTYbZFBxUCHhqAN3uJgtkm6RKrQaMNtFv",
    ton: "UQBDu8yXOFHAtHd2Qf8ZFVQCgVhePFQm0dH8xinC-Uf1-fHN",
    near: "a529c964da9b2b2331e0cb863f16c09094fa80d0763d982965a04707a260ba7f",
    statemint: "14fhKH3EPtCiT9pJAxSPHW9y5L2EwhyhZfNVb2NnCcmqDfry",
    tezos: "tz2Wz2yp41a9NyzLaaxYqt59SaZTMzk3YHfr"
  };

  // DOM refs
  const modeSelect = document.getElementById('modeSelect');
  const cryptoSection = document.getElementById('cryptoSection');
  const pulsaSection = document.getElementById('pulsaSection');
  const ewalletSection = document.getElementById('ewalletSection');

  const cryptoExchange = document.getElementById('cryptoExchange');
  const cryptoMax = document.getElementById('cryptoMax');
  const usdSelect = document.getElementById('usdSelect');
  const chainWrap = document.getElementById('chainWrap');
  const chainSelect = document.getElementById('chainSelect');

  const pulsaOperator = document.getElementById('pulsaOperator');
  const pulsaAmountEl = document.getElementById('pulsaAmount');
  const confirmPulsa = document.getElementById('confirmPulsa');
  const pulsaTargetWrap = document.getElementById('pulsaTargetWrap');
  const pulsaTargetText = document.getElementById('pulsaTargetText');

  const ewalletAmountEl = document.getElementById('ewalletAmount');
  const confirmEwallet = document.getElementById('confirmEwallet');
  const ewalletResultImg = document.getElementById('ewalletResultImg');
  const ewalletQrImg = document.getElementById('ewalletQrImg');

  const infoArea = document.getElementById('infoArea');

  const resultCard = document.getElementById('resultCard');
  const resultMain = document.getElementById('resultMain');
  const resultFee = document.getElementById('resultFee');
  const resultInfo = document.getElementById('resultInfo');
  const resultExtra = document.getElementById('resultExtra');

  const confirmWrap = document.getElementById('confirmWrap');
  const confirmBtn = document.getElementById('confirmBtn');
  const resetPrefs = document.getElementById('resetPrefs');

  const openHistory = document.getElementById('openHistory');
  const historyOverlay = document.getElementById('historyOverlay');
  const closeHistory = document.getElementById('closeHistory');
  const historyListWrap = document.getElementById('historyListWrap');
  const noHistory = document.getElementById('noHistory');
  const clearHistoryBtn = document.getElementById('clearHistory');

  // populate usdSelect
  for(let i=1;i<=MAX_USD;i++){
    const o=document.createElement('option'); o.value=i; o.textContent=i+' USD'; usdSelect.appendChild(o);
  }
  const customOption = document.createElement('option'); customOption.value='custom'; customOption.textContent='Ketik manual...'; usdSelect.appendChild(customOption);

  // helpers
  function formatIDR(n){ return (typeof n === 'number') ? n.toLocaleString('id-ID') : n; }
  function toNumberFromInput(str){ if(!str && str!==0) return 0; const cleaned = String(str).replace(/\D/g,''); return cleaned ? parseInt(cleaned,10) : 0; }
  function show(el){ el.classList.remove('hidden'); el.classList.add('fade-in'); }
  function hide(el){ el.classList.add('hidden'); el.classList.remove('fade-in'); }

  // prefs & cache & history
  function savePref(key, val){ try{ localStorage.setItem('mk_pref_' + key, JSON.stringify(val)); }catch(e){} }
  function loadPref(key, def=null){ try{ const raw = localStorage.getItem('mk_pref_' + key); return raw ? JSON.parse(raw) : def; }catch(e){ return def; } }
  function saveRateCache(value){ const payload = { value:Number(value), ts: Date.now() }; try{ localStorage.setItem('mk_rate_cache', JSON.stringify(payload)); }catch(e){} }
  function loadRateCache(){ try{ const raw = localStorage.getItem('mk_rate_cache'); if(!raw) return null; const obj = JSON.parse(raw); if(!obj || !obj.ts) return null; if(Date.now() - obj.ts > CACHE_TTL) return null; return obj.value; } catch(e){ return null; } }

  function loadHistory(){ try{ const raw = localStorage.getItem('mk_history'); return raw ? JSON.parse(raw) : []; }catch(e){ return []; } }
  function saveHistory(arr){ try{ localStorage.setItem('mk_history', JSON.stringify(arr)); }catch(e){} }
  function addHistory(item){
    const arr = loadHistory();
    arr.unshift(item); // newest first
    if(arr.length > 200) arr.length = 200;
    saveHistory(arr);
    renderHistory();
  }
  function clearHistory(){ try{ localStorage.removeItem('mk_history'); renderHistory(); }catch(e){} }

  // fetch rate
  async function fetchLiveRate(){
    try{
      const cached = loadRateCache();
      if(cached) return cached;
      const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=IDR');
      if(!res.ok) throw new Error('no rate');
      const j = await res.json();
      const val = j?.rates?.IDR;
      if(!val) throw new Error('no val');
      const rounded = Math.round(val);
      saveRateCache(rounded);
      return rounded;
    } catch(e){
      console.warn('fetch rate fail, fallback', e);
      return BASE_RATE;
    }
  }

  // clear UI state
  function clearAll(){
    hide(resultCard); resultMain.textContent='Rp 0'; resultFee.textContent='Rp 0'; resultInfo.textContent=''; resultExtra.textContent='';
    hide(ewalletResultImg); ewalletQrImg.src='';
    hide(pulsaTargetWrap); pulsaTargetText.textContent='-';
    hide(infoArea); infoArea.innerHTML='';
    hide(confirmWrap);
    confirmWrap.classList.remove('slide-up');
  }

  // show/hide mode
  function showMode(mode){
    if(mode==='crypto'){ show(cryptoSection); hide(pulsaSection); hide(ewalletSection); }
    else if(mode==='pulsa'){ hide(cryptoSection); show(pulsaSection); hide(ewalletSection); }
    else { hide(cryptoSection); hide(pulsaSection); show(ewalletSection); }
    clearAll();
    savePref('mode', mode);
    if(mode==='crypto'){ const lastEx = loadPref('exchange'); if(lastEx) cryptoExchange.value = lastEx; const lastUsd = loadPref('usd'); if(lastUsd) usdSelect.value = String(lastUsd); const lastChain = loadPref('chain'); if(lastChain) chainSelect.value = lastChain; updateCryptoView(); }
    if(mode==='pulsa'){ const lastOp = loadPref('pulsaOp'); if(lastOp) pulsaOperator.value = lastOp; const lastAmt = loadPref('pulsaAmt'); if(lastAmt) pulsaAmountEl.value = String(lastAmt); pulsaOperator.dispatchEvent(new Event('change')); }
    if(mode==='ewallet'){ const lastAmt = loadPref('ewalletAmt'); if(lastAmt) ewalletAmountEl.value = String(lastAmt); }
  }

  // init mode
  const savedMode = loadPref('mode');
  if(savedMode) modeSelect.value = savedMode;
  showMode(modeSelect.value);

  // Reset prefs (do not clear history)
  resetPrefs.addEventListener('click', ()=>{
    try{
      Object.keys(localStorage).filter(k=>k.startsWith('mk_pref_') || k === 'mk_rate_cache').forEach(k=>localStorage.removeItem(k));
    }catch(e){}
    Swal.fire({icon:'success',title:'Preferensi direset',timer:900,showConfirmButton:false});
    setTimeout(()=> location.reload(), 800);
  });

  modeSelect.addEventListener('change', ()=> showMode(modeSelect.value));

  // update crypto view (automatic)
  let lastComputed = { mode:'', ex:'', usd:0, chain:'' };
  async function updateCryptoView(){
    if(modeSelect.value !== 'crypto') return;
    const ex = cryptoExchange.value;
    // show chain selector only for On-chain option
    if(ex === 'On-chain'){ chainWrap.classList.remove('hidden'); } else { chainWrap.classList.add('hidden'); chainSelect.value = ''; }
    let usdVal = usdSelect.value;
    if(usdVal === 'custom' || usdVal === '') {
      hide(resultCard); hide(confirmWrap); return;
    } else {
      usdVal = Number(usdVal);
      savePref('usd', usdVal);
    }
    const chain = chainSelect.value || '';
    if(lastComputed.mode === modeSelect.value && lastComputed.ex === ex && lastComputed.usd === usdVal && lastComputed.chain === chain){
      return;
    }
    lastComputed = { mode:modeSelect.value, ex, usd:usdVal, chain };

    // fetch
    const rate = await fetchLiveRate();

    // calculation
    let rup;
    let fee;
    if (Math.abs(usdVal - 1) < 1e-9){ rup = 15000; fee = 0; }
    else {
      rup = usdVal * rate;
      fee = cryptoFee(rup);
      rup -= fee;
    }
    const rounded = Math.round(rup/500)*500;

    // show result
    resultMain.textContent = "Rp " + formatIDR(rounded);
    resultFee.textContent = (fee===0)?'Rp 0':'Rp ' + formatIDR(fee);
    resultInfo.textContent = `${usdVal} USD × Rp ${formatIDR(rate)} - Fee Rp ${formatIDR(fee)}`;
    resultExtra.textContent = `Jenis: Crypto`;
    resultCard.classList.remove('hidden');

    // info area
    infoArea.innerHTML = '';
    if(ex === 'On-chain'){
      const selectedChain = chain || '';
      if(!selectedChain){
        infoArea.innerHTML = `<div class="addr-box"><div class="text-xs muted">Pilih network untuk menampilkan alamat on-chain.</div></div>`;
      } else {
        const addr = onchainAddrs[selectedChain] || '-';
        const label = (selectedChain === 'evm') ? 'EVM (BEP-20 / ETH / Polygon / dll)' : (selectedChain === 'aptos' ? 'APTOS' : (selectedChain === 'tron' ? 'TRON (TRC20)' : (selectedChain === 'solana' ? 'SOLANA' : selectedChain.toUpperCase())));
        const icon = renderChainIcon(selectedChain);
        infoArea.innerHTML = `
          <div class="text-xs muted flex items-center gap-2">${icon}<span class="font-semibold">${label}</span></div>
          <div class="addr-box flex items-center justify-between mt-2">
            <div class="addr-text">${addr}</div>
            <button class="copy-icon" data-copy-addr aria-label="Salin alamat">
              <svg viewBox="0 0 24 24" fill="none"><path d="M16 4H8a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="8" width="10" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/></svg>
            </button>
          </div>
          <div class="text-xs muted italic mt-2">⚠️ Pastikan network & alamat sesuai sebelum melakukan transfer on-chain.</div>
        `;
      }
      infoArea.classList.remove('hidden');
    } else {
      const id = exchangeIds[ex] || '-';
      infoArea.innerHTML = `
        <div class="addr-box">
          <div class="text-xs muted">Tujuan: <strong>${ex || '-'}</strong></div>
          <div class="addr-text mt-2">${id}</div>
          <div class="mt-2"><button class="copy-icon" id="copyExId" aria-label="Salin ID Tujuan"><svg viewBox="0 0 24 24" fill="none"><path d="M16 4H8a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="8" width="10" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/></svg></button></div>
        </div>
      `;
      infoArea.classList.remove('hidden');
    }

    // show confirm with slide-up
    confirmWrap.classList.remove('hidden');
    confirmWrap.classList.add('slide-up');

    savePref('exchange', ex || '');
    savePref('chain', chain);
  }

  // chain icon
  function renderChainIcon(chain){
    if(chain === 'evm'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="#60a5fa" stroke-width="1.2" fill="#071f2f"/><path d="M8 12l2 2 6-6" stroke="#60a5fa" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>EVM</span>`;
    } else if(chain === 'aptos'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="4" fill="#2dd4bf"/></svg></span>APTOS</span>`;
    } else if(chain === 'solana'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M2 12c0 5.52 4.48 10 10 10s10-4.48 10-10S17.52 2 12 2 2 6.48 2 12z" fill="#60a5fa"/></svg></span>SOL</span>`;
    } else if(chain === 'tron'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2L2 22h20L12 2z" fill="#ff6b6b"/></svg></span>TRON</span>`;
    } else if(chain === 'ton'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="10" fill="#60a5fa"/></svg></span>TON</span>`;
    } else if(chain === 'near'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><rect x="4" y="4" width="16" height="16" rx="3" fill="#2dd4bf"/></svg></span>NEAR</span>`;
    } else if(chain === 'statemint'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 12h18" stroke="#60a5fa" stroke-width="2"/></svg></span>Statemint</span>`;
    } else if(chain === 'tezos'){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4h16v16H4z" fill="#f59e0b"/></svg></span>TEZOS</span>`;
    } else return '';
  }

  // events
  cryptoExchange.addEventListener('change', ()=> { hide(confirmWrap); updateCryptoView(); });
  usdSelect.addEventListener('change', ()=> { hide(confirmWrap); updateCryptoView(); });
  chainSelect.addEventListener('change', ()=> { hide(confirmWrap); updateCryptoView(); });
  cryptoMax.addEventListener('click', ()=> { usdSelect.value = String(MAX_USD); savePref('usd', MAX_USD); updateCryptoView(); });

  // delegated copy-icon
  document.body.addEventListener('click', (e)=>{
    const btn = e.target.closest && e.target.closest('.copy-icon');
    if(!btn) return;
    const box = btn.closest('.addr-box');
    const addr = box ? box.querySelector('.addr-text')?.textContent.trim() : null;
    if(addr){
      navigator.clipboard.writeText(addr).then(()=> {
        btn.classList.add('success');
        Swal.fire({toast:true,position:'top-end',icon:'success',title:'Tersalin',showConfirmButton:false,timer:900});
        setTimeout(()=> btn.classList.remove('success'), 1000);
      }).catch(()=> {
        Swal.fire({icon:'info',title:'Salin',text:addr});
      });
    }
  });

  // pulsa confirm
  pulsaOperator.addEventListener('change', ()=> {
    const op = pulsaOperator.value;
    if(!op){ hide(pulsaTargetWrap); pulsaTargetText.textContent='-'; return; }
    hide(pulsaTargetWrap);
    savePref('pulsaOp', op);
    hide(confirmWrap);
  });

  confirmPulsa.addEventListener('click', ()=>{
    const op = pulsaOperator.value;
    const raw = pulsaAmountEl.value;
    const num = toNumberFromInput(raw);
    if(!op){ return Swal.fire({icon:'warning',title:'Pilih operator', timer:1100, showConfirmButton:false}); }
    if(!num){ return Swal.fire({icon:'warning',title:'Masukkan nominal', timer:1100, showConfirmButton:false}); }
    if(num < 5000){ return Swal.fire({icon:'warning',title:'Nominal terlalu kecil', text:'Minimal Rp 5.000', timer:1400, showConfirmButton:false}); }

    savePref('pulsaAmt', num);
    const ratePercent = pulsaRates[op] || 0;
    const received = Math.round(num * (ratePercent/100));
    resultMain.textContent = "Rp " + formatIDR(received);
    resultFee.textContent = `${ratePercent}% (rate)`;
    resultInfo.textContent = `Pulsa Rp ${formatIDR(num)} × ${ratePercent}% = Rp ${formatIDR(received)}`;
    resultExtra.textContent = `Operator: ${op.toUpperCase()}`;
    resultCard.classList.remove('hidden');

    // show target & confirm
    const target = pulsaTargets[op] || '-';
    pulsaTargetText.textContent = target;
    pulsaTargetWrap.classList.remove('hidden');
    confirmWrap.classList.remove('hidden'); confirmWrap.classList.add('slide-up');

    Swal.fire({toast:true,position:'top-end',icon:'success',title:'Nominal terkonfirmasi',showConfirmButton:false,timer:900});
  });

  // ewallet confirm
  confirmEwallet.addEventListener('click', ()=>{
    const raw = ewalletAmountEl.value;
    const num = toNumberFromInput(raw);
    if(!num){ return Swal.fire({icon:'warning',title:'Masukkan nominal', timer:1100, showConfirmButton:false}); }
    if(num < 2000){ return Swal.fire({icon:'warning',title:'Nominal terlalu kecil', text:'Minimal Rp 2.000', timer:1400, showConfirmButton:false}); }

    savePref('ewalletAmt', num);
    const fee = ewalletFee(num);
    const received = num - fee;
    resultMain.textContent = "Rp " + formatIDR(received);
    resultFee.textContent = "Rp " + formatIDR(fee);
    resultInfo.textContent = `${formatIDR(num)} - Fee ${formatIDR(fee)} = ${formatIDR(received)}`;
    resultExtra.textContent = `E-Wallet (perkiraan)`;
    ewalletQrImg.src = QR_IMAGE_URL;
    ewalletResultImg.classList.remove('hidden');
    resultCard.classList.remove('hidden');
    confirmWrap.classList.remove('hidden'); confirmWrap.classList.add('slide-up');

    Swal.fire({toast:true,position:'top-end',icon:'success',title:'Nominal terkonfirmasi',showConfirmButton:false,timer:900});
  });

  // confirm via WA: save history then open WA
  confirmBtn.addEventListener('click', async ()=>{
    const mode = modeSelect.value;
    if(!mode) return Swal.fire({icon:'error',title:'Pilih mode'});
    const invoice = 'ZEX' + Date.now().toString(36).toUpperCase().slice(-6);

    // Build history object
    let historyItem = { invoice, mode, exchange:null, nominal:null, fee:0, result:0, target:null, ts: Date.now() };

    let summaryHtml = `<div style="text-align:left;">Invoice: <strong>${invoice}</strong><br/><br/>`;
    if(mode==='crypto'){
      const ex = cryptoExchange.value || '-';
      const usd = usdSelect.value === 'custom' ? (loadPref('usd') || '-') : usdSelect.value || '-';
      if(!usd || usd === '') return Swal.fire({icon:'warning',title:'Pilih nominal USD', text:'Pilih nominal atau klik MAX', timer:1300, showConfirmButton:false});
      const rate = await fetchLiveRate();
      let feeVal = 0;
      let rup;
      if(Math.abs(Number(usd) - 1) < 1e-9){ rup = 15000; feeVal = 0; }
      else { rup = Number(usd) * rate; feeVal = cryptoFee(rup); }
      const final = Math.round((rup - feeVal)/500)*500;

      // address if onchain
      const exIsOnchain = ex === 'On-chain';
      let addrText = '';
      if(exIsOnchain){
        const chain = chainSelect.value || '';
        if(chain){ addrText = onchainAddrs[chain] || ''; summaryHtml += `Network: ${chain.toUpperCase()}<br/>`; }
      } else { addrText = exchangeIds[ex] || ''; }

      summaryHtml += `Jenis: <strong>Crypto</strong><br/>Tujuan: <strong>${ex}</strong><br/>Nominal: <strong>${usd} USD</strong><br/>Rate: <strong>Rp ${formatIDR(rate)}</strong><br/>Fee: <strong>Rp ${formatIDR(feeVal)}</strong><br/>Hasil akhir (est.): <strong>Rp ${formatIDR(final)}</strong><br/>`;
      if(addrText) summaryHtml += `Tujuan Pembayaran:<div class="addr-box" style="margin-top:8px"><div class="addr-text">${addrText}</div></div>`;
      summaryHtml += `<br/>`;

      historyItem.exchange = ex;
      historyItem.nominal = usd + ' USD';
      historyItem.fee = feeVal;
      historyItem.result = final;
      historyItem.target = addrText || '-';
    } else if(mode==='pulsa'){
      const op = pulsaOperator.value || '-';
      const denom = pulsaAmountEl.value || '-';
      if(!op) return Swal.fire({icon:'warning',title:'Pilih operator', timer:1100, showConfirmButton:false});
      if(!denom) return Swal.fire({icon:'warning',title:'Konfirmasi nominal pulsa dahulu', timer:1100, showConfirmButton:false});
      const ratePercent = pulsaRates[op] || 0;
      const received = Math.round(Number(denom) * (ratePercent/100));
      summaryHtml += `Jenis: <strong>Pulsa (${op.toUpperCase()})</strong><br/>Nominal Pulsa: <strong>Rp ${formatIDR(Number(denom)||0)}</strong><br/>${escapeHtml(resultInfo.textContent)}<br/>Tujuan: <div class="addr-box"><div class="addr-text">${pulsaTargetText.textContent}</div></div>`;
      historyItem.exchange = op;
      historyItem.nominal = 'Rp ' + formatIDR(Number(denom)||0);
      historyItem.fee = `${ratePercent}%`;
      historyItem.result = received;
      historyItem.target = pulsaTargetText.textContent || '-';
    } else if(mode==='ewallet'){
      const amt = ewalletAmountEl.value || '-';
      if(!amt) return Swal.fire({icon:'warning',title:'Konfirmasi nominal ewallet dahulu', timer:1100, showConfirmButton:false});
      const fee = ewalletFee(Number(amt));
      const received = Number(amt) - fee;
      summaryHtml += `Jenis: <strong>E-Wallet</strong><br/>Nominal: <strong>Rp ${formatIDR(Number(amt)||0)}</strong><br/>${escapeHtml(resultInfo.textContent)}<br/>`;
      historyItem.exchange = 'E-Wallet';
      historyItem.nominal = 'Rp ' + formatIDR(Number(amt)||0);
      historyItem.fee = fee;
      historyItem.result = received;
      historyItem.target = 'QRIS';
    }

    summaryHtml += `</div>`;

    const { isConfirmed } = await Swal.fire({
      title: 'Konfirmasi transaksi',
      html: summaryHtml,
      showCancelButton: true,
      confirmButtonText: 'Buka WhatsApp',
      cancelButtonText: 'Batal',
      width: '640px'
    });
    if(!isConfirmed) return;

    // save history
    addHistory(historyItem);

    // build WA message
    let body = `Halo admin,%0AInvoice: ${historyItem.invoice}%0A`;
    if(historyItem.mode === 'crypto'){
      body += `Jenis: Crypto%0ATujuan: ${historyItem.exchange}%0ANominal: ${historyItem.nominal}%0AHasil: Rp ${formatIDR(historyItem.result)}%0AFee: Rp ${formatIDR(historyItem.fee)}%0A`;
      if(historyItem.target) body += `TujuanPembayaran: ${encodeURIComponent(historyItem.target)}%0A`;
    } else if(historyItem.mode === 'pulsa'){
      body += `Jenis: Pulsa (${historyItem.exchange})%0ANominal: ${historyItem.nominal}%0AHasil: Rp ${formatIDR(historyItem.result)}%0A`;
      if(historyItem.target) body += `Tujuan: ${encodeURIComponent(historyItem.target)}%0A`;
    } else {
      body += `Jenis: E-Wallet%0ANominal: ${historyItem.nominal}%0AHasil: Rp ${formatIDR(historyItem.result)}%0A`;
    }
    body += `Mohon konfirmasi. Terima kasih.`;
    const url = `https://wa.me/${waAdmin}?text=${body}`;
    window.open(url, '_blank');
  });

  // History UI
  openHistory.addEventListener('click', ()=> {
    renderHistory();
    historyOverlay.style.display = 'block';
    historyOverlay.scrollTop = 0;
    historyOverlay.setAttribute('aria-hidden','false');
  });
  closeHistory.addEventListener('click', ()=> {
    historyOverlay.style.display = 'none';
    historyOverlay.setAttribute('aria-hidden','true');
  });
  clearHistoryBtn.addEventListener('click', ()=> {
    Swal.fire({
      title: 'Hapus semua riwayat?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal'
    }).then(res => {
      if(res.isConfirmed){ clearHistory(); Swal.fire({icon:'success',title:'Riwayat dihapus',timer:900,showConfirmButton:false}); }
    });
  });

  function renderHistory(){
    const arr = loadHistory();
    historyListWrap.innerHTML = '';
    if(!arr || arr.length === 0){ noHistory.style.display = 'block'; return; }
    noHistory.style.display = 'none';
    arr.forEach((h, idx)=> {
      const time = new Date(h.ts || Date.now());
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="flex:1">
            <div style="font-weight:700">${escapeHtml((h.mode||'').toUpperCase())} ${h.exchange?('• '+escapeHtml(String(h.exchange))):''}</div>
            <div class="muted-xs" style="margin-top:6px">${time.toLocaleString()}</div>
            <div class="muted-xs" style="margin-top:8px">Invoice: <strong>${escapeHtml(h.invoice||'-')}</strong></div>
            <div class="muted-xs" style="margin-top:6px">Nominal: <strong>${escapeHtml(String(h.nominal||'-'))}</strong></div>
            <div class="muted-xs">Hasil: <strong>Rp ${formatIDR(h.result||0)}</strong> • Fee: <strong>${typeof h.fee === 'number' ? 'Rp ' + formatIDR(h.fee) : escapeHtml(String(h.fee))}</strong></div>
            <div class="muted-xs" style="margin-top:6px">Tujuan: <span class="addr-text">${escapeHtml(h.target||'-')}</span></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button data-del="${idx}" class="btn-ghost">Hapus</button>
          </div>
        </div>
      `;
      historyListWrap.appendChild(div);
    });
    // attach delete handlers
    historyListWrap.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click', (ev)=>{
        const i = Number(btn.getAttribute('data-del'));
        const arr2 = loadHistory();
        arr2.splice(i,1);
        saveHistory(arr2);
        renderHistory();
        Swal.fire({toast:true,position:'top-end',icon:'success',title:'Item dihapus',showConfirmButton:false,timer:900});
      });
    });
  }

  // small UX
  [usdSelect, pulsaAmountEl, ewalletAmountEl].forEach(el=> el.addEventListener('focus', ()=> setTimeout(()=> el.scrollIntoView({behavior:'smooth', block:'center'}), 120)));

  // escape html
  function escapeHtml(txt = '') { return String(txt).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // init prefs & background fetch
  (function init(){
    const pMode = loadPref('mode'); if(pMode) modeSelect.value = pMode;
    const pEx = loadPref('exchange'); if(pEx) cryptoExchange.value = pEx;
    const pUsd = loadPref('usd'); if(pUsd) usdSelect.value = String(pUsd);
    const pChain = loadPref('chain'); if(pChain) chainSelect.value = pChain;
    const pPulsaOp = loadPref('pulsaOp'); if(pPulsaOp) pulsaOperator.value = pPulsaOp;
    const pPulsaAmt = loadPref('pulsaAmt'); if(pPulsaAmt) pulsaAmountEl.value = String(pPulsaAmt);
    const pEamt = loadPref('ewalletAmt'); if(pEamt) ewalletAmountEl.value = String(pEamt);
    showMode(modeSelect.value);
    fetchLiveRate().catch(()=>{});
    renderHistory();
  })();

  // --- utility fee functions (kept here for completeness) ---
  function ewalletFee(amount){
    if (amount <= 49999) return 1000;
    if (amount <= 99999) return 3000;
    if (amount <= 499999) return 5000;
    if (amount <= 999999) return 10000;
    return Math.round(amount * 0.01);
  }
  function cryptoFee(rup){
    const tiers = [
      { max:10000, fee:1500 },{ max:30000, fee:2000 },{ max:70000, fee:3000 },
      { max:100000, fee:4000 },{ max:200000, fee:5000 },{ max:250000, fee:6000 },
      { max:400000, fee:7000 },{ max:500000, fee:8000 },{ max:750000, fee:9000 },
      { max:950000, fee:10000 },{ max:1500000, fee:12000 }
    ];
    for(const t of tiers) if (rup <= t.max) return t.fee;
    return 15000;
  }

// --- Mobile helper: ensure viewport initial-scale=1 exists (fallback) ---
(function ensureViewport(){
  try {
    const meta = document.querySelector('meta[name="viewport"]');
    if(meta){
      const content = meta.getAttribute('content') || '';
      if(!/initial-scale/.test(content)){
        meta.setAttribute('content', content + (content ? ',' : '') + 'initial-scale=1.0,maximum-scale=1.0');
      } else {
        // ensure maximum-scale=1 to reduce zooming (careful on accessibility)
        if(!/maximum-scale/.test(content)) {
          meta.setAttribute('content', content + ',maximum-scale=1.0');
        }
      }
    }
  } catch(e){}
})();
})();