import type { Metadata } from 'next'

export const ROUTE_CONTRACTS = [
  {
    path: '/',
    mainId: 'main-content',
    visibility: 'public',
    title: 'Agronautas | Inteligencia de riesgo productivo',
    description: 'Landing pública de Agronautas con acceso directo a la demo del MVP de riesgo arrocero en Corrientes.',
    recoveryLabel: 'Volver al inicio',
    loadingLabel: 'Cargando Agronautas…',
    notFoundTitle: 'La página no existe',
    notFoundDescription: 'No encontramos la página pública que buscabas.',
    errorTitle: 'No pudimos cargar Agronautas',
    errorDescription: 'La aplicación encontró un problema y no mostró datos operativos.',
  },
  {
    path: '/probar-demo',
    mainId: 'main-content',
    visibility: 'public',
    title: 'Solicitar una demo | Agronautas',
    description: 'Solicitá una demo guiada de Agronautas para conocer el alcance verificable del MVP.',
    recoveryLabel: 'Volver a solicitar la demo',
    loadingLabel: 'Cargando el formulario de demo…',
    notFoundTitle: 'La solicitud de demo no existe',
    notFoundDescription: 'No encontramos el formulario público solicitado.',
    errorTitle: 'No pudimos cargar la solicitud de demo',
    errorDescription: 'La aplicación no mostró un formulario ni confirmó ninguna solicitud.',
  },
  {
    path: '/demo',
    mainId: 'main-content',
    visibility: 'demo',
    title: 'Workspace Agronautas | Demo',
    description: 'Workspace de demostración para explorar los estados contratados de Agronautas.',
    recoveryLabel: 'Volver al workspace',
    loadingLabel: 'Cargando el workspace Agronautas…',
    notFoundTitle: 'El workspace no existe',
    notFoundDescription: 'No encontramos este workspace de demostración.',
    errorTitle: 'No pudimos cargar el workspace',
    errorDescription: 'No se mostró evidencia operativa ni se inventaron datos para recuperar la vista.',
  },
  {
    path: '/login',
    mainId: 'main-content',
    visibility: 'public',
    title: 'Iniciar sesión | Agronautas',
    description: 'Acceso protegido a un workspace Agronautas con recuperación honesta de sesión.',
    recoveryLabel: 'Volver al acceso',
    loadingLabel: 'Verificando la sesión…',
    notFoundTitle: 'El acceso no existe',
    notFoundDescription: 'No encontramos la superficie de acceso solicitada.',
    errorTitle: 'No pudimos cargar el acceso',
    errorDescription: 'No se confirmó ninguna sesión ni se mostraron datos protegidos.',
  },
  {
    path: '/agronautas',
    mainId: 'main-content',
    visibility: 'protected',
    title: 'Workspace Agronautas',
    description: 'Workspace protegido por identidad, membresía y evidencia operacional.',
    recoveryLabel: 'Volver al acceso',
    loadingLabel: 'Cargando el workspace Agronautas…',
    notFoundTitle: 'El workspace no existe',
    notFoundDescription: 'No encontramos el workspace solicitado.',
    errorTitle: 'No pudimos cargar el workspace',
    errorDescription: 'No se mostraron datos protegidos sin una sesión y una autorización verificadas.',
  },
  {
    path: '/agronautas/marketplace',
    mainId: 'main-content',
    visibility: 'protected',
    title: 'Marketplace Agronautas',
    description: 'Catálogo operativo protegido y solicitudes sujetas a revisión humana.',
    recoveryLabel: 'Volver al workspace',
    loadingLabel: 'Cargando el marketplace Agronautas…',
    notFoundTitle: 'El marketplace no existe',
    notFoundDescription: 'No encontramos el marketplace solicitado.',
    errorTitle: 'No pudimos cargar el marketplace',
    errorDescription: 'No se mostró un catálogo protegido sin una sesión y evidencia verificadas.',
  },
  {
    path: '/agronautas/fields/[fieldId]',
    mainId: 'main-content',
    visibility: 'protected',
    title: 'Detalle del lote | Agronautas',
    description: 'Detalle operativo protegido con evidencia, actividad, geometría y recuperación contextual.',
    recoveryLabel: 'Volver al workspace',
    loadingLabel: 'Cargando el detalle del lote…',
    notFoundTitle: 'No encontramos el lote',
    notFoundDescription: 'El lote solicitado no está disponible en el workspace autorizado.',
    errorTitle: 'No pudimos cargar el lote',
    errorDescription: 'No se mostró un resultado exitoso sin evidencia verificable.',
  },
  {
    path: '/agronautas/maintenance',
    mainId: 'main-content',
    visibility: 'public',
    title: 'Mantenimiento | Agronautas',
    description: 'Estado público del runtime Agronautas sin contenido protegido de workspace.',
    recoveryLabel: 'Volver al acceso',
    loadingLabel: 'Verificando el estado de mantenimiento…',
    notFoundTitle: 'La ruta de mantenimiento no existe',
    notFoundDescription: 'No encontramos la superficie pública de estado solicitada.',
    errorTitle: 'No pudimos confirmar el estado de mantenimiento',
    errorDescription: 'No se mostraron datos protegidos ni se declaró disponibilidad sin evidencia.',
  },
  {
    path: '/demo/fields/[fieldId]',
    mainId: 'main-content',
    visibility: 'demo',
    title: 'Detalle del lote | Agronautas',
    description: 'Detalle de evidencia y estado de un lote Agronautas contratado o de demostración.',
    recoveryLabel: 'Volver al workspace',
    loadingLabel: 'Cargando el detalle del lote…',
    notFoundTitle: 'No encontramos el lote',
    notFoundDescription: 'El lote solicitado no está disponible en el contrato actual.',
    errorTitle: 'No pudimos cargar el lote',
    errorDescription: 'No se mostró un resultado exitoso sin evidencia verificable.',
  },
  {
    path: '/municipalities',
    mainId: 'main-content',
    visibility: 'protected',
    title: 'Centro de monitoreo hídrico | Agronautas',
    description: 'Centro de monitoreo hídrico con señales oficiales y estados de cobertura verificables.',
    recoveryLabel: 'Volver al monitoreo provincial',
    loadingLabel: 'Cargando el monitoreo hídrico…',
    notFoundTitle: 'El monitoreo provincial no existe',
    notFoundDescription: 'No encontramos la superficie de monitoreo solicitada.',
    errorTitle: 'No pudimos cargar el monitoreo provincial',
    errorDescription: 'No se mostraron lecturas oficiales no verificadas como si fueran éxito.',
  },
  {
    path: '/municipalities/[id]',
    mainId: 'main-content',
    visibility: 'protected',
    title: 'Tablero municipal | Agronautas',
    description: 'Tablero municipal con telemetría, pronóstico y procedencia oficial cuando están disponibles.',
    recoveryLabel: 'Volver al mapa provincial',
    loadingLabel: 'Cargando el tablero municipal…',
    notFoundTitle: 'No encontramos el municipio',
    notFoundDescription: 'El municipio solicitado no está disponible en el contrato actual.',
    errorTitle: 'No pudimos cargar el tablero municipal',
    errorDescription: 'No se mostró telemetría ni pronósticos sin evidencia oficial.',
  },
  {
    path: '/municipalities/ingest',
    mainId: 'main-content',
    visibility: 'protected',
    title: 'Ingesta hidrológica | Agronautas',
    description: 'Operación protegida para solicitar una actualización puntual de fuentes hidrológicas oficiales.',
    recoveryLabel: 'Volver a verificar el acceso',
    loadingLabel: 'Cargando la operación de ingesta…',
    notFoundTitle: 'La operación de ingesta no existe',
    notFoundDescription: 'No encontramos la operación protegida solicitada.',
    errorTitle: 'No pudimos cargar la operación de ingesta',
    errorDescription: 'No se inició ninguna operación ni se afirmó una ingesta exitosa.',
  },
] as const

export type RouteContract = (typeof ROUTE_CONTRACTS)[number]
export type RoutePath = RouteContract['path']
export type RouteVisibility = RouteContract['visibility']
export type ConfiguredOriginEnv = Readonly<Record<string, string | undefined>>

const ORIGIN_ENV_KEYS = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL', 'PUBLIC_ORIGIN'] as const

export function getRouteContract(path: RoutePath): RouteContract | undefined {
  return ROUTE_CONTRACTS.find((route) => route.path === path)
}

export function getPublicRouteContracts(): readonly RouteContract[] {
  return ROUTE_CONTRACTS.filter((route) => route.visibility === 'public')
}

export function getConfiguredOrigin(env: ConfiguredOriginEnv = process.env): string | undefined {
  for (const key of ORIGIN_ENV_KEYS) {
    const configured = env[key]?.trim()
    if (!configured) continue

    try {
      const origin = new URL(configured)
      if ((origin.protocol !== 'https:' && origin.protocol !== 'http:') || origin.username || origin.password) continue
      return origin.origin
    } catch {
      continue
    }
  }

  return undefined
}

export function buildRouteMetadata(path: RoutePath, env: ConfiguredOriginEnv = process.env): Metadata {
  const route = getRouteContract(path)
  if (!route) throw new Error(`Unknown route contract: ${path}`)

  const origin = getConfiguredOrigin(env)
  const canonical = origin ? `${origin}${route.path === '/' ? '/' : route.path}` : undefined
  const metadata: Metadata = {
    title: route.title,
    description: route.description,
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      title: route.title,
      description: route.description,
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      card: 'summary',
      title: route.title,
      description: route.description,
    },
    ...(route.visibility === 'public' ? {} : { robots: { index: false, follow: false } }),
  }

  return metadata
}
