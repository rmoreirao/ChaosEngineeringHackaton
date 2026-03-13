import { apiSearchProducts } from '@/lib/api-client';
import ProductGrid from '@/components/products/ProductGrid';
import Link from 'next/link';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q || '';
  let products: any[] = [];
  try {
    products = query ? await apiSearchProducts(query) : [];
  } catch {
    products = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">›</span>
        <span className="text-secondary font-medium">Search</span>
      </nav>

      <h1 className="text-3xl font-bold text-secondary mb-2">
        Search Results
      </h1>
      <p className="text-gray-600 mb-6">
        {products.length} results for &quot;{query}&quot;
      </p>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-500">No products found matching your search.</p>
        </div>
      )}
    </div>
  );
}
