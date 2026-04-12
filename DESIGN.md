# Design Brief: Dr. Arman Kabir's Care

**Tone**: Refined medical minimalism — professional, trustworthy, information-dense clinical UI with purposeful color-coding for instant scanability.

**Palette** (light mode primary, dark lightness +0.10):
| Element | L | C | H | Purpose |
|---------|---|---|---|---------|
| Primary | 0.55 | 0.18 | 200 | Overview, core actions |
| Vitals | 0.60 | 0.15 | 170 | Teal vital signs, BP/Pulse/SpO₂ |
| Investigations | 0.58 | 0.17 | 260 | Purple lab results, graphs |
| History | 0.65 | 0.16 | 50 | Amber past medical/surgical |
| Prescriptions | 0.58 | 0.19 | 10 | Rose/red medications, drugs |
| Appointments | 0.62 | 0.15 | 130 | Green calendar, scheduling |
| Pending Approvals | 0.70 | 0.14 | 60 | Orange alerts, pending items |
| Chat | 0.55 | 0.18 | 290 | Indigo messaging, communications |
| Account | 0.48 | 0.12 | 250 | Slate settings, profile |

**Clinical Summary sections** (same hue map as tabs above).

**Typography**: Bricolage Grotesque (display, 600–700 wt) + Plus Jakarta Sans (body, 400–600 wt). Type scale: 12, 14, 16, 18, 20, 24, 28, 32.

**Structural Zones**:
| Zone | Treatment | Purpose |
|------|-----------|---------|
| Header (breadcrumb, icons) | `bg-card` + `border-b` | Clear separation, sticky |
| Left Sidebar (tabs) | `bg-sidebar-background` + color-coded indicators | Visual navigation with tab colors |
| Main Content | `bg-background` | Neutral reading area |
| Patient Card | `bg-card` + `shadow-card` | Information hierarchy |
| Vitals/Investigation Cards | Color-coded `bg-tab-*` at 10% opacity | Subtle section identification |

**Shapes**: `rounded-lg` (0.5rem) for cards, `rounded-sm` (0.375rem) for inputs, no radii on tab bar.

**Shadows**: `shadow-card` (subtle elevation), `shadow-elevated` (modal/overlay).

**Motion**: Fade + slide on tab switches (200ms), no bouncing animations.

**Constraints**: No decoration, no gradients, no blur effects — pure clarity.

**Signature Detail**: Each clinical summary section (C/C, P/M/H, History, D/H, O/E, Investigation, Advice) is visually distinct via background color + left border, making the visit data structure instantly scannable at a glance.

**Responsive**: Mobile-first, full-width tabs on small screens (<md), left sidebar on desktop (≥md). Patient card grid wraps to stack on mobile.
