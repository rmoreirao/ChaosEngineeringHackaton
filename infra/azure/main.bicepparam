using 'main.bicep'

// ---------- General ----------
// Note: this template now deploys at resourceGroup scope, so the resource
// group must already exist. Pass --resource-group <name> to `az deployment
// group create`. The `location` defaults to the RG's location if omitted.
// `namePrefix` should match the team's `resourcesSuffix` in teams.json
// (short, alphanumeric, <= ~20 chars).
param location = 'germanywestcentral'
param namePrefix = 'devaihack'

// ---------- Networking ----------
param vnetAddressPrefix = '10.0.0.0/16'
param aksSubnetAddressPrefix = '10.0.0.0/22'
param aksSubnetName = 'snet-aks'
param networkPlugin = 'azure'
param networkPolicy = 'azure'

// ---------- AKS ----------
param kubernetesVersion = '1.34'
param systemNodeVmSize = 'Standard_D2s_v3'
param systemNodeCount = 2

// ---------- Tags ----------
param tags = {
  environment: 'dev'
  project: 'aks-workshop'
}
