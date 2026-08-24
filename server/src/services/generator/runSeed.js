import 'dotenv/config';
import { connectDB, disconnectDB } from '../../config/db.js';
import { generateAndPersistDataset } from './persistDataset.js';
import { generateAndPersistSchedule } from '../scheduler/persistSchedule.js';

async function main() {
  await connectDB();
  console.log('[seed] Generating demo dataset...');
  const stats = await generateAndPersistDataset();
  console.log('[seed] Dataset generated:', stats);

  console.log('[seed] Generating initial schedule...');
  const { metrics } = await generateAndPersistSchedule();
  console.log('[seed] Schedule generated:', metrics);

  await disconnectDB();
  console.log('[seed] Done.');
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
