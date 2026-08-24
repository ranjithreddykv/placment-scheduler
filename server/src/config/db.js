import mongoose from 'mongoose';

let memoryServer = null;

/**
 * Connects to MongoDB. If MONGODB_URI is not set, spins up an in-memory
 * MongoDB instance (via mongodb-memory-server) so the project runs with
 * zero external setup during evaluation/demo. It's started as a single-node
 * replica set (not a plain standalone) specifically so multi-document
 * transactions work — replanning uses one to keep interview updates,
 * company/room/student state, and the new schedule version consistent.
 * Set MONGODB_URI in server/.env to point at a real local mongod or Atlas
 * cluster for persistent storage instead.
 */
export async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri && process.env.VERCEL) {
    throw new Error(
      '[db] MONGODB_URI is not set. Add it in the Vercel project\'s Environment Variables — ' +
      'the in-memory MongoDB fallback cannot run in a serverless environment.'
    );
  }

  if (!uri) {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    uri = memoryServer.getUri();
    console.log('[db] No MONGODB_URI provided — using in-memory MongoDB (single-node replica set) for this session.');
  }

  await mongoose.connect(uri);
  console.log(`[db] Connected to MongoDB at ${uri.replace(/\/\/.*@/, '//***@')}`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
