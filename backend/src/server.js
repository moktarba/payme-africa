require('dotenv').config();

const app = require('./app');
const { connectRedis, logger } = require('./config/database');

const PORT = parseInt(process.env.PORT || '4000', 10);

async function startServer() {
  await connectRedis();

  return app.listen(PORT, '0.0.0.0', () => {
    logger.info(`PayMe Africa API demarree sur le port ${PORT}`);
    logger.info(`Environnement: ${process.env.NODE_ENV}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Erreur demarrage', { error: err.message });
    process.exit(1);
  });
}

module.exports = { startServer };
