<#
.SYNOPSIS
    Lists all hackathon team environments with key resource details.

.DESCRIPTION
    For each team in teams.json, queries Azure to display:
    - Resource Group name and provisioning state
    - AKS cluster name and Kubernetes version
    - Frontend public IP address (LoadBalancer)

.PARAMETER TeamsFile
    Path to the teams.json configuration file. Default: teams.json in the same directory.

.PARAMETER TeamName
    Optional. List only a specific team by name.

.EXAMPLE
    .\list-teams.ps1
    .\list-teams.ps1 -TeamName "kad-chaos-team1"
#>

param(
    [string]$TeamsFile = "$PSScriptRoot\teams.json",
    [string]$TeamName = ""
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

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Chaos Engineering Hackathon - Environments" -ForegroundColor Cyan
Write-Host " Teams: $($teams.Count)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$results = @()

foreach ($team in $teams) {
    $name = $team.name
    $rgName = "rg-$name"
    $aksName = "$name-aks"

    # Check if resource group exists
    $rgExists = az group exists --name $rgName 2>$null
    if ($rgExists -ne "true") {
        $results += [PSCustomObject]@{
            Team          = $name
            ResourceGroup = $rgName
            RGStatus      = "NOT FOUND"
            AKSCluster    = $aksName
            K8sVersion    = "—"
            FrontendIP    = "—"
        }
        continue
    }

    # Get RG provisioning state
    $rgState = az group show --name $rgName --query properties.provisioningState --output tsv 2>$null
    if (-not $rgState) { $rgState = "Unknown" }

    # Get AKS cluster info
    $k8sVersion = "—"
    $aksInfo = az aks show --resource-group $rgName --name $aksName --query kubernetesVersion --output tsv 2>$null
    if ($LASTEXITCODE -eq 0 -and $aksInfo) {
        $k8sVersion = $aksInfo
    }

    # Get frontend public IP via kubectl
    $frontendIP = "—"
    # Switch context to this team's cluster
    az aks get-credentials --resource-group $rgName --name $aksName --overwrite-existing --admin --output none 2>$null
    if ($LASTEXITCODE -eq 0) {
        $ip = kubectl get svc frontend -n oranje-markt -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $ip) {
            $frontendIP = $ip
        }
    }

    $results += [PSCustomObject]@{
        Team          = $name
        ResourceGroup = $rgName
        RGStatus      = $rgState
        AKSCluster    = $aksName
        K8sVersion    = $k8sVersion
        FrontendIP    = $frontendIP
    }
}

$results | Format-Table -AutoSize

# Show access URLs for teams with IPs
$withIPs = $results | Where-Object { $_.FrontendIP -ne "—" }
if ($withIPs) {
    Write-Host "Access URLs:" -ForegroundColor Green
    foreach ($r in $withIPs) {
        Write-Host "  $($r.Team): http://$($r.FrontendIP)" -ForegroundColor Cyan
    }
    Write-Host ""
}
