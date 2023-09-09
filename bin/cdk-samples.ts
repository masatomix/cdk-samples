#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { VPCStack } from '../lib/VPCStack'
import { BastionStack } from '../lib/BastionStack'

const main = () => {
  const app = new cdk.App()

  const vpcStack = new VPCStack(app, 'VPCStack')
  new BastionStack(app, 'BastionStack', vpcStack.vpc, vpcStack.publicSubnets[0])

}


main()
