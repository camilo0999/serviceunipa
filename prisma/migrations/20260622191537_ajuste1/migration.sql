-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('estudiante', 'operador_comedor', 'operador_bus', 'administrador');

-- CreateEnum
CREATE TYPE "TurnoUsuario" AS ENUM ('dia', 'noche', 'mixto');

-- CreateEnum
CREATE TYPE "PlataformaDispositivo" AS ENUM ('android', 'ios');

-- CreateEnum
CREATE TYPE "TipoComida" AS ENUM ('desayuno', 'almuerzo', 'cena');

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

-- CreateTable
CREATE TABLE "menus_dia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fecha" DATE NOT NULL,
    "tipo_comida" "TipoComida" NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "descripcion" TEXT NOT NULL,
    "url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menus_dia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(50) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,
    "dias_semana" INTEGER[],

    CONSTRAINT "materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones_materias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "materia_id" UUID NOT NULL,
    "semestre" VARCHAR(20) NOT NULL,

    CONSTRAINT "inscripciones_materias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "menu_dia_id" UUID NOT NULL,
    "qr_hash" VARCHAR(512) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usado_en" TIMESTAMPTZ,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" VARCHAR(150) NOT NULL,
    "origen" VARCHAR(150) NOT NULL,
    "destino" VARCHAR(150) NOT NULL,
    "capacidadTotal" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rutas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruta_id" UUID NOT NULL,
    "hora_partida" TIME NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viajes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ruta_id" UUID NOT NULL,
    "horario_id" UUID,
    "capacidadTotal" INTEGER NOT NULL,
    "ocupados" INTEGER NOT NULL DEFAULT 0,
    "fecha" DATE,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bus_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "viaje_id" UUID NOT NULL,
    "qr_hash" VARCHAR(512) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usado_en" TIMESTAMPTZ,
    "expira_en" TIMESTAMPTZ NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viaje_registros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "viaje_id" UUID NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viaje_registros_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "menus_dia_fecha_idx" ON "menus_dia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "menus_dia_fecha_tipo_comida_key" ON "menus_dia"("fecha", "tipo_comida");

-- CreateIndex
CREATE UNIQUE INDEX "materias_codigo_key" ON "materias"("codigo");

-- CreateIndex
CREATE INDEX "inscripciones_materias_usuario_id_idx" ON "inscripciones_materias"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_materias_usuario_id_materia_id_semestre_key" ON "inscripciones_materias"("usuario_id", "materia_id", "semestre");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_qr_hash_key" ON "tickets"("qr_hash");

-- CreateIndex
CREATE INDEX "tickets_usuario_id_idx" ON "tickets"("usuario_id");

-- CreateIndex
CREATE INDEX "tickets_qr_hash_idx" ON "tickets"("qr_hash");

-- CreateIndex
CREATE INDEX "tickets_usado_idx" ON "tickets"("usado");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_usuario_id_menu_dia_id_key" ON "tickets"("usuario_id", "menu_dia_id");

-- CreateIndex
CREATE INDEX "horarios_ruta_id_idx" ON "horarios"("ruta_id");

-- CreateIndex
CREATE INDEX "viajes_ruta_id_idx" ON "viajes"("ruta_id");

-- CreateIndex
CREATE UNIQUE INDEX "bus_tickets_qr_hash_key" ON "bus_tickets"("qr_hash");

-- CreateIndex
CREATE INDEX "bus_tickets_usuario_id_idx" ON "bus_tickets"("usuario_id");

-- CreateIndex
CREATE INDEX "bus_tickets_viaje_id_idx" ON "bus_tickets"("viaje_id");

-- CreateIndex
CREATE INDEX "viaje_registros_usuario_id_idx" ON "viaje_registros"("usuario_id");

-- CreateIndex
CREATE INDEX "viaje_registros_viaje_id_idx" ON "viaje_registros"("viaje_id");

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

-- AddForeignKey
ALTER TABLE "inscripciones_materias" ADD CONSTRAINT "inscripciones_materias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_materias" ADD CONSTRAINT "inscripciones_materias_materia_id_fkey" FOREIGN KEY ("materia_id") REFERENCES "materias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_menu_dia_id_fkey" FOREIGN KEY ("menu_dia_id") REFERENCES "menus_dia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_ruta_id_fkey" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_ruta_id_fkey" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viajes" ADD CONSTRAINT "viajes_horario_id_fkey" FOREIGN KEY ("horario_id") REFERENCES "horarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_tickets" ADD CONSTRAINT "bus_tickets_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_tickets" ADD CONSTRAINT "bus_tickets_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje_registros" ADD CONSTRAINT "viaje_registros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje_registros" ADD CONSTRAINT "viaje_registros_viaje_id_fkey" FOREIGN KEY ("viaje_id") REFERENCES "viajes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
