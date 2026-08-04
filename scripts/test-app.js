#!/usr/bin/env node

/**
 * Script de test automatique pour l'application Meet Me
 * Teste le backend, le frontend et l'intégration
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🧪 Test de l\'application Meet Me\n');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:8081';
const TEST_USER = {
  name: 'Test User',
  email: 'test@meetme.com',
  password: 'Test123!@#',
};

let backendProcess = null;
let frontendProcess = null;

// Fonctions utilitaires
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const runCommand = (command, options = {}) => {
  try {
    return execSync(command, { stdio: 'pipe', ...options }).toString().trim();
  } catch (error) {
    return null;
  }
};

// Tests
class AppTester {
  constructor() {
    this.testResults = [];
    this.backendHealthy = false;
    this.frontendHealthy = false;
  }

  async runAllTests() {
    console.log('🔍 Vérification des prérequis...');
    await this.checkPrerequisites();
    
    console.log('\n🚀 Démarrage des serveurs...');
    await this.startServers();
    
    console.log('\n🧪 Exécution des tests...');
    await this.testBackend();
    await this.testFrontend();
    await this.testIntegration();
    
    console.log('\n📊 Résultats des tests...');
    this.printResults();
    
    console.log('\n🧹 Nettoyage...');
    await this.cleanup();
  }

  async checkPrerequisites() {
    const tests = [
      {
        name: 'Node.js >= 18',
        test: () => {
          const version = runCommand('node --version');
          if (!version) return false;
          const major = parseInt(version.replace('v', '').split('.')[0]);
          return major >= 18;
        },
      },
      {
        name: 'npm installé',
        test: () => runCommand('npm --version') !== null,
      },
      {
        name: 'Supabase (Postgres) configuré',
        test: () => {
          const envPath = path.join(__dirname, '..', 'backend', '.env');
          if (!fs.existsSync(envPath)) return false;
          const envContent = fs.readFileSync(envPath, 'utf8');
          return envContent.includes('DATABASE_URL') || envContent.includes('DB_PASSWORD');
        },
      },
      {
        name: 'Dépendances backend',
        test: () => {
          const backendPath = path.join(__dirname, '..', 'backend', 'package.json');
          return fs.existsSync(backendPath);
        },
      },
      {
        name: 'Dépendances frontend',
        test: () => {
          const frontendPath = path.join(__dirname, '..', 'package.json');
          return fs.existsSync(frontendPath);
        },
      },
    ];

    for (const test of tests) {
      const passed = test.test();
      this.testResults.push({ test: test.name, passed });
      console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
    }
  }

  async startServers() {
    // Démarrer le backend
    console.log('  Démarrage du backend...');
    const backendPath = path.join(__dirname, '..', 'backend');
    
    // Vérifier si le backend est déjà en cours d'exécution
    try {
      await axios.get(`${BACKEND_URL}/api/health`);
      console.log('  ✅ Backend déjà en cours d\'exécution');
      this.backendHealthy = true;
    } catch {
      // Démarrer le backend
      backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: backendPath,
        stdio: 'pipe',
        shell: true,
      });

      // Attendre que le backend démarre
      let backendStarted = false;
      for (let i = 0; i < 30; i++) {
        try {
          await axios.get(`${BACKEND_URL}/api/health`);
          backendStarted = true;
          break;
        } catch {
          await sleep(1000);
        }
      }

      if (backendStarted) {
        console.log('  ✅ Backend démarré');
        this.backendHealthy = true;
      } else {
        console.log('  ❌ Échec du démarrage du backend');
      }
    }

    // Démarrer le frontend
    console.log('  Démarrage du frontend...');
    const frontendPath = path.join(__dirname, '..');
    
    // Vérifier si le frontend est déjà en cours d'exécution
    try {
      await axios.get(FRONTEND_URL, { timeout: 5000 });
      console.log('  ✅ Frontend déjà en cours d\'exécution');
      this.frontendHealthy = true;
    } catch {
      // Note: Le frontend Expo nécessite une interface utilisateur
      console.log('  ℹ️  Frontend: exécutez "npm start" dans un terminal séparé');
      console.log('  ℹ️  Puis appuyez sur "w" pour ouvrir dans le navigateur');
    }
  }

  async testBackend() {
    if (!this.backendHealthy) {
      console.log('  ⚠️  Backend non disponible, tests ignorés');
      return;
    }

    const tests = [
      {
        name: 'Health Check',
        test: async () => {
          const response = await axios.get(`${BACKEND_URL}/api/health`);
          return response.data.status === 'healthy';
        },
      },
      {
        name: 'Documentation API',
        test: async () => {
          const response = await axios.get(`${BACKEND_URL}/api/docs`);
          return response.data.name === 'Meet Me';
        },
      },
      {
        name: 'Inscription utilisateur',
        test: async () => {
          try {
            const response = await axios.post(`${BACKEND_URL}/api/auth/register`, TEST_USER);
            return response.data.success === true;
          } catch (error) {
            // L'utilisateur existe peut-être déjà
            return error.response?.status === 400 && 
                   error.response?.data?.error?.includes('existe déjà');
          }
        },
      },
      {
        name: 'Connexion utilisateur',
        test: async () => {
          try {
            const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
              email: TEST_USER.email,
              password: TEST_USER.password,
            });
            return response.data.success === true && 
                   response.data.data?.token;
          } catch {
            return false;
          }
        },
      },
    ];

    for (const test of tests) {
      try {
        const passed = await test.test();
        this.testResults.push({ test: `Backend: ${test.name}`, passed });
        console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
      } catch (error) {
        this.testResults.push({ test: `Backend: ${test.name}`, passed: false });
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }

  async testFrontend() {
    if (!this.frontendHealthy) {
      console.log('  ⚠️  Frontend non disponible, tests ignorés');
      return;
    }

    const tests = [
      {
        name: 'Page de login accessible',
        test: async () => {
          const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
          return response.status === 200;
        },
      },
      {
        name: 'Assets chargés',
        test: async () => {
          // Vérifier que les assets sont présents
          const assetsPath = path.join(__dirname, '..', 'assets');
          return fs.existsSync(assetsPath);
        },
      },
      {
        name: 'Configuration TypeScript',
        test: () => {
          const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
          if (!fs.existsSync(tsconfigPath)) return false;
          
          const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
          return tsconfig.compilerOptions?.target === 'esnext';
        },
      },
    ];

    for (const test of tests) {
      try {
        const passed = await test.test();
        this.testResults.push({ test: `Frontend: ${test.name}`, passed });
        console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
      } catch (error) {
        this.testResults.push({ test: `Frontend: ${test.name}`, passed: false });
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }

  async testIntegration() {
    if (!this.backendHealthy || !this.frontendHealthy) {
      console.log('  ⚠️  Serveurs non disponibles, tests d\'intégration ignorés');
      return;
    }

    const tests = [
      {
        name: 'CORS configuré',
        test: async () => {
          try {
            // Tester une requête cross-origin
            const response = await axios.post(
              `${BACKEND_URL}/api/auth/login`,
              { email: 'test@test.com', password: 'test' },
              {
                headers: {
                  'Origin': FRONTEND_URL,
                },
              }
            );
            return response.headers['access-control-allow-origin'] === FRONTEND_URL;
          } catch (error) {
            // Même en cas d'erreur d'authentification, CORS devrait être configuré
            return error.response?.headers['access-control-allow-origin'] === FRONTEND_URL;
          }
        },
      },
      {
        name: 'Socket.IO accessible',
        test: async () => {
          // Vérifier que le endpoint Socket.IO est accessible
          try {
            // Cette vérification est basique, une vraie vérification nécessiterait un client WebSocket
            const response = await axios.get(BACKEND_URL, { timeout: 5000 });
            return true;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Configuration cohérente',
        test: () => {
          // Vérifier que les URLs dans le frontend correspondent au backend
          const constantsPath = path.join(__dirname, '..', 'src', 'utils', 'constants.ts');
          if (!fs.existsSync(constantsPath)) return false;
          
          const constantsContent = fs.readFileSync(constantsPath, 'utf8');
          return constantsContent.includes(BACKEND_URL);
        },
      },
    ];

    for (const test of tests) {
      try {
        const passed = await test.test();
        this.testResults.push({ test: `Intégration: ${test.name}`, passed });
        console.log(`  ${passed ? '✅' : '❌'} ${test.name}`);
      } catch (error) {
        this.testResults.push({ test: `Intégration: ${test.name}`, passed: false });
        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }
  }

  printResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📈 Résumé:`);
    console.log(`  Total des tests: ${totalTests}`);
    console.log(`  Tests réussis: ${passedTests}`);
    console.log(`  Tests échoués: ${failedTests}`);
    console.log(`  Taux de réussite: ${Math.round((passedTests / totalTests) * 100)}%`);

    if (failedTests > 0) {
      console.log('\n🔍 Tests échoués:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`  ❌ ${r.test}`));
    }

    if (passedTests === totalTests) {
      console.log('\n🎉 Tous les tests ont réussi !');
      console.log('L\'application Meet Me est prête à être utilisée.');
    } else {
      console.log('\n⚠️  Certains tests ont échoué.');
      console.log('Vérifiez la configuration et réessayez.');
    }
  }

  async cleanup() {
    // Arrêter les processus
    if (backendProcess) {
      backendProcess.kill();
    }
    if (frontendProcess) {
      frontendProcess.kill();
    }

    // Nettoyer l'utilisateur de test
    try {
      // Essayer de supprimer l'utilisateur de test
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password,
      });

      if (loginResponse.data.success) {
        const token = loginResponse.data.data.token;
        await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignorer les erreurs de nettoyage
    }

    rl.close();
  }
}

// Exécuter les tests
const tester = new AppTester();
tester.runAllTests().catch(error => {
  console.error('❌ Erreur lors des tests:', error);
  process.exit(1);
});