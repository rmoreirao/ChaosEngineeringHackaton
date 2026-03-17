<#
.SYNOPSIS
    Tears down all hackathon team environments defined in teams.json.

.DESCRIPTION
    Deletes the Azure Resource Group for each team, which removes all resources inside it
    (AKS, ACR, VNet, Identity). This is irreversible.

.PARAMETER TeamsFile
    Path to the teams.json configuration file. Default: teams.json in the same directory.

.PARAMETER TeamName
    Optional. Tear down only a specific team by name (e.g., "team-alpha").

.PARAMETER Force
    Skip the confirmation prompt.

.EXAMPLE
    .\teardown-teams.ps1
    .\teardown-teams.ps1 -TeamName "team-alpha"
    .\teardown-teams.ps1 -Force
#>

param(
    [string]$TeamsFile = "$PSScriptRoot\teams.json",
    [string]$TeamName = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

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

$rgNames = $teams | ForEach-Object { "rg-$($_.name)" }

Write-Host "============================================" -ForegroundColor Red
Write-Host " Chaos Engineering Hackathon - TEARDOWN" -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""
Write-Host "The following resource groups will be DELETED:" -ForegroundColor Yellow
$rgNames | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
Write-Host ""

if (-not $Force) {
    $confirm = Read-Host "Type 'yes' to confirm deletion"
    if ($confirm -ne "yes") {
        Write-Host "Cancelled." -ForegroundColor Gray
        exit 0
    }
}

Write-Host ""

foreach ($team in $teams) {
    $rgName = "rg-$($team.name)"

    Write-Host "Deleting $rgName..." -ForegroundColor Red -NoNewline

    # Check if RG exists
    $exists = az group exists --name $rgName 2>$null
    if ($exists -ne "true") {
        Write-Host " (not found, skipping)" -ForegroundColor Gray
        continue
    }

    az group delete --name $rgName --yes --no-wait --output none 2>$null
    Write-Host " deletion started (async)" -ForegroundColor DarkGray

    # Remove kubectl context if it exists
    kubectl config delete-context "$($team.name)-aks-admin" 2>$null | Out-Null
    kubectl config delete-cluster "$($team.name)-aks" 2>$null | Out-Null
}

Write-Host ""
Write-Host "All deletions initiated. Resource groups are being deleted in the background." -ForegroundColor Cyan
Write-Host "Use 'az group list --query ""[?starts_with(name, 'rg-team-')]"" -o table' to check progress." -ForegroundColor DarkGray

# Clean up deployment summary if it exists
$summaryFile = "$PSScriptRoot\deployment-summary.json"
if (Test-Path $summaryFile) {
    Remove-Item $summaryFile -Force
    Write-Host "Removed deployment-summary.json" -ForegroundColor DarkGray
}
