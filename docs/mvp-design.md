# Pulso MVP

## DB

Supabase/Postgres usa tablas `tenants`, `users`, `suppliers`, `products`, `product_supplier_alternates`, `inventory_movements`, `purchase_orders`, `stock_alerts`. Todas incluyen `tenant_id`, `created_at`, `updated_at`.

RLS aisla cada tabla con `public.current_tenant_id()`, derivado de `auth.uid()` y `public.users`. Inventario se modifica con `record_inventory_movement()` para mantener stock e historial juntos.

## Flujo Usuario

Objetivo principal: reducir tiempo y errores en la administracion y recepcion de inventario.

1. Login con Supabase Auth.
2. Dashboard muestra prioridades de hoy: bajo stock, agotados, pedidos en transito, valor inventario, llegadas proximas.
3. Proveedores: CRUD con contacto, entrega promedio y condiciones.
4. Catalogos: marcas, modelos, categorias y variantes reutilizables para productos.
5. Productos: crear, editar, borrar e importar CSV/XLSX con proveedor principal y alternativos. Marca/modelo/categoria/variante usan select buscable con alta rapida si no existe.
6. Pedidos: crear orden con proveedor, anticipo, total estimado, estado y costos unitarios.
7. Recepcion: punteo individual con escaner o recepcion rapida "Recibir todo".
8. Movimientos: registrar entrada, salida o ajuste manual.
9. Etiquetas: imprimir QR o codigo de barras individual/lote.

## Importacion Flexible

El importador lee Excel con multiples hojas, permite elegir hoja, ajustar fila de encabezados, mapear columnas no normalizadas y guardar plantillas por tipo: Pantallas, Baterias, Flexores, Tapas, Cristales, Bocinas y Carcasas.

Antes de importar muestra preview con filas listas, ignoradas, errores y avisos. Ignora separadores visuales como marcas/categorias en una sola celda. Valida nombre generado, costos, precios, stocks negativos y duplicados potenciales. Al insertar productos genera codigos `P000001` consecutivos y registra cada stock inicial como movimiento de inventario.

## Estructura

- `app`: rutas App Router, layouts, loading states.
- `components`: shell, tema, PWA y UI reutilizable estilo shadcn.
- `features`: UI por modulo.
- `services`: server actions y queries Supabase.
- `lib`: Supabase clients y utilidades.
- `types`: contratos compartidos.
- `hooks`: estado ligero Zustand.
- `supabase`: schema RLS y seed.
