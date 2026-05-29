// ============================================================================
// Main Bicep template - Resource Group-level deployment
// Deploys into an EXISTING resource group:
//   Virtual Network, Managed Identity, AKS Cluster, ACR
// The resource group must be created out-of-band (e.g., by a subscription
// owner) because this template runs at resourceGroup scope so it can be used
// by principals that only have Contributor rights on the RG (not the
// subscription).
// Region: Germany West Central (Frankfurt)
// ============================================================================

targetScope = 'resourceGroup'

// ---------- General Parameters ----------

@description('Azure region for all resources (default: resource group location)')
param location string = resourceGroup().location

@description('Short name prefix (corresponds to a team\'s `resourcesSuffix` in teams.json) used to generate unique resource names across modules. Keep <= ~20 alphanumeric chars to stay within AKS node-resource-group (80 chars) and ACR (50 chars) name limits.')
param namePrefix string

@description('Tags applied to all resources for cost tracking and organization')
param tags object = {}

// ---------- Networking Parameters ----------

@description('Address space (CIDR) for the Virtual Network')
param vnetAddressPrefix string = '10.0.0.0/16'

@description('Address prefix (CIDR) for the AKS node subnet')
param aksSubnetAddressPrefix string = '10.0.0.0/22'

@description('Name of the AKS subnet inside the VNet')
param aksSubnetName string = 'snet-aks'

@description('Enable DDoS protection on the VNet (adds cost)')
param enableDdosProtection bool = false

@description('Network plugin for AKS (azure or kubenet)')
@allowed(['azure', 'kubenet'])
param networkPlugin string = 'azure'

@description('Network policy for AKS (azure, calico, or none)')
@allowed(['azure', 'calico', 'none'])
param networkPolicy string = 'azure'

@description('Service CIDR for Kubernetes internal services')
param serviceCidr string = '172.16.0.0/16'

@description('DNS service IP (must be within serviceCidr range)')
param dnsServiceIP string = '172.16.0.10'

// ---------- AKS Parameters ----------

@description('Kubernetes version to deploy')
param kubernetesVersion string = '1.34'

@description('VM size for the system node pool')
param systemNodeVmSize string = 'Standard_D2s_v3'

@description('Initial number of nodes in the system node pool')
@minValue(1)
@maxValue(50)
param systemNodeCount int = 3

// ---------- Module: Networking ----------
// Deploys a Virtual Network with a dedicated AKS subnet.
// The VNet provides network isolation and the subnet is used by AKS node pools.

module network 'modules/network.bicep' = {
  name: 'network-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    vnetAddressPrefix: vnetAddressPrefix
    aksSubnetAddressPrefix: aksSubnetAddressPrefix
    aksSubnetName: aksSubnetName
    enableDdosProtection: enableDdosProtection
    tags: tags
  }
}

// ---------- Module: Identity ----------
// Deploys a user-assigned managed identity for the AKS cluster.
// This identity is used by AKS to interact with Azure resources (e.g., load balancers, disks).

module identity 'modules/identity.bicep' = {
  name: 'identity-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    tags: tags
  }
}

// ---------- Module: Azure Container Registry ----------
// Deploys an ACR instance for storing Docker images pulled by AKS.

module acr 'modules/acr.bicep' = {
  name: 'acr-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    tags: tags
  }
}

// ---------- Module: AKS ----------
// Deploys an Azure Kubernetes Service cluster with a system node pool.
// Depends on the network module (for the subnet) and identity module (for the managed identity).

module aks 'modules/aks.bicep' = {
  name: 'aks-deployment'
  params: {
    location: location
    clusterName: '${namePrefix}-aks'
    dnsPrefix: namePrefix
    subnetId: network.outputs.aksSubnetId
    identityId: identity.outputs.identityId
    kubernetesVersion: kubernetesVersion
    systemNodeVmSize: systemNodeVmSize
    systemNodeCount: systemNodeCount
    networkPlugin: networkPlugin
    networkPolicy: networkPolicy
    serviceCidr: serviceCidr
    dnsServiceIP: dnsServiceIP
    tags: tags
  }
}

// ---------- Outputs ----------
// Values exported for use by CI/CD pipelines or subsequent deployments.

@description('Name of the deployed AKS cluster')
output aksClusterName string = aks.outputs.clusterName

@description('FQDN of the AKS cluster API server')
output aksClusterFqdn string = aks.outputs.clusterFqdn

@description('Name of the deployed Virtual Network')
output vnetName string = network.outputs.vnetName

@description('Client ID of the managed identity assigned to AKS')
output identityClientId string = identity.outputs.clientId

@description('Name of the resource group this deployment targets')
output resourceGroupName string = resourceGroup().name

@description('ACR login server URL')
output acrLoginServer string = acr.outputs.loginServer

@description('ACR resource name')
output acrName string = acr.outputs.acrName


