/**
 * Get the badge color class for a given category
 * @param {string} category - The category name (can be hierarchical like "Vivienda > Hogar")
 * @returns {string} - The badge CSS class
 */
export const getCategoryColor = (category) => {
  if (!category) return 'badge-info';
  
  const categoryColors = {
    // Vivienda y hogar
    'Hogar': 'badge-purple',
    'Hipoteca': 'badge-indigo',
    'Alquiler y compra': 'badge-purple',
    'Mantenimiento hogar': 'badge-violet',
    'Otros vivienda': 'badge-purple',
    'Servicio doméstico': 'badge-purple',
    'Alarmas y seguridad': 'badge-slate',
    
    // Alimentación
    'Supermercado': 'badge-success',
    'Restaurante': 'badge-amber',
    
    // Transporte
    'Transportes': 'badge-blue',
    'Gasolina': 'badge-sky',
    'Mantenimiento vehículo': 'badge-blue',
    'Alquiler vehículos': 'badge-cyan',
    'Parking y peaje': 'badge-sky',
    'Compra vehículo': 'badge-indigo',
    
    // Salud
    'Médico': 'badge-red',
    'Farmacia': 'badge-red',
    'Óptica y dentista': 'badge-pink',
    'Otros salud, saber y deporte': 'badge-emerald',
    
    // Seguros
    'Seguros': 'badge-indigo',
    'Seguro salud': 'badge-red',
    'Seguro hogar': 'badge-purple',
    'Seguro auto': 'badge-blue',
    'Otros seguros': 'badge-indigo',
    
    // Servicios y utilidades
    'Agua': 'badge-cyan',
    'Electricidad': 'badge-yellow',
    'Internet': 'badge-blue',
    'Móvil': 'badge-blue',
    'Televisión': 'badge-purple',
    
    // Servicios y cargos
    'Cargos bancarios': 'badge-orange',
    'Servicios y productos online': 'badge-cyan',
    'Otros servicios': 'badge-gray',
    
    // Compras
    'Compras': 'badge-pink',
    'Otras compras': 'badge-fuchsia',
    'Ropa': 'badge-pink',
    'Electrónica': 'badge-indigo',
    
    // Ocio y entretenimiento
    'Entretenimiento': 'badge-cyan',
    'Espectáculos': 'badge-purple',
    'Vacation': 'badge-blue',
    'Ocio > Vacation': 'badge-blue',
    'Otros ocio': 'badge-cyan',
    'Loterías': 'badge-amber',
    
    // Educación y cultura
    'Estudios': 'badge-teal',
    'Librería': 'badge-teal',
    
    // Deporte
    'Deporte': 'badge-lime',
    'Material deportivo': 'badge-lime',
    
    // Familia y personal
    'Regalos': 'badge-rose',
    'Belleza': 'badge-pink',
    'Niños y mascotas': 'badge-amber',
    
    // Comunidad y asociaciones
    'Comunidad': 'badge-violet',
    'Asociaciones': 'badge-violet',
    
    // Organismos oficiales
    'Impuestos': 'badge-slate',
    'Seguridad Social': 'badge-slate',
    'Ayuntamiento': 'badge-slate',
    'Otros organismos': 'badge-gray',
    
    // Profesionales
    'Asesores y abogados': 'badge-indigo',
    'Mutuas y licencias': 'badge-slate',
    
    // Finanzas
    'Ingresos': 'badge-success', // Legacy support
    'Finanzas > Ingresos': 'badge-success',
    'Transferencias': 'badge-info', // Legacy support
    'Finanzas > Transferencias': 'badge-info',
    'Ahorro e inversiones': 'badge-emerald', // Legacy support
    'Finanzas > Ahorro e inversiones': 'badge-emerald',
    'Préstamos': 'badge-orange', // Legacy support
    'Finanzas > Préstamos': 'badge-orange',
    'Efectivo': 'badge-yellow', // Legacy support
    'Finanzas > Efectivo': 'badge-yellow',
    
    // Otros
    'Otros': 'badge-gray',
    'Otros gastos': 'badge-gray',
    'Sin categoría': 'badge-gray',
  };
  
  // First, try exact match
  if (categoryColors[category]) {
    return categoryColors[category];
  }
  
  // If hierarchical (e.g., "Vivienda > Hogar"), try matching the subcategory ("Hogar")
  if (category.includes(' > ')) {
    const subcategory = category.split(' > ')[1];
    if (categoryColors[subcategory]) {
      return categoryColors[subcategory];
    }
  }
  
  // Default fallback
  return 'badge-info';
};

