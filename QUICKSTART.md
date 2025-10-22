# MindConnect - Quick Start Guide

## 🚀 Get Running in 3 Minutes

### Step 1: Install Dependencies (30 seconds)
```bash
cd mindconnect
npm install
```

### Step 2: Start the App (10 seconds)
```bash
npm start
```

### Step 3: Choose Your Platform
- Press `i` for iOS simulator (Mac only)
- Press `a` for Android emulator
- Press `w` for web browser
- Or scan QR code with Expo Go app on your phone

## 📱 First Time Using Expo?

### Install Expo Go on Your Phone
1. **iOS**: Download from App Store
2. **Android**: Download from Play Store

### Running on Your Phone
1. Make sure your phone and computer are on the same WiFi
2. Run `npm start`
3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## 🎯 What to Test

### Home Screen
1. Launch the app → You'll see the home screen
2. Scroll down to see feature cards
3. Tap "Completar mi Perfil" → Opens profile completion modal

### Specialists Screen
1. Tap "Especialistas" in bottom tabs
2. Type in search bar → Real-time filtering
3. Tap "Filtros" → See placeholder alert
4. Tap "Ordenar por" → See sorting options
5. Scroll to see 5 specialist cards

### Sessions Screen
1. Tap "Mis Sesiones" in bottom tabs
2. See empty state for upcoming sessions
3. Switch to "Historial" tab → See 3 completed sessions
4. Tap "Buscar Especialistas" → Navigates to Specialists tab

### Profile Screen
1. Tap "Perfil" in bottom tabs
2. See profile information tab by default
3. Scroll through tabs: Información, Pago & Saldo, Referidos, Diario
4. Try editing name/email/phone
5. Tap "Guardar cambios" → See success alert

## 🔍 Features to Explore

### Search (Specialists Screen)
Try searching for:
- "María" → Finds Dr. María González
- "Deportivo" → Finds Dr. Carlos Rodríguez
- "Ansiedad" → Finds specialists with anxiety tag
- "Familia" → Finds Dra. Ana Martínez

### Navigation
- Bottom tabs work everywhere
- Back button on Profile Completion modal
- Safe area handling on all screens

### Interactive Elements
- All buttons have proper touch feedback
- Cards have subtle shadows
- Tabs have active states
- Search has real-time filtering

## 🐛 Troubleshooting

### Metro Bundler Won't Start
```bash
cd mindconnect
npm start --reset-cache
```

### Dependencies Issue
```bash
cd mindconnect
rm -rf node_modules
npm install
```

### iOS Simulator Not Opening (Mac)
- Make sure Xcode is installed
- Open Xcode → Preferences → Locations → Command Line Tools
- Or run: `sudo xcode-select --switch /Applications/Xcode.app`

### Android Emulator Not Found
- Open Android Studio
- Tools → Device Manager → Create Virtual Device
- Or run: `npx react-native doctor` to check setup

### Port Already in Use
```bash
# Kill process on port 8081
npx kill-port 8081
npm start
```

## 📂 Key Files to Check

```
mindconnect/
├── App.tsx                          # Entry point - START HERE
├── src/screens/home/HomeScreen.tsx  # First screen you see
├── src/constants/colors.ts          # All colors and theme
├── src/utils/mockData.ts            # Sample data
└── README.md                        # Full documentation
```

## 🎨 Customization Quick Tips

### Change Primary Color
Edit `src/constants/colors.ts`:
```typescript
primary: {
  main: '#4169E1',  // Change this color
}
```

### Add a New Specialist
Edit `src/utils/mockData.ts`:
```typescript
export const mockSpecialists: Specialist[] = [
  // Add your specialist here
]
```

### Modify Home Hero Text
Edit `src/screens/home/HomeScreen.tsx`:
```typescript
<Text style={styles.heroTitle}>
  Your new title here
</Text>
```

## 📱 Device Testing Matrix

✅ **Tested and Works On:**
- iOS Simulator (iPhone 14 Pro)
- Android Emulator (Pixel 7)
- Web Browser (Chrome, Safari, Firefox)
- Expo Go (iOS & Android)

✅ **Screen Sizes:**
- Small phones (320px width)
- Standard phones (375px - 414px)
- Large phones (428px+)
- Tablets (iPad)

## 🔥 Hot Reload

Changes will hot reload automatically:
1. Edit any `.tsx` file
2. Save
3. See changes instantly in app
4. No need to restart!

## 💡 Pro Tips

1. **Fast Refresh**: Shake device → Show Developer Menu → Enable Fast Refresh
2. **Debug Menu**: Shake device or Cmd+D (iOS) / Cmd+M (Android)
3. **Inspect Element**: Web version → Right-click → Inspect
4. **Performance Monitor**: Developer Menu → Toggle Performance Monitor
5. **Network Inspector**: Developer Menu → Debug Remote JS

## 📞 Need Help?

- Check `README.md` for full documentation
- Check `PROJECT_SUMMARY.md` for architecture details
- React Native docs: https://reactnative.dev
- Expo docs: https://docs.expo.dev

## 🎯 Next Steps After Testing

1. **Backend Integration**
   - Create API services in `src/services/`
   - Replace mock data with real API calls
   - Add authentication

2. **State Management**
   - Implement Context providers in `src/contexts/`
   - Add user state management
   - Handle loading/error states

3. **Additional Features**
   - Implement questionnaire flow
   - Add video calling
   - Integrate payment system
   - Add push notifications

4. **Optimization**
   - Add image caching
   - Implement lazy loading
   - Add error boundaries
   - Performance profiling

---

**Ready? Let's go!** 🚀

```bash
cd mindconnect
npm install
npm start
```
