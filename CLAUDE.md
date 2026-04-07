# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

React Native + Expo app for HERA, a mental health marketplace (B2B/B2C). Runs on iOS, Android, and Web (Vercel). The project context is Spanish/European. See the parent `HERA/CLAUDE.md` for full-stack context.

# HERA Frontend: UX, Design & Responsive Rules

## Design System & Visual Excellence
- **Active Skill**: `frontend-design`. Aesthetic: "Premium Healthcare" (Trustworthy, clean, calm).
- **Tokens**: Use `heraLanding` (sage green + lavender) for new work. Import from `constants/colors.ts`.
- **Grid**: Strict 4px/8px spacing system. No hardcoded hex or pixel values.

## Responsive & Multi-platform (React Native/Web)
- **Flexbox**: Use responsive layouts. Authenticated screens must use `MainLayout`.
- **Desktop Adaptation**: Handle collapsible sidebar for screens ≥ 768px. Hamburger for mobile.
- **Parity**: Ensure all features are touch-friendly (mobile) and click-friendly (web/Vercel).

## Frontend Architecture
- **State**: React Context API (`AuthContext`) only. No external state libraries.
- **Service Pattern**: Screens MUST NOT call Axios directly. Use `src/services/` (e.g., `specialistsService.ts`).
- **Navigation**: Types updated in `src/constants/types.ts`. Branch navigation based on `user.type` and `verificationStatus`.

## Quality Assurance
- **Visual Verification**: Use visual inspection/screenshots to ensure "Pixel Perfect" UI before push.
- **Type Split**: Manage the dual `Specialist` types via `mapSpecialistToProfile()` for detail screens.