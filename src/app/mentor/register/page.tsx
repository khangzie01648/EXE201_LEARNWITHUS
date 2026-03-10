'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/shared';
import {
  GraduationCap,
  CheckCircle2,
  Loader2,
  DollarSign,
  Clock,
  Users,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';

const subjectOptions = [
  'Lập trình Web',
  'Toán rời rạc',
  'Trí tuệ nhân tạo',
  'Cơ sở dữ liệu',
  'IELTS',
  'Kinh tế học',
  'Vật lý',
  'Hóa học',
  'Khác',
];

const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const timeSlotLabels = ['Sáng (8h-12h)', 'Chiều (13h-17h)', 'Tối (18h-21h)'];

function formatPriceVN(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return num.toLocaleString('vi-VN');
}

function parsePriceVN(value: string): number {
  const digits = value.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

const benefits = [
  { icon: DollarSign, text: 'Thu nhập từ mỗi buổi tư vấn' },
  { icon: Clock, text: 'Linh hoạt thời gian làm việc' },
  { icon: Users, text: 'Kết nối với sinh viên toàn quốc' },
];

export default function MentorRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    subjectOther: '',
    experience: '',
    availability: '',
    bio: '',
    pricePerSession: '',
    bankName: '',
    bankAccountNumber: '',
  });
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Auto-fill Họ và tên, Email, Số điện thoại from logged-in user
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.data) {
          const profile = data.data as { fullName?: string; email?: string; phone?: string };
          setFormData((prev) => ({
            ...prev,
            fullName: profile.fullName || prev.fullName,
            email: profile.email || prev.email,
            phone: profile.phone || prev.phone,
          }));
        }
      } catch {
        // Ignore - user can still fill manually
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const subjectValue = formData.subject === 'Khác' ? formData.subjectOther.trim() : formData.subject;
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.subject) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (!formData.bankName.trim() || !formData.bankAccountNumber.trim()) {
      setError('Vui lòng điền tên ngân hàng và số tài khoản để nhận thanh toán');
      return;
    }
    if (formData.subject === 'Khác' && !formData.subjectOther.trim()) {
      setError('Vui lòng nhập môn học / lĩnh vực khi chọn Khác');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError('Vui lòng đăng nhập để đăng ký làm Mentor');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          subject: subjectValue,
          experience: formData.experience.trim(),
          availability: formData.availability.trim(),
          pricePerSession: parsePriceVN(formData.pricePerSession),
          bio: formData.bio.trim(),
          goal: formData.bio.trim() || formData.experience.trim() || '',
          bankName: formData.bankName.trim(),
          bankAccountNumber: formData.bankAccountNumber.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } catch {
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Đăng ký thành công!</h2>
            <p className="mt-3 text-gray-600">
              Chúng tôi đã nhận đơn đăng ký của bạn. Đội ngũ sẽ xem xét và liên hệ trong 3-5 ngày làm việc.
            </p>
            <Link
              href="/mentors"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
            >
              Xem danh sách Mentor
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="px-4 py-12 mx-auto max-w-5xl sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-full">
            <Sparkles size={16} className="text-amber-500" />
            Trở thành Mentor
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-800 md:text-4xl">
            Đăng ký làm Mentor
          </h1>
          <p className="max-w-2xl mx-auto text-gray-600">
            Chia sẻ kiến thức, hỗ trợ sinh viên và nhận thu nhập từ mỗi buổi tư vấn.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Benefits */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-gray-800">Lợi ích khi làm Mentor</h3>
              <ul className="mt-4 space-y-4">
                {benefits.map((item) => (
                  <li key={item.text} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <item.icon size={20} className="text-slate-600" />
                    </div>
                    <span className="text-sm text-gray-700">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-white">
              <h3 className="font-semibold">Quy trình duyệt</h3>
              <ol className="mt-4 space-y-2 text-sm text-white/90">
                <li>1. Gửi đơn đăng ký</li>
                <li>2. Đội ngũ xem xét (3-5 ngày)</li>
                <li>3. Phỏng vấn ngắn (nếu cần)</li>
                <li>4. Kích hoạt tài khoản Mentor</li>
              </ol>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <h3 className="mb-6 font-semibold text-gray-800">Thông tin đăng ký</h3>
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="email@edu.vn"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="0912345678"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Môn học / Lĩnh vực <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="">Chọn môn học</option>
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {formData.subject === 'Khác' && (
                    <input
                      type="text"
                      value={formData.subjectOther}
                      onChange={(e) => setFormData({ ...formData, subjectOther: e.target.value })}
                      placeholder="Nhập môn học / lĩnh vực của bạn"
                      className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="VD: 5 năm"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Lịch rảnh (ước tính)
                  </label>
                  <p className="mb-2 text-xs text-gray-500">
                    Chọn thứ và thời gian, sau đó bấm Thêm để thêm vào danh sách
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[120px]">
                      <label className="mb-1 block text-xs text-gray-500">Thứ</label>
                      <select
                        value={selectedDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">Chọn thứ</option>
                        {dayLabels.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="mb-1 block text-xs text-gray-500">Thời gian</label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <option value="">Chọn giờ</option>
                        {timeSlotLabels.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedDay || !selectedTime) return;
                        const slot = `${selectedDay} - ${selectedTime}`;
                        const current = formData.availability
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (current.includes(slot)) return;
                        setFormData({
                          ...formData,
                          availability: [...current, slot].join(', '),
                        });
                      }}
                      disabled={!selectedDay || !selectedTime}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                      Thêm
                    </button>
                  </div>
                  {formData.availability && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-slate-50/50 p-3">
                      <p className="mb-2 text-xs font-medium text-gray-600">Khung giờ rảnh đã chọn:</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.availability
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((slot) => (
                            <span
                              key={slot}
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1.5 text-sm text-slate-800"
                            >
                              {slot}
                              <button
                                type="button"
                                onClick={() => {
                                  const current = formData.availability
                                    .split(',')
                                    .map((x) => x.trim())
                                    .filter(Boolean);
                                  const next = current.filter((x) => x !== slot).join(', ');
                                  setFormData({ ...formData, availability: next });
                                }}
                                className="rounded-full p-0.5 hover:bg-slate-300"
                                aria-label="Xóa"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Giá đề xuất / buổi (VNĐ)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatPriceVN(formData.pricePerSession)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, pricePerSession: raw });
                    }}
                    placeholder="VD: 150.000"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Tên ngân hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="VD: Vietcombank, Techcombank"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Số tài khoản <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value.replace(/\D/g, '') })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="VD: 1234567890"
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    Giới thiệu bản thân
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Mô tả kinh nghiệm, chuyên môn, phong cách dạy..."
                  />
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <GraduationCap size={18} />
                    Gửi đơn đăng ký
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
