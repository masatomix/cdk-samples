#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { VPCStack } from '../lib/VPCStack'
import { SubnetStack } from '../lib/SubnetStack'

const app = new cdk.App()
const vpcStack = new VPCStack(app, 'VPCStack')
new SubnetStack(app, 'SubnetStack', vpcStack.vpc)

