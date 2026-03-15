# Structural Component Registry v1.0

Ingested from: `article-components.html` (one-time extraction)
Ingestion date: 2026-03-11

**This registry stores STRUCTURE ONLY — no brand colors, fonts, or visual identity.**

All visual styling (colors, fonts, shadows, radii, spacing tokens) is applied at runtime by the **Runtime Visual Adapter** based on the active project's design system.

---

## How to Use This Registry

1. The **Article Architect** references these blueprints when mapping sections to components
2. The **Draft Writer** uses the structural patterns to generate HTML — then applies the active project's design tokens
3. Components are identified by `blueprint_id` (e.g., `bp-stats-cards`)
4. Each blueprint defines WHAT elements exist and HOW they relate — not how they look
5. The registry is the structural source of truth; the active project provides the visual layer

---

## ARTICLE SHELL BLUEPRINT

```
blueprint_id: bp-article-shell
blueprint_name: Article Page Shell
category: shell
article_role: page-wrapper

structural_pattern:
  - page wrapper (full viewport)
  - hero section (full-width, above content grid)
  - content container (max-width constrained, centered)
  - two-column article layout:
    - main content column (~70% width)
    - sticky sidebar column (~30% width)
  - main content contains: inline TOC (mobile) + article sections stacked vertically
  - sidebar contains: sticky TOC panel
  - section edit overlay (single instance, before closing body)
  - edit prompt generation script (before closing body)

slot_definitions:
  - PAGE_TITLE: document title
  - META_DESCRIPTION: meta description tag
  - META_KEYWORDS: meta keywords tag
  - FONT_CDN: Google Fonts or other CDN link
  - CSS_TOKENS: :root custom properties block
  - ARTICLE_HERO: full-width hero section (above grid)
  - ARTICLE_TOC_INLINE: mobile-only collapsible TOC
  - ARTICLE_CONTENT: sections 2+ stacked in main column
  - ARTICLE_TOC_SIDEBAR: sticky sidebar TOC inner HTML
  - SECTION_EDIT_OVERLAY: edit modal overlay HTML
  - EDIT_PROMPT_SCRIPT: JavaScript for edit prompt generation

layout_relationships:
  - hero is full-width, sits above the two-column grid
  - main column and sidebar are siblings in a grid/flex container
  - sidebar is sticky (position: sticky) on desktop
  - on mobile (< 768px): sidebar hides, inline TOC shows
  - sections stack vertically with consistent spacing rhythm

responsive_behavior:
  - desktop: two-column (main + sticky sidebar)
  - tablet (< 1024px): two-column with narrower sidebar
  - mobile (< 768px): single column, sidebar hidden, inline TOC visible
```

---

## HERO BLUEPRINT

```
blueprint_id: bp-hero
blueprint_name: Article Hero
category: hero
article_role: Sets visual tone, introduces topic, displays metadata

structural_pattern:
  - outer container (full-width, no side padding)
  - inner container (rounded, overflow hidden, min-height constrained)
  - background layer: full-cover image
  - overlay layer: gradient (dark bottom to transparent top)
  - content layer (positioned above overlay):
    - breadcrumb navigation (optional)
    - category/tag badge (pill shape)
    - h1 title (large, prominent)
    - metadata row: author, date, reading time

slot_definitions:
  - HERO_IMAGE: background image (full cover, object-fit: cover)
  - BREADCRUMB: navigation path (e.g., Home > Blog > Category)
  - CATEGORY_TAG: topic category label
  - TITLE: h1 article title
  - META_AUTHOR: author name with avatar/icon
  - META_DATE: publication date
  - META_READING_TIME: estimated reading time

hierarchy:
  hero-outer > hero-inner > [bg-image + overlay + content]
  content > [breadcrumb? + tag + h1 + meta-row]

required_elements: [HERO_IMAGE, TITLE, at least 1 meta item]
optional_elements: [BREADCRUMB, CATEGORY_TAG, META_AUTHOR, META_DATE, META_READING_TIME]

responsive_behavior:
  - desktop: min-height ~420px, large title, spacious padding
  - tablet: reduced min-height, smaller title
  - mobile: compact min-height ~280px, small title, tight padding
```

---

## ARTICLE PROSE BLUEPRINT

```
blueprint_id: bp-article-prose
blueprint_name: Article Prose Typography
category: typography
article_role: Base typography rules for all article text content

structural_pattern:
  - wrapper class applied to article body sections
  - defines heading hierarchy (h2, h3)
  - defines paragraph, list, link, and emphasis styles
  - h2: section-level heading with bottom border separator
  - h3: subsection heading
  - p: body text with comfortable line height
  - ul/ol: indented lists
  - strong: emphasis
  - a: inline links

hierarchy:
  prose-wrapper > [h2 + p + h3 + p + ul/ol + blockquote + ...]

responsive_behavior:
  - font sizes scale down on mobile
  - spacing reduces proportionally
```

---

## COMPONENT BLUEPRINTS

### BP-01: Stats Cards Row

```
blueprint_id: bp-stats-cards
blueprint_name: Stats Cards Row
category: data-visualization
article_role: Display key metrics/statistics in a scannable grid

structural_pattern:
  - section heading (h2) with optional intro paragraph
  - grid container (4 columns desktop, 2 tablet, 1 mobile)
  - each card:
    - card container (bordered, padded, centered text)
    - stat number (large, prominent, heading font)
    - stat label (small, muted description)

slot_definitions:
  - SECTION_HEADING: h2 section title
  - INTRO_TEXT: optional paragraph before the grid
  - CARDS[]: array of {number, label} pairs (typically 4)

hierarchy:
  section > [h2 + p? + grid > card*4]
  card > [stat-number + stat-label]

required_elements: [at least 2 cards with number + label]
optional_elements: [SECTION_HEADING, INTRO_TEXT]

responsive_behavior:
  - desktop: 4-column grid
  - tablet: 2-column grid
  - mobile: 1-column stack

image_compatibility: none (data-focused component)
sidebar_compatibility: works in main column
toc_compatibility: heading appears in TOC if present
```

### BP-02: Comparison Table

```
blueprint_id: bp-comparison-table
blueprint_name: Comparison Table
category: data-visualization
article_role: Present structured comparison data in tabular format

structural_pattern:
  - section heading (h2) with optional context paragraph
  - full-width table:
    - thead with column headers (uppercase, bordered bottom)
    - tbody with data rows (bordered, hover highlight)
    - optional highlight cells for emphasis

slot_definitions:
  - SECTION_HEADING: h2 section title
  - CONTEXT_TEXT: optional paragraph explaining the comparison
  - TABLE_HEADERS[]: column header labels
  - TABLE_ROWS[][]: rows of cell values
  - HIGHLIGHT_CELLS: which cells deserve emphasis

hierarchy:
  section > [h2 + p? + table > thead + tbody]
  thead > tr > th*N
  tbody > tr*N > td*N

required_elements: [TABLE_HEADERS, at least 2 TABLE_ROWS]
optional_elements: [SECTION_HEADING, CONTEXT_TEXT, HIGHLIGHT_CELLS]

responsive_behavior:
  - desktop: full table visible
  - mobile: horizontal scroll or stacked layout

image_compatibility: none
sidebar_compatibility: works in main column (may need full width)
```

### BP-03: Step-by-Step Process

```
blueprint_id: bp-step-process
blueprint_name: Step-by-Step Process
category: sequential-content
article_role: Guide reader through an ordered process or sequence

structural_pattern:
  - section heading (h2) with optional intro
  - ordered list with vertical connector line:
    - each step:
      - step number (circular badge, positioned on the connector line)
      - step content container:
        - step title (h4, bold)
        - step description (paragraph)

slot_definitions:
  - SECTION_HEADING: h2 section title
  - INTRO_TEXT: optional paragraph
  - STEPS[]: array of {title, description} (typically 3-6)

hierarchy:
  section > [h2 + p? + step-list]
  step-list > [connector-line + step*N]
  step > [step-number + step-content > (h4 + p)]

required_elements: [at least 3 STEPS with title + description]
optional_elements: [SECTION_HEADING, INTRO_TEXT]

responsive_behavior:
  - consistent across breakpoints (single-column by nature)
  - connector line and badges scale down slightly on mobile

image_compatibility: none (process-focused)
sidebar_compatibility: works in main column
```

### BP-04: Pull Quote

```
blueprint_id: bp-pull-quote
blueprint_name: Pull Quote
category: editorial
article_role: Highlight expert insight, key statement, or memorable quote

structural_pattern:
  - blockquote container:
    - left accent border
    - decorative opening quote mark (large, translucent)
    - quote text (italic, larger than body text)
    - citation/attribution (small, colored)

slot_definitions:
  - QUOTE_TEXT: the quoted statement
  - CITATION: attribution (person name, title, organization)

hierarchy:
  blockquote > [decorative-mark + quote-text + cite]

required_elements: [QUOTE_TEXT]
optional_elements: [CITATION]

responsive_behavior:
  - consistent across breakpoints
  - padding reduces on mobile

image_compatibility: none
sidebar_compatibility: works in main column or can be pulled wider
```

### BP-05: Data Table

```
blueprint_id: bp-data-table
blueprint_name: Data Table
category: data-visualization
article_role: Present structured data with sortable/scannable rows

structural_pattern:
  - section heading (h2) with optional context paragraph
  - full-width table:
    - thead with column headers (muted background, bordered bottom)
    - tbody with data rows (alternating or bordered, hover highlight)
    - optional highlight cells for key values

slot_definitions:
  - SECTION_HEADING: h2 section title
  - CONTEXT_TEXT: optional paragraph explaining the data
  - TABLE_HEADERS[]: column header labels
  - TABLE_ROWS[][]: rows of cell values
  - HIGHLIGHT_CELLS: which cells deserve emphasis

hierarchy:
  section > [h2? + p? + table > thead + tbody]
  thead > tr > th*N
  tbody > tr*N > td*N

required_elements: [TABLE_HEADERS, at least 2 TABLE_ROWS]
optional_elements: [SECTION_HEADING, CONTEXT_TEXT, HIGHLIGHT_CELLS]

responsive_behavior:
  - desktop: full table visible
  - mobile: horizontal scroll or stacked layout

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-06: Before/After Comparison

```
blueprint_id: bp-before-after
blueprint_name: Before/After Comparison
category: comparison
article_role: Show contrast between two states, options, or perspectives

structural_pattern:
  - section heading (h2) with optional context
  - two-column grid:
    - "before" column (card with muted header):
      - column header (h4, uppercase, with status color)
      - bulleted list of items OR paragraph
    - "after" column (card with accent header):
      - column header (h4, uppercase, with accent color)
      - bulleted list of items OR paragraph

slot_definitions:
  - SECTION_HEADING: h2 section title
  - BEFORE_LABEL: header for "before" side (e.g., "Before", "Problem", "Old Way")
  - BEFORE_ITEMS[]: list of items or paragraph text
  - AFTER_LABEL: header for "after" side (e.g., "After", "Solution", "New Way")
  - AFTER_ITEMS[]: list of items or paragraph text

hierarchy:
  section > [h2? + grid > (before-col + after-col)]
  column > [h4 + ul/p]

required_elements: [BEFORE_LABEL, BEFORE_ITEMS, AFTER_LABEL, AFTER_ITEMS]
optional_elements: [SECTION_HEADING]

responsive_behavior:
  - desktop: two-column side by side
  - mobile: stacked vertically (before on top)

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-07: Highlight Callout

```
blueprint_id: bp-highlight-callout
blueprint_name: Highlight Callout
category: data-visualization
article_role: Emphasize a single key metric or statistic with context

structural_pattern:
  - horizontal card (flex row):
    - large number/metric (prominent, heading font)
    - text block:
      - title (h4, bold)
      - description (paragraph)

slot_definitions:
  - HIGHLIGHT_NUMBER: the key metric (e.g., "73%", "$2.4B", "150+")
  - HIGHLIGHT_TITLE: what the number represents
  - HIGHLIGHT_DESCRIPTION: context/explanation

hierarchy:
  callout-card > [number + text-block > (h4 + p)]

required_elements: [HIGHLIGHT_NUMBER, HIGHLIGHT_TITLE]
optional_elements: [HIGHLIGHT_DESCRIPTION]

responsive_behavior:
  - desktop: horizontal flex (number left, text right)
  - mobile: stacked vertically

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-08: Key Takeaways Panel

```
blueprint_id: bp-key-takeaways
blueprint_name: Key Takeaways Panel
category: summary
article_role: Provide scannable key points or takeaways for the reader

structural_pattern:
  - bordered card container:
    - panel heading (h4, with accent bottom border)
    - unordered list with custom bullet indicators:
      - each item: short takeaway statement

slot_definitions:
  - PANEL_HEADING: title (e.g., "Key Takeaways", "Quick Summary")
  - TAKEAWAYS[]: array of short text items (typically 4-6)

hierarchy:
  panel > [h4 + ul > li*N]

required_elements: [PANEL_HEADING, at least 3 TAKEAWAYS]
optional_elements: []

responsive_behavior:
  - consistent across breakpoints
  - can appear in sidebar or main column

image_compatibility: none
sidebar_compatibility: excellent — designed for sidebar or inset use
```

### BP-09: Checklist Block

```
blueprint_id: bp-checklist
blueprint_name: Checklist Block
category: actionable-content
article_role: Present actionable items the reader can check off or verify

structural_pattern:
  - section heading (h2) with optional context
  - unordered list with check icons:
    - each item:
      - check icon (square with checkmark)
      - item text

slot_definitions:
  - SECTION_HEADING: h2 section title
  - CHECKLIST_ITEMS[]: array of text items (typically 5-8)

hierarchy:
  section > [h2? + ul > li*N]
  li > [check-icon + text]

required_elements: [at least 3 CHECKLIST_ITEMS]
optional_elements: [SECTION_HEADING]

responsive_behavior:
  - consistent across breakpoints

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-10: Timeline Block

```
blueprint_id: bp-timeline
blueprint_name: Timeline Block
category: chronological-content
article_role: Present events, milestones, or history in chronological order

structural_pattern:
  - section heading (h2) with optional intro
  - vertical timeline with gradient connector line:
    - each milestone:
      - timeline dot (circular, positioned on the line)
      - time label (small, uppercase, accent color)
      - milestone title (h4)
      - milestone description (paragraph)

slot_definitions:
  - SECTION_HEADING: h2 section title
  - INTRO_TEXT: optional paragraph
  - MILESTONES[]: array of {time_label, title, description} (typically 4-8)

hierarchy:
  section > [h2? + p? + timeline-container]
  timeline > [connector-line + milestone*N]
  milestone > [dot + label + h4 + p]

required_elements: [at least 3 MILESTONES with time_label + title]
optional_elements: [SECTION_HEADING, INTRO_TEXT, description per milestone]

responsive_behavior:
  - consistent across breakpoints (single-column vertical)
  - spacing reduces on mobile

image_compatibility: can pair with images between milestones
sidebar_compatibility: works in main column
```

### BP-11: Section Heading + Lead Paragraph

```
blueprint_id: bp-section-heading
blueprint_name: Section Heading + Lead Paragraph
category: typography
article_role: Introduce a new section with heading and opening context

structural_pattern:
  - uses article prose base typography
  - h2 heading with bottom border separator
  - lead paragraph(s)
  - optional h3 subheadings with more paragraphs

slot_definitions:
  - HEADING: h2 section title
  - LEAD_TEXT: opening paragraph(s)
  - SUBHEADINGS[]: optional h3 + paragraph pairs

hierarchy:
  section > [h2 + p + (h3 + p)*]

required_elements: [HEADING, at least 1 LEAD_TEXT paragraph]
optional_elements: [SUBHEADINGS]

responsive_behavior:
  - inherits prose responsive behavior

image_compatibility: can include inline images between paragraphs
sidebar_compatibility: works in main column
```

### BP-12: Numbered Triggers List

```
blueprint_id: bp-numbered-list
blueprint_name: Numbered Triggers List
category: sequential-content
article_role: Present ordered key points, triggers, reasons, or factors

structural_pattern:
  - section heading (h2) with optional intro
  - ordered list with circular number badges:
    - each item:
      - auto-incrementing number badge (CSS counter)
      - item text (can be multi-line)

slot_definitions:
  - SECTION_HEADING: h2 section title
  - INTRO_TEXT: optional paragraph
  - ITEMS[]: array of text items (typically 5-10)

hierarchy:
  section > [h2? + p? + ol > li*N]
  li > [number-badge(auto) + text]

required_elements: [at least 3 ITEMS]
optional_elements: [SECTION_HEADING, INTRO_TEXT]

responsive_behavior:
  - consistent across breakpoints

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-13: Warning / Tip Callout

```
blueprint_id: bp-callout
blueprint_name: Warning / Tip Callout
category: editorial
article_role: Alert reader to important warnings, tips, or notes

structural_pattern:
  - horizontal card (flex row):
    - icon container (square with background tint):
      - warning icon (amber) OR tip icon (accent color)
    - text body:
      - callout title (h4)
      - callout description (paragraph)
      - optional bullet list

slot_definitions:
  - CALLOUT_TYPE: "warning" or "tip" (determines icon and color treatment)
  - CALLOUT_TITLE: h4 heading
  - CALLOUT_TEXT: description paragraph
  - CALLOUT_ITEMS[]: optional bullet list

hierarchy:
  callout > [icon-container + body > (h4 + p + ul?)]

required_elements: [CALLOUT_TYPE, CALLOUT_TITLE, CALLOUT_TEXT]
optional_elements: [CALLOUT_ITEMS]

responsive_behavior:
  - consistent across breakpoints

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-14: Image with Caption

```
blueprint_id: bp-image-caption
blueprint_name: Image with Caption
category: media
article_role: Display a contextual image with descriptive caption

structural_pattern:
  - figure container (rounded, overflow hidden, shadow):
    - image (full-width, constrained height, object-fit: cover)
    - figcaption (padded, below image, muted background):
      - caption text (small, can include bold source attribution)

slot_definitions:
  - IMAGE_SRC: image path
  - IMAGE_ALT: accessible alt text
  - CAPTION_TEXT: descriptive caption
  - CAPTION_SOURCE: optional source attribution (bold)

hierarchy:
  figure > [img + figcaption > (text + source?)]

required_elements: [IMAGE_SRC, IMAGE_ALT]
optional_elements: [CAPTION_TEXT, CAPTION_SOURCE]

responsive_behavior:
  - image scales to container width
  - caption text size may reduce on mobile

image_compatibility: this IS the image component
sidebar_compatibility: works in main column
```

### BP-15: FAQ Accordion

```
blueprint_id: bp-faq-accordion
blueprint_name: FAQ Accordion
category: interactive
article_role: Present frequently asked questions with expandable answers

structural_pattern:
  - section heading (h2) with optional intro
  - bordered container:
    - each FAQ item (separated by borders):
      - question button (full-width, flex row):
        - question text (heading font, bold)
        - chevron icon (rotates on open)
      - answer panel (collapsible, hidden by default):
        - answer text (paragraph, muted)

slot_definitions:
  - SECTION_HEADING: h2 section title
  - FAQ_ITEMS[]: array of {question, answer} pairs (typically 4-8)

hierarchy:
  section > [h2? + faq-container > faq-item*N]
  faq-item > [question-button > (text + chevron) + answer-panel > (text)]

required_elements: [at least 3 FAQ_ITEMS with question + answer]
optional_elements: [SECTION_HEADING]

responsive_behavior:
  - consistent across breakpoints
  - padding reduces on mobile

interaction_pattern:
  - click question to toggle answer visibility
  - chevron rotates on open/close
  - only one item open at a time (optional)

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-16: Icon Feature Grid

```
blueprint_id: bp-feature-grid
blueprint_name: Icon Feature Grid
category: feature-display
article_role: Showcase features, benefits, or key aspects in a card grid

structural_pattern:
  - section heading (h2) with optional intro
  - grid container (3 columns desktop, 2 tablet, 1 mobile):
    - each feature card:
      - icon container (square with tinted background)
      - feature title (h4)
      - feature description (paragraph)

slot_definitions:
  - SECTION_HEADING: h2 section title
  - INTRO_TEXT: optional paragraph
  - FEATURES[]: array of {icon, title, description} (typically 3-6)

hierarchy:
  section > [h2? + p? + grid > card*N]
  card > [icon + h4 + p]

required_elements: [at least 3 FEATURES with title + description]
optional_elements: [SECTION_HEADING, INTRO_TEXT, icons]

responsive_behavior:
  - desktop: 3-column grid
  - tablet: 2-column grid
  - mobile: 1-column stack

image_compatibility: icons only (SVG or emoji)
sidebar_compatibility: works in main column
```

### BP-17: Problem-Solution Block

```
blueprint_id: bp-problem-solution
blueprint_name: Problem → Solution Block
category: comparison
article_role: Contrast a problem with its solution in a clear visual split

structural_pattern:
  - bordered container (rounded, shadow):
    - three-column grid:
      - problem column (muted background):
        - column header (h4, uppercase, with icon)
        - problem text (paragraph or list)
      - arrow separator (centered, accent color)
      - solution column (slightly different background):
        - column header (h4, uppercase, accent color, with icon)
        - solution text (paragraph or list)

slot_definitions:
  - PROBLEM_TEXT: problem description (paragraph or bullet list)
  - SOLUTION_TEXT: solution description (paragraph or bullet list)
  - PROBLEM_LABEL: optional custom label (default: "Problem")
  - SOLUTION_LABEL: optional custom label (default: "Solution")

hierarchy:
  container > [problem-col + arrow + solution-col]
  column > [h4 + p/ul]

required_elements: [PROBLEM_TEXT, SOLUTION_TEXT]
optional_elements: [PROBLEM_LABEL, SOLUTION_LABEL]

responsive_behavior:
  - desktop: three-column horizontal (problem | arrow | solution)
  - mobile: stacked vertically with arrow rotated 90°

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-18: Inline CTA Card

```
blueprint_id: bp-inline-cta
blueprint_name: Inline CTA Card
category: conversion
article_role: Drive reader action with a prominent call-to-action

structural_pattern:
  - dark-background card (full-width within column):
    - flex row (text left, actions right):
      - text area:
        - CTA heading (h4, white)
        - CTA description (paragraph, semi-transparent white)
      - actions area:
        - primary button
        - optional secondary button (outline/ghost)

slot_definitions:
  - CTA_HEADING: persuasive title
  - CTA_DESCRIPTION: supporting text
  - PRIMARY_BUTTON: {label, url}
  - SECONDARY_BUTTON: optional {label, url}

hierarchy:
  cta-card > [text-area > (h4 + p) + actions > (btn-primary + btn-secondary?)]

required_elements: [CTA_HEADING, PRIMARY_BUTTON]
optional_elements: [CTA_DESCRIPTION, SECONDARY_BUTTON]

responsive_behavior:
  - desktop: horizontal flex (text left, buttons right)
  - mobile: stacked vertically, centered text

image_compatibility: none
sidebar_compatibility: works in main column (full-width recommended)
```

### BP-19: Two-Column Text Block

```
blueprint_id: bp-two-col-text
blueprint_name: Two-Column Text Block
category: content-layout
article_role: Present two parallel aspects, perspectives, or content areas

structural_pattern:
  - section heading (h2) with optional intro
  - two-column grid:
    - left column:
      - column heading (h4, with accent bottom border)
      - paragraph text OR bullet list
    - right column:
      - column heading (h4, with accent bottom border)
      - paragraph text OR bullet list

slot_definitions:
  - SECTION_HEADING: h2 section title
  - LEFT_HEADING: h4 for left column
  - LEFT_CONTENT: paragraph or list
  - RIGHT_HEADING: h4 for right column
  - RIGHT_CONTENT: paragraph or list

hierarchy:
  section > [h2? + grid > (left-col + right-col)]
  column > [h4 + p/ul]

required_elements: [LEFT_HEADING, LEFT_CONTENT, RIGHT_HEADING, RIGHT_CONTENT]
optional_elements: [SECTION_HEADING]

responsive_behavior:
  - desktop: two-column side by side
  - mobile: stacked vertically

image_compatibility: none
sidebar_compatibility: works in main column
```

### BP-20: Mini Comparison Cards

```
blueprint_id: bp-mini-cards
blueprint_name: Mini Comparison Cards
category: comparison
article_role: Compare 3+ options, categories, or items in card format

structural_pattern:
  - section heading (h2) with optional intro
  - grid container (3 columns desktop, 2 tablet, 1 mobile):
    - each card (centered text):
      - category badge (pill, small, uppercase)
      - card title (h4)
      - card description (paragraph)
      - optional tag/label at bottom

slot_definitions:
  - SECTION_HEADING: h2 section title
  - INTRO_TEXT: optional paragraph
  - CARDS[]: array of {badge, title, description, tag?} (typically 3-6)

hierarchy:
  section > [h2? + p? + grid > card*N]
  card > [badge + h4 + p + tag?]

required_elements: [at least 3 CARDS with title + description]
optional_elements: [SECTION_HEADING, INTRO_TEXT, badge, tag per card]

responsive_behavior:
  - desktop: 3-column grid
  - tablet: 2-column grid
  - mobile: 1-column stack

image_compatibility: none (card-based, text-focused)
sidebar_compatibility: works in main column
```

---

## COMPONENT CLASSIFICATION INDEX

| Blueprint ID | Name | Category | Best For |
|---|---|---|---|
| bp-stats-cards | Stats Cards Row | data-visualization | Key metrics, statistics, numbers |
| bp-comparison-table | Comparison Table | data-visualization | Structured data comparison |
| bp-step-process | Step-by-Step Process | sequential-content | How-to guides, processes |
| bp-pull-quote | Pull Quote | editorial | Expert quotes, key statements |
| bp-data-table | Data Table | data-visualization | Raw data display |
| bp-before-after | Before/After Comparison | comparison | State changes, improvements |
| bp-highlight-callout | Highlight Callout | data-visualization | Single key metric emphasis |
| bp-key-takeaways | Key Takeaways Panel | summary | Quick-scan summaries |
| bp-checklist | Checklist Block | actionable-content | Action items, requirements |
| bp-timeline | Timeline Block | chronological-content | History, milestones, events |
| bp-section-heading | Section Heading + Lead | typography | Section introductions |
| bp-numbered-list | Numbered Triggers List | sequential-content | Reasons, factors, triggers |
| bp-callout | Warning / Tip Callout | editorial | Alerts, tips, important notes |
| bp-image-caption | Image with Caption | media | Contextual images |
| bp-faq-accordion | FAQ Accordion | interactive | Q&A sections |
| bp-feature-grid | Icon Feature Grid | feature-display | Features, benefits |
| bp-problem-solution | Problem → Solution | comparison | Problem/solution contrast |
| bp-inline-cta | Inline CTA Card | conversion | Call-to-action |
| bp-two-col-text | Two-Column Text | content-layout | Parallel content areas |
| bp-mini-cards | Mini Comparison Cards | comparison | Multi-option comparison |

---

## TOPIC-AWARE COMPOSITION GUIDE

Different topic types benefit from different component mixes:

| Topic Type | Recommended Components | Why |
|---|---|---|
| **Data-heavy** (economics, science) | stats-cards, data-table, comparison-table, highlight-callout | Numbers need visual emphasis |
| **How-to / Guide** | step-process, checklist, callout, numbered-list | Sequential flow |
| **Historical / Narrative** | timeline, pull-quote, image-caption, section-heading | Chronological storytelling |
| **Comparison / Review** | before-after, comparison-table, mini-cards, problem-solution | Side-by-side contrast |
| **Feature / Product** | feature-grid, mini-cards, inline-cta, highlight-callout | Benefits and conversion |
| **FAQ / Informational** | faq-accordion, key-takeaways, callout, two-col-text | Scannable answers |
| **Opinion / Editorial** | pull-quote, section-heading, image-caption, callout | Voice and emphasis |

All articles should include at minimum:
- 1 hero (bp-hero)
- 1-2 section headings (bp-section-heading)
- 1 key takeaways or summary component
- 1 CTA (bp-inline-cta) or closing action
- 8+ unique component types total

---

## VISUAL ADAPTATION RULES

When generating HTML from these blueprints, the **Runtime Visual Adapter** applies:

1. **Colors**: from the active project's design tokens (--primary, --accent, --foreground, etc.)
2. **Fonts**: from the active project's font stack (heading + body)
3. **Spacing**: from the active project's rhythm (section gaps, padding, margins)
4. **Border radius**: from the active project's radius tokens
5. **Shadows**: from the active project's shadow tokens
6. **Container width**: from the active project's max-width

If the active project has no design tokens, use the fallback defaults from engine-config.md.

**Never freeze Axiom-specific values** (green palette, Alexandria/Poppins fonts, specific radii) into generated articles. These are runtime choices.
