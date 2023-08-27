import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSecurityGroup, CfnSubnet } from 'aws-cdk-lib/aws-ec2'
import { getProfile, toRefs } from './Utils'
import { CfnCluster, CfnService, CfnTaskDefinition } from 'aws-cdk-lib/aws-ecs'
import { CfnTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import { ContainerInfo } from './ECSServiceELBStack'

export class ECSServiceStack extends Stack {
  public readonly ecsService: CfnService
  constructor(
    scope: App,
    id: string,
    subnets: CfnSubnet[],
    cluster: CfnCluster,
    taskDef: CfnTaskDefinition,
    ecsSecurityGroup: CfnSecurityGroup,
    containerInfo: ContainerInfo,
    targetGroup: CfnTargetGroup,
    props?: StackProps,
  ) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    const DesiredCount = subnets.length

    const ecsService = new CfnService(this, 'ECSService', {
      cluster: cluster.ref,
      // deploymentController: ECS
      capacityProviderStrategy: [
        {
          capacityProvider: 'FARGATE',
          base: 0,
          weight: 1,
        },
      ],
      deploymentController: {
        type: 'ECS',
      },
      deploymentConfiguration: {
        maximumPercent: 200,
        minimumHealthyPercent: 100,
        deploymentCircuitBreaker: {
          enable: true,
          rollback: true,
        },
      },
      // deploymentController: ECS
      // // deploymentController: CODE_DEPLOY
      // launchType: 'FARGATE',
      // deploymentController: {
      //   type: 'CODE_DEPLOY',
      // },
      // // deploymentController: CODE_DEPLOY

      taskDefinition: taskDef.ref,
      serviceName: containerInfo.serviceName,
      schedulingStrategy: 'REPLICA',
      desiredCount: DesiredCount,
      loadBalancers: [
        {
          containerName: containerInfo.name,
          containerPort: containerInfo.port,
          // LoadBalancerName:
          //   Ref: 'AWS::NoValue'
          targetGroupArn: targetGroup.ref,
        },
      ],
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: 'DISABLED',
          securityGroups: toRefs([ecsSecurityGroup]),
          subnets: toRefs(subnets),
        },
      },
      platformVersion: 'LATEST',
      serviceConnectConfiguration: { enabled: false },
      tags: [{ key: 'Name', value: `ECS${p.name}` }],
      enableEcsManagedTags: true,
    })
    this.ecsService = ecsService
  }
}
