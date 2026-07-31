# Propuesta: Visibilidad UI/UX MVP de Agronautas e Iberá-Alerta

## Intento y valor de negocio
Convertir contratos ya disponibles en dos demos navegables que hagan evidente ubicación, estado, evidencia, frescura y siguiente acción. Agronautas es el journey prioritario para productores y asesores; Iberá-Alerta queda como segundo journey institucional. Se reduce confusión, se evita prometer datos inexistentes y se acorta la demostración comercial sin ampliar innecesariamente backend.

## Alcance y límites
- **Actual:** renderizar contratos existentes, estados honestos, provenance, timelines, alertas, reportes y el chat existente.
- **Cercano:** búsqueda/pin/cobertura provider-neutral, polling de `statusPath`, comparación sólo donde haya contrato y primitives compartidos.
- **Futuro explícito:** precios, tendencias, elecciones de cultivo no soportadas, marketplace/exportación, conexiones, tareas, multi-tenant, administración, satélite avanzado y simulaciones; sólo placeholders “Próximamente/contrato pendiente”.
- **No incluye:** chat nuevo, reescritura de Risk Engine, nuevas fuentes, cambio de auth, claims de cobertura ni expansión de dominio.

## Journeys MVP
1. **Agronautas:** workspace → nuevo lote → búsqueda/pin/cobertura → dashboard decisión-first → riesgo, drivers, evidencia y frescura → alertas/timeline → recompute → chat IA existente enriquecido → reporte.
2. **Iberá-Alerta:** overview provincial → mapa/lista → localidad → telemetría, alertas oficiales e INA → provenance/frescura/fuentes → Operaciones → `statusPath` con estados por fuente y diagnósticos sanitizados → Copilot Advisor existente enriquecido.

## Shell, navegación y dirección visual
`ProductShell` técnico común, pero navegación, copy, permisos, claims y contratos separados. Agronautas tendrá Workspace/Lotes/Lote con Resumen, Riesgo, Señales, Alertas, Timeline, Copilot y Reporte. Iberá conservará identidad institucional y Centro/Localidades/Localidad/Operaciones. Dirección: cartografía operativa + evidencia editorial; verde/ámbar para decisiones agrícolas y azul nocturno/lima/ámbar para monitoreo hídrico. Responsive, accesible y con alternativa no cartográfica.

## Chat, datos y slices
Normalizar sólo transporte y estados SSE; conservar contratos de cada producto. Inyectar en el chat existente facts, metadata, timestamps, citas/fuentes, trace resumida, límites, degradación y ciclo `metadata/token/done/error`; no inventar respuestas ni contexto. Compartir status, freshness, evidence, source cards, tablas, timelines, mapas, errores y loading.

Slices para un PR único (forecast 1.450–1.850 líneas): shell/primitives 300–350; Agronautas 550–700; chat/SSE/reporte 220–300; Iberá overview/detalle/ingesta 380–500. Backend sólo para adaptar datos existentes si fuese imprescindible.

## Capabilities
### New
- `agronautas-workspace`: workspace, intake geográfico y dashboard navegable.
- `shared-visibility`: primitives de estados, evidencia, mapas y SSE.
### Modified
- `ibera-alerta`: overview, detalle y seguimiento operativo de ingesta visibles según contratos canónicos.

## Aceptación de demo
- Recorrer ambos journeys sin saltos ni datos ficticios.
- Distinguir live, último dato exitoso, stale, degraded, missing, forecast y fallback.
- Mostrar citas/fuentes/metadata/SSE del chat y resultados por fuente de ingesta.
- Mantener separación institucional y alternativa accesible al mapa.

## Riesgos, dependencias y rollback
Dependencias: contratos/BFF actuales, permisos existentes, proveedor de mapa aún por evaluar (Google no queda fijado), polling de `statusPath` y respuestas SSE. Riesgos: cobertura real limitada, 202 no terminal y stream parcial; mitigar con copy y estados explícitos. Revertir eliminando las nuevas rutas/componentes y restaurando `/demo` y vistas Iberá previas, sin migraciones.
