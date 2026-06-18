import * as path from 'path';
import {
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  RemovalPolicy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  Runtime,
  FunctionUrlAuthType,
  Architecture,
  Tracing,
  HttpMethod,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';

export interface ApplicationStackProps extends StackProps {
  /** Versión que mostramos en la respuesta de la API (visible en el demo). */
  readonly appVersion?: string;
}

/**
 * Stack de la aplicación (full-stack serverless, todo en capa gratuita):
 *
 *   Backend  -> Lambda (Node.js 22 · ARM64) expuesta con Function URL + CORS.
 *   Frontend -> sitio estático en un bucket S3 privado, servido por CloudFront
 *               (HTTPS vía Origin Access Control).
 *
 * El frontend descubre la URL del backend en tiempo de despliegue: CDK genera
 * un `config.json` con la Function URL y lo sube junto al sitio. Así no hay
 * nada hardcodeado y el frontend siempre apunta al backend recién desplegado.
 */
export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: ApplicationStackProps = {}) {
    super(scope, id, props);

    // ──────────────────────────────────────────────────────────────────────
    // BACKEND: Lambda + Function URL
    // ──────────────────────────────────────────────────────────────────────
    const logGroup = new LogGroup(this, 'ApiHandlerLogs', {
      logGroupName: '/aws/lambda/cicd101-api',
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const fn = new NodejsFunction(this, 'ApiHandler', {
      functionName: 'cicd101-api',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64, // Graviton: más barato y rápido.
      entry: path.join(__dirname, '..', '..', 'app', 'backend', 'handler.ts'),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(10),
      tracing: Tracing.DISABLED, // mantener gratis (X-Ray tiene costo).
      logGroup,
      environment: {
        APP_VERSION: props.appVersion ?? '1.0.0',
      },
      bundling: {
        format: OutputFormat.ESM,
        minify: true,
        sourceMap: false,
        target: 'node22',
      },
    });

    // CORS habilitado para que el frontend (otro origen) pueda llamar a la API.
    const fnUrl = fn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE, // pública para la demo.
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [HttpMethod.GET],
        allowedHeaders: ['*'],
      },
    });

    // ──────────────────────────────────────────────────────────────────────
    // FRONTEND: S3 (privado) + CloudFront (HTTPS)
    // ──────────────────────────────────────────────────────────────────────
    const siteBucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL, // nadie accede directo a S3.
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY, // demo: se borra al hacer destroy.
      autoDeleteObjects: true,
    });

    const distribution = new Distribution(this, 'SiteDistribution', {
      comment: 'CICD101 frontend - AWS UG Piura',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        // OAC: CloudFront accede al bucket privado de forma segura.
        origin: S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // Sube el sitio estático + un config.json con la URL del backend, y
    // invalida la caché de CloudFront en cada despliegue.
    new BucketDeployment(this, 'DeploySite', {
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
      sources: [
        Source.asset(path.join(__dirname, '..', '..', 'app', 'frontend')),
        Source.jsonData('config.json', {
          apiUrl: fnUrl.url,
          appVersion: props.appVersion ?? '1.0.0',
        }),
      ],
    });

    // ──────────────────────────────────────────────────────────────────────
    // OUTPUTS
    // ──────────────────────────────────────────────────────────────────────
    new CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: '🌐 Abre esto en el navegador (frontend en CloudFront)',
    });
    new CfnOutput(this, 'BackendFunctionUrl', {
      value: fnUrl.url,
      description: 'API backend (Lambda Function URL)',
    });
    new CfnOutput(this, 'SiteBucketName', {
      value: siteBucket.bucketName,
      description: 'Bucket S3 del frontend (privado)',
    });
  }
}
