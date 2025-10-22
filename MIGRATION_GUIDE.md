# MindConnect Migration Guide: Blue to Green + Drawer Navigation

## Overview
This guide documents the migration from:
1. **Blue primary color** → **Green primary color** (mental health theme)
2. **Bottom tabs navigation** → **Left sidebar drawer navigation**

---

## ✅ COMPLETED

### 1. Color System Update
**File:** `src/constants/colors.ts`

✅ **Primary color changed to GREEN:**
```typescript
primary: {
  main: '#10B981',      // Emerald green (was #4169E1 blue)
  light: '#6EE7B7',
  dark: '#059669',
  darker: '#047857',
  50: '#ECFDF5',
  100: '#D1FAE5',
}
```

✅ **Blue moved to secondary:**
```typescript
secondary: {
  blue: '#4169E1',      // Former primary
  blueLight: '#6B8DE3',
  // ... other secondary colors
}
```

✅ **Support colors added:**
```typescript
support: {
  crisis: '#EF4444',    // Red for crisis
  help: '#06B6D4',      // Cyan for 24/7 help
  helpBg: '#ECFEFF',    // Light cyan background
}
```

### 2. Custom Drawer Content
**File:** `src/components/navigation/CustomDrawerContent.tsx`

✅ Created with:
- Header: Logo (heart icon) + "MindConnect" + "Tu bienestar mental"
- NAVEGACIÓN section with 4 menu items
- SOPORTE section with crisis support + 24/7 help card
- User section at bottom with avatar
- Active state: light green background + green text
- Proper spacing and styling

---

## 🔨 REMAINING TASKS

### 3. Create Drawer Navigator
**File:** `src/navigation/DrawerNavigator.tsx` (CREATE THIS)

```typescript
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawerContent } from '../components/navigation/CustomDrawerContent';
import { layout } from '../constants/colors';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import SpecialistsScreen from '../screens/specialists/SpecialistsScreen';
import SessionsScreen from '../screens/sessions/SessionsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Drawer = createDrawerNavigator();

export const DrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          width: layout.drawerWidth,
        },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Specialists" component={SpecialistsScreen} />
      <Drawer.Screen name="Sessions" component={SessionsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
};
```

### 4. Update Root Navigator
**File:** `src/navigation/RootNavigator.tsx`

Replace MainTabNavigator with DrawerNavigator:

```typescript
import { DrawerNavigator } from './DrawerNavigator';

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
      <Stack.Screen
        name="ProfileCompletion"
        component={ProfileCompletionScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};
```

### 5. Delete Old Tab Navigator
**File:** `src/navigation/MainTabNavigator.tsx`

❌ DELETE THIS FILE (no longer needed)

---

## 🎨 COMPONENT UPDATES NEEDED

### Button Component
**File:** `src/components/common/Button.tsx`

Update primary variant to use GREEN:
```typescript
case 'primary':
  return {
    ...baseStyle,
    backgroundColor: isDisabled ? colors.neutral.gray300 : colors.primary.main, // Now green
  };
case 'secondary':
  return {
    ...baseStyle,
    backgroundColor: isDisabled ? colors.neutral.gray200 : colors.primary.main, // Green
  };
```

### Badge Component
**File:** `src/components/common/Badge.tsx`

Update variants to use green:
```typescript
case 'success':
case 'primary':
  return {
    ...baseStyle,
    backgroundColor: colors.primary[100], // Light green
    color: colors.primary.main,          // Green text
  };
```

### SpecialistCard Component
**File:** `src/components/features/SpecialistCard.tsx`

Update affinity badge:
```typescript
<Badge
  variant="success"
  size="small"
  icon={<Ionicons name="heart" size={12} color={colors.primary.main} />}
>
  {specialist.affinityPercentage}% afinidad
</Badge>
```

---

## 📱 SCREEN UPDATES NEEDED

All screens need:
1. **Add hamburger menu icon** in header to open drawer
2. **Update colors** from blue to green
3. **Remove SafeAreaView edges={['top']}** if using custom header

### Template for Screen Header with Menu Icon

```typescript
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

const ScreenName: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Menu Icon */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={24} color={colors.neutral.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Screen Title</Text>
      </View>

      {/* Rest of screen content */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  menuButton: {
    width: touchTarget.minWidth,
    height: touchTarget.minHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.neutral.gray900,
  },
});
```

### HomeScreen Updates
1. Change gradient from blue to green:
   ```typescript
   colors={['#6EE7B7', '#10B981', '#059669']}  // Green gradient
   ```
2. Update "especialista perfecto" text color to green or cyan
3. CTA button is already green (variant="secondary" now maps to primary green)
4. Add menu icon

### SpecialistsScreen Updates
1. Add menu icon in header
2. Active tab: green underline (change `colors.primary.main`)
3. Affinity badges: already use `variant="success"` which is now green

### SessionsScreen Updates
1. Add menu icon
2. Active tab: green underline
3. "Buscar Especialistas" button: green (already using `variant="primary"`)

### ProfileScreen Updates
1. Add menu icon
2. Active tab: green underline
3. Avatar: can stay blue or change to green (optional)
4. Save button: green (already using `variant="primary"`)

### ProfileCompletionScreen Updates
1. Success icon background: change to green
2. "Comenzar Cuestionario" button: green (already `variant="secondary"`)
3. Step icons: green backgrounds

---

## 🧪 TESTING CHECKLIST

After implementing all changes:

- [ ] Drawer opens from left when tapping menu icon
- [ ] Drawer shows all 4 navigation items
- [ ] Active menu item has light green background
- [ ] "Apoyo en Crisis" shows red icon
- [ ] "Ayuda 24/7" card has cyan background
- [ ] User section appears at bottom of drawer
- [ ] All buttons use green as primary color
- [ ] All badges use green for success/primary variants
- [ ] Affinity badges on specialist cards are green
- [ ] HomeScreen gradient is green-based
- [ ] Active tabs across all screens show green underline
- [ ] No references to old blue primary color remain
- [ ] App is fully navigable from drawer
- [ ] Drawer closes when navigating to a screen
- [ ] Menu icon visible on all main screens

---

## 📊 QUICK REFERENCE

### Old vs New Colors

| Element | Old (Blue) | New (Green) |
|---------|-----------|-------------|
| Primary Main | #4169E1 | #10B981 |
| Primary Light | #6B8DE3 | #6EE7B7 |
| Primary Dark | #2948B8 | #059669 |
| Buttons (Primary) | Blue | Green |
| Active States | Blue | Green |
| Success Badges | Green | Green (no change) |
| Tab Indicators | Blue | Green |
| Affinity Badges | Blue bg | Green bg |

### Navigation

| Old | New |
|-----|-----|
| Bottom Tabs | Left Drawer |
| Tab Bar (4 items) | Drawer Menu (4 items) |
| Always visible | Slide in/out |
| No sections | NAVEGACIÓN + SOPORTE sections |

---

## 🚀 DEPLOYMENT NOTES

1. **Test on both iOS and Android** - drawer behavior may differ slightly
2. **Test on tablets** - drawer width changes to 320px
3. **Verify accessibility** - ensure touch targets meet 44px minimum
4. **Check dark mode** (if/when implemented) - ensure colors work
5. **Performance** - drawer should slide smoothly without lag

---

## 📝 FILES SUMMARY

**Created:**
- ✅ `src/components/navigation/CustomDrawerContent.tsx`
- 🔨 `src/navigation/DrawerNavigator.tsx` (TODO)

**Modified:**
- ✅ `src/constants/colors.ts`
- 🔨 `src/navigation/RootNavigator.tsx` (TODO)
- 🔨 `src/components/common/Button.tsx` (TODO - minimal changes)
- 🔨 `src/components/common/Badge.tsx` (TODO - minimal changes)
- 🔨 `src/components/features/SpecialistCard.tsx` (TODO)
- 🔨 `src/screens/home/HomeScreen.tsx` (TODO)
- 🔨 `src/screens/specialists/SpecialistsScreen.tsx` (TODO)
- 🔨 `src/screens/sessions/SessionsScreen.tsx` (TODO)
- 🔨 `src/screens/profile/ProfileScreen.tsx` (TODO)
- 🔨 `src/screens/profile/ProfileCompletionScreen.tsx` (TODO)

**Deleted:**
- 🔨 `src/navigation/MainTabNavigator.tsx` (TODO)

---

**Status:** 2/13 tasks completed
**Next Steps:** Create DrawerNavigator, update RootNavigator, then update all screens

**Last Updated:** 2025-01-12
