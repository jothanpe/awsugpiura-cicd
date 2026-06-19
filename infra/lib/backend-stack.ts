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
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface BackendStackProps extends StackProps {
  readonly appVersion?: string;
}

/**
 * Backend (Paso 2 del despliegue): una Lambda en TypeScript expuesta con una
 * Function URL pública. Independiente del frontend. Todo en capa gratuita.
 */
export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps = {}) {
    super(scope, id, props);

    const logGroup = new LogGroup(this, 'ApiLogs', {
      logGroupName: '/aws/lambda/cicd101-api',
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const fn = new NodejsFunction(this, 'ApiHandler', {
      functionName: 'cicd101-api',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      entry: path.join(__dirname, '..', '..', 'app', 'backend', 'handler.ts'),
      handler: 'handler',
      memorySize: 128,
      timeout: Duration.seconds(10),
      logGroup,
      environment: { APP_VERSION: props.appVersion ?? '1.0.0' },
      bundling: { format: OutputFormat.ESM, minify: true, target: 'node22' },
    });

    const url = fn.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

    new CfnOutput(this, 'BackendFunctionUrl', {
      value: url.url,
      description: 'API backend (Lambda Function URL)',
    });
  }
}
