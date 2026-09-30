'use client'

import { createElement, useEffect, useState, type ReactNode } from 'react'

const React = { createElement }

export function ScrollHeader({ children, product }: { children: ReactNode; product: string }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 50)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <header
      data-product={product}
      data-scrolled={scrolled}
      className={`group/navbar fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 motion-reduce:transition-none ${scrolled ? 'border-stone-200/70 bg-white/95 shadow-sm backdrop-blur-md' : 'border-transparent bg-transparent'}`}
    >
      {children}
    </header>
  )
}
