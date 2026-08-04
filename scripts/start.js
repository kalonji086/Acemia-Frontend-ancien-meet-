#!/usr/bin/env node

/**
 * Script de démarrage de l'application Meet Me
 * Ce script vérifie les dépendances et démarre l'application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage de Meet Me...\n');

// Vérifier si Node.js est installé
try {
  const nodeVersion = execSync('node --version').toString().trim();
  console.log(`✅ Node.js ${nodeVersion} détecté`);
} catch (error) {
  console.error('❌ Node.js n\'est pas installé');
  console.error('Veuillez installer Node.js depuis https://nodejs.org/');
  process.exit(1);
}

// Vérifier si npm est installé
try {
  const npmVersion = execSync('npm --version').toString().trim();
  console.log(`✅ npm ${npmVersion} détecté`);
} catch (error) {
  console.error('❌ npm n\'est pas installé');
  process.exit(1);
}

// Vérifier si Expo CLI est installé
try {
  const expoVersion = execSync('npx expo --version').toString().trim();
  console.log(`✅ Expo CLI ${expoVersion} détecté`);
} catch (error) {
  console.log('📦 Installation d\'Expo CLI...');
  try {
    execSync('npm install -g expo-cli', { stdio: 'inherit' });
    console.log('✅ Expo CLI installé avec succès');
  } catch (installError) {
    console.error('❌ Échec de l\'installation d\'Expo CLI');
    process.exit(1);
  }
}

// Vérifier les dépendances
console.log('\n📦 Vérification des dépendances...');
try {
  execSync('npm list', { stdio: 'pipe' });
  console.log('✅ Toutes les dépendances sont installées');
} catch (error) {
  console.log('📦 Installation des dépendances manquantes...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dépendances installées avec succès');
  } catch (installError) {
    console.error('❌ Échec de l\'installation des dépendances');
    process.exit(1);
  }
}

// Vérifier le fichier .env
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('\n⚠️  Fichier .env non trouvé');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('📋 Création du fichier .env à partir du template...');
    try {
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      fs.writeFileSync(envPath, envExample);
      console.log('✅ Fichier .env créé');
      console.log('⚠️  N\'oubliez pas de configurer vos clés API dans le fichier .env');
    } catch (error) {
      console.error('❌ Impossible de créer le fichier .env');
    }
  } else {
    console.log('❌ Fichier .env.example non trouvé');
  }
} else {
  console.log('✅ Fichier .env détecté');
}

// Démarrer l'application
console.log('\n🎉 Toutes les vérifications sont terminées !');
console.log('\n📱 Options de démarrage :');
console.log('1. Démarrage normal: npm start');
console.log('2. Pour iOS: npm run ios');
console.log('3. Pour Android: npm run android');
console.log('4. Pour Web: npm run web');
console.log('\n🔧 Pour développer:');
console.log('- npm start -- --clear (effacer le cache)');
console.log('- npm start -- --tunnel (tunnel pour appareils distants)');
console.log('\n🚀 Démarrage de l\'application...\n');

try {
  execSync('npx expo start', { stdio: 'inherit' });
} catch (error) {
  console.error('\n❌ Erreur lors du démarrage de l\'application');
  console.error('Assurez-vous que:');
  console.error('1. Tous les ports nécessaires sont disponibles');
  console.error('2. Vous avez une connexion internet stable');
  console.error('3. Les variables d\'environnement sont correctement configurées');
  process.exit(1);
}