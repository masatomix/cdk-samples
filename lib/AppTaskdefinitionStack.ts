import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { ContainerInfo, getProfile } from './Utils'
import { CfnTaskDefinition } from 'aws-cdk-lib/aws-ecs'
import { ECSRoleStack } from './ECSRoleStack'

export class AppTaskdefinitionStack extends Stack {
  public readonly taskDef: CfnTaskDefinition
  constructor(scope: App, id: string, containerInfo: ContainerInfo, ecsRoleStack: ECSRoleStack, props?: StackProps) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    // const ECRRepository = new CfnRepository(this, 'ECRRepository', {
    //   repositoryName: 'myfluent-bit',
    //   lifecyclePolicy: {
    //     registryId: accountId,
    //   },
    // })

    this.taskDef = new CfnTaskDefinition(this, 'ECSTaskDefinition', {
      family: `${containerInfo.name}-taskdefinition${p.name}`,
      containerDefinitions: [
        {
          essential: true,
          name: containerInfo.name,
          image: `${accountId}.dkr.ecr.ap-northeast-1.amazonaws.com/spring-boot-sample-tomcat:0.0.4-SNAPSHOT`,
          logConfiguration: {
            logDriver: 'awsfirelens',
            options: {
              // Name: 'cloudwatch_logs',
              // auto_create_group: 'true',
              // log_group_name: 'firelens-container',
              // log_stream_prefix: 'ecs/',
              // region: `${region}`,
            },
          },
          memoryReservation: 100,
          portMappings: [
            {
              containerPort: containerInfo.port,
              hostPort: containerInfo.port,
              protocol: 'tcp',
            },
          ],
        },
        {
          essential: true,
          name: 'log_router',
          image: `${accountId}.dkr.ecr.ap-northeast-1.amazonaws.com/myfluent-bit:0.0.27`,
          firelensConfiguration: {
            type: 'fluentbit',
            options: {
              'config-file-type': 'file',
              'config-file-value': '/fluent-bit/etc/fluent-bit-custom.conf',
            },
          },
          logConfiguration: {
            logDriver: 'awslogs',
            options: {
              'awslogs-create-group': 'true',
              'awslogs-group': 'firelens-container',
              'awslogs-region': `${region}`,
              'awslogs-stream-prefix': 'firelens',
            },
          },
          memoryReservation: 50,
          user: '0',
        },
      ],
      taskRoleArn: ecsRoleStack.ecsTaskRole.attrArn,
      executionRoleArn: ecsRoleStack.ecsTaskExecutionRole.attrArn,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: '256',
      memory: '512',
    })
  }
}
