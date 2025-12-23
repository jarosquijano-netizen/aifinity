# Deployment Rules - Reglas de Despliegue 🚀

## Regla Actual: Despliegue Automático a Producción

**IMPORTANTE:** En este proyecto, **TODOS los cambios se despliegan automáticamente a PRODUCCIÓN**.

### Flujo de Trabajo Actual

1. **Desarrollo**: Todos los cambios se hacen directamente en la rama `main`
2. **Commit**: Los cambios se hacen commit directamente a `main`
3. **Push**: Los cambios se suben inmediatamente a `origin/main` (producción)
4. **Despliegue**: Los cambios están disponibles en producción inmediatamente después del push

### ⚠️ Advertencia

**Esta regla aplica SOLO mientras hay un solo usuario/desarrollador activo.**

### Cambio Futuro

Cuando haya más usuarios o desarrolladores trabajando en el proyecto, esta regla cambiará a:

- **Rama de desarrollo**: `develop` o `dev`
- **Rama de producción**: `main` o `master`
- **Proceso**: Pull Requests → Code Review → Merge a `main` → Despliegue a producción
- **Protección de rama**: La rama `main` estará protegida y requerirá aprobación antes de merge

### Notas

- No hay ambiente de staging/testing separado actualmente
- Todos los cambios son inmediatos en producción
- Se recomienda probar localmente antes de hacer push
- Los commits deben ser descriptivos para facilitar el rollback si es necesario

---

**Última actualización**: Enero 2025  
**Estado**: Activo - Despliegue directo a producción  
**Próxima revisión**: Cuando haya más de un usuario/desarrollador activo

