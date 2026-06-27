# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: landing.spec.js >> landing matches source anchors and routes demo CTAs to /probar-demo while /demo stays direct
- Location: tests\e2e\landing.spec.js:3:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - generic [ref=e12]:
    - navigation [ref=e13]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - img "Agronautas" [ref=e17]
          - generic [ref=e18]: AGRONAUTAS
        - generic [ref=e19]:
          - link "Risk Engine" [ref=e20] [cursor=pointer]:
            - /url: "#risk-engine"
            - text: Risk Engine
          - link "Soluciones" [ref=e21] [cursor=pointer]:
            - /url: "#soluciones"
            - text: Soluciones
          - link "Data" [ref=e22] [cursor=pointer]:
            - /url: "#data"
            - text: Data
          - link "Insurtech" [ref=e23] [cursor=pointer]:
            - /url: "#insurtech"
            - text: Insurtech
          - link "Roadmap" [ref=e24] [cursor=pointer]:
            - /url: "#roadmap"
            - text: Roadmap
          - link "Probar demo" [ref=e25] [cursor=pointer]:
            - /url: /probar-demo
    - generic [ref=e26]:
      - img [ref=e28]
      - generic [ref=e33]:
        - generic:
          - generic: AGRONAUTA RISK ENGINE
        - heading "REDUCCIÓN DE INCERTIDUMBRE" [level=1] [ref=e34]:
          - text: REDUCCIÓN DE
          - text: INCERTIDUMBRE
        - paragraph [ref=e35]: Inteligencia de Riesgo Productivo para Corrientes. Monitorea tus cultivos de yerba mate, té, tabaco y arroz con tecnología satelital de precisión.
        - generic [ref=e36]:
          - link "Probar demo" [ref=e38] [cursor=pointer]:
            - /url: /probar-demo
            - text: Probar demo
            - img [ref=e39]
          - button "Ver Risk Engine" [ref=e41]
        - generic [ref=e42]:
          - generic [ref=e43]:
            - paragraph [ref=e44]: "79"
            - paragraph [ref=e45]: Municipios Monitoreados
          - generic [ref=e46]:
            - paragraph [ref=e47]: 1.2M
            - paragraph [ref=e48]: Hectáreas
          - generic [ref=e49]:
            - paragraph [ref=e50]: 100%
            - paragraph [ref=e51]: Cobertura Regional
          - generic [ref=e52]:
            - paragraph [ref=e53]: 96%
            - paragraph [ref=e54]: Precisión
    - generic [ref=e59]:
      - generic [ref=e61]:
        - generic [ref=e62]: Core Technology
        - heading "Agronautas Risk Engine" [level=2] [ref=e63]:
          - text: Agronautas
          - text: Risk Engine
        - paragraph [ref=e64]: Motor de análisis territorial, climático y productivo especializado en los cultivos de Corrientes.
      - generic [ref=e65]:
        - generic [ref=e66]:
          - generic [ref=e68]:
            - img [ref=e70]
            - generic [ref=e74]:
              - heading "Datos de Corrientes" [level=3] [ref=e75]
              - paragraph [ref=e76]: Satélites, clima local, suelos y datos históricos regionales
              - generic [ref=e78]: 15+ fuentes
          - generic [ref=e80]:
            - img [ref=e82]
            - generic [ref=e90]:
              - heading "IA Regional" [level=3] [ref=e91]
              - paragraph [ref=e92]: Modelos predictivos entrenados en cultivos de Corrientes
              - generic [ref=e94]: 96% precisión
          - generic [ref=e96]:
            - img [ref=e98]
            - generic [ref=e100]:
              - heading "Monitoreo Diario" [level=3] [ref=e101]
              - paragraph [ref=e102]: Alertas en tiempo real de amenazas climáticas regionales
              - generic [ref=e104]: Actualización diaria
        - generic [ref=e105]:
          - generic [ref=e107]:
            - img [ref=e109]
            - generic [ref=e115]:
              - heading "Satellite API" [level=4] [ref=e116]
              - paragraph [ref=e117]: NDVI, EVI, Biomasa, Vigor del cultivo
            - img [ref=e118]
          - generic [ref=e121]:
            - img [ref=e123]
            - generic [ref=e128]:
              - heading "Climate API" [level=4] [ref=e129]
              - paragraph [ref=e130]: Heladas, sequías, anegamientos, vientos fuertes
            - img [ref=e131]
          - generic [ref=e134]:
            - img [ref=e136]
            - generic [ref=e138]:
              - heading "Territorial Risk API" [level=4] [ref=e139]
              - paragraph [ref=e140]: Riesgo climático para cada lote
            - img [ref=e141]
          - generic [ref=e144]:
            - img [ref=e146]
            - generic [ref=e149]:
              - heading "Yield API" [level=4] [ref=e150]
              - paragraph [ref=e151]: Predicción de cosecha de yerba, té, tabaco y arroz
            - img [ref=e152]
    - generic [ref=e154]:
      - generic [ref=e155]:
        - img [ref=e157]
        - generic [ref=e160]:
          - text: Área 1
          - heading "Data Company" [level=2] [ref=e161]
          - paragraph [ref=e162]: APIs especializadas para productores de yerba mate, té, tabaco y arroz de Corrientes
      - generic [ref=e165]:
        - generic [ref=e168]:
          - img [ref=e170]
          - heading "Climate API" [level=3] [ref=e172]
          - generic [ref=e173]:
            - generic [ref=e174]: Heladas
            - generic [ref=e175]: Anegamientos
            - generic [ref=e176]: Sequías
            - generic [ref=e177]: Vientos
          - button "Explorar API" [ref=e178]:
            - text: Explorar API
            - img [ref=e179]
        - generic [ref=e183]:
          - img [ref=e185]
          - heading "Satellite API" [level=3] [ref=e191]
          - generic [ref=e192]:
            - generic [ref=e193]: NDVI
            - generic [ref=e194]: Vigor
            - generic [ref=e195]: Humedad
            - generic [ref=e196]: Cobertura
          - button "Explorar API" [ref=e197]:
            - text: Explorar API
            - img [ref=e198]
        - generic [ref=e202]:
          - img [ref=e204]
          - heading "Yield API" [level=3] [ref=e213]
          - generic [ref=e214]:
            - generic [ref=e215]: Rendimiento
            - generic [ref=e216]: Cosecha
            - generic [ref=e217]: Calidad
            - generic [ref=e218]: Ciclo
          - button "Explorar API" [ref=e219]:
            - text: Explorar API
            - img [ref=e220]
        - generic [ref=e224]:
          - img [ref=e226]
          - heading "Territorial Risk API" [level=3] [ref=e228]
          - generic [ref=e229]:
            - generic [ref=e230]: Riesgo Lote
            - generic [ref=e231]: Histórico
            - generic [ref=e232]: Pronóstico
          - button "Explorar API" [ref=e233]:
            - text: Explorar API
            - img [ref=e234]
    - generic [ref=e236]:
      - generic [ref=e237]:
        - img [ref=e239]
        - generic [ref=e242]:
          - text: Área 2
          - heading "SaaS Vertical Agro" [level=2] [ref=e243]
          - paragraph [ref=e244]: "Plataforma para productores de Corrientes: monitoreo satelital, alertas tempranas y asesor IA agronómico"
      - generic [ref=e246]:
        - generic [ref=e247]:
          - generic [ref=e248]:
            - generic [ref=e249]:
              - generic [ref=e250]:
                - generic [ref=e251]:
                  - img [ref=e252]
                  - generic [ref=e255]: Módulo 1
                - heading "Monitoreo de Campos" [level=3] [ref=e256]
                - paragraph [ref=e257]: Seguimiento satelital de todos tus lotes en tiempo real
              - img "Dashboard preview" [ref=e258]
            - generic [ref=e259]:
              - generic [ref=e260]:
                - paragraph [ref=e261]: NDVI
                - paragraph [ref=e262]: "0.78"
              - generic [ref=e263]:
                - paragraph [ref=e264]: EVI
                - paragraph [ref=e265]: "0.78"
              - generic [ref=e266]:
                - paragraph [ref=e267]: Biomasa
                - paragraph [ref=e268]: "0.78"
              - generic [ref=e269]:
                - paragraph [ref=e270]: Estrés Hídrico
                - paragraph [ref=e271]: "0.78"
          - generic [ref=e272]:
            - img [ref=e273]
            - heading "Centro de Alertas" [level=3] [ref=e276]
            - paragraph [ref=e277]: Alertas tempranas personalizadas
            - generic [ref=e278]:
              - generic [ref=e279]:
                - paragraph [ref=e280]: "Alerta: Helada esperada"
                - paragraph [ref=e281]: Hace 2 minutos
              - generic [ref=e282]:
                - paragraph [ref=e283]: Riesgo de anegamiento
                - paragraph [ref=e284]: Hace 2 minutos
              - generic [ref=e285]:
                - paragraph [ref=e286]: Sequía crítica
                - paragraph [ref=e287]: Hace 2 minutos
        - generic [ref=e288]:
          - generic [ref=e289]:
            - generic [ref=e290]:
              - img [ref=e291]
              - generic [ref=e294]: Módulo 3
            - heading "Asesor IA Agronómico" [level=3] [ref=e295]
            - paragraph [ref=e296]: Especializado en yerba mate, té, tabaco y arroz
            - generic [ref=e297]:
              - paragraph [ref=e298]: "\"Mi yerba está con estrés hídrico, ¿qué hago?\""
              - generic [ref=e299]:
                - img [ref=e300]
                - generic [ref=e303]: Aumentar riego y aplicar fungicida preventivo
          - generic [ref=e304]:
            - generic [ref=e305]:
              - img [ref=e306]
              - generic [ref=e309]: Módulo 5
            - heading "Recomendador de Cultivos" [level=3] [ref=e310]
            - paragraph [ref=e311]: Optimiza rentabilidad para cultivos de Corrientes
            - generic [ref=e312]:
              - generic [ref=e313]: Yerba Mate
              - generic [ref=e314]: Té
              - generic [ref=e315]: Tabaco
              - generic [ref=e316]: Arroz
    - generic [ref=e318]:
      - generic [ref=e320]:
        - text: Área 3
        - heading "Commodities Intelligence" [level=2] [ref=e321]
        - paragraph [ref=e322]: Proyecciones de cosecha de Corrientes y alertas de precio en mercados internacionales
      - generic [ref=e323]:
        - generic [ref=e324]:
          - img [ref=e325]
          - paragraph [ref=e328]: Proyección Yerba
          - paragraph [ref=e329]: 187K tn
          - text: +3.2%
        - generic [ref=e330]:
          - img [ref=e331]
          - paragraph [ref=e334]: Exportación Regional
          - paragraph [ref=e335]: $850M
          - text: +12%
        - generic [ref=e336]:
          - img [ref=e337]
          - paragraph [ref=e339]: Riesgo Climático
          - paragraph [ref=e340]: Moderado
          - text: Heladas posibles
        - generic [ref=e341]:
          - img [ref=e342]
          - paragraph [ref=e345]: Precio Int'l Yerba
          - paragraph [ref=e346]: USD 1.85/kg
          - text: +1.8%
    - generic [ref=e347]:
      - generic [ref=e348]:
        - img [ref=e351]
        - generic [ref=e353]:
          - button "Ir a slide 1" [ref=e354]
          - button "Ir a slide 2" [ref=e355]
          - button "Ir a slide 3" [ref=e356]
        - button "Slide anterior" [ref=e357]:
          - img [ref=e358]
        - button "Siguiente slide" [ref=e360]:
          - img [ref=e361]
        - generic [ref=e364]:
          - text: Área 6
          - heading "Insurtech" [level=2] [ref=e365]
          - paragraph [ref=e366]: Seguros diseñados para heladas, anegamientos y sequías de Corrientes
      - generic [ref=e368]:
        - generic [ref=e369]:
          - generic [ref=e370]:
            - img [ref=e371]
            - heading "Pricing Engine" [level=3] [ref=e373]
            - paragraph [ref=e374]: Primas justas según riesgo real de tu lote
            - generic [ref=e375]:
              - generic [ref=e376]: Precisión 96%
              - generic [ref=e377]: Actualización diaria
          - generic [ref=e378]:
            - img [ref=e379]
            - heading "Seguros Paramétricos" [level=3] [ref=e386]
            - paragraph [ref=e387]: Activación automática por umbrales climáticos
            - generic [ref=e388]:
              - generic [ref=e389]: Heladas
              - generic [ref=e390]: Anegamientos
              - generic [ref=e391]: Sequías
          - generic [ref=e392]:
            - img [ref=e393]
            - heading "Detección de Daños" [level=3] [ref=e396]
            - paragraph [ref=e397]: Verificación satelital de siniestros
            - generic [ref=e398]:
              - generic [ref=e399]: Menos fraudes
              - generic [ref=e400]: Liquidación 7 días
        - generic [ref=e402]:
          - generic [ref=e403]:
            - heading "Reducción de Incertidumbre" [level=3] [ref=e404]
            - paragraph [ref=e405]: Para productores de Corrientes y el sector agropecuario regional
          - link "Agendar demo" [ref=e406] [cursor=pointer]:
            - /url: /probar-demo
            - text: Agendar demo
            - img [ref=e407]
    - generic [ref=e410]:
      - generic [ref=e412]:
        - text: Hoja de Ruta
        - heading "Orden de Ejecución" [level=2] [ref=e413]
      - generic [ref=e416]:
        - generic [ref=e417]:
          - generic [ref=e418]:
            - generic [ref=e419]: Fase 1
            - heading "Risk Engine" [level=3] [ref=e420]
            - paragraph [ref=e421]: Construcción del motor de análisis territorial
          - img [ref=e424]
          - generic [ref=e427]: Q1 2025
        - generic [ref=e428]:
          - generic [ref=e429]:
            - generic [ref=e430]: Fase 2
            - heading "SaaS Agro" [level=3] [ref=e431]
            - paragraph [ref=e432]: Plataforma para productores y alertas tempranas
          - img [ref=e435]
          - generic [ref=e437]: Q2 2025
        - generic [ref=e438]:
          - generic [ref=e439]:
            - generic [ref=e440]: Fase 3
            - heading "Climate Score" [level=3] [ref=e441]
            - paragraph [ref=e442]: Scores de riesgo climático y productivo
          - img [ref=e445]
          - generic [ref=e448]: Q3 2025
        - generic [ref=e449]:
          - generic [ref=e450]:
            - generic [ref=e451]: Fase 4
            - heading "Commodities Intelligence" [level=3] [ref=e452]
            - paragraph [ref=e453]: Predicción de producción y señales de mercado
          - img [ref=e456]
          - generic [ref=e459]: Q4 2025
        - generic [ref=e460]:
          - generic [ref=e461]:
            - generic [ref=e462]: Fase 5
            - heading "Insurtech" [level=3] [ref=e463]
            - paragraph [ref=e464]: Seguros paramétricos y detección de siniestros
          - img [ref=e467]
          - generic [ref=e469]: Q1 2026
    - contentinfo [ref=e470]:
      - generic [ref=e471]:
        - generic [ref=e472]:
          - generic [ref=e473]:
            - img "Agronautas" [ref=e474]
            - generic [ref=e475]: AGRONAUTAS
          - paragraph [ref=e476]: Inteligencia Productiva para Corrientes, Argentina
          - generic [ref=e477]:
            - button [ref=e478]:
              - img [ref=e479]
            - button [ref=e487]:
              - img [ref=e488]
        - generic [ref=e491]: © 2026 Agronautas - Especialistas en Corrientes
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test('landing matches source anchors and routes demo CTAs to /probar-demo while /demo stays direct', async ({ page }) => {
  4  |   await page.setViewportSize({ width: 1700, height: 1200 })
  5  |   await page.goto('/')
  6  |   await page.waitForLoadState('networkidle')
  7  | 
  8  |   await expect(page.getByRole('heading', { name: 'REDUCCIÓN DE INCERTIDUMBRE', exact: true })).toBeVisible({ timeout: 10000 })
  9  |   await expect(page.getByRole('heading', { name: /agronautas risk engine/i })).toBeVisible()
  10 | 
  11 |   const brandedImages = page.locator('img[src*="/_next/image"]')
  12 |   await expect(brandedImages.first()).toBeVisible()
  13 |   await expect(page.getByAltText('Agronautas').first()).toBeVisible()
  14 |   expect(await brandedImages.count()).toBeGreaterThanOrEqual(4)
  15 | 
  16 |   const imageReadiness = await brandedImages.evaluateAll((images) =>
  17 |     images.slice(0, 3).every((image) => image.complete && image.naturalWidth > 0)
  18 |   )
> 19 |   expect(imageReadiness).toBe(true)
     |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  20 | 
  21 |   await expect(page.getByText(/organización o rol/i)).toHaveCount(0)
  22 |   await expect(page.getByText(/solicitar contacto/i)).toHaveCount(0)
  23 | 
  24 |   const desktopDemoLinks = page.getByRole('link', { name: /probar demo|agendar demo/i })
  25 |   await expect(desktopDemoLinks).toHaveCount(3)
  26 |   await expect(page.getByRole('link', { name: /probar demo/i }).first()).toBeVisible()
  27 | 
  28 |   await page.setViewportSize({ width: 1280, height: 900 })
  29 |   await page.getByRole('button', { name: /abrir menú/i }).click()
  30 |   await expect(page.getByRole('link', { name: 'Risk Engine' })).toBeVisible()
  31 |   await expect(page.getByRole('link', { name: 'Soluciones' })).toBeVisible()
  32 |   await expect(page.getByRole('link', { name: 'Data' })).toBeVisible()
  33 |   await expect(page.getByRole('link', { name: 'Insurtech' })).toBeVisible()
  34 |   await expect(page.getByRole('link', { name: 'Roadmap' })).toBeVisible()
  35 |   await expect(page.getByRole('link', { name: /probar demo/i }).last()).toBeVisible()
  36 |   await page.getByRole('button', { name: /cerrar menú/i }).click()
  37 | 
  38 |   const indicators = page.locator('button[aria-label^="Ir a slide"]')
  39 |   await expect(indicators).toHaveCount(3)
  40 |   await page.getByRole('button', { name: /siguiente slide/i }).click()
  41 |   await expect(indicators.nth(1)).toHaveClass(/bg-emerald-500/)
  42 |   await page.getByRole('button', { name: /slide anterior/i }).click()
  43 |   await expect(indicators.nth(0)).toHaveClass(/bg-emerald-500/)
  44 | 
  45 |   await page.setViewportSize({ width: 1700, height: 1200 })
  46 |   await page.getByRole('link', { name: /probar demo/i }).first().click()
  47 |   await expect(page).toHaveURL(/\/probar-demo$/)
  48 | 
  49 |   await page.goto('/demo')
  50 |   await expect(page).toHaveURL(/\/demo$/)
  51 | })
  52 | 
```