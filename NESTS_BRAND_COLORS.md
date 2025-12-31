# Nests Brand Colors - Quick Reference

## Primary Colors
- **Nests Teal** `#53CED1` - Main brand color (buttons, links, headers)
- **Nests Dark Teal** `#0D6F82` - Secondary/emphasis (hover states, subheadings)

## Accent Colors  
- **Nests Green** `#53D195` - Success states, revenue highlights
- **Nests Red** `#D15653` - Errors, warnings, cancellations
- **Nests Yellow** `#E5B853` - Warnings, pending states
- **Nests Orange** `#E37C25` - Special highlights (use sparingly)
- **Nests Lime** `#CED153` - Additional accent

## Gradients
- **Primary Gradient**: `linear-gradient(to right, #53CED1, #0D6F82)`
- **Reversed**: `linear-gradient(to right, #0D6F82, #53CED1)`
- **Teal to Orange**: `linear-gradient(135deg, #53CED1, #E37C25)`

## Typography
- **Headings**: Poppins (400, 500, 600, 700)
- **Body**: Montserrat (400, 500, 600)

## Tailwind Classes
```css
bg-nests-teal          /* #53CED1 */
bg-nests-dark-teal     /* #0D6F82 */
bg-nests-green         /* #53D195 */
bg-nests-red           /* #D15653 */
bg-nests-yellow        /* #E5B853 */
bg-nests-orange        /* #E37C25 */
bg-nests-lime          /* #CED153 */

font-heading           /* Poppins */
font-body              /* Montserrat */

bg-nests-gradient              /* Teal → Dark Teal */
bg-nests-gradient-reverse      /* Dark Teal → Teal */
bg-nests-gradient-orange       /* Teal → Orange */
```

## Usage Examples
```jsx
// Primary button
className="bg-nests-teal hover:bg-nests-dark-teal text-white"

// Success badge
className="bg-nests-green/20 text-nests-green px-3 py-1 rounded-full"

// Header with gradient
className="bg-nests-gradient text-white font-heading"

// Table cell highlight
className="bg-nests-teal/10 text-nests-teal"
```

## Design Rules
✅ Use teal for primary actions
✅ Use green for revenue/success
✅ Use yellow for warnings/totals
✅ Clean borders (no box-shadows)
✅ Poppins for headings
✅ Montserrat for body text

❌ No generic blue colors
❌ No box-shadows
❌ No border-left accent bars
❌ No generic sans-serif fonts
