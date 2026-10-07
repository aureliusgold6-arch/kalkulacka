// Zlato Aurelius – HTML stránky

import { STYLES } from './styles.js';

export const PUBLIC_HTML = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kalkulačka výkupu – Zlato Aurelius</title>
<style>${STYLES}</style>
</head>
<body>
<header><div class="wrap"><div class="logo">Zlato Aurelius</div></div></header>
<main><div class="wrap">
  <h1>Kalkulačka výkupu</h1>
  <p class="lead">Spočítejte si orientační cenu za vaše zlato nebo stříbro.</p>

  <div class="field">
    <label for="metal">Kov</label>
    <select id="metal" onchange="fillPurities(); calc()"></select>
  </div>

  <div class="field">
    <label for="purity">Ryzost</label>
    <select id="purity" onchange="calc()"></select>
  </div>

  <div class="row">
    <div class="field">
      <label for="weight">Hmotnost (g)</label>
      <input id="weight" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0,00" oninput="calc()">
    </div>
    <div class="field">
      <label for="pieces">Počet kusů</label>
      <input id="pieces" type="number" step="1" min="1" value="1" oninput="calc()">
    </div>
  </div>

  <div id="err" class="err"></div>

  <div class="result" id="result" style="display:none">
    <div class="price" id="price">—</div>
    <div class="detail" id="detail"></div>
  </div>

  <p class="note" id="noteCalc">Jedná se o orientační kalkulaci. Konečná cena bude potvrzena společností Zlato Aurelius.</p>

  <div id="ctaBox" style="display:none;margin-top:28px">
    <button class="primary" onclick="openForm()">Nezávazně poptat</button>
  </div>

  <div id="formBox" style="display:none;margin-top:36px;border-top:1px solid var(--border);padding-top:32px">
    <h2 style="font-size:21px;margin:0 0 6px">Vaše kontaktní údaje</h2>
    <p class="lead" style="margin-bottom:26px">Ozveme se vám a potvrdíme konečnou cenu.</p>

    <div class="field">
      <label for="cName">Jméno a příjmení</label>
      <input id="cName" type="text" autocomplete="name">
    </div>
    <div class="row">
      <div class="field">
        <label for="cPhone">Telefon</label>
        <input id="cPhone" type="tel" autocomplete="tel" placeholder="+420">
      </div>
      <div class="field">
        <label for="cEmail">E-mail</label>
        <input id="cEmail" type="email" autocomplete="email">
      </div>
    </div>
    <div class="field">
      <label for="cNote">Poznámka (nepovinné)</label>
      <input id="cNote" type="text" placeholder="Např. popis předmětu">
    </div>

    <div style="position:absolute;left:-9999px" aria-hidden="true">
      <input id="website" type="text" tabindex="-1" autocomplete="off">
    </div>

    <label style="display:flex;gap:10px;align-items:flex-start;text-transform:none;letter-spacing:0;font-weight:400;font-size:14px;color:#555;margin:6px 0 24px">
      <input id="cAgree" type="checkbox" style="width:auto;margin-top:3px">
      <span>Souhlasím se zpracováním uvedených údajů za účelem vyřízení této poptávky.</span>
    </label>

    <button class="primary" id="sendBtn" onclick="sendPreorder()">Odeslat poptávku</button>
    <div id="formErr" class="err"></div>
  </div>

  <div id="doneBox" style="display:none;margin-top:36px">
    <div class="result">
      <div style="font-size:21px;font-weight:600;margin-bottom:16px">Vaše předobjednávka byla úspěšně odeslána.</div>
      <div class="detail" id="doneDetail"></div>
      <p style="margin:20px 0 0;font-size:14px;color:#555">Zlato Aurelius vás bude kontaktovat.</p>
    </div>
  </div>
</div></main>

<script>
const MODE = 'buy';
let DATA = null;

async function boot() {
  const res = await fetch('/api/pricing');
  DATA = await res.json();
  const sel = document.getElementById('metal');
  sel.innerHTML = DATA.metals.map(m => '<option value="' + m.code + '">' + m.name + '</option>').join('');
  fillPurities();
}

function fillPurities() {
  const code = document.getElementById('metal').value;
  const list = DATA.purities.filter(p => p.metal_code === code);
  const sel = document.getElementById('purity');
  sel.innerHTML = list.map(p => '<option value="' + p.purity + '">' + p.label + '</option>').join('');
}

let timer;
function calc() {
  clearTimeout(timer);
  timer = setTimeout(doCalc, 180);
}

async function doCalc() {
  const weight = document.getElementById('weight').value;
  const errEl = document.getElementById('err');
  const resEl = document.getElementById('result');
  errEl.textContent = '';

  if (!weight || Number(weight) <= 0) {
    resEl.style.display = 'none';
    document.getElementById('ctaBox').style.display = 'none';
    return;
  }

  const res = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      metal: document.getElementById('metal').value,
      purity: document.getElementById('purity').value,
      weight: weight,
      pieces: document.getElementById('pieces').value,
      mode: MODE
    })
  });

  const d = await res.json();
  if (!res.ok) { errEl.textContent = d.error || 'Chyba výpočtu'; resEl.style.display = 'none'; return; }

  document.getElementById('price').textContent = d.price.toLocaleString('cs-CZ') + ' Kč';
  document.getElementById('ctaBox').style.display = 'block';
  document.getElementById('detail').innerHTML =
    row('Kov', d.metal) +
    row('Ryzost', d.purity + ' / ' + d.karat + ' K') +
    row('Celková hmotnost', d.weight.toLocaleString('cs-CZ') + ' g') +
    row('Ryzí kov', d.pureWeight.toLocaleString('cs-CZ') + ' g') +
    row('Cena za gram', d.pricePerGram.toLocaleString('cs-CZ') + ' Kč');
  resEl.style.display = 'block';
}

function row(a, b) { return '<div><span>' + a + '</span><strong>' + b + '</strong></div>'; }

function openForm() {
  document.getElementById('ctaBox').style.display = 'none';
  document.getElementById('formBox').style.display = 'block';
  document.getElementById('cName').focus();
}

async function sendPreorder() {
  const err = document.getElementById('formErr');
  const btn = document.getElementById('sendBtn');
  err.textContent = '';

  if (!document.getElementById('cAgree').checked) {
    err.textContent = 'Potvrďte prosím souhlas se zpracováním údajů.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Odesílám…';

  try {
    const res = await fetch('/api/preorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('cName').value,
        phone: document.getElementById('cPhone').value,
        email: document.getElementById('cEmail').value,
        note: document.getElementById('cNote').value,
        website: document.getElementById('website').value,
        metal: document.getElementById('metal').value,
        purity: document.getElementById('purity').value,
        weight: document.getElementById('weight').value,
        pieces: document.getElementById('pieces').value,
        mode: MODE
      })
    });

    const d = await res.json();
    if (!res.ok) {
      err.textContent = d.error || 'Odeslání se nezdařilo.';
      btn.disabled = false;
      btn.textContent = 'Odeslat poptávku';
      return;
    }

    document.getElementById('formBox').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    document.getElementById('noteCalc').style.display = 'none';
    document.getElementById('doneDetail').innerHTML =
      row('Číslo předobjednávky', d.ref) +
      row('Datum', d.created_at) +
      row('Orientační cena', d.price.toLocaleString('cs-CZ') + ' Kč');
    document.getElementById('doneBox').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    err.textContent = 'Odeslání se nezdařilo. Zkuste to prosím znovu.';
    btn.disabled = false;
    btn.textContent = 'Odeslat poptávku';
  }
}

boot();
</script>
</body>
</html>`;

export const ADMIN_HTML = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Nastavení cen – Zlato Aurelius</title>
<style>${STYLES}</style>
</head>
<body>
<header><div class="wrap"><div class="logo">Zlato Aurelius — Administrace</div></div></header>
<main><div class="wrap">
  <h1>Výkupní ceny</h1>
  <p class="lead">Ceny jsou uvedené za gram při referenční ryzosti. Ostatní ryzosti se dopočítají automaticky.</p>

  <div class="field" id="keyField">
    <label for="adminKey">Administrátorský klíč</label>
    <input id="adminKey" type="password" placeholder="Vložte klíč" autocomplete="current-password">
  </div>

  <table>
    <thead><tr><th>Kov</th><th>Ref. ryzost</th><th>Výkup Kč/g</th></tr></thead>
    <tbody id="rows"></tbody>
  </table>

  <button class="primary" onclick="save()">Uložit ceny</button>
  <div id="msg" class="detail" style="margin-top:18px"></div>
</div></main>

<script>
let DATA = null;

async function boot() {
  const res = await fetch('/api/pricing');
  DATA = await res.json();
  document.getElementById('rows').innerHTML = DATA.metals.map(m =>
    '<tr><td><strong>' + m.name + '</strong></td>' +
    '<td>' + m.ref_purity + '</td>' +
    '<td><input type="number" step="0.01" min="0" id="buy_' + m.code + '" value="' + m.price_buy + '"></td></tr>'
  ).join('');
  const saved = sessionStorage.getItem('adminKey');
  if (saved) document.getElementById('adminKey').value = saved;
}

async function save() {
  const key = document.getElementById('adminKey').value;
  sessionStorage.setItem('adminKey', key);
  const msg = document.getElementById('msg');

  const metals = DATA.metals.map(m => ({
    code: m.code,
    price_buy: document.getElementById('buy_' + m.code).value,
    price_pawn: m.price_pawn
  }));

  const res = await fetch('/api/admin/metals', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ metals })
  });

  const d = await res.json();
  msg.textContent = res.ok ? 'Ceny byly uloženy.' : (d.error || 'Uložení se nezdařilo.');
  msg.style.color = res.ok ? '#006039' : '#a00';
  if (res.ok) boot();
}

boot();
</script>
</body>
</html>`;
