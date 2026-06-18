import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApplicationStack } from '../lib/application-stack';

describe('ApplicationStack', () => {
  const app = new App();
  const stack = new ApplicationStack(app, 'TestStack', { appVersion: '9.9.9' });
  const template = Template.fromStack(stack);

  // ── Backend ────────────────────────────────────────────────────────────
  test('la Lambda backend usa Node.js 22 sobre ARM64', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
    });
  });

  test('expone una Function URL pública con CORS', () => {
    template.hasResourceProperties('AWS::Lambda::Url', {
      AuthType: 'NONE',
      Cors: Match.objectLike({
        AllowMethods: ['GET'],
        AllowOrigins: ['*'],
      }),
    });
  });

  test('inyecta la versión como variable de entorno', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ APP_VERSION: '9.9.9' }),
      },
    });
  });

  // ── Frontend ───────────────────────────────────────────────────────────
  test('crea un bucket S3 privado (sin acceso público)', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('crea una distribución de CloudFront que fuerza HTTPS', () => {
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        DefaultRootObject: 'index.html',
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: 'redirect-to-https',
        }),
      }),
    });
  });
});
