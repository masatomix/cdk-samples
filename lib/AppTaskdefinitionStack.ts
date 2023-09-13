import { App, RemovalPolicy, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { ContainerInfo, getProfile } from './Utils'
import { CfnTaskDefinition } from 'aws-cdk-lib/aws-ecs'
import { CfnRole } from 'aws-cdk-lib/aws-iam'
import * as codecommit from 'aws-cdk-lib/aws-codecommit'
import * as ecr from 'aws-cdk-lib/aws-ecr'

type AppTaskdefinitionStackProps = StackProps & {
  ecsTaskRole: CfnRole
  ecsTaskExecutionRole: CfnRole
  containerInfo: ContainerInfo
  codecommitCreate?: boolean
  ecrCreate?: boolean
}

export class AppTaskdefinitionStack extends Stack {
  public readonly taskDef: CfnTaskDefinition
  constructor(scope: App, id: string, props: AppTaskdefinitionStackProps) {
    props.codecommitCreate = props.codecommitCreate ?? false
    props.ecrCreate = props.ecrCreate ?? false
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    if (props.codecommitCreate) {
      new codecommit.CfnRepository(this, `CodeCommit${props.containerInfo.name}`, {
        repositoryName: props.containerInfo.name,
        repositoryDescription: `${props.containerInfo.name}-codecommit`,
      }).applyRemovalPolicy(RemovalPolicy.RETAIN)
    }

    if (props.ecrCreate) {
      const lifecyclePolicy = {
        rules: [
          {
            rulePriority: 1,
            description: 'Delete more than 5 images',
            selection: {
              tagStatus: 'any',
              countType: 'imageCountMoreThan',
              countNumber: 5,
            },
            action: {
              type: 'expire',
            },
          },
        ],
      }
      new ecr.CfnRepository(this, `ECR${props.containerInfo.name}`, {
        repositoryName: props.containerInfo.name,
        lifecyclePolicy: {
          registryId: accountId,
          lifecyclePolicyText: JSON.stringify(lifecyclePolicy),
        },
        tags: [
          {
            key: 'Name',
            value: `${props.containerInfo.name}-ecr`,
          },
        ],
      })
    }

    this.taskDef = new CfnTaskDefinition(this, 'ECSTaskDefinition', {
      family: `${props.containerInfo.name}-taskdefinition${p.name}`,
      containerDefinitions: [
        {
          essential: true,
          image: `${accountId}.dkr.ecr.ap-northeast-1.amazonaws.com/spring-boot-sample-tomcat:0.0.4-SNAPSHOT`,
          name: props.containerInfo.name,
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
              containerPort: props.containerInfo.port,
              hostPort: props.containerInfo.port,
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
      taskRoleArn: props.ecsTaskRole.attrArn,
      executionRoleArn: props.ecsTaskExecutionRole.attrArn,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      cpu: '256',
      memory: '512',
    })
  }
}
