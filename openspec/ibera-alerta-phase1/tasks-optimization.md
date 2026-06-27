# Plan de Tareas — Iberá-Alerta Phase 1 (Actualizado)

El plan de desarrollo se divide en 3 slices cohesivas diseñadas para evitar el *context bloat* de los sub-agentes, dando prioridad absoluta a la robustez, efectividad y correcto funcionamiento de la ingesta de datos reales sobre cualquier límite de líneas.

## Slice 1: Sincronización Prisma y Base de Datos
* [x] **Tarea 1.1**: Auditar e integrar las tablas huérfanas de hidrología de SQL crudo dentro de `schema.prisma` utilizando mapeos exactos (`@map` / `@@map`).
* [x] **Tarea 1.2**: Eliminar de forma segura cualquier referencia o definición de la tabla muerta `hydrology_field_risk_snapshots` garantizando cero pérdida de datos.
* [x] **Tarea 1.3**: Confirmar la preservación intacta del soporte de MongoDB.
* [x] **Verificación**: Compilación exitosa del monorepo y validación de tipos del API.

## Slice 2: Robustez de Ingesta, Fail-Fast y Memory Leak
* [x] **Tarea 2.1**: Implementar el pruning estricto de timeouts (`delete this.timeouts[id]`) en el tick de `HydrologyIngestionScheduler`.
* [x] **Tarea 2.2**: Modificar los scrapers e ingestion runner para que en producción tiren errores limpios e informativos en lugar de usar fixtures o mocks automáticos al fallar la conexión con APIs de PNA, INMET, SMN o INA.
* [x] **Tarea 2.3**: Asegurar la persistencia e integridad de los datos reales ingestados en la base de datos de producción (Neon PostgreSQL).
* [x] **Verificación**: Tests de integración y validación de logs ante fallos simulados.

## Slice 3: Expansión de Cobertura Geográfica de Emergencia (PNA)
* [x] **Tarea 3.1**: Registrar e implementar las configuraciones, semillas y cargadores para las **17 localidades críticas del PNA** con sus respectivos umbrales específicos de alerta y evacuación.
* [x] **Tarea 3.2**: Garantizar que el módulo agrícola de **Agronautas** mantenga sus localidades originales de éxito agrícola (como Virasoro y Goya en sus capas métricas correspondientes) completamente operativas e independientes del Centro de Monitoreo de Alertas de Iberá-Alerta.
* [ ] **Tarea 3.3**: Probar de manera rigurosa la ingesta de datos reales, persistencia y renderizado dinámico en la ruta `/municipalities` del frontend. Parcial: tests de contrato/ruta y compilación pasan; la prueba contra Neon quedó bloqueada por timeout de conexión PostgreSQL.
* [x] **Verificación**: Tests focalizados API y compilación API/Web. Playwright E2E y verificación manual cruzada contra Neon quedan pendientes por conectividad.

## Fase Extra: Auditoría Pesimista y Verificación de Redundancias
* **Tarea Extra 4.1**: Lanzar un agente de exploración pesimista (`sdd-explore`) para analizar meticulosamente el código nuevo y asegurar que no existan fugas de memoria remanentes, lógica duplicada, o fallos de red ocultos.
* **Tarea Extra 4.2**: Subir todos los cambios validados directamente a la rama `main`.
