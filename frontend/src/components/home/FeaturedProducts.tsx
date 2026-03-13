import { apiGetFeaturedProducts } from '@/lib/api-client';
import ProductGrid from '@/components/products/ProductGrid';

export default async function FeaturedProducts() {
  let products: any[] = [];
  try {
    products = await apiGetFeaturedProducts(8);
  } catch {
    products = [];
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-secondary mb-6">Featured Products</h2>
      <ProductGrid products={products} />
    </section>
  );
}
