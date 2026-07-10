import pool from '../config/database.js';

const runMigration = async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Adding description_core column to transaction_category_mappings...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_category_mappings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        description_pattern TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, description_pattern)
      )
    `);

    await client.query(`
      ALTER TABLE transaction_category_mappings
        ADD COLUMN IF NOT EXISTS description_core TEXT
    `);
    console.log('✅ description_core column added');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tcm_user_core
        ON transaction_category_mappings(user_id, description_core)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tcm_user_pattern
        ON transaction_category_mappings(user_id, description_pattern)
    `);
    console.log('✅ Indexes ensured');

    console.log('🔄 Backfilling description_core for existing rows...');
    const { rows } = await client.query(
      `SELECT id, description_pattern FROM transaction_category_mappings WHERE description_core IS NULL`
    );

    const extractCore = (desc) => {
      if (!desc) return '';
      const noise = new Set([
        'compra', 'pago', 'tarjeta', 'ref', 'op', 'operacion', 'operación',
        'transferencia', 'ingreso', 'cargo', 'abono', 'concepto', 'movimiento',
        'con', 'de', 'del', 'la', 'el', 'en', 'para', 'por', 'sepa', 'bizum',
        'euro', 'eur', 'importe', 'fecha', 'valor', 'nomina', 'nómina',
        'recibo', 'domiciliacion', 'domiciliación', 'traspaso', 'traspasos',
        'oficina', 'sucursal', 'automatico', 'automático',
      ]);
      const words = String(desc)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\d+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !noise.has(w));
      return words.slice(0, 4).join(' ').trim();
    };

    let updated = 0;
    for (const row of rows) {
      const core = extractCore(row.description_pattern);
      if (core) {
        await client.query(
          `UPDATE transaction_category_mappings SET description_core = $1 WHERE id = $2`,
          [core, row.id]
        );
        updated += 1;
      }
    }
    console.log(`✅ Backfilled ${updated} rows`);

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration().catch(console.error);
