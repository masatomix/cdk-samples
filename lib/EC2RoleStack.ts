import { App, Stack, StackProps } from 'aws-cdk-lib'

import { CfnRole } from 'aws-cdk-lib/aws-iam'

export class EC2RoleStack extends Stack {
  public readonly role: CfnRole

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props)

    this.role = new CfnRole(this, 'EC2_SSM_Role', {
      path: '/',
      roleName: 'EC2_SSM_Role',
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: '',
            Effect: 'Allow',
            Principal: {
              Service: 'ec2.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      // maxSessionDuration: 3600,
      managedPolicyArns: ['arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'],
      description: 'EC2_SSM_Role',
    })
  }
}
