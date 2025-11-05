# 🎨 AiFinity Design System

## 📝 Typography

### Primary Font Family
**Font Name:** Inter  
**Source:** Google Fonts  
**Weights Available:** 300, 400, 500, 600, 700, 800, 900  
**Fallback:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Font Sizes
- **Headers:** `text-lg` (18px) to `text-2xl` (24px)
- **Body:** `text-sm` (14px) to `text-base` (16px)
- **Labels:** `text-xs` (12px) to `text-[10px]` (10px)
- **Numbers:** Tabular numerals for alignment

---

## 🎨 Color Palette

### Primary Brand Colors

#### Purple Gradient (Primary Brand)
**Usage:** Main buttons, active states, navigation, primary CTAs

- **Start:** `#667eea`
  - **RGB:** `rgb(102, 126, 234)`
  - **CMYK:** `56, 46, 0, 8`
  - **Pantone (approx):** 2726 C / 2727 C
  
- **End:** `#764ba2`
  - **RGB:** `rgb(118, 75, 162)`
  - **CMYK:** `54, 71, 0, 36`
  - **Pantone (approx):** 266 C / 267 C

**Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`

#### Indigo (Secondary Accent)
**Usage:** Secondary buttons, highlights, AI assistant

- **Indigo 600:** `#4f46e5`
  - **RGB:** `rgb(79, 70, 229)`
  - **Pantone (approx):** 2735 C

#### Purple-Indigo Gradient
**Usage:** Chat header, AI features
- **From:** `#9333ea` (Purple 600)
- **To:** `#4f46e5` (Indigo 600)

---

### Status Colors

#### Success (Green)
**Usage:** Positive metrics, income, savings, good status

- **Start:** `#11998e`
  - **RGB:** `rgb(17, 153, 142)`
  - **Pantone (approx):** 3272 C
  
- **End:** `#38ef7d`
  - **RGB:** `rgb(56, 239, 125)`
  - **Pantone (approx):** 352 C

**Gradient:** `linear-gradient(135deg, #11998e 0%, #38ef7d 100%)`

**Solid Variants:**
- Green 600: `#16a34a` (Income, positive values)
- Emerald 600: `#059669` (Savings)

#### Danger (Red)
**Usage:** Expenses, warnings, negative values, alerts

- **Start:** `#eb3349`
  - **RGB:** `rgb(235, 51, 73)`
  - **Pantone (approx):** 186 C
  
- **End:** `#f45c43`
  - **RGB:** `rgb(244, 92, 67)`
  - **Pantone (approx):** 173 C

**Gradient:** `linear-gradient(135deg, #eb3349 0%, #f45c43 100%)`

**Solid Variants:**
- Red 600: `#dc2626` (Expenses, critical alerts)
- Rose 600: `#e11d48` (Debt warnings)

#### Warning (Amber/Orange)
**Usage:** Caution states, medium priority alerts

- **Amber 600:** `#d97706`
  - **RGB:** `rgb(217, 119, 6)`
  - **Pantone (approx):** 157 C

- **Orange 600:** `#ea580c`
  - **RGB:** `rgb(234, 88, 12)`
  - **Pantone (approx):** 165 C

#### Info (Blue)
**Usage:** Information, neutral metrics, balance

- **Blue 600:** `#2563eb`
  - **RGB:** `rgb(37, 99, 235)`
  - **Pantone (approx):** 286 C

- **Cyan 600:** `#0891b2`
  - **RGB:** `rgb(8, 145, 178)`
  - **Pantone (approx):** 314 C

---

### Neutral Colors

#### Light Mode Backgrounds
- **Background Gradient Start:** `#f5f7fa`
  - **RGB:** `rgb(245, 247, 250)`
  - **Pantone (approx):** Cool Gray 1 C
  
- **Background Gradient End:** `#e4e9f2`
  - **RGB:** `rgb(228, 233, 242)`
  - **Pantone (approx):** Cool Gray 3 C

- **Card Background:** `#ffffff` (White)
- **Card Border:** `#e5e7eb` (Gray 200)

#### Dark Mode Backgrounds
- **Background Gradient Start:** `#1e293b` (Slate 800)
  - **RGB:** `rgb(30, 41, 59)`
  
- **Background Gradient End:** `#334155` (Slate 700)
  - **RGB:** `rgb(51, 65, 85)`

- **Card Background:** `#1e293b` (Slate 800)
- **Card Border:** `#374151` (Gray 700)

#### Text Colors

**Light Mode:**
- **Primary Text:** `#1f2937` (Gray 900)
- **Secondary Text:** `#4b5563` (Gray 600)
- **Muted Text:** `#6b7280` (Gray 500)

**Dark Mode:**
- **Primary Text:** `#f3f4f6` (Gray 100)
- **Secondary Text:** `#9ca3af` (Gray 400)
- **Muted Text:** `#6b7280` (Gray 500)

---

### Category Colors

| Category | Color | Hex Code | RGB | Pantone (approx) |
|----------|-------|----------|-----|------------------|
| Income | Green | `#16a34a` | `rgb(22, 163, 74)` | 354 C |
| Expenses | Red | `#dc2626` | `rgb(220, 38, 38)` | 186 C |
| Housing | Purple | `#9333ea` | `rgb(147, 51, 234)` | 266 C |
| Food | Emerald | `#10b981` | `rgb(16, 185, 129)` | 354 C |
| Transport | Blue | `#2563eb` | `rgb(37, 99, 235)` | 286 C |
| Health | Rose | `#e11d48` | `rgb(225, 29, 72)` | 186 C |
| Shopping | Pink | `#db2777` | `rgb(219, 39, 119)` | 219 C |
| Entertainment | Cyan | `#0891b2` | `rgb(8, 145, 178)` | 314 C |
| Education | Teal | `#14b8a6` | `rgb(20, 184, 166)` | 326 C |
| Insurance | Indigo | `#4f46e5` | `rgb(79, 70, 229)` | 2735 C |
| Loans | Orange | `#ea580c` | `rgb(234, 88, 12)` | 165 C |

---

## 🎯 Brand Identity

### Logo Colors
- **Primary:** Purple gradient (`#667eea` → `#764ba2`)
- **Accent:** Indigo (`#4f46e5`)

### Brand Personality
- **Modern:** Clean gradients, smooth transitions
- **Professional:** Inter font, structured layouts
- **Trustworthy:** Blue and purple tones
- **Innovative:** AI-powered features (purple/indigo gradient)

---

## 📐 Design Tokens

### Spacing
- **Base Unit:** 4px
- **Common Spacing:** 4px, 8px, 12px, 16px, 24px, 32px, 48px

### Border Radius
- **Cards:** `rounded-2xl` (16px)
- **Buttons:** `rounded-xl` (12px)
- **Badges:** `rounded-full` (pill shape)
- **Inputs:** `rounded-xl` (12px)

### Shadows
- **Card:** `shadow-lg` (0 10px 15px -3px rgba(0, 0, 0, 0.1))
- **Premium:** `shadow-premium` (0 10px 40px rgba(0, 0, 0, 0.08))
- **Hover:** `shadow-2xl` (0 25px 50px -12px rgba(0, 0, 0, 0.25))

### Transitions
- **Duration:** 300ms (standard), 500ms (animations)
- **Easing:** `ease-out`, `ease-in-out`

---

## 🎨 Usage Guidelines for V0

### Primary Brand Gradient
```
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```
Use for: Primary buttons, active navigation tabs, main CTAs

### Success Gradient
```
background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
```
Use for: Positive metrics, income indicators, savings

### Danger Gradient
```
background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
```
Use for: Expenses, warnings, negative values

### Card Styles
- **Background:** White (`#ffffff`) in light mode, Slate 800 (`#1e293b`) in dark mode
- **Border:** Gray 200 (`#e5e7eb`) in light mode, Gray 700 (`#374151`) in dark mode
- **Radius:** 16px (`rounded-2xl`)
- **Shadow:** `shadow-lg` with hover to `shadow-2xl`

### Typography Hierarchy
- **H1/H2:** `text-2xl` (24px), `font-bold`
- **H3:** `text-lg` (18px), `font-bold`
- **Body:** `text-sm` (14px) to `text-base` (16px), `font-medium`
- **Labels:** `text-xs` (12px), `font-semibold`

---

## 📋 Quick Reference

### Primary Colors (Hex)
- Primary Purple Start: `#667eea`
- Primary Purple End: `#764ba2`
- Success Green Start: `#11998e`
- Success Green End: `#38ef7d`
- Danger Red Start: `#eb3349`
- Danger Red End: `#f45c43`
- Indigo: `#4f46e5`

### Font
- **Family:** Inter
- **Weights:** 300, 400, 500, 600, 700, 800, 900
- **Default:** 400 (Regular)
- **Headers:** 700-900 (Bold to Black)
- **Body:** 400-500 (Regular to Medium)

### Backgrounds
- **Light Mode:** `#f5f7fa` → `#e4e9f2` (gradient)
- **Dark Mode:** `#1e293b` → `#334155` (gradient)

---

## 🔗 Resources

- **Font:** [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- **Color Tool:** Use [Pantone Color Finder](https://www.pantone.com/color-finder) to match exact Pantone codes
- **Gradient Generator:** All gradients use 135deg angle

---

## 📝 Notes for V0

1. **Always use gradients** for primary brand elements (buttons, active states)
2. **Maintain contrast** - ensure text is readable on gradient backgrounds
3. **Use Inter font** throughout the design
4. **Card spacing** - maintain consistent padding (16px-24px)
5. **Hover states** - use scale transform (1.02-1.05) and shadow increase
6. **Dark mode** - ensure all colors have dark mode variants

---

**Last Updated:** 2025-01-11  
**Version:** 1.0

