import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { ApplicationStage } from './application-stage';

export interface PipelineStackProps extends StackProps {
  /** Repo de GitHub en formato "owner/repo". */
  readonly repoString: string;
  /** Rama que dispara el pipeline. */
  readonly branch: string;
  /** ARN de la CodeConnection (CodeStar Connection) ya creada en tu cuenta. */
  readonly connectionArn: string;
}

/**
 * Stack del pipeline. Usa CDK Pipelines, que internamente crea:
 *   - Un AWS CodePipeline (source -> build -> deploy).
 *   - Un proyecto de AWS CodeBuild para el `synth`.
 *   - Un bucket S3 para artefactos.
 *
 * El source es GitHub vía CodeConnection (sin webhooks ni tokens en código).
 * Cada push a `main` arranca el pipeline automáticamente.
 *
 * NOTA: self-mutation desactivado a propósito. El pipeline se despliega una vez
 * a mano (`npm run deploy`) y a partir de ahí solo cambia el código de `app/`.
 * Si en el futuro cambias la DEFINICIÓN del pipeline, vuelve a `npm run deploy`.
 */
export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const source = CodePipelineSource.connection(props.repoString, props.branch, {
      connectionArn: props.connectionArn,
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'cicd101-pipeline',
      // Sin self-mutation: el pipeline no se actualiza a sí mismo. Suficiente
      // para este flujo, donde solo cambia el código de la aplicación.
      selfMutation: false,
      synth: new ShellStep('Synth', {
        input: source,
        // Esto corre dentro de CodeBuild: instala, prueba, compila y sintetiza.
        commands: [
          'npm ci',
          'npm run build',
          'npm test',
          'npx cdk synth',
        ],
      }),
    });

    // Etapa de despliegue: aquí se publica la aplicación (Lambda + Function URL).
    pipeline.addStage(
      new ApplicationStage(this, 'Prod', {
        env: props.env,
        appVersion: '1.0.0',
      }),
    );
  }
}
