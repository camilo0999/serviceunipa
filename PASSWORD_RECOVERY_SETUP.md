# 📧 Guía de Configuración - Recuperación de Contraseña con Email

## ✅ ¿Qué se implementó?

Tu servidor ahora tiene la capacidad completa de:
1. ✅ Recibir solicitudes de recuperación de contraseña (`POST /auth/password/forgot`)
2. ✅ Generar tokens de recuperación seguros
3. ✅ Enviar emails con enlace de recuperación
4. ✅ Validar y restablecer la contraseña (`POST /auth/password/reset`)

---

## 🔧 Configuración Requerida

### 1. **Configurar variables de entorno (.env)**

Abre tu archivo `.env` y agrega estas líneas (o actualiza si ya existen):

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=noreply@unipacifico.edu.co
FRONTEND_URL=https://tu-dominio.com
```

### 2. **Si usas Gmail:**

1. Ve a [Google Account Security](https://myaccount.google.com/security)
2. Activa "Contraseñas de aplicación" (requiere autenticación de 2 pasos)
3. Copia la contraseña generada en `SMTP_PASSWORD`

### 3. **Si usas otro proveedor (Outlook, SendGrid, etc.):**

- **Outlook:** `SMTP_HOST=smtp-mail.outlook.com`, `SMTP_PORT=587`
- **SendGrid:** `SMTP_HOST=smtp.sendgrid.net`, `SMTP_USER=apikey`
- **Mailgun, AWS SES, etc.:** Consulta la documentación de tu proveedor

---

## 📱 Endpoints Disponibles

### 1️⃣ Solicitar recuperación de contraseña

**Endpoint:** `POST /auth/password/forgot`

**Request:**
```json
{
  "email": "usuario@unipacifico.edu.co"
}
```

**Response (éxito):**
```json
{
  "message": "Email de recuperación enviado exitosamente",
  "success": true
}
```

**Response (error):**
```json
{
  "statusCode": 404,
  "message": "User not found"
}
```

### 2️⃣ Restablecer contraseña

**Endpoint:** `POST /auth/password/reset`

**Request:**
```json
{
  "token": "abc123xyz...",
  "new_password": "NuevaContraseña123"
}
```

**Response (éxito):**
```json
{
  "message": "Password reset successful"
}
```

**Response (error):**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired token"
}
```

---

## 🧪 Pruebas

### Test local con Postman o cURL:

```bash
# 1. Solicitar recuperación
curl -X POST http://localhost:3000/auth/password/forgot \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@unipacifico.edu.co"}'

# 2. Esperar email y usar el token recibido
curl -X POST http://localhost:3000/auth/password/reset \
  -H "Content-Type: application/json" \
  -d '{"token":"TOKEN_DEL_EMAIL","new_password":"NuevaPassword123"}'
```

---

## 🔐 Seguridad

✅ **Tokens generados aleatoriamente** (32 bytes hex)  
✅ **Tokens hasheados en la BD** (SHA256)  
✅ **Expiración de 1 hora** (configurable)  
✅ **Invalidación de sesiones** al cambiar contraseña  
✅ **Contraseña hasheada con bcrypt** (salt 12)  

---

## 📧 Template de Email

El email incluye:
- Enlace personalizado para restaurar contraseña
- HTML responsive
- Mensaje de seguridad
- Información sobre expiración del token
- Branding de la Universidad del Pacífico

---

## ⚠️ Solución de problemas

### "Error: Invalid credentials"
- Verifica que `SMTP_USER` y `SMTP_PASSWORD` sean correctos
- Si usas Gmail, confirma que generaste una "App Password" (no la contraseña normal)

### "No se recibe el email"
- Revisa carpeta de SPAM
- Verifica que `SMTP_FROM` sea un email válido
- Confirma que `FRONTEND_URL` sea accesible

### "Token expired"
- El token expira en 1 hora. Solicita uno nuevo
- Puedes cambiar la expiración en el servicio si necesitas más tiempo

---

## 🚀 Próximas mejoras opcionales

1. **Rate limiting** en endpoint `/forgot` para prevenir spam
2. **Envío de email de confirmación** cuando se cambia la contraseña
3. **Histórico de intentos fallidos** de recuperación
4. **Código OTP de 6 dígitos** como alternativa al token por enlace
5. **Templates personalizados** para diferentes idiomas

---

## 📁 Archivos modificados

- ✅ `/src/modules/email/email.service.ts` - Nuevo servicio de emails
- ✅ `/src/modules/email/email.module.ts` - Módulo de emails
- ✅ `/src/modules/recuperacion-password/recuperacion-password.service.ts` - Integración de emails
- ✅ `/src/modules/recuperacion-password/recuperacion-password.module.ts` - Import del EmailModule
- ✅ `.env.example` - Variables SMTP necesarias

---

**¡Listo! Tu sistema de recuperación de contraseña ya está funcionando.** 🎉
