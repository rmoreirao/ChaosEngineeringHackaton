'use client';

import { useAuth } from '@/lib/auth-context';
import { apiGetOrderHistory } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function OrdersPage() {
  const { user, token, status } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/orders');
      return;
    }
    if (token) {
      apiGetOrderHistory(token)
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
    }
  }, [status, token, router]);

  if (status === 'loading' || loading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-secondary mb-8">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-secondary mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-6">Start shopping to see your orders here!</p>
          <Link href="/" className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-full transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('en-NL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    {order.status}
                  </span>
                  <p className="text-lg font-bold text-primary mt-1">
                    €{Number(order.total).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {item.product.imageUrl ? (
                        <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="48px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">🛍️</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary">{item.product.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} × €{Number(item.price).toFixed(2)}</p>
                    </div>
                    <p className="text-sm font-medium">€{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t mt-4 pt-3">
                <p className="text-sm text-gray-500">📍 {order.address}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
