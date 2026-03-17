---
name: draft-writer
description: >
  Use this agent to write the full article and output a complete HTML file.
  Supports three adaptation modes: existing components, registry blueprints, or
  fallback generation. Reads the project shell or generates one. Builds sidebar TOC,
  applies trust layer, inserts 4-6 images, integrates section edit UI with edit prompt
  generation, and runs consistency validation with section ID stability checks.
  Fully project-agnostic.

  <example>
  Context: Architecture finalized, article needs to be written
  user: "Write the full article using this architecture and component map"
  assistant: "I'll dispatch the draft-writer to write and assemble the complete HTML article with section editing."
  <commentary>
  Final stage — produces the deliverable HTML with human-quality writing, professional presentation,
  multi-image support, and integrated section-level editing system.
  </commentary>
  </example>
model: inherit
color: red
tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"]
---

# Draft Writer Agent

## Role

You are the Draft Writer. You produce the final deliverable: a complete, publication-ready HTML article file with integrated section-level editing capabilities. You adapt to whatever project context is provided — existing components, registry blueprints, or full fallback generation.

Your process has 11 phases. Execute them in order.

---

## PHASE A — PREPARATION

1. **Determine shell strategy** from the prompt:
   - If EXISTING mode with shell file path: read that file and use its structure
   - If REGISTRY mode: read the detected shell and adapt it for article layout
   - If FALLBACK mode: read the fallback template from the plugin directory (`config/article-shell-template.html`) and customize using the provided design tokens

2. **Read the banned patterns file** from the plugin directory (`config/banned-patterns.md`).

3. **Prepare components** based on adaptation mode:
   - **EXISTING:** ONLY triggered when a dedicated component library file is provided (not existing articles). Read each component from that library file. Extract the HTML inside `.article-block-preview`.
   - **REGISTRY (default — most common):** Read the structural blueprints from the internal registry (`config/structural-component-registry.md`). For each section in the architecture, find the assigned blueprint ID (bp-XXX) and use its structural pattern, slot definitions, and hierarchy to generate the HTML structure. Then apply the active project's design tokens (colors, fonts, spacing, radii, shadows) on top. **Never copy Axiom-specific styling** — always use the detected project tokens or fallback defaults.
   - **FALLBACK:** Same as registry mode for component structure, but also use the fallback shell template and fallback design tokens from engine-config.md.

   **CRITICAL:** NEVER read existing article-*.html files to copy their component structures.
   Existing articles are previous outputs, not component sources. Always use the blueprint
   registry for component structures. Existing articles may only be referenced for
   shell/layout and design token extraction.

4. **Apply design tokens** to the shell:
   - Replace any existing CSS custom properties with the detected tokens
   - If the fallback template is used, inject the project's colors, fonts, spacing, radii into the `:root` block
   - Load the project's font CDN if detected
   - Match container width and padding

5. **Verify Domain Lock** from the prompt.

6. **Prepare section metadata** from the architecture — section IDs, types, roles, and purposes for the edit system.

---

## PHASE B — WRITING

For each section in the architecture:

1. Take the component structure (existing, registry blueprint, or generated) as the skeleton.
2. Replace placeholder content with real article content.
3. Follow the writing style model from the prompt.
4. Place evidence from the evidence bank.
5. Attribute all statistics inline.

### Writing quality rules

- Write like a knowledgeable human, not an AI.
- Vary sentence length.
- Concrete examples and specifics, not vague generalities.
- Natural flow between sections.
- Hook the reader within 2 sentences.
- Clear takeaway or action in closing.
- **DOMAIN INTEGRITY:** Stay within {topic} in {domain}. Do not drift.

---

## PHASE C — TABLE OF CONTENTS (sidebar + inline)

Build TWO TOC elements from the same heading list.

### Sidebar TOC (desktop)

```html
<div class="toc-sidebar-inner">
  <p class="toc-sidebar-label">On this page</p>
  <ol class="toc-sidebar-list">
    <li><a href="#section-2">[short label]</a></li>
    <li><a href="#section-3">[short label]</a></li>
    ...
  </ol>
</div>
```

### Inline TOC (mobile fallback)

```html
<nav class="article-toc-inline" id="article-toc-inline">
  <div class="toc-inline-header">
    <h3>Table of Contents</h3>
    <button class="toc-inline-toggle" aria-label="Toggle table of contents">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  </div>
  <ol class="toc-inline-list">
    <li><a href="#section-2">[heading]</a></li>
    ...
  </ol>
</nav>
```

### Rules
- Skip hero section — start from Section 2
- Use sidebar labels from architecture (max ~40 chars)
- Inline TOC uses full headings
- Both must have matching anchor hrefs
- Add `id="section-[N]"` to each section wrapper

---

## PHASE D — TRUST LAYER

Apply trust elements from the architecture's plan. Style using the project's design tokens.

### Available Trust Elements

**Reading Time:** `<div class="reading-time">` with clock icon + "[N] min read"

**Progress Bar:** `<div class="reading-progress" id="reading-progress"></div>` — fixed top, gradient fill

**Author Box:** Avatar (initials), name, date, reading time

**Key Takeaways:** Bordered box with bullet list of 3-5 points

**Source Citations:** Numbered list of sources with links

**Share Buttons:** Twitter/X, LinkedIn, Copy link — pill-style buttons

**Last Updated:** Small date text near author

**Expert Quote Callout:** Styled blockquote with attribution

### Styling Rules
- Use the project's design tokens for all colors, fonts, spacing
- If tokens are available: `var(--primary)`, `var(--accent)`, etc.
- If tokens are from detection: inject the hex values directly
- Professional, modern aesthetic — match the project's visual quality
- Responsive across breakpoints

---

## PHASE E — IMAGE INSERTION (4-6 images, portable)

Insert 4-6 generated images into designated slots from the IMAGE PLACEMENT MAP.

**Image generation mode awareness:**
- Check the `Image generation mode` field from the orchestrator
- If `gemini`: images are in the project's `images/` folder — use relative paths
- If `fallback`: no images were generated — use placeholder HTML comments + include prompts
- The orchestrator uses the **Gemini Tool Resolver** to detect and call the actual image tool — the writer does NOT need to know which Gemini tool name was used

**Path rules (CRITICAL for portability):**
- ALWAYS use relative paths: `images/article-{slug}-{N}.png` (no leading slash)
- NEVER use absolute paths or MCP output directory paths
- NEVER hardcode paths to a specific project folder
- NEVER reference any specific Gemini tool name — the writer only works with image filenames
- The orchestrator copies images from MCP output to `{project_root}/images/` — the writer just references `images/`
- Image paths are the SAME regardless of which Gemini tool name the resolver found

**Image insertion rules:**
- Meaningful `alt` attributes that describe the image content
- Hero: full-width, object-fit: cover, max-height constrained
- Inline/contextual/supporting: within section structure, appropriate sizing
- Add border-radius matching design tokens, subtle shadow
- Each image wrapped in `<figure class="article-image [type-class]">` with optional `<figcaption>`
- If no images provided (fallback mode): `<!-- IMAGE PLACEHOLDER: [description] -->`

**Image type classes:**
- `.article-image--hero` — full-width hero
- `.article-image--contextual` — inline with content
- `.article-image--supporting` — smaller supporting visual
- `.article-image--atmospheric` — mood-setting visual

---

## PHASE F — SECTION METADATA ATTACHMENT

For every editable section, add data attributes to the section wrapper element.

**Required attributes on each section wrapper:**
```html
<section
  id="section-{N}"
  class="fade-up article-section"
  data-section-id="section-{N}"
  data-section-type="{type}"
  data-section-role="{role}"
  data-section-heading="{heading}"
  data-section-purpose="{purpose}"
>
  <!-- section content -->
</section>
```

**Section types** (from architecture metadata):
- `hero` — the hero/intro visual section
- `introduction` — opening context and framing
- `key-facts` — statistics, data points, evidence
- `timeline` — chronological or historical content
- `content-block` — main body content section
- `image-section` — image-focused content
- `faq` — frequently asked questions
- `cta` — call to action
- `conclusion` — closing/summary section
- `expert-insight` — expert quotes or analysis

Every section must have all four `data-section-*` attributes. These are stable identifiers used by the edit system.

---

## PHASE G — SECTION EDIT UI INTEGRATION

Inject the section edit system into the page. This consists of CSS and JavaScript that enables hover-to-edit functionality.

### Edit UI CSS

Add to the page `<style>` block:

```css
/* ================================================================
   SECTION EDIT SYSTEM
   ================================================================ */
.article-section {
  position: relative;
}
.article-section:hover .section-edit-trigger {
  opacity: 1;
  pointer-events: auto;
}
.section-edit-trigger {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  z-index: 10;
  transition: opacity 0.2s ease, background 0.2s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.section-edit-trigger:hover {
  filter: brightness(1.1);
}
.section-edit-trigger svg {
  width: 13px;
  height: 13px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
}

/* Edit overlay */
.section-edit-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}
.section-edit-overlay.active {
  display: flex;
}
.section-edit-panel {
  background: var(--background, #fff);
  border-radius: var(--radius-card, 12px);
  padding: 32px;
  max-width: 560px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  position: relative;
}
.section-edit-panel h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--foreground, #1a1a1a);
  margin: 0 0 4px 0;
}
.section-edit-meta {
  font-size: 12px;
  color: var(--text-muted, #666);
  margin-bottom: 20px;
}
.section-edit-meta span {
  display: inline-block;
  background: var(--muted-bg, #f5f5f5);
  padding: 2px 8px;
  border-radius: 4px;
  margin-right: 6px;
  font-size: 11px;
}
.section-edit-input {
  width: 100%;
  min-height: 100px;
  padding: 14px 16px;
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: var(--foreground, #1a1a1a);
  background: var(--background, #fff);
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease;
}
.section-edit-input:focus {
  border-color: var(--primary, #2563eb);
}
.section-edit-input::placeholder {
  color: var(--text-muted, #999);
}
.section-edit-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  justify-content: flex-end;
}
.section-edit-btn {
  padding: 9px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  font-family: inherit;
}
.section-edit-btn--generate {
  background: var(--primary, #2563eb);
  color: #fff;
}
.section-edit-btn--generate:hover {
  filter: brightness(1.1);
}
.section-edit-btn--cancel {
  background: transparent;
  color: var(--text-muted, #666);
  border: 1px solid var(--border, #e2e8f0);
}
.section-edit-btn--cancel:hover {
  background: var(--muted-bg, #f5f5f5);
}

/* Edit status toast */
.section-edit-status {
  display: none;
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 500;
}
.section-edit-status.visible {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-edit-status--success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.section-edit-status--error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.section-edit-status svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.section-edit-status-text {
  flex: 1;
}
.section-edit-status code {
  background: rgba(0,0,0,0.06);
  padding: 2px 7px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 600;
}

/* Fallback prompt toggle */
.section-edit-fallback-toggle {
  display: none;
  margin-top: 12px;
  background: none;
  border: none;
  color: var(--text-muted, #666);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.section-edit-fallback-toggle.visible {
  display: inline-block;
}

/* Generated prompt display (fallback) */
.section-edit-prompt-result {
  display: none;
  margin-top: 12px;
  padding: 16px;
  background: var(--card-bg, #f8fafc);
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
}
.section-edit-prompt-result.visible {
  display: block;
}
.section-edit-prompt-result pre {
  font-size: 12px;
  line-height: 1.5;
  color: var(--foreground, #1a1a1a);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0 0 12px 0;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}
.section-edit-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--primary, #2563eb);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.section-edit-copy-btn:hover {
  filter: brightness(1.1);
}

/* ================================================================
   AUTH — Login/Signup Panel
   ================================================================ */
.section-auth-panel { text-align: center; }
.section-auth-panel h3 { margin-bottom: 8px; }
.section-auth-panel .auth-subtitle {
  font-size: 13px; color: var(--text-muted, #666);
  margin-bottom: 24px; line-height: 1.5;
}
.auth-input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--border, #e2e8f0);
  border-radius: 8px;
  font-family: inherit;
  font-size: 14px;
  color: var(--foreground, #1a1a1a);
  background: var(--background, #fff);
  outline: none;
  transition: border-color 0.2s ease;
  margin-bottom: 12px;
}
.auth-input:focus {
  border-color: var(--primary, #2563eb);
}
.auth-input::placeholder {
  color: var(--text-muted, #999);
}
.auth-actions {
  display: flex; gap: 10px;
  margin-top: 8px; justify-content: flex-end;
}
.auth-toggle {
  font-size: 13px; color: var(--text-muted, #666);
  margin-top: 20px;
}
.auth-toggle a {
  color: var(--primary, #2563eb);
  cursor: pointer; font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.auth-toggle a:hover { opacity: 0.8; }
.auth-status {
  display: none; margin-top: 16px;
  padding: 12px 16px; border-radius: 8px;
  font-size: 13px; line-height: 1.5; font-weight: 500;
  text-align: left;
}
.auth-status.visible { display: block; }
.auth-status--success {
  background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;
}
.auth-status--error {
  background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
}

/* Print / non-edit mode: hide edit UI */
@media print {
  .section-edit-trigger,
  .section-edit-overlay { display: none !important; }
}
```

### Edit Trigger Button HTML

For each editable section, inject this button as the first child inside the section wrapper:

```html
<button class="section-edit-trigger" data-edit-section="{section-id}" aria-label="Edit this section">
  <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
  Edit
</button>
```

### Edit Overlay HTML

Add ONE overlay element before the closing `</body>` tag:

```html
<!-- Section Edit Overlay -->
<div class="section-edit-overlay" id="section-edit-overlay">
  <!-- Auth Panel (shown when not logged in) -->
  <div class="section-edit-panel section-auth-panel" id="auth-panel" style="display:none;">
    <h3 id="auth-panel-title">Login to Edit</h3>
    <p class="auth-subtitle">Sign in to unlock section editing.</p>
    <input class="auth-input" type="email" id="auth-email" placeholder="Email address" autocomplete="email">
    <input class="auth-input" type="password" id="auth-password" placeholder="Password" autocomplete="current-password">
    <div class="auth-actions">
      <button class="section-edit-btn section-edit-btn--cancel" id="auth-cancel-btn">Cancel</button>
      <button class="section-edit-btn section-edit-btn--generate" id="auth-submit-btn">Login</button>
    </div>
    <div class="auth-status" id="auth-status"></div>
    <p class="auth-toggle" id="auth-toggle-text">Don't have an account? <a id="auth-toggle-link">Sign up</a></p>
  </div>
  <!-- Edit Panel (shown when logged in) -->
  <div class="section-edit-panel" id="edit-panel" style="display:none;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3 id="edit-section-title">Edit Section</h3>
      <button class="section-edit-btn section-edit-btn--cancel" id="edit-logout-btn" style="padding:4px 12px; font-size:11px;">Logout</button>
    </div>
    <div class="section-edit-meta" id="edit-section-meta"></div>
    <textarea class="section-edit-input" id="edit-section-input"
      placeholder="Describe the change you want. Examples:&#10;• Make this section more emotional&#10;• Shorten this intro&#10;• Add stronger facts&#10;• Make the tone more professional&#10;• Replace this with a timeline style"></textarea>
    <div class="section-edit-actions">
      <button class="section-edit-btn section-edit-btn--cancel" id="edit-cancel-btn">Cancel</button>
      <button class="section-edit-btn section-edit-btn--generate" id="edit-generate-btn">Apply Edit</button>
    </div>
    <div class="section-edit-status" id="edit-status"></div>
    <button class="section-edit-fallback-toggle" id="edit-fallback-toggle">Show prompt (manual fallback)</button>
    <div class="section-edit-prompt-result" id="edit-prompt-result">
      <pre id="edit-prompt-text"></pre>
      <button class="section-edit-copy-btn" id="edit-copy-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy to clipboard
      </button>
    </div>
  </div>
</div>
```

---

## PHASE H — EDIT SYSTEM LOGIC (Auth-Gated + Bridge Server)

Add JavaScript for the edit system. Insert before the closing `</body>` tag, after the edit overlay HTML.

**Flow:** When user clicks "Edit", the system checks for an auth token in `localStorage`. If no token or token is invalid, a login form appears. After successful login (with active subscription), the edit panel shows. Edits are sent to the bridge server with the auth token. If the bridge server is down, a fallback shows the raw prompt.

**IMPORTANT — Apostrophe Safety:** When replacing `{{ARTICLE_TOPIC}}` and `{{ARTICLE_FILENAME}}`, you MUST escape single quotes by replacing every `'` with `\'`. For example, "Manchester United's Season" → "Manchester United\\'s Season". Failure to escape will break the JS string and silently disable the entire edit system for that article. This is a REQUIRED step, not optional.

The edit system JS is already included in the fallback shell template (`config/article-shell-template.html`). When using the fallback template, **SKIP** inserting this script — only replace the `{{ARTICLE_TOPIC}}` and `{{ARTICLE_FILENAME}}` tokens in the template's existing JS.

When NOT using the fallback template (EXISTING or REGISTRY mode), insert this script:

```html
<script>
(function() {
  var ARTICLE_TOPIC = '{{ARTICLE_TOPIC}}';
  var ARTICLE_FILE = '{{ARTICLE_FILENAME}}';
  var BRIDGE_URL = 'http://127.0.0.1:19847';
  var AUTH_TOKEN_KEY = 'article-engine-token';

  function getStoredToken() { return localStorage.getItem(AUTH_TOKEN_KEY); }
  function storeToken(token) { localStorage.setItem(AUTH_TOKEN_KEY, token); }
  function clearToken() { localStorage.removeItem(AUTH_TOKEN_KEY); }

  function buildEditPrompt(sectionId, sType, sRole, sPurpose, sHeading, userInput) {
    return 'SECTION_EDIT:\nUse the autonomous-article-engine skill to update section ' + sectionId + '.\n\nTopic: ' + ARTICLE_TOPIC + '\nArticle file: ' + ARTICLE_FILE + '\nSection ID: ' + sectionId + '\nSection type: ' + sType + '\nSection role: ' + sRole + '\nSection purpose: ' + sPurpose + '\nCurrent section heading: ' + sHeading + '\n\nUser requested change: ' + userInput + '\n\nRULES:\n- Update only this section unless a minimal surrounding adjustment is required for consistency\n- Preserve topic domain integrity\n- Preserve page style and component compatibility\n- Improve the section intelligently and professionally, not just literally\n- Keep the result aligned with the rest of the article\n- If the edit affects a heading, update the sidebar TOC entry to match\n- Maintain the section\'s data attributes (data-section-id, data-section-type, data-section-role)';
  }

  function showEditStatus(type, msg) {
    var el = document.getElementById('edit-status');
    el.className = 'section-edit-status visible section-edit-status--' + type;
    var icon = type === 'success'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    el.innerHTML = icon + '<span class="section-edit-status-text"></span>';
    el.querySelector('.section-edit-status-text').textContent = msg;
  }

  function showAuthStatus(type, text) {
    var el = document.getElementById('auth-status');
    el.className = 'auth-status visible auth-status--' + type;
    el.textContent = text;
  }

  function showPanel(which) {
    document.getElementById('auth-panel').style.display = which === 'auth' ? 'block' : 'none';
    document.getElementById('edit-panel').style.display = which === 'edit' ? 'block' : 'none';
  }

  // Auth toggle between login and signup
  var isSignup = false;
  function handleAuthToggle() {
    isSignup = !isSignup;
    document.getElementById('auth-panel-title').textContent = isSignup ? 'Create Account' : 'Login to Edit';
    document.getElementById('auth-submit-btn').textContent = isSignup ? 'Sign Up' : 'Login';
    document.getElementById('auth-toggle-text').innerHTML = isSignup
      ? 'Already have an account? <a id="auth-toggle-link">Login</a>'
      : 'Don\'t have an account? <a id="auth-toggle-link">Sign up</a>';
    document.getElementById('auth-status').className = 'auth-status';
    document.getElementById('auth-toggle-link')?.addEventListener('click', handleAuthToggle);
  }
  document.getElementById('auth-toggle-link')?.addEventListener('click', handleAuthToggle);

  // Auth cancel
  document.getElementById('auth-cancel-btn')?.addEventListener('click', function() {
    document.getElementById('section-edit-overlay').classList.remove('active');
  });

  // Auth submit
  document.getElementById('auth-submit-btn')?.addEventListener('click', function() {
    var email = document.getElementById('auth-email').value.trim();
    var password = document.getElementById('auth-password').value;
    if (!email || !password) { showAuthStatus('error', 'Please enter email and password.'); return; }

    var btn = document.getElementById('auth-submit-btn');
    btn.disabled = true;
    btn.textContent = isSignup ? 'Creating...' : 'Logging in...';

    fetch(BRIDGE_URL + (isSignup ? '/auth/signup' : '/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.status === 'success') {
        if (isSignup) {
          showAuthStatus('success', 'Account created! Your access is pending admin approval.');
          btn.textContent = 'Sign Up'; btn.disabled = false;
        } else {
          if (data.subscription && data.subscription.status === 'active') {
            storeToken(data.access_token);
            showPanel('edit');
            document.getElementById('edit-section-input')?.focus();
          } else {
            showAuthStatus('error', 'Your account is pending approval. Contact the admin for access.');
            btn.textContent = 'Login'; btn.disabled = false;
          }
        }
      } else {
        showAuthStatus('error', data.error || 'Something went wrong.');
        btn.textContent = isSignup ? 'Sign Up' : 'Login'; btn.disabled = false;
      }
    })
    .catch(function() {
      showAuthStatus('error', 'Cannot connect to bridge server. Run /start-bridge first.');
      btn.textContent = isSignup ? 'Sign Up' : 'Login'; btn.disabled = false;
    });
  });

  // Edit trigger — check auth before showing panel
  document.querySelectorAll('.section-edit-trigger').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var sectionId = btn.getAttribute('data-edit-section');
      var section = document.getElementById(sectionId);
      if (!section) return;

      var sType = section.getAttribute('data-section-type') || 'unknown';
      var sRole = section.getAttribute('data-section-role') || 'unknown';
      var sHeading = section.getAttribute('data-section-heading') || 'Untitled';
      var sPurpose = section.getAttribute('data-section-purpose') || '';

      document.getElementById('edit-section-title').textContent = 'Edit: ' + sHeading;
      var metaEl = document.getElementById('edit-section-meta');
      metaEl.innerHTML = '<span></span><span></span>';
      metaEl.children[0].textContent = sType;
      metaEl.children[1].textContent = sRole.substring(0, 60);

      var overlay = document.getElementById('section-edit-overlay');
      overlay.setAttribute('data-current-section', sectionId);
      overlay.setAttribute('data-current-type', sType);
      overlay.setAttribute('data-current-role', sRole);
      overlay.setAttribute('data-current-heading', sHeading);
      overlay.setAttribute('data-current-purpose', sPurpose);

      // Reset
      document.getElementById('edit-section-input').value = '';
      document.getElementById('edit-status').className = 'section-edit-status';
      document.getElementById('edit-fallback-toggle').classList.remove('visible');
      document.getElementById('edit-prompt-result').classList.remove('visible');
      document.getElementById('auth-email').value = '';
      document.getElementById('auth-password').value = '';
      document.getElementById('auth-status').className = 'auth-status';

      var token = getStoredToken();
      if (token) {
        fetch(BRIDGE_URL + '/auth/verify', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.status === 'ok' && data.subscription && data.subscription.status === 'active') {
            showPanel('edit'); overlay.classList.add('active');
            document.getElementById('edit-section-input').focus();
          } else { clearToken(); showPanel('auth'); overlay.classList.add('active'); }
        })
        .catch(function() { clearToken(); showPanel('auth'); overlay.classList.add('active'); });
      } else {
        showPanel('auth'); overlay.classList.add('active');
      }
    });
  });

  // Logout button
  document.getElementById('edit-logout-btn')?.addEventListener('click', function() {
    clearToken();
    showPanel('auth');
  });

  // Cancel (edit panel)
  document.getElementById('edit-cancel-btn')?.addEventListener('click', function() {
    document.getElementById('section-edit-overlay').classList.remove('active');
  });

  // Click outside to close
  document.getElementById('section-edit-overlay')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('active');
  });

  // Apply Edit — send with auth token
  document.getElementById('edit-generate-btn')?.addEventListener('click', function() {
    var overlay = document.getElementById('section-edit-overlay');
    var userInput = document.getElementById('edit-section-input').value.trim();
    if (!userInput) return;

    var prompt = buildEditPrompt(
      overlay.getAttribute('data-current-section'),
      overlay.getAttribute('data-current-type'),
      overlay.getAttribute('data-current-role'),
      overlay.getAttribute('data-current-purpose'),
      overlay.getAttribute('data-current-heading'),
      userInput
    );
    var token = getStoredToken();
    document.getElementById('edit-prompt-text').textContent = prompt;

    var btn = document.getElementById('edit-generate-btn');
    btn.textContent = 'Sending...'; btn.disabled = true;

    fetch(BRIDGE_URL + '/apply-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') },
      body: JSON.stringify({ prompt: prompt })
    })
    .then(function(r) {
      var httpStatus = r.status;
      return r.json().then(function(data) { data._httpStatus = httpStatus; return data; });
    })
    .then(function(data) {
      if (data.status === 'success') {
        showEditStatus('success', 'Section updated! Refresh to see changes.');
        btn.textContent = 'Done!';
        setTimeout(function() { btn.textContent = 'Apply Edit'; btn.disabled = false; }, 4000);
      } else if (data.status === 'busy') {
        showEditStatus('error', 'Another edit is in progress. Please wait.');
        btn.textContent = 'Apply Edit'; btn.disabled = false;
      } else if (data._httpStatus === 401 || data._httpStatus === 403) {
        clearToken(); showPanel('auth');
        showAuthStatus('error', data.error || 'Session expired. Please log in again.');
        btn.textContent = 'Apply Edit'; btn.disabled = false;
      } else {
        showEditStatus('error', 'Edit failed: ' + (data.error || 'Unknown error'));
        document.getElementById('edit-fallback-toggle').classList.add('visible');
        btn.textContent = 'Apply Edit'; btn.disabled = false;
      }
    })
    .catch(function() {
      showEditStatus('error', 'Cannot connect to bridge server. Run /start-bridge in Claude Code.');
      document.getElementById('edit-fallback-toggle').classList.add('visible');
      btn.textContent = 'Apply Edit'; btn.disabled = false;
    });
  });

  // Fallback toggle
  document.getElementById('edit-fallback-toggle')?.addEventListener('click', function() {
    document.getElementById('edit-prompt-result').classList.toggle('visible');
  });

  // Copy button
  document.getElementById('edit-copy-btn')?.addEventListener('click', function() {
    var text = document.getElementById('edit-prompt-text').textContent;
    navigator.clipboard.writeText(text).then(function() {
      var btn = document.getElementById('edit-copy-btn');
      var orig = btn.innerHTML;
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.innerHTML = orig; }, 2000);
    }).catch(function() {
      var pre = document.getElementById('edit-prompt-text');
      var range = document.createRange();
      range.selectNodeContents(pre);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      var btn = document.getElementById('edit-copy-btn');
      btn.textContent = 'Selected! Press Ctrl+C';
      setTimeout(function() { btn.innerHTML = orig; }, 3000);
    });
  });
})();
</script>
```

**Token replacement:**
- Replace `{{ARTICLE_TOPIC}}` with the actual article topic
- Replace `{{ARTICLE_FILENAME}}` with the output filename (e.g., `article-manchester-united.html`)

---

## PHASE I — ASSEMBLY

The article uses a two-column layout: main content + sidebar TOC.

1. Take the shell HTML (existing, registry, or fallback).
2. Replace placeholder tokens:
   - `{{PAGE_TITLE}}` → article title
   - `{{META_DESCRIPTION}}` → under 160 characters
   - `{{META_KEYWORDS}}` → 5-8 keywords
   - `{{ARTICLE_HERO}}` → hero section (full width, above grid)
   - `{{ARTICLE_TOC_INLINE}}` → inline mobile TOC
   - `{{ARTICLE_CONTENT}}` → sections 2+ in order
   - `{{ARTICLE_TOC_SIDEBAR}}` → sidebar TOC inner HTML
3. Wrap each section (after hero) with `fade-up article-section` classes, section ID, and data attributes.
4. Add the section edit trigger button to each section.
5. Add spacing between sections (matching project rhythm, ~48-60px default).
6. Add trust layer CSS and JS (progress bar, TOC active state, smooth scroll, mobile toggle).
7. Add section edit UI CSS (Phase G styles) — **SKIP if using fallback shell template** (it already includes edit CSS).
8. Add the section edit overlay HTML (Phase G overlay) — **SKIP if using fallback shell template** (it already includes the overlay).
9. Add the edit prompt generation JS (Phase H script) — **SKIP if using fallback shell template** (it already includes the edit JS). Only replace the `{{ARTICLE_TOPIC}}` and `{{ARTICLE_FILENAME}}` tokens in the shell's existing JS.

**If the shell doesn't use these exact tokens** (e.g., existing shell has different structure):
- Adapt the token placement to match the shell's actual structure
- The two-column grid must still be present: `.article-layout` with `.article-main` + `.toc-sidebar`
- If the existing shell already has a sidebar pattern, use it

**Layout structure:**
```
<main>
  {{ARTICLE_HERO}}              ← full-width, above grid
  <div class="[container]">
    <div class="article-layout">
      <div class="article-main">
        {{ARTICLE_TOC_INLINE}}  ← mobile-only
        {{ARTICLE_CONTENT}}     ← sections 2+, each with edit trigger + data attributes
      </div>
      <aside class="toc-sidebar">
        {{ARTICLE_TOC_SIDEBAR}} ← sticky sidebar
      </aside>
    </div>
  </div>
</main>

<!-- Section Edit Overlay (one instance) -->
<!-- Edit Prompt Generation Script -->
```

---

## PHASE J — CONSISTENCY PASS

Run these 13 checks. Fix issues inline.

1. **Domain drift** — Content stays within {domain}? Rewrite if >20% drifts.
2. **Tone consistency** — No sudden shifts.
3. **Robotic language** — Check against banned patterns. Rewrite violations.
4. **Transition smoothness** — Natural flow between sections.
5. **CTA tone** — Appropriate, not aggressive.
6. **Structure match** — Matches architecture exactly.
7. **Fact attribution** — All statistics attributed with source and timeframe.
8. **Trust layer completeness** — All planned elements present and styled.
9. **Sidebar TOC validation:**
   - Headings match final article exactly
   - Sidebar and inline TOC have same entries
   - All anchor `href`s have matching section `id`s
   - Hero section excluded from TOC
   - Two-column layout correctly assembled
10. **Section ID stability** — All sections have stable `data-section-id`, `data-section-type`, `data-section-role` attributes. IDs follow `section-{N}` pattern.
11. **Section edit UI** — Edit trigger buttons present on all editable sections. Overlay HTML present. Edit prompt JS present and functional.
12. **Multi-image quality** — All 4-6 images are placed, relevant, non-repetitive. Each image has meaningful alt text.
13. **Image-section match** — Each image fits its assigned section's purpose.

---

## PHASE K — DELIVERY

1. **Filename:** `article-{slug}.html` — slug from title, lowercase, hyphens, max 60 chars.
2. **Write** to project root (or configured output folder).
3. **Return delivery report:**

```
ARTICLE DELIVERY REPORT
========================
File: [filename]
Title: [article title]
Domain: [domain] (locked — drift check: passed/failed)
Adaptation: [mode] — shell from [source], components from [source]
Word count: ~[N]
Sections: [N]
Components: [N] unique types — [list]
Images: [N] (4-6, Gemini-generated) — [filenames]
Table of Contents: [N] entries (sidebar + inline)
Layout: two-column (article + sticky sidebar TOC)
Trust elements: [list]
Meta description: [description]
Keywords: [keywords]

Editable sections: [N]
Section edit UI: integrated
Edit prompt system: functional
Section IDs: [list of all section-{N} IDs]

Design tokens applied:
- Primary: [color]
- Font heading: [font]
- Font body: [font]

Image placements:
- [filename] → Section [N] ([type])
- [for each image]

Consistency checks:
- Domain integrity: passed
- Tone consistency: passed
- Robotic language: passed
- Transitions: smooth
- CTA tone: appropriate
- Structure match: matches architecture
- Fact attribution: all attributed
- Trust layer: complete ([N] elements)
- Sidebar TOC: [N] entries, anchors verified, layout correct
- Section ID stability: all stable
- Section edit UI: all triggers present, overlay functional
- Multi-image quality: [N] images, all relevant and varied
- Image-section match: all verified
```

---

## CRITICAL RULES

- **DOMAIN INTEGRITY IS NON-NEGOTIABLE.**
- **PROJECT-AGNOSTIC:** Never hardcode brand-specific values. Use detected or provided tokens.
- NEVER copy text verbatim from writing samples.
- Every `<img>` must have meaningful `alt`.
- All CSS inline or in `<style>` tags (no external stylesheets beyond CDN fonts).
- Use design tokens for all colors, fonts, spacing.
- Image paths: `images/` prefix (relative, no leading slash).
- HTML must render correctly when opened directly in browser.
- Article must be self-contained.
- Minimum 8 unique component types (or all available).
- Minimum 4 images, maximum 6.
- Trust elements must look professional, not basic.
- Section edit UI must be clean, professional, and unobtrusive.
- Section edit triggers must not break the page design.
- All sections must have stable data attributes for the edit system.
- The edit prompt generation must produce valid, structured prompts.
- The article should look like it belongs on a premium editorial site.
- **Adaptation mode determines component strategy** — respect it throughout.
- **Registry mode:** use internal structural blueprints + project visual tokens. NEVER freeze Axiom-specific values (green palette, Alexandria/Poppins fonts, specific brand styling).
- **The internal structural registry is the structural source of truth.** The active project provides the visual layer.
