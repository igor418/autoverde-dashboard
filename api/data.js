import { Pool } from 'pg';

const ALLOWED_KEYS = new Set([
  'financeiro-diario',
  'financeiro-mensal',
  'financeiro-ano-anterior',
]);

let pool;
function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL;
    if (!connectionString) {
      throw new Error(
        'Nenhuma variável de ambiente de conexão encontrada (POSTGRES_URL / DATABASE_URL).'
      );
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureTable() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS dashboard_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export default async function handler(req, res) {
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
      const { rows } = await getPool().query(
        'SELECT value FROM dashboard_kv WHERE key = $1',
        [key]
      );
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
      await getPool().query(
        `INSERT INTO dashboard_kv (key, value, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (key)
         DO UPDATE SET value = $2::jsonb, updated_at = now();`,
        [key, JSON.stringify(value)]
      );
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'delete') {
      await getPool().query('DELETE FROM dashboard_kv WHERE key = $1', [key]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Ação inválida. Use get, set ou delete.' });
  } catch (err) {
    console.error('Erro na API /api/data:', err);
    res.status(500).json({ error: 'Erro interno ao acessar o banco de dados.' });
  }
}
