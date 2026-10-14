# Design system

## Direction

An editorial decision room. Limestone surfaces, olive ink, restrained borders, and a serif introduction contrast with the original illustrated advisors. Keep the table as the defining visual, rather than turning the website into a generic chatbot.

## Tokens

`site/styles.css` defines semantic light/dark color roles, a 4-pixel spacing family, 4/8/16-pixel radius levels, 200ms interaction timing, and a restrained type scale. Instrument Serif is the display font. Montserrat is the self-hosted body and report font already included upstream.

Do not add gradients, neon effects, emoji decoration, fabricated testimonials, or provider logos that imply an affiliation.

## Accessibility

Native buttons, selects, labels, dialogs, and details. All relevant form fields have visible labels. Focus indicators remain visible. The page includes a skip link and a polite status region for live progress and optional replay. Named advisors remain identifiable independently of color.

Light/dark modes share semantic tokens, not simple color inversion. Reduced-motion preferences disable transitions and smooth scrolling. WCAG contrast and modal focus are checked with browser tests.

## Content

Use direct sentence-case copy. The primary path is an authenticated live discussion, with explicit disconnected, authorization, disabled, running and failure states. Public replay labels must remain clear and cannot substitute for failed execution.

Advisor simulations and lack of endorsement must be stated. Scores and conclusions are model judgments, not calibrated probabilities or verified company facts. Keep private sessions/evidence out of public catalogs and static assets. See [wireframe](WIREFRAME.md) and [handover](../HANDOVER.md) for state requirements and remaining qualification.
