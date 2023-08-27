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
    nlbFlag: boolean = false,
    props?: StackProps,
  ) {
    super(scope, id, props)
    const p = getProfile(this)

    this.loadbalancer = nlbFlag
      ? createNLB(this, 'app-NLB', subnets, [elbSecuriyGroup], p)
      : createALB(this, 'app-NLB', subnets, [elbSecuriyGroup], p)
  }
}

// const scheme = 'internal'
const scheme = 'internet-facing'
const createNLB = (
  stack: Stack,
  name: string,
  subnets: CfnSubnet[],
  elbsgs: CfnSecurityGroup[],
  p: Profile,
): CfnLoadBalancer => {
  return new CfnLoadBalancer(stack, `${name}${p.name}`, {
    type: 'network',
    name: `${name}${p.name}`,
    subnets: toRefs(subnets),
    securityGroups: toRefs(elbsgs),
    scheme: scheme,
  })
}

const createALB = (
  stack: Stack,
  name: string,
  subnets: CfnSubnet[],
  elbsgs: CfnSecurityGroup[],
  p: Profile,
): CfnLoadBalancer => {
  return new CfnLoadBalancer(stack, `${name}${p.name}`, {
    type: 'application',
    name: `${name}${p.name}`,
    subnets: toRefs(subnets),
    securityGroups: toRefs(elbsgs),
    scheme: scheme,
  })
}
