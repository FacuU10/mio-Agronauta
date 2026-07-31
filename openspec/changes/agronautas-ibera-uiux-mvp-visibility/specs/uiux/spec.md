# Especificación UI/UX de visibilidad MVP

## Contrato de alcance

La experiencia SHALL consumir sólo contratos existentes, sin inventar endpoints,
roles, métricas ni fuentes. **Actual**: render y navegación de datos contratados;
**cercano**: adaptadores de mapa, normalización de transporte SSE y polling de
`statusPath`; **futuro**: sólo placeholders “Próximamente/contrato pendiente”.
La UI SHALL permanecer dumb: cualquier adaptador backend mínimo se limitará a
proxy/normalización, sin reglas de negocio. Fuentes conocidas: BFF
`/api/agronautas/v1`, `GET/POST /fields*`, `risk`, `status`, `dashboard`,
`alerts`, `timeline`, `hydrology`, `recompute`, `dashboard.pdf`, chat/Copilot;
Iberá `/api/hydrology/municipalities*`, `/ingest` y `statusPath`.

## `agronautas-workspace` — especificación nueva

### Requirement: Journey de lote orientado a decisión

El sistema SHALL ofrecer workspace, selector/listado acotado y alta de lote con
localidad/búsqueda, pin, coordenadas, cultivo permitido por runtime, hectáreas,
etapa y preview de cobertura. SHALL advertir que `polygonWkt` se conserva pero
la cobertura se resuelve por punto. El dashboard SHALL priorizar nivel/score,
confianza, frescura, alertas, drivers, evidencia y siguiente acción.

#### Scenario: Alta y decisión con datos disponibles

- GIVEN un punto dentro de cobertura y contratos `fields`, `risk`, `status` y `dashboard` válidos
- WHEN la persona confirma el lote y abre Resumen/Riesgo
- THEN ve `fieldId`, estado, decisión primaria, drivers/evidencia con timestamp/fuente y enlaces a Alertas/Timeline

#### Scenario: Fuera de cobertura o sin datos

- GIVEN el punto está fuera de cobertura o el dashboard devuelve `missing/degraded`
- WHEN se revisa el preview o dashboard
- THEN se informa el límite, no se promete análisis y se ofrece editar/reintentar sin confundir “sin datos” con cero alertas

### Requirement: Evolución, recompute y reporte

La UI SHALL mostrar timelines de riesgo, clima y alertas, estado de recompute
`enqueued|already_in_progress`, frescura/degradación y reporte PDF con fecha,
evidencia y disclaimer. No SHALL prometer resultado inmediato.

#### Scenario: Recompute y exportación

- GIVEN snapshot vencido y permisos existentes para recompute
- WHEN se solicita recompute y luego reporte
- THEN se muestra estado persistente/refresh, o acceso no autorizado, y el PDF conserva estado y procedencia

### Requirement: Chat IA existente observable

El chat grounded/Copilot existente SHALL recibir sólo contexto disponible:
facts, metadata, timestamps, citas/fuentes, trace resumida, límites y
degradación. SHALL renderizar `metadata/token/done/error`, respuesta parcial,
fuentes y error accionable; no SHALL crear chat ni inventar contexto.

#### Scenario: Respuesta SSE parcial

- GIVEN el endpoint existente emite metadata y tokens pero termina con error
- WHEN el panel recibe el stream
- THEN conserva tokens, marca stream parcial, muestra metadata/fuentes disponibles y permite reintentar

## `ibera-alerta` — delta

## ADDED Requirements

### Requirement: Centro provincial y localidad verificables

El overview SHALL ofrecer mapa o alternativa lista accesible, filtros y resumen
por PNA/INA/INMET/SMN; el detalle SHALL mostrar `gaugeMappings`, telemetría,
alertas oficiales, INA 0–30 días, provenance/freshness y distinguir
`observed|forecast|missing|degraded`, marcando 15–30 días especulativos cuando aplique.

#### Scenario: Exploración territorial

- GIVEN `/municipalities` y `/:id/dashboard` devuelven contratos canónicos
- WHEN se cambia de provincia a localidad
- THEN cada dato muestra fuente, timestamp, frescura y alternativa no cartográfica equivalente

### Requirement: Operaciones de ingesta y Copilot Advisor

Operaciones SHALL iniciar el `202` existente y consultar su `statusPath` hasta
terminal/parcial, mostrando `runId`, estado por fuente, registros, rangos,
URL, HTTP summary y diagnóstico sanitizado. El Copilot existente SHALL mostrar
metadata, citas/fuentes, timestamps, límites y estados SSE.

#### Scenario: Fuente parcial y stream fallido

- GIVEN una fuente falla y otra finaliza, o Copilot entrega stream incompleto
- WHEN se consulta el seguimiento
- THEN se conserva el último dato exitoso, se marca `partial/degraded`, se ocultan secretos y se ofrece retry seguro

## `shared-visibility` — especificación nueva

### Requirement: Shell, primitives y separación de productos

`ProductShell` SHALL compartir sólo tokens/primitives accesibles (`StatusBadge`,
freshness, evidence/source cards, tablas, timeline, MapFrame, chat y estados),
pero SHALL mantener identidad, navegación, copy, permisos, prompts y datos de
Agronautas/Iberá separados. No SHALL implementar auth; sólo renderizar
`unauthorized/forbidden` según framework existente.

#### Scenario: Navegación separada

- GIVEN se entra a cualquiera de los dos productos
- WHEN se usa shell, breadcrumbs o navegación
- THEN se identifica producto y contexto sin mezclar riesgo agrícola con monitoreo hídrico

### Requirement: Estados, accesibilidad y responsive honestos

Toda operación SHALL cubrir loading, empty, error, retry, unauthorized,
stale/degraded/missing, éxito y stream parcial. SHALL usar foco visible,
teclado, contraste, `aria-live` para cambios relevantes y alternativa al mapa.
Móvil SHALL priorizar lista, CTA no invasiva y cards; escritorio SHALL soportar
densidad institucional, tablas verificables y panel de evidencia. Placeholders
de precios, tendencias, decisiones de cultivo no contratadas, marketplace,
exportación/conexiones y gestión SHALL carecer de valores y acciones ficticias.

#### Scenario: Fallo y uso de campo

- GIVEN una consulta falla, queda stale o se usa viewport móvil
- WHEN se renderiza la pantalla
- THEN el estado explica causa/último éxito, permite retry y mantiene la tarea navegable sin depender del color o mapa

## Criterios de aceptación y no objetivos

La demo SHALL recorrer ambos journeys sin saltos ni datos ficticios, conservar
procedencia/frescura/citas y distinguir live, fallback, forecast y seam. No
incluye auth, seguridad, chat nuevo, nuevas fuentes, Risk Engine, API-first,
comercialización, multi-tenant, administración ni expansión de dominio.
