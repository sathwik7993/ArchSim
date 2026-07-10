# ArchSim UI/UX Design System

This document specifies the typography, color palettes, interactive states, and component styling guidelines for the ArchSim frontend client. The design language is professional, dark-first, and utility-driven, prioritizing high data density and visual clarity.

---

## 1. Design Language Philosophy
ArchSim is a technical simulation environment, not a gaming platform or a simple drawing tool. Its aesthetics are inspired by high-end IDEs, CAD software, and system monitoring consoles (e.g., AWS Console, Grafana, Wireshark, Figma).
* **High Contrast & Data Density**: Minimize padding to ensure complex architectures and dashboards fit on single screen boundaries.
* **Functional Gradients**: Gradients should only be used to denote active traffic flow, resource utilization scales, or failure severity. Avoid purely decorative gradients.
* **Micro-Animations**: Hover states, signal pulses, and queue processing animations must reflect actual simulation event states.

---

## 2. Color Palette
ArchSim operates on a dark-first color space. Light mode is a secondary configuration that uses high-contrast gray scales.

### 2.1. Brand & Core Neutrals (Dark Theme)

| Token Name | Hex Code | HSL Value | Use Case |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `#0B0C10` | `hsl(225, 40%, 5%)` | Main simulation canvas background |
| `bg-panel` | `#1F2833` | `hsl(215, 24%, 16%)` | Sidebar inspectors, logs, dashboards |
| `bg-header` | `#151B24` | `hsl(216, 26%, 11%)` | Top navigation bar |
| `text-primary` | `#F5F7FA` | `hsl(210, 20%, 97%)` | High-importance text, titles, values |
| `text-secondary` | `#C5C6C7` | `hsl(204, 2%, 78%)` | Labels, paragraph text, secondary UI |
| `border-subtle` | `#2D3748` | `hsl(220, 23%, 23%)` | Borders between panels, grid cells |

### 2.2. Functional Semantic Colors

| State / Meaning | Hex Code | HSL Value | Usage |
| :--- | :--- | :--- | :--- |
| **Healthy / Normal** | `#4E9F3D` | `hsl(110, 44%, 43%)` | Healthy node borders, successful requests |
| **Degraded / Warning** | `#FF9F29` | `hsl(33, 100%, 58%)` | CPU throttling, queue alerts, high lag |
| **Failed / Critical** | `#D80032` | `hsl(346, 100%, 42%)` | Crashed nodes, severed connections, packet loss |
| **Active Traffic** | `#00A8CC` | `hsl(191, 100%, 40%)` | Request packets flowing, WebSocket sync pulses |

---

## 3. Typography
ArchSim uses modern, geometric sans-serif fonts to ensure readability of micro-text (e.g., metric numbers, queue sizes).

* **Primary Font Family**: `Inter`, `Roboto`, `system-ui`, `-apple-system`, `sans-serif`.
* **Monospace Font Family (Logs, JSON, Code)**: `JetBrains Mono`, `Fira Code`, `monospace`.

### Font Sizes & Weights
* **H1 (Page Header)**: `1.5rem (24px)` | Bold (700)
* **H2 (Sidebar Sections)**: `1.125rem (18px)` | Semi-Bold (600)
* **Body / Controls**: `0.875rem (14px)` | Regular (400) / Medium (500)
* **Metrics / Code Labels**: `0.75rem (12px)` | Monospace / Regular (400)

---

## 4. Visual Component Accents & Borders
* **Border Radii**: Default border-radius for panels and containers is `4px` or `6px` (sharp, clean edges). Circle nodes (e.g., endpoints) use `50%`.
* **Shadows**:
  * Panels: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);`
  * Floating Nodes: `box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.6);`

---

## 5. Web Application Development Rules
* **Styling Framework**: Utilize Vanilla CSS or TailwindCSS with strict class organization rules.
* **Component-Level Styling**: No styling should be ad-hoc. All styles must use CSS Custom Properties (Variables) defined in `index.css`:
  ```css
  :root {
    --bg-canvas: #0B0C10;
    --bg-panel: #1F2833;
    --text-primary: #F5F7FA;
    --color-healthy: #4E9F3D;
    --color-failed: #D80032;
  }
  ```
* **Transitions**: Use CSS animations with `cubic-bezier(0.4, 0, 0.2, 1)` transitions for hover state transformations to ensure responsive feeling:
  * Hover duration: `150ms`.
  * Status transition: `300ms` (fade in/out of warnings).
