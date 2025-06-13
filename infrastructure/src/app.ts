#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../src/stacks/infrastructure-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();
new InfrastructureStack(app, 'InfrastructureStack', {
  // Bắt buộc phải là us-east-1 cho ACM certificate với CloudFront
  env: {
    region: process.env.REGION
  },
  domainName: process.env.DOMAIN_NAME!,
  hostedZoneId: process.env.HOSTED_ZONE_ID!
});