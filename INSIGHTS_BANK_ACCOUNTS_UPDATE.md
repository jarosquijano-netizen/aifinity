# Insights - Estado por Cuenta Bancaria ✅

## 📋 Resumen

Añadida nueva sección en Insights que muestra el **estado individual de cada cuenta bancaria**, permitiendo al usuario ver de un vistazo qué cuentas (Sabadell Joe, Sabadell Jaxo, etc.) tienen balance saludable y cuáles necesitan atención.

## 🎯 Problema Resuelto

**ANTES:**
- ❌ No había información específica por cuenta bancaria
- ❌ Solo mostraba balance total consolidado
- ❌ No se sabía qué cuentas específicas estaban bajas de fondos
- ❌ No había contexto sobre tipo de cuenta (ahorro, corriente, etc.)

**AHORA:**
- ✅ Análisis individual de cada cuenta
- ✅ Estados visuales por cuenta (✅ / ⚠️ / 🔴)
- ✅ Balance específico de cada cuenta
- ✅ Tipo de cuenta identificado (ahorro, corriente, inversión, crédito)
- ✅ Indicadores de cuentas excluidas de estadísticas
- ✅ Ordenado por balance (mayor a menor)

## 🏦 Nueva Sección: Estado por Cuenta Bancaria

### Ubicación
Se encuentra en la sección **"3. Estado Global de tu Economía"**, después del análisis de ahorro y antes de las acciones recomendadas.

### Estructura Visual

```
┌──────────────────────────────────────────────────────┐
│ 🏦 Estado por Cuenta Bancaria                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ✅ Sabadell Joe                          €560.26     │
│ 🏦 Cuenta corriente • Balance saludable              │
│                                                       │
│ ⚠️ Sabadell Jaxo                         €145.80     │
│ 🏦 Cuenta corriente • Balance bajo, considera       │
│                      transferir fondos               │
│                                                       │
│ 🔴 Cuenta Ahorro  [excluida]             €25.00      │
│ 💰 Cuenta de ahorro • Balance crítico,               │
│                       necesitas ingresar dinero      │
└──────────────────────────────────────────────────────┘
```

## 🎨 Estados de Cuenta

### Criterios de Estado

| Estado | Balance | Color | Icono | Mensaje |
|--------|---------|-------|-------|---------|
| **Saludable** | > €500 | 🟢 Verde | ✅ | "Balance saludable" |
| **Medio** | €100 - €500 | 🟡 Ámbar | ⚠️ | "Balance bajo, considera transferir fondos" |
| **Crítico** | < €100 | 🔴 Rojo | 🔴 | "Balance crítico, necesitas ingresar dinero" |

### Tipos de Cuenta

| Tipo | Icono | Etiqueta |
|------|-------|----------|
| `checking` | 🏦 | Cuenta corriente |
| `savings` | 💰 | Cuenta de ahorro |
| `investment` | 📈 | Cuenta de inversión |
| `credit` | 💳 | Tarjeta de crédito |
| Sin tipo | 🏦 | Cuenta bancaria |

### Indicadores Especiales

**Cuenta excluida de estadísticas:**
```
✅ Sabadell Joe  [excluida]  €560.26
```
- Badge gris con texto "excluida"
- Opacidad reducida (60%)
- Indica que no se incluye en cálculos generales

## 💡 Lógica de Análisis

### Cálculo del Estado por Cuenta

```javascript
const accountsWithActivity = data.accounts.map(account => {
  const accountBalance = parseFloat(account.balance || 0);
  
  // Determinar estado basado en balance
  const balanceStatus = 
    accountBalance > 500 ? 'good' :      // Verde
    accountBalance > 100 ? 'medium' :    // Ámbar
    'low';                                // Rojo
  
  return {
    name: account.name,
    balance: accountBalance,
    balanceStatus,
    accountType: account.account_type || 'checking',
    excludedFromStats: account.exclude_from_stats || false
  };
}).sort((a, b) => b.balance - a.balance);  // Ordenar por balance (mayor primero)
```

### Ordenamiento

Las cuentas se muestran ordenadas por **balance descendente**:

```
1. Sabadell Joe      €560.26  (mayor balance primero)
2. Sabadell Jaxo     €145.80
3. Cuenta Ahorro     €25.00   (menor balance último)
```

**Razón**: Poner las cuentas con más fondos primero ayuda a identificar rápidamente dónde hay liquidez disponible.

## 📊 Casos de Uso

### Caso 1: Usuario con múltiples cuentas

**Situación:**
- Sabadell Joe: €560.26
- Sabadell Jaxo: €145.80
- Cuenta Ahorro: €25.00

**Resultado:**
```
🏦 Estado por Cuenta Bancaria

✅ Sabadell Joe                           €560.26
🏦 Cuenta corriente • Balance saludable

⚠️ Sabadell Jaxo                          €145.80
🏦 Cuenta corriente • Balance bajo, considera transferir fondos

🔴 Cuenta Ahorro                          €25.00
💰 Cuenta de ahorro • Balance crítico, necesitas ingresar dinero
```

**Acción clara**: 
- Sabadell Joe está bien
- Considera transferir fondos a Sabadell Jaxo
- Urgente ingresar dinero en Cuenta Ahorro

### Caso 2: Usuario con cuenta excluida

**Situación:**
- Sabadell Joe: €560.26 (incluida)
- Cuenta Personal: €200.00 (excluida de estadísticas)

**Resultado:**
```
✅ Sabadell Joe                           €560.26
🏦 Cuenta corriente • Balance saludable

⚠️ Cuenta Personal  [excluida]            €200.00
🏦 Cuenta corriente • Balance bajo, considera transferir fondos
```

**Indicador visual**: La cuenta excluida tiene opacidad reducida y badge "excluida".

### Caso 3: Diferentes tipos de cuenta

**Situación:**
- Sabadell Joe (corriente): €560.26
- BBVA Ahorro (savings): €1,200.00
- Trading212 (investment): €3,500.00

**Resultado:**
```
✅ Trading212                             €3,500.00
📈 Cuenta de inversión • Balance saludable

✅ BBVA Ahorro                            €1,200.00
💰 Cuenta de ahorro • Balance saludable

✅ Sabadell Joe                           €560.26
🏦 Cuenta corriente • Balance saludable
```

### Caso 4: Sin cuentas registradas

**Situación:**
- No hay cuentas bancarias en el sistema

**Resultado:**
```
🏦 Estado por Cuenta Bancaria

┌────────────────────────────────────────┐
│ No hay cuentas bancarias registradas   │
└────────────────────────────────────────┘
```

## 🎨 Diseño y UX

### Jerarquía Visual

1. **Header con icono** (Building2) y título
2. **Cards por cuenta** con:
   - Borde de color según estado
   - Icono de estado (✅/⚠️/🔴)
   - Nombre de la cuenta
   - Badge si está excluida
   - Balance con color dinámico
   - Tipo de cuenta con icono
   - Mensaje descriptivo

### Colores Semánticos

**Verde (Balance saludable):**
```css
bg-green-50 dark:bg-green-900/20
border-green-500
text-green-600 dark:text-green-400
```

**Ámbar (Balance medio):**
```css
bg-amber-50 dark:bg-amber-900/20
border-amber-500
text-amber-600 dark:text-amber-400
```

**Rojo (Balance crítico):**
```css
bg-red-50 dark:bg-red-900/20
border-red-500
text-red-600 dark:text-red-400
```

### Responsive Design

- ✅ Se adapta a pantallas móviles
- ✅ Cards apilables verticalmente
- ✅ Texto legible en todos los tamaños
- ✅ Iconos proporcionales

## 🧪 Testing

### Test 1: Verificar estados de cuenta
1. Ve a **Insights**
2. Scroll a **"Estado por Cuenta Bancaria"**
3. Verifica que cada cuenta muestre:
   - ✅ Icono correcto (✅/⚠️/🔴)
   - ✅ Balance correcto
   - ✅ Color apropiado al estado
   - ✅ Mensaje descriptivo

### Test 2: Verificar ordenamiento
1. Crea cuentas con diferentes balances:
   - Cuenta A: €100
   - Cuenta B: €500
   - Cuenta C: €50
2. Ve a Insights
3. **Verifica orden**: Cuenta B → Cuenta A → Cuenta C

### Test 3: Cuenta excluida de estadísticas
1. Marca una cuenta como "excluir de estadísticas" en Settings
2. Ve a Insights
3. Verifica:
   - ✅ Badge "excluida" visible
   - ✅ Opacidad reducida
   - ✅ Aparece en la lista

### Test 4: Tipos de cuenta
1. Crea cuentas de diferentes tipos:
   - Checking
   - Savings
   - Investment
   - Credit
2. Ve a Insights
3. Verifica iconos:
   - 🏦 Corriente
   - 💰 Ahorro
   - 📈 Inversión
   - 💳 Crédito

### Test 5: Sin cuentas
1. Elimina todas las cuentas bancarias
2. Ve a Insights
3. Verifica mensaje:
   - "No hay cuentas bancarias registradas"

## 🔧 Implementación Técnica

### Estructura de Datos

```javascript
const accountsWithActivity = [
  {
    name: "Sabadell Joe",
    balance: 560.26,
    balanceStatus: "good",        // 'good' | 'medium' | 'low'
    accountType: "checking",      // 'checking' | 'savings' | 'investment' | 'credit'
    excludedFromStats: false      // boolean
  },
  {
    name: "Sabadell Jaxo",
    balance: 145.80,
    balanceStatus: "medium",
    accountType: "checking",
    excludedFromStats: false
  }
]
```

### Componente React

```jsx
<div className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 border-2 border-blue-300">
  <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
    <Building2 className="w-5 h-5" />
    🏦 Estado por Cuenta Bancaria
  </h4>
  
  <div className="space-y-3">
    {accountsWithActivity.map((account, idx) => (
      <div key={idx} className={`p-3 rounded-lg border-l-4 ${getColorClass(account.balanceStatus)}`}>
        {/* Account info */}
      </div>
    ))}
  </div>
</div>
```

### Función de Color

```javascript
const getColorClass = (status) => {
  switch(status) {
    case 'good': return 'bg-green-50 border-green-500';
    case 'medium': return 'bg-amber-50 border-amber-500';
    case 'low': return 'bg-red-50 border-red-500';
    default: return 'bg-gray-50 border-gray-500';
  }
};
```

## 📝 Archivos Modificados

- ✅ `frontend/src/components/Insights.jsx`
  - Añadido análisis de cuentas (líneas 153-165)
  - Añadida sección UI de cuentas (líneas 703-760)
  - Importado icono `Building2`

## 💡 Beneficios

### 1. **Visibilidad por Cuenta**
- ✅ Ver estado de "Sabadell Joe" vs "Sabadell Jaxo"
- ✅ Identificar qué cuenta necesita fondos
- ✅ Planificar transferencias entre cuentas

### 2. **Contexto de Tipo**
- ✅ Diferenciar cuentas de ahorro de corrientes
- ✅ Saber dónde está tu dinero (ahorro, inversión, etc.)
- ✅ Iconos visuales ayudan a identificación rápida

### 3. **Priorización Clara**
- ✅ Ordenamiento por balance (mayor primero)
- ✅ Estados visuales (✅/⚠️/🔴)
- ✅ Mensajes accionables

### 4. **Gestión Excluidas**
- ✅ Ver cuentas excluidas de estadísticas
- ✅ Badge visual claro
- ✅ No confundir con cuentas activas

### 5. **Toma de Decisiones**
- ✅ "¿De qué cuenta puedo gastar?" → Sabadell Joe (€560)
- ✅ "¿Qué cuenta necesita fondos?" → Sabadell Jaxo (€145)
- ✅ "¿Dónde tengo mi ahorro?" → Cuenta Ahorro (💰)

## 🚀 Mejoras Futuras

### Posibles Extensiones

1. **Actividad por Cuenta**
   ```
   Sabadell Joe • €560.26
   • 15 transacciones este mes
   • Gasto promedio: €45/transacción
   ```

2. **Tendencia de Balance**
   ```
   Sabadell Joe • €560.26 ↗️ +15%
   (vs mes anterior: €487.18)
   ```

3. **Alertas Personalizadas**
   ```
   ⚠️ Sabadell Jaxo está por debajo de €200 por primera vez
   ```

4. **Gráfico de Distribución**
   - Pie chart mostrando % de fondos en cada cuenta

5. **Proyección por Cuenta**
   ```
   Al ritmo actual, Sabadell Jaxo llegará a €0 en 5 días
   ```

## 🐛 Troubleshooting

### "No veo mis cuentas"
✅ **Verifica**:
1. Tienes cuentas creadas en Settings
2. Las cuentas tienen balance > 0
3. Hiciste hard refresh: `Ctrl + Shift + R`

### "El balance no coincide"
✅ **Verifica**:
1. El balance se actualizó en Settings
2. Re-cargaste Insights después de cambios
3. La cuenta no está duplicada

### "Todas aparecen como 'Cuenta bancaria'"
✅ **Es normal si**:
- No has configurado el tipo de cuenta en Settings
- Puedes editarlo desde Settings → Tipo de cuenta

### "Una cuenta no aparece"
✅ **Verifica**:
1. La cuenta existe en la base de datos
2. No está siendo filtrada (todas se muestran, incluso excluidas)
3. Console del navegador no tiene errores

## 📊 Métricas

**Información mostrada:**
- Número de cuentas: N
- Por cada cuenta:
  - Nombre
  - Balance
  - Estado (saludable/medio/crítico)
  - Tipo (corriente/ahorro/inversión/crédito)
  - Si está excluida

**Ordenamiento:**
- Descendente por balance (€ mayor → € menor)

**Performance:**
- O(n log n) por ordenamiento
- Negligible para < 20 cuentas

---

**Fecha**: 2025-10-16  
**Version**: 1.0  
**Status**: ✅ Implementado y Funcional  
**No Linter Errors**: ✅  






