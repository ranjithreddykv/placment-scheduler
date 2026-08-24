import express from 'express';
import cors from 'cors';

import datasetRoutes from './routes/dataset.routes.js';
import studentRoutes from './routes/student.routes.js';
import companyRoutes from './routes/company.routes.js';
import roomRoutes from './routes/room.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import replanRoutes from './routes/replan.routes.js';
import { errorHandler } from './utils/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/dataset', datasetRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/schedule', scheduleRoutes);
  app.use('/api/replan', replanRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
}
