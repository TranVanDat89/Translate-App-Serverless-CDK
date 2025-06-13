// constructs/lambda.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {getPath} from "../helpers";

export interface LambdaStackProps {
  table: dynamodb.Table;
}

export class LambdaStack extends Construct {
  public readonly translationLambda: lambdaNodeJs.NodejsFunction;
  public readonly getAllTranslationsLambda: lambdaNodeJs.NodejsFunction;
  private readonly lambdaLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id);

    this.lambdaLayer = this.createLambdaLayer();
    this.translationLambda = this.createTranslationLambda(props.table);
    this.getAllTranslationsLambda = this.createGetAllTranslationsLambda(props.table);
  }

  private createLambdaLayer(): lambda.LayerVersion {
    const lambdaLayersDirPath = getPath("packages/lambda-layers");

    return new lambda.LayerVersion(this, "LambdaLayer", {
      code: lambda.Code.fromAsset(lambdaLayersDirPath),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  private createIAMPolicies(table: dynamodb.Table): {
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
      resources: [table.tableArn],
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

  private getLambdaEnvironment(table: dynamodb.Table): Record<string, string> {
    return {
      TRANSLATION_TABLE_NAME: table.tableName,
      TRANSLATION_PARTITION_KEY: "requestId"
    };
  }

  private createTranslationLambda(table: dynamodb.Table): lambdaNodeJs.NodejsFunction {
    const { translatePolicy, dynamodbPolicy } = this.createIAMPolicies(table);

    return new lambdaNodeJs.NodejsFunction(this, "TranslationLambda", {
      entry: "./lambda/translateFunc.ts",
      handler: "translationLambda",
      runtime: lambda.Runtime.NODEJS_20_X,
      initialPolicy: [translatePolicy, dynamodbPolicy],
      layers: [this.lambdaLayer],
      environment: this.getLambdaEnvironment(table),
      bundling: this.getLambdaBundlingOptions()
    });
  }

  private createGetAllTranslationsLambda(table: dynamodb.Table): lambdaNodeJs.NodejsFunction {
    const { dynamodbPolicy } = this.createIAMPolicies(table);

    return new lambdaNodeJs.NodejsFunction(this, "GetAllTranslationsLambda", {
      entry: "./lambda/translateFunc.ts",
      handler: "getAllTranslations",
      runtime: lambda.Runtime.NODEJS_20_X,
      layers: [this.lambdaLayer],
      initialPolicy: [dynamodbPolicy],
      environment: this.getLambdaEnvironment(table),
      bundling: this.getLambdaBundlingOptions()
    });
  }
}