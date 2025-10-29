import pool from '../config/database.js';

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding categories and budgets tables...');
    
    // Create categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        budget_amount DECIMAL(12, 2) DEFAULT 0,
        color VARCHAR(7) DEFAULT '#6d4c41',
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      );
    `);
    console.log('✅ Categories table created');
    
    // Insert default categories with budgets
    const defaultCategories = [
      { name: 'Préstamos', budget: 629 },
      { name: 'Compra vehículo', budget: 734 },
      { name: 'Estudios', budget: 750 },
      { name: 'Servicio doméstico', budget: 550 },
      { name: 'Supermercado', budget: 600 },
      { name: 'Comunidad', budget: 120 },
      { name: 'Belleza', budget: 100 },
      { name: 'Deporte', budget: 176 },
      { name: 'Médico', budget: 50 },
      { name: 'Óptica y dentista', budget: 0 },
      { name: 'Seguro auto', budget: 0 },
      { name: 'Farmacia', budget: 107 },
      { name: 'Seguridad Social', budget: 0 },
      { name: 'Ayuntamiento', budget: 0 },
      { name: 'Espectáculos', budget: 0 },
      { name: 'Cargos bancarios', budget: 0 },
      { name: 'Alquiler vehículos', budget: 0 },
      { name: 'Transportes', budget: 25 },
      { name: 'Hipoteca', budget: 973 },
      { name: 'Hotel', budget: 0 },
      { name: 'Seguro hogar', budget: 0 },
      { name: 'Internet', budget: 50 },
      { name: 'Alquiler y compra', budget: 0 },
      { name: 'Otros organismos', budget: 0 },
      { name: 'Otros ocio', budget: 35 },
      { name: 'Otros seguros', budget: 0 },
      { name: 'Otros salud, saber y deporte', budget: 155 },
      { name: 'Asesores y abogados', budget: 0 },
      { name: 'Multas y licencias', budget: 0 },
      { name: 'Loterías', budget: 0 },
      { name: 'Librería', budget: 0 },
      { name: 'Material deportivo', budget: 25 },
      { name: 'Alarmas y seguridad', budget: 40 },
      { name: 'Agua', budget: 83 },
      { name: 'Efectivo', budget: 196 },
      { name: 'Electrónica', budget: 100 },
      { name: 'Electricidad', budget: 100 },
      { name: 'Mantenimiento hogar', budget: 50 },
      { name: 'Móvil', budget: 31 },
      { name: 'Mantenimiento vehículo', budget: 20 },
      { name: 'Parking y peaje', budget: 50 },
      { name: 'Otros gastos', budget: 200 },
      { name: 'Transferencias', budget: 0 },
      { name: 'Otras compras', budget: 20 },
      { name: 'Otros servicios', budget: 300 },
      { name: 'Otros vivienda', budget: 0 },
      { name: 'Regalos', budget: 20 },
      { name: 'Niños y mascotas', budget: 0 },
      { name: 'Hogar', budget: 50 },
      { name: 'Ropa', budget: 100 },
      { name: 'Seguro salud', budget: 57 },
      { name: 'Restaurante', budget: 150 },
      { name: 'Impuestos', budget: 21 },
      { name: 'Gasolina', budget: 120 },
      { name: 'Servicios y productos online', budget: 30 },
      { name: 'Asociaciones', budget: 30 },
      { name: 'Televisión', budget: 45 }
    ];
    
    for (const category of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, budget_amount)
         VALUES (NULL, $1, $2)
         ON CONFLICT (user_id, name) DO NOTHING`,
        [category.name, category.budget]
      );
    }
    console.log('✅ Default categories inserted');
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    `);
    console.log('✅ Indexes created');
    
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







