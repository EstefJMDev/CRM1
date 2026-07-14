# Estado de Funcionalidades

## Implementado

### Autenticacion y acceso

- login con email y contrasena
- logout
- sesion con JWT en cookie `httpOnly`
- bootstrap inicial del primer `SUPER_ADMIN`
- gestion de roles `SUPER_ADMIN`, `TENANT_ADMIN`, `USER`
- bloqueo de usuarios
- cambio de contrasena
- reseteo de contrasena temporal por `SUPER_ADMIN`
- invalidacion de sesiones mediante `sessionVersion`
- rate limit basico en login y alta inicial

### Contratos

- crear contratos
- editar contratos
- ver detalle completo
- eliminar contratos solo como `SUPER_ADMIN`
- filtros por busqueda, estado, agente, comercializadora y fechas
- orden configurable
- preferencias persistidas del dashboard
- historial de cambios de estado
- historial de interacciones
- exportacion a Excel

### Documentos

- subida de documentos a Vercel Blob
- descarga mediante ruta autenticada
- control de tipos de archivo peligrosos
- limite de tamano por archivo

### Consentimientos

- generar solicitud de consentimiento
- envio por email
- invalidacion de solicitudes pendientes anteriores
- pagina publica de revision y aceptacion
- descarga de PDF tras aprobacion
- historico de consentimientos
- notificaciones internas de consentimientos aprobados

### Usuarios

- edicion del propio perfil
- cambio de contrasena
- alta de usuarios por `SUPER_ADMIN`
- edicion de usuarios por `SUPER_ADMIN`
- desactivacion de usuarios
- reseteo de contrasenas temporales

### Datos auxiliares

- lookup postal por codigo ZIP
- script de enriquecimiento para contratos importados

## Pendiente o mejorable

- tests automatizados
- documentacion tecnica de arquitectura mas profunda
- recuperacion de contrasena por email
- validaciones de negocio mas estrictas en formularios
- auditoria funcional mas detallada
- previsualizacion richer de documentos
- observabilidad y monitorizacion

## Notas de producto

- `TENANT_ADMIN` y `SUPER_ADMIN` pueden ver todos los contratos
- `USER` solo ve sus propios contratos
- el registro directo no esta abierto de forma permanente
- no existe el rol `ADMIN`
