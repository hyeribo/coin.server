import logger from '@src/config/winston';

export default function errorHandler(error: any): void {
  if (error && typeof error === 'object') {
    logger.error('Initialization failed.', {
      main: 'Account',
      sub: 'init',
      data: error.toString(),
    });
  } else {
    logger.error('Initialization failed.', {
      main: 'Account',
      sub: 'init',
      data: error,
    });
  }
}
