'use client'

import React from 'react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bot,
  Brain,
  ChevronRight,
  CloudRain,
  CloudSun,
  Cpu,
  Database,
  Eye,
  Gauge,
  Globe,
  Laptop,
  LineChart,
  Map,
  Menu,
  Radar,
  Satellite,
  Shield,
  Sparkles,
  Sprout,
  TrendingUp,
  Wheat,
  X,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'

const logo = '/landing/source/logo.webp'
const imagen1 = '/landing/source/imagen1.webp'
const imagen2 = '/landing/source/imagen2.webp'
const imagen3 = '/landing/source/imagen3.webp'
const imagen5 = '/landing/source/imagen5.webp'
const imagen6 = '/landing/source/imagen6.webp'
const imagen7 = '/landing/source/imagen7.webp'
const image1 = '/landing/source/image1.webp'

type LandingHomepageProps = {
  initialShowSplash?: boolean
  initialSplashVisible?: boolean
}

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false)
      onComplete()
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [onComplete])

  if (!isLoading) return null

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-800"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
          className="mb-6"
        >
          <img src={logo} alt="Agronautas" className="mx-auto h-24 w-24 sm:h-32 sm:w-32" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-3xl font-black tracking-tighter text-white sm:text-4xl md:text-5xl"
        >
          AGRONAUTAS
        </motion.h1>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mx-auto mt-4 h-1 w-24 rounded-full bg-emerald-500"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mt-4 text-sm text-slate-300 sm:text-base"
        >
          Inteligencia de Riesgo Productivo
        </motion.p>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: 'linear' }}
          className="mt-8 inline-block"
        >
          <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent" />
        </motion.div>
      </div>
    </motion.div>
  )
}

const stats = [
  { label: 'Municipios Monitoreados', value: '79', valueClassName: 'text-emerald-400' },
  { label: 'Hectáreas', value: '1.2M', valueClassName: 'text-cyan-400' },
  { label: 'Cobertura Regional', value: '100%', valueClassName: 'text-emerald-400' },
  { label: 'Precisión', value: '96%', valueClassName: 'text-cyan-400' },
]

const riskFeatures = [
  { icon: Database, title: 'Datos de Corrientes', desc: 'Satélites, clima local, suelos y datos históricos regionales', stat: '15+ fuentes' },
  { icon: Brain, title: 'IA Regional', desc: 'Modelos predictivos entrenados en cultivos de Corrientes', stat: '96% precisión' },
  { icon: Zap, title: 'Monitoreo Diario', desc: 'Alertas en tiempo real de amenazas climáticas regionales', stat: 'Actualización diaria' },
]

const riskApis = [
  { icon: Satellite, title: 'Satellite API', desc: 'NDVI, EVI, Biomasa, Vigor del cultivo' },
  { icon: CloudSun, title: 'Climate API', desc: 'Heladas, sequías, anegamientos, vientos fuertes' },
  { icon: Map, title: 'Territorial Risk API', desc: 'Riesgo climático para cada lote' },
  { icon: TrendingUp, title: 'Yield API', desc: 'Predicción de cosecha de yerba, té, tabaco y arroz' },
]

const dataCompanyCards = [
  { icon: CloudRain, title: 'Climate API', gradient: 'from-blue-500 to-cyan-500', metrics: ['Heladas', 'Anegamientos', 'Sequías', 'Vientos'] },
  { icon: Satellite, title: 'Satellite API', gradient: 'from-emerald-500 to-teal-500', metrics: ['NDVI', 'Vigor', 'Humedad', 'Cobertura'] },
  { icon: Wheat, title: 'Yield API', gradient: 'from-amber-500 to-orange-500', metrics: ['Rendimiento', 'Cosecha', 'Calidad', 'Ciclo'] },
  { icon: Map, title: 'Territorial Risk API', gradient: 'from-purple-500 to-pink-500', metrics: ['Riesgo Lote', 'Histórico', 'Pronóstico'] },
]

const commoditiesCards = [
  { icon: LineChart, title: 'Proyección Yerba', value: '187K tn', change: '+3.2%', iconClassName: 'text-emerald-500' },
  { icon: TrendingUp, title: 'Exportación Regional', value: '$850M', change: '+12%', iconClassName: 'text-blue-500' },
  { icon: AlertTriangle, title: 'Riesgo Climático', value: 'Moderado', change: 'Heladas posibles', iconClassName: 'text-orange-500' },
  { icon: Globe, title: "Precio Int'l Yerba", value: 'USD 1.85/kg', change: '+1.8%', iconClassName: 'text-purple-500' },
]

const insurtechCards = [
  { icon: Shield, title: 'Pricing Engine', desc: 'Primas justas según riesgo real de tu lote', metrics: ['Precisión 96%', 'Actualización diaria'] },
  { icon: Radar, title: 'Seguros Paramétricos', desc: 'Activación automática por umbrales climáticos', metrics: ['Heladas', 'Anegamientos', 'Sequías'] },
  { icon: Eye, title: 'Detección de Daños', desc: 'Verificación satelital de siniestros', metrics: ['Menos fraudes', 'Liquidación 7 días'] },
]

const roadmap = [
  { fase: 'Fase 1', title: 'Risk Engine', desc: 'Construcción del motor de análisis territorial', icon: Cpu, bgColor: 'bg-emerald-500', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', date: 'Q1 2025' },
  { fase: 'Fase 2', title: 'SaaS Agro', desc: 'Plataforma para productores y alertas tempranas', icon: Laptop, bgColor: 'bg-blue-500', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', date: 'Q2 2025' },
  { fase: 'Fase 3', title: 'Climate Score', desc: 'Scores de riesgo climático y productivo', icon: Gauge, bgColor: 'bg-amber-500', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700', date: 'Q3 2025' },
  { fase: 'Fase 4', title: 'Commodities Intelligence', desc: 'Predicción de producción y señales de mercado', icon: TrendingUp, bgColor: 'bg-purple-500', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', date: 'Q4 2025' },
  { fase: 'Fase 5', title: 'Insurtech', desc: 'Seguros paramétricos y detección de siniestros', icon: Shield, bgColor: 'bg-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700', date: 'Q1 2026' },
]

export function LandingHomepage({ initialShowSplash, initialSplashVisible = true }: LandingHomepageProps) {
  const [showSplash, setShowSplash] = useState(initialShowSplash ?? initialSplashVisible)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [heroAnimateKey, setHeroAnimateKey] = useState(0)
  const [insuranceCarouselIndex, setInsuranceCarouselIndex] = useState(0)
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])
  const navItems = ['Risk Engine', 'Soluciones', 'Data', 'Insurtech', 'Roadmap']
  const insuranceImages = [imagen5, imagen6, imagen7]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!showSplash) {
      const timer = window.setTimeout(() => setHeroAnimateKey((current) => current + 1), 100)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [showSplash])

  return (
    <>
      <AnimatePresence>{showSplash ? <SplashScreen onComplete={() => setShowSplash(false)} /> : null}</AnimatePresence>
      {!showSplash ? (
        <div className="min-h-screen overflow-x-hidden bg-white">
          <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.5 }} className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 py-2 shadow-lg backdrop-blur-md' : 'bg-transparent py-4'}`}>
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <img src={logo} alt="Agronautas" className="h-8 w-auto sm:h-10" />
                  <span className="bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-xl font-black tracking-tight text-transparent sm:text-2xl">AGRONAUTAS</span>
                </div>

                <div className="hidden items-center gap-6 xl:gap-8 min-[1600px]:flex">
                  {navItems.map((item) => (
                    <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="group relative whitespace-nowrap font-medium text-slate-600 transition-colors hover:text-emerald-600">
                      {item}
                      <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-emerald-500 transition-all group-hover:w-full" />
                    </a>
                  ))}
                  <Link href="/demo" className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2 font-medium text-white transition-all hover:shadow-lg">Demo</Link>
                </div>

                <button type="button" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMobileMenuOpen((current) => !current)} className="rounded-lg bg-white/10 p-2 backdrop-blur-sm min-[1600px]:hidden">
                  {mobileMenuOpen ? <X className="text-slate-800" size={24} /> : <Menu className="text-slate-800" size={24} />}
                </button>
              </div>
            </div>
          </motion.nav>

          <AnimatePresence>
            {mobileMenuOpen ? (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm min-[1600px]:hidden" />
                <motion.div initial={{ opacity: 0, y: -30, scaleY: 0.8 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} exit={{ opacity: 0, y: -30, scaleY: 0.8 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="fixed left-4 right-4 top-[60px] z-40 origin-top overflow-hidden rounded-2xl border border-slate-100/50 bg-gradient-to-b from-white to-slate-50 shadow-2xl min-[1600px]:hidden sm:top-[72px]">
                  <div className="flex max-h-[80vh] flex-col gap-2 overflow-y-auto p-6">
                    {navItems.map((item, index) => (
                      <motion.a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05, duration: 0.3 }} className="group flex items-center justify-between rounded-lg px-4 py-3 font-semibold text-slate-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => setMobileMenuOpen(false)}>
                        <span>{item}</span>
                        <ChevronRight size={18} className="text-emerald-500 transition-transform group-hover:translate-x-1" />
                      </motion.a>
                    ))}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: navItems.length * 0.05 + 0.1, duration: 0.3 }} className="mt-4 border-t border-slate-200 pt-4">
                      <button type="button" onClick={() => setMobileMenuOpen(false)} className="w-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 font-medium text-white transition-all hover:shadow-lg">Solicitar Demo</button>
                    </motion.div>
                  </div>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>

          <section className="relative min-h-screen w-full overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-scroll md:bg-fixed" style={{ backgroundImage: `url(${imagen1})` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
              <div className="bg-grid-pattern absolute inset-0 opacity-20" />
            </div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
              <motion.div key={heroAnimateKey} style={{ opacity, scale }} className="mx-auto max-w-5xl text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2">
                    <Sparkles size={14} className="text-emerald-400 sm:h-4 sm:w-4" />
                    <span className="text-xs font-medium tracking-wide text-emerald-400 sm:text-sm">AGRONAUTA RISK ENGINE</span>
                  </motion.div>
                  <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-4xl font-black leading-[1.1] tracking-tighter text-white sm:text-6xl sm:leading-[0.9] md:text-7xl lg:text-8xl xl:text-9xl">
                    REDUCCIÓN DE
                    <br />
                    <span className="animate-shimmer bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-[length:200%_auto] bg-clip-text text-transparent">INCERTIDUMBRE</span>
                  </motion.h1>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mx-auto mt-4 max-w-3xl px-4 text-base text-slate-200 sm:mt-6 sm:text-lg md:mt-8 md:text-xl lg:text-2xl">Inteligencia de Riesgo Productivo para Corrientes. Monitorea tus cultivos de yerba mate, té, tabaco y arroz con tecnología satelital de precisión.</motion.p>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-8 flex flex-col justify-center gap-3 px-4 sm:mt-12 sm:flex-row sm:gap-4">
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="group flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-base font-bold text-white shadow-2xl shadow-emerald-500/30 transition-all hover:from-emerald-600 hover:to-emerald-700 sm:px-8 sm:py-4 sm:text-lg">Explorar Plataforma<ChevronRight className="transition-transform group-hover:translate-x-1" size={18} /></motion.button>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="rounded-full border border-white/30 px-6 py-3 text-base font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 sm:px-8 sm:py-4 sm:text-lg">Ver Risk Engine</motion.button>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 border-t border-white/20 px-4 pt-8 sm:mt-20 sm:grid-cols-4 sm:gap-8 sm:pt-10">
                    {stats.map((stat, index) => (
                      <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 + index * 0.1 }} className="text-center">
                        <p className={`${stat.valueClassName} text-2xl font-bold sm:text-3xl md:text-4xl`}>{stat.value}</p>
                        <p className="mt-1 text-xs text-slate-300 sm:text-sm">{stat.label}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }} className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 sm:bottom-10">
              <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/50"><div className="mt-2 h-3 w-1 animate-bounce rounded-full bg-white" /></div>
            </motion.div>
          </section>

          <section className="relative bg-white py-16 sm:py-24" id="risk-engine">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <div className="mb-12 text-center sm:mb-16">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                  <span className="inline-block rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 sm:px-4 sm:py-2 sm:text-sm">Core Technology</span>
                  <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl">Agronautas<br /><span className="text-emerald-600">Risk Engine</span></h2>
                  <p className="mx-auto mt-4 max-w-2xl px-4 text-base text-slate-500 sm:text-lg md:text-xl">Motor de análisis territorial, climático y productivo especializado en los cultivos de Corrientes.</p>
                </motion.div>
              </div>
              <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-16">
                <div className="space-y-4 sm:space-y-6">
                  {riskFeatures.map((feature, index) => (
                    <motion.div key={feature.title} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ x: 10 }} className="group rounded-xl bg-slate-50 p-4 transition-all duration-300 hover:bg-white hover:shadow-xl sm:rounded-2xl sm:p-6">
                      <div className="flex items-start gap-4 sm:gap-5"><div className="rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-2 sm:p-3"><feature.icon className="text-emerald-600" size={24} /></div><div className="flex-1"><h3 className="text-lg font-bold text-slate-800 sm:text-xl">{feature.title}</h3><p className="mt-1 text-sm text-slate-500 sm:text-base">{feature.desc}</p><div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 sm:mt-3 sm:text-sm"><span>{feature.stat}</span></div></div></div>
                    </motion.div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {riskApis.map((item, index) => (
                    <motion.div key={item.title} initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ x: -5 }} className="group rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-white hover:shadow-xl sm:rounded-2xl sm:p-5">
                      <div className="flex items-center gap-3 sm:gap-5"><div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 sm:rounded-xl sm:p-3"><item.icon size={20} /></div><div className="flex-1"><h4 className="text-sm font-bold text-slate-800 sm:text-base">{item.title}</h4><p className="text-xs text-slate-500 sm:text-sm">{item.desc}</p></div><ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-1" /></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="relative w-full" id="data">
            <div className="relative flex min-h-[40vh] w-full items-center justify-center overflow-hidden sm:min-h-[50vh]">
              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-scroll md:bg-fixed" style={{ backgroundImage: `url(${imagen2})` }} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60" />
              <div className="relative z-10 px-4 py-16 text-center sm:py-20 md:py-32"><motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span className="text-xs font-bold uppercase tracking-wider text-cyan-400 sm:text-sm">Área 1</span><h2 className="mt-3 text-3xl font-black text-white sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">Data Company</h2><p className="mx-auto mt-3 max-w-2xl px-4 text-base text-slate-200 sm:mt-4 sm:text-lg md:text-xl">APIs especializadas para productores de yerba mate, té, tabaco y arroz de Corrientes</p></motion.div></div>
            </div>
            <div className="relative z-10 bg-white py-12 sm:py-16 md:py-20"><div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-4">{dataCompanyCards.map((item, index) => (<motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -10 }} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl sm:rounded-2xl"><div className={`h-1 bg-gradient-to-r sm:h-2 ${item.gradient}`} /><div className="p-4 sm:p-6"><div className={`mb-3 w-fit rounded-xl bg-gradient-to-r p-2 sm:mb-4 sm:p-3 ${item.gradient}`}><item.icon size={20} className="text-white sm:h-6 sm:w-6" /></div><h3 className="text-base font-bold text-slate-800 sm:text-lg md:text-xl">{item.title}</h3><div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">{item.metrics.map((metric) => (<span key={metric} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 sm:px-2 sm:py-1 sm:text-xs">{metric}</span>))}</div><button type="button" className="group mt-4 flex items-center gap-1 text-sm font-medium text-emerald-600 sm:mt-6 sm:text-base">Explorar API<ChevronRight size={14} className="transition group-hover:translate-x-1" /></button></div></motion.div>))}</div></div></div>
          </section>

          <section className="relative w-full" id="soluciones">
            <div className="relative flex min-h-[40vh] w-full items-center justify-center overflow-hidden sm:min-h-[50vh]">
              <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-scroll md:bg-fixed" style={{ backgroundImage: `url(${imagen3})`, filter: 'blur(2px)' }} />
              <div className="absolute inset-0 bg-gradient-to-l from-black/80 to-black/60" />
              <div className="relative z-10 px-4 py-16 text-center sm:py-20 md:py-32"><motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span className="text-xs font-bold uppercase tracking-wider text-emerald-400 sm:text-sm">Área 2</span><h2 className="mt-3 text-3xl font-black text-white sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">SaaS Vertical Agro</h2><p className="mx-auto mt-3 max-w-2xl px-4 text-base text-slate-200 sm:mt-4 sm:text-lg md:text-xl">Plataforma para productores de Corrientes: monitoreo satelital, alertas tempranas y asesor IA agronómico</p></motion.div></div>
            </div>
            <div className="relative z-10 bg-white py-12 sm:py-16 md:py-20"><div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3"><motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white sm:rounded-3xl sm:p-8 lg:col-span-2"><div className="flex flex-col items-start justify-between gap-4 sm:flex-row"><div><div className="mb-3 flex items-center gap-2 sm:mb-4"><Eye className="text-emerald-400" size={20} /><span className="text-sm font-bold text-emerald-400">Módulo 1</span></div><h3 className="text-2xl font-bold sm:text-3xl">Monitoreo de Campos</h3><p className="mt-2 text-sm text-slate-300 sm:text-base">Seguimiento satelital de todos tus lotes en tiempo real</p></div><img src={image1} alt="Dashboard preview" className="h-24 w-24 rounded-xl object-cover shadow-xl sm:h-32 sm:w-32" loading="lazy" decoding="async" /></div><div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4 sm:gap-4">{['NDVI', 'EVI', 'Biomasa', 'Estrés Hídrico'].map((item) => (<div key={item} className="rounded-lg bg-white/10 p-2 backdrop-blur-sm sm:rounded-xl sm:p-3"><p className="text-xs font-medium sm:text-sm">{item}</p><p className="text-xl font-bold sm:text-2xl">0.78</p></div>))}</div></motion.div><motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white sm:rounded-3xl sm:p-8"><Bell className="mb-3 sm:mb-4" size={28} /><h3 className="text-xl font-bold sm:text-2xl">Centro de Alertas</h3><p className="mt-2 text-sm text-white/80 sm:text-base">Alertas tempranas personalizadas</p><div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">{['Alerta: Helada esperada', 'Riesgo de anegamiento', 'Sequía crítica'].map((alert, index) => (<div key={`${alert}-${index}`} className="rounded-lg bg-white/20 p-2 backdrop-blur-sm sm:p-3"><p className="text-sm font-medium sm:text-base">{alert}</p><p className="text-xs text-white/70">Hace 2 minutos</p></div>))}</div></motion.div></div><div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 sm:gap-8 md:grid-cols-2"><motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg sm:rounded-2xl sm:p-6"><div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3"><Bot className="text-emerald-600" size={24} /><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600 sm:px-3">Módulo 3</span></div><h3 className="text-xl font-bold text-slate-800 sm:text-2xl">Asesor IA Agronómico</h3><p className="mt-2 text-sm text-slate-500 sm:text-base">Especializado en yerba mate, té, tabaco y arroz</p><div className="mt-4 rounded-lg bg-slate-50 p-3 sm:mt-6 sm:rounded-xl sm:p-4"><p className="text-sm italic text-slate-600 sm:text-base">&quot;Mi yerba está con estrés hídrico, ¿qué hago?&quot;</p><div className="mt-2 flex items-center gap-2 text-emerald-600 sm:mt-3"><Sparkles size={14} /><span className="text-xs font-medium sm:text-sm">Aumentar riego y aplicar fungicida preventivo</span></div></div></motion.div><motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-xl sm:rounded-2xl sm:p-6"><div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3"><Sprout size={24} /><span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold sm:px-3">Módulo 5</span></div><h3 className="text-xl font-bold sm:text-2xl">Recomendador de Cultivos</h3><p className="mt-2 text-sm text-white/80 sm:text-base">Optimiza rentabilidad para cultivos de Corrientes</p><div className="mt-4 flex flex-wrap gap-2 sm:mt-6">{['Yerba Mate', 'Té', 'Tabaco', 'Arroz'].map((item) => (<span key={item} className="rounded-full bg-white/20 px-2 py-1 text-xs sm:px-3 sm:text-sm">{item}</span>))}</div></motion.div></div></div></div>
          </section>

          <section className="bg-slate-50 py-16 sm:py-20 md:py-24" id="commodities"><div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><div className="mb-12 text-center sm:mb-16"><motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 sm:px-4 sm:py-2 sm:text-sm">Área 3</span><h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl md:text-5xl">Commodities Intelligence</h2><p className="mx-auto mt-3 max-w-2xl px-4 text-base text-slate-500 sm:mt-4 sm:text-lg md:text-xl">Proyecciones de cosecha de Corrientes y alertas de precio en mercados internacionales</p></motion.div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">{commoditiesCards.map((item, index) => (<motion.div key={item.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -5 }} className="rounded-xl border border-slate-100 bg-white p-4 shadow-lg sm:rounded-2xl sm:p-6"><item.icon size={24} className={item.iconClassName} /><p className="mt-3 text-xs text-slate-500 sm:mt-4 sm:text-sm">{item.title}</p><p className="text-2xl font-bold text-slate-800 sm:text-3xl">{item.value}</p><span className="text-xs font-medium text-emerald-600 sm:text-sm">{item.change}</span></motion.div>))}</div></div></section>

          <section className="relative w-full" id="insurtech">
            <div className="relative flex min-h-[40vh] w-full items-center justify-center overflow-hidden sm:min-h-[50vh]">
              <div className="absolute inset-0 overflow-hidden"><AnimatePresence mode="wait"><motion.div key={insuranceCarouselIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-scroll md:bg-fixed" style={{ backgroundImage: `url(${insuranceImages[insuranceCarouselIndex]})` }} /></AnimatePresence></div>
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 to-slate-900/70" />
              <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-8 sm:gap-3">{[0, 1, 2].map((index) => (<button key={index} type="button" aria-label={`Ir a slide ${index + 1}`} onClick={() => setInsuranceCarouselIndex(index)} className={`h-2 rounded-full transition-all sm:h-3 ${insuranceCarouselIndex === index ? 'w-8 bg-emerald-500 sm:w-10' : 'w-2 bg-white/40 hover:bg-white/60 sm:w-3'}`} />))}</div>
              <button type="button" aria-label="Slide anterior" onClick={() => setInsuranceCarouselIndex((current) => (current === 0 ? 2 : current - 1))} className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all hover:bg-white/40 sm:left-6 sm:p-3"><ChevronRight size={20} className="rotate-180" /></button>
              <button type="button" aria-label="Siguiente slide" onClick={() => setInsuranceCarouselIndex((current) => (current === 2 ? 0 : current + 1))} className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-all hover:bg-white/40 sm:right-6 sm:p-3"><ChevronRight size={20} /></button>
              <div className="relative z-10 px-4 py-16 text-center sm:py-20 md:py-32"><motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span className="text-xs font-bold uppercase tracking-wider text-blue-400 sm:text-sm">Área 6</span><h2 className="mt-3 text-3xl font-black text-white sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">Insurtech</h2><p className="mx-auto mt-3 max-w-2xl px-4 text-base text-slate-200 sm:mt-4 sm:text-lg md:text-xl">Seguros diseñados para heladas, anegamientos y sequías de Corrientes</p></motion.div></div>
            </div>
            <div className="relative z-10 bg-white py-12 sm:py-16 md:py-20"><div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">{insurtechCards.map((item, index) => (<motion.div key={item.title} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} whileHover={{ y: -10 }} className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:rounded-2xl sm:p-6"><item.icon size={28} className="mb-3 text-blue-600 sm:mb-4" /><h3 className="text-lg font-bold text-slate-800 sm:text-xl">{item.title}</h3><p className="mt-2 text-xs text-slate-500 sm:text-sm">{item.desc}</p><div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">{item.metrics.map((metric) => (<span key={metric} className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 sm:px-2 sm:py-1 sm:text-xs">{metric}</span>))}</div></motion.div>))}</div><motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 p-6 text-white sm:mt-12 sm:rounded-2xl sm:p-8"><div className="flex flex-col items-center justify-between gap-4 md:flex-row sm:gap-6"><div><h3 className="text-xl font-bold sm:text-2xl">Reducción de Incertidumbre</h3><p className="mt-1 text-sm text-white/80 sm:text-base">Para productores de Corrientes y el sector agropecuario regional</p></div><button type="button" className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:shadow-xl sm:px-6 sm:py-3 sm:text-base">Agendar Demo<ArrowRight size={16} /></button></div></motion.div></div></div>
          </section>

          <section className="bg-slate-50 py-16 sm:py-20 md:py-24" id="roadmap"><div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><div className="mb-12 text-center sm:mb-16"><motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 sm:px-4 sm:py-2 sm:text-sm">Hoja de Ruta</span><h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl md:text-5xl">Orden de Ejecución</h2></motion.div></div><div className="relative"><div className="absolute left-4 h-full w-0.5 bg-gradient-to-b from-emerald-500 via-emerald-400 to-transparent sm:left-8 md:left-1/2 md:-translate-x-1/2" /><div className="space-y-8 sm:space-y-12">{roadmap.map((item, index) => (<motion.div key={item.fase} initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className={`flex flex-col items-start gap-4 pl-10 sm:gap-8 sm:pl-14 md:pl-0 ${index % 2 === 0 ? 'md:flex-row md:items-center' : 'md:flex-row-reverse md:items-center'}`}><div className={`flex-1 ${index % 2 === 0 ? 'md:pr-8 md:text-right' : 'md:pl-8'}`}><div className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${item.badgeBg} ${item.badgeText}`}>{item.fase}</div><h3 className="text-lg font-bold text-slate-800 sm:text-xl md:text-2xl">{item.title}</h3><p className="mt-1 text-sm text-slate-500 sm:text-base">{item.desc}</p></div><div className="relative z-10 flex-shrink-0"><div className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg sm:h-12 sm:w-12 ${item.bgColor}`}><item.icon size={18} className="text-white" /></div></div><div className="flex-1"><span className="font-mono text-xs text-slate-400 sm:text-sm">{item.date}</span></div></motion.div>))}</div></div></div></section>

          <footer className="bg-slate-900 py-12 text-white sm:py-16"><div className="mx-auto w-full max-w-7xl px-4 sm:px-6"><div className="flex flex-col items-center justify-between gap-6 md:flex-row sm:gap-8"><div className="flex items-center gap-3"><img src={logo} alt="Agronautas" className="h-10 w-auto sm:h-12" /><span className="text-xl font-bold sm:text-2xl">AGRONAUTAS</span></div><p className="text-center text-sm text-slate-400 sm:text-base">Inteligencia Productiva para Corrientes, Argentina</p><div className="flex gap-3 sm:gap-4"><button type="button" className="rounded-full bg-slate-800 p-2 transition hover:bg-emerald-600"><Brain size={18} /></button><button type="button" className="rounded-full bg-slate-800 p-2 transition hover:bg-emerald-600"><Globe size={18} /></button></div></div><div className="mt-8 border-t border-slate-800 pt-6 text-center text-xs text-slate-500 sm:mt-12 sm:pt-8 sm:text-sm">© 2026 Agronautas - Especialistas en Corrientes</div></div></footer>
        </div>
      ) : null}
    </>
  )
}
