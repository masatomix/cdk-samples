import { App, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSecurityGroup, CfnSecurityGroupIngress, CfnSubnet, CfnVPC } from 'aws-cdk-lib/aws-ec2'
import { Profile, getProfile, toRefs } from './Utils'
import { CfnLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ELBStack extends Stack {
  public readonly loadbalancer: CfnLoadBalancer

  constructor(
    scope: App,
    id: string,
    subnets: CfnSubnet[],
    elbSecuriyGroup: CfnSecurityGroup,
    albFlag: boolean = true,
    internetFlag: boolean = true,
    props?: StackProps,
  ) {
    super(scope, id, props)
    const p = getProfile(this)

    const type = albFlag ? 'application' : 'network'
    const scheme = internetFlag ? 'internet-facing' : 'internal'

    this.loadbalancer = createELB(this, 'app-ELB', type, scheme, subnets, [elbSecuriyGroup], p)
  }
}
const createELB = (
  stack: Stack,
  name: string,
  type: string,
  scheme: string,
  subnets: CfnSubnet[],
  elbsgs: CfnSecurityGroup[],
  p: Profile,
): CfnLoadBalancer => {
  return new CfnLoadBalancer(stack, `${name}${p.name}`, {
    type,
    name: `${name}${p.name}`,
    subnets: toRefs(subnets),
    securityGroups: toRefs(elbsgs),
    scheme,
  })
}
