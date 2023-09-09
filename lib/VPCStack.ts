import { App, CfnParameter, Stack, StackProps } from 'aws-cdk-lib'
import {
  CfnEIP,
  CfnInternetGateway,
  CfnNatGateway,
  CfnRoute,
  CfnRouteTable,
  CfnSubnet,
  CfnSubnetRouteTableAssociation,
  CfnVPC,
  CfnVPCGatewayAttachment,
} from 'aws-cdk-lib/aws-ec2'
import { availabilityZones, getProfile } from './Utils'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class VPCStack extends Stack {
  public readonly vpc: CfnVPC
  public readonly publicSubnets: CfnSubnet[]
  public readonly privateSubnets: CfnSubnet[]

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here
    const p = getProfile(this)

    const vpcCIDRs = {
      vpc: '192.168.0.0/16',
      subnets: [{ public: '192.168.0.0/24' }],
    }
    const subnetCount = vpcCIDRs.subnets.length

    // VPC
    const vpc = new CfnVPC(this, `MyVPC`, {
      cidrBlock: vpcCIDRs.vpc,
      tags: [{ key: 'Name', value: `vpc${p.name}` }],
    })
    this.vpc = vpc

    // Public Subnet
    const publicSubnets = vpcCIDRs.subnets.map(
      (subnet, index) =>
        new CfnSubnet(this, `MyPublicSubnet${index}`, {
          vpcId: vpc.ref,
          cidrBlock: subnet.public,
          availabilityZone: availabilityZones[index],
          mapPublicIpOnLaunch: true,
          tags: [{ key: 'Name', value: `public-subnet-${index}${p.name}` }],
        }),
    )
    this.publicSubnets = publicSubnets

    // Internet Gateway
    const igw = new CfnInternetGateway(this, 'MyInternetGateWay', { tags: [{ key: 'Name', value: `igw${p.name}` }] })
    const attachInternetGateway = new CfnVPCGatewayAttachment(this, 'AttachGateway', {
      vpcId: vpc.ref,
      internetGatewayId: igw.ref,
    })

    // Public RouteTables
    const publicRouteTables = vpcCIDRs.subnets.map(
      (subnet, index) =>
        new CfnRouteTable(this, `PublicRouteTable${index}`, {
          vpcId: vpc.ref,
          tags: [{ key: 'Name', value: `public-route-${index}${p.name}` }],
        }),
    )

    for (let index = 0; index < subnetCount; index++) {
      // 各Public用 RouteTableに Public Subnetを紐付け
      new CfnSubnetRouteTableAssociation(this, `PublicSubnetRouteTableAssociation${index}`, {
        routeTableId: publicRouteTables[index].ref,
        subnetId: publicSubnets[index].ref,
      })

      // そのRouteTableはInternet Gatewayを紐付ける
      new CfnRoute(this, `PublicRouteToIGW${index}`, {
        routeTableId: publicRouteTables[index].ref,
        destinationCidrBlock: '0.0.0.0/0',
        gatewayId: igw.ref,
      })
    }
  }
}
