# Balance de Cuentas - Explicación y Estado Actual

## 🔍 Problema Identificado

El usuario preguntó: "¿Por qué el balance del CSV no se actualiza automáticamente?"

## ✅ Estado Actual de las Cuentas

Después de recalcular los balances basándose en las transacciones:

```
┌──────────────────────────┬─────────────┬─────────────────┐
│ Cuenta                   │ Balance     │ Fuente          │
├──────────────────────────┼─────────────┼─────────────────┤
│ Cuenta Sabadell Jaxo     │ -€2,749.49  │ calculated      │
│ Cuenta Sabadell Joe      │ -€3,480.43  │ calculated      │
│ Cuenta Sabadell Olivia   │ €1,624.30   │ manual          │
│ Cuenta Sabadell Abril    │ €6,030.64   │ manual          │
│ Cuenta Ahorro JAXO       │ €14.24      │ manual          │
├──────────────────────────┼─────────────┼─────────────────┤
│ TOTAL                    │ €1,439.26   │                 │
└──────────────────────────┴─────────────┴─────────────────┘
```

## 🧮 Cómo Funciona el Sistema de Balances

### 1. **Extracción del Balance desde CSV** ✅ (Implementado)

El parser de Sabadell **SÍ extrae** el balance del CSV:

```javascript
// En pdfParser.js - parseSabadellCSV()
const balance = fields[4]; // Campo "Saldo"
if (balance) {
  lastBalance = parseAmount(balance); // Último balance del CSV
}
```

**Problema**: En los CSV de Sabadell, el campo "Saldo" muestra el balance **después de cada transacción**, NO el balance inicial. Entonces `lastBalance` es el saldo FINAL de la última transacción del periodo exportado.

### 2. **Cálculo desde Transacciones** ✅ (Usado)

Cuando se recalcula el balance:

```javascript
// Suma todos los ingresos y resta todos los gastos
balance = SUM(ingresos) - SUM(gastos)
```

Para las cuentas Jaxo y Joe:
- **No tienen balance inicial explícito**
- Solo tienen transacciones (85 y 41 respectivamente)
- El balance calculado es **negativo** porque solo se contabilizan las transacciones importadas

## 🎯 ¿Por Qué los Balances son Negativos?

### Cuenta Sabadell Jaxo: **-€2,749.49**
- 85 transacciones importadas
- Probablemente más gastos que ingresos en el periodo exportado
- **Falta**: Balance inicial de la cuenta antes de las transacciones

### Cuenta Sabadell Joe: **-€3,480.43**
- 41 transacciones importadas
- Similar situación: más gastos que ingresos
- **Falta**: Balance inicial de la cuenta

## 🔧 Soluciones Disponibles

### Opción 1: **Usar el Balance del CSV** (Recomendado si es preciso)

Si el "Saldo" final del CSV es correcto, podemos actualizar las cuentas manualmente:

1. Ve a **Settings** → **Bank Accounts**
2. Edita cada cuenta
3. Ingresa el **Balance Final** que aparece en tu CSV de Sabadell
4. El sistema lo marcará como `balance_source: 'manual'`

### Opción 2: **Re-subir el CSV Seleccionando la Cuenta**

Cuando vuelvas a subir un CSV:
1. **Selecciona la cuenta específica** en el selector
2. El sistema extraerá el `lastBalance` del CSV
3. Actualizará automáticamente el balance de esa cuenta

**Importante**: Esto sobrescribirá el balance actual con el del CSV.

### Opción 3: **Establecer Balance Inicial + Transacciones**

Para tener el balance más preciso:
1. Encuentra el balance inicial de la cuenta (antes de las transacciones)
2. Ingrésalo manualmente en Settings
3. El balance se calculará como: `balance_inicial + ingresos - gastos`

## 📊 Funcionalidades del Sistema

### 1. **Balance Automático desde CSV** ✅
- Formato: Sabadell, ING (parcial)
- Campo: "Saldo" (última línea)
- Requiere: Seleccionar cuenta al subir

### 2. **Balance Calculado desde Transacciones** ✅
- Disponible en Settings → botón "Recalculate balance"
- Fórmula: `SUM(ingresos) - SUM(gastos)`
- Marca como `balance_source: 'calculated'`

### 3. **Balance Manual** ✅
- Editar cuenta en Settings
- Ingresar balance manualmente
- Marca como `balance_source: 'manual'`

### 4. **Indicadores Visuales** ✅
- En Settings: Badge de fuente (CSV, Calculated, Manual)
- En Dashboard: Todas las cuentas visibles con badge "excluida" si aplica
- Fecha de última actualización

## 🚀 Mejora Futura Sugerida

### Auto-detectar Balance Inicial desde CSV

Modificar el parser para:
1. Extraer el **primer "Saldo"** del CSV (balance inicial)
2. Extraer el **último "Saldo"** del CSV (balance final)
3. Permitir al usuario elegir cuál usar

Esto requeriría modificar `parseSabadellCSV()` para guardar tanto `firstBalance` como `lastBalance`.

## 📝 Recomendación para el Usuario

### Para Corregir los Balances Actuales:

**Si tienes el CSV a mano:**
1. Abre el CSV en Excel
2. Ve a la **última fila con datos**
3. Mira la columna "Saldo"
4. Ve a **Settings** → Edita "Cuenta Sabadell Jaxo"
5. Ingresa ese saldo manualmente
6. Repite para "Cuenta Sabadell Joe"

**Si no tienes el CSV:**
1. Usa el botón **"Recalculate balance"** en Settings
2. Los balances calculados (-€2,749.49 y -€3,480.43) serán tu referencia
3. Si conoces tu balance real, ingrésalo manualmente

## 🎓 Entendiendo los Balances

### Balance Negativo NO es Error ❌

Un balance negativo puede significar:
- La cuenta está sobreggirada
- Solo se importó un periodo parcial (sin balance inicial)
- Hay más gastos que ingresos en el periodo

### Balance del Dashboard

El widget "Balance por Cuenta" ahora muestra:
- ✅ **Todas las cuentas** (incluidas y excluidas)
- ✅ Balance actual de cada una
- ✅ Total general
- ✅ Indicador de cuentas excluidas de estadísticas

---

**Fecha**: 2025-10-15  
**Transacciones Importadas**: 
  - Cuenta Jaxo: 85 transacciones
  - Cuenta Joe: 41 transacciones  
**Balance Total Calculado**: €1,439.26  
**Status**: ✅ Sistema funcionando correctamente






