// GET /api/mentor-bookings - List mentor bookings (Admin only, with filters)
// POST /api/mentor-bookings - Create mentor booking (user books mentor)

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, COLLECTIONS } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/utils';
import { generateId } from '@/lib/firebase/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { ApiResponse, MentorBooking, MentorBookingType } from '@/types';

function serializeBooking(doc: FirebaseFirestore.DocumentSnapshot): MentorBooking & { id: string; createdAt: string; scheduledAt: string } {
  const data = doc.data() as Record<string, unknown>;
  const createdAt = data.createdAt;
  const scheduledAt = data.scheduledAt;
  const toStr = (v: unknown): string => {
    if (v instanceof Timestamp) return v.toDate().toISOString();
    if (v && typeof v === 'object' && '_seconds' in (v as object)) {
      const t = v as { _seconds: number; _nanoseconds: number };
      return new Date(t._seconds * 1000 + t._nanoseconds / 1e6).toISOString();
    }
    return typeof v === 'string' ? v : '';
  };
  return {
    ...data,
    id: (data.id as string) ?? doc.id,
    createdAt: toStr(createdAt),
    updatedAt: data.updatedAt ? toStr(data.updatedAt) : undefined,
    scheduledAt: toStr(scheduledAt),
  } as MentorBooking & { id: string; createdAt: string; scheduledAt: string };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng đăng nhập', statusCode: 401 },
        { status: 401 }
      );
    }
    const payload = verifyToken(authHeader.split(' ')[1]);
    if (!payload) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Token không hợp lệ', statusCode: 401 },
        { status: 401 }
      );
    }
    if (payload.role !== 'Admin') {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không có quyền truy cập', statusCode: 403 },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type') as MentorBookingType | null;
    const mentorId = searchParams.get('mentorId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = adminDb
      .collection(COLLECTIONS.mentorBookings)
      .orderBy('scheduledAt', 'desc')
      .limit(200);

    const snapshot = await query.get();
    let bookings = snapshot.docs.map(serializeBooking);

    if (typeFilter && (typeFilter === 'session' || typeFilter === 'consultation')) {
      bookings = bookings.filter((b) => b.type === typeFilter);
    }
    if (mentorId) {
      bookings = bookings.filter((b) => b.mentorId === mentorId);
    }
    if (from) {
      const fromDate = new Date(from);
      bookings = bookings.filter((b) => new Date(b.scheduledAt) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      bookings = bookings.filter((b) => new Date(b.scheduledAt) <= toDate);
    }

    const totalRevenue = bookings
      .filter((b) => b.status === 'paid' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    const sessionCount = bookings.filter((b) => b.type === 'session').length;
    const consultationCount = bookings.filter((b) => b.type === 'consultation').length;

    const mentorIds = [...new Set(bookings.map((b) => b.mentorId))];
    const mentorMap: Record<string, string> = {};
    if (mentorIds.length > 0) {
      const refs = mentorIds.map((id) => adminDb.collection(COLLECTIONS.users).doc(id));
      const userDocs = await adminDb.getAll(...refs);
      userDocs.forEach((doc) => {
        const u = doc.data() as { fullName?: string } | undefined;
        if (u?.fullName) mentorMap[doc.id] = u.fullName;
      });
    }

    const enriched = bookings.map((b) => ({
      ...b,
      mentorName: mentorMap[b.mentorId] || b.mentorName || '—',
    }));

    return NextResponse.json<ApiResponse<{
      bookings: typeof enriched;
      summary: { totalRevenue: number; sessionCount: number; consultationCount: number };
    }>>({
      data: {
        bookings: enriched,
        summary: { totalRevenue, sessionCount, consultationCount },
      },
      message: 'Lấy danh sách đặt lịch thành công',
      statusCode: 200,
    });
  } catch (error) {
    console.error('GET /api/mentor-bookings error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng đăng nhập', statusCode: 401 },
        { status: 401 }
      );
    }
    const payload = verifyToken(authHeader.split(' ')[1]);
    if (!payload) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Token không hợp lệ', statusCode: 401 },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mentorId, type, amount, scheduledAt, topic } = body;

    if (!mentorId?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng chọn mentor', statusCode: 400 },
        { status: 400 }
      );
    }
    if (!type || !['session', 'consultation'].includes(type)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Loại đặt lịch không hợp lệ', statusCode: 400 },
        { status: 400 }
      );
    }
    const amt = typeof amount === 'number' ? amount : parseInt(String(amount || 0), 10);
    if (isNaN(amt) || amt < 0) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Số tiền không hợp lệ', statusCode: 400 },
        { status: 400 }
      );
    }
    if (!scheduledAt) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng chọn ngày giờ', statusCode: 400 },
        { status: 400 }
      );
    }
    if (!topic?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng nhập chủ đề', statusCode: 400 },
        { status: 400 }
      );
    }

    const mentorDoc = await adminDb.collection(COLLECTIONS.users).doc(mentorId).get();
    if (!mentorDoc.exists) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Mentor không tồn tại', statusCode: 404 },
        { status: 404 }
      );
    }

    const id = generateId();
    const now = FieldValue.serverTimestamp();
    const scheduled = scheduledAt instanceof Date ? scheduledAt : new Date(scheduledAt);

    await adminDb.collection(COLLECTIONS.mentorBookings).doc(id).set({
      id,
      userId: payload.userId,
      mentorId: mentorId.trim(),
      type,
      amount: amt,
      status: 'pending',
      scheduledAt: Timestamp.fromDate(scheduled),
      topic: topic.trim(),
      userName: payload.userName,
      mentorName: (mentorDoc.data() as { fullName?: string })?.fullName,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: { id }, message: 'Đặt lịch thành công. Vui lòng thanh toán để xác nhận.', statusCode: 201 },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/mentor-bookings error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}
