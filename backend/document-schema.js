import pool from './config/database.js';

async function documentSchema() {
  try {
    console.log('\n📊 AIFINITY.APP - COMPLETE DATABASE SCHEMA\n');
    console.log('='.repeat(80));

    // Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`\n✅ Total Tables: ${tablesResult.rows.length}\n`);

    // For each table, get structure
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      console.log(`\n📋 TABLE: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(80));

      // Get columns
      const columnsResult = await pool.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [tableName]);

      columnsResult.rows.forEach(col => {
        let type = col.data_type;
        if (col.character_maximum_length) {
          type += `(${col.character_maximum_length})`;
        }
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
        
        console.log(`   ${col.column_name.padEnd(30)} ${type.padEnd(20)} ${nullable.padEnd(10)} ${defaultVal}`);
      });

      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`\n   📊 Current rows: ${countResult.rows[0].count}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Schema documentation complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

documentSchema();

