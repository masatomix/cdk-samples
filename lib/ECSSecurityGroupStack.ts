import { App, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSecurityGroup, CfnSecurityGroupIngress, CfnSubnet, CfnVPC } from 'aws-cdk-lib/aws-ec2'
import { Profile, getProfile } from './Utils'

type ECSSecurityGroupStackProps = StackProps & {
  vpc: CfnVPC
}

export class ECSSecurityGroupStack extends Stack {
  public readonly ECSSecurityGroup: CfnSecurityGroup
  public readonly ELBSecurityGroup: CfnSecurityGroup

  constructor(scope: App, id: string, /*vpc: CfnVPC,*/ props: ECSSecurityGroupStackProps) {
    super(scope, id, props)
    const p = getProfile(this)

    // 8080-8088,9080-9088 がOKなセキュリティグループをELB用に作成
    this.ELBSecurityGroup = createELBSecurityGroup(this, `ELBSecurityGroup${p.name}`, props.vpc, p)

    // ELBのSGと、VPCのネットからのアクセスを許可
    this.ECSSecurityGroup = createECSSecurityGroup(
      this,
      `ECSSecurityGroup${p.name}`,
      props.vpc,
      this.ELBSecurityGroup,
      p,
    )
  }
}

const createELBSecurityGroup = (stack: Stack, id: string, vpc: CfnVPC, p: Profile): CfnSecurityGroup => {
  const group = new CfnSecurityGroup(stack, id, {
    groupName: `elb-sg${p.name}`,
    groupDescription: 'elb-sg',
    vpcId: vpc.attrVpcId,
    tags: [{ key: 'Name', value: `ELB-SecurityGroup${p.name}` }],
  })

  new CfnSecurityGroupIngress(stack, 'ELBSecurityGroupIngress000', {
    ipProtocol: '-1',
    groupId: group.ref,
    sourceSecurityGroupId: group.ref,
  })

  new CfnSecurityGroupIngress(stack, 'ELBSecurityGroupIngress001', {
    ipProtocol: 'tcp',
    fromPort: 8080,
    toPort: 8088,
    groupId: group.ref,
    cidrIp: '0.0.0.0/0',
  })

  new CfnSecurityGroupIngress(stack, 'ELBSecurityGroupIngress002', {
    ipProtocol: 'tcp',
    fromPort: 9080,
    toPort: 9088,
    groupId: group.ref,
    cidrIp: '0.0.0.0/0',
  })

  return group
}

const createECSSecurityGroup = (
  stack: Stack,
  id: string,
  vpc: CfnVPC,
  elbsg: CfnSecurityGroup,
  p: Profile,
): CfnSecurityGroup => {
  const group = new CfnSecurityGroup(stack, id, {
    groupName: `ecs-sg${p.name}`,
    groupDescription: 'ecs-sg',
    vpcId: vpc.attrVpcId,
    tags: [{ key: 'Name', value: `ECS-SecurityGroup${p.name}` }],
  })

  new CfnSecurityGroupIngress(stack, 'ECSSecurityGroupIngress000', {
    ipProtocol: '-1',
    groupId: group.ref,
    sourceSecurityGroupId: group.ref,
  })
  new CfnSecurityGroupIngress(stack, 'ECSSecurityGroupIngress001', {
    ipProtocol: '-1',
    groupId: group.ref,
    sourceSecurityGroupId: elbsg.ref,
  })
  new CfnSecurityGroupIngress(stack, 'ECSSecurityGroupIngress002', {
    ipProtocol: '-1',
    groupId: group.ref,
    cidrIp: vpc.cidrBlock,
  })

  return group
}
