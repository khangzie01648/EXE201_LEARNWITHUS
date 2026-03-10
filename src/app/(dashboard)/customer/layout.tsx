'use client';

import { Sidebar } from '@/components/dashboard';
import { Calendar, CalendarDays, FileText, User, History, GraduationCap } from 'lucide-react';

const customerSidebarItems = [
  {
    icon: CalendarDays,
    heading: 'Thời khóa biểu',
    href: '/schedule',
  },
  {
    icon: Calendar,
    heading: 'Lịch xét nghiệm',
    href: '/customer/bookings',
  },
  {
    icon: GraduationCap,
    heading: 'Lịch hẹn Mentor',
    href: '/customer/mentor-bookings',
  },
  {
    icon: FileText,
    heading: 'Kết quả xét nghiệm',
    href: '/customer/results',
  },
  {
    icon: History,
    heading: 'Lịch sử thanh toán',
    href: '/customer/payments',
  },
  {
    icon: User,
    heading: 'Thông tin cá nhân',
    href: '/customer/profile',
  },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar items={customerSidebarItems} title="Khách hàng" />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

