import { App, ScopedAws, Stack, StackProps } from 'aws-cdk-lib'
import { getProfile } from './Utils'
import { CfnApplication, CfnDeploymentGroup } from 'aws-cdk-lib/aws-codedeploy'
import { CfnCluster, CfnService } from 'aws-cdk-lib/aws-ecs'
import { ECSRoleStack } from './ECSRoleStack'
import { ECSServiceStack } from './ECSServiceStack'
import { ECSServiceELBStack } from './ECSServiceELBStack'
import { CfnRole } from 'aws-cdk-lib/aws-iam'

type DeploymentGroupStackProps = StackProps & {
  cluster: CfnCluster
  application: CfnApplication
  serviceELBStack: ECSServiceELBStack
  ecsService: CfnService
  codeDeployRole: CfnRole
}

export class DeploymentGroupStack extends Stack {
  constructor(scope: App, id: string, props: DeploymentGroupStackProps) {
    super(scope, id, props)
    const p = getProfile(this)
    const { accountId, region } = new ScopedAws(this)

    const { targetGroup, targetGroupSub, listener, testListener } = props.serviceELBStack

    new CfnDeploymentGroup(this, `DeploymentGroup`, {
      applicationName: props.application.applicationName!,
      deploymentStyle: {
        deploymentType: 'BLUE_GREEN',
        deploymentOption: 'WITH_TRAFFIC_CONTROL',
      },
      blueGreenDeploymentConfiguration: {
        deploymentReadyOption: {
          // # actionOnTimeout: CONTINUE_DEPLOYMENT,
          actionOnTimeout: 'STOP_DEPLOYMENT',
          waitTimeInMinutes: 60,
        },
        terminateBlueInstancesOnDeploymentSuccess: {
          action: 'TERMINATE',
          terminationWaitTimeInMinutes: 5,
        },
      },
      deploymentConfigName: 'CodeDeployDefault.ECSAllAtOnce',
      deploymentGroupName: `${props.ecsService.serviceName}-deploymentgroup`,
      ecsServices: [
        {
          clusterName: props.cluster.clusterName!,
          serviceName: props.ecsService.serviceName!,
        },
      ],
      loadBalancerInfo: {
        targetGroupPairInfoList: [
          {
            targetGroups: [{ name: targetGroup.attrTargetGroupName }, { name: targetGroupSub.attrTargetGroupName }],
            prodTrafficRoute: { listenerArns: [listener.attrListenerArn] },
            testTrafficRoute: { listenerArns: [testListener.attrListenerArn] },
          },
        ],
      },
      serviceRoleArn: props.codeDeployRole.attrArn,
    })
  }
}
