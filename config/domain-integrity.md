# Domain Integrity Rules — Single Authority

> **This is the single source of truth for domain integrity enforcement.**
> All agents and pipeline steps MUST reference this file for domain rules.
> Do not duplicate these rules elsewhere — import by reference.

## Core Principle

**The topic determines the article domain. The website determines the presentation.**

- "Manchester United" on a logistics site → football article, logistics site's visual style
- "Quantum Computing" on a bakery blog → physics article, bakery blog's visual style
- NEVER force a topic into the website's industry
- The website is the PUBLISHER, not the SUBJECT

## Classification Rules

- `classify_before_research: true` — domain MUST be locked before any research begins
- `domain_lock_enforcement: strict` — once locked, domain cannot drift
- `drift_detection: automatic` — all agents monitor for drift
- `drift_threshold: 20%` — if >20% of content doesn't match the locked domain, flag for review

## Website Industry Usage

- `website_industry: auto` — detected from project analysis
- Used ONLY for drift detection, NEVER for content shaping
- The website's industry informs visual style, not article content
- If the topic is "AI in healthcare" and the website sells shoes, the article is about healthcare AI — styled like a shoe website

## Domain Lock Protocol

1. **Step 1 (Input Normalization):** Parse topic, extract domain signal
2. **Step 2 (Domain Classification):** Classify into domain category, lock it
3. **All subsequent steps:** Respect the locked domain — research, architecture, images, writing
4. **Drift check:** At Steps 9 (research), 11 (architecture), 17 (writing), verify content matches locked domain

## Enforcement Points

| Step | Agent | Check |
|------|-------|-------|
| 2 | SKILL.md (inline) | Domain classification and lock |
| 9 | research-engine | Research stays within topic domain |
| 11 | article-architect | Architecture reflects topic, not website industry |
| 12-14 | image-generator | Image prompts match topic domain |
| 17 | draft-writer | Written content stays in topic domain |
| 19 | SKILL.md (inline) | Visual trust moderation — final domain check |

## Banned Cross-Domain Patterns

These indicate domain drift and must be caught:
- Article about "football" containing logistics terminology
- Article about "AI" using the website owner's product as main subject
- Research results from website's industry mixed into unrelated topic
- Images depicting website's business instead of article topic

## Agent Reference Instructions

All agents should include this line rather than duplicating rules:
```
Domain integrity: Follow rules in config/domain-integrity.md (single authority).
```
