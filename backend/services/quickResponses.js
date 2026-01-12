/**
 * Quick Response Templates
 * Fast template-based responses for common questions (no AI API call needed)
 */

/**
 * Generate a template response for a category
 * @param {string} category - Question category
 * @param {object} data - Context data
 * @param {string} language - Language preference ('es' or 'en')
 * @returns {string|null} - Template response or null if no template available
 */
export function generateTemplateResponse(category, data, language = 'es') {
  switch (category) {
    case 'PENDING_PAYMENTS':
      return generatePendingPaymentsResponse(data, language);
    
    case 'SPENDING_CAPACITY':
      return generateSpendingCapacityResponse(data, language);
    
    case 'BALANCE_INQUIRY':
      return generateBalanceInquiryResponse(data, language);
    
    default:
      return null;
  }
}

/**
 * Generate response for pending payments
 */
function generatePendingPaymentsResponse(data, language = 'es') {
  if (!data.pending || data.pending.length === 0) {
    if (language === 'es') {
      return '¡Genial! No tienes pagos fijos pendientes este mes 🎉\n\nTodos tus pagos recurrentes ya están cubiertos.';
    } else {
      return 'Great! You have no pending fixed payments this month 🎉\n\nAll your recurring payments are already covered.';
    }
  }

  const list = data.pending.map((p, index) => {
    let daysText = '';
    if (p.daysUntil > 0) {
      daysText = language === 'es' 
        ? `(faltan ${p.daysUntil} días)` 
        : `(due in ${p.daysUntil} days)`;
    } else if (p.daysUntil === 0) {
      daysText = language === 'es' ? '(hoy)' : '(due today)';
    } else {
      daysText = language === 'es' 
        ? `(vencido hace ${Math.abs(p.daysUntil)} días)` 
        : `(overdue by ${Math.abs(p.daysUntil)} days)`;
    }
    
    return `• ${p.description}: €${p.amount.toFixed(2)} ${daysText}`;
  }).join('\n');

  const totalText = language === 'es' 
    ? `💰 Total pendiente: €${data.totalAmount.toFixed(2)}`
    : `💰 Total pending: €${data.totalAmount.toFixed(2)}`;

  const headerText = language === 'es'
    ? `Faltan ${data.pending.length} pago${data.pending.length > 1 ? 's' : ''} este mes:\n\n`
    : `You have ${data.pending.length} pending payment${data.pending.length > 1 ? 's' : ''} this month:\n\n`;

  return headerText + list + '\n\n' + totalText;
}

/**
 * Generate response for spending capacity
 */
function generateSpendingCapacityResponse(data, language = 'es') {
  const dailyAmount = data.dailyRecommended || 0;
  const totalAvailable = data.totalAvailable || 0;
  const pendingPayments = data.pendingPayments || 0;
  const daysRemaining = data.daysRemaining || 0;

  if (language === 'es') {
    let response = `💶 Hoy puedes gastar aproximadamente **€${dailyAmount.toFixed(2)}**.\n\n`;
    
    response += `Tienes €${totalAvailable.toFixed(2)} disponibles después de reservar para ${data.pendingCount || 0} pago${data.pendingCount !== 1 ? 's' : ''} pendiente${data.pendingCount !== 1 ? 's' : ''} (€${pendingPayments.toFixed(2)}).\n\n`;
    
    if (daysRemaining > 0) {
      response += `Con ${daysRemaining} día${daysRemaining > 1 ? 's' : ''} restantes del mes, te recomiendo mantener un gasto diario de alrededor de €${dailyAmount.toFixed(2)} para llegar bien a fin de mes.`;
    } else {
      response += `Estamos a fin de mes, así que puedes usar el dinero disponible con más libertad.`;
    }

    if (dailyAmount < 10) {
      response += `\n\n⚠️ El monto disponible es bajo. Considera revisar tus gastos o esperar ingresos adicionales.`;
    }

    return response;
  } else {
    let response = `💶 Today you can spend approximately **€${dailyAmount.toFixed(2)}**.\n\n`;
    
    response += `You have €${totalAvailable.toFixed(2)} available after reserving for ${data.pendingCount || 0} pending payment${data.pendingCount !== 1 ? 's' : ''} (€${pendingPayments.toFixed(2)}).\n\n`;
    
    if (daysRemaining > 0) {
      response += `With ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining in the month, I recommend maintaining a daily spending of around €${dailyAmount.toFixed(2)} to make it through the month comfortably.`;
    } else {
      response += `We're at the end of the month, so you can use the available money more freely.`;
    }

    if (dailyAmount < 10) {
      response += `\n\n⚠️ The available amount is low. Consider reviewing your expenses or waiting for additional income.`;
    }

    return response;
  }
}

/**
 * Generate response for balance inquiry
 */
function generateBalanceInquiryResponse(data, language = 'es') {
  const balance = data.currentBalance || 0;
  const available = data.totalAvailable || 0;
  const pendingPayments = data.pendingPayments || 0;

  if (language === 'es') {
    let response = `💰 Tienes **€${balance.toFixed(2)}** en tus cuentas.\n\n`;
    
    if (pendingPayments > 0) {
      response += `Después de reservar €${pendingPayments.toFixed(2)} para ${data.pendingCount || 0} pago${data.pendingCount !== 1 ? 's' : ''} pendiente${data.pendingCount !== 1 ? 's' : ''}, te quedan **€${available.toFixed(2)}** disponibles para gastar.`;
    } else {
      response += `No tienes pagos pendientes identificados, así que todo ese dinero está disponible.`;
    }

    return response;
  } else {
    let response = `💰 You have **€${balance.toFixed(2)}** in your accounts.\n\n`;
    
    if (pendingPayments > 0) {
      response += `After reserving €${pendingPayments.toFixed(2)} for ${data.pendingCount || 0} pending payment${data.pendingCount !== 1 ? 's' : ''}, you have **€${available.toFixed(2)}** available to spend.`;
    } else {
      response += `You have no identified pending payments, so all that money is available.`;
    }

    return response;
  }
}

export default {
  generateTemplateResponse
};
