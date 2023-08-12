import { App, Stack, StackProps } from 'aws-cdk-lib'
import { CfnVPC } from 'aws-cdk-lib/aws-ec2'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class VPCStack extends Stack {
  public readonly vpc: CfnVPC

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props)

    const vpcCIDRs = { vpc: '192.168.0.0/16' }
    // VPC
    const vpc = new CfnVPC(this, 'MyVPC', {
      cidrBlock: vpcCIDRs.vpc,
      tags: [{ key: 'Name', value: `test-vpc` }],
    })
    this.vpc = vpc
  }
}
