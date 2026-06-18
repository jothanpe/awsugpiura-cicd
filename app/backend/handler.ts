import type { LambdaFunctionURLEvent, LambdaFunctionURLResult } from 'aws-lambda';

/**
 * Handler de la demo. Se invoca a través de una Lambda Function URL (sin costo
 * de API Gateway). Devuelve un JSON sencillo que usamos en vivo durante el
 * meetup para demostrar que cada push a `main` despliega una nueva versión.
 */
export const handler = async (
  event: LambdaFunctionURLEvent,
): Promise<LambdaFunctionURLResult> => {
  const body = {
    message: '¡Hola desde AWS CI/CD cloud-native! 🚀',
    service: 'CICD101 demo - AWS UG Piura',
    version: process.env.APP_VERSION ?? 'dev',
    commit: process.env.COMMIT_SHA ?? 'local',
    path: event.requestContext?.http?.path ?? '/',
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body, null, 2),
  };
};
