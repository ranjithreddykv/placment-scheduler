import 'dotenv/config';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

const app = createApp();
let dbReady;

export default async function handler(req, res) {
  if (!dbReady) dbReady = connectDB();
  await dbReady;
  return app(req, res);
}
