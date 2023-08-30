import { App, Stack, StackProps } from 'aws-cdk-lib'
import { getProfile } from './Utils'
import { CfnCluster } from 'aws-cdk-lib/aws-ecs'
import { CfnApplication } from 'aws-cdk-lib/aws-codedeploy'

export class ClusterStack extends Stack {
  public readonly cluster: CfnCluster
  public readonly application: CfnApplication
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props)
    const p = getProfile(this)

    const server = `app-server${p.name}`

    this.cluster = new CfnCluster(this, `${server}-cluster`, {
      clusterName: `${server}-cluster`,
    })
    this.application = new CfnApplication(this, `${server}-Application`, {
      applicationName: `${server}-app`,
      computePlatform: 'ECS',
    })
  }
}
