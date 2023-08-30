import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { ContainerInfo, getProfile } from './Utils'
import { CfnTaskDefinition } from 'aws-cdk-lib/aws-ecs'
import { CfnRole } from 'aws-cdk-lib/aws-iam'

type AppTaskdefinitionStackProps = StackProps & {
  ecsTaskRole: CfnRole
  ecsTaskExecutionRole: CfnRole
  containerInfo: ContainerInfo
}

export class AppTaskdefinitionStack extends Stack {
  public readonly taskDef: CfnTaskDefinition
  constructor(scope: App, id: string, props: AppTaskdefinitionStackProps) {
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
      family: `${props.containerInfo.name}-taskdefinition${p.name}`,
      containerDefinitions: [
        {
          essential: true,
          image: 'nginx',
          name: props.containerInfo.name,
          logConfiguration: {
            logDriver: 'awsfirelens',
            options: {
              Name: 'cloudwatch_logs',
              auto_create_group: 'true',
              log_group_name: 'firelens-container',
              log_stream_prefix: 'ecs/',
              region: `${region}`,
            },
          },
          memoryReservation: 100,
          portMappings: [
            {
              containerPort: props.containerInfo.port,
              hostPort: props.containerInfo.port,
              protocol: 'tcp',
            },
          ],
        },
        {
          essential: true,
          name: 'log_router',
          image: 'public.ecr.aws/aws-observability/aws-for-fluent-bit:init-2.28.4',
          firelensConfiguration: {
            type: 'fluentbit',
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
      taskRoleArn: props.ecsTaskRole.attrArn,
      executionRoleArn: props.ecsTaskExecutionRole.attrArn,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: '256',
      memory: '512',
    })
  }
}
