import { apiGetCategoryBySlug } from '@/lib/api-client';
import ProductGrid from '@/components/products/ProductGrid';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await apiGetCategoryBySlug(slug).catch(() => null);

  if (!category) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">›</span>
        <span className="text-secondary font-medium">{category.name}</span>
      </nav>

      <h1 className="text-3xl font-bold text-secondary mb-2">{category.name}</h1>
      {category.description && (
        <p className="text-gray-600 mb-6">{category.description}</p>
      )}

      <ProductGrid products={category.products} />
    </div>
  );
}
