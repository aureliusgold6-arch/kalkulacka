/**
 * Zlato Aurelius – kalkulačka výkupu kovů
 *
 * Výpočetní logika převzatá z Excelu, viz EXCEL_LOGIC.md
 */

import { EmailMessage } from 'cloudflare:email';
import { PUBLIC_HTML, ADMIN_HTML } from './pages.js';
import {
  calculateItemPrice,
  calculatePureWeight,
  millesimalToKarat,
  roundPrice,
} from './calculations.js';

// Adresa odesílatele musí patřit doméně onboardované v Email Sending.
const MAIL_FROM = 'noreply@aurry.cz';
const MAIL_FROM_NAME = 'Zlato Aurelius';
const MAIL_TO = 'Info@aurry.cz';

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
  if (request.headers.get('cf-access-authenticated-user-email')) return true;
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

// ---------------------------------------------------------------- E-MAIL

function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64Wrapped(str) {
  return (b64(str).match(/.{1,76}/g) || []).join('\r\n');
}

function encodeHeader(str) {
  return /^[\x20-\x7E]*$/.test(str) ? str : `=?UTF-8?B?${b64(str)}?=`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailBody(p) {
  const row = (k, v) =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #e2e2de;color:#555;font-size:14px">${k}</td>` +
    `<td style="padding:9px 0;border-bottom:1px solid #e2e2de;text-align:right;font-weight:600;font-size:14px">${escapeHtml(String(v))}</td></tr>`;

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:Helvetica,Arial,sans-serif;color:#000">
<div style="max-width:560px;margin:0 auto">
  <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#006039;font-weight:bold">Zlato Aurelius</div>
  <h1 style="font-size:22px;margin:16px 0 4px">Nová předobjednávka</h1>
  <div style="color:#666;font-size:14px;margin-bottom:24px">${escapeHtml(p.ref)} &middot; ${escapeHtml(p.created_at)}</div>

  <table style="width:100%;border-collapse:collapse;border-top:3px solid #006039">
    ${row('Jméno', p.name)}
    ${row('Telefon', p.phone)}
    ${row('E-mail', p.email || '—')}
    ${row('Typ', p.mode === 'pawn' ? 'Zástava' : 'Výkup')}
    ${row('Kov', p.metal_name)}
    ${row('Ryzost', p.purity)}
    ${row('Hmotnost', p.weight + ' g')}
    ${row('Počet kusů', p.pieces)}
    ${row('Cena za gram', p.price_per_gram + ' Kč')}
  </table>

  <div style="margin-top:22px;padding:18px;background:#f4f4f2;border-left:3px solid #006039">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#555">Orientační cena</div>
    <div style="font-size:30px;font-weight:bold;color:#006039;margin-top:4px">${escapeHtml(String(p.price))} Kč</div>
  </div>

  ${p.note ? `<div style="margin-top:22px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin-bottom:6px">Poznámka</div><div style="font-size:14px">${escapeHtml(p.note)}</div></div>` : ''}

  <div style="margin-top:34px;padding-top:16px;border-top:1px solid #e2e2de;color:#777;font-size:12px">
    Jedná se o zákaznickou předobjednávku vytvořenou prostřednictvím webové aplikace Zlato Aurelius.
  </div>
</div>
</body></html>`;
}

async function sendPreorderEmail(env, p) {
  if (!env.EMAIL) throw new Error('Binding EMAIL není nastavený');

  const subject = `Nová předobjednávka – Zlato Aurelius – ${p.metal_name} ${p.ref}`;
  const headers = [
    `From: ${encodeHeader(MAIL_FROM_NAME)} <${MAIL_FROM}>`,
    `To: ${MAIL_TO}`,
    p.email ? `Reply-To: ${p.email}` : null,
    `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${p.id}@aurry.cz>`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);

  const raw = headers.join('\r\n') + '\r\n\r\n' + b64Wrapped(buildEmailBody(p));
  await env.EMAIL.send(new EmailMessage(MAIL_FROM, MAIL_TO, raw));
}

// ---------------------------------------------------------------- PŘEDOBJEDNÁVKA

function makeRef() {
  const d = new Date();
  const stamp = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `PO-${stamp}-${rnd}`;
}

async function handlePreorder(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Neplatný požadavek' }, 400);
  }

  if (body.website) return json({ error: 'Odeslání se nezdařilo' }, 400);

  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').trim();
  const email = String(body.email || '').trim();
  const note = String(body.note || '').trim().slice(0, 1000);

  if (name.length < 2) return json({ error: 'Vyplňte jméno a příjmení' }, 400);
  if (phone.replace(/\D/g, '').length < 9) return json({ error: 'Vyplňte platné telefonní číslo' }, 400);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Neplatný e-mail' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '';

  if (ip) {
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM preorders WHERE client_ip = ? AND created_at > datetime('now','-1 hour')"
    ).bind(ip).first();
    if (recent && recent.n >= 5) {
      return json({ error: 'Příliš mnoho požadavků. Zkuste to prosím později.' }, 429);
    }
  }

  const pricing = await loadPricing(env.DB);
  const m = pricing.metals.find((x) => x.code === body.metal);
  if (!m) return json({ error: 'Neznámý kov' }, 400);

  const w = Number(body.weight);
  const p = Number(body.purity);
  const n = Math.max(1, Math.floor(Number(body.pieces) || 1));
  if (!Number.isFinite(w) || w <= 0) return json({ error: 'Neplatná hmotnost' }, 400);
  if (!Number.isFinite(p) || p <= 0 || p > 1000) return json({ error: 'Neplatná ryzost' }, 400);

  const mode = body.mode === 'pawn' ? 'pawn' : 'buy';
  const refPrice = mode === 'pawn' ? m.price_pawn : m.price_buy;
  const totalWeight = w * n;
  const raw = calculateItemPrice(refPrice, m.ref_purity, p, totalWeight);
  const price = roundPrice(raw, Number(pricing.settings.rounding || 1));

  const record = {
    id: crypto.randomUUID(),
    ref: makeRef(),
    created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    name, phone, email, note,
    metal_code: m.code,
    metal_name: m.name,
    purity: p,
    weight: totalWeight,
    pieces: n,
    mode,
    price,
    price_per_gram: Number((refPrice / m.ref_purity * p).toFixed(2)),
  };

  await env.DB.prepare(
    `INSERT INTO preorders (id, ref, name, phone, email, note, metal_code, metal_name,
      purity, weight, pieces, mode, price, price_per_gram, client_ip)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    record.id, record.ref, record.name, record.phone, record.email || null,
    record.note || null, record.metal_code, record.metal_name, record.purity,
    record.weight, record.pieces, record.mode, record.price, record.price_per_gram, ip
  ).run();

  let emailStatus = 'SENT';
  let emailError = null;
  try {
    await sendPreorderEmail(env, record);
  } catch (err) {
    emailStatus = 'FAILED';
    emailError = String(err).slice(0, 500);
  }

  await env.DB.prepare(
    'UPDATE preorders SET email_status = ?, email_error = ? WHERE id = ?'
  ).bind(emailStatus, emailError, record.id).run();

  return json({
    ok: true,
    ref: record.ref,
    price: record.price,
    created_at: record.created_at,
  });
}

async function handlePreorderList(request, env) {
  if (!isAdmin(request, env)) return json({ error: 'Nepovolený přístup' }, 403);
  const rows = await env.DB.prepare(
    `SELECT ref, created_at, name, phone, email, metal_name, purity, weight,
            mode, price, status, email_status
     FROM preorders ORDER BY created_at DESC LIMIT 100`
  ).all();
  return json({ preorders: rows.results });
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

      if (path === '/api/preorder' && request.method === 'POST') {
        return handlePreorder(request, env);
      }

      if (path === '/api/admin/preorders') {
        return handlePreorderList(request, env);
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
