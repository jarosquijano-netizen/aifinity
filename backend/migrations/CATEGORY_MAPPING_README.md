# Category Mapping Migration Guide

This migration system merges English categories to Spanish and converts all categories to hierarchical format (`Group > Category`).

## 📋 What This Does

1. **Merges English → Spanish categories:**
   - `Shopping` → `Compras > Compras`
   - `Groceries` → `Alimentación > Supermercado`
   - `Transport` → `Transporte > Transportes`
   - etc.

2. **Converts to hierarchical format:**
   - `Hogar` → `Vivienda > Hogar`
   - `Supermercado` → `Alimentación > Supermercado`
   - etc.

3. **Handles special cases:**
   - Flags `Fraccionar` for manual review
   - Flags `Digital Payments` for deletion (too vague)
   - Flags `Reembolsos` as non-expenses

4. **Cleans up unused budget categories:**
   - Deletes categories with 0€ budget AND 0€ spent

## 🚀 How to Run

### Option 1: Via API Endpoints (Recommended)

```bash
# Run category mapping migration
curl -X POST http://localhost:5000/api/cleanup/category-mapping

# Cleanup unused budget categories
curl -X POST http://localhost:5000/api/cleanup/unused-budgets
```

### Option 2: Direct Script Execution

```bash
# Run category mapping migration
cd backend
node migrations/category-mapping-migration.js

# Cleanup unused budget categories
node migrations/cleanup-unused-budget-categories.js
```

## 📊 Category Mapping

### Complete Mapping Structure

```
Vivienda > Hogar
Vivienda > Hipoteca
Vivienda > Alquiler y compra
Vivienda > Mantenimiento hogar
Vivienda > Otros vivienda
Vivienda > Servicio doméstico
Vivienda > Alarmas y seguridad
Vivienda > Comunidad

Alimentación > Supermercado
Alimentación > Restaurante

Transporte > Transportes
Transporte > Gasolina
Transporte > Mantenimiento vehículo
Transporte > Alquiler vehículos
Transporte > Parking y peaje
Transporte > Compra vehículo

Salud > Médico
Salud > Farmacia
Salud > Óptica y dentista
Salud > Otros salud, saber y deporte

Seguros > Seguro salud
Seguros > Seguro hogar
Seguros > Seguro auto
Seguros > Otros seguros

Servicios > Agua
Servicios > Electricidad
Servicios > Internet
Servicios > Móvil
Servicios > Televisión
Servicios > Cargos bancarios
Servicios > Servicios y productos online
Servicios > Otros servicios

Compras > Compras
Compras > Otras compras
Compras > Ropa
Compras > Electrónica

Ocio > Entretenimiento
Ocio > Otros ocio
Ocio > Espectáculos
Ocio > Hotel
Ocio > Loterías

Educación > Estudios
Educación > Librería

Deporte > Deporte
Deporte > Material deportivo

Personal > Regalos
Personal > Belleza
Personal > Niños y mascotas

Asociaciones > Asociaciones

Organismos > Impuestos
Organismos > Seguridad Social
Organismos > Ayuntamiento
Organismos > Otros organismos
Organismos > Multas y licencias

Profesionales > Asesores y abogados

Finanzas > Ingresos
Finanzas > Transferencias
Finanzas > Ahorro e inversiones
Finanzas > Préstamos
Finanzas > Efectivo

Otros > Otros
Otros > Otros gastos
Otros > Sin categoría
```

## ⚠️ Special Cases

These categories need manual review:

- **Fraccionar** - Payment installments (review and categorize as loan payments or purchase installments)
- **Digital Payments** - Too vague, should be deleted and categorized individually
- **Reembolsos** - Reimbursements, not expenses (should be excluded)

## 🗑️ Categories to Delete

These budget categories will be deleted if they have 0€ budget AND 0€ spent:

- Alquiler vehículos
- Alquiler y compra
- Asesores y abogados
- Ayuntamiento
- Espectáculos
- Loterías
- Mantenimiento vehículo
- Material deportivo
- Multas y licencias
- Niños y mascotas
- Otras compras
- Otros ocio
- Otros organismos
- Otros seguros
- Otros servicios
- Seguridad Social
- Seguro auto
- Seguro hogar

**Note:** `Transferencias` is kept but flagged as non-expense.

## 📝 After Migration

1. Review special cases manually
2. Verify category display in Budget tab (should show group badges)
3. Check that all transactions are properly categorized
4. Verify budget totals are correct

## 🔄 Frontend Display

The frontend automatically displays hierarchical categories with:
- **Group badge** (e.g., "Vivienda") in gray
- **Category name** (e.g., "Hogar") as main text

Example: `Vivienda > Hogar` displays as:
```
[Vivienda] Hogar
```

