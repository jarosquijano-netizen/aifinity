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
    // Vivienda y hogar
    'Hogar': Home,
    'Hipoteca': Building,
    'Alquiler y compra': Home,
    'Mantenimiento hogar': Wrench,
    'Otros vivienda': Home,
    'Servicio doméstico': Home, // Legacy support
    'Vivienda > Servicio doméstico': Home,
    'Alarmas y seguridad': ShieldCheck,
    
    // Alimentación
    'Supermercado': Store,
    'Restaurante': Utensils,
    
    // Transporte
    'Transportes': Car,
    'Gasolina': Fuel,
    'Mantenimiento vehículo': Wrench,
    'Alquiler vehículos': Car,
    'Parking y peaje': ParkingCircle,
    'Compra vehículo': Truck,
    
    // Salud
    'Médico': Heart,
    'Farmacia': Plus,
    'Óptica y dentista': Heart,
    'Otros salud, saber y deporte': Activity,
    
    // Seguros
    'Seguros': Shield,
    'Seguro salud': Shield,
    'Seguro hogar': Shield,
    'Seguro auto': Shield,
    'Otros seguros': Shield,
    
    // Servicios y utilidades
    'Agua': Droplet,
    'Electricidad': Lightbulb,
    'Internet': Wifi,
    'Móvil': Smartphone,
    'Televisión': Tv,
    
    // Servicios y cargos
    'Cargos bancarios': CreditCard,
    'Servicios y productos online': Globe,
    'Otros servicios': Boxes,
    
    // Compras
    'Compras': ShoppingBag,
    'Otras compras': Package,
    'Ropa': Shirt,
    'Electrónica': Laptop,
    
    // Ocio y entretenimiento
    'Entretenimiento': Film,
    'Espectáculos': Ticket,
    'Vacation': VacationIcon,
    'Ocio > Vacation': VacationIcon,
    'Otros ocio': Music,
    'Loterías': DollarSign,
    
    // Educación y cultura
    'Estudios': BookOpen,
    'Librería': Book,
    
    // Deporte
    'Deporte': Dumbbell,
    'Material deportivo': Dumbbell,
    
    // Familia y personal
    'Regalos': Gift,
    'Belleza': Sparkles,
    'Niños y mascotas': Baby,
    
    // Comunidad y asociaciones
    'Comunidad': Users,
    'Asociaciones': Users,
    
    // Organismos oficiales
    'Impuestos': Landmark,
    'Seguridad Social': Building,
    'Ayuntamiento': Building,
    'Otros organismos': Building,
    
    // Profesionales
    'Asesores y abogados': Briefcase,
    'Mutuas y licencias': FileCheck,
    
    // Finanzas
    'Ingresos': TrendingUp, // Legacy support - use 'Finanzas > Ingresos'
    'Finanzas > Ingresos': TrendingUp,
    'Transferencias': ArrowLeftRight, // Legacy support - use 'Finanzas > Transferencias'
    'Finanzas > Transferencias': ArrowLeftRight,
    'Ahorro e inversiones': PiggyBank, // Legacy support - use 'Finanzas > Ahorro e inversiones'
    'Finanzas > Ahorro e inversiones': PiggyBank,
    'Préstamos': FileText, // Legacy support - use 'Finanzas > Préstamos'
    'Finanzas > Préstamos': FileText,
    'Efectivo': Coins, // Legacy support - use 'Finanzas > Efectivo'
    'Finanzas > Efectivo': Coins,
    
    // Otros
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
    { name: 'Hogar', icon: Home, group: 'Vivienda' },
    { name: 'Hipoteca', icon: Building, group: 'Vivienda' },
    { name: 'Alquiler y compra', icon: Home, group: 'Vivienda' },
    { name: 'Mantenimiento hogar', icon: Wrench, group: 'Vivienda' },
    { name: 'Otros vivienda', icon: Home, group: 'Vivienda' },
    { name: 'Vivienda > Servicio doméstico', icon: Home, group: 'Vivienda' },
    { name: 'Alarmas y seguridad', icon: ShieldCheck, group: 'Vivienda' },
    { name: 'Comunidad', icon: Users, group: 'Vivienda' },
    
    // Alimentación
    { name: 'Supermercado', icon: Store, group: 'Alimentación' },
    { name: 'Restaurante', icon: Utensils, group: 'Alimentación' },
    
    // Transporte
    { name: 'Transportes', icon: Car, group: 'Transporte' },
    { name: 'Gasolina', icon: Fuel, group: 'Transporte' },
    { name: 'Mantenimiento vehículo', icon: Wrench, group: 'Transporte' },
    { name: 'Alquiler vehículos', icon: Car, group: 'Transporte' },
    { name: 'Parking y peaje', icon: ParkingCircle, group: 'Transporte' },
    { name: 'Compra vehículo', icon: Truck, group: 'Transporte' },
    
    // Salud
    { name: 'Médico', icon: Heart, group: 'Salud' },
    { name: 'Farmacia', icon: Plus, group: 'Salud' },
    { name: 'Óptica y dentista', icon: Heart, group: 'Salud' },
    { name: 'Otros salud, saber y deporte', icon: Activity, group: 'Salud' },
    
    // Seguros
    { name: 'Seguros', icon: Shield, group: 'Seguros' },
    { name: 'Seguro salud', icon: Shield, group: 'Seguros' },
    { name: 'Seguro hogar', icon: Shield, group: 'Seguros' },
    { name: 'Seguro auto', icon: Shield, group: 'Seguros' },
    { name: 'Otros seguros', icon: Shield, group: 'Seguros' },
    
    // Servicios y utilidades
    { name: 'Agua', icon: Droplet, group: 'Servicios' },
    { name: 'Electricidad', icon: Lightbulb, group: 'Servicios' },
    { name: 'Internet', icon: Wifi, group: 'Servicios' },
    { name: 'Móvil', icon: Smartphone, group: 'Servicios' },
    { name: 'Televisión', icon: Tv, group: 'Servicios' },
    { name: 'Cargos bancarios', icon: CreditCard, group: 'Servicios' },
    { name: 'Servicios y productos online', icon: Globe, group: 'Servicios' },
    { name: 'Otros servicios', icon: Boxes, group: 'Servicios' },
    
    // Compras
    { name: 'Compras', icon: ShoppingBag, group: 'Compras' },
    { name: 'Otras compras', icon: Package, group: 'Compras' },
    { name: 'Ropa', icon: Shirt, group: 'Compras' },
    { name: 'Electrónica', icon: Laptop, group: 'Compras' },
    
    // Ocio y entretenimiento
    { name: 'Entretenimiento', icon: Film, group: 'Ocio' },
    { name: 'Espectáculos', icon: Ticket, group: 'Ocio' },
    { name: 'Ocio > Vacation', icon: VacationIcon, group: 'Ocio' },
    { name: 'Otros ocio', icon: Music, group: 'Ocio' },
    { name: 'Loterías', icon: DollarSign, group: 'Ocio' },
    
    // Educación y cultura
    { name: 'Estudios', icon: BookOpen, group: 'Educación' },
    { name: 'Librería', icon: Book, group: 'Educación' },
    
    // Deporte
    { name: 'Deporte', icon: Dumbbell, group: 'Deporte' },
    { name: 'Material deportivo', icon: Dumbbell, group: 'Deporte' },
    
    // Familia y personal
    { name: 'Regalos', icon: Gift, group: 'Personal' },
    { name: 'Belleza', icon: Sparkles, group: 'Personal' },
    { name: 'Niños y mascotas', icon: Baby, group: 'Personal' },
    
    // Asociaciones
    { name: 'Asociaciones', icon: Users, group: 'Asociaciones' },
    
    // Organismos oficiales
    { name: 'Impuestos', icon: Landmark, group: 'Organismos' },
    { name: 'Seguridad Social', icon: Building, group: 'Organismos' },
    { name: 'Ayuntamiento', icon: Building, group: 'Organismos' },
    { name: 'Otros organismos', icon: Building, group: 'Organismos' },
    
    // Profesionales
    { name: 'Asesores y abogados', icon: Briefcase, group: 'Profesionales' },
    { name: 'Mutuas y licencias', icon: FileCheck, group: 'Profesionales' },
    
    // Finanzas
    { name: 'Finanzas > Ingresos', icon: TrendingUp, group: 'Finanzas' },
    { name: 'Finanzas > Transferencias', icon: ArrowLeftRight, group: 'Finanzas' },
    { name: 'Finanzas > Ahorro e inversiones', icon: PiggyBank, group: 'Finanzas' },
    { name: 'Finanzas > Préstamos', icon: FileText, group: 'Finanzas' },
    { name: 'Finanzas > Efectivo', icon: Coins, group: 'Finanzas' },
    
    // Otros
    { name: 'Otros', icon: Boxes, group: 'Otros' },
    { name: 'Otros gastos', icon: Boxes, group: 'Otros' },
    { name: 'Sin categoría', icon: HelpCircle, group: 'Otros' },
  ];
  
  return categories;
};

