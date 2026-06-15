# Attestify — Figma AI Design Brief ("Aurora Ledger")

A premium, production-grade design system + screen prompts for a blockchain
credential platform. Original art direction. Use the **Master Prompt** once to
set the system, then paste each **Screen Prompt** to generate that frame.

---

## 0. How to use with Figma AI
1. In Figma → **Make / First Draft**, paste the **Master Prompt** first.
2. Then generate screens one at a time with each **Screen Prompt** (they're self-contained).
3. Keep the **Design Tokens** section pinned — reference it in every prompt so the
   output stays consistent.

---

## 1. Master Prompt (paste first)

> Design a high-end, production-grade web application called **Attestify** — a
> blockchain credential-attestation platform (universities issue tamper-proof
> digital degrees; anyone verifies them on-chain). Audience: universities,
> employers, students, and the public. The product must feel like a funded
> fintech/Web3 SaaS (think Linear × Stripe × Etherscan), NOT a student project.
>
> **Art direction — "Aurora Ledger":** dark, cinematic, trustworthy, data-forward.
> A near-black cosmic-slate canvas with soft aurora mesh-gradient glows (indigo →
> violet → cyan), glassmorphic surfaces with hairline borders and 24px blur,
> subtle film grain, and gentle neon edge-lighting on primary actions. Generous
> whitespace, large confident typography, precise 8-pt grid. Crisp data
> visualization. Micro-interactions everywhere (hover lift, count-ups, scroll
> reveals, shimmer skeletons). Ship a matching clean **Light ("Daylight")** theme.
>
> Use the design tokens, type scale, components, and motion language defined below.
> Everything pixel-aligned to an 8-pt grid, AA contrast, responsive (desktop-first,
> graceful mobile).

---

## 2. Design Tokens

### Color — Dark (primary)
| Token | Hex | Use |
|---|---|---|
| canvas | `#07090F` | page background |
| surface-1 | `#0E1320` | sidebar / chrome |
| surface-2 | `#141B2D` | cards |
| surface-3 | `#1B2438` | hover / elevated |
| border | `#232E45` | hairlines |
| glass-fill | `rgba(255,255,255,.04)` | glass panels |
| glass-border | `rgba(255,255,255,.08)` | glass edges |
| text-1 | `#F4F6FB` | primary text |
| text-2 | `#9AA4BD` | secondary |
| text-3 | `#5E6A86` | muted / captions |
| **brand gradient** | `#6D5EF5 → #8B5CF6 → #22D3EE` | signature (logo, CTAs, charts) |
| accent-solid | `#7C6CF6` | primary fills |
| success | `#34D399` · warning `#FBBF24` · danger `#FB7185` · info `#38BDF8` |

### Color — Light ("Daylight")
canvas `#F7F8FC` · surface `#FFFFFF` · border `#E6E9F2` · text-1 `#0F1426` ·
text-2 `#5A6party→#5A647E` · accent `#6D5EF5` (white text on accent).

### Typography
- **Display / headings:** *Sora* (or *Clash Display* / *General Sans*) — geometric, premium.
- **Body / UI:** *Inter*.
- **Mono (hashes, wallet addresses, tx):** *JetBrains Mono*.
- Scale (px / line-height / tracking):
  Display 56 / 1.05 / −0.02em · H1 40 / 1.1 · H2 30 / 1.15 · H3 22 / 1.2 ·
  Title 18 / 1.3 · Body 15 / 1.55 · Small 13 · Caption 12 · Mono 13.

### Spacing / Radius / Elevation / Motion
- 8-pt grid (4px base). Section padding 80–120px. Card padding 24–28px. Gaps 16–24px.
- Radius: sm 10 · md 14 · lg 20 · xl 28 · pill 9999. Cards = 20.
- Shadows: layered soft (`0 1 2`, `0 8 24 rgba(0,0,0,.4)`) + **colored glow** on primary `0 8 30 rgba(124,108,246,.35)`.
- Motion: ease `cubic-bezier(.22,1,.36,1)`, 200–500ms; hover lift 4–6px; count-up numbers; scroll-reveal (fade+rise 16px); shimmer skeletons; smooth page transitions.
- Icons: **Lucide / Phosphor**, 1.6 stroke. Data-viz: gradient area lines, donut with center KPI, sparklines, animated bars, "live" pulse dots.
- Texture: faint blueprint dot-grid, aurora blobs, 3% grain overlay, glowing hash/chain motif.

---

## 3. Component Library (generate as a components page)
Buttons (primary gradient w/ glow, secondary glass, ghost, danger; sizes sm/md/lg; loading) ·
Inputs/Select/Textarea (glass field, focus = gradient ring) · Tabs/Segmented · Badge/Status
chips (success/warning/danger/info/neutral, soft-fill + border) · Card / Glass panel ·
KPI Stat card (label, big number, delta chip, sparkline, icon) · Data table (sticky header,
row hover, mono cells for hashes, pagination) · Toast · Modal/Drawer · Sidebar nav item
(active = gradient left-bar + glow) · Top bar (search, theme toggle, network status pill,
avatar) · Empty state · Skeleton · QR card · Stepper · File-dropzone.

---

## 4. Screen Prompts (paste one at a time)

**4.1 Landing / Marketing**
> Design the Attestify public landing page (Aurora Ledger system). Sticky glass
> top-nav: gradient shield-check logo + "Attestify", links (Apply, Students,
> Explorer, Verify), theme toggle, "Sign In" gradient button. Hero: a live
> "● On-chain" pulse pill, a huge display headline "Credentials you can trust —
> proven on the blockchain.", subcopy, two CTAs (primary gradient "Verify a
> credential", glass "For institutions"), and a floating glass dashboard preview
> with aurora glow behind it. A live stats strip (count-up KPIs: Credentials
> On-Chain, Verifications, Avg verify time, 256-bit AES). Feature grid (6 glass
> cards w/ gradient icons). 3-step "How it works" with connected nodes. A
> transparency band linking to the Explorer. Footer with logo, columns, network
> status. Cinematic, lots of negative space.

**4.2 Sign In**
> Centered glass auth card floating on an animated aurora background with faint
> blueprint grid. Top: gradient shield logo + "Attestify" + tagline. Email +
> password (glass fields, gradient focus ring), "Sign In" gradient button, demo-
> account quick-fill chips, link "Verify a credential without signing in". Premium,
> minimal, no split-screen.

**4.3 Admin Dashboard (the hero screen)**
> Dashboard with a fixed glass sidebar (logo, nav with active gradient bar:
> Dashboard, Requests, Issuance, Ledger, Verify, Explorer, Audit, Users; theme
> toggle; live network pill; user card) and a top bar (breadcrumb, search,
> notifications, avatar). Content: a row of 5 KPI stat cards (On-Chain,
> Verifications, Fraud Attempts, Revoked, Unauthorized) each with delta chip +
> sparkline. Analytics row: a large gradient area-chart "Issuance trend (30d)", a
> donut "Verification results" with center KPI, an animated bar "Event frequency".
> A "Review queue" panel (Pending/Approved/Rejected counts + CTA). A "Recent
> on-chain activity" table with mono tx hashes + status chips + relative time.
> Dense but elegant, all on the 8-pt grid.

**4.4 Attestation Requests (approval workflow)**
> A review-queue screen. Segmented filter (All / Pending / Approved / Rejected with
> counts). A list of application rows (avatar, applicant, program, fee, REF mono,
> status chip, "Review" button). Clicking opens a right-side **drawer**: applicant
> details, fee, encrypted-PII note, and actions "Approve & Issue ⛓" (gradient) and
> "Reject" (danger) with a reason field; show an "issuing on-chain…" progress state.

**4.5 Issue Credential**
> Two-column: left a clean multi-field form (student name, ID, program, graduation
> date, national ID [marked AES-256 encrypted], wallet key [masked]); right an
> animated "cryptographic hashing" visual (orbiting nodes) that resolves into the
> generated keccak256 hash, then a success state (Credential ID, holder, block ref,
> COMMITTED TO LEDGER, hash, "Download certificate"). Premium, reassuring.

**4.6 Bulk Issuance**
> A CSV batch screen: a drag-and-drop dropzone + "download template" link, a preview
> table of parsed rows with per-row status chips (Ready / Issuing… / On-chain ✓ /
> Failed), a sticky summary bar (X issued · Y failed) and an "Issue all on-chain" CTA.

**4.7 Degree Ledger**
> An immutable on-chain registry table: sticky glass header, columns (Credential ID,
> Holder, Program, CNIC, Hash [mono, truncated, copy], Block Ref, Date, Status chip),
> search + filters, pagination, a subtle "all committed" indicator. Etherscan-style.

**4.8 Public Verify**
> A focused verification screen: a single large input "Paste credential hash or scan
> QR", a gradient "Verify on blockchain" button, then a big result card — VALID
> (success glow), REVOKED (amber), or INVALID/FRAUD (danger) — with credential
> details, tx hash link, and read time in ms. Trust-forward.

**4.9 Credential Explorer**
> A public, Etherscan-style transparency page: KPI counters (count-up), a "● Live"
> auto-refresh badge, and a streaming feed of on-chain events (type chip, short
> actor, tx hash link, relative time) in a glass list. Confident, data-rich.

**4.10 Student Portal**
> Public self-service: a hero search "Enter your Student ID", then a credential card
> (avatar, name, program, VERIFIED ✓ / REVOKED chip, graduation + issued dates, mono
> hash) with actions "View / Download Certificate" and "Public verification link".

**4.11 Certificate (printable)**
> An elegant landscape diploma on cream paper: institutional crest, "Certificate of
> Degree", recipient name in serif display, program, conferral date, registrar
> signature line, a circular wax-style "Blockchain Verified" seal, a QR (deep-links
> to verification), and the full hash. A faint guilloché watermark. Print-perfect.

**4.12 Audit Log & User Management**
> Audit: append-only event table (timestamp, actor, action chip, target/detail,
> level chip Success/Info/Warning/Error) with tab filters + "tamper-proof" note.
> Users: RBAC table (avatar, user, role chip, status Active/Suspended, last login,
> Edit/Revoke actions) + "Register user" + "Grant on-chain role" panels.

---

## 4b. Brand assets & component sheet (paste one at a time)

**Logo / Brand mark**
> Design the **Attestify** logo. A geometric shield fused with a checkmark, formed
> from a single continuous stroke that also reads as a subtle "A". Fill it with the
> brand gradient (indigo `#6D5EF5` → violet `#8B5CF6` → cyan `#22D3EE`), soft outer
> glow. Provide: (1) icon-only mark in a rounded-square app tile, (2) horizontal
> lockup "△ Attestify" in Sora SemiBold, (3) monochrome white + monochrome dark
> versions, (4) on-dark and on-light placements. Crisp at 16px and 512px.

**Favicon**
> Export the Attestify shield-check icon as a favicon set on the deep canvas
> `#07090F` rounded tile with the gradient mark centered and a faint glow. Provide
> 16, 32, 48, 180 (apple-touch), 512 sizes. Legible as a tiny silhouette.

**OG / social share image (1200×630)**
> Design an Open Graph image for Attestify. Dark cosmic-slate background with aurora
> mesh glow and a faint blueprint grid. Left: the logo lockup + headline
> "Credentials, proven on-chain." + a one-line subhead + a "● Live on Ethereum"
> pill. Right: a floating glass dashboard/certificate preview with gradient edge
> glow and a QR motif. Premium, high-contrast, readable as a thumbnail.

**Component sheet (one frame)**
> Generate an Attestify component sheet on a dark canvas, organized in labeled
> sections on an 8-pt grid: Buttons (primary gradient w/ glow, secondary glass,
> ghost, danger; sm/md/lg; default/hover/loading/disabled) · Inputs, Select,
> Textarea, Search, File-dropzone (default/focus gradient-ring/error) · Tabs &
> Segmented control · Status chips (success/warning/danger/info/neutral) · KPI stat
> card (label, big number, delta chip, sparkline, icon) · Glass card · Data-table
> row (mono hash cell + copy, status chip) · Toast · Modal & right Drawer · Sidebar
> nav item (default/active gradient bar) · Top bar · Badge · Avatar · Skeleton
> shimmer · Empty state · QR card · Pagination. Include the color palette swatches,
> type scale specimen (Sora / Inter / JetBrains Mono), radius + shadow + spacing
> tokens. This is the single source of truth for the system.

**Empty / loading / error states**
> Design Attestify empty, loading, and error states: a tasteful line-art
> illustration with a soft gradient glow, a short heading, one line of guidance, and
> a primary CTA. Skeleton variants use a shimmer sweep. Consistent across tables,
> lists, and search results.

## 5. Polish checklist (make it feel "phenomenal")
Consistent 8-pt rhythm · gradient focus rings · colored glow only on primary ·
mono for every hash/address with copy-on-click · count-up KPIs · skeleton shimmer
while loading · empty states with art · "● live" pulse on real-time data · page
transitions · AA contrast in both themes · a real favicon + OG image.
