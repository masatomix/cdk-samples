#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { VPCStack } from "../lib/VPCStack";
import { BastionStack } from "../lib/BastionStack";
import { VPCEndpointStack } from "../lib/VPCEndpointStack";
import { EC2RoleStack } from "../lib/EC2RoleStack";

const main = () => {
    const app = new cdk.App()
    const vpcStack = new VPCStack(app, "VPCStack1")
    new VPCEndpointStack(app, "VPCEndpointStack", {
        vpc: vpcStack.vpc,
        subnets: vpcStack.privateSubnets,
    })
    const ec2roleStack = new EC2RoleStack(app, "EC2RoleStack")
    new BastionStack(app, "BastionStack", {
        vpc: vpcStack.vpc, subnet: vpcStack.privateSubnets[0], role: ec2roleStack.role
    })
}


main()
