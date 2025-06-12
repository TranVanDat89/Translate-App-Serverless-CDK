import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";

export class InfrastructureStack extends cdk.Stack {
  private readonly table: dynamodb.Table;
  private readonly lambdaLayer: lambda.LayerVersion;
  private readonly restAPI: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Initialize core resources
    this.lambdaLayer = this.createLambdaLayer();
    this.table = this.createDynamoDBTable();
    this.restAPI = this.createRestAPI();

    // Create Lambda functions
    const translationLambda = this.createTranslationLambda();
    const getAllTranslationsLambda = this.createGetAllTranslationsLambda();

    // Setup API Gateway routes
    this.setupAPIRoutes(translationLambda, getAllTranslationsLambda);
  }

  private createLambdaLayer(): lambda.LayerVersion {
    const projectRoot = "../";
    const lambdaLayersDirPath = path.resolve(projectRoot, "packages/lambda-layers");

    return new lambda.LayerVersion(this, "lambdaLayer", {
      code: lambda.Code.fromAsset(lambdaLayersDirPath),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private createDynamoDBTable(): dynamodb.Table {
    return new dynamodb.Table(this, "translations", {
      tableName: "translation_table",
      partitionKey: {
        name: "requestId",
        type: dynamodb.AttributeType.STRING
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }

  private createRestAPI(): apigateway.RestApi {
    return new apigateway.RestApi(this, "translationAPI", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });
  }

  private createIAMPolicies(): {
    translatePolicy: iam.PolicyStatement;
    dynamodbPolicy: iam.PolicyStatement;
  } {
    const translatePolicy = new iam.PolicyStatement({
      actions: ["translate:TranslateText"],
      resources: ["*"],
    });

    const dynamodbPolicy = new iam.PolicyStatement({
      actions: [
        "dynamodb:PutItem",
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:DeleteItem",
      ],
      resources: [this.table.tableArn],
    });

    return { translatePolicy, dynamodbPolicy };
  }

  private getLambdaBundlingOptions(): lambdaNodeJs.BundlingOptions {
    return {
      externalModules: [
        "@ohana/lambda-layers",
        "@aws-sdk/*",
        "@smithy/*",
      ],
      keepNames: true,
      minify: false,
      sourceMap: false,
      target: "node20",
      banner: "#!/usr/bin/env node",
    };
  }

  private getLambdaEnvironment(): Record<string, string> {
    return {
      TRANSLATION_TABLE_NAME: this.table.tableName,
      TRANSLATION_PARTITION_KEY: "requestId"
    };
  }

  private createTranslationLambda(): lambdaNodeJs.NodejsFunction {
    const { translatePolicy, dynamodbPolicy } = this.createIAMPolicies();

    return new lambdaNodeJs.NodejsFunction(this, "translationLambda", {
      entry: "./lambda/translateFunc.ts",
      handler: "translationLambda",
      runtime: lambda.Runtime.NODEJS_20_X,
      initialPolicy: [translatePolicy, dynamodbPolicy],
      layers: [this.lambdaLayer],
      environment: this.getLambdaEnvironment(),
      bundling: this.getLambdaBundlingOptions()
    });
  }

  private createGetAllTranslationsLambda(): lambdaNodeJs.NodejsFunction {
    const { dynamodbPolicy } = this.createIAMPolicies();

    return new lambdaNodeJs.NodejsFunction(this, "getAllTranslations", {
      entry: "./lambda/translateFunc.ts",
      handler: "getAllTranslations",
      runtime: lambda.Runtime.NODEJS_20_X,
      layers: [this.lambdaLayer],
      initialPolicy: [dynamodbPolicy],
      environment: this.getLambdaEnvironment(),
      bundling: this.getLambdaBundlingOptions()
    });
  }

  private setupAPIRoutes(
    translationLambda: lambdaNodeJs.NodejsFunction,
    getAllTranslationsLambda: lambdaNodeJs.NodejsFunction
  ): void {
    this.restAPI.root.addMethod("POST", new apigateway.LambdaIntegration(translationLambda));
    this.restAPI.root.addMethod("GET", new apigateway.LambdaIntegration(getAllTranslationsLambda));
  }
}