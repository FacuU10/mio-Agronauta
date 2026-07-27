import test from 'node:test'
import assert from 'node:assert/strict'
import { PnaAdapter } from './pna-adapter.js'

test('PnaAdapter parses official-style HTML table rows for monitored Corrientes stations', () => {
  const html = `
    <table>
      <tr><th>Puerto</th><th>Altura</th><th>Hora</th><th>Fecha</th><th>Tendencia</th></tr>
      <tr><td>CORRIENTES</td><td>3,42</td><td>08:00</td><td>12/07/2026</td><td>CRECIENTE</td></tr>
      <tr><td>PASO DE LA PATRIA</td><td>3.18</td><td>09:30</td><td>12-07-2026</td><td>ESTACIONARIO</td></tr>
      <tr><td>ROSARIO</td><td>2,10</td><td>09:00</td><td>12/07/2026</td><td>BAJANTE</td></tr>
    </table>
  `

  const records = new PnaAdapter().parse(html, new Date('2026-07-12T15:00:00.000Z'))

  assert.deepEqual(records.map((record) => [record.stationId, record.value, record.tendency]), [
    ['corrientes', 3.42, 'creciente'],
    ['paso_de_la_patria', 3.18, 'estacionario'],
  ])
  assert.equal(records[0]?.sourceUrl, 'https://contenidosweb.prefecturanaval.gob.ar/alturas/')
  assert.equal(records[0]?.observedAt.toISOString(), '2026-07-12T08:00:00.000Z')
  assert.equal(records[1]?.observedAt.toISOString(), '2026-07-12T09:30:00.000Z')
})

test('PnaAdapter keeps existing data-station rows and ignores malformed official table rows', () => {
  const html = `
    <tr data-station="ituzaingo" data-observed-at="2026-06-23T10:30:00.000Z"><td>Altura: 3,21</td><td>Tendencia: creciente</td></tr>
    <table><tr><td>GOYA</td><td>S/D</td><td>08:00</td><td>12/07/2026</td><td>BAJANTE</td></tr></table>
  `

  const records = new PnaAdapter().parse(html, new Date('2026-07-12T15:00:00.000Z'))

  assert.deepEqual(records.map((record) => [record.stationId, record.value, record.tendency]), [
    ['ituzaingo', 3.21, 'creciente'],
  ])
})

test('PnaAdapter applies explicit row bounds to official table parsing', () => {
  const extraRows = Array.from({ length: 280 }, (_, index) => `<tr><td>CORRIENTES</td><td>${index + 1},00</td><td>08:00</td><td>12/07/2026</td><td>CRECIENTE</td></tr>`).join('')
  const html = `<table><tr><th>Puerto</th><th>Altura</th></tr>${extraRows}</table>`

  const records = new PnaAdapter().parse(html, new Date('2026-07-12T15:00:00.000Z'))

  assert.equal(records.length, 255)
  assert.equal(records[0]?.value, 1)
  assert.equal(records.at(-1)?.value, 255)
})

test('PnaAdapter parses an official monitored station after the first 50 table rows', () => {
  const fillerRows = Array.from({ length: 55 }, (_, index) => `<tr><td>ESTACION ${index + 1}</td><td>S/D</td></tr>`).join('')
  const html = `<table><tr><th>Puerto</th><th>Altura</th></tr>${fillerRows}<tr><td>MONTE CASEROS</td><td>4,75</td><td>08:00</td><td>12/07/2026</td></tr></table>`

  const records = new PnaAdapter().parse(html, new Date('2026-07-12T15:00:00.000Z'))

  assert.deepEqual(records.map((record) => [record.stationId, record.value]), [['monte_caseros', 4.75]])
})

test('PnaAdapter applies explicit cell bounds to official table parsing', () => {
  const cells = ['CORRIENTES', ...Array.from({ length: 11 }, () => 'sin dato'), '3,42']
  const html = `<table><tr>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr></table>`

  const records = new PnaAdapter().parse(html, new Date('2026-07-12T15:00:00.000Z'))

  assert.deepEqual(records, [])
})
