'use client'

import { createElement, useState } from 'react'
import { MapPin, Sprout, Scale, Truck, CalendarDays, ShieldCheck } from 'lucide-react'
import type { AgronautasMarketplaceListing } from '@/lib/agronautas/schemas'
import { marketName, marketDate } from './catalog'

const React = { createElement }
const money = (value: number) =>
  value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function MarketplaceProductDetail({ listing }: { listing?: AgronautasMarketplaceListing }) {
  const demo = !listing
  const title = listing?.title ?? '70 vaquillonas para madre'
  const facts = demo
    ? [
        ['Cantidad', '70 cabezas'],
        ['Peso promedio', '280 kg'],
        ['Edad', '14 meses'],
        ['Raza', 'Hereford'],
      ]
    : [
        ['Producto', listing.itemName],
        [
          'Cantidad',
          listing.quantity === null
            ? 'A consultar'
            : listing.quantity.toLocaleString('es-AR') + ' ' + (listing.unit ?? ''),
        ],
        [
          'Disponibilidad',
          listing.availabilityStatus === 'available'
            ? 'Disponible'
            : listing.availabilityStatus === 'expired'
              ? 'Publicación vencida'
              : 'No disponible',
        ],
        ['Calidad', listing.qualityStatus === 'verified' ? 'Verificada' : 'Sin verificar'],
      ]
  return (
    <article
      id="marketplace-product"
      className="mkt-detail mkt-product-detail"
      aria-label={'Detalle de ' + title}
    >
      <div className="mkt-detail-heading">
        <div className="mkt-product-topline">
          <span className="mkt-eyebrow">
            {demo ? 'HACIENDA · EJEMPLO FICTICIO' : 'PUBLICACIÓN'}
          </span>
          <span className="mkt-badge">{demo ? 'Vista de ejemplo' : 'Ficha de producto'}</span>
        </div>
        <h2>{title}</h2>
        <p>{demo ? 'Hereford · recría a campo' : listing.itemName}</p>
      </div>
      {demo ? (
        <div
          className="mkt-product-cover"
          role="img"
          aria-label="Foto del lote de 70 vaquillonas en el campo"
        >
          <span className="mkt-photo-label">70 vaquillonas · Foto del lote</span>
          <div>
            <MapPin size={18} aria-hidden="true" />
            <span>
              Tapalqué, Buenos Aires <small>Ubicación ficticia</small>
            </span>
          </div>
        </div>
      ) : (
        <div className="mkt-product-image">
          <Sprout size={76} strokeWidth={1} aria-hidden="true" />
          <span>Esta publicación todavía no tiene fotos</span>
          <span>
            <MapPin size={14} aria-hidden="true" /> {marketName(listing.marketId)}
          </span>
        </div>
      )}
      <dl className="mkt-product-specs">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {listing && (
        <div className="mkt-product-section">
          <span className="mkt-eyebrow">PRECIO</span>
          <h3>A consultar</h3>
          <p>
            Solicitá una cotización por la cantidad que necesitás. El vendedor no informó un precio
            en esta publicación.
          </p>
        </div>
      )}
      <div className="mkt-product-section">
        <h3>Descripción del producto</h3>
        <p>
          {demo
            ? 'Lote parejo de 70 vaquillonas Hereford, recriadas a campo sobre praderas y verdeos. Una propuesta de ejemplo para visualizar la información que acompañaría una publicación ganadera.'
            : 'La publicación identifica el producto como ' +
              listing.itemName +
              '. El vendedor todavía no agregó una descripción ampliada. Consultá las características y condiciones antes de avanzar.'}
        </p>
        {demo && (
          <div className="mkt-product-tags">
            <span>Recría a campo</span>
            <span>Praderas y verdeos</span>
            <span>Rodeo general</span>
          </div>
        )}
      </div>
      <div className="mkt-product-section">
        <h3>Condiciones de la publicación</h3>
        <div className="mkt-condition-grid">
          <div>
            <Truck size={21} aria-hidden="true" />
            <strong>Entrega y retiro</strong>
            <p>
              {demo
                ? 'Retiro en origen. Flete a coordinar con el vendedor.'
                : 'Lugar, plazo y costo de entrega a consultar.'}
            </p>
          </div>
          <div>
            <Scale size={21} aria-hidden="true" />
            <strong>{demo ? 'Pesaje del lote' : 'Cantidad y unidad'}</strong>
            <p>
              {demo
                ? 'Peso orientativo. Lugar de pesada y desbaste a convenir.'
                : 'Confirmá la cantidad disponible y la unidad de venta.'}
            </p>
          </div>
          <div>
            <CalendarDays size={21} aria-hidden="true" />
            <strong>Forma de pago</strong>
            <p>
              {demo
                ? 'Contado o plazo a convenir. Condiciones sujetas a confirmación.'
                : 'Plazos y medios de pago a acordar con el vendedor.'}
            </p>
          </div>
          <div>
            <ShieldCheck size={21} aria-hidden="true" />
            <strong>{demo ? 'Sanidad y documentación' : 'Documentación'}</strong>
            <p>
              {demo
                ? 'Solicitá antecedentes sanitarios y documentación de traslado.'
                : 'Pedí la documentación y especificaciones del producto.'}
            </p>
          </div>
        </div>
      </div>
      <div className="mkt-detail-footer">
        <span>
          {demo
            ? 'Todos los datos de esta ficha son ficticios.'
            : 'Actualizado el ' + marketDate(listing.updatedAt)}
        </span>
        <span>{demo ? 'Referencia DEMO-070' : 'Precio y entrega: a consultar'}</span>
      </div>
      {!demo && (
        <a className="mkt-button mkt-mobile-consult" href="#marketplace-consult">
          Consultar por este producto
        </a>
      )}
    </article>
  )
}

export function MarketplacePricePreview() {
  const [quantity, setQuantity] = useState('70')
  const [payment, setPayment] = useState('Contado')
  const [delivery, setDelivery] = useState('Retiro en origen')
  const [simulated, setSimulated] = useState(false)
  const count = Number(quantity)
  const valid = quantity.trim() !== '' && Number.isInteger(count) && count >= 1 && count <= 70
  return (
    <section className="mkt-panel mkt-price-preview" aria-label="Simulador de precio ficticio">
      <span className="mkt-eyebrow">PRECIO DE EJEMPLO</span>
      <h2>Tu próximo lote</h2>
      <div className="mkt-price">
        <strong>{money(1480000)}</strong>
        <span>ARS por cabeza · precio ficticio</span>
      </div>
      <p className="mkt-price-note">
        Sin una publicación real. Este ejemplo no se puede comprar ni reservar.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (valid) setSimulated(true)
        }}
        onChange={() => setSimulated(false)}
      >
        <label>
          Cantidad de animales
          <input
            type="number"
            min="1"
            max="70"
            step="1"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <small>De 1 a 70 cabezas · simulación</small>
        </label>
        <fieldset>
          <legend>Plazo de pago</legend>
          <div className="mkt-choice-row">
            {['Contado', '30 días', 'A convenir'].map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={payment === value}
                onClick={() => {
                  setPayment(value)
                  setSimulated(false)
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Entrega
          <select value={delivery} onChange={(event) => setDelivery(event.target.value)}>
            <option>Retiro en origen</option>
            <option>Flete a coordinar</option>
          </select>
        </label>
        <div className="mkt-estimate">
          <span>Subtotal estimado</span>
          <strong>{valid ? money(count * 1480000) : '—'}</strong>
          <small>Sin flete, comisiones ni impuestos. No es una cotización.</small>
        </div>
        <button className="mkt-button" type="submit">
          Simular consulta
        </button>
        {simulated && (
          <p className="mkt-inline-success" role="status">
            Simulación lista: {count} cabezas, {payment.toLowerCase()}, {delivery.toLowerCase()}. No
            se envió ninguna consulta.
          </p>
        )}
      </form>
    </section>
  )
}
