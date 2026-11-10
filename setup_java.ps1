# Configuration automatique de Java pour Acemia
$env:JAVA_HOME = "G:\JAVA"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
Write-Host "✅ JAVA_HOME configuré sur G:\JAVA" -ForegroundColor Green
Write-Host "🚀 Vous pouvez maintenant lancer : npx expo run:android --variant release" -ForegroundColor Cyan
