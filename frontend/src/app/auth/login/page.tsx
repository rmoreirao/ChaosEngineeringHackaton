'use client';

import { Suspense } from 'react';
import LoginFormContent from './LoginFormContent';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto px-4 py-16">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
