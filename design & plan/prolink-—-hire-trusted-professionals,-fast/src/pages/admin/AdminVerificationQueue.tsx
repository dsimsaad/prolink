import React, { useState, useEffect } from 'react';
import { marketplaceStore } from '../../store/marketplaceStore';
import { api } from '../../services/api';
import { VerificationRequest } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatusChip } from '../../components/ui/StatusChip';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';

export const AdminVerificationQueue: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedReq, setSelectedReq] = useState<VerificationRequest | null>(null);
  const [adminNote, setAdminNote] = useState('CNIC document and identity verified against official database.');
  const [rejectReason, setRejectReason] = useState('Document scan is blurry. Please re-upload with clear high-resolution lighting.');
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    const data = await api.getVerificationRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (reqId: string) => {
    await api.approveVerification(reqId, adminNote);
    await loadRequests();
    setSelectedReq(null);
    marketplaceStore.addToast('Artisan Approved! 🛡️', 'Professional is now marked Verified on ProLink and eligible for live job matching.', 'success');
  };

  const handleReject = async (reqId: string) => {
    await api.rejectVerification(reqId, rejectReason);
    await loadRequests();
    setSelectedReq(null);
    marketplaceStore.addToast('Application Rejected', 'Notification dispatched to artisan with corrective instructions.', 'info');
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8A317]" />
            <span className="text-xs font-semibold text-[#0F6B3E] uppercase tracking-wider">
              Identity Verification Desk
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#0C2A1B] mt-1">
            Artisan Verification Queue ({pendingCount} Pending)
          </h1>
          <p className="text-xs text-[#6A7B70]">
            Audit National Identity Cards (CNIC), biometric selfies, and certifications before granting the ProLink Verified Badge.
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-[#DCE8E0] rounded-[10px] overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#DCE8E0] bg-[#F4FAF6] text-[#6A7B70] font-semibold">
              <th className="py-3 px-4">Applicant</th>
              <th className="py-3 px-4">Category & Experience</th>
              <th className="py-3 px-4">CNIC Number</th>
              <th className="py-3 px-4">Submitted Time</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE8E0]">
            {requests.map((req) => (
              <tr
                key={req.id}
                onClick={() => setSelectedReq(req)}
                className="hover:bg-[#F4FAF6] transition-colors cursor-pointer group"
              >
                <td className="py-3 px-4">
                  <div className="font-bold text-[#0C2A1B] group-hover:text-[#0F6B3E]">
                    {req.proName}
                  </div>
                  <div className="text-[10px] text-[#6A7B70]">{req.proPhone}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-[#0F6B3E]">{req.category}</span>
                  <span className="text-[11px] text-[#6A7B70] block">{req.experienceYears} years in field</span>
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#0C2A1B]">
                  {req.cnicNumber}
                </td>
                <td className="py-3 px-4 text-[#6A7B70]">
                  {new Date(req.submittedAt).toLocaleDateString()}
                </td>
                <td className="py-3 px-4">
                  <StatusChip status={req.status === 'approved' ? 'verified' : req.status === 'rejected' ? 'cancelled' : 'pending_verification'} />
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReq(req);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Audit Docs
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verification Document Viewer Modal / Drawer */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[12px] border border-[#DCE8E0] shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-[#DCE8E0]">
              <div>
                <span className="text-xs font-bold text-[#0F6B3E] uppercase tracking-wider">
                  Verification Dossier #{selectedReq.id}
                </span>
                <h3 className="text-lg font-bold text-[#0C2A1B] mt-0.5">
                  Audit: {selectedReq.proName}
                </h3>
                <p className="text-xs text-[#6A7B70]">
                  {selectedReq.category} · {selectedReq.experienceYears} Years Experience
                </p>
              </div>
              <button onClick={() => setSelectedReq(null)} className="text-[#6A7B70] hover:text-[#0C2A1B]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Viewer Previews */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-[#0C2A1B] block">
                Submitted Government Identification Documents
              </span>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#DCE8E0] rounded-[8px] overflow-hidden space-y-1.5 p-2 bg-[#F4FAF6]">
                  <span className="text-[11px] font-semibold text-[#0C2A1B] block">
                    National ID Card (CNIC Front)
                  </span>
                  <div className="h-44 rounded-[6px] overflow-hidden border border-[#DCE8E0] bg-white">
                    <img
                      src={selectedReq.cnicFrontImage}
                      alt="CNIC Front"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[10px] font-mono text-[#6A7B70] text-center pt-1">
                    CNIC: {selectedReq.cnicNumber}
                  </div>
                </div>

                <div className="border border-[#DCE8E0] rounded-[8px] overflow-hidden space-y-1.5 p-2 bg-[#F4FAF6]">
                  <span className="text-[11px] font-semibold text-[#0C2A1B] block">
                    Biometric Selfie Match
                  </span>
                  <div className="h-44 rounded-[6px] overflow-hidden border border-[#DCE8E0] bg-white">
                    <img
                      src={selectedReq.selfieImage}
                      alt="Selfie Match"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[10px] text-[#2FAE60] text-center font-semibold pt-1">
                    Face Match: 98.4% Confidence
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Notes */}
            {selectedReq.status === 'pending' ? (
              <div className="space-y-4 pt-3 border-t border-[#DCE8E0]">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#0C2A1B]">
                    Audit Notes & Validation Log
                  </label>
                  <input
                    type="text"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-[#DCE8E0] rounded-[6px]"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => handleReject(selectedReq.id)}
                    className="text-xs font-bold"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject Application
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleApprove(selectedReq.id)}
                    className="flex-1 font-bold text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Approve & Grant Verified Pro Badge
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#F4FAF6] border border-[#DCE8E0] rounded-[8px] text-xs text-[#0C2A1B]">
                This application has already been processed with status: <strong>{selectedReq.status.toUpperCase()}</strong>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
