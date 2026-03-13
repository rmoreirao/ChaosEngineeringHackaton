import { apiGetProductBySlug, apiGetRelatedProducts } from '@/lib/api-client';
import ProductGrid from '@/components/products/ProductGrid';
import AddToCartButton from './AddToCartButton';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await apiGetProductBySlug(id).catch(() => null);

  if (!product) notFound();

  const related = await apiGetRelatedProducts(product.slug);
  const price = typeof product.price === 'number' ? product.price : Number(product.price);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">›</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:text-primary">
          {product.category.name}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-secondary font-medium">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">{product.name}</h1>
          <p className="text-gray-600 mb-4">{product.description}</p>
          <p className="text-3xl font-bold text-primary mb-6">€{price.toFixed(2)}</p>

          <AddToCartButton product={{
            id: product.id,
            name: product.name,
            price,
            imageUrl: product.imageUrl,
            slug: product.slug,
          }} />

          <div className="mt-6 p-4 bg-surface rounded-lg">
            <p className="text-sm text-gray-600">
              ✓ In stock &nbsp; • &nbsp; 🚚 Free delivery over €25
            </p>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-secondary mb-6">Related Products</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
