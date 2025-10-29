# Sistema Híbrido de Ingresos: Expected + Actual Income ✅

## 📋 Resumen

Se ha implementado un **sistema híbrido inteligente** para manejar el problema de las nóminas pagadas al final del mes que pertenecen al mes siguiente.

## 🎯 Problema Resuelto

**Situación anterior:**
```
31 Enero: Recibe nómina €3,000 (para FEBRERO)
Febrero: Sin ingresos visibles → Análisis incorrecto ❌
```

**Situación ahora:**
```
31 Enero: Nómina detectada → Movida automáticamente a FEBRERO 🔄
Febrero: Actual Income = €3,000 ✅
Dashboard: Compara Actual vs Expected Income 📊
```

## 🚀 Funcionalidades Implementadas

### 1. ✅ Campo `applicable_month` en Transactions
- **Tabla**: `transactions`
- **Columna**: `applicable_month VARCHAR(7)` (formato: 'YYYY-MM')
- **Propósito**: Permite asignar una transacción a un mes diferente al de su fecha real

### 2. 🤖 Auto-Detección de Nóminas
**Lógica inteligente:**
- Detecta ingresos recurrentes (descripción repetida ≥2 veces)
- Si el ingreso:
  - Es del día 25-31 del mes
  - Y tiene descripción que incluye: "nómina", "nomina", "salary", o coincide con nóminas anteriores
- **Acción**: Mueve automáticamente al mes siguiente

**Ejemplo:**
```javascript
// Transacción CSV
Date: 31/01/2025
Description: "Nómina Enero"
Amount: €3,000
Type: income

// Sistema automáticamente añade:
applicable_month: "2025-02"

// En análisis de febrero, este ingreso cuenta para febrero
```

### 3. 💰 Expected Income vs Actual Income

#### **Expected Income** (ya existía, mejorado):
- Ingreso esperado mensual configurado manualmente
- Base de cálculo para comparaciones
- Usado en widgets del Dashboard

#### **Actual Income** (NUEVO):
- Suma real de ingresos del mes actual
- Considera `applicable_month` si existe
- Calculado dinámicamente desde transacciones
- Actualizado en tiempo real

**Cálculo:**
```sql
SELECT SUM(amount) as actual_income
FROM transactions
WHERE type = 'income'
AND computable = true
AND (
  (applicable_month IS NOT NULL AND applicable_month = '2025-02')
  OR
  (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = '2025-02')
)
```

### 4. 🔄 Botón "Actualizar Expected Income"
**Ubicación**: Settings → Expected Monthly Income

**Funcionalidad:**
1. Botón **"Calculate"**: 
   - Consulta últimos 3 meses de Actual Income
   - Calcula promedio
   - Muestra desglose mes por mes

2. Botón **"Update Expected Income"**:
   - Actualiza Expected Income con el promedio calculado
   - Feedback visual de la operación

**UI:**
```
┌──────────────────────────────────────────────────┐
│ ⚡ Auto-Calculate from Actual Income             │
│ Calculate expected income based on last 3 months │
│                                    [Calculate]    │
│                                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ Suggested Expected Income: €3,200.00         │ │
│ │ Based on 3 months of actual income           │ │
│ │                                              │ │
│ │ 2025-02: €3,000.00                           │ │
│ │ 2025-01: €3,150.00                           │ │
│ │ 2024-12: €3,450.00                           │ │
│ │                                              │ │
│ │ [Update Expected Income]                     │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## 📊 Dashboard Actualizado

### Widget "Income" (KPI)
**Antes:**
```
Total Income
€1,474.21
```

**Ahora:**
```
Actual Income (este mes)
€3,000.00

Expected: €3,000
Progress: 100.0% ✅
```

### Widget "Balance" (KPI)
**Ahora incluye:**
```
Net Balance: €560.26

Expected Income: €3,000
Income Ratio: 100.0% ✅
```

- 🟢 Verde: ≥100% del esperado
- 🟡 Ámbar: 75-99% del esperado
- 🔴 Rojo: <75% del esperado

## 🔧 Cambios Técnicos

### Backend

#### 1. **Migración: `applicable_month`**
```javascript
// backend/migrations/run.js
ALTER TABLE transactions 
ADD COLUMN applicable_month VARCHAR(7)
```

#### 2. **Upload Endpoint (Auto-detección)**
```javascript
// backend/routes/transactions.js
if (type === 'income' && isRecurringIncome && dayOfMonth >= 25) {
  const nextMonth = new Date(transactionDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  applicableMonth = nextMonth.toISOString().slice(0, 7);
  console.log(`🔄 Auto-shifting income "${description}" to ${applicableMonth}`);
}
```

#### 3. **Summary Endpoint (Actual Income)**
```javascript
// backend/routes/summary.js
const actualIncomeResult = await pool.query(`
  SELECT SUM(amount) as actual_income
  FROM transactions
  WHERE type = 'income' AND computable = true
  AND (
    (applicable_month IS NOT NULL AND applicable_month = $1)
    OR (applicable_month IS NULL AND TO_CHAR(date, 'YYYY-MM') = $1)
  )
`, [currentMonth]);

res.json({
  ...
  actualIncome: actualIncomeResult.rows[0].actual_income,
  currentMonth: currentMonth
});
```

#### 4. **Settings Endpoints**
```javascript
// backend/routes/settings.js

// GET /api/settings/actual-income/:month
// Retorna actual income de un mes específico

// GET /api/settings/calculate-expected-income
// Calcula promedio de últimos 3 meses

// POST /api/settings/update-expected-from-actual
// Actualiza expected income automáticamente
```

### Frontend

#### 1. **API Utils**
```javascript
// frontend/src/utils/api.js
export const getActualIncome = async (month) => { ... };
export const calculateExpectedIncome = async () => { ... };
export const updateExpectedFromActual = async () => { ... };
```

#### 2. **Dashboard**
```javascript
// frontend/src/components/Dashboard.jsx

// Widget Income muestra:
- data.actualIncome (en lugar de data.totalIncome)
- Expected income si está configurado
- Progress percentage con color dinámico

// Widget Balance muestra:
- Income Ratio basado en actualIncome
```

#### 3. **Settings**
```javascript
// frontend/src/components/Settings.jsx

// Nuevos estados:
const [calculatingIncome, setCalculatingIncome] = useState(false);
const [calculationData, setCalculationData] = useState(null);

// Nuevas funciones:
const handleCalculateExpectedIncome = async () => { ... };
const handleUpdateFromActual = async () => { ... };

// Nueva UI: Botón Calculate y panel de resultados
```

## 📈 Flujo de Trabajo del Usuario

### Escenario 1: Subir CSV de Nómina

1. **Usuario sube CSV** con transacciones del 31 de enero
2. **Sistema detecta** ingreso recurrente "Nómina Enero" el día 31
3. **Auto-movimiento**: `applicable_month = "2025-02"`
4. **Dashboard actualiza**: 
   - Febrero ahora muestra Actual Income €3,000
   - Income Ratio se calcula correctamente

### Escenario 2: Actualizar Expected Income

1. **Usuario va a Settings** → Expected Monthly Income
2. **Click en "Calculate"**
3. **Sistema muestra**:
   - Promedio de últimos 3 meses: €3,200
   - Desglose por mes
4. **Usuario aprueba**: Click en "Update Expected Income"
5. **Sistema actualiza**: Expected Income = €3,200
6. **Dashboard refleja**: Todos los ratios actualizados

### Escenario 3: Mes Sin Nómina Aún

```
Situación: 15 de febrero, nómina aún no pagada

Dashboard muestra:
- Expected Income: €3,000
- Actual Income: €0
- Income Ratio: 0% 🔴
- Advice: "Esperando nómina del mes"
```

## 🎨 Mejoras UX

### 1. **Feedback Visual**
- 🟢 Income Ratio ≥100%: Verde
- 🟡 Income Ratio 75-99%: Ámbar
- 🔴 Income Ratio <75%: Rojo

### 2. **Mensajes Contextuales**
```
"⚠️ Usando Expected Income"
"✅ Expected income updated to €3,200.00 (average of last 3 months)"
"❌ Failed to calculate. Need at least 3 months of income data."
```

### 3. **Auto-Scroll en Cálculo**
El panel de resultados aparece con animación suave

### 4. **Loading States**
Spinners en todos los botones durante operaciones async

## 🧪 Testing

### Prueba 1: Auto-Detección
```bash
# Subir CSV con nómina del día 31
POST /api/transactions/upload
{
  "transactions": [
    {
      "date": "2025-01-31",
      "description": "Nómina Enero",
      "amount": 3000,
      "type": "income"
    }
  ]
}

# Verificar en DB
SELECT * FROM transactions WHERE description LIKE '%Nómina%';
# Debería tener applicable_month = '2025-02'
```

### Prueba 2: Actual Income
```bash
# Consultar actual income de febrero
GET /api/settings/actual-income/2025-02

# Debería retornar:
{
  "month": "2025-02",
  "actualIncome": 3000
}
```

### Prueba 3: Cálculo Automático
```bash
# Calcular expected income
GET /api/settings/calculate-expected-income

# Debería retornar:
{
  "suggestedExpectedIncome": 3200,
  "basedOnMonths": 3,
  "monthsData": [
    { "month": "2025-02", "income": 3000 },
    { "month": "2025-01", "income": 3150 },
    { "month": "2024-12", "income": 3450 }
  ]
}
```

### Prueba 4: Dashboard
1. Ir a Dashboard
2. Verificar widget "Income":
   - Muestra "Actual Income (este mes)"
   - Muestra Expected y Progress si está configurado
3. Hacer widget grande (Large)
4. Verificar que muestra el desglose completo

## 🔍 Troubleshooting

### "Auto-detección no funciona"
✅ Verifica que:
- El ingreso se repite al menos 2 veces en el historial
- La fecha está entre el día 25-31
- La descripción incluye "nómina", "nomina" o "salary"

### "Actual Income es €0"
✅ Verifica que:
- Las transacciones de ingreso tienen `computable = true`
- El mes está bien formateado: 'YYYY-MM'
- Hay transacciones de ingreso en ese mes (o con applicable_month de ese mes)

### "Calculate button no funciona"
✅ Verifica que:
- Hay al menos 3 meses de datos de ingresos
- El backend está corriendo
- No hay errores en la consola

### "Income Ratio incorrecto"
✅ Verifica que:
- Expected Income está configurado correctamente
- Se está usando `data.actualIncome` en lugar de `data.totalIncome`
- El mes actual es correcto

## 📝 Logs Útiles

### Backend
```
🔄 Auto-shifting income "Nómina Enero" from 2025-01 to 2025-02
✅ Added applicable_month column to transactions
```

### Frontend (Console)
```javascript
// Ver actual income en Dashboard
console.log('Actual Income:', data.actualIncome);
console.log('Expected Income:', expectedIncome);
console.log('Income Ratio:', (data.actualIncome / expectedIncome) * 100);
```

## 🚀 Próximas Mejoras Posibles

1. **Manual Override**: Botón para mover manualmente una transacción a otro mes
2. **Bulk Update**: Mover múltiples transacciones a la vez
3. **Alertas Inteligentes**: "Tu nómina aún no ha llegado este mes"
4. **Proyecciones**: "Based on current pace, expected income this month: €2,800"
5. **Historial de Cambios**: Log de movimientos de ingresos

---

**Fecha**: 2025-10-15  
**Version**: 1.0  
**Status**: ✅ Completamente Implementado  

**Archivos Modificados**:
- Backend:
  - `backend/migrations/run.js`
  - `backend/routes/transactions.js`
  - `backend/routes/summary.js`
  - `backend/routes/settings.js`
- Frontend:
  - `frontend/src/utils/api.js`
  - `frontend/src/components/Dashboard.jsx`
  - `frontend/src/components/Settings.jsx`

**Endpoints Nuevos**:
- `GET /api/settings/actual-income/:month`
- `GET /api/settings/calculate-expected-income`
- `POST /api/settings/update-expected-from-actual`



