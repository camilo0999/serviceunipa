-- P1-01: un usuario solo puede tener un ticket por viaje.
-- Antes de crear el índice único se eliminan duplicados históricos,
-- conservando el ticket más antiguo de cada par (usuario_id, viaje_id).
DELETE FROM "bus_tickets" a
USING "bus_tickets" b
WHERE a."usuario_id" = b."usuario_id"
  AND a."viaje_id" = b."viaje_id"
  AND (
    a."creado_en" > b."creado_en"
    OR (a."creado_en" = b."creado_en" AND a."id" > b."id")
  );

CREATE UNIQUE INDEX "bus_tickets_usuario_id_viaje_id_key"
  ON "bus_tickets"("usuario_id", "viaje_id");
