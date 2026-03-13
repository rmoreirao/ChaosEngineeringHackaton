import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/components/cart/CartProvider';
import Navbar from '@/components/layout/Navbar';
import CategoryBar from '@/components/layout/CategoryBar';
import Footer from '@/components/layout/Footer';
import WebVitalsReporter from '@/components/WebVitalsReporter';
import './globals.css';

export const metadata: Metadata = {
  title: 'Oranje Markt — Dutch Specialty Products',
  description: 'Your online destination for authentic Dutch specialty products. Cheese, stroopwafels, tulips, and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen flex flex-col">
        <AuthProvider>
          <CartProvider>
            <WebVitalsReporter />
            <Navbar />
            <CategoryBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
