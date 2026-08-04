# Agronautas e Iberá-Alerta: roadmap big picture corregido

> Borrador estratégico para revisión y aprobación. Este documento no autoriza por sí mismo ningún apply, despliegue ni cambio de código.

## 1. Decisión estratégica vigente

Agronautas e Iberá-Alerta permanecen como **dos productos separados**, con clientes, identidad y propuesta de valor propias, sobre una plataforma técnica común. La venta se realiza principalmente dentro de las aplicaciones; una estrategia API-first como producto principal queda descartada. Auth y seguridad funcional pertenecen a `auth-security` y no se redefinen en este roadmap.

La corrección central es de **estado y secuencia**: no hay que volver a construir la UI aplicada ni tratar Iberá-Alerta como una idea futura. El siguiente trabajo debe convertir una base visual avanzada y dos productos parcialmente operativos en experiencias confiables, pilotables y comercialmente demostrables.

## 2. Baseline factual

### 2.1 Selección de versión

- La ref nominal `integration/merge-total-ibera-agronautas-20260727` apunta a `24308ef`.
- La línea de trabajo vigente a usar como baseline es `main/origin/main` en `7a3007a5`.
- El apply de UI/UX está incorporado en main mediante `27dafe9` y `7a3007a`.
- Por lo tanto, la UI/UX no debe describirse como uncommitted ni como trabajo pendiente de aplicación.
- La Fase 0 debe documentar esta selección de SHA, reconciliar la evidencia disponible y distinguir **aplicado**, **verificado**, **parcial** y **bloqueado**.

### 2.2 Estado de Agronautas

Agronautas tiene una demo/workspace UI muy avanzada: intake, dashboard, detalle de lote/campo, riesgo, drivers, alertas, timelines, evidencia, freshness, recompute, PDF, chat IA enriquecido y placeholders visibles. Existe demo pública y producción/demo utilizable, además de artefactos históricos.

Eso no equivale todavía a un sistema productivo consolidado. Persisten problemas reales de runtime y dominio: dos Risk Engines incompatibles, posible desalineación entre queue API y worker, Docker worker sin contracts completos, heartbeat en Redis frente a readiness dependiente de Postgres, snapshots de alertas y estado de job incompletos, drift entre schemas web/backend y cobertura de Corrientes que fuerza rice o conserva placeholders.

**Conclusión:** Agronautas está cerca de un piloto comercial sobre UI existente, pero antes necesita hardening técnico y de datos. No necesita otra fase de construcción visual inicial.

### 2.3 Estado de Iberá-Alerta

Iberá-Alerta ya cuenta con un MVP institucional sustancial y pulido: overview provincial, localidades, telemetría, PNA/INA/INMET/SMN, INA a 30 días, freshness/provenance, alertas, ingesta protegida, respuesta `202`, `statusPath`, scheduler, BFF, Copilot Advisor por SSE y UI aplicada.

Su problema no es una reconstrucción inicial. Necesita hardening y piloto: hacer durable el estado de `statusPath` con TTL, cerrar scheduler/lock/cron productivo, demostrar evidencia productiva mixta, consolidar INMET/SMN productivos, medir cobertura efectiva, limitar Copilot a zonas soportadas, agregar citas/evidence y operar retención/prune.

**Conclusión:** Iberá-Alerta pasa directamente a hardening, piloto institucional y luego expansión; no vuelve a una fase de “crear el MVP”.

## 3. Matriz de estado

| Producto/capacidad | Completo y usable | Parcial-desconectado | Cerca | Visión | Bloqueo técnico |
|---|---|---|---|---|---|
| **Agronautas — UI/workspace** | Intake, dashboard, detalle, riesgo visible, drivers, alertas, timelines, evidencia, freshness, recompute, PDF, chat IA, placeholders y journeys aplicados | La UI puede mostrar estados que todavía no representan operación durable o cobertura completa | Pulido de estados y narrativa sólo donde el runtime real lo requiera | Nuevos módulos de gestión, inteligencia y planificación | No volver a implementar UI; clasificar fallos como hardening |
| **Agronautas — demo pública** | Demo/producción pública y artifacts históricos disponibles para mostrar | Demo no prueba consistencia productiva de todas las fuentes ni del cálculo | Piloto controlado con datos y workflow real | Conversión a uso repetido y soporte | Selección de baseline y separación demo/piloto/producción |
| **Agronautas — Risk Engine** | Existen implementaciones y snapshots legibles | `risk-v0` TypeScript y `open-meteo-basic-v1` Python no son una salida canónica compartida | Elegir contrato, precedencia, versionado y reconciliación | Modelos agronómicos/financieros explicables | Bloquea confianza del piloto si produce resultados distintos |
| **Agronautas — queue/worker** | Hay dispatcher, locks, consumer y contratos parciales | Queue API, worker, Docker, job state y heartbeat pueden no representar el mismo ciclo | Alinear contrato, estados, reintentos, snapshots y readiness | Escala y jobs comunes tras reutilización probada | Bloquea recompute confiable y operación repetible |
| **Agronautas — datos Corrientes** | Existe seed/demo y límites explícitos | Alta real fuerza rice y la cobertura de Corrientes conserva placeholders | Intake sin cultivo forzado, cobertura efectiva y degradación visible | Ampliación geográfica posterior | No vender cobertura general antes de resolver la cobertura validada |
| **Iberá-Alerta — MVP institucional** | Overview, localidades, telemetría, fuentes, INA, alertas, provenance/freshness, ingesta, BFF, Copilot y UI | Durabilidad operativa, cobertura efectiva y evidencia productiva mixta | Hardening y piloto institucional | Expansión de zonas, instituciones y flujos | `statusPath`, scheduler/cron, fuentes y retención deben ser operables |
| **Iberá-Alerta — Copilot Advisor** | SSE, contexto hidrológico y guardrails de alcance existentes | Citas/evidence y límites de zona deben reflejar el estado real de datos | Copilot acotado a zonas soportadas con respuestas trazables | Más zonas y funciones según evidencia institucional | No presentarlo como autoridad operativa |
| **Plataforma común** | Patrones de contracts, provenance, freshness, jobs y observabilidad ya existen | No toda reutilización está probada entre productos | Extraer sólo componentes que sobrevivan pilotos | Plataforma común escalable | Evitar sobreplataformización prematura |

## 4. Qué fases anteriores estaban cumplidas o mal clasificadas

### Ya cumplido

- La decisión de mantener dos productos y una plataforma técnica común está vigente.
- La prioridad UI/UX ya se materializó: el apply de visibilidad está en main; no es una tarea uncommitted.
- La cobertura de tests web reportada es 83/83, el build es correcto y el Playwright UI/UX focalizado es 5/5.
- Agronautas ya tiene una demo/workspace demostrable y Iberá-Alerta ya tiene un MVP institucional visualmente pulido.
- Existen producción/demo pública y documentación/artifacts históricos que deben conservarse como evidencia contextual, no mezclarse automáticamente con el estado productivo actual.

### Mal clasificado en el roadmap anterior

- La UI de ambos productos estaba puesta como una fase futura o como trabajo de implementación; debe pasar a **completo y usable**, con cualquier defecto remanente tratado como hardening.
- Iberá-Alerta estaba tratado como producto institucional futuro; en realidad ya existe un MVP sustancial y debe pasar a hardening/piloto.
- La Fase 0 estaba demasiado enfocada en verify/harness y no enumeraba el baseline técnico que bloquea Agronautas.
- El orden colocaba hardening de datos/Risk Engine después de más UI; debe ocurrir antes del piloto comercial serio.
- Un fallo E2E preexistente de locator ambiguo y riesgos históricos de runtime no justifican otra UI; deben clasificarse como hardening/verificación.
- Demo usable, piloto controlado, producción y visión estaban insuficientemente separados.

## 5. Separación de tracks

| Track | Incluye | No incluye |
|---|---|---|
| **Hardening** | Contracts, runtime, workers, fuentes, cobertura, estados, observabilidad, retención, fallos y evidencia | Nuevos módulos de producto o promesas comerciales |
| **Producto** | Gestión, inteligencia, planificación, mercado y expansión funcional | Reparar silenciosamente un runtime roto dentro de una feature |
| **Comercial** | Selección de pilotos, discovery, demos, propuesta de valor y casos de éxito | Inventar clientes, métricas, fechas o resultados |
| **Visión** | Capacidades condicionadas a adopción, datos y responsabilidad validada | Comprometerlas como entregables inmediatos |

## 6. Fases corregidas

### Fase 0 — Baseline real, selección de SHA y documentación/harness

**Tipo:** baseline y hardening de verificación. **Productos:** ambos. **Horizonte:** inmediato.

**Objetivo:** establecer una línea base honesta sin repetir la UI aplicada.

**Primeros pasos exactos:**

1. Registrar `main/origin/main` en `7a3007a5` como baseline y `24308ef` como referencia nominal histórica; documentar la relación con `27dafe9` y `7a3007a`.
2. Inventariar por separado evidencia de commit, build, tests, Playwright, demo pública, producción y artifacts históricos; no convertir evidencia local en evidencia productiva.
3. Marcar la UI/UX como aplicada y usable; no abrir tareas para rehacer intake, dashboard, detalle, riesgo, alertas, timelines, evidencia, freshness, recompute, PDF, chat o la UI institucional existente.
4. Crear un mapa de harness que pruebe journeys y estados reales, incluyendo el locator E2E ambiguo preexistente y los riesgos de runtime, sin convertirlos en una nueva fase de diseño.
5. Abrir un registro de decisiones para el Risk Engine canónico, ciclo de job, fuente de heartbeat, cobertura inicial y criterios de piloto.

**Terminado cuando:** existe un baseline único, cada afirmación tiene categoría de evidencia, los journeys aplicados están catalogados y el backlog restante está dividido entre hardening, producto, comercial y visión.

**No hacer:** no modificar el documento anterior, no reimplementar UI, no inventar cobertura, clientes ni métricas, y no resolver auth/security aquí.

### Fase 1 — Hardening Agronautas: Risk Engine, queue, schemas y runtime

**Tipo:** hardening técnico y de datos. **Producto:** Agronautas. **Horizonte:** inmediato/cerca.

**Objetivo:** que un recompute produzca una salida única, trazable y operable de extremo a extremo.

**Alcance:**

- Elegir un Risk Engine canónico y una versión de contrato. Comparar explícitamente `risk-v0` en TypeScript con `open-meteo-basic-v1` en Python; conservar la trazabilidad de reglas y explicar cualquier discrepancia antes de retirar un camino.
- Alinear `RequestRiskRecomputeUseCase`, dispatcher, queue API, `WorkflowQueueConsumer` y `agronautas_jobs.py`: mismo `jobId`, `runId`, `requestId`, estado, reintento, error, resultado y correlation ID.
- Completar los contracts usados por el Docker worker y eliminar la posibilidad de que el worker valide un catálogo distinto del API.
- Definir el estado durable del job y del snapshot: queued, running, succeeded, failed, stale/degraded cuando corresponda; persistir resultado, error y timestamps suficientes para operar sin mirar Redis manualmente.
- Resolver la diferencia entre heartbeat en Redis y readiness basada en Postgres: declarar qué prueba disponibilidad del proceso, qué prueba capacidad de servicio y qué dependencia es obligatoria.
- Completar alert snapshots y su relación con el Risk Snapshot; una alerta no debe sobrevivir sin saber de qué snapshot proviene.
- Eliminar el supuesto de que una alta real es rice: mantener el dato elegido por el usuario y distinguir cobertura de Corrientes disponible, pendiente o placeholder.
- Reconciliar schemas hidrológicos web/backend y estados de degradación sin mezclar una reparación de Agronautas con una nueva feature.

**Terminado cuando:** una solicitud de recompute puede seguirse desde API hasta worker y persistencia; el mismo caso produce una salida canónica en ambos runtimes; readiness, heartbeat, alertas y estado de job cuentan la misma historia; y la cobertura/placeholder se muestra explícitamente.

**Dependencias:** Fase 0. **Bloquea:** piloto comercial Agronautas.

### Fase 2 — Hardening y piloto Iberá-Alerta

**Tipo:** hardening operativo, fuentes y piloto institucional. **Producto:** Iberá-Alerta. **Horizonte:** inmediato/cerca.

**Objetivo:** transformar el MVP institucional existente en un servicio piloto operable, sin reconstruirlo.

**Alcance:**

- Sacar el estado de `statusPath` de la memoria del proceso y darle persistencia/TTL, con estados consultables después de reinicio y limpieza controlada.
- Definir una única operación de scheduler: lock, cron productivo, frecuencia, reintentos y responsable. Mantener el comportamiento de Render Free documentado en el runbook y no contar una configuración de Cron como prueba de ejecución.
- Validar evidencia productiva mixta por fuente: PNA, INA, INMET y SMN deben conservar resultados independientes, fallos, vacíos, freshness y provenance; el sistema no debe sustituir silenciosamente fuentes productivas con fixtures.
- Medir cobertura efectiva de localidades/zonas y hacer visibles las áreas no soportadas.
- Limitar Copilot Advisor a las zonas y contextos con datos disponibles; añadir citas/evidence y mantenerlo como asesor, no como autoridad institucional.
- Operar retención/prune de ingestas y estados sin perder la reconstrucción mínima de un incidente.
- Integrar la autenticación institucional mediante `auth-security` cuando corresponda; este roadmap sólo registra la dependencia y el criterio de integración, no redefine auth.

**Terminado cuando:** un operador puede lanzar una ingesta, recibir `202`, consultar `statusPath` durable, distinguir éxito/parcial/fallo por fuente, verificar provenance/freshness, recuperar historial retenido y usar el Copilot dentro de su zona soportada.

**Dependencias:** Fase 0; patrones de contracts y operación de Fase 1 cuando sean reutilizables. **Puede avanzar en paralelo con Fase 1, pero no debe esperar una reconstrucción de Agronautas.**

### Fase 3 — Piloto comercial Agronautas sobre la UI ya aplicada

**Tipo:** comercial y producto pilotable. **Producto:** Agronautas. **Horizonte:** cerca.

**Objetivo:** comprobar valor con usuarios representativos usando la UI existente y un runtime suficientemente confiable.

**Alcance:**

- Elegir uno o pocos journeys concretos: intake de campo, lectura de riesgo/causas, alerta, evidencia y reporte/recompute.
- Usar los componentes actuales, modificando sólo estados o contratos que Fase 1 demuestre necesarios.
- Separar tres entornos narrativos: demo guiada, piloto controlado y producción; no presentar la demo como prueba de operación general.
- Documentar problema inicial, workflow, datos utilizados, decisión tomada, evidencia, límites y feedback sin inventar nombres ni métricas.
- Vender principalmente el resultado dentro de Agronautas, no una API abstracta.

**Terminado cuando:** un usuario externo puede completar el journey elegido con datos y estados honestos, entiende qué está observado/calculado/degradado y puede repetirlo sin depender de una explicación técnica del equipo.

**Dependencias:** Fases 0 y 1. **Actividad comercial separada:** discovery, demo y seguimiento no sustituyen el hardening.

### Fase 4 — Agronautas como sistema de gestión

**Tipo:** producto. **Producto:** Agronautas. **Horizonte:** medio.

**Objetivo:** pasar de consultar un campo a organizar la campaña y conservar la memoria de decisiones.

**Capacidades condicionadas:** workspaces, lotes, campañas, tareas, responsables, historial, decisiones, adjuntos/evidencia, reportes y colaboración.

**Terminado cuando:** el usuario puede crear o seleccionar un workspace, organizar lotes, registrar tarea/decisión, consultar historial y generar un reporte accionable con evidencia y estado del dato.

**Dependencias:** identidad de campo y Risk Engine canónico de Fase 1, más aprendizaje del piloto de Fase 3. No construir un ERP agrícola total en esta fase.

### Fase 5 — Inteligencia de suelo, cultivo, clima, precios y dólar

**Tipo:** producto e inteligencia. **Producto:** Agronautas. **Horizonte:** medio/ambicioso.

**Objetivo:** combinar contexto productivo y económico para comparar alternativas explicables.

**Alcance condicionado a datos reales:** perfiles de suelo y cultivo, clima, precios, dólar, tendencias, commodities y recomendación contextual; toda recomendación debe exponer entradas, vigencia, supuestos, incertidumbre y razones a favor/en contra.

**Terminado cuando:** una comparación para un lote puede ser revisada por el usuario y no presenta una hipótesis como certeza ni oculta datos faltantes.

**Dependencias:** Fases 1, 3 y 4. La calidad de las fuentes es un requisito, no una pantalla adicional.

### Fase 6 — Planificación y simuladores

**Tipo:** producto avanzado. **Producto:** Agronautas. **Horizonte:** ambicioso.

**Objetivo:** planificar campañas y explorar escenarios sin confundir simulación con pronóstico garantizado.

**Capacidades:** calendario, recursos, restricciones, escenarios de cultivo, sensibilidad a clima/precios/dólar, presupuesto y comparación de resultados.

**Terminado cuando:** el usuario puede editar supuestos, comparar alternativas, guardar la decisión elegida y revisar sus advertencias de incertidumbre.

**Dependencias:** gestión de Fase 4 e inteligencia de Fase 5. No iniciar por el simulador antes de disponer de datos, historial y reglas explicables.

### Fase 7 — Market intelligence, commodities, marketplace y conexiones

**Tipo:** producto/comercial condicionado. **Producto:** Agronautas. **Horizonte:** ambicioso.

**Objetivo:** conectar una decisión productiva con inteligencia comercial y relaciones sectoriales dentro de la aplicación.

**Capacidades posibles:** contexto de commodities, oportunidades de mercado/exportación, ofertas, proveedores/compradores, perfiles y conexiones.

**Terminado cuando:** existe demanda validada y el usuario puede pasar de análisis a oportunidad entendiendo condiciones, vigencia, procedencia y límites; no se debe abrir un marketplace por anticipación.

**Dependencias:** confianza y uso repetido de Fases 3–6, reglas comerciales y capacidad de moderación/soporte.

### Fase 8 — Iberá-Alerta: expansión institucional posterior

**Tipo:** producto institucional y expansión. **Producto:** Iberá-Alerta. **Horizonte:** posterior al piloto.

**Objetivo:** ampliar zonas, fuentes, instituciones y flujos sólo después de probar el MVP institucional hardenizado.

**Alcance:** nuevas localidades o jurisdicciones soportadas, más cobertura efectiva, historial de incidentes, vistas por rol institucional, operación de fuentes y Copilot acotado a contextos demostrados.

**Terminado cuando:** cada nueva zona tiene fuente, freshness, provenance, cobertura, operación, retención y protocolo de uso explícitos; la expansión no degrada el alcance validado anterior.

**Dependencias:** Fase 2 y evidencia de piloto institucional. No es la reconstrucción de Iberá-Alerta; es su expansión.

### Fase 9 — Riesgo financiero, seguros y siniestros

**Tipo:** producto regulado/alianzas. **Producto:** principalmente Agronautas. **Horizonte:** visión condicionada.

**Objetivo:** preparar evidencia y contexto para crédito, seguros y siniestros sin automatizar decisiones de terceros.

**Terminado cuando:** un actor autorizado puede revisar variables, evidencia, supuestos y expediente; toda aprobación, cobertura o indemnización mantiene revisión humana y reglas legales/comerciales explícitas.

**Dependencias:** Risk Engine canónico, historial de campañas, datos productivos, pilotos comerciales y alianzas reales. No comenzar por la promesa financiera.

### Fase 10 — Escala y plataforma común basada en reutilización probada

**Tipo:** plataforma y operación. **Productos:** ambos.

**Objetivo:** escalar sin fusionar los productos ni anticipar una plataforma abstracta.

**Alcance:** reutilizar únicamente componentes demostrados en producción/pilotos: contracts, provenance/freshness, ingestas, jobs, telemetría, reportes, observabilidad, administración, costos y soporte.

**Terminado cuando:** una capacidad compartida no altera la identidad ni el comportamiento de un producto, existen responsables y recuperación operativa, y la reutilización reduce costo o riesgo observado.

**Dependencias:** resultados de Fases 1–9. No es una autorización para construir una API pública masiva, multi-tenant genérica o infraestructura de escala sin demanda demostrada.

## 7. Dependencias reales

```text
Fase 0
  ├── Fase 1: hardening Agronautas
  │     └── Fase 3: piloto comercial Agronautas
  │           └── Fase 4: gestión
  │                 └── Fase 5: inteligencia
  │                       └── Fase 6: planificación/simuladores
  │                             └── Fase 7: mercado y conexiones
  │                                   └── Fase 9: finanzas/seguros/siniestros
  └── Fase 2: hardening y piloto Iberá-Alerta
        └── Fase 8: expansión institucional

Aprendizaje probado de Fases 1–9 → Fase 10: escala y plataforma común
```

Fases 1 y 2 pueden avanzar en paralelo con equipos separados. Fase 3 no debe iniciar como piloto serio hasta que Fase 1 establezca una lectura de riesgo y runtime confiables. Fase 8 depende de la operación demostrada de Fase 2, no de completar toda la visión de Agronautas. Fase 10 sólo consolida reutilización observada.

## 8. Oportunidades por horizonte

### Rápidas

- Fijar el baseline `7a3007a5` y corregir la narrativa de estado.
- Etiquetar la UI aplicada como usable y separar sus defectos de los gaps de runtime.
- Resolver el locator E2E ambiguo preexistente dentro de hardening/verificación.
- Hacer visibles en las pantallas actuales freshness, provenance, placeholders, límites y estados de job.
- Eliminar el supuesto de rice en el intake real y mostrar cobertura de Corrientes con honestidad.
- Completar un journey demo/piloto de Agronautas y un flujo operativo de Iberá-Alerta sin agregar módulos nuevos.

### Medias

- Risk Engine canónico y contrato cross-runtime.
- Queue/worker, Docker contracts, heartbeat, readiness, job state y snapshots alineados.
- `statusPath` durable, scheduler/cron operativo, evidencia productiva por fuente y retención Iberá-Alerta.
- Piloto controlado de Agronautas sobre UI existente.
- Gestión de workspaces, lotes, tareas, campañas y decisiones.
- Comparaciones de suelo/cultivo/clima/precios/dólar con datos y supuestos explícitos.

### Ambiciosas

- Simuladores de campaña y recomendación contextual.
- Market intelligence, commodities, marketplace y conexiones sectoriales.
- Expansión institucional de Iberá-Alerta por zonas y clientes validados.
- Riesgo financiero, seguros y siniestros con actores autorizados.
- Escala y plataforma común basada en reutilización comprobada.

## 9. Estrategia de pilotos y casos de éxito

### Agronautas

1. **Demostración guiada:** usar intake, dashboard, detalle, riesgo, alertas, evidencia, recompute, PDF y chat existentes para validar comprensión; no presentarla como producción general.
2. **Piloto controlado en Corrientes:** escoger un caso representativo y acotado, validar datos, Risk Engine canónico, estados de runtime y una decisión con evidencia.
3. **Conversión a uso repetido:** sólo después de que el workflow se repita, medir qué módulo de gestión o inteligencia merece inversión.

### Iberá-Alerta

1. **Piloto institucional:** probar un flujo de alerta realista con overview/localidad, fuente, freshness, estado operativo, acción esperada e historial.
2. **Operación de ingesta:** observar `202`, `statusPath`, resultados por fuente, cobertura efectiva y retención en condiciones productivas permitidas.
3. **Expansión:** incorporar zonas o actores sólo cuando el caso inicial tenga operación, evidencia y protocolo de soporte repetibles.

Cada caso debe registrar problema inicial, usuario y momento del workflow, datos usados, decisión o acción, evidencia, límites, fallos y resultado observado. No se publicarán clientes, porcentajes, ahorros ni fechas como hechos sin autorización y evidencia.

## 10. Criterios de terminado por producto

### Agronautas

El núcleo se considera terminado cuando un productor o asesor puede, dentro de Agronautas, organizar un campo y sus lotes, consultar datos frescos y trazables, entender un Risk Snapshot canónico y sus drivers, revisar alertas, registrar decisiones y tareas, producir un reporte y luego comparar alternativas o planificar con supuestos visibles. Debe existir uso repetido, runtime operable, cobertura declarada, journeys principales sin bloqueos y soporte comercial probado. “Terminado” no significa ausencia de nuevas ideas; significa que el núcleo entrega valor sin depender de una demo guiada.

### Iberá-Alerta

El alcance validado se considera terminado cuando una institución puede observar territorio, localidades y telemetría, consultar INA y fuentes habilitadas, recibir/revisar alertas, verificar source/provenance/freshness, operar o supervisar ingestas, reconstruir un incidente dentro de la retención definida y usar Copilot como apoyo acotado. Debe mantener identidad institucional, estado operativo entendible, cobertura declarada, fuentes sostenibles y un caso de uso repetible. No necesita ser una plataforma nacional para estar terminado en su alcance validado.

## 11. Decisiones que requieren aprobación

1. Confirmar `7a3007a5` como baseline rector y `24308ef` como referencia histórica, sin tratar la UI aplicada como pendiente.
2. Aprobar el orden Fase 0 → hardening técnico → pilotos; no repetir la construcción UI.
3. Nombrar el responsable de decidir el Risk Engine canónico y el proceso para resolver discrepancias entre TypeScript y Python.
4. Confirmar el contrato de job, fuente de heartbeat, dependencia real de readiness y estados mínimos persistidos.
5. Confirmar el alcance efectivo de Corrientes y las fuentes prioritarias, sin forzar rice ni ocultar placeholders.
6. Confirmar que Iberá-Alerta pasa a hardening/piloto y qué zonas quedan soportadas inicialmente.
7. Confirmar el criterio de durabilidad, TTL, scheduler/cron, evidencia y retención para `statusPath`.
8. Elegir los primeros journeys y perfiles de piloto de ambos productos, sin inventar clientes.
9. Confirmar qué funciones de gestión, inteligencia, mercado, crédito y seguros se mantienen condicionadas a validación.
10. Confirmar que Copilot/IA entrega recomendación explicada y citas/evidence cuando corresponda, nunca autoridad final por defecto.
11. Confirmar qué componentes comunes sólo se extraerán después de observar reutilización real.
12. Aprobar los criterios de terminado y la evidencia mínima para pasar de hardening a piloto y de piloto a expansión.

## 12. Referencias de código, contratos y operación

### Agronautas

- `apps/web/src/components/agronautas/workspace.tsx`, `page-client.tsx`, `field-detail.tsx`: workspace, intake, dashboard y detalle aplicados.
- `apps/web/tests/e2e/uiux-journeys.spec.js`: journeys UI/UX focalizados.
- `apps/api/src/application/usecases/compute-field-risk-usecase.ts`: camino TypeScript con `risk-v0`.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`: camino Python con `open-meteo-basic-v1`.
- `apps/api/src/application/usecases/request-risk-recompute-usecase.ts`: enqueue, lock, job metadata y dispatch.
- `apps/workflow-runtime-python/src/worker/queue/consumer.py`: consumo, reintentos, dead-letter y ejecución de jobs.
- `apps/workflow-runtime-python/src/worker/main.py`: carga de contracts y estado del worker; revisar su relación con el Docker worker real.
- `apps/api/src/infrastructure/database/redis/agronautas-recompute-lock-repository.ts`: lock de recompute en Redis.
- `apps/api/src/presentation/routes/health.ts`: health/readiness y reporte de heartbeat/dependencias.
- `apps/api/src/infrastructure/database/postgres/agronautas-risk-snapshot-repository.ts` y `agronautas-alert-snapshot-repository.ts`: persistencia de snapshots.
- `packages/contracts/schemas/agronautas-contracts.v1.schema.json`: catálogo cross-runtime de intake, señales, riesgo, alertas y scheduler.
- `packages/zod-schemas/src/agronautas.ts`: schemas compartidos y contratos hidrológicos/operativos.

### Iberá-Alerta

- `apps/api/src/presentation/routes/hydrology-government.ts`: ingesta, `202`, `statusPath`, fuentes, resultados y estado de operación.
- `packages/hydrology-engine/src/services/hydrology-copilot-service.ts`: Copilot Advisor, contexto oficial, SSE y límites de alcance.
- `apps/web/src/components/government/overview.tsx`, `detail.tsx`, `ingest-panel.tsx`: overview, detalle y operación visible.
- `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` y `hydrology-prune-job.ts`: scheduler, locks y retención/prune.
- `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`: contrato operativo, BFF, Cron, `statusPath`, evidencia y límites de producción.
- `apps/web/tests/e2e/hydrology-government.spec.js` y `municipalities-alerts.spec.ts`: cobertura de recorridos hidrológicos y alertas.

### Baseline y producto

- `27dafe9` y `7a3007a5`: UI/UX y explicitación de datos de demo ya incorporadas en main.
- `24308ef`: ref nominal histórica y ajuste de readiness; no usarla para afirmar el estado actual de main.
- `docs/agronautas-roadmap-big-picture.md`: documento anterior, deliberadamente no modificado.

## 13. Recomendación de aprobación

Aprobar primero la corrección de estado y el orden de trabajo: baseline real, hardening paralelo de Agronautas e Iberá-Alerta, piloto Agronautas sobre UI existente, y expansión sólo después de evidencia. La aprobación de este roadmap no aprueba ningún apply; cada fase posterior debe convertirse en un alcance independiente con sus propias decisiones, criterios de terminado y evidencia.
