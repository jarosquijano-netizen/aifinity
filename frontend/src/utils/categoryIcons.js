import { 
  Home, 
  ShoppingCart, 
  Car, 
  Heart, 
  Shield, 
  CreditCard, 
  Zap, 
  ShoppingBag, 
  Package,
  Film,
  Utensils,
  GraduationCap,
  TrendingUp,
  ArrowLeftRight,
  PiggyBank,
  FileText,
  HelpCircle,
  Boxes,
  RefreshCw,
  Smartphone,
  Globe,
  Users,
  Dumbbell,
  Gift,
  ParkingCircle,
  Activity,
  Coins,
  Landmark,
  BookOpen,
  Plus,
  Truck,
  Sparkles,
  Store,
  Shirt,
  Droplet,
  Lightbulb,
  Wifi,
  Tv,
  Fuel,
  Wrench,
  Plane as VacationIcon,
  Ticket,
  Baby,
  Building,
  Scale,
  FileCheck,
  Music,
  Laptop,
  ShieldCheck,
  Briefcase,
  DollarSign,
  Plane,
  Book
} from 'lucide-react';

/**
 * Get the icon component for a given category
 * @param {string} category - The category name (can be hierarchical like "Vivienda > Hogar")
 * @returns {Component} - The Lucide icon component
 */
export const getCategoryIcon = (category) => {
  if (!category) return HelpCircle;
  
  const categoryIcons = {
    // Vivienda y hogar (hierarchical format)
    'Vivienda > Hogar': Home,
    'Vivienda > Hipoteca': Building,
    'Vivienda > Alquiler y compra': Home,
    'Vivienda > Mantenimiento hogar': Wrench,
    'Vivienda > Otros vivienda': Home,
    'Vivienda > Servicio doméstico': Home,
    'Vivienda > Alarmas y seguridad': ShieldCheck,
    'Vivienda > Comunidad': Users,
    
    // Alimentación (hierarchical format)
    'Alimentación > Supermercado': Store,
    'Alimentación > Restaurante': Utensils,
    
    // Transporte (hierarchical format)
    'Transporte > Transportes': Car,
    'Transporte > Gasolina': Fuel,
    'Transporte > Mantenimiento vehículo': Wrench,
    'Transporte > Alquiler vehículos': Car,
    'Transporte > Parking y peaje': ParkingCircle,
    'Transporte > Compra vehículo': Truck,
    
    // Salud (hierarchical format)
    'Salud > Médico': Heart,
    'Salud > Farmacia': Plus,
    'Salud > Óptica y dentista': Heart,
    'Salud > Otros salud, saber y deporte': Activity,
    
    // Seguros (hierarchical format)
    'Seguros > Seguros': Shield,
    'Seguros > Seguro salud': Shield,
    'Seguros > Seguro hogar': Shield,
    'Seguros > Seguro auto': Shield,
    'Seguros > Otros seguros': Shield,
    
    // Servicios (hierarchical format)
    'Servicios > Agua': Droplet,
    'Servicios > Electricidad': Lightbulb,
    'Servicios > Internet': Wifi,
    'Servicios > Móvil': Smartphone,
    'Servicios > Televisión': Tv,
    'Servicios > Cargos bancarios': CreditCard,
    'Servicios > Servicios y productos online': Globe,
    'Servicios > Otros servicios': Boxes,
    
    // Compras (hierarchical format)
    'Compras > Compras': ShoppingBag,
    'Compras > Otras compras': Package,
    'Compras > Ropa': Shirt,
    'Compras > Electrónica': Laptop,
    
    // Ocio (hierarchical format)
    'Ocio > Entretenimiento': Film,
    'Ocio > Espectáculos': Ticket,
    'Ocio > Vacation': VacationIcon,
    'Ocio > Otros ocio': Music,
    'Ocio > Loterías': DollarSign,
    
    // Educación (hierarchical format)
    'Educación > Estudios': BookOpen,
    'Educación > Librería': Book,
    
    // Deporte (hierarchical format)
    'Deporte > Deporte': Dumbbell,
    'Deporte > Material deportivo': Dumbbell,
    
    // Personal (hierarchical format)
    'Personal > Regalos': Gift,
    'Personal > Belleza': Sparkles,
    'Personal > Niños y mascotas': Baby,
    
    // Asociaciones (hierarchical format)
    'Asociaciones > Asociaciones': Users,
    
    // Organismos (hierarchical format)
    'Organismos > Impuestos': Landmark,
    'Organismos > Seguridad Social': Building,
    'Organismos > Ayuntamiento': Building,
    'Organismos > Otros organismos': Building,
    
    // Profesionales (hierarchical format)
    'Profesionales > Asesores y abogados': Briefcase,
    'Profesionales > Mutuas y licencias': FileCheck,
    
    // Finanzas (hierarchical format)
    'Finanzas > Ingresos': TrendingUp,
    'Finanzas > Transferencias': ArrowLeftRight,
    'Finanzas > Ahorro e inversiones': PiggyBank,
    'Finanzas > Préstamos': FileText,
    'Finanzas > Efectivo': Coins,
    
    // Otros (hierarchical format)
    'Otros > Otros': Boxes,
    'Otros > Otros gastos': Boxes,
    'Otros > Sin categoría': HelpCircle,
    
    // Legacy support (non-hierarchical) - kept for backward compatibility
    'Hogar': Home,
    'Hipoteca': Building,
    'Alquiler y compra': Home,
    'Mantenimiento hogar': Wrench,
    'Otros vivienda': Home,
    'Servicio doméstico': Home,
    'Alarmas y seguridad': ShieldCheck,
    'Comunidad': Users,
    'Supermercado': Store,
    'Restaurante': Utensils,
    'Transportes': Car,
    'Gasolina': Fuel,
    'Mantenimiento vehículo': Wrench,
    'Alquiler vehículos': Car,
    'Parking y peaje': ParkingCircle,
    'Compra vehículo': Truck,
    'Médico': Heart,
    'Farmacia': Plus,
    'Óptica y dentista': Heart,
    'Otros salud, saber y deporte': Activity,
    'Seguros': Shield,
    'Seguro salud': Shield,
    'Seguro hogar': Shield,
    'Seguro auto': Shield,
    'Otros seguros': Shield,
    'Agua': Droplet,
    'Electricidad': Lightbulb,
    'Internet': Wifi,
    'Móvil': Smartphone,
    'Televisión': Tv,
    'Cargos bancarios': CreditCard,
    'Servicios y productos online': Globe,
    'Otros servicios': Boxes,
    'Compras': ShoppingBag,
    'Otras compras': Package,
    'Ropa': Shirt,
    'Electrónica': Laptop,
    'Entretenimiento': Film,
    'Espectáculos': Ticket,
    'Vacation': VacationIcon,
    'Otros ocio': Music,
    'Loterías': DollarSign,
    'Estudios': BookOpen,
    'Librería': Book,
    'Deporte': Dumbbell,
    'Material deportivo': Dumbbell,
    'Regalos': Gift,
    'Belleza': Sparkles,
    'Niños y mascotas': Baby,
    'Asociaciones': Users,
    'Impuestos': Landmark,
    'Seguridad Social': Building,
    'Ayuntamiento': Building,
    'Otros organismos': Building,
    'Asesores y abogados': Briefcase,
    'Mutuas y licencias': FileCheck,
    'Ingresos': TrendingUp,
    'Transferencias': ArrowLeftRight,
    'Ahorro e inversiones': PiggyBank,
    'Préstamos': FileText,
    'Efectivo': Coins,
    'Otros': Boxes,
    'Otros gastos': Boxes,
    'Sin categoría': HelpCircle,
  };
  
  // First, try exact match
  if (categoryIcons[category]) {
    return categoryIcons[category];
  }
  
  // If hierarchical (e.g., "Vivienda > Hogar"), try matching the subcategory ("Hogar")
  if (category.includes(' > ')) {
    const subcategory = category.split(' > ')[1];
    if (categoryIcons[subcategory]) {
      return categoryIcons[subcategory];
    }
  }
  
  // Default fallback
  return HelpCircle;
};

/**
 * Get all categories with their icons and colors
 * @returns {Array} - Array of category objects
 */
export const getAllCategoriesWithIcons = () => {
  const categories = [
    // Vivienda y hogar
    { name: 'Vivienda > Hogar', icon: Home, group: 'Vivienda' },
    { name: 'Vivienda > Hipoteca', icon: Building, group: 'Vivienda' },
    { name: 'Vivienda > Alquiler y compra', icon: Home, group: 'Vivienda' },
    { name: 'Vivienda > Mantenimiento hogar', icon: Wrench, group: 'Vivienda' },
    { name: 'Vivienda > Otros vivienda', icon: Home, group: 'Vivienda' },
    { name: 'Vivienda > Servicio doméstico', icon: Home, group: 'Vivienda' },
    { name: 'Vivienda > Alarmas y seguridad', icon: ShieldCheck, group: 'Vivienda' },
    { name: 'Vivienda > Comunidad', icon: Users, group: 'Vivienda' },
    
    // Alimentación
    { name: 'Alimentación > Supermercado', icon: Store, group: 'Alimentación' },
    { name: 'Alimentación > Restaurante', icon: Utensils, group: 'Alimentación' },
    
    // Transporte
    { name: 'Transporte > Transportes', icon: Car, group: 'Transporte' },
    { name: 'Transporte > Gasolina', icon: Fuel, group: 'Transporte' },
    { name: 'Transporte > Mantenimiento vehículo', icon: Wrench, group: 'Transporte' },
    { name: 'Transporte > Alquiler vehículos', icon: Car, group: 'Transporte' },
    { name: 'Transporte > Parking y peaje', icon: ParkingCircle, group: 'Transporte' },
    { name: 'Transporte > Compra vehículo', icon: Truck, group: 'Transporte' },
    
    // Salud
    { name: 'Salud > Médico', icon: Heart, group: 'Salud' },
    { name: 'Salud > Farmacia', icon: Plus, group: 'Salud' },
    { name: 'Salud > Óptica y dentista', icon: Heart, group: 'Salud' },
    { name: 'Salud > Otros salud, saber y deporte', icon: Activity, group: 'Salud' },
    
    // Seguros
    { name: 'Seguros > Seguros', icon: Shield, group: 'Seguros' },
    { name: 'Seguros > Seguro salud', icon: Shield, group: 'Seguros' },
    { name: 'Seguros > Seguro hogar', icon: Shield, group: 'Seguros' },
    { name: 'Seguros > Seguro auto', icon: Shield, group: 'Seguros' },
    { name: 'Seguros > Otros seguros', icon: Shield, group: 'Seguros' },
    
    // Servicios y utilidades
    { name: 'Servicios > Agua', icon: Droplet, group: 'Servicios' },
    { name: 'Servicios > Electricidad', icon: Lightbulb, group: 'Servicios' },
    { name: 'Servicios > Internet', icon: Wifi, group: 'Servicios' },
    { name: 'Servicios > Móvil', icon: Smartphone, group: 'Servicios' },
    { name: 'Servicios > Televisión', icon: Tv, group: 'Servicios' },
    { name: 'Servicios > Cargos bancarios', icon: CreditCard, group: 'Servicios' },
    { name: 'Servicios > Servicios y productos online', icon: Globe, group: 'Servicios' },
    { name: 'Servicios > Otros servicios', icon: Boxes, group: 'Servicios' },
    
    // Compras
    { name: 'Compras > Compras', icon: ShoppingBag, group: 'Compras' },
    { name: 'Compras > Otras compras', icon: Package, group: 'Compras' },
    { name: 'Compras > Ropa', icon: Shirt, group: 'Compras' },
    { name: 'Compras > Electrónica', icon: Laptop, group: 'Compras' },
    
    // Ocio y entretenimiento
    { name: 'Ocio > Entretenimiento', icon: Film, group: 'Ocio' },
    { name: 'Ocio > Espectáculos', icon: Ticket, group: 'Ocio' },
    { name: 'Ocio > Vacation', icon: VacationIcon, group: 'Ocio' },
    { name: 'Ocio > Otros ocio', icon: Music, group: 'Ocio' },
    { name: 'Ocio > Loterías', icon: DollarSign, group: 'Ocio' },
    
    // Educación y cultura
    { name: 'Educación > Estudios', icon: BookOpen, group: 'Educación' },
    { name: 'Educación > Librería', icon: Book, group: 'Educación' },
    
    // Deporte
    { name: 'Deporte > Deporte', icon: Dumbbell, group: 'Deporte' },
    { name: 'Deporte > Material deportivo', icon: Dumbbell, group: 'Deporte' },
    
    // Familia y personal
    { name: 'Personal > Regalos', icon: Gift, group: 'Personal' },
    { name: 'Personal > Belleza', icon: Sparkles, group: 'Personal' },
    { name: 'Personal > Niños y mascotas', icon: Baby, group: 'Personal' },
    
    // Asociaciones
    { name: 'Asociaciones > Asociaciones', icon: Users, group: 'Asociaciones' },
    
    // Organismos oficiales
    { name: 'Organismos > Impuestos', icon: Landmark, group: 'Organismos' },
    { name: 'Organismos > Seguridad Social', icon: Building, group: 'Organismos' },
    { name: 'Organismos > Ayuntamiento', icon: Building, group: 'Organismos' },
    { name: 'Organismos > Otros organismos', icon: Building, group: 'Organismos' },
    
    // Profesionales
    { name: 'Profesionales > Asesores y abogados', icon: Briefcase, group: 'Profesionales' },
    { name: 'Profesionales > Mutuas y licencias', icon: FileCheck, group: 'Profesionales' },
    
    // Finanzas
    { name: 'Finanzas > Ingresos', icon: TrendingUp, group: 'Finanzas' },
    { name: 'Finanzas > Transferencias', icon: ArrowLeftRight, group: 'Finanzas' },
    { name: 'Finanzas > Ahorro e inversiones', icon: PiggyBank, group: 'Finanzas' },
    { name: 'Finanzas > Préstamos', icon: FileText, group: 'Finanzas' },
    { name: 'Finanzas > Efectivo', icon: Coins, group: 'Finanzas' },
    
    // Otros
    { name: 'Otros > Otros', icon: Boxes, group: 'Otros' },
    { name: 'Otros > Otros gastos', icon: Boxes, group: 'Otros' },
    { name: 'Otros > Sin categoría', icon: HelpCircle, group: 'Otros' },
  ];
  
  return categories;
};

