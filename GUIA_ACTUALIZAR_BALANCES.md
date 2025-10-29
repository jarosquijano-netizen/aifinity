# 📘 Guía: Actualizar Balances Automáticamente desde CSV

## 🎯 Objetivo

Actualizar los balances de tus cuentas automáticamente re-subiendo los CSVs de Sabadell.

## ✅ Sistema Implementado

Ahora el sistema:
- ✅ Extrae automáticamente el balance del CSV
- ✅ Omite transacciones duplicadas (puedes re-subir sin problemas)
- ✅ Actualiza el balance de la cuenta seleccionada
- ✅ Es completamente escalable

## 📋 Paso a Paso

### 1. Preparar los CSVs

Asegúrate de tener los CSVs de Sabadell de cada cuenta:
- 📄 `cuenta_jaxo.csv` → Para "Cuenta Sabadell Jaxo"
- 📄 `cuenta_joe.csv` → Para "Cuenta Sabadell Joe"
- 📄 `cuenta_olivia.csv` → Para "Cuenta Sabadell Olivia"
- etc.

### 2. Subir el Primer CSV

1. Ve a **Upload** (📤) en el menú
2. **Arrastra o selecciona** el CSV (ej: `cuenta_jaxo.csv`)
3. **IMPORTANTE**: En el dropdown, selecciona **"Cuenta Sabadell Jaxo"**
4. Click en **"Process and Upload"**

### 3. Verificar el Resultado

Verás un mensaje como:

```
✅ Successfully processed 0 transactions!
⚠️ 81 duplicate(s) skipped
✅ Account balance updated from CSV
```

Esto significa:
- ✅ 0 transacciones nuevas (ya estaban)
- ⚠️ 81 duplicados omitidos (correcto!)
- ✅ Balance actualizado desde el CSV

### 4. Repetir para Cada Cuenta

Repite el proceso para cada cuenta:

#### Cuenta Joe:
- CSV: `cuenta_joe.csv`
- Seleccionar: **"Cuenta Sabadell Joe"**
- Upload

#### Cuenta Olivia:
- CSV: `cuenta_olivia.csv`
- Seleccionar: **"Cuenta Sabadell Olivia"**
- Upload

#### Cuenta Abril:
- CSV: `cuenta_abril.csv`
- Seleccionar: **"Cuenta Sabadell Abril"**
- Upload

### 5. Verificar en Dashboard

1. Ve al **Dashboard**
2. Busca el widget **"💰 Balance por Cuenta"**
3. Verás todos los balances actualizados:

```
Cuenta Sabadell Abril      €6,030.64 ← actualizado
Cuenta Sabadell Olivia     €1,624.30 ← actualizado
Cuenta Sabadell Jaxo       €X,XXX.XX ← actualizado
Cuenta Sabadell Joe        €X,XXX.XX ← actualizado
───────────────────────────────────────
Balance Total:             €X,XXX.XX
```

## 🔍 Importante: Seleccionar la Cuenta

El balance SOLO se actualiza si:
✅ Seleccionas la cuenta específica en el dropdown
✅ El CSV tiene el campo "Saldo" (CSVs de Sabadell lo tienen)

Si NO seleccionas cuenta:
- ❌ Las transacciones se suben sin cuenta específica
- ❌ El balance NO se actualiza automáticamente
- ⚠️ Tendrás que usar el botón "Recalculate balance" en Settings

## 🎓 ¿Qué Balance se Actualiza?

El sistema usa el **último "Saldo"** del CSV, que es el balance DESPUÉS de la última transacción del periodo.

Ejemplo de CSV de Sabadell:
```csv
F.Operativa,Concepto,F.Valor,Importe,Saldo
01/10/2025,Compra,01/10/2025,-50.00,1000.00
02/10/2025,Ingreso,02/10/2025,200.00,1200.00  ← Este saldo se usa
```

El sistema extraerá: **€1,200.00** como balance final.

## 🔄 Uso Mensual Recomendado

### Cada Mes:

1. **Descargar CSVs** del banco Sabadell
2. **Subir a Finova** seleccionando cada cuenta
3. ✅ Automáticamente:
   - Agrega solo transacciones nuevas
   - Omite duplicados
   - Actualiza balances
4. **Dashboard actualizado** sin esfuerzo

## 🐛 Troubleshooting

### "No veo el balance actualizado"
✅ Verifica que seleccionaste la cuenta en el dropdown
✅ Espera 5 segundos y recarga el Dashboard
✅ Verifica que el CSV tenga el campo "Saldo"

### "Se duplicaron las transacciones"
❌ Esto NO debería pasar con el nuevo sistema
✅ Si pasa, reporta el problema (bug)
✅ Usa "Delete All Transactions" en Settings para resetear

### "El balance es diferente al del banco"
✅ Verifica que el CSV sea el más reciente
✅ El balance del CSV es el del momento de la exportación
✅ Si hay transacciones posteriores, el banco tendrá más
✅ Puedes ajustar manualmente en Settings si es necesario

## 💡 Ventaja Clave: Sin Duplicados

Puedes re-subir el mismo CSV 100 veces:
- ✅ El sistema omite duplicados automáticamente
- ✅ El balance se actualiza cada vez
- ✅ Sin problemas, sin errores

## 🎯 Estado de Tus Cuentas Actualmente

Antes de re-subir CSVs:
```
Cuenta Sabadell Jaxo:    -€2,749.49 (calculado, sin balance CSV)
Cuenta Sabadell Joe:     -€3,480.43 (calculado, sin balance CSV)
Cuenta Sabadell Olivia:   €1,624.30 (manual)
Cuenta Sabadell Abril:    €6,030.64 (manual)
Cuenta Ahorro JAXO:       €14.24 (manual)
```

Después de re-subir CSVs con balance:
```
Cuenta Sabadell Jaxo:    €X,XXX.XX (desde CSV) ✅
Cuenta Sabadell Joe:     €X,XXX.XX (desde CSV) ✅
Cuenta Sabadell Olivia:  €X,XXX.XX (desde CSV) ✅
Cuenta Sabadell Abril:   €X,XXX.XX (desde CSV) ✅
Cuenta Ahorro JAXO:      €X,XXX.XX (desde CSV) ✅
```

## 📞 ¿Listo?

1. ✅ Encuentra tus CSVs de Sabadell
2. ✅ Ve a **Upload** (📤)
3. ✅ Sube cada CSV **seleccionando su cuenta**
4. ✅ ¡Disfruta de los balances actualizados!

---

**Método**: Opción B (Re-upload de CSVs) ✅  
**Escalabilidad**: Alta - Proceso repetible mensualmente  
**Esfuerzo**: Mínimo - 2 clicks por cuenta  
**Riesgo de Duplicados**: Cero - Sistema automático



