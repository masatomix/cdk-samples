import { App, Stack, StackProps } from 'aws-cdk-lib'
import { CfnMetricFilter } from 'aws-cdk-lib/aws-logs'
import { CfnAlarm } from 'aws-cdk-lib/aws-cloudwatch'
import { CfnScalableTarget, CfnScalingPolicy } from 'aws-cdk-lib/aws-applicationautoscaling'
import { CfnCluster, CfnService } from 'aws-cdk-lib/aws-ecs'


type AutoScalingStackProps = StackProps & {
    cluster: CfnCluster
    ecsService: CfnService
}

export class AutoScalingStack extends Stack {
    constructor(scope: App, id: string, props: AutoScalingStackProps) {
        super(scope, id, props);

        new CfnScalableTarget(this, `${props.cluster.clusterName}${props.ecsService.serviceName}Target`, {
            maxCapacity: 10,
            minCapacity: 3,
            resourceId: `service/${props.cluster.clusterName}/${props.ecsService.serviceName}`,
            scalableDimension: "ecs:service:DesiredCount",
            serviceNamespace: "ecs",
            suspendedState: {
                dynamicScalingInSuspended: false,
                dynamicScalingOutSuspended: false,
                scheduledScalingSuspended: false
            }
        });

         new CfnScalingPolicy(this, `${props.cluster.clusterName}${props.ecsService.serviceName}Policy`, {
            policyName: `${props.ecsService.serviceName}-scalingPolicy`,
            policyType: "TargetTrackingScaling",
            resourceId: `service/${props.cluster.clusterName}/${props.ecsService.serviceName}`,
            scalableDimension: "ecs:service:DesiredCount",
            serviceNamespace: "ecs",
            targetTrackingScalingPolicyConfiguration: {
                disableScaleIn: false,
                predefinedMetricSpecification: {
                    predefinedMetricType: "ECSServiceAverageCPUUtilization"
                },
                targetValue: 70
            }
        });
    }

}

