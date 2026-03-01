// POST /api/mentor - Submit mentor request (requires login)

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, COLLECTIONS } from '@/lib/firebase/admin';
import { generateId } from '@/lib/firebase/firestore';
import { verifyToken, isValidEmail } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import type { ApiResponse } from '@/types';
import { UserRole } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Auth required - user must be logged in to register as mentor
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng đăng nhập để đăng ký làm Mentor', statusCode: 401 },
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

    const body = await request.json();
    const { fullName, email, subject, goal } = body;

    // Validate
    if (!fullName?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng nhập họ tên', statusCode: 400 },
        { status: 400 }
      );
    }
    if (!email?.trim() || !isValidEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Email không hợp lệ', statusCode: 400 },
        { status: 400 }
      );
    }
    if (!subject?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng nhập môn học quan tâm', statusCode: 400 },
        { status: 400 }
      );
    }

    // Check if user is already Mentor
    const userDoc = await adminDb.collection(COLLECTIONS.users).doc(payload.userId).get();
    if (userDoc.exists) {
      const user = userDoc.data();
      if (user?.role === UserRole.Mentor) {
        return NextResponse.json<ApiResponse<null>>(
          { data: null, message: 'Bạn đã là Mentor. Vui lòng truy cập Dashboard Mentor.', statusCode: 400 },
          { status: 400 }
        );
      }
    }

    // Check if user already has pending mentor request
    const existingSnapshot = await adminDb
      .collection(COLLECTIONS.mentorRequests)
      .where('userId', '==', payload.userId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Bạn đã có đơn đăng ký Mentor đang chờ duyệt', statusCode: 400 },
        { status: 400 }
      );
    }

    const now = FieldValue.serverTimestamp();
    const id = generateId();

    await adminDb.collection(COLLECTIONS.mentorRequests).doc(id).set({
      id,
      userId: payload.userId,
      fullName: fullName.trim(),
      email: email.trim(),
      subject: subject.trim(),
      goal: goal?.trim() || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json<ApiResponse<{ id: string }>>(
      { data: { id }, message: 'Gửi yêu cầu mentor thành công! Chúng tôi sẽ liên hệ bạn sớm.', statusCode: 201 },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/mentor error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}
