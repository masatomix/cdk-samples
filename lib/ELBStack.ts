import { App, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSecurityGroup, CfnSecurityGroupIngress, CfnSubnet, CfnVPC } from 'aws-cdk-lib/aws-ec2'
import { Profile, getProfile, toRefs } from './Utils'
import { CfnLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

type ELBStackProps = StackProps & {
  subnets: CfnSubnet[]
  elbSecuriyGroup: CfnSecurityGroup
  albFlag?: boolean
  internetFlag?: boolean
}

export class ELBStack extends Stack {
  public readonly loadbalancer: CfnLoadBalancer

  constructor(scope: App, id: string, props: ELBStackProps) {
    props.albFlag = props.albFlag ?? true
    props.internetFlag = props.internetFlag ?? true

    super(scope, id, props)
    const p = getProfile(this)

    const type = props.albFlag ? 'application' : 'network'
    const scheme = props.internetFlag ? 'internet-facing' : 'internal'

    this.loadbalancer = createELB(this, 'app-ELB', type, scheme, props.subnets, [props.elbSecuriyGroup], p)
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
