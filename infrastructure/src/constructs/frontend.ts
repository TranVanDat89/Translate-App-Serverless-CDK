// constructs/frontend.ts
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import {getPath} from "../helpers";

export interface FrontendProps {
  domainName: string;
  certificate: acm.Certificate;
}

export class Frontend extends Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendProps) {
    super(scope, id);

    this.s3Bucket = this.createS3Bucket();
    this.distribution = this.createCloudFront(props.domainName, props.certificate);
    this.deployStaticWeb();
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

  private createCloudFront(domainName: string, certificate: acm.Certificate): cloudfront.Distribution {
    return new cloudfront.Distribution(this, "WebDistribution", {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(this.s3Bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      domainNames: [domainName],
      certificate: certificate,
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

  private deployStaticWeb(): s3Deploy.BucketDeployment {
    const staticWebDir = getPath("apps/frontend/dist");
    
    return new s3Deploy.BucketDeployment(this, "WebsiteDeployment", {
      destinationBucket: this.s3Bucket,
      sources: [s3Deploy.Source.asset(staticWebDir)],
      distribution: this.distribution,
      distributionPaths: ["/*"]
    });
  }
}