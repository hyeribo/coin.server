import logger from '@src/config/winston';

export default function errorHandler(
  error: any,
  metadata: { main?: string; sub?: string; data?: any } = {},
): void {
  const { main, sub, data } = metadata;
  if (error && typeof error === 'object') {
    logger.error(error.toString(), {
      main,
      sub,
      data,
    });
  } else {
    logger.error('Initialization failed.', {
      main: 'Account',
      sub: 'init',
      data: error,
    });
  }
}
