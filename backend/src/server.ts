import app from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

app.get('/health', (_, res) => {
  res.status(200).json({
    status: 'ok',
    layer: 'backend'
  });
});