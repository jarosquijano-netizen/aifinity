const NOISE_WORDS = new Set([
  'compra', 'pago', 'tarjeta', 'ref', 'op', 'operacion', 'operación',
  'transferencia', 'ingreso', 'cargo', 'abono', 'concepto', 'movimiento',
  'con', 'de', 'del', 'la', 'el', 'en', 'para', 'por', 'sepa', 'bizum',
  'euro', 'eur', 'importe', 'fecha', 'valor',
  'recibo', 'domiciliacion', 'domiciliación', 'traspaso', 'traspasos',
  'oficina', 'sucursal', 'automatico', 'automático',
]);

export function normalizeDescription(description) {
  if (!description) return '';
  return String(description).toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 200);
}

export function extractCore(description) {
  if (!description) return '';
  const words = String(description)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !NOISE_WORDS.has(w));
  return words.slice(0, 4).join(' ').trim();
}

export async function findLearnedCategory(client, userId, description) {
  if (!description) return null;
  const normalized = normalizeDescription(description);
  const core = extractCore(description);

  const exact = await client.query(
    `SELECT category, usage_count
       FROM transaction_category_mappings
      WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
        AND description_pattern = $2
      ORDER BY usage_count DESC, last_used DESC
      LIMIT 1`,
    [userId, normalized]
  );
  if (exact.rows.length > 0) return { category: exact.rows[0].category, matchType: 'exact' };

  if (core) {
    const coreExact = await client.query(
      `SELECT category, SUM(usage_count) AS uc
         FROM transaction_category_mappings
        WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
          AND description_core = $2
        GROUP BY category
        ORDER BY uc DESC
        LIMIT 1`,
      [userId, core]
    );
    if (coreExact.rows.length > 0) return { category: coreExact.rows[0].category, matchType: 'core' };

    const coreLike = await client.query(
      `SELECT category, SUM(usage_count) AS uc
         FROM transaction_category_mappings
        WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
          AND description_core IS NOT NULL
          AND (description_core LIKE $2 || '%' OR $2 LIKE description_core || '%')
        GROUP BY category
        ORDER BY uc DESC
        LIMIT 1`,
      [userId, core]
    );
    if (coreLike.rows.length > 0) return { category: coreLike.rows[0].category, matchType: 'core-like' };
  }

  const like = await client.query(
    `SELECT category, usage_count,
            CASE
              WHEN description_pattern LIKE $2 || '%' THEN 1
              WHEN $2 LIKE description_pattern || '%' THEN 2
              WHEN description_pattern LIKE '%' || $2 || '%' THEN 3
              ELSE 4
            END AS match_type
       FROM transaction_category_mappings
      WHERE (user_id = $1 OR (user_id IS NULL AND $1 IS NULL))
        AND (
          description_pattern LIKE $2 || '%' OR
          $2 LIKE description_pattern || '%' OR
          description_pattern LIKE '%' || $2 || '%'
        )
      ORDER BY match_type ASC, usage_count DESC, last_used DESC
      LIMIT 1`,
    [userId, normalized]
  );
  if (like.rows.length > 0) return { category: like.rows[0].category, matchType: 'pattern-like' };

  return null;
}

export async function saveLearnedCategory(client, userId, description, category) {
  if (!description || !category) return;
  const normalized = normalizeDescription(description);
  const core = extractCore(description);

  await client.query(
    `INSERT INTO transaction_category_mappings
       (user_id, description_pattern, description_core, category, usage_count, last_used)
     VALUES ($1, $2, $3, $4, 1, NOW())
     ON CONFLICT (user_id, description_pattern)
     DO UPDATE SET
       category = EXCLUDED.category,
       description_core = EXCLUDED.description_core,
       usage_count = transaction_category_mappings.usage_count + 1,
       last_used = NOW()`,
    [userId, normalized, core || null, category]
  );
}
