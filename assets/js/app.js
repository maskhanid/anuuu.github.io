(function(){
  // -----------------------
  // Config & constants
  // -----------------------
  const BASE_RATE = 16500;
  const MAX_USD = 200;
  const waAdmin = '6285777747654'; // ganti jika perlu
  const CACHE_TTL = 5 * 60 * 1000;

  // onchain addresses mapping
  const onchainAddrs = {
    bsc:    '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    eth:    '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    matic:  '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    plasma: '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    arbitrum:'0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    avaxc:  '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    optimism:'0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    opbnb:  '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    celo:   '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    kaia:   '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    avaevm: '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    bep20:  '0x290a91c48dba8b5f46480fdbe27e2318c7b53bcf',
    tron:      'TP1FxRhfQQEj6cNvYGMpnMCSSmR67s7fAE',
    aptos:     '0xf459b005f7e2d5f34ad7b32f72c86ace5f84d67a0f7174640a64b7e7b9d81c36',
    solana:    'DCuvyPMxzMTnTYbZFBxUCHhqAN3uJgtkm6RKrQaMNtFv',
    ton:       'UQBDu8yXOFHAtHd2Qf8ZFVQCgVhePFQm0dH8xinC-Uf1-fHN',
    near:      'a529c964da9b2b2331e0cb863f16c09094fa80d0763d982965a04707a260ba7f',
    statemint: '14fhKH3EPtCiT9pJAxSPHW9y5L2EwhyhZfNVb2NnCcmqDfry',
    tezos:     'tz2Wz2yp41a9NyzLaaxYqt59SaZTMzk3YHfr'
  };

  const exchangeIds = { "Binance":"491222749" };
  const pulsaRates = { axis:85, indosat:80 };
  const pulsaTargets = { axis: '083121196257', indosat: '08557112334' };

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

  // state flags for pulsa/ewallet lock
  let pulsaLocked = false;
  let ewalletLocked = false;

  // populate USD select (no default selection)
  (function populateUsd(){
    usdSelect.innerHTML = '<option value="">Pilih nominal (contoh: 1, 5, 10 ...)</option>';
    for(let i=1;i<=MAX_USD;i++){
      const o=document.createElement('option'); o.value=i; o.textContent=i+' USD'; usdSelect.appendChild(o);
    }
    const c=document.createElement('option'); c.value='custom'; c.textContent='Ketik manual...'; usdSelect.appendChild(c);
  })();

  // Helpers
  function formatIDR(n){ if(typeof n !== 'number') n = Number(n) || 0; return n.toLocaleString('id-ID'); }
  function toNumberFromInput(str){ if(!str && str!==0) return 0; const cleaned = String(str).replace(/[^\d]/g,''); return cleaned ? parseInt(cleaned,10) : 0; }
  function show(el){ if(!el) return; el.classList.remove('hidden'); el.classList.add('fade-in'); }
  function hide(el){ if(!el) return; el.classList.add('hidden'); el.classList.remove('fade-in'); }
  function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // prefs & cache & history
  function savePref(key,val){ try{ localStorage.setItem('mk_pref_'+key, JSON.stringify(val)); }catch(e){} }
  function loadPref(key, def=null){ try{ const raw = localStorage.getItem('mk_pref_'+key); return raw ? JSON.parse(raw) : def; }catch(e){ return def; } }
  function saveRateCache(value){ try{ localStorage.setItem('mk_rate_cache', JSON.stringify({value:Number(value), ts:Date.now()})); }catch(e){} }
  function loadRateCache(){ try{ const raw = localStorage.getItem('mk_rate_cache'); if(!raw) return null; const obj = JSON.parse(raw); if(!obj.ts) return null; if(Date.now()-obj.ts > CACHE_TTL) return null; return obj.value; }catch(e){ return null; } }

  function loadHistory(){ try{ const raw = localStorage.getItem('mk_history'); return raw ? JSON.parse(raw) : []; }catch(e){ return []; } }
  function saveHistory(arr){ try{ localStorage.setItem('mk_history', JSON.stringify(arr)); }catch(e){} }
  function addHistory(item){ const arr = loadHistory(); arr.unshift(item); if(arr.length>200) arr.length=200; saveHistory(arr); renderHistory(); }

  // fetch rate
  async function fetchLiveRate(){
    try{
      const cached = loadRateCache(); if(cached) return cached;
      const res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=IDR');
      if(!res.ok) throw new Error('no rate'); const j = await res.json();
      const val = j?.rates?.IDR; if(!val) throw new Error('no val');
      const rounded = Math.round(val); saveRateCache(rounded); return rounded;
    } catch(e){
      console.warn('fetch rate failed, fallback to base', e); return BASE_RATE;
    }
  }

  // fee functions
  function ewalletFee(amount){ if(amount <= 49999) return 1000; if(amount <= 99999) return 3000; if(amount <= 499999) return 5000; if(amount <= 999999) return 10000; return Math.round(amount * 0.01); }
  function cryptoFee(rup){ const tiers = [{ max:10000, fee:1500 },{ max:30000, fee:2000 },{ max:70000, fee:3000 },{ max:100000, fee:4000 },{ max:200000, fee:5000 },{ max:250000, fee:6000 },{ max:400000, fee:7000 },{ max:500000, fee:8000 },{ max:750000, fee:9000 },{ max:950000, fee:10000 },{ max:1500000, fee:12000 }]; for(const t of tiers) if(rup <= t.max) return t.fee; return 15000; }

  // small UX sound
  function playErrorSound(){ try{ const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine'; o.frequency.value = 220; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16); setTimeout(()=>{ try{ o.stop(); ctx.close(); }catch(e){} }, 300); }catch(e){} }

  function clearAll(){ hide(resultCard); resultMain.textContent='Rp 0'; resultFee.textContent='Rp 0'; resultInfo.textContent=''; resultExtra.textContent=''; hide(ewalletResultImg); ewalletQrImg.src=''; hide(pulsaTargetWrap); pulsaTargetText.textContent='-'; hide(infoArea); infoArea.innerHTML=''; hide(confirmWrap); confirmWrap.classList.remove('slide-up'); }

  // -----------------------
  // Mode handling
  // -----------------------
  function showMode(mode){
    if(mode === 'crypto'){ show(cryptoSection); hide(pulsaSection); hide(ewalletSection); }
    else if(mode === 'pulsa'){ hide(cryptoSection); show(pulsaSection); hide(ewalletSection); }
    else { hide(cryptoSection); hide(pulsaSection); show(ewalletSection); }
    clearAll(); savePref('mode', mode);

    if(mode === 'crypto'){
      const lastEx = loadPref('exchange'); if(lastEx) cryptoExchange.value = lastEx;
      const lastUsd = loadPref('usd'); if(lastUsd) usdSelect.value = String(lastUsd);
      const lastChain = loadPref('chain'); if(lastChain) chainSelect.value = lastChain;
      updateCryptoView();
    }
    if(mode === 'pulsa'){ const lastOp = loadPref('pulsaOp'); if(lastOp) pulsaOperator.value = lastOp; const lastAmt = loadPref('pulsaAmt'); if(lastAmt) pulsaAmountEl.value = String(lastAmt); }
    if(mode === 'ewallet'){ const lastAmt = loadPref('ewalletAmt'); if(lastAmt) ewalletAmountEl.value = String(lastAmt); }
  }

  const savedMode = loadPref('mode'); if(savedMode) modeSelect.value = savedMode; showMode(modeSelect.value);
  modeSelect.addEventListener('change', ()=> showMode(modeSelect.value));
  resetPrefs.addEventListener('click', ()=> { try{ Object.keys(localStorage).filter(k=>k.startsWith('mk_pref_') || k === 'mk_rate_cache').forEach(k=>localStorage.removeItem(k)); }catch(e){} if(typeof Swal!=='undefined') Swal.fire({icon:'success',title:'Preferensi direset',timer:900,showConfirmButton:false}); setTimeout(()=> location.reload(), 700); });

  // -----------------------
  // Crypto compute & view
  // -----------------------
  let lastComputed = { mode:'', ex:'', usd:0, chain:'' };
  async function updateCryptoView(){
    if(modeSelect.value !== 'crypto') return;
    const ex = cryptoExchange.value;

    // show chain selector only if onchain target
    if(ex === 'Wallet Crypto / Onchain'){ chainWrap.classList.remove('hidden'); } else { chainWrap.classList.add('hidden'); chainSelect.value=''; }

    let usdVal = usdSelect.value;
    // if user hasn't chosen nominal yet, hide results and address
    if(!usdVal || usdVal === 'custom'){
      hide(resultCard);
      hide(confirmWrap);
      // even if chain selected, don't show address until nominal selected
      hide(infoArea);
      // also clear infoArea content to ensure it doesn't linger
      infoArea.innerHTML = '';
      return;
    }
    usdVal = Number(usdVal);
    savePref('usd', usdVal);
    const chain = chainSelect.value || '';

    // avoid unnecessary recompute
    if(lastComputed.mode === modeSelect.value && lastComputed.ex === ex && lastComputed.usd === usdVal && lastComputed.chain === chain) return;
    lastComputed = { mode:modeSelect.value, ex, usd:usdVal, chain };

    const rate = await fetchLiveRate();
    let rup, fee;
    if (Math.abs(usdVal - 1) < 1e-9){ rup = 15000; fee = 0; }
    else { rup = usdVal * rate; fee = cryptoFee(rup); }
    const final = Math.round((rup - fee)/500) * 500;

    // render results
    resultMain.textContent = "Rp " + formatIDR(final);
    resultFee.textContent = (fee===0)?'Rp 0':'Rp ' + formatIDR(fee);
    resultInfo.textContent = `${usdVal} USD × Rp ${formatIDR(rate)} - Fee Rp ${formatIDR(fee)}`;
    resultExtra.textContent = `Jenis: Crypto`;
    resultCard.classList.remove('hidden');

    // show address *only* when exchange is onchain AND nominal selected
    if(ex === 'Wallet Crypto / Onchain'){
      if(!chain){
        infoArea.innerHTML = `<div class="addr-box"><div class="text-xs muted">Pilih Network untuk menampilkan alamat</div></div>`;
        infoArea.classList.remove('hidden');
      } else {
        const addr = onchainAddrs[chain] || '-';
        const label = chain.toUpperCase();
        const icon = renderChainIcon(chain);
        infoArea.innerHTML = `
          <div class="text-xs muted flex items-center gap-2">${icon}<span class="font-semibold">${label}</span></div>
          <div class="addr-box flex items-center justify-between mt-2">
            <div class="addr-text">${addr}</div>
            <button class="copy-icon" data-copy-addr aria-label="Salin alamat">
              <svg viewBox="0 0 24 24" fill="none"><path d="M16 4H8a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="8" width="10" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/></svg>
            </button>
          </div>
          <div class="text-xs muted italic mt-2">⚠️ Pastikan network sesuai sebelum mengirim.</div>
        `;
        infoArea.classList.remove('hidden');
      }
    } else {
      const id = exchangeIds[ex] || '-';
      infoArea.innerHTML = `
        <div class="addr-box">
          <div class="text-xs muted">Tujuan: <strong>${ex || '-'}</strong></div>
          <div class="addr-text mt-2">${id}</div>
          <div class="mt-2"><button class="copy-icon" id="copyExId" aria-label="Salin ID Exchange"><svg viewBox="0 0 24 24" fill="none"><path d="M16 4H8a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="8" width="10" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/></svg></button></div>
        </div>
      `;
      infoArea.classList.remove('hidden');
    }

    // only enable confirm when exchange chosen and (if onchain) chain chosen
    const ready = (ex && (ex !== 'Wallet Crypto / Onchain' || chain));
    if(ready){
      confirmWrap.classList.remove('hidden'); confirmWrap.classList.add('slide-up');
    } else {
      hide(confirmWrap);
    }

    savePref('exchange', ex || '');
    savePref('chain', chain);
  }

  function renderChainIcon(chain){
    if(['bsc','bep20','avaevm','avaxc','eth','matic','arbitrum','optimism','opbnb','celo','kaia','plasma'].includes(chain)){
      return `<span class="chain-badge"><span class="chain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="10" stroke="#60a5fa" stroke-width="1.2" fill="#071f2f"/><path d="M8 12l2 2 6-6" stroke="#60a5fa" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>EVM</span>`;
    } else if(chain === 'tron'){ return `<span class="chain-badge">TRON</span>`; }
    else if(chain === 'aptos'){ return `<span class="chain-badge">APTOS</span>`; }
    else if(chain === 'solana'){ return `<span class="chain-badge">SOL</span>`; }
    else if(chain === 'ton'){ return `<span class="chain-badge">TON</span>`; }
    else if(chain === 'near'){ return `<span class="chain-badge">NEAR</span>`; }
    else if(chain === 'statemint'){ return `<span class="chain-badge">STATEMINT</span>`; }
    else if(chain === 'tezos'){ return `<span class="chain-badge">TEZOS</span>`; }
    else return '';
  }

  // bind crypto events
  cryptoExchange.addEventListener('change', ()=> {
    // when exchange changes, if nominal not selected then clear info
    if(!usdSelect.value || usdSelect.value === 'custom'){
      infoArea.innerHTML = '';
      hide(infoArea);
      hide(resultCard);
      hide(confirmWrap);
    }
    updateCryptoView();
  });
  usdSelect.addEventListener('change', ()=> {
    if(!usdSelect.value || usdSelect.value === 'custom'){
      infoArea.innerHTML = '';
      hide(infoArea);
      hide(resultCard);
      hide(confirmWrap);
      return;
    }
    hide(confirmWrap);
    updateCryptoView();
  });
  chainSelect.addEventListener('change', ()=> { hide(confirmWrap); updateCryptoView(); });
  cryptoMax.addEventListener('click', ()=> { usdSelect.value = String(MAX_USD); savePref('usd', MAX_USD); updateCryptoView(); });

  // delegated copy handler for addr boxes
  document.body.addEventListener('click', (e)=>{
    const btn = e.target.closest && e.target.closest('.copy-icon');
    if(!btn) return;
    const box = btn.closest('.addr-box');
    const addr = box ? box.querySelector('.addr-text')?.textContent.trim() : null;
    if(addr){
      navigator.clipboard.writeText(addr).then(()=> {
        btn.classList.add('success');
        if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'Tersalin',showConfirmButton:false,timer:900});
        setTimeout(()=> btn.classList.remove('success'), 1000);
      }).catch(()=> {
        if(typeof Swal !== 'undefined') Swal.fire({icon:'info',title:'Salin',text:addr}); else alert('Salin: ' + addr);
      });
    }
  });

  // -----------------------
  // Pulsa compute (refactored & lock toggle)
  // -----------------------
  function computePulsaPreview(){
    const op = pulsaOperator.value;
    const raw = pulsaAmountEl.value;
    const num = toNumberFromInput(raw);
    if(!op || !num || num < 5000){ hide(resultCard); hide(confirmWrap); hide(pulsaTargetWrap); return; }
    const ratePercent = pulsaRates[op] || 0;
    const received = Math.round(num * (ratePercent/100));
    resultMain.textContent = "Rp " + formatIDR(received);
    resultFee.textContent = `${ratePercent}% (rate)`;
    resultInfo.textContent = `Pulsa Rp ${formatIDR(num)} × ${ratePercent}% = Rp ${formatIDR(received)}`;
    resultExtra.textContent = `Operator: ${op.toUpperCase()}`;
    resultCard.classList.remove('hidden');
    const target = pulsaTargets[op] || '-';
    pulsaTargetText.textContent = target;
    pulsaTargetWrap.classList.remove('hidden');
    confirmWrap.classList.remove('hidden'); confirmWrap.classList.add('slide-up');
  }

  // confirmPulsa toggles between Confirm and Cancel (Batal)
  confirmPulsa.addEventListener('click', ()=>{
    if(!pulsaLocked){
      // try to confirm (lock)
      const op = pulsaOperator.value;
      const num = toNumberFromInput(pulsaAmountEl.value);
      if(!op){ playErrorSound(); return Swal.fire({icon:'warning',title:'Pilih operator', timer:1100, showConfirmButton:false}); }
      if(!num){ playErrorSound(); return Swal.fire({icon:'warning',title:'Masukkan nominal', timer:1100, showConfirmButton:false}); }
      if(num < 5000){ playErrorSound(); return Swal.fire({icon:'warning',title:'Minimal Pulsa', text:'Nominal minimal Rp 5.000', timer:1400, showConfirmButton:false}); }

      // compute and lock input
      savePref('pulsaAmt', num);
      computePulsaPreview();
      pulsaAmountEl.disabled = true;
      pulsaLocked = true;
      confirmPulsa.textContent = 'Batal';
      confirmPulsa.classList.add('btn-ghost'); // style tweak (optional)
      if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'Nominal dikunci',showConfirmButton:false,timer:900});
    } else {
      // unlock (cancel)
      pulsaLocked = false;
      pulsaAmountEl.disabled = false;
      confirmPulsa.textContent = 'Konfirmasi';
      // hide preview so user can re-enter
      hide(resultCard); hide(confirmWrap); hide(pulsaTargetWrap);
      if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'info',title:'Konfirmasi dibatalkan',showConfirmButton:false,timer:900});
    }
  });

  // auto-update when user edits pulsa amount after unlocked
  pulsaAmountEl.addEventListener('input', ()=> {
    if(pulsaLocked){
      // if locked, do not update (prevent changes)
      return;
    }
    if(pulsaOperator.value && pulsaAmountEl.value) computePulsaPreview();
    else { hide(resultCard); hide(confirmWrap); }
  });

  pulsaOperator.addEventListener('change', ()=> {
    // when operator changes while pulsaLocked = true, keep locked value but update target
    if(pulsaLocked){
      // re-render target and result using locked amount
      computePulsaPreview();
    } else {
      setTimeout(()=> { if(pulsaAmountEl.value) computePulsaPreview(); }, 80);
    }
    savePref('pulsaOp', pulsaOperator.value);
  });

  // -----------------------
  // E-Wallet compute (refactored & lock toggle)
  // -----------------------
  function computeEwalletPreview(){
    const raw = ewalletAmountEl.value;
    const num = toNumberFromInput(raw);
    if(!num || num < 2000){ hide(resultCard); hide(confirmWrap); hide(ewalletResultImg); return; }
    const fee = ewalletFee(num); const received = num - fee;
    resultMain.textContent = "Rp " + formatIDR(received);
    resultFee.textContent = "Rp " + formatIDR(fee);
    resultInfo.textContent = `${formatIDR(num)} - Fee ${formatIDR(fee)} = ${formatIDR(received)}`;
    resultExtra.textContent = `E-Wallet convert`;
    const QR_IMAGE_URL = 'https://framerusercontent.com/images/rwTDmDDGQ0rl2rN2URuukiBlzgU.png';
    ewalletQrImg.src = QR_IMAGE_URL;
    ewalletResultImg.classList.remove('hidden');
    resultCard.classList.remove('hidden');
    confirmWrap.classList.remove('hidden'); confirmWrap.classList.add('slide-up');
  }

  confirmEwallet.addEventListener('click', ()=>{
    if(!ewalletLocked){
      const raw = ewalletAmountEl.value;
      const num = toNumberFromInput(raw);
      if(!num){ playErrorSound(); return Swal.fire({icon:'warning',title:'Masukkan nominal', timer:1100, showConfirmButton:false}); }
      if(num < 2000){ playErrorSound(); return Swal.fire({icon:'warning',title:'Minimal E-Wallet', text:'Nominal minimal Rp 2.000', timer:1400, showConfirmButton:false}); }

      savePref('ewalletAmt', num);
      computeEwalletPreview();
      ewalletAmountEl.disabled = true;
      ewalletLocked = true;
      confirmEwallet.textContent = 'Batal';
      if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'success',title:'Nominal dikunci',showConfirmButton:false,timer:900});
    } else {
      // unlock
      ewalletLocked = false;
      ewalletAmountEl.disabled = false;
      confirmEwallet.textContent = 'Konfirmasi';
      hide(resultCard); hide(confirmWrap); hide(ewalletResultImg);
      if(typeof Swal !== 'undefined') Swal.fire({toast:true,position:'top-end',icon:'info',title:'Konfirmasi dibatalkan',showConfirmButton:false,timer:900});
    }
  });

  // auto-update when user edits ewallet amount after unlocked
  ewalletAmountEl.addEventListener('input', ()=> {
    if(ewalletLocked) return;
    if(ewalletAmountEl.value) computeEwalletPreview();
    else { hide(resultCard); hide(confirmWrap); hide(ewalletResultImg); }
  });

  // -----------------------
  // Confirm -> Swal summary -> WA open (unchanged logic, uses current preview values)
  // -----------------------
  confirmBtn.addEventListener('click', async ()=>{
    const mode = modeSelect.value; if(!mode) return Swal.fire({icon:'error',title:'Pilih mode'});
    const invoice = 'ZEX' + Date.now().toString(36).toUpperCase().slice(-6);
    let historyItem = { invoice, mode, exchange:null, nominal:null, fee:0, result:0, target:null, ts: Date.now() };
    let summaryHtml = `<div style="text-align:left;">Invoice: <strong>${invoice}</strong><br/><br/>`;

    if(mode === 'crypto'){
      const ex = cryptoExchange.value || '-';
      const usd = usdSelect.value === 'custom' ? (loadPref('usd') || '-') : (usdSelect.value || '-');
      if(!usd || usd === '') return Swal.fire({icon:'warning',title:'Pilih nominal USD', text:'Pilih nominal atau klik MAX', timer:1300, showConfirmButton:false});
      const rate = await fetchLiveRate();
      let feeVal = 0; let rup;
      if(Math.abs(Number(usd) - 1) < 1e-9){ rup = 15000; feeVal = 0; } else { rup = Number(usd) * rate; feeVal = cryptoFee(rup); }
      const final = Math.round((rup - feeVal)/500)*500;
      const exIsOnchain = ex === 'Wallet Crypto / Onchain';
      let addrText = '';
      if(exIsOnchain){ const chain = chainSelect.value || ''; if(chain){ addrText = onchainAddrs[chain] || ''; summaryHtml += `Network: ${escapeHtml(chain.toUpperCase())}<br/>`; } }
      else { addrText = exchangeIds[ex] || ''; }

      summaryHtml += `Jenis: <strong>Crypto</strong><br/>Exchange: <strong>${escapeHtml(ex)}</strong><br/>Nominal: <strong>${escapeHtml(String(usd))} USD</strong><br/>Rate: <strong>Rp ${formatIDR(rate)}</strong><br/>Fee: <strong>Rp ${formatIDR(feeVal)}</strong><br/>Hasil akhir (est.): <strong>Rp ${formatIDR(final)}</strong><br/>`;
      if(addrText) summaryHtml += `Tujuan: <div class="addr-box"><div class="addr-text">${escapeHtml(addrText)}</div></div>`;
      summaryHtml += `<br/>`;
      historyItem.exchange = ex; historyItem.nominal = usd + ' USD'; historyItem.fee = feeVal; historyItem.result = final; historyItem.target = addrText || '-';
    } else if(mode === 'pulsa'){
      const op = pulsaOperator.value || '-'; const denom = toNumberFromInput(pulsaAmountEl.value) || 0;
      if(!op) return Swal.fire({icon:'warning',title:'Pilih operator', timer:1100, showConfirmButton:false});
      if(!denom) return Swal.fire({icon:'warning',title:'Konfirmasi nominal pulsa dahulu', timer:1100, showConfirmButton:false});
      const ratePercent = pulsaRates[op] || 0; const received = Math.round(Number(denom) * (ratePercent/100));
      summaryHtml += `Jenis: <strong>Pulsa (${escapeHtml(op.toUpperCase())})</strong><br/>Nominal Pulsa: <strong>Rp ${formatIDR(Number(denom)||0)}</strong><br/>${escapeHtml(resultInfo.textContent)}<br/>Tujuan: <div class="addr-box"><div class="addr-text">${escapeHtml(pulsaTargetText.textContent)}</div></div>`;
      historyItem.exchange = op; historyItem.nominal = 'Rp ' + formatIDR(Number(denom)||0); historyItem.fee = `${ratePercent}%`; historyItem.result = received; historyItem.target = pulsaTargetText.textContent || '-';
    } else if(mode === 'ewallet'){
      const amt = toNumberFromInput(ewalletAmountEl.value) || 0; if(!amt) return Swal.fire({icon:'warning',title:'Konfirmasi nominal ewallet dahulu', timer:1100, showConfirmButton:false});
      const fee = ewalletFee(amt); const received = amt - fee;
      summaryHtml += `Jenis: <strong>E-Wallet</strong><br/>Nominal: <strong>Rp ${formatIDR(Number(amt)||0)}</strong><br/>${escapeHtml(resultInfo.textContent)}<br/>`;
      historyItem.exchange = 'E-Wallet'; historyItem.nominal = 'Rp ' + formatIDR(Number(amt)||0); historyItem.fee = fee; historyItem.result = received; historyItem.target = 'QRIS';
    }

    summaryHtml += `</div>`;

    const { isConfirmed } = await Swal.fire({ title: 'Konfirmasi transaksi', html: summaryHtml, showCancelButton: true, confirmButtonText: 'Buka WhatsApp', cancelButtonText: 'Batal', width: '640px' });
    if(!isConfirmed) return;

    addHistory(historyItem);

    // build WA message
    let body = `Halo admin,%0AInvoice: ${historyItem.invoice}%0A`;
    if(historyItem.mode === 'crypto'){
      body += `Jenis: Crypto%0AExchange: ${encodeURIComponent(historyItem.exchange)}%0ANominal: ${encodeURIComponent(historyItem.nominal)}%0AHasil: Rp ${formatIDR(historyItem.result)}%0AFee: Rp ${formatIDR(historyItem.fee)}%0A`;
      if(historyItem.target) body += `Tujuan: ${encodeURIComponent(historyItem.target)}%0A`;
    } else if(historyItem.mode === 'pulsa'){
      body += `Jenis: Pulsa (${encodeURIComponent(historyItem.exchange)})%0ANominal: ${encodeURIComponent(historyItem.nominal)}%0AHasil: Rp ${formatIDR(historyItem.result)}%0A`;
      if(historyItem.target) body += `Tujuan: ${encodeURIComponent(historyItem.target)}%0A`;
    } else {
      body += `Jenis: E-Wallet%0ANominal: ${encodeURIComponent(historyItem.nominal)}%0AHasil: Rp ${formatIDR(historyItem.result)}%0A`;
    }
    body += `Mohon konfirmasi. Terima kasih.`;
    const url = `https://wa.me/${waAdmin}?text=${body}`;
    window.open(url, '_blank');
  });

  // -----------------------
  // History UI
  // -----------------------
  openHistory.addEventListener('click', ()=> { renderHistory(); historyOverlay.style.display = 'block'; historyOverlay.scrollTop = 0; historyOverlay.setAttribute('aria-hidden','false'); });
  closeHistory.addEventListener('click', ()=> { historyOverlay.style.display = 'none'; historyOverlay.setAttribute('aria-hidden','true'); });
  clearHistoryBtn.addEventListener('click', ()=> { Swal.fire({ title: 'Hapus semua riwayat?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal' }).then(res => { if(res.isConfirmed){ localStorage.removeItem('mk_history'); renderHistory(); Swal.fire({icon:'success',title:'Riwayat dihapus',timer:900,showConfirmButton:false}); } }); });

  function renderHistory(){
    const arr = loadHistory(); historyListWrap.innerHTML = '';
    if(!arr || arr.length === 0){ noHistory.style.display = 'block'; return; } noHistory.style.display = 'none';
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
    historyListWrap.querySelectorAll('button[data-del]').forEach(btn=>{ btn.addEventListener('click', ()=>{ const i = Number(btn.getAttribute('data-del')); const arr2 = loadHistory(); arr2.splice(i,1); saveHistory(arr2); renderHistory(); Swal.fire({toast:true,position:'top-end',icon:'success',title:'Item dihapus',showConfirmButton:false,timer:900}); }); });
  }

  // small UX: scroll into view when focusing inputs
  [usdSelect, pulsaAmountEl, ewalletAmountEl].forEach(el=> el && el.addEventListener('focus', ()=> setTimeout(()=> el.scrollIntoView({behavior:'smooth', block:'center'}), 120)));

  // init
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

  // expose for debug
  window._mk = { fetchLiveRate, onchainAddrs };

})();