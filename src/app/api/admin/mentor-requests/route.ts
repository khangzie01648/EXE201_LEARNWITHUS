// GET /api/admin/mentor-requests - List mentor requests (Admin only)

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, COLLECTIONS } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import type { ApiResponse } from '@/types';

export interface MentorRequestDto {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  subject: string;
  goal: string;
  status: string;
  createdAt: Date;
}

export async function GET(request: NextRequest) {
  try {
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
        { data: null, message: 'Chỉ Admin mới có quyền xem yêu cầu Mentor', statusCode: 403 },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const snapshot = await adminDb
      .collection(COLLECTIONS.mentorRequests)
      .orderBy('createdAt', 'desc')
      .get();

    let docs = snapshot.docs;
    if (statusFilter) {
      docs = docs.filter((d) => (d.data() as { status: string }).status === statusFilter);
    }

    const requests: MentorRequestDto[] = docs.map((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt instanceof Date
        ? d.createdAt
        : (d.createdAt as FirebaseFirestore.Timestamp)?.toDate?.() ?? new Date();
      return {
        id: d.id,
        userId: d.userId,
        fullName: d.fullName,
        email: d.email,
        subject: d.subject,
        goal: d.goal || '',
        status: d.status,
        createdAt,
      };
    });

    return NextResponse.json<ApiResponse<MentorRequestDto[]>>(
      { data: requests, message: 'Lấy danh sách yêu cầu Mentor thành công', statusCode: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/admin/mentor-requests error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}
