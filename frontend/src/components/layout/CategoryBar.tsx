import Link from 'next/link';
import { apiGetCategories } from '@/lib/api-client';

export const dynamic = 'force-dynamic';

export default async function CategoryBar() {
  let categories: any[] = [];
  try {
    categories = await apiGetCategories();
  } catch {
    categories = [];
  }

  return (
    <div className="bg-surface border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="px-4 py-1.5 text-sm font-medium text-secondary hover:text-primary hover:bg-primary-light rounded-full whitespace-nowrap transition-all"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
