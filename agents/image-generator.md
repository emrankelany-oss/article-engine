# Image Generator Agent

Plans, generates, and places 4-6 images per article using Gemini MCP with graceful fallback.

**Dispatched by:** SKILL.md (Steps 12-15)
**Inputs:** Article architecture, topic domain, section structure, research report
**Outputs:** Image plan, generated/placeholder images, image placement map

---

## STEP 12 — IMAGE PLAN CREATION

Before generating images, create a strategic image plan.

**Process:**

1. Review the article architecture, topic, selected idea, and section structure
2. Determine how many images are needed (4-6)
3. For each image slot, decide:
   - Which section it supports
   - What type of image (hero / contextual / atmospheric / infographic-like / supporting visual)
   - What the image should depict
   - Composition and framing guidance
   - Aspect ratio (16:9 for hero, 4:3 for inline)
4. Ensure variety across the image set — no two images should feel the same

**Image Variety Rules:**
- Different compositions (wide landscape, focused detail, overhead, eye-level)
- Different purposes (atmosphere, evidence, context, emotional, structural)
- Different visual framing (close-up, panoramic, environmental, abstract)
- At least one atmospheric/hero image
- At least one contextual/evidence-supporting image
- At least one supporting visual for a key section

**Image Quality Rules:**
- Must match the article topic domain
- Must fit the article tone
- Professional, editorial quality
- No visual mismatch with website style
- No low-value decorative filler
- No repetitive imagery

**Output:**

```
IMAGE PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━
Total images: [4-6]

1. Section [N] — [hero/contextual/atmospheric/supporting]
   Depicts: [description]
   Composition: [framing notes]
   Aspect: [16:9 / 4:3]
   Purpose: [why this section benefits from this image]

[through 4-6]
━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 13 — GEMINI CAPABILITY CHECK (portable)

Before generating images, run a portable capability check using the **Gemini Tool Resolver**. This step makes Gemini integration work in ANY project, not just the one where the MCP server was originally configured.

**CRITICAL: Do NOT hardcode a single tool name.** Use the Gemini Tool Resolver to flexibly detect image generation capability.

**Known Gemini Image Tool Names (checked in order):**

The resolver checks ALL of these against the available tools at runtime:

```
1. mcp__gemini__gemini-generate-image        (standard Gemini MCP)
2. mcp__gemini__generate-image               (alternate naming)
3. mcp__gemini__generate_image               (underscore variant)
4. mcp__gemini__image-generation             (alternate naming)
5. mcp__gemini__create-image                 (alternate naming)
6. Any tool matching pattern: mcp__*gemini*__*image*  (namespace wildcard)
7. Any tool matching pattern: mcp__*gemini*__*generat*  (verb wildcard)
8. Any custom alias from engine-config.md gemini_tool_resolution.allowed_image_tool_aliases
```

**Resolution Strategy (checked in order):**

1. **Skill config override** — if `gemini_tool_resolution.preferred_image_tool_name` is set in engine-config.md, try that exact name first
2. **Known alias matching** — scan all available tools at runtime against the known names list above. If ANY match, Gemini is available. This is the primary portable method — it works regardless of which MCP package or naming convention is used.
3. **Custom alias matching** — check `gemini_tool_resolution.allowed_image_tool_aliases` from engine-config.md for user-configured aliases
4. **Namespace pattern matching** — scan available tools for any tool whose name contains both "gemini" and "image" (case-insensitive)
5. **Project-local .mcp.json** — check `{current_working_directory}/.mcp.json` for a gemini server config (confirms intent even if tool name differs)
6. **User-global config** — check `~/.claude/.mcp.json` or `~/.claude/settings.json` for global MCP server definitions
7. **Graceful fallback** — if none of the above resolve, skip image generation safely

**Capability Check Process:**

```
1. Load known aliases + any custom aliases from engine-config.md
2. Scan available tools against ALL known aliases and patterns
3. If ANY match found:
   a. Record the resolved tool name (the one that actually matched)
   b. Record the detection method (known-alias / custom-alias / pattern-match / config-override)
   c. Set gemini_available = true
   d. Set resolved_image_tool = [matched tool name]
   e. Proceed to Step 14 using resolved_image_tool
4. If NO match found:
   a. Check project-local .mcp.json for gemini server config → report if configured but tool not loaded
   b. Check user-global config → report if configured but tool not loaded
   c. Report which detection steps were attempted and why each failed
   d. Set gemini_available = false
   e. Activate fallback mode (placeholder HTML + exported prompts)
```

**IMPORTANT:** The rest of the pipeline must use `resolved_image_tool` (the name returned by the resolver), NOT a hardcoded tool name. Step 14 calls `resolved_image_tool`, not `mcp__gemini__gemini-generate-image`.

**Output:**

```
GEMINI CAPABILITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━
Resolution strategy:
  1. Config override: [checked / skipped] — [result]
  2. Known alias scan: [checked] — [matched: tool_name / no match]
  3. Custom alias scan: [checked / no custom aliases] — [result]
  4. Pattern match: [checked] — [matched: tool_name / no match]
  5. Project .mcp.json: [found / not found] — [gemini config: yes/no]
  6. Global config: [found / not found] — [gemini config: yes/no]

Resolved tool: [resolved_image_tool or "none"]
Detection method: [config-override / known-alias / custom-alias / pattern-match / project-mcp / global-mcp / none]
Tool available: [yes / no]
Fallback activated: [yes / no]
━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 14 — IMAGE GENERATION (portable)

Generate 4-6 images using the resolved Gemini integration, or activate fallback.

**If Gemini IS available (gemini_available = true):**

1. Use IMAGE PLAN from Step 12 + IMAGE PROMPTS from research
2. Generate each image using `resolved_image_tool` from Step 13 — NEVER hardcode a tool name
3. Parse the MCP output path from each tool response — NEVER assume a fixed path
4. Copy/move each image from the MCP output path to the project's `images/` folder (create if needed)
5. Use relative paths (`images/article-{slug}-{N}.png`) in the HTML
6. After generation, review each image for quality — if weak/irrelevant/repetitive, regenerate (max 2 retries per image)

**If Gemini is NOT available (gemini_available = false):**

Activate the two-level fallback:

- **Level 1 — Placeholder HTML:** Insert `<!-- IMAGE PLACEHOLDER: [description] -->` comments in the HTML where images would go. The article generates normally.
- **Level 2 — Prompt Export:** Output all 4-6 image prompts as a structured list in the delivery report so the user can generate images manually with any tool.

**Image rules:**
- Prompts must match the ACTUAL TOPIC domain
- Style: professional, modern, editorial
- No text in images
- Aspect ratios: 16:9 for heroes, 4:3 for inline
- Each prompt should be unique and specific to its planned purpose
- Minimum 4 images, maximum 6
- Image paths are ALWAYS relative to project root (`images/`)
- NEVER hardcode absolute paths to MCP output directories

**Output:**

```
GENERATED IMAGES
━━━━━━━━━━━━━━━━━━━━━━━━━
Generation mode: [gemini / fallback]
1. [filename] — [type] — [description] — Section [N]
2. [filename] — [type] — [description] — Section [N]
3. [filename] — [type] — [description] — Section [N]
4. [filename] — [type] — [description] — Section [N]
[5. optional]
[6. optional]
━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 15 — IMAGE PLACEMENT

Map generated images to their target sections in the architecture.

**Process:**
1. Match each generated image to its planned section from Step 12
2. Verify image-section fit — does the image support the section's content?
3. If a mismatch exists, reassign or note for the draft writer
4. Confirm final placement map

**Output (append to architecture):**

```
IMAGE PLACEMENT MAP
━━━━━━━━━━━━━━━━━━━━━━━━━
Section [N]: [filename] — [hero/inline/supporting] — [placement notes]
[for each image]
━━━━━━━━━━━━━━━━━━━━━━━━━
```
