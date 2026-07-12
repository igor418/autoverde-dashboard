// api/data.js
// API serverless da Vercel — substitui o window.storage do artifact do Claude.
// Rotas (todas via POST no mesmo endpoint /api/data, com "action" no corpo):
//   { action: "get",    key: "financeiro-diario" }
//   { action: "set",    key: "financeiro-diario", value: {...} }
//   { action: "delete", key: "financeiro-diario" }
//
// Usa o Postgres conectado ao projeto na Vercel (variável de ambiente POSTGRES_URL,
// criada automaticamente quando você conecta um banco Postgres/Neon ao projeto).

import { sql } from '@vercel/postgres';

const ALLOWED_KEYS = new Set([
  'financeiro-diario',
  'financeiro-mensal',
  'financeiro-ano-anterior',
]);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
}

export default async function handler(req, res) {
  // CORS básico — ajuste allowed origin se quiser restringir depois
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    await ensureTable();

    const { action, key, value } = req.body || {};

    if (!key || !ALLOWED_KEYS.has(key)) {
      res.status(400).json({ error: 'Chave inválida ou não permitida.' });
      return;
    }

    if (action === 'get') {
      const { rows } = await sql`SELECT value FROM dashboard_kv WHERE key = ${key}`;
      if (rows.length === 0) {
        res.status(200).json({ value: null });
        return;
      }
      res.status(200).json({ value: rows[0].value });
      return;
    }

    if (action === 'set') {
      if (value === undefined) {
        res.status(400).json({ error: 'Campo "value" é obrigatório para action=set.' });
        return;
      }
      await sql`
        INSERT INTO dashboard_kv (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
        ON CONFLICT (key)
        DO UPDATE SET value = ${JSON.stringify(value)}::jsonb, updated_at = now();
      `;
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'delete') {
      await sql`DELETE FROM dashboard_kv WHERE key = ${key}`;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Ação inválida. Use get, set ou delete.' });
  } catch (err) {
    console.error('Erro na API /api/data:', err);
    res.status(500).json({ error: 'Erro interno ao acessar o banco de dados.' });
  }
}
