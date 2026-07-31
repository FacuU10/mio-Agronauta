# Agronautas — Contexto resumido para MVP y piloto comercial

## Propósito

Este archivo resume lo que una IA de comunicación necesita saber para vender el MVP de Agronautas, explicar lo que ya existe, presentar lo que está cerca de salir a piloto y conectar esa primera solución con la visión futura del producto.

Agronautas debe comunicarse como una plataforma para todo el sector agropecuario. El piloto puede comenzar con una cobertura y actividad calibradas, pero esa primera etapa no limita la marca.

## Qué puede demostrarse hoy

Agronautas ya cuenta con una base para un servicio controlado de:

> **Monitoreo inteligente de riesgo operativo por lote, con score, alertas, evidencia, frescura, historial, comparación y asistencia conversacional acotada.**

### Flujo actual

1. Registrar un lote.
2. Validar su ubicación.
3. Calcular o consultar un snapshot de riesgo.
4. Ver score, nivel, confianza y drivers.
5. Revisar alertas.
6. Consultar evidencia y frescura.
7. Ver historial y timeline.
8. Comparar lotes.
9. Consultar un copiloto sobre los datos disponibles.
10. Exportar un reporte básico.

## Capacidades actuales

### Alta y contexto

El sistema registra identificador, superficie, cultivo, localidad, coordenadas, polígono y etapa fenológica. Valida la ubicación y conserva el contexto geográfico.

### Riesgo

El MVP persiste:

- score;
- nivel;
- confianza;
- frescura;
- fecha de cálculo;
- regla;
- drivers;
- evidencia;
- razones de degradación.

Los drivers actuales se relacionan con presión térmica, lluvia, estrés satelital, etapa fenológica y condiciones climáticas.

El score es un indicador para priorizar revisiones. No es todavía una predicción validada de cosecha, rendimiento o rentabilidad.

### Calidad de datos

Agronautas puede mostrar:

- **fresh:** información reciente;
- **stale:** información antigua;
- **degraded:** resultado disponible con calidad reducida;
- **missing:** información ausente.

También conserva confianza, fuente, momento de observación, último resultado exitoso y razones de degradación.

### Alertas e historial

Las alertas pueden relacionarse con estrés hídrico, estrés térmico, lluvia, inundación y cambios productivos. Los snapshots permiten revisar evolución, relacionar una alerta con su origen y comparar lotes.

### Dashboard

El dashboard muestra lote, score, riesgo, confianza, drivers, alertas, evidencia, timelines, frescura, estado de fuentes y datos faltantes.

### Copiloto

El copiloto puede responder consultas acotadas de:

- overview;
- resumen de riesgo;
- alertas;
- comparación;
- explicación basada en evidencia;
- historial y estado de datos.

Es un asistente de interpretación, no un agente autónomo ni un reemplazo del productor o agrónomo.

### Base técnica

La plataforma dispone de contratos compartidos, validación JSON Schema/Zod, pruebas de contratos, runtime especializado, locks, idempotencia, readiness, health checks, logs, correlación, eventos, fallback y degradación.

## Qué está cerca del piloto

### 1. Recompute real

La arquitectura ya contempla scheduler, jobs, locks, Redis, worker, heartbeat, retry y fallback. Falta cerrar y verificar el flujo completo: encolar, ejecutar, persistir snapshot, actualizar estado, generar alertas y reflejar el cambio en el dashboard.

### 2. Regla única de riesgo

Debe unificarse el cálculo para que dashboard y copiloto usen la misma regla, drivers, TTL, confianza, frescura, versión y evidencia.

### 3. Fuentes verificadas

El piloto debe comenzar con pocas fuentes reales y controladas. Hay que verificar disponibilidad, frecuencia, último dato, fallback y estado de cada fuente antes de vender actualización automática.

### 4. Copiloto propio en streaming

La experiencia de streaming puede adaptarse para trabajar solamente con lotes, snapshots, alertas, drivers, historial y evidencia de Agronautas.

### 5. Reporte profesional

El reporte básico puede evolucionar con identificación del lote, fecha, score, drivers, alertas, fuentes, frescura, confianza, historial, explicación, disclaimer y marca Agronautas.

### 6. Workspace controlado

Antes del piloto debe definirse qué cliente ve qué lotes, quién puede editar, solicitar recomputes o administrar la instalación. No hace falta tener billing completo, pero sí separación y control claros.

### 7. Cobertura calibrada

La zona inicial debe estar validada para que coincidan ubicación, datos, reglas, fuentes, cultivo y alertas. Agronautas puede comunicar una visión amplia mientras prueba una primera cobertura concreta.

## Paquete mínimo vendible

### Producto

**Agronautas Risk Monitor:** piloto de monitoreo inteligente por lote.

### Cliente inicial

- productor profesional con varios lotes;
- responsable de explotación;
- asesor técnico con varios establecimientos;
- empresa agrícola pequeña o mediana.

### Problema

> “Tengo información dispersa y necesito saber qué lote requiere atención, por qué y con qué nivel de confianza.”

### Valor

- centraliza el estado de los lotes;
- prioriza revisiones;
- explica drivers;
- muestra evidencia;
- indica frescura;
- conserva historial;
- compara situaciones;
- ayuda a preparar visitas y reuniones;
- reduce trabajo manual como hipótesis a medir.

## Casos de uso

### Priorización semanal

Ordenar qué lotes revisar primero usando score, nivel, drivers, alertas y frescura.

### Preparación de visita

Consultar historial y señales antes de visitar un campo.

### Reunión operativa

Productor, asesor y responsable conversan sobre un estado común.

### Comparación

Comparar lotes con distinta evolución o exposición.

### Dato degradado

Conservar el último dato útil y marcarlo como vencido o degradado en lugar de fingir actualidad.

### Reporte

Documentar estado, alertas, fuentes y evolución.

### Pregunta con evidencia

Consultar el lote y recibir una respuesta limitada a la información disponible.

## Cómo conseguir casos de éxito

Los primeros casos deben medir proceso y adopción, no inventar mejoras productivas.

### Métricas de uso

- lotes consultados;
- frecuencia de acceso;
- alertas revisadas;
- comparaciones;
- consultas al copiloto;
- reportes descargados.

### Métricas de operación

- tiempo de preparación de una revisión;
- tiempo de preparación de un reporte;
- lotes priorizados;
- alertas accionables;
- datos vencidos identificados;
- alertas revisadas con anticipación.

### Métricas de confianza

- snapshots con evidencia;
- señales frescas;
- degradaciones informadas correctamente;
- respuestas del copiloto útiles;
- correcciones registradas por el equipo.

Solo con metodología y evidencia podrán afirmarse después reducción de costos, reducción de pérdidas, mayor rendimiento, rentabilidad o mejora de ingresos.

## Claims permitidos para el piloto

- “Monitoreo inteligente de riesgo operativo por lote.”
- “Score, drivers, alertas, evidencia y frescura en una sola vista.”
- “Ayuda a priorizar qué lotes revisar primero.”
- “Muestra cuándo la información está actualizada, vencida o degradada.”
- “Permite comparar la evolución de distintos lotes.”
- “Ayuda a preparar revisiones y conversaciones técnicas.”
- “Copiloto acotado sobre información disponible del lote.”
- “Historial de snapshots y alertas.”
- “Primera solución de una plataforma de inteligencia para todo el agro.”
- “Piloto calibrado para validar el producto con usuarios reales.”

## Claims que deben evitarse

No afirmar sin pruebas:

- tiempo real universal;
- cobertura total;
- todos los cultivos ya calibrados;
- predicción garantizada de cosecha o rendimiento;
- rentabilidad garantizada;
- precisión porcentual;
- clientes o hectáreas no confirmados;
- reducción específica de pérdidas o costos;
- multi-tenant completo;
- copiloto autónomo;
- RAG productivo;
- APIs, crédito, commodities o seguros ya operativos.

## Visión posterior

La primera solución puede evolucionar hacia:

- recomendación de qué cultivar;
- planificación de campañas;
- suelo y aptitud productiva;
- escenarios climáticos y económicos;
- precio del dólar y rentabilidad;
- commodities y producción regional;
- Climate Score y Farm Risk Score;
- crédito y Loan Risk API;
- pricing y seguros paramétricos;
- detección de siniestros;
- APIs climáticas, satelitales, de rendimiento y riesgo territorial;
- expansión a más cultivos y regiones.

Estas capacidades forman parte de la visión, pero deben separarse de lo que el piloto ya puede demostrar.

## Públicos del piloto

### Productor

Necesita saber qué revisar y entender qué hay detrás de una señal.

> “Vea el estado de sus lotes, detecte prioridades y entienda la evidencia.”

### Asesor

Necesita preparar visitas, comparar lotes y explicar alertas.

> “Llegue a cada revisión con el contexto, la evolución y las señales principales.”

### Gerente

Necesita coordinar equipos y priorizar recursos.

> “Convierta señales dispersas en prioridades operativas claras.”

### Empresa agrícola

Necesita ordenar información y documentar decisiones.

> “Construya una operación más trazable, observable y preparada para crecer.”

## Reglas para la IA de contenido

La IA puede comunicar:

- el MVP y su dashboard;
- priorización de lotes;
- evidencia y frescura;
- alertas;
- copiloto;
- casos de uso de productores y asesores;
- la visión de qué plantar;
- planificación;
- suelo;
- clima;
- dólar;
- mercados;
- commodities;
- crédito;
- seguros;
- futuro del agro.

No debe repetir siempre una sola historia de arroz, clima o alertas. Debe mostrar que el piloto es una entrada concreta a una plataforma mucho más amplia.

Cuando hable del piloto, debe vender una solución concreta y cercana. Cuando hable del futuro, debe presentar la evolución de Agronautas. No debe convertir contratos, ideas o arquitectura en capacidades terminadas.

## Síntesis

> **Agronautas convierte el estado de cada lote en una prioridad operativa clara, respaldada por evidencia y preparada para evolucionar hacia la inteligencia completa del agro.**
