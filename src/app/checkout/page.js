'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const env = searchParams.get('env') || 'production';
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session ID');
      return;
    }

    // Load Cashfree SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      try {
        const cashfree = window.Cashfree({
          mode: env === 'prod' || env === 'production' ? 'production' : 'sandbox',
        });
        
        cashfree.checkout({
          paymentSessionId: sessionId,
          redirectTarget: '_self',
        });
      } catch (err) {
        console.error('Cashfree SDK Error:', err);
        setError('Failed to initialize payment');
      }
    };
    script.onerror = () => {
      setError('Failed to load payment SDK');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [sessionId]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Error</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <h1 className="text-xl font-medium text-gray-800">Initializing Secure Payment...</h1>
      <p className="text-gray-500 mt-2">Please do not refresh or close this page.</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
