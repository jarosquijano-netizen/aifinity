/**
 * Get the badge color class for a given category
 * @param {string} category - The category name (can be hierarchical like "Vivienda > Hogar")
 * @returns {string} - The badge CSS class
 */
export const getCategoryColor = (category) => {
  if (!category) return 'badge-info';
  
  const categoryColors = {
    // Vivienda (hierarchical format)
    'Vivienda > Hogar': 'badge-purple',
    'Vivienda > Hipoteca': 'badge-indigo',
    'Vivienda > Alquiler y compra': 'badge-purple',
    'Vivienda > Mantenimiento hogar': 'badge-violet',
    'Vivienda > Otros vivienda': 'badge-purple',
    'Vivienda > Servicio doméstico': 'badge-purple',
    'Vivienda > Alarmas y seguridad': 'badge-slate',
    'Vivienda > Comunidad': 'badge-violet',
    
    // Alimentación (hierarchical format)
    'Alimentación > Supermercado': 'badge-success',
    'Alimentación > Restaurante': 'badge-amber',
    
    // Transporte (hierarchical format)
    'Transporte > Transportes': 'badge-blue',
    'Transporte > Gasolina': 'badge-sky',
    'Transporte > Mantenimiento vehículo': 'badge-blue',
    'Transporte > Alquiler vehículos': 'badge-cyan',
    'Transporte > Parking y peaje': 'badge-sky',
    'Transporte > Compra vehículo': 'badge-indigo',
    
    // Salud (hierarchical format)
    'Salud > Médico': 'badge-red',
    'Salud > Farmacia': 'badge-red',
    'Salud > Óptica y dentista': 'badge-pink',
    'Salud > Otros salud, saber y deporte': 'badge-emerald',
    
    // Seguros (hierarchical format)
    'Seguros > Seguros': 'badge-indigo',
    'Seguros > Seguro salud': 'badge-red',
    'Seguros > Seguro hogar': 'badge-purple',
    'Seguros > Seguro auto': 'badge-blue',
    'Seguros > Otros seguros': 'badge-indigo',
    
    // Servicios (hierarchical format)
    'Servicios > Agua': 'badge-cyan',
    'Servicios > Electricidad': 'badge-yellow',
    'Servicios > Internet': 'badge-blue',
    'Servicios > Móvil': 'badge-blue',
    'Servicios > Televisión': 'badge-purple',
    'Servicios > Cargos bancarios': 'badge-orange',
    'Servicios > Servicios y productos online': 'badge-cyan',
    'Servicios > Otros servicios': 'badge-gray',
    
    // Compras (hierarchical format)
    'Compras > Compras': 'badge-pink',
    'Compras > Otras compras': 'badge-fuchsia',
    'Compras > Ropa': 'badge-pink',
    'Compras > Electrónica': 'badge-indigo',
    
    // Ocio (hierarchical format)
    'Ocio > Entretenimiento': 'badge-cyan',
    'Ocio > Espectáculos': 'badge-purple',
    'Ocio > Vacation': 'badge-blue',
    'Ocio > Otros ocio': 'badge-cyan',
    'Ocio > Loterías': 'badge-amber',
    
    // Educación (hierarchical format)
    'Educación > Estudios': 'badge-teal',
    'Educación > Librería': 'badge-teal',
    
    // Deporte (hierarchical format)
    'Deporte > Deporte': 'badge-lime',
    'Deporte > Material deportivo': 'badge-lime',
    
    // Personal (hierarchical format)
    'Personal > Regalos': 'badge-rose',
    'Personal > Belleza': 'badge-pink',
    'Personal > Niños y mascotas': 'badge-amber',
    
    // Asociaciones (hierarchical format)
    'Asociaciones > Asociaciones': 'badge-violet',
    
    // Organismos (hierarchical format)
    'Organismos > Impuestos': 'badge-slate',
    'Organismos > Seguridad Social': 'badge-slate',
    'Organismos > Ayuntamiento': 'badge-slate',
    'Organismos > Otros organismos': 'badge-gray',
    
    // Profesionales (hierarchical format)
    'Profesionales > Asesores y abogados': 'badge-indigo',
    'Profesionales > Mutuas y licencias': 'badge-slate',
    
    // Finanzas (hierarchical format)
    'Finanzas > Ingresos': 'badge-success',
    'Finanzas > Transferencias': 'badge-info',
    'Finanzas > Ahorro e inversiones': 'badge-emerald',
    'Finanzas > Préstamos': 'badge-orange',
    'Finanzas > Efectivo': 'badge-yellow',
    
    // Otros (hierarchical format)
    'Otros > Otros': 'badge-gray',
    'Otros > Otros gastos': 'badge-gray',
    'Otros > Sin categoría': 'badge-gray',
    
    // Legacy support (non-hierarchical) - kept for backward compatibility
    'Hogar': 'badge-purple',
    'Hipoteca': 'badge-indigo',
    'Alquiler y compra': 'badge-purple',
    'Mantenimiento hogar': 'badge-violet',
    'Otros vivienda': 'badge-purple',
    'Servicio doméstico': 'badge-purple',
    'Alarmas y seguridad': 'badge-slate',
    'Comunidad': 'badge-violet',
    'Supermercado': 'badge-success',
    'Restaurante': 'badge-amber',
    'Transportes': 'badge-blue',
    'Gasolina': 'badge-sky',
    'Mantenimiento vehículo': 'badge-blue',
    'Alquiler vehículos': 'badge-cyan',
    'Parking y peaje': 'badge-sky',
    'Compra vehículo': 'badge-indigo',
    'Médico': 'badge-red',
    'Farmacia': 'badge-red',
    'Óptica y dentista': 'badge-pink',
    'Otros salud, saber y deporte': 'badge-emerald',
    'Seguros': 'badge-indigo',
    'Seguro salud': 'badge-red',
    'Seguro hogar': 'badge-purple',
    'Seguro auto': 'badge-blue',
    'Otros seguros': 'badge-indigo',
    'Agua': 'badge-cyan',
    'Electricidad': 'badge-yellow',
    'Internet': 'badge-blue',
    'Móvil': 'badge-blue',
    'Televisión': 'badge-purple',
    'Cargos bancarios': 'badge-orange',
    'Servicios y productos online': 'badge-cyan',
    'Otros servicios': 'badge-gray',
    'Compras': 'badge-pink',
    'Otras compras': 'badge-fuchsia',
    'Ropa': 'badge-pink',
    'Electrónica': 'badge-indigo',
    'Entretenimiento': 'badge-cyan',
    'Espectáculos': 'badge-purple',
    'Vacation': 'badge-blue',
    'Otros ocio': 'badge-cyan',
    'Loterías': 'badge-amber',
    'Estudios': 'badge-teal',
    'Librería': 'badge-teal',
    'Deporte': 'badge-lime',
    'Material deportivo': 'badge-lime',
    'Regalos': 'badge-rose',
    'Belleza': 'badge-pink',
    'Niños y mascotas': 'badge-amber',
    'Asociaciones': 'badge-violet',
    'Impuestos': 'badge-slate',
    'Seguridad Social': 'badge-slate',
    'Ayuntamiento': 'badge-slate',
    'Otros organismos': 'badge-gray',
    'Asesores y abogados': 'badge-indigo',
    'Mutuas y licencias': 'badge-slate',
    'Ingresos': 'badge-success',
    'Transferencias': 'badge-info',
    'Ahorro e inversiones': 'badge-emerald',
    'Préstamos': 'badge-orange',
    'Efectivo': 'badge-yellow',
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

