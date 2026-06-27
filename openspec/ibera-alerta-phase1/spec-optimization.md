# Especificación de Optimización — Iberá-Alerta Phase 1 (Actualizado)

## Prioridad Absoluta: Datos Reales y Robustez
Para la salida segura a producción, se descarta cualquier límite rígido de líneas de código (como la regla de las 400 líneas). La prioridad absoluta del desarrollo es la **efectividad técnica, robustez y el correcto funcionamiento en producción de la ingesta de datos reales**. El sistema debe ser capaz de conectarse, parsear, persistir en PostgreSQL y renderizar de manera real y dinámica la información hidrometeorológica para todas las localidades críticas.

## 1. Preservación de MongoDB
* **Requisito**: Mantener el soporte y las configuraciones de MongoDB intactas. No se debe remover ni alterar ninguna dependencia o configuración de Mongo, ya que se utilizará en fases futuras.

2. **Diferenciación de Áreas (Agronautas vs Iberá-Alerta)**
* **Módulo Agrícola (Agronautas)**: Mantener intactas las localidades de éxito del primer caso de uso agrícola (como Gobernador Virasoro y Goya para métricas del agro) dentro de sus capas de datos específicas.
* **Módulo de Emergencia Civil (Iberá-Alerta)**: Expandir y pivotar la cobertura a las **17 localidades críticas del PNA** con riesgo de inundación real a lo largo de las cuencas de los ríos Paraná y Uruguay en Corrientes.

## 3. Cobertura de Localidades Críticas (PNA)
Se debe implementar e ingestar la telemetría real (con sus respectivos umbrales de alerta y evacuación) de las siguientes localidades:
1. Ituzaingó (Paraná) — Alerta: 3.50m / Evacuación: 4.00m
2. Itá Ibaté (Paraná) — Alerta: 7.00m / Evacuación: 7.50m
3. Yahapé (Paraná) — Alerta: 6.50m / Evacuación: 7.00m
4. Itatí (Paraná) — Alerta: 6.80m / Evacuación: 7.50m
5. Paso de la Patria (Paraná) — Alerta: 6.50m / Evacuación: 7.00m
6. Corrientes Capital (Paraná) — Alerta: 6.50m / Evacuación: 7.00m
7. Empedrado (Paraná) — Alerta: 6.00m / Evacuación: 6.50m
8. Bella Vista (Paraná) — Alerta: 5.50m / Evacuación: 6.00m
9. Goya (Paraná) — Alerta: 5.20m / Evacuación: 5.70m
10. Esquina (Paraná) — Alerta: 5.00m / Evacuación: 5.20m
11. Garruchos (Uruguay) — Alerta: 13.00m / Evacuación: 14.00m
12. Santo Tomé (Uruguay) — Alerta: 11.50m / Evacuación: 12.50m
13. Alvear (Uruguay) — Alerta: 8.50m / Evacuación: 9.50m
14. La Cruz (Uruguay) — Alerta: 7.50m / Evacuación: 8.50m
15. Yapeyú (Uruguay) — Alerta: 7.50m / Evacuación: 8.50m
16. Paso de los Libres (Uruguay) — Alerta: 7.50m / Evacuación: 8.50m
17. Monte Caseros (Uruguay) — Alerta: 7.50m / Evacuación: 8.50m

## 4. Integración y Tipo de Datos en Prisma
* Migrar las tablas huérfanas de hidrología operadas mediante SQL crudo a `schema.prisma` utilizando `@map`/`@@map` para que se correspondan con los nombres exactos físicos en PostgreSQL.
* Remover/depreciar definitivamente la tabla muerta `hydrology_field_risk_snapshots`.

## 5. Robustez del Ingestion Runner & Corrección de Fuga de Memoria
* **Fail-fast en Producción**: Eliminar la inyección de mocks ficticios cuando fallen los scrapers de APIs externas en producción. El sistema debe fallar ruidosamente, loguear el error y permitir reintentos correctos sin alterar la telemetría real con mocks.
* **Memory Leak**: Implementar la limpieza estricta del mapa de timeouts en `HydrologyIngestionScheduler.timeouts` una vez completada la ejecución.

## 6. Proceso de Verificación Cruzada y Auditoría Pesimista
* Tras la aplicación de los cambios, se ejecutará Playwright y tests de integración.
* Adicionalmente, se lanzará una fase final obligatoria con un **agente de exploración pesimista** que auditará el código modificado buscando potenciales fallos o debilidades antes del cierre.
