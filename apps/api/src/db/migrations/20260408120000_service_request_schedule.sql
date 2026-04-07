-- Campos opcionales para turno/fecha en mediación usuario–profesional post-pago
alter table public.service_requests add column if not exists scheduled_slot text;
alter table public.service_requests add column if not exists scheduled_date timestamptz;
