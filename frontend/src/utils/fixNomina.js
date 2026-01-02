import api from './api';

/**
 * Función para corregir nóminas automáticamente
 * Detecta y corrige nóminas del 20-31 de diciembre que deberían aparecer en enero
 */
export const fixNominas = async () => {
  try {
    console.log('🔧 Corrigiendo nóminas del 20-31 de diciembre...');
    
    const response = await api.post('/fix-nomina/freightos');
    const data = response.data;
    
    console.log('✅ Resultado de la corrección:');
    console.log('Nóminas actualizadas:', data.updated);
    console.log('Todas las nóminas encontradas:', data.allPotentialNominas);
    console.log('Nóminas en cálculo:', data.nominasInCalculation);
    console.log('Ingreso calculado:', data.calculatedIncome);
    
    if (data.excludedAccounts && data.excludedAccounts.length > 0) {
      console.warn('⚠️ ADVERTENCIA: Hay cuentas excluidas de estadísticas:', data.excludedAccounts);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error corrigiendo nóminas:', error);
    throw error;
  }
};
