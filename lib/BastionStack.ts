import { App, CfnParameter, Stack, StackProps } from 'aws-cdk-lib'
import {
  CfnInstance,
  CfnKeyPair,
  CfnSecurityGroup,
  CfnSecurityGroupIngress,
  CfnSubnet,
  CfnVPC,
} from 'aws-cdk-lib/aws-ec2'
import { Profile, getProfile } from './Utils'

export class BastionStack extends Stack {
  constructor(scope: App, id: string, vpc: CfnVPC, subnet: CfnSubnet, props?: StackProps) {
    super(scope, id, props)
    const p = getProfile(this)

    const PublicSubnetEC2SecurityGroup = createSecurityGroup(this, vpc, p)
    const keyPair = new CfnKeyPair(this, 'KeyPair', {
      keyName: `KeyPair${p.name}`,
    })
    createEC2(this, subnet, [PublicSubnetEC2SecurityGroup.ref], keyPair.ref, true, p)
    // createEC2(this, subnet, [PublicSubnetEC2SecurityGroup.ref], 'temp_private', true, p)
  }
}

const createEC2 = (
  stack: Stack,
  subnet: CfnSubnet,
  groupSet: string[],
  keyName: string,
  associatePublicIpAddress: boolean,
  p: Profile,
): CfnInstance => {
  return new CfnInstance(stack, 'BastionEC2', {
    imageId: 'ami-00d101850e971728d',
    keyName,
    instanceType: 't2.micro',
    networkInterfaces: [
      {
        associatePublicIpAddress,
        deviceIndex: '0',
        subnetId: subnet.attrSubnetId,
        groupSet,
      },
    ],
    tags: [{ key: 'Name', value: `ec2${p.name}` }],
  })
}

const createSecurityGroup = (stack: Stack, vpc: CfnVPC, p: Profile): CfnSecurityGroup => {
  const group = new CfnSecurityGroup(stack, 'PublicSubnetEC2SecurityGroup', {
    groupName: 'public-ec2-sg',
    groupDescription: 'Allow SSH access from MyIP',
    vpcId: vpc.attrVpcId,
    tags: [{ key: 'Name', value: `public-sg${p.name}` }],
  })

  new CfnSecurityGroupIngress(stack, 'PublicSubnetEC2SecurityGroupIngress000', {
    ipProtocol: '-1',
    groupId: group.ref,
    sourceSecurityGroupId: group.ref,
  })

  new CfnSecurityGroupIngress(stack, 'PublicSubnetEC2SecurityGroupIngress001', {
    ipProtocol: 'tcp',
    fromPort: 22,
    toPort: 22,
    groupId: group.ref,
    cidrIp: '0.0.0.0/0',
  })

  // new CfnSecurityGroupIngress(stack, 'PublicSubnetEC2SecurityGroupIngress002', {
  //   ipProtocol: 'tcp',
  //   fromPort: 80,
  //   toPort: 80,
  //   groupId: group.ref,
  //   cidrIp: '0.0.0.0/0',
  // })

  return group
}
