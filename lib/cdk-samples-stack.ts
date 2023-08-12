import * as cdk from 'aws-cdk-lib'
import { CfnVPC } from 'aws-cdk-lib/aws-ec2'
import { Construct } from 'constructs'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkSamplesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkSamplesQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    new CfnVPC(this, 'MyVPC', {
      cidrBlock: '192.168.0.0/16',
      tags: [{ key: 'Name', value: `test-vpc` }],
    })
  }
}
