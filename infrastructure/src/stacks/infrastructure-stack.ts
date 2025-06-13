// infrastructure-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { writeAuthConfigToFile } from "../helpers";

// Import constructs
import {ApiGateway, Certificate, Database, Frontend, Dns, LambdaStack, Cognito} from "../constructs";

export interface InfrastructureStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
}

export class InfrastructureStack extends cdk.Stack {
  private readonly domainName: string;
  private readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    // Validate required props
    if (!props.domainName) {
      throw new Error('domainName is required');
    }
    if (!props.hostedZoneId) {
      throw new Error('hostedZoneId is required');
    }

    this.domainName = props.domainName;
    this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: this.domainName,
    });

    // Initialize constructs in dependency order
    const certificate = new Certificate(this, 'Certificate', {
      domainName: this.domainName,
      hostedZone: this.hostedZone,
    });

    // Cognito
    const cognito = new Cognito(this, 'Cognito');
    writeAuthConfigToFile({
      userPoolId: cognito.userPool.userPoolId,
      userPoolClientId: cognito.userPoolClient.userPoolClientId
    });

    const database = new Database(this, 'Database');

    const lambdaStack = new LambdaStack(this, 'LambdaStack', {
      table: database.table,
    });

    const apiGateway = new ApiGateway(this, 'ApiGateway', {
      domainName: this.domainName,
      certificate: certificate.certificate,
      translationLambda: lambdaStack.translationLambda,
      getAllTranslationsLambda: lambdaStack.getAllTranslationsLambda,
    });

    const frontend = new Frontend(this, 'Frontend', {
      domainName: this.domainName,
      certificate: certificate.certificate,
    });

    new Dns(this, 'Dns', {
      domainName: this.domainName,
      hostedZone: this.hostedZone,
      distribution: frontend.distribution,
      apiDomain: apiGateway.apiDomain,
    });

    // Outputs
    new cdk.CfnOutput(this, "WebUrl", {
      exportName: "WebUrl",
      value: `https://${this.domainName}`
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      exportName: "ApiUrl",
      value: `https://api.${this.domainName}`
    });
  }
}