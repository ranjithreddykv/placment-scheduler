import { asyncHandler } from '../utils/errorHandler.js';
import { generateAndPersistDataset } from '../services/generator/persistDataset.js';

export const generateDataset = asyncHandler(async (req, res) => {
  const overrides = {};
  if (req.body?.seed != null) overrides.seed = Number(req.body.seed);
  const stats = await generateAndPersistDataset(overrides);
  res.status(201).json({ message: 'Demo dataset generated', stats });
});
