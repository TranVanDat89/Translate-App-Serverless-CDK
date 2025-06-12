import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

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

    // Create S3 Bucket And Deploy Static Web
    const s3Bucket = this.createS3Bucket();
    // Create CloudFront
    const distribution = this.createCloudFront(s3Bucket);
    this.deployStaticWeb(s3Bucket, distribution);

    // Print domain name
    new cdk.CfnOutput(this, "WebUrl", {
      exportName: "WebUrl",
      value: `https://${distribution.distributionDomainName}`
    })
  }

  private createCloudFront(s3Bucket: s3.Bucket): cloudfront.Distribution {
    return new cloudfront.Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(s3Bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(30),
        },
      ]
    });
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

  private createS3Bucket(): s3.Bucket {
    return new s3.Bucket(this, "BucketDeployedWebsite", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "404.html",
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
    });
  }

  private deployStaticWeb(s3Bucket: s3.Bucket, distribution:cloudfront.Distribution): s3Deploy.BucketDeployment {
    const projectRoot = "../";
    const staticWebDir = path.resolve(projectRoot, "apps/frontend/dist");
    return new s3Deploy.BucketDeployment(this, "WebsiteDeployment", {
      destinationBucket: s3Bucket,
      sources: [s3Deploy.Source.asset(staticWebDir)],
      distribution: distribution,
      distributionPaths: ["/*"]
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