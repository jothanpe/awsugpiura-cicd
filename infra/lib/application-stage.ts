import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApplicationStack } from './application-stack';

export interface ApplicationStageProps extends StageProps {
  readonly appVersion?: string;
}

/**
 * Un Stage agrupa los stacks que se despliegan juntos como una unidad dentro
 * del pipeline. Aquí solo tenemos el ApplicationStack, pero podrías añadir
 * más (base de datos, frontend, etc.) y todos se desplegarían en este paso.
 */
export class ApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props: ApplicationStageProps = {}) {
    super(scope, id, props);

    new ApplicationStack(this, 'App', {
      appVersion: props.appVersion,
    });
  }
}
