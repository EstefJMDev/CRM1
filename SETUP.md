# Guía de Configuración - CRM Gestión de Contratos

## 🚀 Primeros Pasos

Tu CRM está listo para configurar. Sigue estos pasos:

### 1️⃣ Opción A: Usar Supabase (Recomendado - Gratis)

Supabase proporciona PostgreSQL gratis sin necesidad de infraestructura.

**Pasos:**
1. Accede a https://supabase.com
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Ve a **Settings → Database**
5. Copia la **Connection String (URI)** de PostgreSQL
6. Pega en `.env.local`:

```env
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
```

### 1️⃣ Opción B: PostgreSQL Local

Si prefieres PostgreSQL local en tu máquina:

**Linux/Mac:**
```bash
brew install postgresql
brew services start postgresql
createdb crm_db
```

**Windows:**
- Descarga desde https://www.postgresql.org/download/windows/
- Durante instalación, recuerda la contraseña del usuario `postgres`
- Abre pgAdmin y crea base de datos `crm_db`

**Cadena de conexión:**
```env
DATABASE_URL="postgresql://postgres:tu_contraseña@localhost:5432/crm_db"
```

### 1️⃣ Opción C: Docker

```bash
docker run --name crm-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=crm_db -p 5432:5432 -d postgres
```

### 2️⃣ Configurar Variables de Entorno

1. Abre `.env.local`
2. Actualiza `DATABASE_URL` con tu cadena de conexión
3. Genera `NEXTAUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `NEXTAUTH_SECRET`

### 3️⃣ Crear Base de Datos

```bash
npx prisma migrate dev --name init
```

Esto:
- ✅ Crea todas las tablas
- ✅ Ejecuta las migraciones
- ✅ Genera el cliente Prisma

### 4️⃣ Iniciar el servidor

```bash
npm run dev
```

### 5️⃣ Primer usuario (Admin)

Accede a http://localhost:3000 y:
1. Haz clic en "Registrarse"
2. Completa el formulario
3. El usuario se crea como USER automáticamente

**Para hacerlo ADMIN:**

Abre una terminal psql y ejecuta:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'tu@email.com';
```

O usa Prisma Studio:
```bash
npx prisma studio
```

### ✅ ¡Listo!

Ahora puedes:
- 🔐 Inicia sesión en http://localhost:3000/auth/login
- ➕ Crear contratos
- 📋 Ver tu listado
- 🔍 Buscar y filtrar
- 💬 Agregar interacciones

## 📊 Verificar la Base de Datos

### Con Prisma Studio (UI visual)
```bash
npx prisma studio
```

Se abre en http://localhost:5555

### Con psql (línea de comandos)
```bash
psql -U postgres -d crm_db

# Ver tablas
\dt

# Ver estructura de tabla
\d users

# Ver datos
SELECT * FROM users;
```

### Con Supabase
- Inicia sesión en https://supabase.com
- Ve a tu proyecto
- Haz clic en **Table Editor** en el menú lateral

## 🔄 Comandos Útiles de Prisma

```bash
# Ver estado de migraciones
npx prisma migrate status

# Crear nueva migración
npx prisma migrate dev --name agregar_campos

# Resetear base de datos (⚠️ ELIMINA TODOS LOS DATOS)
npx prisma migrate reset

# Generar cliente (después de cambiar schema.prisma)
npx prisma generate

# Abrir Prisma Studio
npx prisma studio
```

## 🆘 Solución de Problemas

### Error: "ECONNREFUSED - No connection to database"
- ✅ Verifica que PostgreSQL esté corriendo
- ✅ Verifica DATABASE_URL en `.env.local`
- ✅ Comprueba usuario/contraseña
- ✅ Comprueba que la base de datos existe

### Error: "No such migration was found"
```bash
# Resetea las migraciones
npx prisma migrate reset
```

### Error: "P1000 Authentication failed"
- ✅ Verifica la contraseña en DATABASE_URL
- ✅ Verifica que el usuario tiene permisos

### La aplicación no carga datos
- ✅ Verifica el token en localStorage (F12 → Storage)
- ✅ Verifica que el usuario fue creado correctamente
- ✅ Abre la consola del navegador (F12) para ver errores

## 📱 Crear Usuarios de Prueba

### Usuario Normal
1. Accede a http://localhost:3000/auth/register
2. Completa el formulario
3. Se crea como USER automáticamente

### Usuario Admin
1. Crea un usuario normal
2. Ejecuta en la terminal:
```bash
npx prisma studio
```
3. Ve a la tabla `users`
4. Edita el `role` a `ADMIN`

## 🚀 Próximos Pasos

Después de la configuración inicial:

1. **Agregar más usuarios** - Cada usuario registrado puede crear contratos
2. **Crear contratos de prueba** - Prueba el flujo completo
3. **Configurar email** (Opcional) - Para notificaciones
4. **Backup de datos** - Configura backups automáticos en Supabase
5. **Deployment** - Deploya en Vercel o similar

## 💡 Tips

- Los **Admins** ven todos los contratos de todos los usuarios
- Los **Usuarios normales** solo ven sus propios contratos
- Las **contraseñas** se hashean automáticamente con bcryptjs
- Los **tokens JWT** expiran en 24 horas

## 📞 Soporte

Si tienes problemas:
1. Verifica el archivo .env.local
2. Comprueba que PostgreSQL está corriendo
3. Mira los logs de la aplicación (F12 en el navegador)
4. Consulta la documentación de Prisma: https://www.prisma.io/docs/

¡Éxito! 🎉
