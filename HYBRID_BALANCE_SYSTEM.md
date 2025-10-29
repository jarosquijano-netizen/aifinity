# 🔄 Sistema Híbrido de Balance de Cuentas

## 📋 Descripción

Se ha implementado un sistema híbrido inteligente para gestionar el balance de las cuentas bancarias, que combina lo mejor de dos mundos:
- **Balance Automático** desde CSVs (prioridad)
- **Balance Manual** como fallback

## ✨ Características Implementadas

### 1️⃣ **Balance Automático desde CSV**
Cuando subes un CSV del banco (ej: Sabadell):
- ✅ El sistema extrae automáticamente el **saldo final** de la última transacción
- ✅ Actualiza el balance de la cuenta seleccionada
- ✅ Marca el balance como **"CSV" 🟢**
- ✅ Registra la fecha y hora de actualización

### 2️⃣ **Balance Manual**
Para cuentas sin CSV (efectivo, crypto, etc.):
- ✅ El usuario puede editar manualmente el balance en Settings
- ✅ Se marca como **"Manual" 🟡**
- ✅ Útil para cuentas especiales que no tienen extractos bancarios

### 3️⃣ **Balance Calculado**
Recálculo automático desde transacciones:
- ✅ Botón "Recalcular" (🔄) en cada cuenta
- ✅ Suma todos los ingresos menos todos los gastos
- ✅ Se marca como **"Calculado" 🔵**
- ✅ Solo considera transacciones `computable = true`

---

## 🎨 Interfaz de Usuario

### En Settings - Vista de Cuentas

Cada cuenta ahora muestra:

```
┌─────────────────────────────────────────────────────────────┐
│ [Icono] Nombre de Cuenta                                    │
│         tipo de cuenta                                      │
│                                                             │
│                        €1,234.56  [🟢 CSV]                 │
│                        🕒 15 oct 2025, 14:30       [🔄][✏️][🗑️] │
└─────────────────────────────────────────────────────────────┘
```

**Badges de Origen:**
- 🟢 **CSV** - Balance actualizado automáticamente desde CSV
- 🟡 **Manual** - Balance ingresado manualmente por el usuario
- 🔵 **Calculado** - Balance recalculado desde transacciones

**Botones de Acción:**
- 🔄 **Recalcular** - Recalcula el balance desde las transacciones
- ✏️ **Editar** - Modificar datos de la cuenta
- 🗑️ **Eliminar** - Borrar la cuenta

---

## 🔧 Implementación Técnica

### Base de Datos

**Nuevos campos en `bank_accounts`:**
```sql
balance_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
balance_source VARCHAR(20) DEFAULT 'manual'  -- 'csv', 'manual', 'calculated'
```

### Backend

**1. Endpoint de Upload Mejorado** (`/api/transactions/upload`)
```javascript
POST /api/transactions/upload
Body: {
  transactions: [...],
  account_id: 123,
  lastBalance: 1234.56  // ← Nuevo!
}

// Actualiza automáticamente:
UPDATE bank_accounts 
SET balance = lastBalance, 
    balance_source = 'csv', 
    balance_updated_at = NOW()
```

**2. Nuevo Endpoint de Recálculo** (`/api/accounts/:id/recalculate-balance`)
```javascript
POST /api/accounts/123/recalculate-balance

// Calcula desde transacciones:
SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
FROM transactions
WHERE account_id = 123 AND computable = true
```

### Frontend

**1. Parser CSV Mejorado** (`pdfParser.js`)
```javascript
// Extrae el campo "Saldo" del CSV Sabadell
const balance = fields[4]; // Columna de Saldo
return {
  ...
  lastBalance: parsedBalance  // ← Nuevo!
}
```

**2. Upload Component** (`Upload.jsx`)
```javascript
// Extrae balance del resultado del parser
if (parseResult.lastBalance !== null) {
  lastBalance = parseResult.lastBalance;
}

// Lo envía al backend
await uploadTransactions(transactions, accountId, lastBalance);
```

**3. Settings Component** (`Settings.jsx`)
```javascript
// Muestra badges de origen
const getBalanceSourceBadge = (source) => {
  'csv': { color: 'green', label: '🟢 CSV' },
  'calculated': { color: 'blue', label: '🔵 Calculado' },
  'manual': { color: 'amber', label: '🟡 Manual' }
}

// Handler para recalcular
const handleRecalculateBalance = async (id) => {
  await recalculateAccountBalance(id);
  fetchAccounts(); // Recargar
}
```

---

## 🚀 Flujo de Trabajo del Usuario

### Escenario 1: Usuario sube CSV de Sabadell

1. Usuario va a **Upload** 📤
2. Arrastra CSV del banco
3. Selecciona la cuenta "Sabadell Cuenta Corriente"
4. Sistema automáticamente:
   - Parsea transacciones ✅
   - Extrae saldo final: €2,450.00 ✅
   - Actualiza balance de la cuenta ✅
   - Marca como 🟢 CSV ✅
5. Usuario ve en Dashboard: Balance actualizado automáticamente 🎉

### Escenario 2: Usuario tiene cuenta de Efectivo

1. Usuario va a **Settings** ⚙️
2. Crea cuenta "Efectivo" con balance inicial €100
3. Se marca como 🟡 Manual
4. Usuario edita manualmente cuando cambia

### Escenario 3: Usuario quiere verificar balance

1. Usuario va a **Settings** ⚙️
2. Ve su cuenta "Banco X" con balance €1,500 (🟡 Manual)
3. Hace clic en 🔄 **Recalcular**
4. Sistema suma todas las transacciones
5. Balance actualizado a €1,485.50 (🔵 Calculado)
6. Usuario detecta diferencia de €14.50 y puede investigar

---

## 🎯 Ventajas del Sistema

### Para usuarios que suben CSVs regularmente:
✅ **Cero mantenimiento** - Balance siempre actualizado  
✅ **Precisión 100%** - Datos directos del banco  
✅ **Trazabilidad** - Sabe de dónde viene cada dato  

### Para cuentas especiales:
✅ **Flexibilidad** - Balance manual cuando no hay CSV  
✅ **Control total** - Usuario decide el valor  

### Para todos:
✅ **Transparencia** - Badges muestran origen de datos  
✅ **Verificación** - Botón recalcular para auditar  
✅ **Histórico** - Fecha de última actualización visible  

---

## 📊 Flujo de Datos

```
┌─────────────────┐
│   CSV Upload    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌────────────────┐
│ Parse CSV       │─────▶│ Extract Saldo  │
│ (pdfParser.js)  │      │ (field[4])     │
└────────┬────────┘      └────────┬───────┘
         │                        │
         ▼                        ▼
┌─────────────────────────────────────────┐
│     Upload to Backend                   │
│  {transactions, accountId, lastBalance} │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  UPDATE bank_accounts                   │
│  SET balance = lastBalance              │
│      balance_source = 'csv'             │
│      balance_updated_at = NOW()         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Settings UI                            │
│  Shows: €X,XXX.XX [🟢 CSV]             │
│         🕒 15 oct 2025, 14:30          │
└─────────────────────────────────────────┘
```

---

## 📝 Archivos Modificados

### Backend
1. ✅ `backend/migrations/run.js` - Added balance tracking fields
2. ✅ `backend/routes/transactions.js` - Upload endpoint accepts lastBalance
3. ✅ `backend/routes/accounts.js` - New recalculate endpoint

### Frontend
4. ✅ `frontend/src/utils/pdfParser.js` - Extracts balance from CSV
5. ✅ `frontend/src/components/Upload.jsx` - Sends balance to backend
6. ✅ `frontend/src/utils/api.js` - New API functions
7. ✅ `frontend/src/components/Settings.jsx` - Shows balance source + recalculate button

---

## 🧪 Casos de Prueba

### Test 1: Upload CSV con saldo
- [ ] Subir CSV de Sabadell con saldo final €1,234.56
- [ ] Verificar que balance se actualiza en Settings
- [ ] Verificar badge 🟢 CSV
- [ ] Verificar fecha de actualización

### Test 2: Balance Manual
- [ ] Crear nueva cuenta con balance inicial €500
- [ ] Verificar badge 🟡 Manual
- [ ] Editar balance a €600
- [ ] Verificar que badge sigue siendo 🟡 Manual

### Test 3: Recalcular Balance
- [ ] Cuenta con 3 transacciones: +€100, -€20, +€50
- [ ] Click en botón 🔄 Recalcular
- [ ] Balance debe ser €130
- [ ] Badge debe cambiar a 🔵 Calculado

---

## 🔮 Futuras Mejoras

- [ ] **Auto-detect account** - Detectar cuenta automáticamente por IBAN del CSV
- [ ] **Balance History** - Guardar histórico de cambios de balance
- [ ] **Alerts** - Notificar cuando balance CSV difiere mucho del calculado
- [ ] **Multi-currency** - Soporte para múltiples monedas en balance
- [ ] **Scheduled Recalc** - Recalcular automáticamente cada noche

---

## 💡 Conclusión

El sistema híbrido de balance combina:
- **Automatización** para usuarios que suben CSVs
- **Flexibilidad** para casos especiales
- **Transparencia** con badges y fechas
- **Control** con botón de recálculo

¡El mejor de ambos mundos! 🎉



