# ─── LogiSync v2.0 - Windows AWS Deployment Automation Script ──────────────────
# This script guides you through deploying the LogiSync architecture to AWS.

param(
    [string]$Region = "ap-south-1",
    [string]$StackName = "LogiSync-Production-Stack"
)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  LOGISYNC v2.0 - VOC PORT LOGISTICS COMMAND CENTER AWS DEPLOY  " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "[1/4] Checking Docker status..." -ForegroundColor Green
try {
    $dockerVer = docker --version
    Write-Host "  Docker detected: $dockerVer" -ForegroundColor White
} catch {
    Write-Warning "  Docker is not running or not installed. Please launch Docker Desktop."
}

# Check AWS CLI
Write-Host ""
Write-Host "[2/4] Checking AWS CLI installation..." -ForegroundColor Green
$awsCmd = Get-Command aws -ErrorAction SilentlyContinue
if (-not $awsCmd) {
    Write-Host "  AWS CLI not found on PATH." -ForegroundColor Yellow
    Write-Host "  To install AWS CLI on Windows, run in an admin shell:" -ForegroundColor Cyan
    Write-Host "    msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor White
    Write-Host "  Or download from: https://aws.amazon.com/cli/" -ForegroundColor White
} else {
    Write-Host "  AWS CLI detected!" -ForegroundColor White
    Write-Host "  Verifying current AWS Identity..." -ForegroundColor White
    aws sts get-caller-identity
}

# Build Frontend Bundle
Write-Host ""
Write-Host "[3/4] Compiling React 19 Frontend production bundle..." -ForegroundColor Green
Push-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend compilation failed. Please fix any build errors."
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "  Frontend compiled successfully to frontend/dist/" -ForegroundColor White

# Deployment Choices
Write-Host ""
Write-Host "[4/4] Choose your deployment path:" -ForegroundColor Green
Write-Host "  Option 1: Deploy using Terraform (Recommended for highest viva marks)" -ForegroundColor White
Write-Host "  Option 2: Deploy using CloudFormation Template (1-click via AWS Console)" -ForegroundColor White
Write-Host "  Option 3: Run full stack locally using Docker Compose (Postgres + Backend + Frontend)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter option number (1, 2, or 3)"

switch ($choice) {
    "1" {
        Write-Host "Deploying via Terraform..." -ForegroundColor Cyan
        Push-Location terraform
        terraform init
        terraform plan
        $confirm = Read-Host "Do you want to apply this infrastructure? (yes/no)"
        if ($confirm -eq "yes") {
            terraform apply -auto-approve
        }
        Pop-Location
    }
    "2" {
        Write-Host "CloudFormation Template located at: deploy/cloudformation-template.yaml" -ForegroundColor Cyan
        Write-Host "Steps:" -ForegroundColor White
        Write-Host "  1. Log into https://console.aws.amazon.com" -ForegroundColor White
        Write-Host "  2. Go to CloudFormation -> Create stack -> With new resources" -ForegroundColor White
        Write-Host "  3. Select 'Upload a template file' and upload deploy/cloudformation-template.yaml" -ForegroundColor White
        Write-Host "  4. Click Next, enter your Database Password, and click Submit!" -ForegroundColor White
    }
    "3" {
        Write-Host "Launching local production-grade containers via Docker Compose..." -ForegroundColor Cyan
        docker-compose up --build -d
        Write-Host "Services running at:" -ForegroundColor White
        Write-Host "  Frontend: http://localhost" -ForegroundColor Green
        Write-Host "  Backend API: http://localhost:8000/docs" -ForegroundColor Green
        Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Green
    }
    default {
        Write-Host "No option selected. Refer to docs/AWS_ARCHITECTURE.md for complete details." -ForegroundColor Yellow
    }
}
