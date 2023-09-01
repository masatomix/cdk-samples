import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSecurityGroup, CfnSubnet } from 'aws-cdk-lib/aws-ec2'
import { ContainerInfo, ServiceInfo, getProfile, toRefs } from './Utils'
import { CfnCluster, CfnService, CfnTaskDefinition } from 'aws-cdk-lib/aws-ecs'
import { CfnTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2'

type ECSServiceStackProps = StackProps & {
  subnets: CfnSubnet[]
  cluster: CfnCluster
  taskDef: CfnTaskDefinition
  ecsSecurityGroup: CfnSecurityGroup
  containerInfo: ContainerInfo
  serviceInfo: ServiceInfo
  targetGroup: CfnTargetGroup
}

export class ECSServiceStack extends Stack {
  public readonly ecsService: CfnService
  constructor(scope: App, id: string, props: ECSServiceStackProps) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    const DesiredCount = props.subnets.length

    const ecsService = new CfnService(this, 'ECSService', {
      cluster: props.cluster.ref,
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

      taskDefinition: props.taskDef.ref,
      serviceName: props.serviceInfo.serviceName,
      schedulingStrategy: 'REPLICA',
      desiredCount: DesiredCount,
      loadBalancers: [
        {
          containerName: props.containerInfo.name,
          containerPort: props.containerInfo.port,
          // LoadBalancerName:
          //   Ref: 'AWS::NoValue'
          targetGroupArn: props.targetGroup.ref,
        },
      ],
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: 'DISABLED',
          securityGroups: toRefs([props.ecsSecurityGroup]),
          subnets: toRefs(props.subnets),
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
