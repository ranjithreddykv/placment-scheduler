import Company from '../models/Company.js';
import { asyncHandler, ApiError } from '../utils/errorHandler.js';

export const listCompanies = asyncHandler(async (req, res) => {
  const { priorityTier, status } = req.query;
  const filter = {};
  if (priorityTier) filter.priorityTier = priorityTier;
  if (status) filter.status = status;

  const companies = await Company.find(filter).sort({ companyId: 1 }).lean();
  res.json(companies);
});

export const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ companyId: req.params.id }).lean();
  if (!company) throw new ApiError(404, `Company ${req.params.id} not found`);
  res.json(company);
});
