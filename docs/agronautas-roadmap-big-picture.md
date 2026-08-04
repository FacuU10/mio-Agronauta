# Agronautas e Iberá-Alerta: roadmap big picture

> Documento estratégico para revisión y aprobación. No autoriza por sí mismo nuevas fases de implementación.

## 1. Norte estratégico

Agronautas e Iberá-Alerta seguirán siendo **dos productos separados**, con propuestas de valor, identidad y clientes distintos, apoyados por una plataforma técnica común. La información se comercializará principalmente dentro de las aplicaciones: las APIs serán habilitadores internos y de integración, no el producto comercial principal.

La secuencia recomendada es deliberadamente incremental: primero una experiencia demostrable y confiable; luego datos reales y operación; después profundidad de producto, inteligencia y monetización. La visión completa es ambiciosa, pero cada etapa debe producir un resultado usable y comprobable antes de ampliar el alcance.

### Mapa de productos

| Producto | Usuario y promesa | Identidad | Evolución prevista |
|---|---|---|---|
| **Agronautas** | Productores, asesores y actores agropecuarios: convertir información dispersa en decisiones y gestión de campaña. | Operativa, orientada a decisión y acción. | De visibilidad de campo y riesgo hacia sistema de gestión agrícola, inteligencia, planificación, mercado y servicios financieros. |
| **Iberá-Alerta** | Organismos y operadores institucionales: observar territorio, hidrología y alertas con evidencia trazable. | Institucional, sobria y confiable. | De consola de datos y alertas hacia producto institucional completo con fuentes, ingesta, operación y clientes. |
| **Plataforma técnica común** | Equipo interno y productos: componentes compartidos sin mezclar propuestas comerciales. | Invisible para el usuario final. | Datos, provenance/freshness, observabilidad, jobs, contratos, componentes UI y capacidades de operación reutilizables. |

### Convenciones de horizonte

- **Actual:** aplicado o ya disponible.
- **Cerca:** siguiente bloque de producto, necesario para demostrar valor real.
- **Futuro:** expansión que depende de datos, operación y adopción comprobadas.
- **Visión completa:** capacidades ambiciosas que sólo se justifican con casos de éxito y operación sostenida.

## 2. Decisiones aprobadas

- La prioridad inicial es UI/UX y producto demostrable; después robustez de datos/backend y expansión.
- La cobertura agro inicial es Corrientes.
- Agronautas e Iberá-Alerta no se fusionan como producto.
- Se priorizan las propuestas 1, 2 y 4 del big picture; la estrategia API-first fue descartada.
- Auth y seguridad funcional pertenecen a `auth-security` y no forman parte de este plan.
- Se debe unificar/mergear los dos caminos actuales de cálculo de riesgo, conservando lo mejor de ambos.
- El apply UI/UX de `agronautas-ibera-uiux-mvp-visibility` está completo: 10/10 tareas.
- El siguiente desbloqueo es verify/harness sin review: resolver la evidencia del estado aplicado y el fallo E2E preexistente de locator ambiguo dentro de hardening/verificación, sin convertirlo en una nueva revisión de producto.

## 3. Fases de evolución

### Fase 0 — Estado actual y desbloqueo de verify/harness

**Horizonte:** actual. **Productos:** ambos y plataforma común.

- **Objetivo:** establecer una línea base honesta para continuar sin rehacer lo aplicado.
- **Capacidades:** Agronautas ya dispone de workspace/intake/mapa, dashboard, detalle, riesgo, alertas, evidencia, freshness, timelines, recompute, reportes y chat IA enriquecido. Iberá-Alerta dispone de overview, localidades, telemetría, alertas, INA, provenance/freshness, ingesta con `statusPath` y Copilot Advisor. La plataforma contiene las bases compartidas de datos y operación.
- **Dependencias:** estado aplicado y evidencia existente; no depende de nuevas features.
- **Qué se construye:** paquete de verificación/harness del estado actual, con trazabilidad de journeys y corrección del locator E2E ambiguo cuando corresponda.
- **Aceptación:** 10/10 tareas UI/UX aplicadas; tests web 83/83; build correcto; Playwright UI/UX focalizado 5/5; el fallo E2E preexistente queda resuelto o explícitamente aislado y documentado antes de declarar hardening concluido.
- **Resultado comercial:** demo coherente para mostrar, sin afirmar todavía operación productiva completa.
- **Riesgos y límites:** la cobertura visual no prueba calidad de fuentes ni precisión del riesgo; no agregar alcance funcional para maquillar gaps.
- **Métricas/caso de éxito:** evidencia anterior reproducible y separación clara entre “aplicado”, “verificado” y “pendiente”.

### Fase 1 — UI/UX y producto demostrable

**Horizonte:** cerca. **Productos:** Agronautas e Iberá-Alerta.

- **Objetivo:** que cada producto explique su valor en segundos y permita completar sus recorridos principales sin confusión.
- **Capacidades:** pulido de navegación, jerarquía, estados vacíos/cargando/error, freshness visible, evidencia contextual, mapas, timelines, detalle, alertas y chat; Iberá-Alerta debe renderizar de forma completa los datos que ya existen sin perder identidad institucional.
- **Dependencias:** Fase 0 y contratos de datos actuales.
- **Qué se construye:** refinamiento de los journeys prioritarios, búsqueda/ubicación de campo en Agronautas, presentación consistente de riesgo y alertas, visualización de todos los módulos existentes de Iberá-Alerta y mensajes que diferencien dato observado, cálculo y recomendación.
- **Aceptación:** un usuario externo puede recorrer los casos principales de ambos productos, entender el origen y vigencia del dato, y llegar a una acción o conclusión sin pantallas incompletas ni estados engañosos.
- **Resultado comercial:** demo vendible como experiencia de producto, apta para conversaciones con productores, asesores y organismos.
- **Riesgos y límites:** no ampliar funcionalidades por estética; no reemplazar datos faltantes con mocks sin señalarlos; no imponer una UI genérica SaaS.
- **Métricas/caso de éxito:** journeys demostrables de punta a punta, reducción de bloqueos de navegación y feedback cualitativo de usuarios piloto.

### Fase 2 — Datos reales, fuentes y Risk Engine canónico

**Horizonte:** cerca. **Productos:** principalmente Agronautas; capacidades comunes y preparación de Iberá-Alerta.

- **Objetivo:** convertir la demo en una lectura confiable de Corrientes y fijar una única interpretación operativa del riesgo.
- **Capacidades:** catálogo de fuentes, provenance, freshness, validación, ingesta, manejo de fallos, reconciliación y Risk Engine canónico.
- **Dependencias:** journeys de Fase 1; identificación de fuentes disponibles; definición del contrato de riesgo.
- **Qué se construye:** cobertura real inicial de Corrientes; evaluación y merge de los dos caminos de cálculo actuales; reglas de precedencia, versionado del cálculo, explicación del resultado y operación observable de ingestas y recomputes.
- **Aceptación:** cada dato relevante muestra fuente y vigencia; los dos caminos de riesgo producen una salida canónica explicable; los fallos de una fuente no ocultan silenciosamente el resto; un operador puede detectar, repetir y auditar una ingesta.
- **Resultado comercial:** Agronautas puede sostener conversaciones basadas en datos reales, no sólo en diseño; Iberá-Alerta conserva una base preparada para institucionalizar fuentes.
- **Riesgos y límites:** no prometer precisión agronómica o financiera que las fuentes no soportan; la primera cobertura no equivale a cobertura nacional.
- **Métricas/caso de éxito:** fuentes activas y frescas, discrepancias de cálculo resueltas, recomputes trazables y un campo piloto de Corrientes con lectura consistente.

### Fase 3 — Agronautas como sistema de gestión agrícola

**Horizonte:** futuro cercano. **Producto:** Agronautas.

- **Objetivo:** pasar de observar el campo a organizar el trabajo y conservar la memoria de decisiones.
- **Capacidades:** workspaces, lotes, campañas, tareas, responsables, historial, decisiones, adjuntos/evidencia, reportes y colaboración.
- **Dependencias:** identidad de campo y riesgo canónico de Fase 2; UI de Fase 1.
- **Qué se construye:** ciclo de vida de workspace y lote; bandeja de tareas; registro de decisiones; historial temporal; reportes accionables; integración contextual del chat IA sin convertirlo en fuente no trazable.
- **Aceptación:** un usuario puede crear o seleccionar un workspace, ubicar lotes, registrar una tarea/decisión, consultar su historial y producir un reporte con evidencia y estado del dato.
- **Resultado comercial:** mayor frecuencia de uso y retención: Agronautas acompaña la operación, no sólo la consulta ocasional.
- **Riesgos y límites:** evitar un ERP agrícola total en la primera entrega; no duplicar reglas en la UI; no mezclar gestión privada con datos institucionales.
- **Métricas/caso de éxito:** campañas y decisiones registradas, tareas cerradas con evidencia, reportes reutilizados y usuarios que vuelven para gestionar.

### Fase 4 — Inteligencia de suelo, cultivos, clima, dólar, precios y recomendación

**Horizonte:** futuro. **Producto:** Agronautas.

- **Objetivo:** combinar contexto productivo y económico para explicar qué alternativas son razonables para cada campo.
- **Capacidades:** suelo, cultivos, clima, dólar, precios, tendencias, commodities y recomendador de cultivo.
- **Dependencias:** datos reales y provenance de Fase 2; lotes/campañas de Fase 3; reglas de negocio y límites agronómicos explícitos.
- **Qué se construye:** perfil productivo por lote, series comparables, indicadores económicos, hipótesis de cultivo y recomendación explicada por supuestos, no una orden automática.
- **Aceptación:** el usuario puede comparar alternativas para un lote y ver datos de entrada, vigencia, supuestos, incertidumbre y razones a favor/en contra.
- **Resultado comercial:** propuesta de valor diferenciada: convertir información dispersa en criterio de decisión.
- **Riesgos y límites:** no presentar recomendación como asesoramiento infalible; precios y dólar pueden cambiar; la ausencia de datos debe ser visible.
- **Métricas/caso de éxito:** recomendaciones revisadas por usuarios, decisiones que citan el análisis y disminución de trabajo manual para preparar una comparación.

### Fase 5 — Planificación de campañas y simuladores de escenarios

**Horizonte:** visión de producto avanzada. **Producto:** Agronautas.

- **Objetivo:** permitir planificar antes de ejecutar y explorar consecuencias sin confundir simulación con pronóstico garantizado.
- **Capacidades:** calendario de campaña, recursos, restricciones, escenarios de cultivo, sensibilidad a clima/precios/dólar, presupuesto y comparación de resultados.
- **Dependencias:** recomendador y datos históricos de Fase 4; gestión de campañas de Fase 3.
- **Qué se construye:** plan base, variantes “qué pasa si”, supuestos editables, comparación de riesgo/retorno y registro de la decisión adoptada.
- **Aceptación:** el usuario puede crear un plan, alterar supuestos, comparar escenarios y guardar la elección con fecha, evidencia y advertencias de incertidumbre.
- **Resultado comercial:** Agronautas se vuelve una herramienta de planificación de campaña y no sólo de monitoreo.
- **Riesgos y límites:** evitar precisión falsa; los modelos deben ser interpretables y acotados a la calidad de datos disponible.
- **Métricas/caso de éxito:** planes usados en campañas reales, escenarios comparados antes de una decisión y supuestos revisados después con resultados observados.

### Fase 6 — Market intelligence, commodities, marketplace y conexiones

**Horizonte:** visión completa de Agronautas. **Producto:** Agronautas.

- **Objetivo:** cerrar el circuito desde la decisión productiva hasta la inteligencia comercial y las conexiones del sector dentro de la app.
- **Capacidades:** market intelligence, commodities, oportunidades de exportación, marketplace, proveedores/compradores, perfiles y conexiones sectoriales.
- **Dependencias:** confianza de Fases 2–5, perfiles de usuario, reglas comerciales y validación de demanda.
- **Qué se construye:** tableros de mercado, contexto de commodities, descubrimiento de oportunidades, publicación/consulta de ofertas y conexiones con trazabilidad de contexto.
- **Aceptación:** el usuario puede pasar de un análisis de campaña a una oportunidad comercial dentro de Agronautas, entendiendo condiciones, vigencia y límites de la información.
- **Resultado comercial:** nuevas superficies de monetización y mayor valor por usuario, sin convertir el producto en un portal genérico.
- **Riesgos y límites:** riesgo de baja liquidez, información obsoleta, conflictos de interés y carga operativa de moderación; validar primero con pilotos.
- **Métricas/caso de éxito:** oportunidades calificadas, conexiones relevantes, interacciones comerciales iniciadas y recurrencia del módulo.

### Fase 7 — Iberá-Alerta como producto institucional completo

**Horizonte:** futuro, con identidad independiente. **Producto:** Iberá-Alerta.

- **Objetivo:** entregar a instituciones una visión territorial confiable, operable y defendible ante incidentes.
- **Capacidades:** UI/UX institucional, fuentes oficiales, ingesta, telemetría, alertas, INA, provenance/freshness, status operativo, Copilot Advisor y vistas por localidad.
- **Dependencias:** Fase 1 para experiencia; patrones de Fase 2 para fuentes y operación; validación con usuarios institucionales.
- **Qué se construye:** cobertura visual completa de datos existentes, onboarding de fuentes oficiales, operación de ingestas, alertas con contexto y evidencia, historial de incidentes y flujos para clientes institucionales.
- **Aceptación:** un operador identifica situación, fuente, vigencia, severidad y acción sugerida; una institución puede revisar el historial y explicar de dónde provino cada señal.
- **Resultado comercial:** producto institucional demostrable y preparado para pilotos, separado de la narrativa comercial de Agronautas.
- **Riesgos y límites:** no sobrediseñar para todas las jurisdicciones; la autoridad del dato depende de fuentes y acuerdos; Copilot asesora, no reemplaza protocolos institucionales.
- **Métricas/caso de éxito:** fuentes operativas, alertas trazables, tiempos de detección/interpretación observables y ejercicios institucionales completados.

### Fase 8 — Riesgo financiero, crédito, seguros y siniestros

**Horizonte:** visión completa y condicionada. **Productos:** Agronautas; integraciones institucionales sólo si aportan valor.

- **Objetivo:** extender el conocimiento de riesgo hacia decisiones de financiación, cobertura y gestión de siniestros.
- **Capacidades:** riesgo financiero, elegibilidad/explicación para crédito, seguros, evidencia de siniestro, seguimiento y reportes para las partes autorizadas.
- **Dependencias:** Risk Engine canónico, historial de campañas, datos productivos y validación de mercado de Fases 2–5; alianzas o reglas del proveedor correspondiente.
- **Qué se construye:** indicadores explicables, expediente de evidencia, simulación de escenarios de cobertura y flujo de siniestro; cualquier decisión crediticia o aseguradora mantiene revisión humana.
- **Aceptación:** el usuario puede entender qué variables influyen, preparar evidencia y seguir un caso sin que Agronautas prometa aprobación, cobertura o indemnización automática.
- **Resultado comercial:** servicios de mayor valor y potencial de alianzas, sólo después de que la confianza del producto esté demostrada.
- **Riesgos y límites:** regulación, privacidad, responsabilidad por decisiones, sesgos y dependencia de terceros; no iniciar sin definición legal/comercial y piloto controlado.
- **Métricas/caso de éxito:** expedientes completos, tiempos de preparación reducidos, decisiones revisables y pilotos con actores autorizados.

### Fase 9 — Plataforma común, escala, pilotos y operación comercial

**Horizonte:** visión completa. **Productos:** ambos y plataforma común.

- **Objetivo:** sostener múltiples productos y clientes sin sacrificar independencia de dominio ni calidad operativa.
- **Capacidades:** componentes comunes, contratos de datos, observabilidad, costos, escalabilidad, soporte, documentación operativa, gestión de pilotos y comercialización.
- **Dependencias:** aprendizajes reales de fases anteriores; no anticipar plataforma genérica antes de probar los workflows.
- **Qué se construye:** núcleo común sólo donde la reutilización esté probada: provenance/freshness, ingestas, jobs, telemetría, componentes de visualización, reportes y capacidades de administración; catálogo de productos, playbooks de piloto y operación.
- **Aceptación:** agregar una capacidad compartida no altera la identidad ni el comportamiento de un producto; existen responsables, señales operativas, recuperación y camino de soporte para cada piloto.
- **Resultado comercial:** portafolio defendible: Agronautas para decisión/gestión agro y Iberá-Alerta para operación institucional, con economía técnica común.
- **Riesgos y límites:** sobreplataformización, acoplamiento entre productos y costos prematuros; no construir una API comercial masiva sin demanda validada.
- **Métricas/caso de éxito:** pilotos convertidos en uso sostenido, incidentes operativos trazables, reutilización comprobada y costo de operación compatible con el modelo comercial.

## 4. Dependencias entre fases

```text
Fase 0 → Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6
                         └──────────────→ Fase 7
                                  Fase 2 + Fase 3 + Fase 4 → Fase 8
                 Evidencia de Fases 2–8 → Fase 9
```

La dependencia es de aprendizaje, no una obligación de esperar años: Fase 7 puede avanzar en paralelo a Fases 3–6 cuando haya capacidad institucional y fuentes, pero debe reutilizar sólo patrones técnicos ya probados. Fase 8 no debe adelantarse a la trazabilidad de riesgo y evidencia. Fase 9 consolida lo que demostró reutilización; no es una licencia para diseñar una plataforma abstracta por anticipado.

## 5. Oportunidades por horizonte

### Rápidas

- Completar hardening visual y journeys de Agronautas e Iberá-Alerta.
- Resolver el locator E2E ambiguo y cerrar la línea base de verify/harness.
- Hacer visibles provenance, freshness, estados de ingesta y límites del cálculo.
- Pulir búsqueda/ubicación de campo, riesgo, alertas, mapas y chat en Agronautas.
- Renderizar todos los datos existentes de Iberá-Alerta con jerarquía institucional.

### Medias

- Fuentes reales y operación confiable en Corrientes.
- Risk Engine canónico y explicación de discrepancias.
- Workspaces, lotes, tareas, campañas, historial y reportes.
- Perfiles de suelo/cultivo/clima y comparación de precios, dólar y tendencias.
- Pilotos controlados con usuarios representativos, sin inventar clientes ni comprometer fechas.

### Ambiciosas

- Simuladores de campaña y recomendación contextual de cultivo.
- Market intelligence, commodities, marketplace y conexiones sectoriales.
- Iberá-Alerta institucional completo con operación y clientes.
- Crédito, seguros y siniestros con actores autorizados.
- Escala y plataforma común basada en reutilización observada.

## 6. Qué queda fuera por ahora

- Auth y seguridad funcional: pertenece a `auth-security`.
- Fusionar Agronautas e Iberá-Alerta en una única marca o experiencia comercial.
- Hacer de una API pública/comercial el objetivo principal.
- Cobertura agro nacional antes de validar Corrientes.
- ERP agrícola total, contabilidad, logística completa o automatización de decisiones sin revisión humana.
- Recomendaciones agronómicas, crediticias o de seguros presentadas como certezas.
- Marketplace abierto, crédito, seguros y siniestros antes de validar demanda, reglas y responsabilidades.
- Plataforma técnica genérica, multi-tenant o de escala masiva sin casos reales que justifiquen cada abstracción.

## 7. Estrategia de pilotos y casos de éxito

1. **Piloto de demostración:** usar los recorridos actuales para validar comprensión, narrativa y utilidad de UI/UX en ambos productos.
2. **Piloto agro en Corrientes:** seleccionar un caso representativo, comprobar fuentes, riesgo canónico y gestión de una campaña con evidencia.
3. **Piloto institucional:** validar Iberá-Alerta con un operador y un flujo de alerta realista, incluyendo fuente, freshness, acción e historial.
4. **Pilotos de expansión:** sólo después de uso repetido, probar planificación, mercado, seguros u otras capacidades con participantes autorizados.

Cada caso debe documentar problema inicial, workflow, datos utilizados, decisión tomada, evidencia, límites y resultado observado. No se publicarán nombres de clientes, porcentajes de mejora ni fechas como hechos hasta contar con autorización y evidencia.

## 8. Criterios de producto terminado

### Agronautas

Se considerará terminado cuando un productor o asesor pueda, dentro de Agronautas: ubicar y organizar su campo; consultar datos frescos y trazables; entender riesgo y sus causas; gestionar lotes, tareas y decisiones; planificar y comparar alternativas; acceder a inteligencia de mercado; y preparar acciones comerciales o de cobertura con límites explícitos. Debe existir uso repetido, datos operativos confiables, journeys principales sin bloqueos, reportes útiles y un modelo de soporte/comercialización probado. “Terminado” no significa que no haya nuevas ideas: significa que el núcleo de decisión y gestión entrega valor sin depender de una demo guiada.

### Iberá-Alerta

Se considerará terminado cuando una institución pueda observar el territorio, consultar localidades/telemetría/INA, recibir y revisar alertas, verificar fuente y vigencia, operar ingestas, reconstruir el historial y usar el asesor como apoyo dentro de sus protocolos. Debe mantener identidad institucional, trazabilidad, estados operativos comprensibles, fuentes sostenibles, soporte y al menos un caso de uso institucional repetible. No requiere ser una plataforma nacional para estar terminado en su alcance validado.

## 9. Decisiones que requieren aprobación del usuario

- Confirmar que el orden UI/UX → datos/Risk Engine → gestión → inteligencia → planificación → mercado es el orden rector.
- Confirmar el alcance inicial de Corrientes y qué fuentes tienen prioridad.
- Confirmar la definición de “Risk Engine canónico” y quién valida sus discrepancias.
- Elegir los primeros journeys de demo y los perfiles de piloto de Agronautas e Iberá-Alerta.
- Confirmar qué módulos de marketplace, exportación, crédito y seguros pertenecen a la primera visión comercial y cuáles quedan condicionados.
- Confirmar el nivel de autonomía permitido al chat IA y al Copilot Advisor: recomendación explicada, nunca autoridad final por defecto.
- Confirmar qué capacidades deben ser comunes y cuáles deben permanecer específicas de cada producto.
- Confirmar los criterios de producto terminado y la evidencia mínima para pasar de una fase a la siguiente.

## 10. Recomendación de orden de ejecución

1. Cerrar Fase 0 y el hardening verificable del estado aplicado.
2. Ejecutar Fase 1 como bloque visible de producto demostrable para ambos productos.
3. Ejecutar Fase 2 en Corrientes y fijar el Risk Engine canónico.
4. Profundizar Agronautas con Fase 3; iniciar en paralelo el diseño operativo de Fase 7 si las fuentes institucionales están disponibles.
5. Añadir inteligencia de Fase 4 y sólo después planificación de Fase 5.
6. Validar demanda antes de abrir Fase 6 y Fase 8.
7. Consolidar Fase 9 a partir de reutilización probada y de pilotos convertidos en operación.

La recomendación es aprobar primero esta dirección y sus límites. Las siguientes fases deben convertir este roadmap en alcances acotados, con decisiones de producto explícitas y evidencia de aceptación, sin saltar directamente a la visión completa.
