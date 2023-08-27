import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { CfnVPC } from 'aws-cdk-lib/aws-ec2'
import { getProfile } from './Utils'
import { CfnListener, CfnLoadBalancer, CfnTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2'

export type ContainerInfo = {
  serviceName: string
  name: string
  port: number
  healthCheckPath: string
}

export class ECSServiceELBStack extends Stack {
  public readonly targetGroup: CfnTargetGroup
  public readonly targetGroupSub: CfnTargetGroup
  public readonly listener: CfnListener
  public readonly testListener: CfnListener
  constructor({
    scope,
    id,
    loadbalancer,
    vpc,
    containerInfo,
    props,
  }: {
    scope: App
    id: string
    loadbalancer: CfnLoadBalancer
    vpc: CfnVPC
    containerInfo: ContainerInfo
    props?: StackProps
  }) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    const ListenerPort = 8080
    const ListenerTestPort = 9080
    // const HealthCheckPath = '/'

    const targetProtocol = loadbalancer.type === 'network' ? 'TCP' : 'HTTP'
    const listenerProtocol = loadbalancer.type === 'network' ? 'TCP' : 'HTTP'

    const createTargetGroup = (stack: Stack, id: string, groupName: string): CfnTargetGroup => {
      const param = {
        healthCheckPath: containerInfo.healthCheckPath,
        name: groupName,
        port: containerInfo.port,
        protocol: targetProtocol,
        targetType: 'ip',
        healthCheckProtocol: 'HTTP',
        healthCheckTimeoutSeconds: 20,
        unhealthyThresholdCount: 5,
        vpcId: vpc.ref,
      }

      if (loadbalancer.type === 'network') {
        return new CfnTargetGroup(stack, id, param)
      } else {
        return new CfnTargetGroup(stack, id, {
          ...param,
          // ALBがStickySessionしたい場合。
          targetGroupAttributes: [
            {
              key: 'stickiness.enabled',
              value: 'true',
            },
            {
              key: 'stickiness.type',
              value: 'lb_cookie',
            },
            {
              key: 'stickiness.lb_cookie.duration_seconds',
              value: '86400',
            },
          ],
        })
      }
    }

    const createListener = (stack: Stack, id: string, targetGroup: CfnTargetGroup, port: number): CfnListener => {
      return new CfnListener(stack, id, {
        defaultActions: [
          {
            type: 'forward',
            targetGroupArn: targetGroup.ref,
          },
        ],
        loadBalancerArn: loadbalancer.ref,
        port: port,
        protocol: listenerProtocol,
      })
    }

    const targetGroup = createTargetGroup(this, 'TargetGroup', `${containerInfo.serviceName}-group`)
    const targetGroupSub = createTargetGroup(this, 'TargetGroupSub', `${containerInfo.serviceName}-groupsub`)
    this.targetGroup = targetGroup
    this.targetGroupSub = targetGroupSub

    const listener = createListener(this, 'Listener', targetGroup, ListenerPort)
    const testListener = createListener(this, 'ListenerTest', targetGroupSub, ListenerTestPort)
    this.listener = listener
    this.testListener = testListener
  }
}
