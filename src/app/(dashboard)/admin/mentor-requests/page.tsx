'use client';

import { useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/dashboard';
import { Loading } from '@/components/shared';
import { RefreshCcw } from 'lucide-react';

interface MentorRequestDto {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  experience?: string;
  availability?: string;
  pricePerSession?: number;
  bio?: string;
  goal: string;
  bankName?: string;
  bankAccountNumber?: string;
  status: string;
  createdAt: string;
}

export default function AdminMentorRequestsPage() {
  const [requests, setRequests] = useState<MentorRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      const url = statusFilter
        ? `/api/admin/mentor-requests?status=${encodeURIComponent(statusFilter)}`
        : '/api/admin/mentor-requests';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (data.data) {
        setRequests(data.data as MentorRequestDto[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/mentor-requests/${id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchRequests();
      } else {
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: string) => {
    if (!confirm('Bạn có chắc muốn từ chối yêu cầu này?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/mentor-requests/${id}/deny`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchRequests();
      } else {
        alert(data.message || 'Có lỗi xảy ra');
      }
    } catch {
      alert('Có lỗi xảy ra');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (s: string) => {
    if (!s) return '-';
    try {
      const d = new Date(s);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return s;
    }
  };

  return (
    <div className="p-6">
      <DashboardHeader title="Yêu cầu Mentor" />
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm"
        >
          <option value="">Tất cả</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="denied">Đã từ chối</option>
        </select>
        <button
          onClick={() => fetchRequests()}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          <RefreshCcw size={16} />
          Làm mới
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[1000px] table-fixed">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="w-[140px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Người đăng ký
                </th>
                <th className="w-[160px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Email
                </th>
                <th className="w-[120px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Môn học
                </th>
                <th className="w-[100px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Kinh nghiệm
                </th>
                <th className="w-[100px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Giá/buổi
                </th>
                <th className="w-[120px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Ngân hàng
                </th>
                <th className="w-[110px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Số TK
                </th>
                <th className="w-[90px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Ngày gửi
                </th>
                <th className="w-[100px] shrink-0 px-4 py-4 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="w-[140px] shrink-0 px-4 py-4 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    Chưa có yêu cầu Mentor nào
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis" title={req.fullName}>
                      {req.fullName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={req.email}>
                      {req.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={req.subject}>
                      {req.subject}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={req.experience}>
                      {req.experience || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {req.pricePerSession
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.pricePerSession)
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={req.bankName}>
                      {req.bankName || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis" title={req.bankAccountNumber}>
                      {req.bankAccountNumber || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap align-middle">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${
                          req.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {req.status === 'pending'
                          ? 'Chờ duyệt'
                          : req.status === 'approved'
                            ? 'Đã duyệt'
                            : 'Đã từ chối'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap align-middle">
                      {req.status === 'pending' ? (
                        <select
                          value=""
                          onChange={(e) => {
                            const action = e.target.value;
                            e.target.value = '';
                            if (action === 'approve') handleApprove(req.id);
                            else if (action === 'deny') handleDeny(req.id);
                          }}
                          disabled={actionLoading === req.id}
                          className="min-w-[120px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
                        >
                          <option value="">Chọn thao tác</option>
                          <option value="approve">Duyệt</option>
                          <option value="deny">Từ chối</option>
                        </select>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
