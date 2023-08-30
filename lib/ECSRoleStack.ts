import { App, Stack, StackProps } from 'aws-cdk-lib'
import { getProfile, toRefs } from './Utils'

import { CfnManagedPolicy, CfnRole } from 'aws-cdk-lib/aws-iam'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ECSRoleStack extends Stack {
  public readonly ecsTaskExecutionRole: CfnRole
  public readonly codeDeployRole: CfnRole
  public readonly ecsTaskRole: CfnRole

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props)
    const p = getProfile(this)

    const IAMManagedPolicy = new CfnManagedPolicy(this, 'IAMManagedPolicy', {
      managedPolicyName: `writeCloudWatchLogsPolicy${p.name}`,
      path: '/',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'logs:CreateLogStream',
              'logs:DescribeLogGroups',
              'logs:DescribeLogStreams',
              'logs:CreateLogGroup',
              'logs:PutLogEvents',
            ],
            Resource: '*',
          },
        ],
      },
    })

    const ecsExecPolicy = new CfnManagedPolicy(this, 'EcsExecPolicy', {
      managedPolicyName: `ecsExecPolicy${p.name}`,
      path: '/',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'ssmmessages:CreateControlChannel',
              'ssmmessages:CreateDataChannel',
              'ssmmessages:OpenControlChannel',
              'ssmmessages:OpenDataChannel',
            ],
            Resource: '*',
          },
        ],
      },
    })

    const s3Policy = new CfnManagedPolicy(this, 'S3Policy', {
      managedPolicyName: `s3Policy${p.name}`,
      path: '/',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:DescribeLogStreams',
              'logs:DescribeLogGroups',
            ],
            Effect: 'Allow',
            Resource: ['arn:aws:logs:*:*:*'],
          },
          {
            Action: [
              's3:AbortMultipartUpload',
              's3:GetBucketLocation',
              's3:GetObject',
              's3:ListBucket',
              's3:ListBucketMultipartUploads',
              's3:PutObject',
            ],
            Effect: 'Allow',
            Resource: ['arn:aws:s3:::demo-fluent-bit', 'arn:aws:s3:::demo-fluent-bit/*'],
          },
          {
            Action: ['kms:Decrypt', 'kms:GenerateDataKey'],
            Effect: 'Allow',
            Resource: ['*'],
          },
        ],
      },
    })

    this.ecsTaskRole = new CfnRole(this, 'myEcsTaskRole', {
      path: '/',
      roleName: `myEcsTaskRole${p.name}`,
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          { Sid: '', Effect: 'Allow', Principal: { Service: 'ecs-tasks.amazonaws.com' }, Action: 'sts:AssumeRole' },
        ],
      },
      maxSessionDuration: 3600,
      managedPolicyArns: [IAMManagedPolicy.ref, ecsExecPolicy.ref, s3Policy.ref],
      // managedPolicyArns: [IAMManagedPolicy.ref],
      description: 'Allows ECS tasks to call AWS services on your behalf.',
    })

    this.ecsTaskExecutionRole = new CfnRole(this, 'myEcsTaskExecutionRole', {
      path: '/',
      roleName: `myEcsTaskExecutionRole${p.name}`,
      assumeRolePolicyDocument: {
        Version: '2008-10-17',
        Statement: [
          { Sid: '', Effect: 'Allow', Principal: { Service: 'ecs-tasks.amazonaws.com' }, Action: 'sts:AssumeRole' },
        ],
      },
      maxSessionDuration: 3600,
      managedPolicyArns: [
        'arn:aws:iam::aws:policy/AmazonRDSDataFullAccess',
        'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
        'arn:aws:iam::aws:policy/AmazonRDSFullAccess',
        IAMManagedPolicy.ref,
      ],
      description: 'Allows ECS tasks to call AWS services on your behalf.',
    })

    this.codeDeployRole = new CfnRole(this, 'myCodeDeployRole', {
      path: '/',
      roleName: `myCodeDeployRole${p.name}`,
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: '',
            Effect: 'Allow',
            Principal: {
              Service: 'codedeploy.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      maxSessionDuration: 3600,
      managedPolicyArns: ['arn:aws:iam::aws:policy/AWSCodeDeployRoleForECS'],
      description: 'Provides CodeDeploy service wide access to perform an ECS blue/green deployment on your behalf.',
    })
  }
}
