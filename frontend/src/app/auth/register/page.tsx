'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await register(name, email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-secondary text-center mb-8">Create Account</h1>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm space-y-4">
        <Input name="name" label="Full Name" required placeholder="Jan de Vries" />
        <Input name="email" label="Email" type="email" required placeholder="you@example.com" />
        <Input name="password" label="Password" type="password" required placeholder="Min. 6 characters" minLength={6} />

        {error && (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary hover:underline font-medium">
          Login
        </Link>
      </p>
    </div>
  );
}
