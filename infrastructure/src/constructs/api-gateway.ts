// constructs/api-gateway.ts
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface ApiGatewayProps {
  domainName: string;
  certificate: acm.Certificate;
  translationLambda: lambdaNodeJs.NodejsFunction;
  getAllTranslationsLambda: lambdaNodeJs.NodejsFunction;
}

export class ApiGateway extends Construct {
  public readonly restAPI: apigateway.RestApi;
  public readonly apiDomain: apigateway.DomainName;

  constructor(scope: Construct, id: string, props: ApiGatewayProps) {
    super(scope, id);

    this.restAPI = this.createRestAPI(props.domainName, props.certificate);
    this.apiDomain = this.createAPIGatewayDomain(props.domainName, props.certificate);
    this.setupAPIRoutes(props.translationLambda, props.getAllTranslationsLambda);
  }

  private createRestAPI(domainName: string, certificate: acm.Certificate): apigateway.RestApi {
    return new apigateway.RestApi(this, "TranslationAPI", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      domainName: {
        domainName: domainName,
        certificate
      }
    });
  }

  private createAPIGatewayDomain(domainName: string, certificate: acm.Certificate): apigateway.DomainName {
    const apiDomainName = `api.${domainName}`;
    
    return new apigateway.DomainName(this, 'ApiDomain', {
      domainName: apiDomainName,
      certificate: certificate,
      endpointType: apigateway.EndpointType.EDGE,
      mapping: this.restAPI,
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