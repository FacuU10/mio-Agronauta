# Agronautas Web MVP Design

## Goal
Entregar una superficie web de operación rápida para alta de lote, lectura de riesgo y alertas, sin mover lógica agronómica al cliente.

## Experience Rules
- Hero corto con estado operativo y foco en confianza/frescura.
- Intake siempre visible en desktop, primero en mobile.
- Dashboard con 4 métricas rápidas: lote, score, confianza, alertas.
- `stale` se comunica como warning visible, nunca como dato fresco.
- Evidencia y drivers se muestran como bloques simples, legibles y auditables.

## Visual System
- Base `shadcn` style: cards, badges, buttons, inputs y selects con radios amplios.
- Tailwind 4 para layout, spacing y tokens locales en `globals.css`.
- Paleta: verde arrozal (`--primary`), neutros suaves y warning ámbar para frescura degradada.

## Content Hierarchy
1. Estado general del slice.
2. Alta guiada.
3. Métricas del lote seleccionado.
4. Warning stale.
5. Drivers + evidencia.
6. Alertas priorizadas.

## Data Boundaries
- React Query: fetch, cache y revalidación.
- Zustand: solo selección de lote, último alta y error visible.
- Contratos compartidos: validan intake, risk y alerts.
- Mock service permitido para desarrollo/tests, pero la UI apunta a APIs estables por defecto.
