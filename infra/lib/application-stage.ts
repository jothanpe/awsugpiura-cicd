import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BackendStack } from './backend-stack';
import { FrontendStack } from './frontend-stack';

export interface ApplicationStageProps extends StageProps {
  readonly appVersion?: string;
}

/**
 * Agrupa la aplicación en DOS stacks independientes, así el pipeline los
 * despliega como dos pasos separados:
 *   - Prod-Frontend  (sitio en S3)
 *   - Prod-Backend   (Lambda)
 */
export class ApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props: ApplicationStageProps = {}) {
    super(scope, id, props);

    new FrontendStack(this, 'Frontend');
    new BackendStack(this, 'Backend', { appVersion: props.appVersion });
  }
}
