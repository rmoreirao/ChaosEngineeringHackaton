<#
.SYNOPSIS
    Deploys independent Azure environments for each hackathon team defined in teams.json.

.DESCRIPTION
    For each team in teams.json, this script:
    1. Deploys Azure infrastructure (RG, VNet, Identity, AKS, ACR) via Bicep
    2. Attaches ACR to AKS for image pull permissions
    3. Builds Docker images locally and pushes to the team's ACR
    4. Deploys Kubernetes manifests to the team's AKS cluster
    5. Outputs the frontend LoadBalancer IP for each team

.PARAMETER TeamsFile
    Path to the teams.json configuration file. Default: teams.json in the same directory.

.PARAMETER TeamName
    Optional. Deploy only a specific team by name (e.g., "team-alpha").

.EXAMPLE
    .\deploy-teams.ps1
    .\deploy-teams.ps1 -TeamName "team-alpha"
#>

param(
    [string]$TeamsFile = "$PSScriptRoot\teams.json",
    [string]$TeamName = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$K8sDir = "$RepoRoot\infra\k8s"
$BicepFile = "$PSScriptRoot\main.bicep"

# --- Load teams config ---
if (-not (Test-Path $TeamsFile)) {
    Write-Error "Teams file not found: $TeamsFile"
    exit 1
}

$config = Get-Content $TeamsFile -Raw | ConvertFrom-Json
$defaults = $config.defaults
$teams = $config.teams

if ($TeamName) {
    $teams = $teams | Where-Object { $_.name -eq $TeamName }
    if (-not $teams) {
        Write-Error "Team '$TeamName' not found in $TeamsFile"
        exit 1
    }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Chaos Engineering Hackathon - Team Deploy" -ForegroundColor Cyan
Write-Host " Teams: $($teams.Count) | Region: $($defaults.location)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$results = @()

foreach ($team in $teams) {
    $name = $team.name
    $rgName = "rg-$name"
    $acrName = ($name -replace '-', '') + "acr"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host " Deploying: $name" -ForegroundColor Yellow
    Write-Host " RG: $rgName | ACR: $acrName" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow

    # --- Step 1: Deploy Bicep infrastructure ---
    Write-Host "`n[1/6] Deploying Azure infrastructure (Bicep)..." -ForegroundColor Green
    az deployment sub create `
        --location $defaults.location `
        --template-file $BicepFile `
        --parameters `
            location=$($defaults.location) `
            resourceGroupName=$rgName `
            namePrefix=$name `
            kubernetesVersion=$($defaults.kubernetesVersion) `
            systemNodeVmSize=$($defaults.systemNodeVmSize) `
            systemNodeCount=$($defaults.systemNodeCount) `
        --name "deploy-$name" `
        --output none

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Bicep deployment failed for $name"
        continue
    }
    Write-Host "  Infrastructure deployed." -ForegroundColor DarkGreen

    # --- Step 2: Attach ACR to AKS ---
    Write-Host "`n[2/6] Attaching ACR to AKS..." -ForegroundColor Green
    az aks update `
        --resource-group $rgName `
        --name "$name-aks" `
        --attach-acr $acrName `
        --output none 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "ACR attach may have failed for $name — continuing"
    }
    Write-Host "  ACR attached." -ForegroundColor DarkGreen

    # --- Step 3: Build and push Docker images (local build + push) ---
    Write-Host "`n[3/6] Building and pushing Docker images..." -ForegroundColor Green

    $acrLoginServer = az acr show --name $acrName --query loginServer --output tsv 2>$null

    Write-Host "  Logging in to ACR ($acrLoginServer)..."
    az acr login --name $acrName --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ACR login failed for $name"
        continue
    }

    $backendImage = "$acrLoginServer/oranje-markt-backend:latest"
    $frontendImage = "$acrLoginServer/oranje-markt-frontend:latest"

    Write-Host "  Building backend (local)..."
    docker build -t $backendImage "$RepoRoot\backend" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend image build failed for $name"
        continue
    }

    Write-Host "  Building frontend (local)..."
    docker build -t $frontendImage "$RepoRoot\frontend" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend image build failed for $name"
        continue
    }

    Write-Host "  Pushing backend..."
    docker push $backendImage 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend image push failed for $name"
        continue
    }

    Write-Host "  Pushing frontend..."
    docker push $frontendImage 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend image push failed for $name"
        continue
    }
    Write-Host "  Images built and pushed." -ForegroundColor DarkGreen

    # --- Step 4: Get AKS credentials ---
    Write-Host "`n[4/6] Getting AKS credentials..." -ForegroundColor Green
    az aks get-credentials `
        --resource-group $rgName `
        --name "$name-aks" `
        --overwrite-existing `
        --admin `
        --output none 2>$null

    Write-Host "  Credentials configured." -ForegroundColor DarkGreen

    # --- Step 5: Deploy K8s manifests ---
    Write-Host "`n[5/6] Deploying Kubernetes manifests..." -ForegroundColor Green

    # $acrLoginServer already set in Step 3

    # Create a temp directory for patched manifests
    $tempDir = New-Item -ItemType Directory -Path "$env:TEMP\k8s-$name" -Force

    # Copy all K8s manifests to temp dir
    Copy-Item -Path "$K8sDir\*" -Destination $tempDir -Recurse -Force

    # Replace ACR image references in all YAML files
    Get-ChildItem -Path $tempDir -Recurse -Filter "*.yaml" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $content = $content -replace 'devaihackathonacr\.azurecr\.io', $acrLoginServer
        Set-Content -Path $_.FullName -Value $content
    }

    # Apply manifests in order
    kubectl apply -f "$tempDir\namespace.yaml" 2>$null
    kubectl apply -f "$tempDir\postgres\" 2>$null

    Write-Host "  Waiting for PostgreSQL..."
    kubectl wait --for=condition=ready pod -l app=postgres -n oranje-markt --timeout=120s 2>$null

    kubectl apply -f "$tempDir\backend\" 2>$null
    kubectl apply -f "$tempDir\frontend\" 2>$null

    # Deploy observability stack
    $obsDir = "$tempDir\observability"
    if (Test-Path $obsDir) {
        Get-ChildItem -Path $obsDir -Directory | ForEach-Object {
            kubectl apply -f $_.FullName 2>$null
        }
    }

    # Clean up temp dir
    Remove-Item -Path $tempDir -Recurse -Force

    Write-Host "  Manifests applied." -ForegroundColor DarkGreen

    # --- Step 6: Get frontend LoadBalancer IP ---
    Write-Host "`n[6/6] Waiting for LoadBalancer IP..." -ForegroundColor Green

    $ip = ""
    $attempts = 0
    while ($ip -eq "" -or $ip -eq "<pending>" -and $attempts -lt 30) {
        Start-Sleep -Seconds 5
        $ip = kubectl get svc frontend -n oranje-markt -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        $attempts++
    }

    if ($ip) {
        Write-Host "  Frontend URL: http://$ip" -ForegroundColor Cyan
    } else {
        Write-Warning "  LoadBalancer IP not yet assigned for $name"
        $ip = "(pending)"
    }

    $results += [PSCustomObject]@{
        Team = $name
        ResourceGroup = $rgName
        AKS = "$name-aks"
        ACR = $acrName
        FrontendURL = "http://$ip"
    }
}

# --- Summary ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Deployment Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize

# Save summary to file
$summaryFile = "$PSScriptRoot\deployment-summary.json"
$results | ConvertTo-Json | Set-Content $summaryFile
Write-Host "Summary saved to: $summaryFile" -ForegroundColor DarkGray
