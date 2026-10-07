/**
 * Zlato Aurelius – kalkulačka výkupu kovů
 *
 * Výpočetní logika převzatá z Excelu, viz EXCEL_LOGIC.md
 */

// ---------------------------------------------------------------- VÝPOČTY

/**
 * Cena položky podle vzorce z Excelu:
 *   cena = (referenční_cena / referenční_ryzost) * ryzost * váha
 */
export function calculateItemPrice(refPrice, refPurity, purity, weightGrams) {
  if (!refPurity || refPurity <= 0) return 0;
  if (!weightGrams || weightGrams <= 0) return 0;
  if (!purity || purity <= 0) return 0;
  return (refPrice / refPurity) * purity * weightGrams;
}

/** Hmotnost ryzího kovu v gramech */
export function calculatePureWeight(purity, weightGrams) {
  if (!purity || !weightGrams) return 0;
  return (purity * weightGrams) / 1000;
}

/** Převod ryzosti v promile na karáty */
export function millesimalToKarat(purity) {
  return purity / 41.67;
}

/** Zaokrouhlení výsledku na celé koruny (mezivýpočty zůstávají přesné) */
export function roundPrice(value, step = 1) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

// ---------------------------------------------------------------- DATA

async function loadPricing(db) {
  const metals = await db.prepare(
    'SELECT code, name, ref_purity, price_buy, price_pawn FROM metals ORDER BY sort_order'
  ).all();

  const purities = await db.prepare(
    'SELECT metal_code, purity, label FROM purities ORDER BY metal_code, sort_order'
  ).all();

  const settings = await db.prepare('SELECT key, value FROM settings').all();

  const settingsMap = {};
  for (const row of settings.results) settingsMap[row.key] = row.value;

  return {
    metals: metals.results,
    purities: purities.results,
    settings: settingsMap,
  };
}

// ---------------------------------------------------------------- API

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function isAdmin(request, env) {
  // Primární ochrana: Cloudflare Access (hlavička se objeví po nastavení Access)
  if (request.headers.get('cf-access-authenticated-user-email')) return true;
  // Záložní ochrana do doby, než bude Access nastavený
  const key = request.headers.get('x-admin-key');
  return Boolean(env.ADMIN_KEY) && key === env.ADMIN_KEY;
}

async function handleCalculate(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Neplatný požadavek' }, 400);
  }

  const { metal, purity, weight, pieces, mode } = body;

  // Veškerá validace i výpočet probíhají na serveru.
  // Hodnotám z formuláře se nevěří, ceny se načítají z databáze.
  const pricing = await loadPricing(env.DB);
  const m = pricing.metals.find((x) => x.code === metal);
  if (!m) return json({ error: 'Neznámý kov' }, 400);

  const w = Number(weight);
  const p = Number(purity);
  const n = Math.max(1, Math.floor(Number(pieces) || 1));

  if (!Number.isFinite(w) || w <= 0) return json({ error: 'Zadejte kladnou hmotnost' }, 400);
  if (!Number.isFinite(p) || p <= 0 || p > 1000) return json({ error: 'Neplatná ryzost' }, 400);

  const refPrice = mode === 'pawn' ? m.price_pawn : m.price_buy;
  const totalWeight = w * n;

  const raw = calculateItemPrice(refPrice, m.ref_purity, p, totalWeight);
  const step = Number(pricing.settings.rounding || 1);

  return json({
    metal: m.name,
    mode: mode === 'pawn' ? 'Zástava' : 'Výkup',
    weight: totalWeight,
    purity: p,
    pureWeight: Number(calculatePureWeight(p, totalWeight).toFixed(4)),
    karat: Number(millesimalToKarat(p).toFixed(1)),
    pricePerGram: Number((refPrice / m.ref_purity * p).toFixed(2)),
    priceRaw: Number(raw.toFixed(2)),
    price: roundPrice(raw, step),
  });
}

async function handleAdminSave(request, env) {
  if (!isAdmin(request, env)) return json({ error: 'Nepovolený přístup' }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Neplatný požadavek' }, 400);
  }

  const statements = [];
  for (const m of body.metals || []) {
    const buy = Number(m.price_buy);
    const pawn = Number(m.price_pawn);
    if (!Number.isFinite(buy) || buy < 0) return json({ error: `Neplatná cena u ${m.code}` }, 400);
    if (!Number.isFinite(pawn) || pawn < 0) return json({ error: `Neplatná cena u ${m.code}` }, 400);

    statements.push(
      env.DB.prepare(
        "UPDATE metals SET price_buy = ?, price_pawn = ?, updated_at = datetime('now') WHERE code = ?"
      ).bind(buy, pawn, m.code)
    );
  }

  if (statements.length) await env.DB.batch(statements);
  return json({ ok: true });
}

// ---------------------------------------------------------------- ROUTER

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/pricing') {
        return json(await loadPricing(env.DB));
      }

      if (path === '/api/calculate' && request.method === 'POST') {
        return handleCalculate(request, env);
      }

      if (path === '/api/admin/metals' && request.method === 'POST') {
        return handleAdminSave(request, env);
      }

      if (path === '/admin') {
        return new Response(ADMIN_HTML, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      if (path === '/') {
        return new Response(PUBLIC_HTML, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }

      return new Response('Stránka nenalezena', { status: 404 });
    } catch (err) {
      return json({ error: 'Chyba serveru', detail: String(err) }, 500);
    }
  },
};

// ---------------------------------------------------------------- STYLY

const STYLES = `
  :root {
    --green: #006039;
    --black: #000000;
    --white: #ffffff;
    --grey: #f4f4f2;
    --border: #e2e2de;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: var(--white);
    color: var(--black);
    line-height: 1.55;
  }
  header {
    border-bottom: 1px solid var(--border);
    padding: 28px 24px;
  }
  .wrap { max-width: 720px; margin: 0 auto; }
  .logo {
    font-size: 13px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--green);
  }
  h1 { font-size: 30px; font-weight: 600; margin: 40px 0 8px; letter-spacing: -0.01em; }
  .lead { color: #555; margin: 0 0 36px; }
  main { padding: 0 24px 80px; }
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    color: #333;
  }
  select, input {
    width: 100%;
    padding: 15px 14px;
    font-size: 17px;
    border: 1px solid var(--border);
    border-radius: 2px;
    background: var(--white);
    color: var(--black);
    font-family: inherit;
  }
  select:focus, input:focus {
    outline: none;
    border-color: var(--green);
    box-shadow: 0 0 0 3px rgba(0, 96, 57, 0.12);
  }
  .field { margin-bottom: 22px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .toggle { display: flex; gap: 0; border: 1px solid var(--border); border-radius: 2px; overflow: hidden; }
  .toggle button {
    flex: 1;
    padding: 14px;
    font-size: 15px;
    font-family: inherit;
    border: 0;
    background: var(--white);
    color: #555;
    cursor: pointer;
  }
  .toggle button.active { background: var(--green); color: var(--white); font-weight: 600; }
  .result {
    margin-top: 36px;
    border: 1px solid var(--border);
    border-top: 3px solid var(--green);
    padding: 30px 26px;
    background: var(--grey);
  }
  .price { font-size: 42px; font-weight: 600; color: var(--green); letter-spacing: -0.02em; }
  .detail { margin-top: 18px; font-size: 14px; color: #555; }
  .detail div { display: flex; justify-content: space-between; padding: 7px 0; border-top: 1px solid var(--border); }
  .note { margin-top: 26px; font-size: 13px; color: #666; border-left: 2px solid var(--green); padding-left: 14px; }
  .err { color: #a00; margin-top: 16px; font-size: 14px; }
  button.primary {
    background: var(--green);
    color: var(--white);
    border: 0;
    padding: 16px 30px;
    font-size: 16px;
    font-family: inherit;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--border); font-size: 15px; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
  td input { padding: 10px; font-size: 15px; }
  @media (max-width: 560px) {
    .row { grid-template-columns: 1fr; }
    h1 { font-size: 25px; }
    .price { font-size: 34px; }
  }
`;

// ---------------------------------------------------------------- VEŘEJNÁ STRÁNKA

const PUBLIC_HTML = `<!doctype html>
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
  <p class="lead">Spočítejte si orientační cenu za vaše zlato, stříbro, platinu nebo palladium.</p>

  <div class="field">
    <label>Typ výpočtu</label>
    <div class="toggle">
      <button id="mBuy" class="active" onclick="setMode('buy')">Výkup</button>
      <button id="mPawn" onclick="setMode('pawn')">Zástava</button>
    </div>
  </div>

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

  <p class="note">Jedná se o orientační kalkulaci. Konečná cena bude potvrzena společností Zlato Aurelius.</p>
</div></main>

<script>
let MODE = 'buy';
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

function setMode(m) {
  MODE = m;
  document.getElementById('mBuy').classList.toggle('active', m === 'buy');
  document.getElementById('mPawn').classList.toggle('active', m === 'pawn');
  calc();
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

  if (!weight || Number(weight) <= 0) { resEl.style.display = 'none'; return; }

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
  document.getElementById('detail').innerHTML =
    row('Typ výpočtu', d.mode) +
    row('Kov', d.metal) +
    row('Ryzost', d.purity + ' / ' + d.karat + ' K') +
    row('Celková hmotnost', d.weight.toLocaleString('cs-CZ') + ' g') +
    row('Ryzí kov', d.pureWeight.toLocaleString('cs-CZ') + ' g') +
    row('Cena za gram', d.pricePerGram.toLocaleString('cs-CZ') + ' Kč');
  resEl.style.display = 'block';
}

function row(a, b) { return '<div><span>' + a + '</span><strong>' + b + '</strong></div>'; }
boot();
</script>
</body>
</html>`;

// ---------------------------------------------------------------- ADMIN

const ADMIN_HTML = `<!doctype html>
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
  <h1>Ceny kovů</h1>
  <p class="lead">Ceny jsou uvedené za gram při referenční ryzosti. Ostatní ryzosti se dopočítají automaticky.</p>

  <div class="field" id="keyField">
    <label for="adminKey">Administrátorský klíč</label>
    <input id="adminKey" type="password" placeholder="Vložte klíč" autocomplete="current-password">
  </div>

  <table>
    <thead><tr><th>Kov</th><th>Ref. ryzost</th><th>Výkup Kč/g</th><th>Zástava Kč/g</th></tr></thead>
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
    '<td><input type="number" step="0.01" min="0" id="buy_' + m.code + '" value="' + m.price_buy + '"></td>' +
    '<td><input type="number" step="0.01" min="0" id="pawn_' + m.code + '" value="' + m.price_pawn + '"></td></tr>'
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
    price_pawn: document.getElementById('pawn_' + m.code).value
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
