import { App, Stack, StackProps } from 'aws-cdk-lib'
import {
  CfnInstance,
  CfnKeyPair,
  CfnSecurityGroup,
  CfnSecurityGroupIngress,
  CfnSubnet,
  CfnVPC,
} from 'aws-cdk-lib/aws-ec2'
import { getProfile } from './Utils'
import { CfnInstanceProfile, CfnRole } from 'aws-cdk-lib/aws-iam'

type BastionStackProps = StackProps & {
  vpc: CfnVPC
  subnet: CfnSubnet
  role: CfnRole
}

export class BastionStack extends Stack {
  constructor(scope: App, id: string, props: BastionStackProps) {
    super(scope, id, props)
    const p = getProfile(this)

    const { vpc, subnet, role } = props

    // SecurityGroupの作成
    const bastionSG = createBastionSG(this, vpc, 'bastion')
    const ec2SG = createEC2SG(this, vpc, bastionSG, 'ec2')

    // キーペアの作成
    const keyPair = new CfnKeyPair(this, 'KeyPair', {
      keyName: `${p.name}-KeyPair`,
    })

    const instanceProfile = new CfnInstanceProfile(this, 'InstanceProfileEc2', {
      roles: [role.ref],
    })

    // EC2インスタンスの作成
    // createEC2(this, subnet, [SubnetEC2SecurityGroup.ref], 'proto-key', true, p)
    createEC2({
      stack: this, subnet, groupSet: [bastionSG.ref],
      associatePublicIpAddress: false,
      name: 'bastion',
      instanceProfile,
    })
    createEC2({
      stack: this, subnet, groupSet: [ec2SG.ref],
      associatePublicIpAddress: false,
      name: 'dest',
      keyName: keyPair.ref,
    })
  }
}

type FC = (args: {
  stack: Stack,
  subnet: CfnSubnet,
  groupSet: string[],
  keyName?: string,
  associatePublicIpAddress: boolean,
  name: string,
  instanceProfile?: CfnInstanceProfile
}) => CfnInstance

const createEC2: FC = ({
  stack, subnet, groupSet,
  keyName,
  associatePublicIpAddress,
  name,
  instanceProfile
}): CfnInstance => {

  const baseProps = {
    imageId: 'ami-04beabd6a4fb6ab6f',
    // imageId: 'ami-00d101850e971728d',
    instanceType: 't2.micro',
    networkInterfaces: [
      {
        associatePublicIpAddress,
        deviceIndex: '0',
        subnetId: subnet.attrSubnetId,
        groupSet,
      },
    ],
    tags: [{ key: 'Name', value: `${name}-ec2` }],
  }

  const keyNameProps = keyName ? { ...baseProps, keyName } : baseProps
  const props = instanceProfile ? { ...keyNameProps, iamInstanceProfile: instanceProfile.ref } : keyNameProps
  return new CfnInstance(stack, `${name}-BastionEC2`, props)
}

const createBastionSG = (stack: Stack, vpc: CfnVPC, prefix: string): CfnSecurityGroup => {
  const group = new CfnSecurityGroup(stack, `${prefix}SG`, {
    groupName: `${prefix}-sg`,
    groupDescription: `${prefix} SecurityGroup`,
    vpcId: vpc.attrVpcId,
    tags: [{ key: 'Name', value: `${prefix}-sg` }],
  })
  return group
}

const createEC2SG = (stack: Stack, vpc: CfnVPC, bastionSG: CfnSecurityGroup, prefix: string): CfnSecurityGroup => {
  const group = new CfnSecurityGroup(stack, `${prefix}SG`, {
    groupName: `${prefix}-sg`,
    groupDescription: `${prefix} SecurityGroup`,
    vpcId: vpc.attrVpcId,
    tags: [{ key: 'Name', value: `${prefix}-sg` }],
  })

  new CfnSecurityGroupIngress(stack, `${prefix}SGIngress000`, {
    // ipProtocol: '-1',
    ipProtocol: 'tcp',
    fromPort: 22,
    toPort: 22,
    groupId: group.ref,
    sourceSecurityGroupId: bastionSG.ref,
  })
  return group
}


