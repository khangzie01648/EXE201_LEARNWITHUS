// POST /api/auth/profile/avatar - Upload avatar to Firebase Storage and update user

import { NextRequest, NextResponse } from 'next/server';
import { adminStorage, COLLECTIONS, adminDb } from '@/lib/firebase/admin';
import { verifyToken } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import type { ApiResponse } from '@/types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng đăng nhập', statusCode: 401 },
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

    const userId = payload.userId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Vui lòng chọn ảnh để tải lên', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP', statusCode: 400 },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, message: 'Ảnh không được vượt quá 2MB', statusCode: 400 },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `avatars/${userId}/${Date.now()}.${ext}`;

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          userId,
          originalName: file.name,
        },
      },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    await adminDb.collection(COLLECTIONS.users).doc(userId).update({
      avatarUrl: publicUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json<ApiResponse<{ avatarUrl: string }>>(
      { data: { avatarUrl: publicUrl }, message: 'Cập nhật ảnh đại diện thành công', statusCode: 200 },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/auth/profile/avatar error:', error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, message: 'Lỗi máy chủ', statusCode: 500 },
      { status: 500 }
    );
  }
}
