# Delta for Responsive and Visual Consistency

## ADDED Requirements

### Requirement: Shared product shell preserves responsive information architecture

The shared shell MUST expose the same product sections, active context, evidence/status vocabulary, and safe recovery actions on desktop and mobile. Collapsed navigation MAY change presentation, but MUST NOT remove an in-scope destination or obscure the current route.

#### Scenario: Desktop and mobile expose the same IA
- GIVEN an authorized user opens Agronautas, Marketplace, or Iberá-Alerta
- WHEN the shell is rendered at 1440x900 and 390x844
- THEN each in-scope destination is reachable, the current section is identifiable, and no page-level horizontal overflow occurs

#### Scenario: Mobile shell is constrained
- GIVEN navigation is collapsed at the narrow viewport
- WHEN the user opens, traverses, and closes it with keyboard or touch
- THEN focus is managed, the main content remains reachable, and the shell does not cover the active control

## MODIFIED Requirements

### Requirement: Mobile layouts preserve operation

At 390x844, audited routes MUST avoid horizontal overflow, keep primary status, breadcrumbs, navigation, forms, tables, and recovery actions reachable, support touch and keyboard alternatives, and prevent sticky elements from covering focused content. At 1440x900, content MUST use the available layout without losing hierarchy.
(Previously: mobile layouts protected status, actions, tables, forms, and recovery actions without overflow.)

#### Scenario: Operator uses detail on mobile
- GIVEN a municipality, field, RFQ, or management detail has long content or sticky summary
- WHEN rendered at 390x844 and then 1440x900
- THEN the operator can reach identity, state, navigation, content, forms, and recovery without page-level overflow

#### Scenario: Narrow content breaks layout
- GIVEN long source names, user text, or a wide table exceeds its container
- WHEN the responsive matrix runs at both viewports
- THEN content wraps, truncates, or scrolls within its component and never hides focused content
