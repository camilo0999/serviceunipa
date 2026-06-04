-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('estudiante', 'operador_comedor', 'operador_bus', 'administrador');

-- CreateEnum
CREATE TYPE "TurnoUsuario" AS ENUM ('dia', 'noche', 'mixto');

-- CreateEnum
CREATE TYPE "PlataformaDispositivo" AS ENUM ('android', 'ios');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo_estudiantil" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'estudiante',
    "turno" "TurnoUsuario" NOT NULL DEFAULT 'dia',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "foto_url" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "refresh_token" VARCHAR(512) NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "revocada" BOOLEAN NOT NULL DEFAULT false,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_blacklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_jti" VARCHAR(36) NOT NULL,
    "usuario_id" UUID NOT NULL,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "plataforma" "PlataformaDispositivo" NOT NULL,
    "modelo" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_uso" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recuperacion_password" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recuperacion_password_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID,
    "accion" VARCHAR(100) NOT NULL,
    "tabla_afectada" VARCHAR(100) NOT NULL,
    "registro_id" UUID,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "ip_address" INET,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigo_estudiantil_key" ON "usuarios"("codigo_estudiantil");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_codigo_estudiantil_idx" ON "usuarios"("codigo_estudiantil");

-- CreateIndex
CREATE INDEX "usuarios_rol_turno_idx" ON "usuarios"("rol", "turno");

-- CreateIndex
CREATE INDEX "usuarios_activo_idx" ON "usuarios"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_refresh_token_key" ON "sesiones"("refresh_token");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- CreateIndex
CREATE INDEX "sesiones_refresh_token_idx" ON "sesiones"("refresh_token");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_revocada_idx" ON "sesiones"("usuario_id", "revocada");

-- CreateIndex
CREATE INDEX "sesiones_expira_en_idx" ON "sesiones"("expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "token_blacklist_token_jti_key" ON "token_blacklist"("token_jti");

-- CreateIndex
CREATE INDEX "token_blacklist_token_jti_idx" ON "token_blacklist"("token_jti");

-- CreateIndex
CREATE INDEX "token_blacklist_expira_en_idx" ON "token_blacklist"("expira_en");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_fcm_token_key" ON "dispositivos"("fcm_token");

-- CreateIndex
CREATE INDEX "dispositivos_usuario_id_idx" ON "dispositivos"("usuario_id");

-- CreateIndex
CREATE INDEX "dispositivos_usuario_id_activo_idx" ON "dispositivos"("usuario_id", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "recuperacion_password_token_hash_key" ON "recuperacion_password"("token_hash");

-- CreateIndex
CREATE INDEX "recuperacion_password_usuario_id_idx" ON "recuperacion_password"("usuario_id");

-- CreateIndex
CREATE INDEX "recuperacion_password_token_hash_idx" ON "recuperacion_password"("token_hash");

-- CreateIndex
CREATE INDEX "recuperacion_password_expira_en_idx" ON "recuperacion_password"("expira_en");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_tabla_afectada_idx" ON "auditoria"("tabla_afectada");

-- CreateIndex
CREATE INDEX "auditoria_creado_en_idx" ON "auditoria"("creado_en" DESC);

-- CreateIndex
CREATE INDEX "auditoria_registro_id_idx" ON "auditoria"("registro_id");

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_blacklist" ADD CONSTRAINT "token_blacklist_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recuperacion_password" ADD CONSTRAINT "recuperacion_password_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
