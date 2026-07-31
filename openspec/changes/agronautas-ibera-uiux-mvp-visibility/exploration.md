# Exploración SDD — `agronautas-ibera-uiux-mvp-visibility`

## Alcance y base verificada

La referencia solicitada `integration/merge-total-ibera-agronautas-20260727` resuelve al SHA `24308efdfb0d02a09a4e567d8481067d008519d3`, igual que `main`. Por lo tanto, esta exploración no usa un diff entre ramas: analiza el árbol vigente en esa referencia. El repositorio está configurado para persistencia híbrida y Next.js 15/React 19/Tailwind 4 en web.

El backend tiene una base contractual útil para hacer visible el MVP, pero la UI actual es una superficie parcial: Agronautas concentra casi todo en una única pantalla `/demo`, mientras Iberá-Alerta tiene overview, detalle municipal e ingesta, sin un shell de producto compartido ni una navegación institucional completa.

## 1. Estado actual verificado por producto

### Agronautas

**Actual — backend y contratos disponibles**

- El BFF web usa `/api/agronautas/v1` y reenvía hacia el router Express `/agronautas`; el runtime expone `real|demo`, prefijos y versión contractual.
- Alta de lote: `POST /fields`, con `FieldIntake` que incluye `fieldId`, `cropCategory`, `crop`, `hectares`, localidad, provincia/país, etapa y `location { lat, lng, polygonWkt? }`.
- Lectura de lote: `GET /fields/:fieldId`, con cultivo, hectáreas, localidad, provincia y centroid. La cobertura real se resuelve por el punto; el polígono se conserva, pero la UI no permite dibujarlo.
- Riesgo: `GET /fields/:fieldId/risk/current` entrega score 0–100, nivel, confianza, fechas de cálculo/vigencia, versión de regla, drivers, degradación y referencias de evidencia. `GET /risk/timeline` entrega snapshots persistidos.
- Alertas: `GET /alerts/current` y `GET /alerts/timeline` entregan alertas por tipo, prioridad, confianza, frescura y degradación. La timeline de alertas no está conectada al servicio web.
- Estado y dashboard: `GET /status` informa estado de lote/riesgo/alertas, cantidad de alertas, última actualización, vigencia y razones de degradación. `GET /dashboard` agrega señales, riesgo, alertas, procedencia, scheduler, fecha del último dato y disclaimer de presentación.
- Señales visibles por contrato: timeline climático (`GET /weather/timeline`), resumen hidrológico (`GET /hydrology/dashboard`) y alertas hidrológicas (`GET /hydrology/alerts`). El dashboard hidrológico incluye PNA, INA, INMET y SMN, alturas, tendencias, lluvias, alertas, pronósticos INA hasta 30 días, calidad, frescura, fuente y timestamp.
- Recompute y reportes: `POST /fields/:fieldId/recompute` devuelve `enqueued|already_in_progress`; `GET /dashboard.pdf` descarga una representación textual del payload dashboard. Existe `pdfReportRequestSchema`, pero la pantalla usa el enlace GET y no un flujo de selección de snapshot.
- Chat: `POST /fields/:fieldId/chat` devuelve respuesta grounded síncrona con acción ejecutada, facts, citas, trace, degradación y motivo de indisponibilidad. `POST /fields/:fieldId/copilot/chat` transmite SSE (`metadata`, `token`, `done` y `error`) con contexto denso hidrológico y límites explícitos del copiloto.
- Roles existentes: middleware bearer estático con `reader`, `operator`, `admin` y scopes `read`, `write`, `recompute`, `admin`. No hay gestión de usuarios, sesiones, workspaces o permisos desde la UI.

**Actual — UI existente**

- `/demo` monta `AgronautasPageClient`: React Query + Zustand, alta de lote, selección del último lote creado y consultas paralelas de field/risk/alerts/status/timelines/dashboard/hidrología.
- `AgronautasWorkspace` muestra hero, estado operativo, formulario de alta, cuatro métricas, banners stale/degraded, tarjeta hidrológica, señales de ingestión, freshness, alertas operativas, timelines, drivers, evidencia, alertas, chat, Copilot Hidrológico y exportación PDF.
- El formulario solo muestra latitud/longitud manuales, hectáreas, etapa, localidad declarada y un cultivo fijo `rice`; no ofrece buscar una localidad, seleccionar en mapa, dibujar polígono ni revisar la cobertura antes de enviar.
- Se muestran score, confianza, alertas, drivers, evidencia textual, estado y timestamps, pero la jerarquía es de inventario técnico: no existe una lectura ejecutiva clara de “qué decisión tomar ahora”, ni comparación entre lotes, ni vista geográfica.
- `dashboardPayload` expone provenance/scheduler/signal, pero la UI los fragmenta en tarjetas de ingestión y freshness. No se muestran todos los enlaces de evidencia, detalles de cadencia, fallas, reglas, `trace` del chat ni citas del chat.
- El Copilot Hidrológico recibe tokens, pero el cliente descarta metadata/done y solo agrega texto. El chat grounded muestra facts, pero no renderiza citas ni la traza de acciones junto a la respuesta.

**Cerca — existe contrato o seam, pero falta una superficie de producto**

- Comparación está contemplada en copy/contexto y en los límites del grounded chat, pero no hay endpoint ni control de comparación navegable verificado.
- La arquitectura de scheduler, fuentes, modos `live|seam|mock|unavailable`, SLA, próxima corrida y fallas ya aparece en `DashboardSnapshot`; en la UI el botón de trigger es informativo/deshabilitado y no existe un flujo operacional completo.
- El dominio y los schemas aceptan categorías/cultivos más amplios, y hay pruebas de entidad para cultivos no arroz; el caso de uso de alta actualmente persiste `rice` y la cobertura sigue siendo Corrientes arroz. No debe comunicarse aún como MVP multi-cultivo.

**Futuro — no presentarlo como funcionalidad existente**

- Precios, tendencias de mercado, marketplace, exportación/conexiones sectoriales, tareas y gestión diaria no tienen rutas ni payloads de producto verificados.
- NDVI/NDWI/EVI, biomass, fuego, suelo y otros signal types aparecen como contratos/seams de ingestión o placeholders, pero no como una experiencia real completa y confiable.
- La UI rotula Sentinel-1 y simulación interactiva como “Próximamente”; deben permanecer como placeholders honestos.

### Iberá-Alerta

**Actual — backend y contratos disponibles**

- `GET /api/hydrology/municipalities` devuelve provincia, freshness por fuente, alertas provinciales y localidades con mappings de gauges, telemetría reciente y alertas oficiales.
- `GET /api/hydrology/municipalities/:id/dashboard` devuelve municipio, `gaugeMappings`, `telemetryCards`, predicciones INA hasta 30 días, alertas SMN/INMET y provenance/freshness.
- Ingesta: `POST /api/hydrology/ingest` admite una fuente opcional o todas PNA/INA/INMET/SMN y responde `202` con `runId`, `proofRunId`, `statusPath` y estado `queued`; `GET /ingest/:runId` observa estados `queued|started|completed|partial|failed` y resultados por fuente, incluyendo registros, rangos observados, URL, HTTP summary y diagnóstico sanitizado.
- `POST /api/hydrology/ingest/verify` valida el token de operador. El scheduler backend tiene cadencias: PNA/INMET/SMN horarias e INA diaria a las 18:30 UTC.
- Copilot municipal: `POST /municipalities/:id/copilot/chat` transmite SSE, usa contexto denso oficial, limita fuentes a PNA/INA/INMET/SMN, marca fuera de alcance y devuelve errores diferenciados de timeout/indisponibilidad.
- La base de datos y los contratos diferencian `observed`, `forecast`, `estimated`, `missing`, frescura, tendencia, timestamp exitoso y confidence normal/especulativa. Pronósticos de más de 14 días deben marcarse como especulativos.

**Actual — UI existente**

- `/municipalities` muestra un “Centro de Monitoreo Hídrico Provincial”, freshness de fuentes, alertas provinciales y tarjetas por localidad con PNA/INA, última observación, alertas oficiales y enlace al detalle.
- `/municipalities/:id` muestra telemetría, alertas oficiales, tabla INA a 30 días, provenance y Copilot Advisor.
- `/municipalities/ingest` tiene verificación de token, inicio de ingesta y resultado básico por fuente.
- La identidad visual es institucional y distinta de Agronautas en copy, colores y lenguaje. Esto debe preservarse; hoy no existe navegación común que explique los dos productos sin mezclarlos.

**Actual pero subexpuesto o incompleto en UI**

- El overview no tiene mapa provincial real: el texto y el enlace dicen “mapa provincial”, pero el código renderiza una grilla de localidades.
- `gaugeMappings`, identificadores de cobertura, estaciones secundarias, enlaces de fuente en varias filas y telemetría de alertas no están expuestos de forma operativa.
- El detalle recibe `alerts` como telemetría, pero visualiza principalmente `municipality.officialAlerts`; hay riesgo de que alertas SMN/INMET normalizadas no tengan una tarjeta explicativa completa.
- La ingesta no consulta `statusPath` después del `202`; por eso no se visualizan correctamente progreso, finalización, parcialidad, diagnóstico, HTTP summary, rangos observados ni error por fuente.
- El Copilot parsea el cuerpo SSE de forma simplificada, no muestra metadata/fuentes/timestamp junto a la respuesta y no expone una UX clara para timeout, stream incompleto o fuera de alcance.

**Cerca**

- Ya existen payloads suficientes para una matriz de fuentes, tarjetas de freshness, timeline de ejecución, tabla de resultados por fuente y estado de conectores sin ampliar el backend.
- La separación de fuentes oficiales, datos observados/pronosticados y continuidad con último dato exitoso está en los contratos; falta convertirla en jerarquía visual institucional.

**Futuro**

- No convertir en producto actual simulaciones hidráulicas, routing/lag, descargas de represas, fuentes excluidas por el prompt del Copilot, autoridad de evacuación ni pronósticos más allá de lo respaldado.
- Cualquier nueva conectividad, cobertura municipal o claim operativo requiere contrato y evidencia específica; no se infiere desde las tarjetas actuales.

## 2. Inventario backend/contratos vs superficies UI

| Producto | Backend/contrato verificado | UI actual | Gap de visibilidad |
|---|---|---|---|
| Agronautas | `FieldIntake`, cobertura, centroid/polígono opcional | Formulario manual | Mapa/búsqueda, preview de cobertura, polígono y validación geográfica visual |
| Agronautas | Risk snapshot: score, nivel, confianza, drivers, vigencia, evidencia | Métricas + lista técnica | Explicación ejecutiva, escala visual, contexto temporal y “qué hacer ahora” |
| Agronautas | Alerts current/timeline | Solo alerts current | Historial, agrupación por severidad, relación alerta-snapshot-evidencia |
| Agronautas | Dashboard signals/provenance/scheduler | Tarjetas separadas | Vista unificada de fuente, frescura, SLA, próxima corrida y degradación |
| Agronautas | Weather timeline | Timeline simple | Tendencia legible, rangos, calidad y fuente enlazada |
| Agronautas | Hydrology dashboard/alerts | Parte de alturas, tendencias, alertas, pronóstico | Rain, estaciones, fuentes y procedencia más explícitas; no mezclar claim hidrológico con riesgo agronómico |
| Agronautas | Recompute result + job seam | Botón y banner | Estado persistente del job, polling/refresh y explicación de no disponibilidad |
| Agronautas | PDF dashboard | Enlace directo | Reporte ejecutivo con timestamp, evidencia, disclaimers y estado degradado claramente visible |
| Agronautas | Grounded chat + Copilot SSE | Texto + algunos facts/tokens | Citas, trace, contexto usado, fuentes, metadata, cancelación y error de stream |
| Agronautas | Roles/scopes estáticos | Ningún selector/estado de permisos | Separar UI reader/operator/admin sin inventar una gestión de usuarios |
| Iberá-Alerta | Overview municipal/province/source freshness | Lista y tarjetas | Mapa territorial, filtros, tabla operativa y resumen de conectores |
| Iberá-Alerta | Municipality dashboard + mappings | Telemetría, alertas, INA, provenance | Mappings, cobertura, fuentes por dato y estado de última ejecución |
| Iberá-Alerta | Ingest 202 + statusPath + source results | Resultado inicial | Progreso real, polling, partial/failure, diagnóstico y evidencia por proveedor |
| Iberá-Alerta | Copilot SSE + dense context | Respuesta textual | Fuentes/timestamps, estado de stream, límites, fallback y error accionable |
| Cross-product | BFFs, Zod, estados y SSE | Componentes aislados | Shell, semántica de estados, patrones de tablas/cards/timelines y accesibilidad compartidos |

## 3. Gap map UI/UX priorizado por impacto en demo/cliente

### P0 — bloquea una demo creíble

1. **Navegación y entrada de producto**: pasar de una pantalla `/demo` a un workspace Agronautas navegable, y de páginas sueltas a un centro Iberá-Alerta navegable. Debe ser evidente dónde está el usuario y qué producto está usando.
2. **Intake geográfico demostrable**: mapa provider-neutral con búsqueda/localidad, pin, centroid, opción de polígono, preview de cobertura y mensaje explícito cuando el punto queda fuera del área soportada. El proveedor de mapas queda abierto.
3. **Dashboard de decisión**: score/nivel/alertas/último dato/confianza como lectura primaria; drivers, evidencia y degradación como explicación secundaria; acciones claras para ver detalle, recompute o exportar.
4. **Honestidad de datos**: componente común de freshness/degraded/missing/stale que no oculte fallas ni convierta mock/seam/unavailable en “live”.
5. **Iberá institucional**: mapa/listado territorial, vista municipal y estado de fuentes conectados; sin presentarlo como extensión agronómica.
6. **Chat útil junto al dato**: mostrar respuesta, timestamp, fuentes, facts/citas disponibles, contexto usado, confianza/limitaciones y estado SSE.

### P1 — aumenta conversión y uso diario

- Historial de snapshots/alertas con timeline visual y filtros.
- Matriz de señales y freshness con SLA/último éxito/próxima corrida.
- Reporte PDF ejecutivo consistente con la pantalla.
- Ingesta Iberá con polling de `statusPath`, resultados por proveedor y reintento seguro.
- Gestión mínima de varios lotes dentro de un workspace, sin afirmar multi-tenant completo: selector/listado y reciente actividad.
- Responsive real para uso de campo y para tablero institucional de escritorio; tablas con vista de tarjetas en móvil.

### P2 — prototipo visual honesto

- Superficies de precios, cultivos adicionales, tendencias de mercado, marketplace/exportación, tareas y conexiones sectoriales como tarjetas “planeado” con estado y fuente pendiente.
- Capas satelitales avanzadas y simulación hidráulica solo como placeholders; nunca datos simulados presentados como observados.

## 4. Flujos MVP de principio a fin

### Flujo Agronautas — alta a decisión

1. Entrar al workspace Agronautas y seleccionar “nuevo lote”.
2. Completar identificador, cultivo permitido por el runtime actual, hectáreas y etapa.
3. Buscar localidad o mover un pin en el mapa; revisar coordenadas, área de cobertura, provincia, fuente y advertencia sobre polygonWkt si se dibuja.
4. Confirmar alta y mostrar `fieldId`, cobertura devuelta y estado de datos inicial.
5. Abrir dashboard: contexto del lote, score/nivel, confianza, freshness, alertas y recomendación visual.
6. Abrir drivers y evidencia: peso/valor, snapshot, referencias y timestamps; distinguir actual, stale y degradado.
7. Recorrer timeline de riesgo, clima y alertas; ver qué cambió y cuándo.
8. Si el snapshot está vencido, solicitar recompute, mostrar `enqueued|already_in_progress`, refrescar estado y no prometer resultado inmediato.
9. Preguntar al chat grounded o Copilot Hidrológico y ver respuesta junto a facts, citas/fuentes, timestamp, límites y estado de degradación.
10. Exportar reporte y verificar que conserva estado, evidencia, disclaimer y fecha.

### Flujo Iberá-Alerta — provincia a localidad

1. Entrar al Centro de Monitoreo Hídrico Provincial, leer estado consolidado y freshness por PNA/INA/INMET/SMN.
2. Explorar mapa/listado de localidades con filtros por estado, alertas y última observación.
3. Abrir una localidad y revisar telemetría, umbrales/cobertura informada, alertas oficiales, tabla INA 0–30 días y provenance.
4. Distinguir observado, pronóstico, faltante y dato degradado; marcar 15–30 días como planificación especulativa cuando corresponda.
5. Abrir Copilot Advisor; mostrar contexto municipal, fuentes y timestamp junto con la respuesta, además de límites de Fase 1.
6. Desde Operaciones, verificar token e iniciar ingesta; observar `statusPath` hasta estado terminal o parcial y revisar cada fuente, registros, diagnóstico y último dato exitoso.

### Flujo común de estados

Cada operación debe tener loading, vacío, error, no autorizado/prohibido cuando aplique, stale/degraded, retry y éxito. “Sin datos” no debe verse igual que “cero alertas”; “mock/seam/unavailable” no debe verse igual que “live”.

## 5. Arquitectura de navegación y shell común/separado

### Shell de plataforma común

- `ProductShell` con producto activo, contexto de entorno, navegación accesible, breadcrumbs, centro de estado y ayuda; debe aceptar dos configuraciones sin compartir copy ni claims.
- Primitivas comunes: `StatusBadge`, `FreshnessBanner`, `EvidenceDrawer`, `SourceCard`, `MetricCard`, `DataTable`, `Timeline`, `MapFrame`, `ChatPanel`, `ErrorState`, `EmptyState`, `LoadingState` y `ReportAction`.
- Semántica de colores y estados por token, fechas `es-AR`, foco visible, navegación por teclado, `aria-live` solo para cambios relevantes, tablas con encabezados y alternativa no cartográfica.
- Transporte común para BFF, validación Zod, manejo de errores contractuales, timeout, retry y SSE; no compartir modelos de dominio que mezclen riesgo agrícola con alerta institucional.

### Experiencia Agronautas separada

- Navegación propuesta: `Inicio/Workspace` → `Lotes` → `Lote/:id` con tabs `Resumen`, `Riesgo`, `Señales y evidencia`, `Alertas`, `Timeline`, `Copilot`, `Reporte`; `Nuevo lote` como acción primaria.
- Futuras entradas de `Tareas`, `Precios`, `Mercado` y `Marketplace` deben aparecer como módulos separados y etiquetados como futuros hasta tener contrato real.
- Permisos/claims: reader puede consultar; operator puede alta y recompute; admin queda fuera del alcance visual de esta fase salvo estados de acceso. No crear UI de administración de usuarios sin backend correspondiente.

### Experiencia Iberá-Alerta separada

- Navegación propuesta: `Centro provincial` → `Localidades` → `Localidad/:id` con tabs `Resumen`, `Telemetría`, `Alertas`, `Pronóstico INA`, `Fuentes`; `Operaciones/Ingesta` separado y protegido.
- El lenguaje debe ser institucional, oficial y territorial. No mostrar score agrícola, marketplace, cultivo o recomendaciones productivas dentro del shell de Iberá.
- `gaugeMappings`, conectores y diagnósticos deben quedar en un nivel operativo/explicativo, no competir con la lectura ejecutiva principal.

## 6. Design direction

- **Dirección**: “cartografía operativa + evidencia editorial”. La memoria visual debe ser la relación entre territorio, estado actual y prueba de procedencia, no una grilla SaaS genérica.
- **Jerarquía**: primero decisión/estado, después magnitud y tendencia, luego evidencia y operación. Un score nunca debe aparecer sin frescura, confianza, ventana temporal y fuente.
- **Densidad**: Agronautas necesita densidad media y accionable para productores/asesores; Iberá necesita densidad institucional alta en escritorio, con resumen superior y tablas verificables. Agrupar por tarea, no por endpoint.
- **Mapas**: implementar una interfaz de adaptador sin cerrar proveedor. La fase explorada debe evaluar Google Maps o una alternativa equivalente según búsqueda, pin, polygon drawing, límites, licencia, costo, SSR/hidratación y fallback accesible. El mapa no puede ser la única forma de elegir ubicación.
- **Tablas y cards**: cards para estado/resumen; tablas para pronósticos, fuentes, ejecuciones y evidencia; cada tabla debe tener versión compacta móvil y exportación/lectura accesible.
- **Timelines**: mostrar tiempo observado, ingestado, válido hasta y último éxito; distinguir línea de datos de línea de ejecución/recompute.
- **Chat**: panel persistente pero secundario al dato; respuesta con metadata, badges de fuente/frescura, facts/citas, trace resumida, disclaimer y errores accionables. Nunca reemplazar dashboard.
- **Estados**: lenguaje explícito: `Actual`, `Último dato exitoso`, `Degradado`, `Vencido`, `Sin datos`, `Pronóstico`, `Planificación especulativa`, `Live/Seam/Mock/Fallback`. No usar “actualizado” cuando solo existe un fallback histórico.
- **Responsive**: móvil prioriza mapa/listado alternativo, una métrica por fila, CTA sticky no invasiva y tablas desplazables con encabezado; escritorio usa layout de dos columnas con panel de evidencia/contexto.
- **Accesibilidad**: foco visible, contraste, no depender solo de color, botones con labels, `aria-live` para streaming, headings únicos, skip links, enlaces de fuente con destino claro y mapa con formulario alternativo de coordenadas/localidad.
- **Sistema visual**: compartir tokens y primitivas, pero usar dos atmósferas: Agronautas con verde cultivo/ámbar de decisión y Iberá con azul nocturno/lima/ámbar institucional. Revisar la dependencia actual de Inter/Arial y colores inline/hex al diseñar el sistema definitivo; no trasladar esa deuda a nuevos componentes.

## 7. Alcance propuesto de la primera fase UI/UX

### Incluir

1. Shell común mínimo con identidad y navegación separada para `/demo` y `/municipalities`.
2. Agronautas workspace navegable: selector/listado de lotes acotado, intake con mapa provider-neutral y preview de cobertura, dashboard ejecutivo, estados completos, evidence/freshness, timelines, recompute, chat enriquecido y reporte.
3. Iberá overview territorial (mapa o alternativa de lista accesible), detalle municipal con todos los grupos de datos actuales y panel de provenance/freshness.
4. Iberá ingesta con seguimiento de `statusPath`, resultado por fuente y degradación operativa honesta.
5. Componentes compartidos de estado, tablas, cards, timelines, mapas, errores, loading y SSE; sin fusionar dominios.
6. Una galería/ruta de estados representativos en desarrollo, solo si se puede hacer dentro de la estructura web existente y sin inventar contratos.

### Dejar como placeholder honesto

- Precios, marketplace, exportación comercial, recomendaciones futuras, tareas completas, usuarios/roles administrativos, multi-tenant, cultivos más allá de lo que el runtime realmente acepte, capas satelitales avanzadas y simulaciones.
- Se pueden mostrar como “Próximamente / contrato pendiente / fuente no conectada”, sin valores ficticios, botones que parezcan operar ni métricas inventadas.

### No incluir en esta fase

- Ampliación de backend, nuevos proveedores, reescritura del Risk Engine, cambios de auth, claims de producción, nuevas fuentes hidrológicas o pruebas de implementación. La UI debe consumir los contratos existentes y señalar con precisión dónde no alcanzan.

## 8. Riesgos y dependencias

- **Cobertura geográfica**: el caso de uso actual fija `rice` y la cobertura Corrientes arroz; un intake visual más amplio puede crear expectativa que el backend rechaza. Mitigación: reflejar límites reales en mapa, copy y contrato.
- **Polígono vs punto**: `polygonWkt` se acepta y persiste, pero la resolución de cobertura observada usa el punto. Mitigación: no prometer análisis poligonal hasta verificarlo.
- **Datos degradados**: scheduler, providers y fallback tienen estados distintos; una tarjeta superficial puede convertir fallback en falso tiempo real. Mitigación: status matrix y timestamp por señal.
- **SSE**: Agronautas e Iberá tienen eventos similares pero no idénticos; el cliente actual descarta metadata y no maneja bien stream parcial. Mitigación: parser/event model específico por producto sobre un transporte común.
- **Ingesta asíncrona**: el `202` no es resultado final. Mitigación: polling acotado, cancelación/retry y estados terminales por fuente.
- **Map provider**: API keys, costo, licencias, SSR y dibujo de polígonos pueden afectar la demo. Mitigación: adapter y fallback de búsqueda/coordenadas sin cerrar proveedor.
- **Permisos**: Agronautas tiene scopes estáticos y la ingesta Iberá usa token; no son el mismo modelo. Mitigación: componentes de acceso separados y claims explícitos.
- **Scope creep**: precios, marketplace, tareas y multi-tenant desbordan una primera fase. Mitigación: separar actual/cerca/futuro y mantener el review budget de 2000 líneas.
- **Accesibilidad del mapa**: una solución visual únicamente cartográfica excluye teclado y móvil. Mitigación: formulario/listado equivalente y tabla de ubicaciones.

## 9. Criterios de éxito de la exploración

- El próximo proposal puede señalar qué rutas se consumen por pantalla sin inventar endpoints, payloads, roles ni métricas.
- Cada superficie está etiquetada como `actual`, `cerca` o `futuro`, y ninguna promesa comercial depende de un placeholder.
- Una demo puede recorrer los dos flujos MVP de principio a fin y mostrar éxito, vacío, error, stale/degraded, retry y permisos sin mezclar Agronautas con Iberá-Alerta.
- La primera fase puede reutilizar primitives, BFF, contratos, SSE y semántica de estado sin compartir dominio, clientes, claims, prompts ni autorización.
- El diseño permite mapa con proveedor intercambiable y fallback accesible, y conserva procedencia/timestamps junto a score, alertas, pronósticos y chat.

## Approaches

1. **Expandir la pantalla actual** — Añadir más tarjetas y controles a `AgronautasWorkspace` y mantener Iberá como páginas independientes.
   - Pros: menor cambio inicial y reutiliza queries/componentes existentes.
   - Contras: perpetúa navegación plana, mezcla inventario técnico con decisiones y no resuelve mapa, polling de ingesta ni shell institucional.
   - Esfuerzo: Bajo/medio; no recomendado como dirección completa.

2. **UI/UX MVP por journeys, con shell común y productos separados** — Crear una capa de navegación y primitives compartidos, después cerrar los flujos de alta→riesgo→evidencia→recompute→chat→reporte y provincia→localidad→fuentes→ingesta→copilot usando contratos actuales.
   - Pros: máxima visibilidad de valor con bajo riesgo de backend, mantiene separación de dominios y deja placeholders honestos.
   - Contras: requiere reorganizar rutas/componentes y normalizar estados/eventos SSE sin ampliar todavía el dominio.
   - Esfuerzo: Medio/alto; recomendado.

3. **Plataforma unificada de gestión y marketplace** — Diseñar desde ahora workspaces multi-tenant, usuarios, tareas, precios y marketplace como producto completo.
   - Pros: cubre la visión futura más amplia.
   - Contras: no está respaldado por rutas/contratos actuales, aumenta claims y mezcla productos; reduce la demostrabilidad inmediata.
   - Esfuerzo: Alto/muy alto; fuera de la primera fase.

## Recommendation

Proceder con el enfoque 2: una fase UI/UX centrada en journeys verificables y visibilidad del backend existente, con un shell técnico común pero dos experiencias de producto estrictamente separadas. La prioridad es que un cliente pueda entender ubicación, estado, riesgo/alerta, frescura, evidencia, acción siguiente y reporte sin que la UI invente datos. El mapa debe abstraerse detrás de un adaptador y las superficies futuras deben quedar etiquetadas, no simuladas como funcionales.

## Ready for Proposal

Sí. El orquestador puede presentar esta exploración para aprobación y luego preparar un proposal que limite la primera fase a rutas/contratos existentes, shell/journeys, mapa provider-neutral, estados honestos, enriquecimiento de chat/SSE, seguimiento de ingesta Iberá y reporte. Antes de implementar conviene decidir únicamente la prioridad exacta de los journeys y el proveedor de mapa mediante una evaluación posterior; no es necesario ampliar backend para continuar con la propuesta.
