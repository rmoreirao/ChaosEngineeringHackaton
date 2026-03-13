'use client';

import { useCart } from '@/components/cart/CartProvider';
import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function CartPage() {
  const { items, totalPrice, updateQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-secondary mb-2">Your cart is empty</h1>
        <p className="text-gray-500 mb-6">Start adding some delicious Dutch products!</p>
        <Link href="/">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-secondary mb-8">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
              <div className="relative w-20 h-20 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">🧀</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.slug}`} className="font-semibold text-secondary hover:text-primary transition-colors">
                  {item.name}
                </Link>
                <p className="text-primary font-bold mt-1">€{item.price.toFixed(2)}</p>
              </div>

              <div className="flex items-center border border-gray-300 rounded-full">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-l-full cursor-pointer">−</button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-r-full cursor-pointer">+</button>
              </div>

              <p className="font-bold text-secondary w-20 text-right">
                €{(item.price * item.quantity).toFixed(2)}
              </p>

              <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Remove">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm h-fit sticky top-24">
          <h2 className="text-xl font-bold text-secondary mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">€{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery</span>
              <span className="font-medium text-green-600">Free</span>
            </div>
            <hr className="my-3" />
            <div className="flex justify-between text-lg">
              <span className="font-bold text-secondary">Total</span>
              <span className="font-bold text-primary">€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
          <Link href="/checkout" className="block mt-6">
            <Button className="w-full" size="lg">Proceed to Checkout</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
