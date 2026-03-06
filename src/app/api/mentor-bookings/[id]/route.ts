// GET /api/mentor-bookings/[id] - Get single booking
// PATCH /api/mentor-bookings/[id] - Update status (Admin or owner)
// DELETE /api/mentor-bookings/[id] - Cancel booking

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, COLLECTIONS } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/utils';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { ApiResponse, MentorBooking, MentorBookingStatus } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function serializeBooking(data: Record<string, unknown>, id: string) {
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
    id,
    createdAt: toStr(data.createdAt),
    updatedAt: data.updatedAt ? toStr(data.updatedAt) : undefined,
    scheduledAt: toStr(data.scheduledAt),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const doc = await adminDb.collection(COLLECTIONS.mentorBookings).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không tìm thấy đơn đặt lịch', statusCode: 404 },
        { status: 404 }
      );
    }
    const data = doc.data() as Record<string, unknown>;
    const booking = serializeBooking(data, doc.id);
    return NextResponse.json<ApiResponse<typeof booking>>({
      data: booking,
      message: 'OK',
      statusCode: 200,
    });
  } catch (error) {
    console.error('GET /api/mentor-bookings/[id] error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const docRef = adminDb.collection(COLLECTIONS.mentorBookings).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không tìm thấy đơn đặt lịch', statusCode: 404 },
        { status: 404 }
      );
    }

    const booking = doc.data() as { userId: string; mentorId: string };
    const isAdmin = payload.role === 'Admin';
    const isOwner = booking.userId === payload.userId || booking.mentorId === payload.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không có quyền cập nhật', statusCode: 403 },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (status && ['pending', 'paid', 'completed', 'cancelled'].includes(status)) {
      await docRef.update({
        status: status as MentorBookingStatus,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const updated = await docRef.get();
    const data = updated.data() as Record<string, unknown>;
    const result = serializeBooking(data, id);
    return NextResponse.json<ApiResponse<typeof result>>({
      data: result,
      message: 'Cập nhật thành công',
      statusCode: 200,
    });
  } catch (error) {
    console.error('PATCH /api/mentor-bookings/[id] error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;
    const docRef = adminDb.collection(COLLECTIONS.mentorBookings).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không tìm thấy đơn đặt lịch', statusCode: 404 },
        { status: 404 }
      );
    }

    const booking = doc.data() as { userId: string; mentorId: string; status: string };
    const isAdmin = payload.role === 'Admin';
    const isOwner = booking.userId === payload.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không có quyền hủy', statusCode: 403 },
        { status: 403 }
      );
    }

    await docRef.update({
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: { id }, message: 'Đã hủy đơn đặt lịch', statusCode: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/mentor-bookings/[id] error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}
