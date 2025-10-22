# MindConnect - Mental Health Marketplace MVP

A React Native + Expo mobile application that connects users with mental health professionals through an intelligent affinity-based matching algorithm.

## 🎯 Features

### Core Functionality
- **Intelligent Matching**: Algorithm-based specialist recommendations based on user affinity
- **Specialist Browsing**: Search, filter, and sort mental health professionals
- **Profile Management**: Complete user profiles with personal information
- **Session Tracking**: View upcoming sessions and session history
- **Responsive Design**: Optimized for both iOS and Android devices

### Screens Implemented
1. **Home Screen**: Hero section with platform features and call-to-action
2. **Profile Completion**: Onboarding flow for the affinity questionnaire
3. **Specialists Screen**: Browse and search specialists with detailed cards
4. **Sessions Screen**: Manage upcoming sessions and view history
5. **Profile Screen**: Edit personal information with tabs for payment, referrals, and diary

## 🛠 Technology Stack

- **React Native** - Cross-platform mobile development
- **Expo** (Managed Workflow) - Development platform and tooling
- **TypeScript** - Type-safe code with strict mode enabled
- **React Navigation v6** - Stack and Bottom Tab navigation
- **Expo Vector Icons** - Ionicons icon set
- **Expo Linear Gradient** - Gradient backgrounds
- **React Context API** - State management (ready for implementation)

## 📁 Project Structure

```
mindconnect/
├── src/
│   ├── components/
│   │   ├── common/              # Reusable UI components
│   │   │   ├── Button.tsx       # Button with variants and states
│   │   │   ├── Card.tsx         # Card container with shadows
│   │   │   ├── Badge.tsx        # Badge/label component
│   │   │   └── Input.tsx        # Form input with validation
│   │   └── features/            # Feature-specific components
│   │       ├── FeatureCard.tsx  # Home screen feature cards
│   │       └── SpecialistCard.tsx # Specialist information card
│   ├── screens/
│   │   ├── home/
│   │   │   └── HomeScreen.tsx
│   │   ├── specialists/
│   │   │   └── SpecialistsScreen.tsx
│   │   ├── sessions/
│   │   │   └── SessionsScreen.tsx
│   │   └── profile/
│   │       ├── ProfileScreen.tsx
│   │       └── ProfileCompletionScreen.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx    # Root stack navigator
│   │   └── MainTabNavigator.tsx # Bottom tabs navigator
│   ├── constants/
│   │   ├── colors.ts            # Design system colors and theme
│   │   └── types.ts             # TypeScript type definitions
│   ├── utils/
│   │   └── mockData.ts          # Sample data for development
│   ├── hooks/                   # Custom React hooks (ready for implementation)
│   ├── services/                # API services (ready for implementation)
│   └── contexts/                # React Context providers (ready for implementation)
├── App.tsx                      # Application entry point
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Studio for emulator

### Installation

1. **Navigate to the project directory:**
   ```bash
   cd mindconnect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on a platform:**
   - iOS: `npm run ios` (Mac only)
   - Android: `npm run android`
   - Web: `npm run web`

### Using Expo Go
You can also run the app on your physical device using Expo Go:
1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Scan the QR code from the terminal after running `npm start`

## 🎨 Design System

### Color Palette

**Primary Colors:**
- Main: `#4169E1` (Royal Blue)
- Light: `#6B8DE3`
- Dark: `#2948B8`

**Secondary Colors:**
- Green: `#10B981` (Success/Secure)
- Purple: `#A855F7` (Accent)
- Orange: `#F97316` (Warning/Video)
- Pink: `#EC4899` (Accent)

**Neutral Colors:**
- White to Gray scale for backgrounds and text

### Typography
- Font sizes: 12px - 32px
- Font weights: Regular (400), Medium (500), Semibold (600), Bold (700)
- Line heights: Tight (1.2), Normal (1.5), Relaxed (1.75)

### Components

#### Button
```tsx
<Button
  variant="primary" // primary | secondary | outline | ghost
  size="large"      // small | medium | large
  onPress={handlePress}
>
  Click Me
</Button>
```

#### Card
```tsx
<Card
  variant="elevated"  // default | elevated | outlined
  padding="medium"    // none | small | medium | large
>
  {children}
</Card>
```

#### Badge
```tsx
<Badge
  variant="success"  // primary | success | warning | error | info | neutral
  size="medium"      // small | medium | large
>
  Label
</Badge>
```

#### Input
```tsx
<Input
  label="Email"
  placeholder="Enter email"
  value={email}
  onChangeText={setEmail}
  error="Error message"
/>
```

## 📱 Key Features Detail

### 1. Home Screen
- **Hero Section**: Gradient background with main value proposition
- **CTA Button**: "Completar mi Perfil" to start questionnaire
- **Feature Cards**: Three main platform features with icons
- **Stats Section**: Platform statistics (specialists, users, rating)

### 2. Profile Completion
- **Success Icon**: Visual feedback for starting the process
- **3-Step Process**: Clear visualization of the questionnaire flow
- **Why MindConnect**: 6 feature cards in a grid layout
- Modal presentation for better UX

### 3. Specialists Screen
- **Search Bar**: Real-time filtering by name, specialization, or tags
- **Filters & Sort**: Placeholder for advanced filtering
- **Specialist Cards**: Detailed cards with:
  - Affinity percentage badge
  - Rating and reviews
  - Specialization tags
  - Price per session
  - First visit free badge (conditional)
- **Empty State**: Helpful message when no results found

### 4. Sessions Screen
- **Tabs**: Upcoming sessions vs. History
- **Session Cards**: Display specialist info, date, time, duration
- **Empty State**: Encourages users to book first session
- **Action Buttons**: Reschedule and Join meeting (upcoming sessions)

### 5. Profile Screen
- **Avatar Upload**: Profile picture with change option
- **Form Fields**: All personal information editable
- **Multiple Tabs**:
  - Information: Personal details
  - Payment & Balance: Payment methods (placeholder)
  - Referrals: Invite friends with referral code
  - Diary: Personal journaling feature (placeholder)

## 🔧 Architecture Decisions

### Component Design
- **Separation of Concerns**: Common components vs. feature-specific components
- **Composition over Inheritance**: Small, reusable pieces
- **Props-based Configuration**: Flexible, type-safe component APIs

### State Management
- Currently using local state with React hooks
- Ready for Context API or Redux implementation
- Mock data simulates backend responses

### Navigation
- **Stack Navigator**: For modal screens (profile completion)
- **Bottom Tabs**: Main app navigation (Home, Specialists, Sessions, Profile)
- Type-safe navigation with TypeScript

### Code Quality
- **TypeScript Strict Mode**: No `any` types, full type coverage
- **Consistent Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc-style documentation for all components
- **No Magic Numbers**: Constants for colors, spacing, typography

### Accessibility
- Touch targets meet 44x44 minimum size
- Proper labels for screen readers (ready for implementation)
- Color contrast ratios meet WCAG standards

### Performance
- Optimized list rendering with keys
- Lazy loading ready for implementation
- Image optimization placeholders

## 🔜 Future Enhancements

### Short Term
- [ ] Implement actual date/time pickers
- [ ] Add image picker for profile photos
- [ ] Create questionnaire flow (15 questions)
- [ ] Implement specialist detail screen
- [ ] Add video call functionality
- [ ] Payment integration

### Medium Term
- [ ] Backend API integration
- [ ] Authentication (login/signup)
- [ ] Push notifications
- [ ] Chat functionality
- [ ] Calendar integration
- [ ] Booking system

### Long Term
- [ ] AI-powered matching algorithm refinement
- [ ] Analytics and insights dashboard
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Accessibility improvements
- [ ] Performance optimizations

## 🧪 Testing

Currently, the app uses mock data for development. To test:

1. **Browse Specialists**: Navigate to Specialists tab, search works with mock data
2. **View Sessions**: Check Sessions tab for history (3 mock sessions)
3. **Edit Profile**: Go to Profile tab and edit user information
4. **Complete Profile Flow**: Tap "Completar mi Perfil" on home screen

## 📦 Mock Data

The app includes sample data for:
- **5 Specialists** with varying specializations, ratings, and affinity scores
- **3 Completed Sessions** with different specialists
- **1 User Profile** with sample personal information
- **3 Feature Cards** for the home screen
- **6 "Why MindConnect" Features** for profile completion

Location: `src/utils/mockData.ts`

## 🎯 SOLID Principles Applied

1. **Single Responsibility**: Each component has one clear purpose
2. **Open/Closed**: Components are extensible through props
3. **Liskov Substitution**: Components can be substituted with enhanced versions
4. **Interface Segregation**: Specific prop interfaces, no unnecessary props
5. **Dependency Inversion**: Components depend on abstractions (props) not implementations

## 📝 Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Used consistently
- **Arrow Functions**: Preferred for components and callbacks
- **Destructuring**: Used for props and state
- **Template Literals**: For string interpolation

## 🐛 Known Issues

- Date pickers show alerts (not implemented yet)
- Gender dropdown shows alert (not implemented yet)
- Image picker not implemented
- Some buttons show placeholder alerts

## 📄 License

This is a demo/MVP project created for educational purposes.

## 👨‍💻 Developer Notes

### Adding New Screens
1. Create screen file in appropriate `screens/` subdirectory
2. Add to navigation (RootNavigator or MainTabNavigator)
3. Update TypeScript navigation types in `constants/types.ts`

### Creating New Components
1. Place in `components/common/` or `components/features/`
2. Add TypeScript interface for props
3. Include JSDoc comments
4. Export from component file

### Styling Guidelines
- Use constants from `constants/colors.ts`
- Follow existing spacing patterns
- Maintain consistent shadow styles
- Ensure responsive layouts with Flexbox

## 📞 Support

For issues or questions, please refer to:
- React Native docs: https://reactnative.dev/
- Expo docs: https://docs.expo.dev/
- React Navigation docs: https://reactnavigation.org/

---

**Built with ❤️ for mental health awareness**
