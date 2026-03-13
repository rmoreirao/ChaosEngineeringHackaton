'use client';

import ProductCard from './ProductCard';
import { useCart } from '@/components/cart/CartProvider';

interface Product {
  id: string;
  name: string;
  price: number | { toNumber?: () => number; toString: () => string };
  imageUrl: string | null;
  slug: string;
  category?: { slug: string };
}

function toNum(price: Product['price']): number {
  if (typeof price === 'number') return price;
  if (typeof price.toNumber === 'function') return price.toNumber();
  return Number(price.toString());
}

export default function ProductGrid({ products }: { products: Product[] }) {
  const { addItem } = useCart();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={toNum(product.price)}
          imageUrl={product.imageUrl}
          slug={product.slug}
          categorySlug={product.category?.slug}
          onAddToCart={() =>
            addItem({
              id: product.id,
              name: product.name,
              price: toNum(product.price),
              imageUrl: product.imageUrl,
              slug: product.slug,
              quantity: 1,
            })
          }
        />
      ))}
    </div>
  );
}
