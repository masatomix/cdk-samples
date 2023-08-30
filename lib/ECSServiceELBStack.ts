import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { CfnVPC } from 'aws-cdk-lib/aws-ec2'
import { ContainerInfo, ServiceInfo, getProfile } from './Utils'
import { CfnListener, CfnLoadBalancer, CfnTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2'

const createTargetGroup = (
  stack: Stack,
  id: string,
  groupName: string,
  containerInfo: ContainerInfo,
  loadbalancer: CfnLoadBalancer,
  vpcId: string,
): CfnTargetGroup => {
  const targetProtocol = loadbalancer.type === 'network' ? 'TCP' : 'HTTP'
  const param = {
    healthCheckPath: containerInfo.healthCheckPath,
    name: groupName,
    port: containerInfo.port,
    protocol: targetProtocol,
    targetType: 'ip',
    healthCheckProtocol: 'HTTP',
    healthCheckTimeoutSeconds: 20,
    unhealthyThresholdCount: 5,
    vpcId: vpcId,
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

const createListener = (
  stack: Stack,
  id: string,
  targetGroup: CfnTargetGroup,
  listenerPort: number,
  loadbalancer: CfnLoadBalancer,
): CfnListener => {
  return new CfnListener(stack, id, {
    defaultActions: [
      {
        type: 'forward',
        targetGroupArn: targetGroup.ref,
      },
    ],
    loadBalancerArn: loadbalancer.ref,
    port: listenerPort,
    protocol: loadbalancer.type === 'network' ? 'TCP' : 'HTTP',
  })
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
    serviceInfo,
    props,
  }: {
    scope: App
    id: string
    loadbalancer: CfnLoadBalancer
    vpc: CfnVPC
    containerInfo: ContainerInfo
    serviceInfo: ServiceInfo
    props?: StackProps
  }) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    const serviceName = serviceInfo.serviceName

    const targetGroup = createTargetGroup(
      this,
      'TargetGroup',
      `${serviceName}-group`,
      containerInfo,
      loadbalancer,
      vpc.ref,
    )
    const targetGroupSub = createTargetGroup(
      this,
      'TargetGroupSub',
      `${serviceName}-groupsub`,
      containerInfo,
      loadbalancer,
      vpc.ref,
    )
    this.targetGroup = targetGroup
    this.targetGroupSub = targetGroupSub

    const listener = createListener(this, 'Listener', targetGroup, serviceInfo.listenerPort, loadbalancer)
    const testListener = createListener(this, 'ListenerTest', targetGroup, serviceInfo.testListenerPort!, loadbalancer)
    this.listener = listener
    this.testListener = testListener
  }
}

