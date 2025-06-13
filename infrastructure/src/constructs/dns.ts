// constructs/dns.ts
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export interface DnsProps {
  domainName: string;
  hostedZone: route53.IHostedZone;
  distribution: cloudfront.Distribution;
  apiDomain: apigateway.DomainName;
}

export class Dns extends Construct {
  constructor(scope: Construct, id: string, props: DnsProps) {
    super(scope, id);

    this.createRoute53Records(props);
  }

  private createRoute53Records(props: DnsProps): void {
    // A record for main domain pointing to CloudFront
    new route53.ARecord(this, 'WebsiteARecord', {
      zone: props.hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(props.distribution)
      ),
    });

    // AAAA record for main domain pointing to CloudFront (IPv6)
    new route53.AaaaRecord(this, 'WebsiteAAAARecord', {
      zone: props.hostedZone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(props.distribution)
      ),
    });

    // A record for API subdomain pointing to API Gateway
    new route53.ARecord(this, 'ApiARecord', {
      zone: props.hostedZone,
      recordName: `api.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayDomain(props.apiDomain)
      ),
    });

    // AAAA record for API subdomain pointing to API Gateway (IPv6)
    new route53.AaaaRecord(this, 'ApiAAAARecord', {
      zone: props.hostedZone,
      recordName: `api.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayDomain(props.apiDomain)
      ),
    });
  }
}