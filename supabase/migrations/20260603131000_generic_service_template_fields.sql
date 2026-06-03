update public.service_templates
set fields = '[
  {"key":"equipment","label":"Equipo"},
  {"key":"identifier","label":"Identificador"},
  {"key":"serial","label":"Serie/IMEI"},
  {"key":"issue","label":"Falla reportada"},
  {"key":"accessories","label":"Accesorios"},
  {"key":"condition","label":"Condiciones"}
]'::jsonb
where name = 'Reparacion general'
  and fields @> '[{"label":"Marca"},{"label":"Modelo"}]'::jsonb;

notify pgrst, 'reload schema';
