import * as path from 'path';
import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

/**
 * Frontend (Paso 1 del despliegue): un sitio estático en S3 con "static website
 * hosting" (HTTP, sin CloudFront para mantenerlo simple). Autónomo: no depende
 * del backend. `BucketDeployment` sube el contenido de `app/frontend/`.
 */
export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      // Necesario para que el sitio estático sea accesible públicamente.
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: RemovalPolicy.DESTROY, // demo: se borra al hacer destroy.
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, 'DeploySite', {
      destinationBucket: bucket,
      sources: [Source.asset(path.join(__dirname, '..', '..', 'app', 'frontend'))],
    });

    new CfnOutput(this, 'FrontendUrl', {
      value: bucket.bucketWebsiteUrl,
      description: '🌐 Abre esto en el navegador (sitio en S3)',
    });
  }
}
