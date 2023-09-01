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
            logDriver: 'awslogs',
            options: {
              'awslogs-create-group': 'true',
              'awslogs-group': `/ecs/app-taskdefinition${p.name}`,
              'awslogs-region': `${region}`,
              'awslogs-stream-prefix': 'ecs',
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
