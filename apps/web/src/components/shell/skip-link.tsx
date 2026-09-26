'use client'

export function SkipLink() {
  return (
    <a
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-amber-200 focus:px-4 focus:py-3 focus:font-semibold focus:text-stone-950"
      href="#main-content"
      onClick={(event) => {
        const main = document.getElementById('main-content')
        if (!main) return

        event.preventDefault()
        main.focus()
        main.scrollIntoView({ block: 'start' })
        window.history.pushState(null, '', '#main-content')
      }}
    >
      Saltar al contenido principal
    </a>
  )
}
