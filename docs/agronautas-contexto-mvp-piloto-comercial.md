# Agronautas — Contexto de MVP, piloto y salida comercial

## 1. Propósito

Este documento es una versión enfocada en la etapa más importante para Agronautas: transformar la base actual en un producto piloto, salir a probarlo con clientes reales y obtener los primeros casos de éxito.

Debe servir como contexto para una IA que comunique y venda Agronautas mediante distintos tipos de publicidad y contenido. La IA debe entender tres niveles sin confundirlos:

1. **Lo que Agronautas ya tiene construido.**
2. **Lo que está cerca de convertirse en una experiencia piloto vendible.**
3. **Lo que forma parte de la evolución completa de Agronautas.**

La marca debe conservar una visión amplia de todo el sector agropecuario. El piloto puede comenzar con una región, una actividad y un grupo de usuarios controlado, pero eso es una estrategia de validación, no el límite de Agronautas.

## 2. Definición comercial de la etapa actual

Agronautas ya cuenta con una base técnica demostrable para ofrecer un servicio controlado de:

> **Monitoreo inteligente de riesgo operativo por lote, con score, alertas, evidencia, frescura de datos, historial y asistencia conversacional acotada.**

El primer producto que debe llevarse a clientes no necesita esperar a que toda la visión de Agronautas esté terminada. Puede resolver un problema concreto y valioso:

- centralizar el estado de los lotes;
- indicar qué situaciones requieren revisión;
- mostrar por qué aparece un riesgo;
- señalar qué tan reciente es la información;
- conservar un historial de cambios;
- ayudar al equipo a priorizar su trabajo.

El producto inicial debe vender claridad y priorización. La plataforma completa podrá ampliar esa base hacia decisiones de cultivo, planificación, mercados, finanzas y seguros.

## 3. Qué es Agronautas

Agronautas es una plataforma de inteligencia de riesgo productivo para el sector agropecuario.

Su propósito es conectar territorio, clima, señales productivas, evidencia y decisiones. La unidad inicial de trabajo es el lote, pero el producto está diseñado para crecer hacia explotaciones, regiones, cadenas productivas, mercados y entidades financieras.

Agronautas no es solamente:

- una aplicación meteorológica;
- un mapa satelital;
- un dashboard de indicadores;
- una base de datos;
- un chatbot genérico;
- un sistema que reemplaza al agrónomo;
- una promesa de cosecha garantizada.

Agronautas busca ser una capa de inteligencia que ayude a transformar señales dispersas en prioridades, explicaciones y decisiones.

## 4. Problema que el MVP resuelve

Los equipos agrícolas suelen recibir información desde varias fuentes y necesitan unirla manualmente para entender qué está pasando en cada lote.

Eso produce problemas concretos:

- no saber qué lote revisar primero;
- perder tiempo consolidando datos;
- recibir alertas sin prioridad;
- trabajar con información vencida sin saberlo;
- no poder explicar qué originó un score;
- depender de la memoria de una sola persona;
- preparar reportes manuales para cada reunión;
- no tener una lectura común entre productor, asesor y responsable operativo;
- no poder comparar fácilmente la evolución de distintos lotes.

Agronautas ataca ese problema mediante una vista operativa por lote que combina estado, riesgo, drivers, alertas, evidencia, antigüedad y contexto.

## 5. Qué existe actualmente

### 5.1 Alta y contexto de lote

El sistema permite registrar un lote con información como:

- identificador;
- superficie;
- cultivo;
- localidad;
- país y provincia;
- coordenadas;
- polígono cuando corresponda;
- etapa fenológica.

El backend valida la ubicación, resuelve el contexto geográfico disponible y persiste la información.

Los contratos ya contemplan una variedad de cultivos, aunque el flujo operativo actual está calibrado principalmente para el primer caso de validación. Esto significa que Agronautas no debe comunicarse como limitado para siempre a una sola actividad, pero tampoco debe afirmar que todos los cultivos ya están igualmente calibrados.

### 5.2 Validación geográfica

Agronautas utiliza una capa geoespacial para:

- comprobar si el lote está dentro del área configurada;
- relacionar coordenadas con una localidad;
- trabajar con puntos y polígonos;
- conservar metadatos de la cobertura;
- evitar que el sistema interprete como válido un lote fuera del alcance configurado.

Esto permite que el riesgo esté asociado a un territorio real y no a una coordenada aislada sin contexto.

### 5.3 Score de riesgo

El MVP calcula un indicador de riesgo operativo por lote y conserva:

- score;
- nivel;
- confianza;
- frescura;
- fecha de cálculo;
- regla utilizada;
- drivers;
- evidencia;
- razones de degradación.

Los drivers actuales se relacionan con factores como:

- presión térmica;
- carga de lluvia;
- estrés satelital;
- sensibilidad de la etapa fenológica;
- condiciones climáticas relevantes.

El score debe comunicarse como un indicador para priorizar revisión y seguimiento. No debe presentarse como predicción validada de rendimiento, cosecha o rentabilidad hasta contar con calibraciones y pruebas específicas.

### 5.4 Frescura y degradación

Una de las capacidades más valiosas del MVP es hacer visible la calidad temporal de la información.

El sistema puede distinguir estados como:

- **fresh:** dato reciente;
- **stale:** dato antiguo o vencido;
- **degraded:** resultado disponible con calidad reducida;
- **missing:** información no disponible.

También puede mostrar:

- confianza;
- proveedor;
- momento de observación;
- último resultado exitoso;
- razones de degradación;
- modo de disponibilidad de la fuente.

Esto permite vender una diferencia importante: Agronautas no oculta la incertidumbre de sus datos. La hace visible para que el usuario pueda interpretar mejor el resultado.

### 5.5 Snapshots e historial

El sistema persiste snapshots de riesgo. Un snapshot es una lectura del estado del lote en un momento determinado.

Gracias a los snapshots, el usuario puede:

- conocer el estado actual;
- revisar estados anteriores;
- observar cambios;
- relacionar una alerta con el resultado que la originó;
- comparar la evolución de lotes;
- conservar una referencia para reportes y conversaciones.

### 5.6 Alertas

Las alertas se derivan del estado de riesgo y pueden incluir:

- estrés hídrico;
- estrés térmico;
- eventos de lluvia relevantes;
- riesgo de inundación;
- cambios de señales productivas;
- situaciones que requieren una revisión.

La alerta no debe comunicarse como una orden automática. Su función es llamar la atención sobre una situación que el equipo debe revisar con el contexto disponible.

### 5.7 Dashboard

El dashboard actual puede mostrar:

- lote seleccionado;
- score;
- nivel de riesgo;
- confianza;
- drivers;
- alertas;
- evidencia;
- timeline de riesgo;
- timeline climático;
- frescura;
- estado de fuentes;
- próxima actualización;
- información degradada o faltante.

El flujo web incluye alta guiada y acceso a la experiencia de dashboard. Esto permite mostrar a un posible cliente una secuencia comprensible:

1. Registrar un lote.
2. Consultar su estado.
3. Entender el score.
4. Revisar alertas.
5. Ver evidencia y frescura.
6. Comparar con otros lotes.
7. Obtener un reporte.

### 5.8 Comparación de lotes

El sistema puede comparar snapshots persistidos de distintos lotes. Esta capacidad es especialmente valiosa para:

- gerentes;
- responsables de explotación;
- asesores con varios establecimientos;
- equipos que deben priorizar visitas;
- usuarios que necesitan observar diferencias entre zonas.

### 5.9 Copiloto acotado

El MVP cuenta con una experiencia de consulta basada en información disponible del lote.

Puede ayudar con:

- overview;
- resumen de riesgo;
- consulta de alertas;
- comparación de lotes;
- explicación basada en datos persistidos;
- referencias de evidencia;
- indicación de degradación o falta de contexto.

El copiloto debe presentarse como un asistente de interpretación y consulta, no como un agente autónomo.

Su valor inicial está en responder sobre el estado del lote sin inventar información. Más adelante podrá evolucionar hacia planificación, recomendaciones de cultivo, mercado, finanzas y escenarios.

### 5.10 Reporte básico

Existe exportación básica del estado del dashboard. El reporte puede servir como punto de partida para:

- reuniones;
- seguimiento interno;
- comparación temporal;
- documentación de alertas;
- conversación entre productor y asesor.

La presentación comercial avanzada del reporte es una de las mejoras cercanas para convertir la demo técnica en una experiencia de piloto más profesional.

### 5.11 Contratos, runtime y operación

La base actual cuenta con:

- contratos compartidos;
- validación Zod y JSON Schema;
- fixtures y pruebas de contratos;
- runtime separado para flujos especializados;
- locks e idempotencia para recomputes;
- readiness;
- health checks;
- logs estructurados;
- IDs de correlación;
- eventos operativos;
- mecanismos de degradación y fallback.

Estas piezas son importantes porque permiten evolucionar desde una demo hacia un servicio controlado y observable.

## 6. Qué está cerca de convertirse en piloto

El siguiente paso no es construir toda la visión futura antes de hablar con clientes. Es cerrar un paquete reducido, confiable y medible sobre lo que ya existe.

### 6.1 Recomputation real de extremo a extremo

La arquitectura ya contempla:

- scheduler;
- ventanas de actualización;
- locks;
- job runs;
- Redis;
- worker;
- heartbeat;
- completion;
- failure;
- retry;
- fallback.

Lo cercano es alinear el wiring final para que un recompute real pueda comprobarse de punta a punta:

1. El sistema detecta una ventana.
2. Encola el trabajo correcto.
3. El worker lo recibe.
4. Ejecuta el cálculo.
5. Persiste el snapshot.
6. Actualiza heartbeat y estado.
7. Genera o actualiza alertas.
8. El dashboard muestra el nuevo resultado.

Esta capacidad es crítica antes de vender actualización automática como parte del piloto.

### 6.2 Unificación del motor de riesgo

Existe más de un camino de cálculo. El paso cercano consiste en definir una regla canónica para el piloto y alinear:

- drivers;
- TTL;
- confianza;
- frescura;
- versión de regla;
- evidencia;
- respuesta de dashboard;
- respuesta del copiloto.

El cliente piloto debe recibir una lectura coherente, aunque internamente Agronautas continúe evolucionando su arquitectura.

### 6.3 Fuentes reales controladas

La base ya tiene adapters y contratos para fuentes climáticas y satelitales. La salida piloto debe comenzar con pocas fuentes, pero verificadas.

La prioridad es:

- elegir una fuente meteorológica principal;
- comprobar su frecuencia y disponibilidad;
- registrar correctamente la última actualización;
- manejar fallos con fallback;
- no presentar una fuente como activa si todavía es un seam o depende de configuración pendiente;
- añadir fuentes adicionales solo cuando mejoren una decisión concreta.

### 6.4 Copiloto con streaming propio de Agronautas

La base técnica ya permite una experiencia conversacional en streaming, cancelación por desconexión y procesamiento de eventos.

La adaptación cercana consiste en conectar esa experiencia exclusivamente con:

- lotes Agronautas;
- snapshots Agronautas;
- alertas Agronautas;
- drivers Agronautas;
- evidencia Agronautas;
- historial Agronautas;
- contexto de cultivo y etapa.

El primer copiloto vendible debe responder bien preguntas acotadas antes de intentar resolver cualquier problema agropecuario.

### 6.5 Reporte de cliente

La exportación básica puede evolucionar rápidamente hacia un reporte de piloto con:

- identificación del lote;
- fecha y hora;
- score y nivel;
- drivers;
- alertas;
- fuentes;
- frescura;
- confianza;
- historial reciente;
- explicación del estado;
- disclaimer de soporte a la decisión;
- marca Agronautas.

### 6.6 Roles e instalación controlada

La base contempla roles y permisos. Para un primer piloto, no es necesario construir desde el inicio una plataforma de billing y multi-tenant completa, pero sí debe existir una frontera clara:

- qué cliente puede ver;
- qué lotes puede consultar;
- quién puede modificar datos;
- quién puede solicitar recomputes;
- quién puede administrar la instalación;
- cómo se audita una acción.

Los primeros clientes pueden comenzar con un workspace controlado, siempre que el alcance y la separación de información estén explícitos.

### 6.7 Cobertura calibrada

La experiencia inicial debe trabajar con una cobertura geográfica claramente definida y validada. La región inicial sirve para asegurar coherencia entre:

- ubicación;
- datos;
- reglas;
- proveedores;
- cultivo;
- alertas;
- lenguaje comercial.

Agronautas puede comunicar una visión multisectorial y multirregional, mientras el piloto declara honestamente cuál es su primera zona calibrada.

## 7. Paquete mínimo vendible

### Nombre de la propuesta

**Agronautas Risk Monitor — Piloto de monitoreo inteligente por lote.**

El nombre puede cambiar, pero el concepto debe conservarse: una primera solución concreta dentro de una plataforma agropecuaria mucho más amplia.

### Cliente inicial recomendado

El piloto debe priorizar uno de estos perfiles:

1. Productor profesional con varios lotes.
2. Responsable de una explotación.
3. Asesor técnico que gestiona diversos establecimientos.
4. Empresa agrícola pequeña o mediana que necesita un tablero común.

### Problema inicial

> “Tengo información dispersa y necesito saber qué lote requiere atención, por qué y con qué nivel de confianza.”

### Experiencia del cliente

El cliente debería poder:

1. Registrar o cargar sus lotes.
2. Ver el estado de cada lote.
3. Identificar los lotes prioritarios.
4. Revisar score, drivers y alertas.
5. Ver la frescura de los datos.
6. Consultar evidencia.
7. Comparar lotes.
8. Preguntar al copiloto sobre la información disponible.
9. Descargar un reporte.
10. Comentar si la alerta fue útil, falsa, tardía o accionable.

### Resultado que debe buscarse

El piloto no debe prometer una cosecha mejor automáticamente. Debe demostrar:

- menos tiempo para preparar una revisión;
- mejor priorización;
- más claridad sobre el estado de los lotes;
- mayor trazabilidad;
- mejor conversación entre productor y asesor;
- identificación de datos faltantes o vencidos;
- utilidad real de las alertas.

## 8. Casos de uso piloto

### Caso 1: priorización semanal

Un responsable revisa varios lotes y necesita saber cuáles merecen atención primero. Agronautas ordena la conversación mediante score, nivel, drivers, alertas y frescura.

### Caso 2: preparación de visita

Un asesor consulta el historial y las señales del lote antes de visitar el campo. Llega con una hipótesis de revisión más concreta.

### Caso 3: reunión operativa

Productor, gerente y asesor utilizan el mismo dashboard para conversar sobre cambios, alertas y próximos pasos.

### Caso 4: comparación

Un equipo compara lotes con distinta exposición climática o diferente evolución de riesgo.

### Caso 5: dato degradado

Una fuente no actualiza. Agronautas conserva el último resultado útil y marca que está vencido o degradado, evitando una falsa sensación de actualidad.

### Caso 6: reporte

El responsable descarga el estado de un lote o conjunto de lotes para documentar la revisión.

### Caso 7: conversación basada en evidencia

El usuario pregunta por el estado de un lote y recibe una respuesta acotada a la información disponible, con indicación de límites y evidencia.

## 9. Casos de éxito

Los primeros casos de éxito deben demostrar valor de proceso, no inventar resultados productivos.

### Métricas de uso

- frecuencia de acceso;
- cantidad de lotes consultados;
- consultas al copiloto;
- reportes descargados;
- alertas revisadas;
- comparaciones realizadas.

### Métricas de operación

- tiempo de preparación de una revisión;
- tiempo de preparación de un reporte;
- lotes priorizados;
- alertas accionables;
- alertas descartadas;
- alertas detectadas con anticipación;
- datos vencidos identificados.

### Métricas de confianza

- porcentaje de snapshots con evidencia;
- proporción de señales frescas;
- cantidad de degradaciones correctamente informadas;
- respuestas del copiloto consideradas útiles;
- correcciones realizadas por el equipo técnico.

### Métricas de negocio futuras

Solo cuando exista metodología y evidencia:

- costos evitados;
- reducción de pérdidas;
- aumento de rendimiento;
- mayor rentabilidad;
- mejora de ingresos;
- mejor acceso al crédito;
- reducción de costo de seguros.

## 10. Qué puede prometer Agronautas ahora

Para conversaciones de piloto, puede afirmar:

- “Agronautas ayuda a monitorear el riesgo operativo de cada lote.”
- “Agronautas reúne score, drivers, alertas, evidencia y frescura en una misma vista.”
- “Agronautas ayuda a priorizar qué lotes revisar primero.”
- “Agronautas muestra cuándo la información está actualizada, vencida o degradada.”
- “Agronautas permite comparar la evolución de distintos lotes.”
- “Agronautas ayuda a preparar revisiones y conversaciones técnicas.”
- “Agronautas ofrece un copiloto acotado sobre la información disponible del lote.”
- “Agronautas conserva el historial de snapshots y alertas.”
- “Agronautas está construyendo una plataforma de inteligencia para todo el sector agropecuario.”
- “La primera versión se prueba en una cobertura calibrada para validar el producto con usuarios reales.”

## 11. Qué puede prometer la visión futura

Cuando las capacidades estén terminadas, integradas y validadas, Agronautas podrá ampliar su promesa hacia:

- decidir qué cultivar;
- planificar campañas;
- cruzar suelo, clima, cultivo, historial y mercado;
- analizar el efecto del dólar en costos y rentabilidad;
- anticipar producción regional;
- detectar déficits y excedentes;
- simular escenarios climáticos y económicos;
- estimar rendimiento, productividad y pérdidas;
- ayudar con crédito y riesgo financiero;
- calcular y gestionar seguros;
- detectar siniestros;
- entregar APIs de clima, satélite, rendimiento y riesgo territorial;
- asistir decisiones desde el lote hasta la región y el mercado.

Estas promesas describen la dirección de Agronautas y no deben transformarse en afirmaciones de disponibilidad inmediata sin evidencia de producto.

## 12. Lo que está más lejos

Estas capacidades pertenecen a una etapa posterior y no deben presentarse como cercanas solo porque existe una idea, un contrato o un adapter:

- recomendador completo de cultivos con rentabilidad validada;
- planificador integral de campañas;
- simulador económico y climático calibrado;
- integración completa de precios y dólar;
- inteligencia de commodities operacional;
- predicción regional de producción;
- climate score financiero validado;
- evaluación de crédito productiva;
- pricing de seguros en operación;
- seguros paramétricos activos;
- detección de siniestros validada;
- RAG especializado conectado al copiloto;
- plataforma multi-tenant con billing completo;
- expansión general a todos los cultivos y regiones.

La existencia de una arquitectura preparada no equivale a disponibilidad comercial.

## 13. Diferenciadores del piloto

### Transparencia sobre la calidad de los datos

Agronautas no muestra únicamente un resultado. Muestra si la información es fresca, vencida, degradada o incompleta.

### Riesgo explicado

El score tiene drivers, evidencia y contexto. El usuario puede comprender por qué aparece una prioridad.

### Unidad operativa clara

El lote permite conectar territorio, cultivo, clima, historial y decisión.

### Historial y comparación

El usuario no recibe solamente una foto del presente. Puede revisar evolución y comparar situaciones.

### Copiloto limitado por evidencia

La IA no debe improvisar sobre información que el sistema no tiene.

### Visión escalable

El piloto resuelve un caso concreto, pero utiliza una arquitectura que puede crecer hacia múltiples cultivos, regiones y mercados.

## 14. Públicos y dolores de salida

### Productor

Dolores:

- no saber qué revisar primero;
- perder tiempo consultando fuentes;
- recibir información sin contexto;
- dificultad para demostrar por qué tomó una decisión.

Mensaje de valor:

> “Vea el estado de sus lotes, detecte prioridades y entienda qué hay detrás de cada señal.”

### Asesor técnico

Dolores:

- preparar reuniones manualmente;
- comparar muchos lotes;
- explicar alertas sin evidencia;
- perder tiempo buscando historial.

Mensaje de valor:

> “Llegue a cada revisión con el contexto del lote, su evolución y sus señales principales.”

### Responsable o gerente

Dolores:

- coordinar equipos;
- priorizar recursos;
- supervisar varios lotes;
- no tener una vista común.

Mensaje de valor:

> “Convierta múltiples lotes y señales dispersas en una lista clara de prioridades operativas.”

### Empresa agropecuaria

Dolores:

- escalar la gestión;
- ordenar información;
- documentar decisiones;
- establecer procesos repetibles.

Mensaje de valor:

> “Construya una operación agrícola más trazable, observable y preparada para crecer.”

## 15. Evolución desde el piloto

### Etapa 1 — piloto controlado

- lotes definidos;
- zona calibrada;
- fuentes verificadas;
- score coherente;
- alertas;
- dashboard;
- historial;
- chat acotado;
- reportes;
- métricas de uso y utilidad.

### Etapa 2 — producto operativo

- más cultivos;
- más regiones;
- más fuentes;
- recomputes automáticos confiables;
- roles reales;
- workspaces de clientes;
- reportes profesionales;
- observabilidad por cliente;
- copilot streaming propio;
- feedback de alertas.

### Etapa 3 — inteligencia agropecuaria integrada

- suelo y aptitud;
- recomendador de cultivos;
- planificación;
- escenarios;
- mercados;
- dólar;
- commodities;
- rendimiento regional;
- decision intelligence.

### Etapa 4 — riesgo financiero y seguros

- Climate Score;
- Farm Risk Score;
- crédito;
- pricing;
- seguros paramétricos;
- detección de siniestros;
- APIs empresariales.

## 16. Reglas para la IA de comunicación

La IA debe comprender que puede crear contenido sobre varios ángulos:

- la experiencia actual del MVP;
- el problema de la información fragmentada;
- la priorización de lotes;
- el valor de la evidencia;
- la frescura y degradación;
- el copiloto;
- el futuro de decidir qué plantar;
- planificación de campañas;
- suelo y tierra;
- clima y escenarios;
- dólar y rentabilidad;
- commodities;
- finanzas;
- seguros;
- innovación y transformación del agro.

No debe convertir todo Agronautas en una sola historia repetida sobre arroz, clima o alertas. Debe entender que esos son puntos de entrada dentro de una plataforma mucho más amplia.

Cuando hable del piloto, debe comunicar una solución concreta y cercana.

Cuando hable de la visión, debe comunicar la plataforma integral que Agronautas está construyendo.

Cuando hable de capacidades todavía no operativas, debe utilizar un lenguaje de evolución, desarrollo, visión o próxima etapa, salvo que exista una actualización confirmada.

## 17. Claims que deben evitarse

No afirmar sin evidencia:

- “funciona para todos los cultivos”;
- “cubre todo el país”;
- “predice la cosecha con precisión garantizada”;
- “elimina el riesgo”;
- “garantiza rentabilidad”;
- “reduce pérdidas en un porcentaje específico”;
- “ahorra una cantidad específica de horas”;
- “está en tiempo real en todas las fuentes”;
- “tiene clientes activos”;
- “monitorea millones de hectáreas”;
- “cuenta con precisión científica validada”;
- “el copiloto toma decisiones por el productor”;
- “la plataforma ya tiene funcionando todos los módulos financieros y de seguros”;
- “la cobertura inicial representa toda la visión geográfica de Agronautas”.

## 18. Síntesis para venta

Agronautas ya puede demostrar una base concreta: alta de lote, score, alertas, evidencia, frescura, historial, comparación, dashboard, reportes y asistencia conversacional acotada.

Lo más cercano a un piloto vendible es cerrar el flujo operativo real, alinear el cálculo de riesgo, conectar fuentes verificadas, profesionalizar reportes, adaptar el streaming al contexto Agronautas y establecer un workspace controlado para los primeros clientes.

El primer cliente no tiene que comprar la plataforma completa. Tiene que encontrar valor en una primera solución que le permita ver mejor sus lotes, priorizar revisiones y trabajar con información más trazable.

La visión de Agronautas puede venderse desde el comienzo como la evolución natural de esa base: una plataforma que llegará a conectar suelo, clima, cultivos, mercados, dólar, planificación, rendimiento, crédito y seguros.

La promesa central de esta etapa es:

> **Agronautas convierte el estado de cada lote en una prioridad operativa clara, respaldada por evidencia y preparada para evolucionar hacia la inteligencia completa del agro.**

## 19. Fuentes de este contexto

Este documento se basa en:

- la implementación actual de Agronautas en `monorepo-js-baseline`;
- contratos compartidos y pruebas existentes;
- el MVP web y API;
- el runtime de trabajos y copiloto;
- documentación de producto y arquitectura;
- el roadmap estratégico de Agronautas.

El documento debe actualizarse cuando una capacidad pase por estas etapas:

1. Diseñada.
2. Implementada.
3. Probada localmente.
4. Probada con datos reales.
5. Validada con usuarios.
6. Disponible para piloto.
7. Convertida en producto comercial.

La diferencia entre esas etapas es esencial para vender con ambición sin perder credibilidad.
