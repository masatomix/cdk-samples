#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { VPCStack } from '../lib/VPCStack'
import { ELBStack } from '../lib/ELBStack'
import { ClusterStack } from '../lib/ClusterStack'
import { ECSRoleStack } from '../lib/ECSRoleStack'
import { ECSServiceStack } from '../lib/ECSServiceStack'
import { BastionStack } from '../lib/BastionStack'
import { ECSSecurityGroupStack } from '../lib/ECSSecurityGroupStack'
import { ECSServiceELBStack } from '../lib/ECSServiceELBStack'
import { AppTaskdefinitionStack } from '../lib/AppTaskdefinitionStack'
import { ContainerInfo, ServiceInfo } from '../lib/Utils'

const main = () => {
  const app = new cdk.App()

  const vpcStack = new VPCStack(app, 'VPCStack')
  // new BastionStack(app, 'BastionStack', vpcStack.vpc, vpcStack.publicSubnets[0])

  const sgStack = new ECSSecurityGroupStack(app, 'ECSSecurityGroupStack', { vpc: vpcStack.vpc })
  const clusterStack = new ClusterStack(app, 'ClusterStack')
  const ecsRoleStack = new ECSRoleStack(app, 'ECSRoleStack')

  const elbStack = new ELBStack(app, 'ELBStack', {
    subnets: vpcStack.publicSubnets,
    elbSecuriyGroup: sgStack.ELBSecurityGroup,
  })

  const serviceInfo: ServiceInfo = {
    serviceName: 'spring-boot-service',
    listenerPort: 8080,
    testListenerPort: 9080,
  }

  const containerInfo: ContainerInfo = {
    name: 'app',
    port: 8080,
    healthCheckPath: '/actuator/health',
  }

  const serviceStackELB = new ECSServiceELBStack(app, 'ECSServiceELBStack', {
    loadbalancer: elbStack.loadbalancer,
    vpc: vpcStack.vpc,
    containerInfo,
    serviceInfo,
  })

  const appTaskdefinition = new AppTaskdefinitionStack(app, 'AppTaskdefinitionStack', {
    ecsTaskRole: ecsRoleStack.ecsTaskRole,
    ecsTaskExecutionRole: ecsRoleStack.ecsTaskExecutionRole,
    containerInfo,
  })

  const serviceStack = new ECSServiceStack(app, 'AppServiceStack', {
    cluster: clusterStack.cluster,
    subnets: vpcStack.privateSubnets, // ECSを配置するネットはPrivate Subnet
    taskDef: appTaskdefinition.taskDef,
    ecsSecurityGroup: sgStack.ECSSecurityGroup,
    targetGroup: serviceStackELB.targetGroup,
    containerInfo,
    serviceInfo,
  })
}

main()
