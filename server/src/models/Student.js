import mongoose from 'mongoose';
import { STUDENT_STATUS } from '../config/constants.js';

const shortlistSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true },
    shortlistedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    cgpa: { type: Number, required: true, min: 0, max: 10 },
    branch: { type: String, required: true },
    graduationYear: { type: Number, required: true },
    shortlistedCompanies: { type: [shortlistSchema], default: [] },
    status: { type: String, enum: Object.values(STUDENT_STATUS), default: STUDENT_STATUS.ACTIVE },
  },
  { timestamps: true }
);

studentSchema.index({ cgpa: -1 });
studentSchema.index({ branch: 1 });

export default mongoose.model('Student', studentSchema);
