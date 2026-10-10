import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import * as models from '../models/index.js';

export async function syncAllIndexes() {
  logger.info('Starting MongoDB Index Initialization & Synchronization...');
  await connectDB();

  const modelList = Object.values(models);
  let totalIndexes = 0;

  for (const model of modelList) {
    if (model && model.init && typeof model.init === 'function') {
      try {
        await model.init();
        const indexes = await model.collection.indexes();
        logger.info(`Synced indexes for model '${model.modelName}': [${indexes.map((idx) => Object.keys(idx.key).join('+')).join(', ')}]`);
        totalIndexes += indexes.length;
      } catch (err) {
        logger.error(`Failed to sync indexes for model '${model.modelName}': ${err.message}`);
      }
    }
  }

  logger.info(`Index synchronization complete! ${totalIndexes} total indexes verified across ${modelList.length} collections.`);
  await disconnectDB();
}

if (process.argv[1]?.endsWith('init-indexes.js')) {
  syncAllIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Index migration failed: ${err.message}`);
      process.exit(1);
    });
}

