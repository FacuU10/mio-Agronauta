# Diseño: Visibilidad UI/UX MVP de Agronautas e Iberá-Alerta

## Enfoque técnico/visual

Expandir la superficie existente, no el dominio: `ProductShell` y primitives de visibilidad comunes, dos configuraciones de producto estrictamente separadas y clientes que consumen los BFF actuales con Zod. La dirección visual es **cartografía operativa + evidencia editorial**: composición asimétrica, textura topográfica CSS, tipografía `Source Serif 4` para titulares y `IBM Plex Sans` para datos, nunca Inter/Arial ni gradientes SaaS genéricos.

## Decisiones de arquitectura

| Decisión | Elección | Racional / alternativa descartada |
|---|---|---|
| Shell | `ProductShell` configurable por producto, con tokens de Agronautas (verde cultivo/ámbar) e Iberá (azul noche/lima/ámbar). | Comparte accesibilidad y navegación sin mezclar claims; se rechaza un dashboard unificado.
| Datos | Server Components para páginas, client islands mínimos para React Query, formularios, mapa, polling y SSE; lecturas independientes en paralelo. | Respeta Next 15/React 19 y evita serializar secretos; conserva el patrón actual mientras se extraen contenedores.
| Mapa | `MapProviderAdapter` provider-neutral; Google Maps es opción evaluada (key, coste, licencia, SSR, dibujo), no dependencia. | Fallback obligatorio de localidad/coordenadas/pin textual y tabla accesible; no se bloquea el alta por proveedor.
| Chat | Harness del chat existente: normaliza transporte/eventos, no crea conversación ni cambia prompts/dominio. | Conserva endpoints y agrega metadata, facts, citas, fuentes, trace, límites y degradación visibles.

## Flujo y límites

`BFF + Zod → service adapter → view-model de estado → primitives → pantalla`

Agronautas: `/demo` (workspace/nuevo lote y selector acotado a IDs conocidos) → `/demo/fields/[fieldId]` (Resumen, Riesgo, Señales, Alertas, Timeline, Copilot, Reporte). Intake busca localidad, mueve pin o acepta coordenadas; previsualiza cobertura, provincia, fuente y limita explícitamente `polygonWkt` al punto mientras el backend no prometa análisis poligonal. Dashboard prioriza score/nivel/acción siguiente junto a confianza, vigencia y frescura; después drivers, evidencia, alertas, timelines, recompute (`enqueued|already_in_progress`) y PDF. Cultivo sigue el alcance real Corrientes/arroz; precios, tendencias, decisiones de cultivo, marketplace/exportación, conexiones y gestión son tarjetas “Próximamente / contrato pendiente”, sin payloads falsos.

Iberá: `/municipalities` conserva identidad institucional y añade overview provincial con mapa/lista equivalente, filtros y estado por PNA/INA/INMET/SMN; `/municipalities/[id]` muestra localidad, mappings, telemetría, alertas oficiales, INA 0–30 días, provenance/freshness y Copilot Advisor; `/municipalities/ingest` añade ejecución operativa, resultados por fuente, HTTP summary y diagnóstico sanitizado. Tras `202`, el cliente consulta `statusPath` con backoff acotado hasta terminal/parcial, reintento explícito o error; nunca trata `queued` como completado.

## Componentes, contratos y estados

Crear `apps/web/src/components/shell/product-shell.tsx` y `apps/web/src/components/visibility/` para `StatusBadge`, `FreshnessBanner`, `EvidenceDrawer`, `SourceCard`, `MetricCard`, `DataTable`, `Timeline`, `MapFrame`, `ChatPanel`, `ReportAction` y estados loading/empty/error/unauthorized/forbidden/stale/degraded/retry. Cada dato conserva `observedAt`, `ingestedAt`, `lastSuccessfulObservedAt`, `validUntil`, fuente y modo `live|seam|mock|fallback`. Escritorio usa dos columnas; móvil prioriza una métrica, CTA accesible, tabla desplazable y alternativa al mapa, con foco visible y `aria-live` sólo para cambios relevantes.

En `apps/web/src/lib/visibility/` definir `MapProviderAdapter`, `SseEvent` (`metadata|token|done|error`, `sequence`, `receivedAt`) y parser específico por producto; producir `ChatViewModel` con respuesta, metadata, citas, facts, trace, fuentes, timestamp, límites y estado de stream. Cargar mapa/chat pesado dinámicamente y mantener tablas largas fuera del camino crítico. Adaptar sólo clientes existentes (`apps/web/src/lib/agronautas/service.ts` y un cliente hydrology tipado); no rediseñar Risk Engine, auth ni seguridad. BFF sólo cambia si hace falta preservar headers/content-type de stream o exponer un GET contractual de estado ya existente.

## Archivos y slices

| Slice | Archivos principales | Forecast |
|---|---|---:|
| Shell/primitives/tokens | `components/shell`, `components/visibility`, `app/globals.css`, `layout.tsx` | 300–350 líneas |
| Agronautas primero | `app/demo`, `app/demo/fields/[fieldId]`, `components/agronautas`, `lib/visibility/map`, `lib/agronautas` | 550–700 |
| Chat/SSE/reporte | `components/visibility/chat-panel`, adapters y tests | 220–300 |
| Iberá segundo | `components/government`, rutas municipalities, polling/status y tests | 380–500 |

Total previsto: 1.450–1.850 líneas, compatible con un PR único de 2.000 líneas; backend sólo adaptadores mínimos si un contrato existente no alcanza.

## Testing y verificación

Unitarias: view-models, estados, parser SSE, polling terminal/parcial y adapter de mapa. Integración: cada service/BFF con Zod, 202→`statusPath`, recompute y errores de stream. Playwright: journeys Agronautas e Iberá en desktop/móvil, teclado, lector, mapa alternativo, fuentes y todos los estados honestos. Verificar con `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e` y `pnpm build`; además smoke local de rutas reales sin revisar hashes, receipts ni iniciar agentes de review.

## Threat Matrix

| Boundary | Applicability | Respuesta / RED |
|---|---|---|
| Documentation-like paths | N/A: no se ejecuta documentación | Ninguna |
| Git repository selection | N/A: no se automatiza Git | Ninguna |
| Commit state | N/A: no se hacen commits | Ninguna |
| Push state | N/A: no se hace push | Ninguna |
| PR commands | N/A: no se compone PR desde UI | Ninguna |

## Migración / rollout

No hay migración de datos ni cambios de auth. Mantener `/demo` y rutas Iberá como entradas compatibles; rollback eliminando las nuevas composiciones y restaurando los componentes actuales.

## Open Questions

- Ninguna bloqueante; seleccionar proveedor cartográfico sólo después de evaluar key/licencia/coste y mantener el fallback accesible.
