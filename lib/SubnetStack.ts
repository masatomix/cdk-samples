import { App, CfnParameter, Stack, StackProps } from 'aws-cdk-lib'
import { CfnSubnet, CfnVPC } from 'aws-cdk-lib/aws-ec2'

export const region = 'ap-northeast-1'
export const availabilityZones = [`${region}a`, `${region}c`, `${region}d`]

const subnetCIDRs = [
  { public: '192.168.0.0/24', private: '192.168.1.0/24' },
  { public: '192.168.2.0/24', private: '192.168.3.0/24' },
  { public: '192.168.4.0/24', private: '192.168.5.0/24' },
]

export class SubnetStack extends Stack {
  constructor(scope: App, id: string, vpc: CfnVPC, props?: StackProps) {
    super(scope, id, props)

    for (let index = 0; index < availabilityZones.length; index++) {
      new CfnSubnet(this, `MyPublicSubnet${index}`, {
        vpcId: vpc.ref,
        cidrBlock: subnetCIDRs[index].public,
        availabilityZone: availabilityZones[index],
        mapPublicIpOnLaunch: true,
        tags: [{ key: 'Name', value: `public-subnet-${index}` }],
      })

      new CfnSubnet(this, `MyPrivateSubnet${index}`, {
        vpcId: vpc.ref,
        cidrBlock: subnetCIDRs[index].private,
        availabilityZone: availabilityZones[index],
        mapPublicIpOnLaunch: false,
        tags: [{ key: 'Name', value: `private-subnet-${index}` }],
      })
    }
  }
}
