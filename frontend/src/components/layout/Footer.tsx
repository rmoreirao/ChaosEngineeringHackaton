import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-secondary text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">🧡 Oranje Markt</h3>
            <p className="text-gray-300 text-sm">
              Your online destination for authentic Dutch specialty products.
              From Gouda to stroopwafels, from tulips to Delft Blue.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/categories/kaas-zuivel" className="hover:text-primary transition-colors">Kaas & Zuivel</Link></li>
              <li><Link href="/categories/snoep-gebak" className="hover:text-primary transition-colors">Snoep & Gebak</Link></li>
              <li><Link href="/categories/bloemen-planten" className="hover:text-primary transition-colors">Bloemen & Planten</Link></li>
              <li><Link href="/categories/delicatessen" className="hover:text-primary transition-colors">Delicatessen</Link></li>
              <li><Link href="/categories/ambachten-cadeaus" className="hover:text-primary transition-colors">Ambachten & Cadeaus</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/orders" className="hover:text-primary transition-colors">Order History</Link></li>
              <li><span className="text-gray-400">support@oranjemarkt.nl</span></li>
              <li><span className="text-gray-400">+31 20 123 4567</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm text-gray-400">
          © 2026 Oranje Markt. All rights reserved. Made with 🧡 in the Netherlands.
        </div>
      </div>
    </footer>
  );
}
