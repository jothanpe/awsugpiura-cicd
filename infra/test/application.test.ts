import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';

describe('BackendStack', () => {
  const t = Template.fromStack(
    new BackendStack(new App(), 'TestBackend', { appVersion: '9.9.9' }),
  );

  test('Lambda Node.js 22 sobre ARM64', () => {
    t.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
    });
  });

  test('expone una Function URL pública', () => {
    t.hasResourceProperties('AWS::Lambda::Url', { AuthType: 'NONE' });
  });

  test('inyecta la versión como variable de entorno', () => {
    t.hasResourceProperties('AWS::Lambda::Function', {
      Environment: { Variables: Match.objectLike({ APP_VERSION: '9.9.9' }) },
    });
  });
});

describe('FrontendStack', () => {
  const t = Template.fromStack(new FrontendStack(new App(), 'TestFrontend'));

  test('bucket S3 configurado como sitio web estático', () => {
    t.hasResourceProperties('AWS::S3::Bucket', {
      WebsiteConfiguration: Match.objectLike({ IndexDocument: 'index.html' }),
    });
  });
});
