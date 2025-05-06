import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSecurityGroup, CfnSecurityGroupIngress, CfnSubnet, CfnVPC, CfnVPCEndpoint } from 'aws-cdk-lib/aws-ec2'
import { Profile, getProfile, toRefs } from './Utils'

type VPCEndpointStackProps = StackProps & {
  vpc: CfnVPC
  subnets: CfnSubnet[]
}

export class VPCEndpointStack extends Stack {
  constructor(scope: App, id: string, props: VPCEndpointStackProps) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    const { vpc, subnets } = props

    const vpcEndpoints = [
      `com.amazonaws.${region}.ecr.dkr`,
      `com.amazonaws.${region}.ecr.api`,
      `com.amazonaws.${region}.ec2`,
      `com.amazonaws.${region}.ec2messages`,
      `com.amazonaws.${region}.ssm`,
      `com.amazonaws.${region}.ssmmessages`
    ]

    const vpcEndpointSecurityGroup = createVPCEndpointSecurityGroup(this, `VPCEndpointSG`, vpc, p)

    vpcEndpoints.forEach((vpcEndpoint, index) => {
      new CfnVPCEndpoint(this, `vpcEndpoint-${index}`, {
        serviceName: vpcEndpoint,
        vpcId: vpc.ref,
        vpcEndpointType: 'Interface',
        subnetIds: toRefs(subnets),
        securityGroupIds: [vpcEndpointSecurityGroup.ref],
        privateDnsEnabled: true,
      })
    })
  }
}

const createVPCEndpointSecurityGroup = (stack: Stack, id: string, vpc: CfnVPC, p: Profile): CfnSecurityGroup => {
  const group = new CfnSecurityGroup(stack, id, {
    groupName: `${p.name}vpcendpoint-sg`,
    groupDescription: 'vpcendpoint-sg',
    vpcId: vpc.attrVpcId,
    tags: [{ key: 'Name', value: `${p.name}VPCEndpointSG` }],
  })

  new CfnSecurityGroupIngress(stack, 'SecurityGroupIngress000', {
    ipProtocol: '-1',
    groupId: group.ref,
    sourceSecurityGroupId: group.ref,
  })

  new CfnSecurityGroupIngress(stack, 'SecurityGroupIngress001', {
    ipProtocol: 'tcp',
    fromPort: 443,
    toPort: 443,
    groupId: group.ref,
    cidrIp: vpc.attrCidrBlock,
  })

  return group
}