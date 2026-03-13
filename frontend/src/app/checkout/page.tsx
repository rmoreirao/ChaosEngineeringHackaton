'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { apiPlaceOrder } from '@/lib/api-client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';

export default function CheckoutPage() {
  const { user, token, status } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading...</div>;
  }

  if (!user || !token) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-secondary mb-4">Login Required</h1>
        <p className="text-gray-500 mb-6">You need to be logged in to checkout.</p>
        <Link href="/auth/login?callbackUrl=/checkout">
          <Button>Login to Continue</Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-secondary mb-4">Cart is Empty</h1>
        <Link href="/"><Button>Start Shopping</Button></Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await apiPlaceOrder(items, address, token);
      clearCart();
      router.push(`/orders?success=${result.orderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-secondary mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-secondary mb-4">Delivery Address</h2>
          <Input
            label="Full Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, City, Postal Code, Country"
            required
          />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-secondary mb-4">Payment</h2>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800 font-medium">💳 Mock Payment — Always Succeeds</p>
            <p className="text-green-600 text-sm mt-1">No real payment will be processed.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-secondary mb-4">Order Summary</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-medium">€{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <hr className="my-3" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">€{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Processing...' : `Place Order — €${totalPrice.toFixed(2)}`}
        </Button>
      </form>
    </div>
  );
}
