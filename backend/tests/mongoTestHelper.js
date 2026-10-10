import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as models from '../src/models/index.js';

let mongoServer;

export async function connectTestDB() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Initialize and build indexes for all models so unique constraints are active
  const modelList = Object.values(models);
  for (const model of modelList) {
    if (model?.init && typeof model.init === 'function') {
      await model.init();
    }
  }

  return uri;
}

export async function clearTestDB() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
}

