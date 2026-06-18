#!/usr/bin/env node
import 'source-map-support/register';
import * as dotenv from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

// Carga las variables desde el archivo .env (no versionado). Las variables ya
// presentes en el entorno tienen prioridad sobre el .env.
dotenv.config();

const app = new cdk.App();

/**
 * Configuración leída desde variables de entorno (archivo .env) o, como
 * alternativa, desde el contexto de CDK (-c flags). Nada sensible queda
 * hardcodeado ni versionado en el repo. Ver `.env.example`.
 */
const repoString =
  process.env.GITHUB_REPO ??
  app.node.tryGetContext('repoString') ??
  'CHANGE_ME/CICD101';

const branch =
  process.env.GITHUB_BRANCH ?? app.node.tryGetContext('branch') ?? 'main';

const connectionArn =
  process.env.CODESTAR_CONNECTION_ARN ??
  app.node.tryGetContext('connectionArn') ??
  '';

if (!connectionArn) {
  throw new Error(
    'Falta CODESTAR_CONNECTION_ARN. Copia .env.example a .env y completa el ARN ' +
      '(o pásalo con -c connectionArn=arn:aws:codeconnections:...).',
  );
}

new PipelineStack(app, 'CICD101-Pipeline', {
  repoString,
  branch,
  connectionArn,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Pipeline CI/CD cloud-native (CodePipeline + CodeBuild + CDK)',
});

app.synth();
