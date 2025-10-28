# -------------------------------------------------------------
# HeartLink Provider Platform — Scaffold Builder (PowerShell)
# Creates backend + frontend folder structure and placeholder files
# -------------------------------------------------------------

Write-Host "🚀 Building HeartLink Provider Platform folder structure..." -ForegroundColor Cyan

$root = "heartlink-provider-platform"

# Create directories
New-Item -ItemType Directory -Force -Path `
    "$root/backend/src/routes", `
    "$root/backend/src/controllers", `
    "$root/backend/src/models", `
    "$root/backend/src/utils", `
    "$root/backend/src/config", `
    "$root/backend/src/middleware", `
    "$root/frontend/src/components", `
    "$root/frontend/src/pages", `
    "$root/frontend/src/services", `
    "$root/frontend/src/theme" | Out-Null

# Create files
New-Item -ItemType File -Force -Path `
    "$root/README.md", `
    "$root/backend/package.json", `
    "$root/backend/.env.example", `
    "$root/backend/src/app.js", `
    "$root/backend/src/server.js", `
    "$root/backend/src/routes/authRoutes.js", `
    "$root/backend/src/routes/patientRoutes.js", `
    "$root/backend/src/routes/checkinRoutes.js", `
    "$root/backend/src/controllers/authController.js", `
    "$root/backend/src/controllers/patientController.js", `
    "$root/backend/src/controllers/checkinController.js", `
    "$root/backend/src/middleware/authMiddleware.js", `
    "$root/backend/src/utils/jwtUtils.js", `
    "$root/backend/src/config/db.js", `
    "$root/frontend/package.json", `
    "$root/frontend/.env.example", `
    "$root/frontend/src/App.js", `
    "$root/frontend/src/index.js", `
    "$root/frontend/src/components/HeroHeader.js", `
    "$root/frontend/src/components/PatientCard.js", `
    "$root/frontend/src/pages/LoginPage.js", `
    "$root/frontend/src/pages/DashboardPage.js", `
    "$root/frontend/src/pages/PatientDetailPage.js", `
    "$root/frontend/src/services/api.js", `
    "$root/frontend/src/theme/colors.js", `
    "$root/frontend/src/theme/theme.js" | Out-Null

Write-Host "✅ Folder structure created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "👉 Next steps:" -ForegroundColor Yellow
Write-Host "1. cd heartlink-provider-platform/backend && npm init -y"
Write-Host "2. npm install express cors dotenv morgan firebase-admin jsonwebtoken"
Write-Host "3. cd ../frontend && npm create vite@latest . -- --template react"
Write-Host "4. npm install axios react-router-dom"
Write-Host ""
Write-Host "Then paste in the provided backend/frontend code blocks to populate files." -ForegroundColor Yellow
Write-Host "-------------------------------------------------------------"
