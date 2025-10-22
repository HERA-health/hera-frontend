# MindConnect - Design System Guide

## Overview
This document outlines the complete design system for MindConnect, ensuring consistency across all screens and components.

---

## 🎨 Color Palette

### Primary Colors
```typescript
primary: {
  main: '#4169E1',      // Royal Blue - main brand color
  light: '#6B8DE3',     // Light blue
  dark: '#2948B8',      // Dark blue
  lighter: '#E0F2FE',   // Very light blue for backgrounds
}
```

### Secondary Colors
```typescript
secondary: {
  green: '#10B981',     // Success/secure green
  purple: '#A855F7',    // Accent purple
  orange: '#F97316',    // Warning/video orange
  pink: '#EC4899',      // Accent pink
  cyan: '#22D3EE',      // Cyan for highlights
}
```

### Neutral Colors
```typescript
neutral: {
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  black: '#000000',
}
```

### Feedback Colors
```typescript
feedback: {
  success: '#10B981',   // Green
  warning: '#F59E0B',   // Orange/Yellow
  error: '#EF4444',     // Red
  info: '#3B82F6',      // Blue
}
```

### Background Colors
```typescript
background: {
  primary: '#FFFFFF',    // White
  secondary: '#F9FAFB',  // Light gray
  tertiary: '#E0F2FE',   // Light blue for badges
  success: '#D1FAE5',    // Light green for badges
  warning: '#FEF3C7',    // Light yellow
  error: '#FEE2E2',      // Light red
  purple: '#F3E8FF',     // Light purple
  pink: '#FCE7F3',       // Light pink
}
```

---

## 📏 Spacing System

Based on a 4px grid system:

```typescript
spacing: {
  xs: 4,      // Minimal spacing
  sm: 8,      // Small spacing
  md: 16,     // Default spacing
  lg: 20,     // Screen padding
  xl: 24,     // Section spacing
  xxl: 32,    // Large section spacing
  xxxl: 48,   // Extra large spacing
}
```

### Usage Guidelines

**Screen Padding:** 20px (`spacing.lg`)
- Consistent horizontal padding on all screens
- Provides breathing room from screen edges

**Card Margins:** 16px (`spacing.md`)
- Space between cards in lists
- Consistent card spacing

**Section Spacing:** 24px (`spacing.xl`)
- Space between major sections
- Visual hierarchy separation

**Element Spacing:** 8px (`spacing.sm`)
- Space between elements within cards
- Label to input spacing

---

## 📝 Typography Scale

### Font Sizes
```typescript
fontSizes: {
  xs: 12,      // Small text, labels, captions
  sm: 14,      // Body text, descriptions
  md: 16,      // Default body text
  lg: 18,      // Subheadings
  xl: 20,      // Subheadings large
  xxl: 24,     // Headings
  xxxl: 28,    // Large headings
  xxxxl: 32,   // Hero headings
}
```

### Font Weights
```typescript
fontWeights: {
  regular: '400',    // Body text
  medium: '500',     // Labels, emphasized text
  semibold: '600',   // Subheadings
  bold: '700',       // Headings
}
```

### Line Heights
```typescript
lineHeights: {
  tight: 1.2,      // Headings (20% extra)
  normal: 1.5,     // Body text (50% extra)
  relaxed: 1.75,   // Comfortable reading (75% extra)
}
```

### Typography Usage

**Page Headings:** 24-28px, bold
```typescript
fontSize: typography.fontSizes.xxl,      // 24px
fontWeight: typography.fontWeights.bold, // 700
```

**Section Headings:** 20-24px, semibold
```typescript
fontSize: typography.fontSizes.xl,          // 20px
fontWeight: typography.fontWeights.semibold, // 600
```

**Subheadings:** 18-20px, semibold
```typescript
fontSize: typography.fontSizes.lg,          // 18px
fontWeight: typography.fontWeights.semibold, // 600
```

**Body Text:** 14-16px, regular
```typescript
fontSize: typography.fontSizes.sm,         // 14px
fontWeight: typography.fontWeights.regular, // 400
lineHeight: typography.lineHeights.normal,  // 1.5
```

**Labels:** 12px, medium
```typescript
fontSize: typography.fontSizes.xs,        // 12px
fontWeight: typography.fontWeights.medium, // 500
```

---

## 🔘 Border Radius

```typescript
borderRadius: {
  sm: 4,       // Small elements
  md: 8,       // Buttons, inputs
  lg: 12,      // Cards
  xl: 16,      // Large cards
  xxl: 20,     // Extra large cards
  full: 9999,  // Circular elements
}
```

---

## 🌑 Shadows

### Shadow Presets
```typescript
shadows: {
  none: { elevation: 0 },   // No shadow
  sm: { elevation: 1 },     // Subtle shadow
  md: { elevation: 3 },     // Card shadow
  lg: { elevation: 5 },     // Elevated card
  xl: { elevation: 8 },     // Modal/overlay
}
```

### Usage
- **Cards:** `shadows.md`
- **Buttons (elevated):** `shadows.sm`
- **Modals:** `shadows.lg`
- **Floating elements:** `shadows.xl`

---

## 👆 Touch Targets

### Minimum Sizes (Accessibility)
```typescript
touchTarget: {
  minHeight: 44,  // Minimum touch target height
  minWidth: 44,   // Minimum touch target width
}
```

### Guidelines
- All buttons must be at least 44px tall
- All clickable elements must have at least 44px touch area
- Provide visual feedback (opacity 0.7) on press
- Ensure proper spacing between touch targets (minimum 8px)

---

## 📐 Layout Constants

```typescript
layout: {
  screenPadding: 20,      // Default screen padding
  cardMargin: 16,         // Card margins
  sectionSpacing: 24,     // Section spacing
  elementSpacing: 8,      // Element spacing in cards
  contentMaxWidth: 1200,  // Max width for content
}
```

---

## 🧩 Component Patterns

### Screen Structure
```tsx
<SafeAreaView style={styles.container}>
  {/* Header */}
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Title</Text>
    <Text style={styles.headerSubtitle}>Subtitle</Text>
  </View>

  {/* Content */}
  <ScrollView style={styles.scrollView}>
    <View style={styles.content}>
      {/* Content here */}
    </View>
  </ScrollView>
</SafeAreaView>
```

### Card Pattern
```tsx
<Card style={styles.card} padding="medium">
  <Text style={styles.cardTitle}>Title</Text>
  <Text style={styles.cardDescription}>Description</Text>
  <Button>Action</Button>
</Card>
```

---

## 🎯 Screen-Specific Guidelines

### HomeScreen
- **Hero gradient:** Blue to lighter blue
- **Padding:** 32px horizontal, 48px vertical
- **Heading:** 32px, bold, mixed colors (white + cyan)
- **Description:** 16px, white with 0.9 opacity
- **CTA button:** Green, full width, heart icon

### SpecialistsScreen
- **Search bar:** Gray background, 12px border radius
- **Filter row:** Space-between layout, 16px gap
- **Specialist cards:** 16px margin bottom, proper shadows
- **Results text:** 14px, medium weight

### SessionsScreen
- **Tabs:** Blue underline for active, proper spacing
- **Session cards:** All metadata visible, proper spacing
- **Empty state:** Centered, icon + text + CTA

### ProfileScreen
- **Avatar:** 120px circular, centered
- **Form grid:** Two columns, 16px gap
- **Form fields:** 12px labels, proper padding
- **Tabs:** Horizontal scroll, blue underline for active

### ProfileCompletionScreen
- **Icon:** 64-80px, centered
- **Steps:** Vertical layout with connectors
- **Feature grid:** 2 columns, proper gaps
- **Card layout:** Centered content

---

## ✅ Consistency Checklist

### Before Shipping a Screen:
- [ ] Screen padding is 20px (`spacing.lg`)
- [ ] Card margins are 16px (`spacing.md`)
- [ ] Section spacing is 24px (`spacing.xl`)
- [ ] All buttons are at least 44px tall
- [ ] Typography follows the scale
- [ ] Colors match the design system
- [ ] Shadows are consistent
- [ ] Border radius is consistent
- [ ] Touch targets are properly sized
- [ ] ScrollViews have proper flex
- [ ] Safe area is handled correctly
- [ ] Visual feedback on press (opacity)
- [ ] No content overflow

---

## 🚀 Implementation Example

### Good Example
```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing.lg,  // 20px screen padding
  },
  card: {
    marginBottom: spacing.md,  // 16px card margin
  },
  section: {
    marginBottom: spacing.xl,  // 24px section spacing
  },
  heading: {
    fontSize: typography.fontSizes.xxl,      // 24px
    fontWeight: typography.fontWeights.bold,  // 700
    color: colors.neutral.gray900,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: typography.fontSizes.sm,         // 14px
    fontWeight: typography.fontWeights.regular, // 400
    color: colors.neutral.gray600,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.normal,
  },
  button: {
    minHeight: touchTarget.minHeight,  // 44px minimum
  },
});
```

---

## 📱 Responsive Considerations

### Mobile (< 768px)
- Single column layouts
- Full-width buttons
- Larger touch targets
- Comfortable spacing

### Tablet (768px - 1024px)
- Two-column grids where appropriate
- Comfortable reading width
- Increased card sizes

### Desktop (> 1024px)
- Three-column grids
- Max content width (1200px)
- Centered content
- Enhanced hover states

---

## 🎨 Dark Mode (Future)

When implementing dark mode:
- Invert neutral colors
- Reduce shadow opacity
- Maintain brand colors
- Ensure proper contrast
- Test all feedback colors

---

## 📚 Resources

- **Figma/Sketch Files:** (Link to design files)
- **Component Library:** See `src/components/`
- **Style Guide:** This document
- **Code Examples:** See `src/screens/`

---

**Last Updated:** 2025-01-12
**Version:** 2.0
**Maintained by:** Development Team
