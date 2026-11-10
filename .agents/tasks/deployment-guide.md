# Deployment Guide - Google Play Fix

## Quick Summary

The app was rejected because it wouldn't load on Android devices. We've made critical fixes to:

1. Remove blocking network calls during startup
2. Disable aggressive ProGuard/R8 optimization
3. Improve error handling
4. Increase timeouts for slow server responses
5. Optimize splash screen handling

## Build Instructions

### Prerequisites
- Node.js 18+ installed
- EAS CLI installed: `npm install -g eas-cli`
- Expo account with EAS access
- Android keystore configured

### Step 1: Clean Previous Builds

```powershell
cd "g:\Meet Me\frontend"

# Clear node modules and cache
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install

# Clear Metro bundler cache
npx expo start --clear
```

### Step 2: Test Locally

```powershell
# Start the development server
npx expo start

# Test on Android device or emulator
# Press 'a' to open on Android

# Or run directly
npx expo run:android
```

### Step 3: Build Preview APK

```powershell
# Build a preview APK for testing
eas build --platform android --profile preview

# This will create an APK you can install directly on devices
# APK is useful for testing before Google Play submission
```

### Step 4: Build Production AAB

```powershell
# Build the production App Bundle (AAB)
eas build --platform android --profile production

# This creates an .aab file for Google Play Store
```

### Step 5: Submit to Google Play

```powershell
# Submit the build to Google Play
eas submit --platform android --profile production

# Or use the Google Play Console manually
```

## Testing Checklist

Before submitting to Google Play:

### Device Testing
- [ ] Test on Samsung Galaxy (any model)
- [ ] Test on Google Pixel
- [ ] Test on Android 8.0+ (minimum SDK 24)
- [ ] Test on slow 3G network
- [ ] Test with airplane mode on (should show cached data or error)
- [ ] Test with server unavailable

### Functional Testing
- [ ] App opens within 5 seconds
- [ ] Splash screen shows correctly
- [ ] Login screen loads
- [ ] No ANR (Application Not Responding) errors
- [ ] No crashes in first 30 seconds
- [ ] Navigation works smoothly

### Network Testing
- [ ] App works on WiFi
- [ ] App works on 4G/LTE
- [ ] App works on 3G
- [ ] App handles network errors gracefully
- [ ] App doesn't freeze on slow network

## Monitoring After Deployment

### Google Play Console
1. Check **Android Vitals** for crash reports
2. Monitor **ANR rates** (should be < 0.47%)
3. Check **Crash rates** (should be < 1.09%)
4. Review user feedback

### Recommended Thresholds
- **Crash rate**: < 1.09% (Good), < 0.92% (Excellent)
- **ANR rate**: < 0.47% (Good), < 0.25% (Excellent)
- **Startup time**: < 5 seconds

## Troubleshooting

### If app still crashes on startup:
1. Check logcat: `adb logcat *:E`
2. Look for "FATAL EXCEPTION" in logs
3. Verify API URL is correct in `app.json`
4. Check backend server is running

### If app shows white screen:
1. Clear app data: Settings > Apps > Acemia > Clear Data
2. Reinstall the app
3. Check for JavaScript errors with remote debugging

### If app is slow:
1. Reduce image sizes in assets
2. Check network requests in React Native Debugger
3. Verify server response times

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 96 | 2026-10-07 | Fixed startup crashes, disabled ProGuard |
| 95 | Previous | Initial release (rejected) |

## Emergency Rollback

If the new version has critical issues:

1. **In Google Play Console**:
   - Go to Release > Production
   - Click "Halt rollout" if needed
   - Previous version (95) is still available

2. **Quick fix and rebuild**:
   ```powershell
   # Make fixes
   # Update versionCode to 97 in app.json
   eas build --platform android --profile production
   eas submit --platform android
   ```

## Support Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Android Vitals](https://developer.android.com/topic/performance/vitals)
