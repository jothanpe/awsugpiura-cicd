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
 * NOTA: self-mutation ACTIVADO (default). No es opcional en la práctica: el
 * paso de self-mutation mantiene sincronizada la etapa de Assets, que publica
 * a S3 los assets de la app (frontend, bundle de la Lambda) antes del Deploy.
 * Sin él, al cambiar la app los assets nuevos no se publican y el Deploy falla.
 */
export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const source = CodePipelineSource.connection(props.repoString, props.branch, {
      connectionArn: props.connectionArn,
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'cicd101-pipeline',
      // Self-mutation activado (default). Mantiene la etapa de Assets en sync
      // para que los assets nuevos de la app se publiquen antes del Deploy.
      selfMutation: true,
      synth: new ShellStep('Synth', {
        input: source,
        // Esto corre dentro de CodeBuild: instala, prueba, compila y sintetiza.
        commands: [
          'npm ci',
          'npm run build',
          'npm test',
          'npx cdk synth',
        ],
        // El `cdk synth` se vuelve a ejecutar AQUÍ (en CodeBuild), pero el repo
        // no incluye el .env (está en .gitignore). Inyectamos los valores —que
        // no son secretos— al entorno del build para que app.ts los encuentre.
        env: {
          GITHUB_REPO: props.repoString,
          GITHUB_BRANCH: props.branch,
          CODESTAR_CONNECTION_ARN: props.connectionArn,
        },
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
