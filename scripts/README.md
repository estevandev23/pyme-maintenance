# Scripts de Desarrollo

Esta carpeta contiene scripts **temporales** para desarrollo y pruebas.

## ⚠️ Importante

- Estos scripts NO deben ir a producción
- Son solo para desarrollo local
- Pueden ser eliminados después de terminar el desarrollo

## 🗑️ Cuándo eliminar

Elimina toda la carpeta `scripts/` cuando:
1. Ya no necesites crear usuarios de prueba manualmente
2. El sistema tenga un panel de administración completo
3. Antes de hacer el deploy a producción

## 📝 Scripts Actuales

### `dev/create-admin.js`
Crea el usuario administrador inicial del sistema.

**Uso:**
```bash
node scripts/dev/create-admin.js
```

**Credenciales creadas:**
- Email: admin@mantenpro.com
- Password: admin123
- Role: ADMIN

### `dev/create-user.js`
Crea usuarios de prueba manualmente.

**Uso:**
1. Edita el archivo con los datos del usuario
2. Ejecuta: `node scripts/dev/create-user.js`
3. Guarda la contraseña mostrada

## 🔄 Alternativas en Producción

En lugar de estos scripts, el sistema final tendrá:

1. **Panel de Usuarios** (CRUD completo)
   - Los admins pueden crear usuarios desde la UI
   - Asignar contraseñas temporales
   - Gestionar roles y permisos

2. **Sistema de Registro** (opcional)
   - Auto-registro de empresas
   - Validación de email
   - Aprobación de admin

3. **Recuperación de Contraseña**
   - Reset por email
   - Tokens temporales
   - Sin acceso directo a la BD

## 🚀 Deploy a Producción

Antes de hacer deploy, elimina:
```bash
# Eliminar toda la carpeta scripts
rm -rf scripts/

# O solo los scripts de desarrollo
rm -rf scripts/dev/
```

Alternativamente, agrega a `.gitignore`:
```
scripts/dev/
scripts/*.js
```
