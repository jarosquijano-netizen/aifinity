# 🔍 Actualización Automática de Transacciones Similares

## Resumen

Cuando actualizas la categoría de una transacción individual, el sistema puede buscar automáticamente otras transacciones con descripciones **≥90% similares** y actualizarlas todas de una vez.

## 🎯 ¿Cómo Funciona?

### Algoritmo de Similitud

El sistema utiliza el **algoritmo de distancia de Levenshtein** para calcular la similitud entre descripciones:

```javascript
// Ejemplo:
"AMAZON EU SARL Luxembourg" vs "AMAZON EU SARL Luxembourg"
→ 100% similar ✅

"AMAZON EU SARL Luxembourg" vs "AMAZON EU SARL Luxemburg"  
→ 96.7% similar ✅ (se actualizará)

"AMAZON EU SARL Luxembourg" vs "MERCADONA S.A."
→ 23.1% similar ❌ (no se actualizará)
```

### Umbral de Similitud

- **Mínimo requerido**: 90%
- **Normalizaciones aplicadas**:
  - Conversión a minúsculas
  - Eliminación de espacios extra
  - Comparación carácter por carácter

## 📝 Uso en la Interfaz

### 1. Abre el Modal de Actualización

En la tabla de **Transactions**, haz click en cualquier categoría para abrir el modal de actualización.

### 2. Activa el Checkbox

Verás un checkbox azul con la opción:

```
✅ Actualizar transacciones similares

Se actualizarán automáticamente todas las transacciones 
con descripciones 90% similares a esta
```

### 3. Selecciona la Nueva Categoría

Elige la categoría a la que quieres cambiar.

### 4. Confirma

Haz click en **"Actualizar Categoría"**.

## 💬 Mensajes de Confirmación

### Caso 1: Transacciones Similares Encontradas

```
✅ Categoría actualizada exitosamente!
📊 5 transacciones actualizadas en total
🔍 4 transacciones similares (≥90%) encontradas y actualizadas
```

### Caso 2: No se Encontraron Similares

```
✅ Categoría actualizada exitosamente
🔍 No se encontraron transacciones similares (≥90%)
```

### Caso 3: Checkbox Desactivado

```
✅ Categoría actualizada exitosamente
```

## 🖥️ Logs del Servidor

Cuando se actualizan transacciones similares, el backend muestra información detallada en la consola:

```
🔍 Found 3 similar transactions (≥90% similarity):
   1. [95.5%] AMAZON EU SARL Luxembourg - Compra online...
   2. [92.3%] AMAZON EU SARL Luxemburg - Envío express...
   3. [91.0%] AMAZON EU SARL Luxembourg - Devolución...
✅ Updating all to category: "Otras compras"
```

## 🎯 Ejemplos de Uso Real

### Ejemplo 1: Suscripciones Mensuales

**Transacción original**:
```
SPOTIFY P13CE78E7A Stockholm
```

**Transacciones similares encontradas** (≥90%):
- `SPOTIFY P13CE78E7A Stockholm` (100%)
- `SPOTIFY P14AB12C8D Stockholm` (95.2%)
- `SPOTIFY P15XY34F9G Stockholm` (95.2%)

**Resultado**: Todas cambiadas de "Otros gastos" → "Entretenimiento"

### Ejemplo 2: Compras en el Mismo Supermercado

**Transacción original**:
```
MERCADONA 1234 MADRID
```

**Transacciones similares encontradas** (≥90%):
- `MERCADONA 1234 MADRID` (100%)
- `MERCADONA 5678 MADRID` (95.5%)
- `MERCADONA 1234 BARCELONA` (90.9%)

**Resultado**: Todas cambiadas a "Supermercado"

### Ejemplo 3: Pagos de Servicios

**Transacción original**:
```
ENDESA ENERGIA XXL SA
```

**Transacciones similares encontradas** (≥90%):
- `ENDESA ENERGIA XXL SA` (100%)
- `ENDESA ENERGIA XXL S.A.` (97.2%)

**Resultado**: Todas cambiadas a "Electricidad"

## ⚙️ Implementación Técnica

### Backend (`backend/routes/transactions.js`)

```javascript
// Líneas 184-219
if (updateSimilar) {
  // 1. Obtener todas las transacciones del usuario
  const allTransactions = await client.query(...);
  
  // 2. Calcular similitud con cada transacción
  for (const t of allTransactions.rows) {
    const similarity = calculateSimilarity(
      transaction.description, 
      t.description
    );
    
    // 3. Si similitud ≥ 90%, agregar a la lista
    if (t.id !== parseInt(id) && similarity >= 0.90) {
      similarIds.push(t.id);
    }
  }
  
  // 4. Actualizar todas las transacciones similares
  if (similarIds.length > 0) {
    await client.query(
      'UPDATE transactions SET category = $1 WHERE id = ANY($2)',
      [category, similarIds]
    );
  }
}
```

### Frontend (`frontend/src/components/CategoryModal.jsx`)

```jsx
// Líneas 55-70
if (result.similarUpdated > 0) {
  setMessage({
    type: 'success',
    text: `✅ Categoría actualizada exitosamente!
📊 ${result.updatedCount} transacciones actualizadas en total
🔍 ${result.similarUpdated} transacciones similares (≥90%) encontradas y actualizadas`
  });
}
```

## 🔄 Diferencia con Bulk Update

| Característica | Actualización Similar | Bulk Update |
|---------------|----------------------|-------------|
| **Trigger** | Checkbox en modal individual | Selección manual con checkboxes |
| **Criterio** | Similitud ≥90% automática | Selección manual del usuario |
| **Uso típico** | Categorizar transacciones recurrentes | Corrección masiva de errores |
| **Velocidad** | Instantáneo | Requiere selección manual |

## 🎨 Mejoras Implementadas

### ✅ Frontend
1. **Mensajes multilinea** con `whitespace-pre-line`
2. **Iconos actualizados** (`CheckCircle2`, `AlertCircle`)
3. **Espaciado mejorado** (`items-start`, `space-x-3`, `p-4`)
4. **Tiempo de cierre extendido** a 2 segundos para leer el mensaje

### ✅ Backend
1. **Logs detallados** en consola del servidor
2. **Porcentaje de similitud** mostrado para cada transacción
3. **Descripción truncada** para mejor legibilidad
4. **Contador de actualizaciones** en la respuesta JSON

## 📊 Estadísticas de Uso

El sistema retorna:
- `updatedCount`: Total de transacciones actualizadas (incluye la original)
- `similarUpdated`: Número de transacciones similares encontradas

## 🛡️ Consideraciones

### Ventajas
- ✅ Ahorra tiempo en categorización de transacciones recurrentes
- ✅ Mantiene consistencia en categorías similares
- ✅ Reduce errores de categorización manual

### Limitaciones
- ⚠️ Solo funciona con descripciones muy similares (≥90%)
- ⚠️ No aplica en bulk update (ya es manual)
- ⚠️ Requiere activación explícita del usuario

## 🔮 Posibles Mejoras Futuras

1. **Ajuste del umbral**: Permitir al usuario configurar el % mínimo (85%, 90%, 95%)
2. **Vista previa**: Mostrar lista de transacciones que se actualizarán antes de confirmar
3. **Machine Learning**: Aprender patrones de categorización del usuario
4. **Historial**: Deshacer actualizaciones masivas recientes

---

**Fecha de implementación**: Original - Anterior
**Mejoras aplicadas**: 16 de Octubre, 2025
**Estado**: ✅ Activo y funcionando






