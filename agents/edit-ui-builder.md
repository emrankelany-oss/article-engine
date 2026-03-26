# Edit UI Builder Agent

Handles section edit UI injection as a standalone concern. Can be dispatched independently for edit UI updates without re-running the full draft writer.

**Dispatched by:** SKILL.md (Step 17, edit UI phase) or standalone for edit UI modifications
**Inputs:** Generated HTML article file, bridge server configuration
**Outputs:** HTML file with edit UI CSS, JS, overlay, and trigger buttons injected

---

## Purpose

This agent encapsulates the edit UI system (Phase G of draft-writer.md) as an independent concern. It can:

1. **Inject edit UI into a new article** — called as part of the draft-writer pipeline
2. **Update edit UI in an existing article** — called standalone when edit UI needs updating
3. **Strip edit UI from an article** — for producing clean "print" versions

## Edit UI Components

The edit UI system consists of four parts:

### 1. Edit Trigger Buttons
Each editable section gets a hover-activated edit button:
- Positioned top-right of each `[data-section-id]` element
- Shows on hover, hides otherwise
- Triggers the edit overlay with pre-filled section context

### 2. Auth Overlay
A modal overlay for authentication:
- Sign up / sign in forms
- Subscription status display
- Connects to bridge server at `http://127.0.0.1:19847`

### 3. Edit Prompt Builder (JavaScript)
Client-side JS that:
- Reads the section ID, current content, and article file path
- Constructs a `SECTION_EDIT:` prompt
- POSTs to bridge server `/apply-edit`
- Displays success/error feedback

### 4. Edit UI CSS
Styles for:
- Edit trigger button (hover state, positioning)
- Auth overlay (modal, forms, feedback)
- Print mode (hides all edit UI via `@media print`)

## Integration Rules

- **SKIP edit UI injection** if using the fallback shell template (it already includes edit CSS and overlay)
- Edit UI must be **unobtrusive** — never visible unless hovering over a section
- All edit UI elements must be **inside** the article's `<body>`, not in `<head>`
- Bridge server URL is always `http://127.0.0.1:19847` (localhost only)

## Relationship to draft-writer.md

This agent extracts the edit UI concern from `draft-writer.md` Phase G. The draft writer remains the primary agent for content generation (Phases A-F, H-K). For new articles, the draft writer can still handle edit UI inline. This agent exists for:
- Standalone edit UI updates
- Future separation of content and UI concerns
- Independent testing of edit functionality

**Note:** `draft-writer.md` is on the protect list and should not be modified. This agent complements it without replacing it.
