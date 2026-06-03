update public.service_templates
set
  name = case when name = 'Reparacion general' then 'Servicio general' else name end,
  fields = '[
    {"key":"item","label":"Elemento"},
    {"key":"reference","label":"Referencia"},
    {"key":"detail","label":"Detalle"},
    {"key":"notes","label":"Notas"}
  ]'::jsonb
where name = 'Reparacion general'
  or fields @> '[{"label":"Equipo"}]'::jsonb
  or fields @> '[{"label":"Serie/IMEI"}]'::jsonb
  or fields @> '[{"label":"Falla reportada"}]'::jsonb;

notify pgrst, 'reload schema';
