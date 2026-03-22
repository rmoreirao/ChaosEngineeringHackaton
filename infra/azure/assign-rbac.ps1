<#
.SYNOPSIS
    Assigns Azure RBAC roles for hackathon team members on their AKS cluster and ACR.

.DESCRIPTION
    For each team in teams.json that has a "users" array, this script:
    1. Resolves each user email to an Entra ID (Azure AD) object ID
    2. Assigns "Azure Kubernetes Service RBAC Cluster Admin" on the team's AKS cluster
    3. Assigns "AcrPull" on the team's ACR
    Role assignments are idempotent — re-running is safe (existing assignments are skipped).

.PARAMETER TeamsFile
    Path to the teams.json configuration file. Default: teams.json in the same directory.

.PARAMETER TeamName
    Optional. Assign roles for a specific team only (e.g., "kad-chaos-team1").

.EXAMPLE
    .\assign-rbac.ps1
    .\assign-rbac.ps1 -TeamName "kad-chaos-team1"
#>

param(
    [string]$TeamsFile = "$PSScriptRoot\teams.json",
    [string]$TeamName = ""
)

$ErrorActionPreference = "Stop"

# Well-known Azure built-in role definition IDs
$AKS_CLUSTER_ADMIN_ROLE = "b1ff04bb-8a4e-4dc4-8eb5-8693973ce19b"  # Azure Kubernetes Service RBAC Cluster Admin
$ACR_PULL_ROLE = "7f951dda-4ed3-4680-a7ca-43fe172d538d"            # AcrPull

# --- Load teams config ---
if (-not (Test-Path $TeamsFile)) {
    Write-Error "Teams file not found: $TeamsFile"
    exit 1
}

$config = Get-Content $TeamsFile -Raw | ConvertFrom-Json
$teams = $config.teams

if ($TeamName) {
    $teams = $teams | Where-Object { $_.name -eq $TeamName }
    if (-not $teams) {
        Write-Error "Team '$TeamName' not found in $TeamsFile"
        exit 1
    }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Chaos Engineering Hackathon - RBAC Setup" -ForegroundColor Cyan
Write-Host " Teams: $($teams.Count)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$results = @()

foreach ($team in $teams) {
    $name = $team.name
    $rgName = "rg-$name"
    $aksName = "$name-aks"
    $acrName = ($name -replace '-', '') + "acr"

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host " Team: $name" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow

    # Check if team has users defined
    if (-not $team.users -or $team.users.Count -eq 0) {
        Write-Host "  [SKIP] No users defined for this team" -ForegroundColor DarkGray
        continue
    }

    Write-Host "  Users: $($team.users.Count)" -ForegroundColor Gray

    # Resolve AKS cluster resource ID
    Write-Host "  Resolving AKS cluster ID..." -ForegroundColor Gray
    $aksId = az aks show --resource-group $rgName --name $aksName --query id --output tsv 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $aksId) {
        Write-Warning "  AKS cluster '$aksName' not found in '$rgName' — skipping team"
        continue
    }

    # Resolve ACR resource ID
    Write-Host "  Resolving ACR ID..." -ForegroundColor Gray
    $acrId = az acr show --name $acrName --query id --output tsv 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $acrId) {
        Write-Warning "  ACR '$acrName' not found — skipping ACR role assignments"
        $acrId = $null
    }

    foreach ($userEmail in $team.users) {
        Write-Host ""
        Write-Host "  User: $userEmail" -ForegroundColor White

        # Resolve user email to Entra ID object ID
        $userId = az ad user show --id $userEmail --query id --output tsv 2>$null
        if ($LASTEXITCODE -ne 0 -or -not $userId) {
            Write-Warning "    User '$userEmail' not found in Entra ID — skipping"
            $results += [PSCustomObject]@{
                Team   = $name
                User   = $userEmail
                Role   = "—"
                Scope  = "—"
                Status = "USER NOT FOUND"
            }
            continue
        }

        Write-Host "    Object ID: $userId" -ForegroundColor DarkGray

        # Assign AKS RBAC Cluster Admin on the AKS cluster
        Write-Host "    Assigning AKS RBAC Cluster Admin..." -ForegroundColor Green -NoNewline
        az role assignment create `
            --assignee-object-id $userId `
            --assignee-principal-type User `
            --role $AKS_CLUSTER_ADMIN_ROLE `
            --scope $aksId `
            --output none 2>$null

        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor DarkGreen
            $aksStatus = "Assigned"
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            $aksStatus = "Failed"
        }

        $results += [PSCustomObject]@{
            Team   = $name
            User   = $userEmail
            Role   = "AKS RBAC Cluster Admin"
            Scope  = $aksName
            Status = $aksStatus
        }

        # Assign AcrPull on the ACR
        if ($acrId) {
            Write-Host "    Assigning AcrPull..." -ForegroundColor Green -NoNewline
            az role assignment create `
                --assignee-object-id $userId `
                --assignee-principal-type User `
                --role $ACR_PULL_ROLE `
                --scope $acrId `
                --output none 2>$null

            if ($LASTEXITCODE -eq 0) {
                Write-Host " OK" -ForegroundColor DarkGreen
                $acrStatus = "Assigned"
            } else {
                Write-Host " FAILED" -ForegroundColor Red
                $acrStatus = "Failed"
            }

            $results += [PSCustomObject]@{
                Team   = $name
                User   = $userEmail
                Role   = "AcrPull"
                Scope  = $acrName
                Status = $acrStatus
            }
        }
    }
}

# --- Summary ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RBAC Assignment Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($results.Count -gt 0) {
    $results | Format-Table -AutoSize
} else {
    Write-Host "  No role assignments made. Add user emails to the 'users' array in teams.json." -ForegroundColor DarkGray
}
