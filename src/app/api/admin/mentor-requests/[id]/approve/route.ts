// PATCH /api/admin/mentor-requests/[id]/approve - Approve mentor request (Admin only)
// Sets user.role = Mentor

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, COLLECTIONS } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import type { ApiResponse } from '@/types';
import { UserRole } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Unauthorized', statusCode: 401 },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Token không hợp lệ', statusCode: 401 },
        { status: 401 }
      );
    }

    if (payload.role !== 'Admin') {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Chỉ Admin mới có quyền duyệt yêu cầu Mentor', statusCode: 403 },
        { status: 403 }
      );
    }

    const requestDoc = await adminDb
      .collection(COLLECTIONS.mentorRequests)
      .doc(id)
      .get();

    if (!requestDoc.exists) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Không tìm thấy yêu cầu Mentor', statusCode: 404 },
        { status: 404 }
      );
    }

    const mentorRequest = requestDoc.data() as { userId?: string; email: string; status: string };
    if (mentorRequest.status !== 'pending') {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Yêu cầu này đã được xử lý', statusCode: 400 },
        { status: 400 }
      );
    }

    let userId: string | null = mentorRequest.userId ?? null;

    // If no userId (legacy request), find user by email
    if (!userId) {
      const usersSnapshot = await adminDb
        .collection(COLLECTIONS.users)
        .where('email', '==', mentorRequest.email.toLowerCase())
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return NextResponse.json<ApiResponse<null>>(
          {
            data: null,
            message: 'Không tìm thấy tài khoản với email này. Người dùng cần đăng ký trước khi được duyệt làm Mentor.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }
      userId = usersSnapshot.docs[0].id;
    }

    const now = FieldValue.serverTimestamp();

    // Update user role to Mentor
    await adminDb.collection(COLLECTIONS.users).doc(userId).update({
      role: UserRole.Mentor,
      updatedAt: now,
    });

    // Update mentor request status
    await adminDb.collection(COLLECTIONS.mentorRequests).doc(id).update({
      status: 'approved',
      approvedBy: payload.userId,
      approvedAt: now,
      updatedAt: now,
    });

    return NextResponse.json<ApiResponse<{ userId: string }>>(
      { data: { userId }, message: 'Đã duyệt yêu cầu Mentor thành công', statusCode: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error('PATCH /api/admin/mentor-requests/[id]/approve error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}
