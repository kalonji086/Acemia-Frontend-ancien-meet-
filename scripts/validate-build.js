#!/usr/bin/env node

/**
 * Build Validation Script
 * Checks all requirements for a successful Google Play build
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

console.log('🔍 Validating build requirements...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: app.json configuration
console.log('✅ Checking app.json...');
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'app.json'), 'utf8'));

  // Verify Android configuration
  if (!appJson.expo.android) {
    console.error('❌ Missing android configuration in app.json');
    hasErrors = true;
  } else {
    console.log('  ✓ Android configuration found');

    if (!appJson.expo.android.package) {
      console.error('❌ Missing android.package in app.json');
      hasErrors = true;
    } else {
      console.log(`  ✓ Package name: ${appJson.expo.android.package}`);
    }

    if (appJson.expo.android.enableProguardInReleaseBuilds !== false) {
      console.warn('⚠️  ProGuard is enabled - this may cause crashes');
      hasWarnings = true;
    } else {
      console.log('  ✓ ProGuard disabled (recommended)');
    }

    if (appJson.expo.android.enableShrinkResourcesInReleaseBuilds !== false) {
      console.warn('⚠️  Resource shrinking is enabled - this may cause crashes');
      hasWarnings = true;
    } else {
      console.log('  ✓ Resource shrinking disabled (recommended)');
    }
  }

  // Verify version
  if (!appJson.expo.version) {
    console.error('❌ Missing version in app.json');
    hasErrors = true;
  } else {
    console.log(`  ✓ Version: ${appJson.expo.version}`);
  }

  if (!appJson.expo.android.versionCode) {
    console.error('❌ Missing android.versionCode in app.json');
    hasErrors = true;
  } else {
    console.log(`  ✓ Version Code: ${appJson.expo.android.versionCode}`);
  }

} catch (error) {
  console.error('❌ Failed to parse app.json:', error.message);
  hasErrors = true;
}

// Check 2: package.json
console.log('\n✅ Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));

  if (!packageJson.dependencies['expo']) {
    console.error('❌ Expo not found in dependencies');
    hasErrors = true;
  } else {
    console.log('  ✓ Expo installed');
  }

  if (!packageJson.dependencies['react']) {
    console.error('❌ React not found in dependencies');
    hasErrors = true;
  } else {
    console.log('  ✓ React installed');
  }

  if (!packageJson.dependencies['react-native']) {
    console.error('❌ React Native not found in dependencies');
    hasErrors = true;
  } else {
    console.log('  ✓ React Native installed');
  }

} catch (error) {
  console.error('❌ Failed to parse package.json:', error.message);
  hasErrors = true;
}

// Check 3: Critical files
console.log('\n✅ Checking critical files...');
const criticalFiles = [
  'App.tsx',
  'index.ts',
  'src/navigation/AppNavigator.tsx',
  'src/screens/SplashScreen.tsx',
  'src/screens/LoginScreen.tsx',
  'src/services/api.service.ts',
  'src/utils/constants.ts',
  'babel.config.js',
  'tsconfig.json'
];

criticalFiles.forEach(file => {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing critical file: ${file}`);
    hasErrors = true;
  } else {
    console.log(`  ✓ ${file}`);
  }
});

// Check 4: Assets
console.log('\n✅ Checking assets...');
const assetsDir = path.join(ROOT_DIR, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('❌ Assets directory not found');
  hasErrors = true;
} else {
  const logoPath = path.join(assetsDir, 'AcemiaLogo.png');
  if (!fs.existsSync(logoPath)) {
    console.warn('⚠️  AcemiaLogo.png not found in assets');
    hasWarnings = true;
  } else {
    console.log('  ✓ AcemiaLogo.png found');
  }
}

// Check 5: EAS configuration
console.log('\n✅ Checking EAS configuration...');
try {
  const easJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'eas.json'), 'utf8'));

  if (!easJson.build || !easJson.build.production) {
    console.error('❌ Missing production build configuration in eas.json');
    hasErrors = true;
  } else {
    console.log('  ✓ Production build configuration found');
  }

  if (easJson.build.preview) {
    console.log('  ✓ Preview build configuration found');
  }

} catch (error) {
  console.error('❌ Failed to parse eas.json:', error.message);
  hasErrors = true;
}

// Final summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ Validation FAILED with errors');
  console.error('   Fix the errors above before building\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  Validation passed with warnings');
  console.warn('   Review the warnings above\n');
  process.exit(0);
} else {
  console.log('\n✅ Validation PASSED');
  console.log('   Ready to build for Google Play!\n');
  process.exit(0);
}
