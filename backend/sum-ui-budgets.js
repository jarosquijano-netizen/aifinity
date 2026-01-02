// Manual sum of all budgets shown in UI (from user's list)
const budgets = {
  'Alimentación > Restaurante': 150,
  'Alimentación > Supermercado': 600,
  'Asociaciones > Asociaciones': 30,
  'Compras > Compras': 200,
  'Compras > Electrónica': 100,
  'Compras > Otras compras': 100,
  'Compras > Ropa': 150,
  'Deporte > Deporte': 176,
  'Devolver': 0,
  'Educación > Estudios': 750,
  'Educación > Librería': 20,
  'Finanzas > Ahorro e inversiones': 0,
  'Finanzas > Efectivo': 200,
  'Finanzas > Préstamos': 650,
  'Finanzas > Transferencias': 0,
  'Fraccionar': 0,
  'Ocio > Entretenimiento': 20,
  'Ocio > Espectáculos': 20,
  'Ocio > Vacation': 0,
  'Organismos > Impuestos': 30,
  'Otros > Otros': 100,
  'Otros > Otros gastos': 200,
  'Personal > Belleza': 100,
  'Personal > Niños y mascotas': 50,
  'Personal > Regalos': 20,
  'Salud > Farmacia': 107,
  'Salud > Médico': 50,
  'Seguros > Seguro salud': 57,
  'Servicios > Cargos bancarios': 15,
  'Servicios > Electricidad': 100,
  'Servicios > Móvil': 50,
  'Servicios > Otros servicios': 300,
  'Servicios > Servicios y productos online': 30,
  'Servicios > Televisión': 45,
  'Transporte > Compra vehículo': 734.4,
  'Transporte > Gasolina': 120,
  'Transporte > Mantenimiento vehículo': 20,
  'Transporte > Parking y peaje': 50,
  'Transporte > Transportes': 25,
  'Vivienda > Alarmas y seguridad': 40,
  'Vivienda > Comunidad': 120,
  'Vivienda > Hogar': 50,
  'Vivienda > Mantenimiento hogar': 50,
  'Vivienda > Servicio doméstico': 570,
};

const total = Object.values(budgets).reduce((sum, val) => sum + val, 0);
console.log(`Total from UI budgets: €${total.toFixed(2)}`);
console.log(`Expected: €6,199.40`);
console.log(`Difference: €${(total - 6199.40).toFixed(2)}`);

// Check which categories are missing from database
console.log('\nCategories in UI:', Object.keys(budgets).length);







