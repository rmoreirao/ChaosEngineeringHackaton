// ============================================================================
// Module: Azure Container Registry
// Deploys an ACR instance for storing Docker images pulled by AKS.
// ============================================================================

// ---------- Parameters ----------

@description('Azure region for the ACR resource')
param location string

@description('Name prefix used to generate resource names')
param namePrefix string

@description('ACR SKU (Basic is cheapest, sufficient for hackathon)')
@allowed(['Basic', 'Standard', 'Premium'])
param sku string = 'Basic'

@description('Tags to apply to all resources')
param tags object = {}

// ---------- Variables ----------

// ACR names must be globally unique, alphanumeric only, 5-50 chars
var acrName = replace('${namePrefix}acr', '-', '')

// ---------- Resources ----------

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

// ---------- Outputs ----------

@description('The login server URL of the ACR (e.g., myacr.azurecr.io)')
output loginServer string = acr.properties.loginServer

@description('The resource ID of the ACR')
output acrId string = acr.id

@description('The name of the ACR')
output acrName string = acr.name
