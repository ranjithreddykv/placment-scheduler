import Modal from './ui/Modal.jsx';
import Badge from './ui/Badge.jsx';
import { STATUS_STYLES, TIER_STYLES, TIER_LABELS, REASON_LABELS } from '../utils/format.js';

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value ?? '—'}</span>
    </div>
  );
}

export default function InterviewDetailModal({ interview, student, company, onClose }) {
  if (!interview) return null;

  const wasMoved =
    interview.status === 'SCHEDULED' &&
    (interview.startTime !== interview.originalStartTime || interview.roomId !== interview.originalRoomId || interview.panelId !== interview.originalPanelId || interview.day !== interview.originalDay);

  return (
    <Modal open={!!interview} onClose={onClose} title="Interview Details">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-slate-900">{student?.name || interview.studentId}</p>
          <p className="text-sm text-slate-500">{company?.name || interview.companyId}</p>
        </div>
        <Badge className={STATUS_STYLES[interview.status]}>{interview.status}</Badge>
      </div>

      <div className="mb-3">
        <Row label="Student ID" value={interview.studentId} />
        <Row label="CGPA" value={student?.cgpa} />
        <Row label="Branch" value={student?.branch} />
      </div>

      <div className="mb-3">
        <Row label="Company Priority" value={company && <Badge className={TIER_STYLES[company.priorityTier]}>{TIER_LABELS[company.priorityTier]}</Badge>} />
        <Row label="Panel" value={interview.panelId} />
        <Row label="Room" value={interview.roomId} />
        <Row label="Day" value={interview.day ? `Day ${interview.day}` : null} />
        <Row label="Start" value={interview.startTime} />
        <Row label="End" value={interview.endTime} />
      </div>

      {interview.status === 'UNSCHEDULED' && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Could not be scheduled: {REASON_LABELS[interview.unscheduledReason] || interview.unscheduledReason}
        </div>
      )}

      {wasMoved && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Moved during replanning</p>
          <p className="mt-1 text-xs text-amber-700">
            Original: Day {interview.originalDay} · {interview.originalStartTime}-{interview.originalEndTime} · {interview.originalRoomId} · {interview.originalPanelId}
          </p>
        </div>
      )}
    </Modal>
  );
}
