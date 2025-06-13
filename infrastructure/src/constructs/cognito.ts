// constructs/database.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cognito from "aws-cdk-lib/aws-cognito"

export class Cognito extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.userPool = new cognito.UserPool(this, "translationUserPool", {
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        this.userPoolClient = new cognito.UserPoolClient(this, "translationUserPoolClient", {
            userPool: this.userPool,
            userPoolClientName: "tranlastor-web-client",
            generateSecret: false,
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.COGNITO
            ]
        })

        new cdk.CfnOutput(this, "userPoolId", {
            value: this.userPool.userPoolId,
        });

        new cdk.CfnOutput(this, "userPoolClient", {
            value: this.userPoolClient.userPoolClientId,
        });
    }
}