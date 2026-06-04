import app from './app';
import { env } from './config/env';

const PORT = process.env.PORT || env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED_REJECTION', reason);
});

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT_EXCEPTION', error);
});