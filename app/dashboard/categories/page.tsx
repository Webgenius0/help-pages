import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { CategoryManagement } from './CategoryManagement';
import prisma from '@/lib/prisma';

export default async function CategoriesPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Only admins and editors can manage categories
  if (user.role === 'viewer') {
    redirect('/dashboard');
  }

  const navHeaders = await prisma.navHeader.findMany({
    where: { userId: user.id },
    include: {
      parent: true,
      children: true,
    },
    orderBy: { position: 'asc' },
  });

  return <CategoryManagement user={user} initialHeaders={navHeaders} />;
}

