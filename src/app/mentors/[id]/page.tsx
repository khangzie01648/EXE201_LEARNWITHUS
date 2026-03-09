'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components/shared';
import {
  Star,
  GraduationCap,
  Calendar,
  Clock,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Users,
} from 'lucide-react';
import type { MentorProfile, MentorReview } from '@/types';

export default function MentorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = typeof params.id === 'string' ? params.id : params.id?.[0];

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [reviews, setReviews] = useState<MentorReview[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingType, setBookingType] = useState<'session' | 'consultation'>('consultation');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    preferredSlot: '',
    topic: '',
    note: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mentorId) return;
    const fetchMentor = async () => {
      setPageLoading(true);
      try {
        const res = await fetch(`/api/mentors/${mentorId}`);
        const data = await res.json();
        if (data.data) {
          setMentor(data.data.profile);
          setReviews(data.data.reviews || []);
        }
      } catch (err) {
        console.error('Failed to fetch mentor:', err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchMentor();
  }, [mentorId]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[parts.length - 2][0] + parts[parts.length - 1][0];
    }
    return name.slice(0, 2).toUpperCase();
  };

  const openBookingForm = (type: 'session' | 'consultation') => {
    setBookingType(type);
    setShowBookingForm(true);
    setFormData({ preferredSlot: '', topic: '', note: '' });
    setErrors({});
  };

  // Vietnamese day name -> day of week (0=Sun, 1=Mon, ...)
  const vietnameseToDayNum: Record<string, number> = {
    'Chủ nhật': 0,
    'Thứ 2': 1,
    'Thứ 3': 2,
    'Thứ 4': 3,
    'Thứ 5': 4,
    'Thứ 6': 5,
    'Thứ 7': 6,
  };

  // Time period -> default hour for scheduledAt
  const slotToHour: Record<string, number> = {
    'Sáng': 9,
    'Chiều': 14,
    'Tối': 19,
  };

  // Danh sách khung giờ rảnh của mentor (chọn trực tiếp)
  const availableSlots = useMemo(() => {
    const avail = Array.isArray(mentor?.availability) ? mentor.availability : [];
    return avail.map((s: string) => s.trim()).filter(Boolean);
  }, [mentor]);

  // Chuyển slot đã chọn thành scheduledAt (ngày gần nhất trong tương lai + giờ mặc định)
  function slotToScheduledAt(slot: string): string {
    const match = slot.match(/^(Thứ [2-7]|Chủ nhật)\s*-\s*(Sáng|Chiều|Tối)/);
    if (!match) return '';
    const dayName = match[1].trim();
    const period = match[2];
    const targetDay = vietnameseToDayNum[dayName];
    const hour = slotToHour[period] ?? 9;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === targetDay) {
        d.setHours(hour, 0, 0, 0);
        if (d <= now) continue; // Bỏ qua nếu đã qua
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        return `${y}-${m}-${day}T${h}:00:00`;
      }
    }
    return '';
  }

  const mentorSubjects = (mentor?.subjects ?? []).filter(Boolean).length > 0
    ? (mentor?.subjects ?? []).filter(Boolean)
    : mentor?.subject
      ? [mentor.subject]
      : [];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentor) return;

    const newErrors: Record<string, string> = {};
    if (!formData.preferredSlot.trim()) newErrors.preferredSlot = 'Vui lòng chọn khung giờ';
    if (!formData.topic.trim()) newErrors.topic = 'Vui lòng mô tả chủ đề';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const scheduledAt = slotToScheduledAt(formData.preferredSlot);
    if (!scheduledAt) {
      setErrors({ preferredSlot: 'Không thể xác định thời gian từ khung giờ đã chọn' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push(`/login?redirect=/mentors/${mentor.id}`);
        return;
      }

      // Step 1: Create booking
      const bookingRes = await fetch('/api/mentor-bookings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mentorId: mentor.userId,
          type: bookingType,
          amount: mentor.pricePerSession,
          scheduledAt,
          topic: formData.topic.trim(),
          note: formData.note.trim(),
        }),
      });
      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        setErrors({ topic: bookingData.message || 'Đặt lịch thất bại' });
        return;
      }

      const bookingId = bookingData.data?.id;

      // Step 2: Create payment link
      const payRes = await fetch(`/api/mentor-bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payData = await payRes.json();

      if (!payRes.ok) {
        setErrors({ topic: payData.message || 'Không thể tạo thanh toán. Vui lòng thanh toán tại trang Lịch hẹn Mentor.' });
        return;
      }

      if (payData.data?.isFreeSession) {
        setBookingSuccess(true);
        return;
      }

      if (payData.data?.checkoutUrl) {
        window.location.href = payData.data.checkoutUrl;
        return;
      }

      // Fallback: booking created but no checkout URL
      setErrors({ topic: 'Đặt lịch thành công nhưng chưa tạo được link thanh toán. Vui lòng thanh toán tại trang Lịch hẹn Mentor.' });
    } catch {
      setErrors({ topic: 'Có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <p className="text-gray-600">Không tìm thấy mentor</p>
          <Link href="/mentors" className="mt-4 text-slate-600 hover:underline">
            Quay lại danh sách
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="px-4 py-8 mx-auto max-w-6xl sm:px-6 lg:px-8">
        <Link
          href="/mentors"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-slate-600 mb-6"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách Mentor
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left - Profile */}
          <div className="lg:col-span-2 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row">
                {mentor.avatarUrl ? (
                  <img
                    src={mentor.avatarUrl}
                    alt={mentor.fullName}
                    className="h-24 w-24 flex-shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 text-2xl font-bold text-white">
                    {getInitials(mentor.fullName)}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{mentor.fullName}</h1>
                  <p className="text-lg font-medium text-slate-600">{mentor.subject}</p>
                  {mentor.university && (
                    <p className="text-sm text-gray-500">{mentor.university}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4">
                    {mentor.rating > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star size={18} className="fill-amber-500" />
                        {mentor.rating.toFixed(1)}
                        <span className="text-sm text-gray-500">
                          ({mentor.reviewCount} đánh giá)
                        </span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <Users size={14} />
                      {mentor.menteeCount} mentee
                    </span>
                    <span className="text-sm text-gray-500">
                      {mentor.sessionCount} buổi
                    </span>
                  </div>
                </div>
              </div>
              {mentor.bio && (
                <p className="mt-6 text-gray-600">{mentor.bio}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                {mentor.experience && (
                  <span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    <Clock size={14} />
                    Kinh nghiệm: {mentor.experience}
                  </span>
                )}
                {mentor.title && (
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {mentor.title}
                  </span>
                )}
                {mentor.company && (
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    {mentor.company}
                  </span>
                )}
              </div>

              {/* Subjects */}
              {(mentor.subjects ?? []).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Chủ đề Mentoring
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(mentor.subjects ?? []).map((s) => (
                      <span key={s} className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Availability */}
            {(Array.isArray(mentor.availability) ? mentor.availability : []).length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-800">
                  <Calendar size={18} className="text-slate-600" />
                  Lịch rảnh
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(Array.isArray(mentor.availability) ? mentor.availability : []).map((slot) => (
                    <span
                      key={slot}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700"
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-800 mb-4">
                  <Star size={18} className="text-amber-500" />
                  Đánh giá từ học viên ({reviews.length})
                </h3>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">{review.userName || 'Ẩn danh'}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              className={i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-gray-200'}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 p-6">
                <p className="text-2xl font-bold text-slate-700">
                  {formatPrice(mentor.pricePerSession)}
                </p>
                <p className="text-sm text-gray-500">/ buổi (45 phút)</p>
              </div>

              {bookingSuccess ? (
                <div className="p-6 text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-500" />
                  <h3 className="font-semibold text-gray-800">Đặt lịch thành công!</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Mentor sẽ xác nhận lịch hẹn của bạn trong thời gian sớm nhất.
                  </p>
                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      setShowBookingForm(false);
                      setFormData({ preferredSlot: '', topic: '', note: '' });
                    }}
                    className="mt-4 text-sm font-medium text-slate-600 hover:underline"
                  >
                    Đặt lịch khác
                  </button>
                </div>
              ) : showBookingForm ? (
                <form onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                    <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                    {bookingType === 'session' ? 'Đăng ký học cùng' : 'Đặt lịch tư vấn'}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Khung giờ rảnh <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.preferredSlot}
                      onChange={(e) => setFormData({ ...formData, preferredSlot: e.target.value })}
                      className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                        errors.preferredSlot ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      <option value="">
                        {availableSlots.length > 0 ? 'Chọn khung giờ' : 'Mentor chưa cập nhật lịch rảnh'}
                      </option>
                      {availableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                    {errors.preferredSlot && (
                      <p className="mt-1 text-xs text-red-500">{errors.preferredSlot}</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      {bookingType === 'session' ? 'Môn học' : 'Chủ đề cần tư vấn'} <span className="text-red-500">*</span>
                    </label>
                    {bookingType === 'session' && mentorSubjects.length > 0 ? (
                      <select
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          errors.topic ? 'border-red-300' : 'border-gray-200'
                        }`}
                      >
                        <option value="">Chọn môn học</option>
                        {mentorSubjects.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        rows={3}
                        placeholder={
                          bookingType === 'session'
                            ? mentorSubjects.length === 0
                              ? 'Mô tả chủ đề cần học...'
                              : 'Hoặc thêm mô tả chi tiết...'
                            : 'VD: Định hướng nghề nghiệp, ôn thi học bổng...'
                        }
                        className={`w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500 ${
                          errors.topic ? 'border-red-300' : 'border-gray-200'
                        }`}
                      />
                    )}
                    {errors.topic && (
                      <p className="mt-1 text-xs text-red-500">{errors.topic}</p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-700">
                      Ghi chú thêm
                    </label>
                    <input
                      type="text"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      placeholder="Tùy chọn"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Calendar size={18} />
                        Xác nhận & Thanh toán
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Thanh toán qua PayOS. Hủy trước 24h được hoàn tiền.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Hủy
                  </button>
                </form>
              ) : (
                <div className="p-6 space-y-3">
                  <button
                    onClick={() => openBookingForm('session')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
                  >
                    <GraduationCap size={18} />
                    Đăng ký học cùng
                  </button>
                  <button
                    onClick={() => openBookingForm('consultation')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-700 py-3 font-semibold text-slate-700 transition-all hover:bg-slate-50"
                  >
                    <MessageSquare size={18} />
                    Đặt lịch tư vấn
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    Đăng nhập để đặt lịch. Thanh toán qua PayOS.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
