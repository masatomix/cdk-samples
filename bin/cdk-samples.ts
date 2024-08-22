#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { VPCStack } from '../lib/VPCStack'
import { SubnetStack } from '../lib/SubnetStack'

const app = new cdk.App()
const vpcStack = new VPCStack(app, 'VPCStack', {
  vpcCIDRs: {
    vpc: '192.168.0.0/16',
    subnets: [
      { public: '192.168.0.0/24', private: '192.168.1.0/24' },
      { public: '192.168.2.0/24', private: '192.168.3.0/24' },
      { public: '192.168.4.0/24', private: '192.168.5.0/24' },
    ],
  }
})
// new SubnetStack(app, 'SubnetStack', vpcStack.vpc)
