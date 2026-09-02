# Responsive and Visual Consistency Specification

## Purpose

Refine the existing evidence-first visual language without replacing the design direction or introducing a broad redesign.

## Requirements

### Requirement: Shared visual vocabulary is consistent

Agronautas and Iberá-Alerta MUST use consistent state labels, capitalization, timestamps, source cards, empty copy, focus treatment, and semantic tokens. Values MUST use locale-aware date/number formatting and tabular numerals where comparison matters.

#### Scenario: Equivalent state looks equivalent
- GIVEN two routes show the same normalized state
- WHEN inspected at 1440x900 and 390x844
- THEN labels, provenance, freshness, empty/error language, and focus behavior are equivalent without changing meaning

#### Scenario: Token or copy drift is detected
- GIVEN equivalent states use conflicting labels, hardcoded formats, or unapproved color/token patterns
- WHEN the visual/accessibility matrix runs at both viewports
- THEN the inconsistency is recorded as a failure and no new semantic variant is introduced

### Requirement: Mobile layouts preserve operation

At 390x844, audited routes MUST avoid horizontal overflow, keep primary status and actions reachable, support touch and keyboard alternatives, and prevent sticky elements from covering focused content. At 1440x900, content MUST use the available layout without losing hierarchy.

#### Scenario: Operator uses detail on mobile
- GIVEN a municipality or field detail has long content, tables, or sticky summary
- WHEN rendered at 390x844 and then 1440x900
- THEN the operator can reach status, navigation, tables, forms, and recovery actions without page-level horizontal overflow

#### Scenario: Narrow content breaks layout
- GIVEN long source names, user text, or a wide table exceeds its container
- WHEN the same matrix runs at both viewports
- THEN content wraps, truncates, or scrolls within its component and never hides the focused control

### Requirement: Visual polish does not change evidence meaning

Decorative motion, contrast, badges, and hierarchy MUST reinforce—not replace—textual state and provenance. Reduced motion and dark/light native control behavior MUST remain usable.

#### Scenario: State remains understandable without decoration
- GIVEN animation is disabled or a user relies on assistive technology
- WHEN the route renders at either viewport
- THEN state, source, timestamp, and next action remain understandable from semantic content

#### Scenario: Decoration implies unsupported certainty
- GIVEN a visual treatment suggests live, forecast, success, or risk certainty not present in normalized evidence
- WHEN reviewed at 1440x900 and 390x844
- THEN the treatment is rejected and the explicit evidence state remains authoritative
