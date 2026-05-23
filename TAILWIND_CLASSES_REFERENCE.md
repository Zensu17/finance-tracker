# 📚 Tailwind CSS Classes Reference - Mobile Responsive

Quick reference for all responsive classes used in the mobile-optimized Finance Tracker.

---

## 🎨 Responsive Breakpoints

| Breakpoint | Width | Device |
|-----------|-------|--------|
| *Default* | < 640px | Mobile (iPhone SE) |
| `sm:` | ≥ 640px | Small tablet |
| `md:` | ≥ 768px | iPad |
| `lg:` | ≥ 1024px | Desktop |
| `xl:` | ≥ 1280px | Large desktop |

---

## 📐 Layout Classes

### Containers
```tailwind
w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8
```
**Used in:** Main container, ensures full width with progressive padding

### Flex Layouts
```tailwind
flex flex-col md:flex-row gap-3 md:gap-4
```
**Used in:** Header, filter bar, stacked layouts

### Grid Layouts
```tailwind
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6
```
**Used in:** Summary cards, responsive grids

---

## 🔘 Button & Input Classes

### Touch-Friendly Buttons
```tailwind
py-3 md:py-2 min-h-12 md:min-h-auto active:scale-95 transition-colors
```
**Height:** 48px mobile, 32px desktop
**Feedback:** Scale down on tap
**Used in:** All buttons, form submission

### Form Inputs
```tailwind
w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl
focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50
```
**Features:**
- Full width on all sizes
- Large text (text-base) on mobile to prevent iOS zoom
- Proper focus states
- Consistent styling

### Selects & Dropdowns
```tailwind
appearance-none w-full pl-3 pr-8 py-3 md:py-2 text-base md:text-sm border border-stone-200
```
**Features:**
- Full width
- Large touch target
- Right padding for custom arrow icon

---

## 📝 Text Scaling

### Responsive Text Sizes
```tailwind
text-base md:text-sm              /* 16px mobile → 14px desktop */
text-lg md:text-base              /* 18px → 16px (headers) */
text-xs                           /* 12px (labels, always small) */
text-sm                           /* 14px (descriptions) */
```

**Why `text-base` on mobile?**
- 16px is the iOS auto-zoom threshold
- Prevents unwanted zoom when focusing inputs
- More readable on small screens
- Better accessibility

---

## 🎯 Spacing & Gaps

### Padding - Containers
```tailwind
px-4                   /* 16px horizontal (mobile) */
px-6 md:px-6          /* 24px horizontal (tablets) */
px-8                   /* 32px horizontal (desktop - through max-w container) */

py-6 md:py-8          /* 24px → 32px vertical */
p-4 md:p-6            /* All sides: 16px → 24px */
```

### Padding - Components
```tailwind
py-3 md:py-2.5        /* 12px → 10px (form fields) */
py-4 md:py-3          /* 16px → 12px (list items) */
px-3 py-2             /* Input padding */
```

### Gaps - Grid & Flex
```tailwind
gap-3                 /* 12px gap */
gap-4 md:gap-6        /* 16px → 24px gap (responsive) */
gap-2                 /* 8px gap (tight spacing) */
```

---

## 🔠 Icon & Component Sizing

### Icon Sizes
```tailwind
w-10 h-10 md:w-8 md:h-8                    /* 40px mobile → 32px desktop */
w-8 h-8 md:w-6 md:h-6                      /* 32px → 24px */
w-7 h-7 md:w-6 md:h-6                      /* 28px → 24px */

<Plus size={18} className="md:w-4 md:h-4" /> /* 18px → 16px with responsive class */
```

### Card Sizing
```tailwind
bg-white rounded-2xl border border-stone-100 p-5 w-full
```
**Features:**
- Full width
- Consistent padding
- Responsive border radius

---

## 🎭 Responsive Display

### Hide/Show on Screens
```tailwind
hidden sm:block              /* Hide mobile, show on 640px+ */
hidden md:block              /* Hide mobile/tablet, show on 768px+ */
block md:hidden              /* Show mobile/tablet, hide on 768px+ */
```

**Used in:**
- User info text in header (hidden on mobile, shown on tablet+)
- Desktop-only navigation
- Mobile-specific UI elements

---

## 🎨 Color & Background

### Text Colors
```tailwind
text-stone-900               /* Primary text */
text-stone-500               /* Secondary text */
text-stone-400               /* Tertiary text */
text-emerald-600             /* Income (positive) */
text-rose-500                /* Expense (negative) */
```

### Background Colors
```tailwind
bg-stone-50                  /* Input background, light */
bg-stone-100                 /* Cards, backgrounds */
bg-white                     /* Containers, cards */
bg-stone-900 hover:bg-stone-800  /* Primary button */
```

---

## 📏 Border & Radius

### Borders
```tailwind
border border-stone-100      /* Light gray border */
border-b border-stone-100    /* Bottom border only */
rounded-xl                   /* 12px border radius */
rounded-2xl                  /* 16px border radius (cards) */
rounded-full                 /* 50% (avatars) */
```

---

## 🎭 Interactive States

### Hover States
```tailwind
hover:bg-stone-100           /* Background on hover */
hover:text-stone-700         /* Text color on hover */
hover:border-stone-300       /* Border on hover */
```

### Focus States
```tailwind
focus:outline-none
focus:ring-2 focus:ring-stone-900
focus:border-transparent
```

### Active States
```tailwind
active:scale-95              /* Scale down on tap */
active:bg-stone-50           /* Background on active */
group-hover:opacity-100      /* Show on parent hover */
```

---

## 📋 Complete Component Examples

### Responsive Button
```tailwind
<button className="flex items-center justify-center gap-2 bg-stone-900 text-white 
  text-base md:text-sm font-medium px-4 md:px-3.5 py-3 md:py-2 rounded-xl 
  hover:bg-stone-800 transition-colors active:scale-95 min-h-12 md:min-h-auto">
  <Plus size={18} className="md:w-4 md:h-4" />
  Add
</button>
```

### Responsive Input Field
```tailwind
<input 
  type="text" 
  placeholder="Search..."
  className="w-full pl-9 pr-3 py-3 md:py-2 text-base md:text-sm 
  border border-stone-200 rounded-xl focus:outline-none focus:ring-2 
  focus:ring-stone-900 focus:border-transparent bg-stone-50" 
/>
```

### Responsive Card
```tailwind
<div className="bg-white rounded-2xl border border-stone-100 p-5 w-full">
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm font-medium text-stone-700">Title</span>
    <button className="text-xs text-stone-400 hover:text-stone-700">Edit</button>
  </div>
  {/* Content */}
</div>
```

### Responsive Grid
```tailwind
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {/* Cards automatically flow based on screen size */}
  <Card />
  <Card />
  <Card />
</div>
```

### Responsive Flex Stack
```tailwind
<div className="flex flex-col sm:flex-row gap-3 md:gap-4">
  {/* Stacks vertically on mobile, horizontally on 640px+ */}
  <div className="flex-1">Item 1</div>
  <div className="flex-1">Item 2</div>
</div>
```

---

## 🚀 Best Practices

### 1. Mobile-First Approach
```tailwind
/* GOOD - Mobile-first */
<div className="w-full px-4 md:px-6 py-3 md:py-2">
  
/* BAD - Desktop-first */
<div className="px-6 py-2 sm:px-4 sm:py-3">
```

### 2. Touch Targets
```tailwind
/* GOOD - 48px on mobile */
<button className="py-3 md:py-2 min-h-12 md:min-h-auto">

/* BAD - Too small on mobile */
<button className="py-2 px-3">
```

### 3. Text Sizes
```tailwind
/* GOOD - Prevents iOS zoom */
<input className="text-base md:text-sm">

/* BAD - Triggers iOS zoom */
<input className="text-sm">
```

### 4. No Fixed Widths
```tailwind
/* GOOD - Responsive widths */
<div className="w-full max-w-7xl mx-auto">

/* BAD - Fixed width breaks on mobile */
<div className="w-[500px]">
```

### 5. Responsive Gaps
```tailwind
/* GOOD - Proportional spacing */
<div className="gap-4 md:gap-6">

/* BAD - Same gap everywhere */
<div className="gap-6">
```

---

## 🎯 Quick Copy-Paste Classes

### Button (All Sizes)
```tailwind
py-3 md:py-2 min-h-12 md:min-h-auto active:scale-95
```

### Input Field
```tailwind
w-full py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl
```

### Container
```tailwind
w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8
```

### Grid (3-col responsive)
```tailwind
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6
```

### Flex Stack
```tailwind
flex flex-col md:flex-row gap-3 md:gap-4
```

### Card
```tailwind
bg-white rounded-2xl border border-stone-100 p-5 w-full
```

### Text (Mobile-safe)
```tailwind
text-base md:text-sm
```

---

## 📊 Breakpoint Decision Tree

```
Is it a layout/direction?
├─ YES → Use sm: (640px)
│
Is it padding/spacing?
├─ YES → Use md: (768px)
│
Is it a major layout change (2→3 cols)?
├─ YES → Use lg: (1024px)
│
Is it about hiding/showing?
├─ YES → Use sm: or md: depending on context
│
Is it text size?
├─ YES → Use md: (768px) - usually text-base → text-sm
│
Is it component sizing (buttons, icons)?
├─ YES → Use md: (768px)
```

---

## ✨ Performance Tips

### File Size
- CSS size: 20.92KB total (4.56KB gzipped)
- Minimal increase from responsive classes
- All classes are production-optimized

### Loading
- No custom CSS required
- Pure Tailwind utilities
- No expensive calculations

### Rendering
- CSS Grid layout: performant
- Flexbox layout: performant
- No JavaScript for responsive behavior

---

**Reference Version:** 1.0  
**Last Updated:** May 23, 2026  
**Status:** Production Ready ✅
