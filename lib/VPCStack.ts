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
      subnets: [
        { public: '192.168.0.0/24', private: '192.168.1.0/24' },
        { public: '192.168.2.0/24', private: '192.168.3.0/24' },
        { public: '192.168.4.0/24', private: '192.168.5.0/24' },
      ],
    }
    const subnetCount = vpcCIDRs.subnets.length

    // const vpcCIDR = new CfnParameter(this, 'VPCCIDR', {
    //   type: 'String',
    //   description: 'VPC CIDR.recommend /16',
    //   default: `${vpcCIDRs.vpc}`,
    // })
    // // VPC
    // const vpc = new CfnVPC(this, `MyVPC`, {
    //   // cidrBlock: vpcCIDR.valueAsString,
    //   cidrBlock: vpcCIDRs.vpc,
    //   tags: [{ key: 'Name', value: `${p.name}-vpc` }],
    // })

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

    // Private Subnet
    const privateSubnets = vpcCIDRs.subnets.map(
      (subnet, index) =>
        new CfnSubnet(this, `MyPrivateSubnet${index}`, {
          vpcId: vpc.ref,
          cidrBlock: subnet.private,
          availabilityZone: availabilityZones[index],
          mapPublicIpOnLaunch: false,
          tags: [{ key: 'Name', value: `private-subnet-${index}${p.name}` }],
        }),
    )
    this.privateSubnets = privateSubnets

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

    // Private RouteTables
    const privateRouteTables = vpcCIDRs.subnets.map(
      (subnet, index) =>
        new CfnRouteTable(this, `PrivateRouteTable${index}`, {
          vpcId: vpc.ref,
          tags: [{ key: 'Name', value: `private-route-${index}${p.name}` }],
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

      // 各Private用 RouteTableに Private Subnetを紐付け
      new CfnSubnetRouteTableAssociation(this, `PrivateSubnetRouteTableAssociation${index}`, {
        routeTableId: privateRouteTables[index].ref,
        subnetId: privateSubnets[index].ref,
      })
    }

    // // 各Subnetに、NAT GWを置くパタン
    // const eips = [...new Array(subnetCount)].map((_: undefined, index: number) => {
    //   return new CfnEIP(this, `EIPforNatGw${index}`, { domain: 'vpc' })
    // })
    // const natgws = [...new Array(subnetCount)].map((_: undefined, index: number) => {
    //   return new CfnNatGateway(this, `MyNAT${index}`, {
    //     allocationId: eips[index].attrAllocationId,
    //     subnetId: publicSubnets[index].ref
    //   })
    // })
    // for (let i = 0; i < subnetCount; i++) {
    //   new CfnRoute(this, `RouteToNAT${i}`, {
    //     routeTableId: privateRouteTables[i].ref,
    //     destinationCidrBlock: '0.0.0.0/0',
    //     natGatewayId: natgws[i].ref
    //   })
    // }
    // // 各Subnetに、NAT GWを置くパタン

    // 1Subnetに、NAT GWを置くパタン
    // publicSubnets[0] に、NAT GWを配置して
    const eip = new CfnEIP(this, 'EIPforNatGw1', { domain: 'vpc' })
    const natgw = new CfnNatGateway(this, `MyNAT1`, {
      allocationId: eip.attrAllocationId,
      subnetId: publicSubnets[0].ref,
      tags: [{ key: 'Name', value: `natgw${p.name}` }],
    })
    natgw.addDependency(attachInternetGateway)

    // そのNAT GWを各Private SubnetのRouteTableにセットする
    for (let i = 0; i < subnetCount; i++) {
      new CfnRoute(this, `RouteToNAT${i}`, {
        routeTableId: privateRouteTables[i].ref,
        destinationCidrBlock: '0.0.0.0/0',
        natGatewayId: natgw.ref,
      })
    }
    // 1Subnetに、NAT GWを置くパタン
  }
}
