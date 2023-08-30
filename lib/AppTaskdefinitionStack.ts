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
          image: 'nginx',
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
              containerPort: containerInfo.port,
              hostPort: containerInfo.port,
              protocol: 'tcp',
            },
          ],
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
