-- Eliminar schedules sin professional
DELETE FROM provider_schedules 
WHERE provider_id NOT IN (SELECT id FROM professionals);
