'use client';

import { useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import Button from '@/components/ui/Button';

interface Props {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    slug: string;
  };
}

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ ...product, quantity: 1 });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center border border-gray-300 rounded-full">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 rounded-l-full cursor-pointer"
        >
          −
        </button>
        <span className="w-10 text-center font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-100 rounded-r-full cursor-pointer"
        >
          +
        </button>
      </div>
      <Button onClick={handleAdd} size="lg">
        {added ? '✓ Added!' : 'Add to Cart'}
      </Button>
    </div>
  );
}
