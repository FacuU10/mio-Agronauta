# Exploration: MVP Production Launch (`mvp-production-launch`)

Este informe presenta un análisis exhaustivo y profundo sobre el estado de preparación de producción para el lanzamiento del MVP de Agronautas, documentando brechas técnicas, problemas de endurecimiento, estrategias de despliegue, y la resolución detallada de bugs ocultos.

---

## 1. Estado Actual (Current State)

La arquitectura de Agronautas es moderna, limpia y sigue principios de alta resiliencia. Sus componentes clave incluyen:

*   **API Edge (`apps/api`)**: Node.js/TypeScript Express backend ejecutándose bajo **Cluster Mode** para aprovechar múltiples núcleos. Adopta **Clean Architecture (Hexagonal)**, aislando de manera estricta la lógica de negocio (Domain y Application) de los adaptadores de infraestructura (Database, HTTP, external services).
*   **Workflow Engine (`apps/workflow-runtime-python`)**: Un motor de orquestación escrito en Python que utiliza **LangGraph** para ejecutar de forma secuencial y estructurada las operaciones analíticas del copiloto agrónomo y el cálculo geoespacial.
*   **Web Client (`apps/web`)**: Cliente web SPA/SSR de alto rendimiento desarrollado en **Next.js 15 (App Router)** y **React 19**, con gestión de estado de servidor mediante **React Query 5** e hilos de estado local mediante **Zustand 5**.
*   **JSON Schema Bridge (`packages/contracts/schemas`)**: Puente de tipos e interoperabilidad que expone especificaciones JSON Schema validadas de forma bidireccional entre la pila de Node.js y la pila de Python, asegurando el cumplimiento estricto del contrato operativo de la API.

### Configuración del Pool de Conexiones PostgreSQL
El pool se maneja a través de `apps/api/src/infrastructure/database/postgres/pool.ts` usando la biblioteca nativa `pg` (con un tamaño máximo predeterminado de **20 conexiones por proceso de cluster**). Esto introduce consideraciones importantes de escalabilidad que se detallan a continuación.

---

## 2. Análisis de Brechas Críticas para el Lanzamiento (Gaps & Missing Pieces)

El análisis del manifiesto arquitectónico (`.ai-manifest.md`) frente al código real de la aplicación ha revelado las siguientes diferencias importantes entre la teoría de desarrollo y el estado de producción requerido:

### A. Autenticación y Autorización (JWT Auth + Refresh Tokens)
*   **Estado en Código**: Actualmente, la seguridad utiliza un middleware simple (`agronautas-auth.ts`) que lee tokens precompartidos directamente de variables de entorno (`AGRONAUTAS_AUTH_TOKEN_READER`, `AGRONAUTAS_AUTH_TOKEN_OPERATOR`, `AGRONAUTAS_AUTH_TOKEN_ADMIN`). No existe un modelo dinámico de JWT, almacenamiento en base de datos de sesiones, ni tokens de refresco.
*   **Plan para Producción**: Debe implementarse un flujo JWT robusto (o integrar un servicio Auth-Kit como Clerk/Auth0 para delegar la autenticación de usuarios) garantizando aislamiento multitenant. Cada consulta geoespacial debe filtrarse estrictamente por el `producer_id` / `tenant_id` derivado del token JWT decodificado de forma segura.

### B. Adaptadores Externos Satelitales y Climáticos
*   **Estado en Código**: Los adaptadores satelitales (`agronautas-satellite-adapter.ts`) y climáticos en producción dependen de lógicas simuladas (fixtures estáticas de demo).
*   **Plan para Producción**: Integración real con APIs de producción (ej. Sentinel-2 / Copernicus, OpenWeather o NOAA). Se requiere configurar mecanismos de caché agresiva en Redis para no agotar las cuotas de estas APIs de pago durante recomputes recurrentes.

### C. Soporte Multicultivo Real
*   **Estado en Código**: El motor geoespacial está enfocado y limitado principalmente a operaciones de arroz en Corrientes (validación geográfica con `ST_Contains`).
*   **Plan para Producción**: Incorporar las reglas heurísticas y fronteras geográficas específicas para yerba mate, té y tabaco que forman parte del roadmap del MVP.

### D. Cola de Mensajería para Recomputes Pesados
*   **Estado en Código**: El recompute de riesgos se ejecuta sobre llamadas HTTP directas acopladas o hilos de corta vida, expuestos a fallos si la llamada tarda más del timeout HTTP.
*   **Plan para Producción**: Implementar una cola de mensajería asíncrona robusta (ej. BullMQ basada en Redis) que orqueste la ejecución de tareas de cómputo pesado sin bloquear el hilo principal del servidor API ni del cliente web.

---

## 3. Endurecimiento Operativo (Production Hardening)

Siguiendo el runbook de hardening (`docs/runbooks/agronautas-production-hardening.md`), la API debe cumplir estrictamente con los siguientes requisitos contractuales:

### A. Validación de Readiness y Liveness
*   `GET /health`: Liveness básico que responde `200 OK` inmediatamente para asegurar que el proceso está activo.
*   `GET /ready`: Readiness veraz. Solo responde `200 OK` si PostgreSQL y Redis están saludables. Si `AGRONAUTAS_RUNTIME_REQUIRED=true`, también se verifica la conectividad del worker externo de Python. MongoDB se trata como una capability degradada (si falla, la API debe seguir operando en modo degradado sin bloquear el readiness general).

### B. Señales y Cabeceras Contractuales
*   **`X-Agronautas-Mode`**: Debe indicar si la API se encuentra operando en modo `demo` o `live`.
*   **`X-Agronautas-Route-Compatibility`**: Cabecera que expone la versión del contrato de compatibilidad de la ruta (e.g. `/agronautas/v1`).
*   **Errores Estructurados**: Los fallos de seguridad o runtime deben responder con el esquema contractual estructurado con códigos `UNAUTHORIZED`, `FORBIDDEN` y `WORKER_UNAVAILABLE` definidos en `agronautas-contracts.v1.schema.json`.

---

## 4. Detección y Resolución del Bug Oculto (Next.js JSDOM Image Test Failure)

Durante la ejecución de las pruebas unitarias del paquete `web` (`pnpm --filter web test`), se identificó un fallo crítico en el test número 11:
`landing preserva anchors del source y redirige CTAs a /probar-demo` dentro del archivo `apps/web/src/components/landing/homepage.test.tsx`.

### Causa Raíz
El componente `LandingHomepage` utiliza `<Image>` de Next.js 15. Al ejecutarse la prueba en un entorno JSDOM con rendering estático (`renderToStaticMarkup` de React), el componente `<Image>` de Next.js optimiza los recursos de imagen y URL-codifica los caracteres especiales (incluyendo `/` como `%2F`) dentro del markup de salida:
*   **Ruta original esperada en el test**: `\/landing\/source\/logo\.webp` o `\/landing\/source\/imagen1\.webp`
*   **Salida real generada por Next.js SSR**: `src="/_next/image?url=%2Flanding%2Fsource%2Flogo.webp&amp;w=384&amp;q=75"`

Debido a que el test utiliza aserciones de expresiones regulares muy estrictas como `assert.match(markup, /\/landing\/source\/logo\.webp/)`, la presencia de `%2F` en lugar de `/` provoca que el test falle inmediatamente, bloqueando la pipeline de CI/CD para producción.

### Solución Técnica
La expresión regular en el archivo de pruebas debe flexibilizarse para permitir tanto el path plano como el codificado para SSR de Next.js.
*   **Regex Antigua**: `/\/landing\/source\/logo\.webp/`
*   **Regex Corregida**: `/landing(%2F|\/)source(%2F|\/)logo\.webp/` o buscar simplemente la presencia de `logo.webp` e `imagen1.webp` en las URLs de imágenes optimizadas.

---

## 5. Análisis de Opciones de Despliegue

Para desplegar el MVP en producción, se presentan las siguientes alternativas estratégicas:

| Enfoque | Pros | Cons | Complejidad / Esfuerzo |
| :--- | :--- | :--- | :--- |
| **Opción A: Despliegue Docker Compose Autogestionado** | - Configuración idéntica al bootstrap local.<br>- Bajo costo de configuración inicial. | - Escalabilidad manual e ineficiente.<br>- Punto único de fallo (SPOF) en la máquina host. | **Bajo** |
| **Opción B: Arquitectura Cloud Nativa (EKS/K8s/ECS + Serverless)** | - Auto-escalado granular por componente.<br>- Alta disponibilidad geográfica nativa. | - Requiere alta inversión en configuración de Terraform e Infraestructura como Código.<br>- Latencia de red compleja (VPC Peering). | **Alto** |
| **Opción C: Esquema PaaS Híbrido (Vercel + Railway/Render) [Recomendado]** | - Frontend en Edge (Vercel) ultra rápido.<br>- API y Python Worker aislados en contenedores escalables.<br>- PostgreSQL/PostGIS de nivel de producción administrado. | - Costo marginal de transferencia de datos inter-cloud.<br>- Dependencia de proveedores PaaS de terceros. | **Medio** |

---

## 6. Riesgos Críticos y Mitigaciones (Risks)

1.  **Exhaustación de Conexiones PostgreSQL (Modo Cluster)**:
    *   *Riesgo*: Al levantar la API en producción en modo cluster, cada CPU core inicia un subproceso con su propio pool de hasta 20 conexiones. Con múltiples réplicas del servidor, se puede alcanzar fácilmente el límite de la base de datos (e.g. 100 conexiones).
    *   *Mitigación*: Implementar un pooler como **PgBouncer** frente a la base de datos o limitar `max: 5` o `max: 10` en el pool del API en entornos de producción.
2.  **Locks de Recompute y Desincronización**:
    *   *Riesgo*: Si el worker de cálculo en Python se satura, los locks temporales de Redis (120 segundos de expiración) pueden expirar antes de que se complete la tarea, provocando cálculos duplicados o inconsistencias al persistir snapshots en base de datos.
    *   *Mitigación*: Utilizar un sistema de procesamiento asíncrono con colas que maneje reconexiones automáticas, estados de progreso (`en_progreso`, `completado`, `fallido`) y reintentos automáticos.
3.  **Límites de Tarifa de APIs de Modelos de Lenguaje (Groq)**:
    *   *Riesgo*: Picos de tráfico de usuarios en el chat grounded pueden agotar las cuotas de API de Groq, provocando interrupciones totales del servicio de chat.
    *   *Mitigación*: Habilitar un fallback elegante hacia otros proveedores (ej. Anthropic/OpenAI) o en su defecto devolver un mensaje explicativo detallado ("Groq no configurado o cuota excedida") tal y como está validado en los tests unitarios.

---

## 7. Plan de Acción de Próximos Pasos (Next Steps)

1.  **Corregir el Test Unitario de Frontend**: Modificar las expresiones regulares en `apps/web/src/components/landing/homepage.test.tsx` para aceptar caracteres URL-codificados en el SSR de Next.js, logrando un estado 100% verde en CI.
2.  **Configuración de Conexiones del Pool**: Limitar y optimizar el tamaño del pool de PostgreSQL basándose en el número de cores asignados en producción.
3.  **Refinar el Endpoint `/ready`**: Confirmar que todos los chequeos de PostgreSQL y Redis operen correctamente con los timeouts de producción y expongan cabeceras precisas de runtime.
4.  **Generar Propuesta Técnica (Proposal)**: Pasar formalmente a la etapa de propuesta de cambios para implementar estos arreglos de endurecimiento y asegurar un build robusto sin bloqueos.

---

**Ready for Proposal**: **Sí**. Con el análisis detallado del bug del test unitario de Next.js y el plan de mitigación del pooler de base de datos, el proyecto se encuentra listo para iniciar el diseño del plan de implementación.
