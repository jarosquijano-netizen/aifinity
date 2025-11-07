# Cómo Ver el Nuevo Widget "Balance por Cuenta"

## El widget no aparece porque el orden está guardado en localStorage

Sigue estos pasos:

### Opción 1: Resetear desde el Navegador (Recomendado)

1. Abre la **Consola del Navegador**:
   - Windows: `F12` o `Ctrl + Shift + I`
   - Mac: `Cmd + Option + I`

2. Ve a la pestaña **Console**

3. Pega este comando y presiona Enter:
   ```javascript
   localStorage.removeItem('dashboardWidgetOrder')
   ```

4. Refresca la página (`F5` o `Ctrl + R`)

5. ¡El nuevo widget aparecerá!

### Opción 2: Agregar Manualmente

Si prefieres no resetear todo, puedes agregar solo el nuevo widget:

1. Abre la Consola (`F12`)

2. Pega este código:
   ```javascript
   let order = JSON.parse(localStorage.getItem('dashboardWidgetOrder') || '[]');
   if (!order.includes('chart5')) {
     order.splice(8, 0, 'chart5'); // Agrega después del chart4
     localStorage.setItem('dashboardWidgetOrder', JSON.stringify(order));
     location.reload();
   }
   ```

### Opción 3: Limpiar Todo el Storage

En la Consola:
```javascript
localStorage.clear()
location.reload()
```

## ¿Qué Verás?

El nuevo widget **"💰 Balance por Cuenta"** mostrará:
- Gráfica de barras horizontal con todas tus cuentas
- Cada barra con el color de la cuenta
- Balance total en la parte inferior
- Ordenado de mayor a menor balance

## Ubicación del Widget

Por defecto aparecerá en la **5ta posición** (después de "Evolución Mensual"), pero puedes moverlo con drag & drop.

## ¿Tienes Cuentas Configuradas?

Si no ves datos en el widget:
1. Ve a **Settings**
2. Agrega algunas cuentas
3. Asigna balances iniciales
4. El widget se actualizará automáticamente






