---
name: omniapi-ui
description: Dedicated UI/UX standards for the OmniAPI project (Futuristic Startup aesthetic).
---
# OmniAPI UI/UX Skill

This skill defines the visual language and user experience standards for the OmniAPI project. It is based on the "Futuristic Startup" design system.

## Core Visual Identity

### 1. Typography (Space Grotesk)
- **Primary Font**: `Space Grotesk` (Google Fonts).
- **Secondary Font**: `Inter` or `DM Sans`.
- **Monospace Font**: `JetBrains Mono` or similar for paths/data.
- **Headings**: Use `font-black` and `tracking-[tight/-tighter]` for a premium feel.

### 2. Color Palette (Cyberpunk Evolution)
- **Background**: `#0a0e14` (Deep Deep Navy).
- **Core Accent**: `#00f1fe` (Cyan).
- **Secondary Accent**: `#9d50ff` (Purple).
- **Visual Depth**: Use `drop-shadow-[0_0_8px_rgba(0,241,254,0.4)]` for important cyan elements.

---

## Layout Standards

### 1. Global Container
- **Max Width**: `max-w-[1600px]`.
- **Horizontal Padding**: `px-8`.
- **Centering**: Always `mx-auto`.

### 2. Navigation
- **Height**: `h-16` (64px) sticky header.
- **Blur**: `backdrop-blur-xl`.
- **Structure**: [Back Button] [Breadcrumb path: Module / Segment] [Search/Actions].

---

## Component Guidelines

### 1. Matrix Tables
- **Proportions**:
    - Method: 12%
    - Path: 20%
    - Description: 28%
    - Source: 18%
    - Level: 15%
    - Action: 7% (Right aligned).
- **Styling**: `rounded-[2rem]`, `bg-white/[0.02]`, `border-white/10`.

### 2. Interactive States
- **Hover**: Transitions MUST be smooth (200-300ms).
- **Cursor**: Always use `cursor-pointer` for cards and interactive table rows.
- **Buttons**: `rounded-xl`. Primary buttons must have a cyan shadow (`shadow-[0_0_20px_rgba(0,241,254,0.3)]`).

---

## Pre-Implementation Checklist
- [ ] Uses `Space Grotesk` for all major headings?
- [ ] Container width limited to `1600px`?
- [ ] No emojis used for UI icons (use Lucide/SVG)?
- [ ] Cyan accents use the correct hex (`#00f1fe`) with glow effects?
- [ ] Back buttons and breadcrumbs present on detail pages?
