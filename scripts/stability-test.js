#!/usr/bin/env node

/**
 * Script de test de stabilité pour l'application Acemia
 * Ce script vérifie les problèmes courants qui pourraient causer des crashs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Démarrage des tests de stabilité...\n');

const projectRoot = path.join(__dirname, '..');
let hasErrors = false;
const errors = [];

// 1. Vérifier la structure des fichiers
console.log('1. Vérification de la structure des fichiers...');
const requiredFiles = [
  'App.tsx',
  'index.ts',
  'src/navigation/AppNavigator.tsx',
  'src/screens/SplashScreen.tsx',
  'src/services/api.service.ts',
  'src/services/socket.service.ts',
  'package.json',
  'app.json',
  'babel.config.js',
  'tsconfig.json'
];

requiredFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    errors.push(`❌ Fichier manquant: ${file}`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${file}`);
  }
});

// 2. Vérifier les dépendances critiques
console.log('\n2. Vérification des dépendances...');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const criticalDeps = [
  'react',
  'react-native',
  'expo',
  '@react-navigation/native',
  '@react-native-async-storage/async-storage'
];

criticalDeps.forEach(dep => {
  if (!packageJson.dependencies[dep]) {
    errors.push(`❌ Dépendance critique manquante: ${dep}`);
    hasErrors = true;
  } else {
    console.log(`   ✅ ${dep}@${packageJson.dependencies[dep]}`);
  }
});

// 3. Vérifier la configuration TypeScript
console.log('\n3. Vérification de la configuration TypeScript...');
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'));
  
  if (!tsconfig.compilerOptions) {
    errors.push('❌ Configuration TypeScript invalide');
    hasErrors = true;
  } else {
    console.log('   ✅ Configuration TypeScript valide');
    
    // Vérifier les options importantes
    const importantOptions = {
      'strict': true,
      'skipLibCheck': true,
      'esModuleInterop': true
    };
    
    Object.entries(importantOptions).forEach(([option, recommended]) => {
      if (tsconfig.compilerOptions[option] !== recommended) {
        console.log(`   ⚠️  Option ${option} différente de la valeur recommandée (${recommended})`);
      }
    });
  }
} catch (error) {
  errors.push(`❌ Erreur de lecture tsconfig.json: ${error.message}`);
  hasErrors = true;
}

// 4. Vérifier la configuration Expo
console.log('\n4. Vérification de la configuration Expo...');
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
  
  if (!appJson.expo) {
    errors.push('❌ Configuration Expo invalide');
    hasErrors = true;
  } else {
    console.log('   ✅ Configuration Expo valide');
    
    // Vérifications importantes
    const checks = [
      { field: 'expo.name', required: true },
      { field: 'expo.slug', required: true },
      { field: 'expo.version', required: true },
      { field: 'expo.ios.bundleIdentifier', required: true },
      { field: 'expo.android.package', required: true }
    ];
    
    checks.forEach(check => {
      const value = check.field.split('.').reduce((obj, key) => obj?.[key], appJson);
      if (check.required && !value) {
        console.log(`   ⚠️  Champ manquant: ${check.field}`);
      }
    });
  }
} catch (error) {
  errors.push(`❌ Erreur de lecture app.json: ${error.message}`);
  hasErrors = true;
}

// 5. Vérifier les fichiers de navigation
console.log('\n5. Vérification des fichiers de navigation...');
const navigationFiles = [
  'src/navigation/AppNavigator.tsx',
  'src/screens/SplashScreen.tsx'
];

navigationFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifications basiques
    if (file.includes('AppNavigator')) {
      if (!content.includes('NavigationContainer')) {
        console.log(`   ⚠️  ${file}: NavigationContainer manquant`);
      }
      if (!content.includes('createStackNavigator')) {
        console.log(`   ⚠️  ${file}: createStackNavigator manquant`);
      }
    }
    
    if (file.includes('SplashScreen')) {
      if (!content.includes('useEffect')) {
        console.log(`   ⚠️  ${file}: Gestion de cycle de vie manquante`);
      }
    }
    
    console.log(`   ✅ ${file} - Structure valide`);
  } catch (error) {
    errors.push(`❌ Erreur de lecture ${file}: ${error.message}`);
    hasErrors = true;
  }
});

// 6. Vérifier les services
console.log('\n6. Vérification des services...');
const serviceFiles = [
  'src/services/api.service.ts',
  'src/services/socket.service.ts'
];

serviceFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifications de sécurité
    if (file.includes('api.service')) {
      if (!content.includes('try') || !content.includes('catch')) {
        console.log(`   ⚠️  ${file}: Gestion d'erreurs limitée`);
      }
      if (!content.includes('timeout')) {
        console.log(`   ⚠️  ${file}: Timeout non configuré`);
      }
    }
    
    if (file.includes('socket.service')) {
      if (!content.includes('disconnect')) {
        console.log(`   ⚠️  ${file}: Méthode disconnect manquante`);
      }
      if (!content.includes('reconnect')) {
        console.log(`   ⚠️  ${file}: Mécanisme de reconnexion manquant`);
      }
    }
    
    console.log(`   ✅ ${file} - Service valide`);
  } catch (error) {
    errors.push(`❌ Erreur de lecture ${file}: ${error.message}`);
    hasErrors = true;
  }
});

// 7. Vérifier les assets
console.log('\n7. Vérification des assets...');
const assetDirs = ['assets', 'src/assets'];
assetDirs.forEach(dir => {
  const dirPath = path.join(projectRoot, dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    if (files.length === 0) {
      console.log(`   ⚠️  Répertoire ${dir} vide`);
    } else {
      console.log(`   ✅ ${dir} - ${files.length} fichier(s) trouvé(s)`);
    }
  } else {
    console.log(`   ℹ️  Répertoire ${dir} non trouvé (optionnel)`);
  }
});

// 8. Vérifier les variables d'environnement
console.log('\n8. Vérification des variables d'environnement...');
const envExamplePath = path.join(projectRoot, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  const requiredVars = envExample.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=')[0]);
  
  console.log(`   ✅ Fichier .env.example - ${requiredVars.length} variable(s) définie(s)`);
  
  // Vérifier si .env existe
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('   ⚠️  Fichier .env manquant (créer à partir de .env.example)');
  }
} else {
  console.log('   ℹ️  Fichier .env.example non trouvé');
}

// Résumé
console.log('\n' + '='.repeat(50));
console.log('📊 RÉSUMÉ DES TESTS DE STABILITÉ');
console.log('='.repeat(50));

if (errors.length > 0) {
  console.log('\n❌ ERREURS TROUVÉES:');
  errors.forEach(error => console.log(`  ${error}`));
}

if (hasErrors) {
  console.log('\n🚨 Des problèmes critiques ont ��té détectés !');
  console.log('Recommandations:');
  console.log('1. Corriger les fichiers manquants');
  console.log('2. Vérifier les dépendances');
  console.log('3. Exécuter: npm run check');
  console.log('4. Exécuter: npm run lint');
  console.log('5. Tester sur un appareil physique');
  process.exit(1);
} else {
  console.log('\n✅ Tous les tests de stabilité sont passés avec succès !');
  console.log('\nRecommandations supplémentaires:');
  console.log('1. Exécuter: npm run prebuild-check');
  console.log('2. Tester sur différentes plateformes');
  console.log('3. Vérifier les performances avec React DevTools');
  console.log('4. Configurer un service de monitoring (Sentry, etc.)');
  process.exit(0);
}