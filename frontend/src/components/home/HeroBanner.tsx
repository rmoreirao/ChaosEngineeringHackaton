import Image from 'next/image';
import Link from 'next/link';

export default function HeroBanner() {
  return (
    <div className="relative h-64 md:h-80 lg:h-96 bg-gradient-to-r from-secondary to-secondary-light rounded-2xl overflow-hidden mx-4 mt-4">
      <Image
        src="/images/hero-banner.png"
        alt="Dutch specialty products"
        fill
        className="object-cover opacity-60"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 flex items-center">
        <div className="px-8 md:px-12 max-w-lg">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Welkom bij
            <span className="text-primary"> Oranje Markt</span>
          </h1>
          <p className="text-gray-200 text-sm md:text-base mb-6">
            Discover authentic Dutch specialty products delivered to your door.
          </p>
          <Link
            href="/categories/kaas-zuivel"
            className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </div>
  );
}
