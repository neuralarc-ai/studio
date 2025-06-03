
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PinInput } from '@/components/common/pin-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

const AnimatedBackgroundLines = () => {
  const numLines = 10; // Number of lines for variety
  return (
    <div className="login-bg-animation-container" aria-hidden="true">
      {Array.from({ length: numLines }).map((_, i) => {
        const isVertical = i % 2 === 0;
        const style: React.CSSProperties = isVertical
          ? {
              left: `${(i / numLines) * 100}%`,
              animationDelay: `${(i * 2)}s`,
            }
          : {
              top: `${(i / numLines) * 100}%`,
              animationDelay: `${(i * 2 + 1)}s`, // Stagger horizontal lines
            };
        return (
          <div
            key={i}
            className={`animated-bg-line ${isVertical ? 'vertical' : 'horizontal'}`}
            style={style}
          />
        );
      })}
    </div>
  );
};


export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = useCallback(async (currentPin: string) => {
    if (currentPin.length !== 4) {
      setError('PIN must be 4 digits.');
      return;
    }
    if (isLoading) return; // Prevent multiple submissions

    setIsLoading(true);
    setError(null);
    const success = await login(currentPin);
    setIsLoading(false);
    if (!success) {
      setError('Invalid PIN. Please try again.');
      setPin(''); 
    }
    // Successful login is handled by AuthProvider's redirect
  }, [login, router, isLoading]);


  const handlePinComplete = useCallback((completedPin: string) => {
    setPin(completedPin);
    setError(null); 
    if (completedPin.length === 4) {
      handleSubmit(completedPin);
    }
  }, [handleSubmit]);

  // Allow form submission via Enter key on the button or if user manually clicks
  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length === 4) {
        handleSubmit(pin);
    } else {
        setError('PIN must be 4 digits.');
    }
  };


  return (
    <div className="relative flex items-center justify-center min-h-screen bg-background p-4 overflow-hidden">
      <AnimatedBackgroundLines />
      {/* The Card component will automatically get the .card-grain-overlay from its definition */}
      <Card className="w-full max-w-md shadow-2xl rounded-lg z-10"> 
        <CardHeader className="text-center">
           <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-primary flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-box-select"><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/></svg>
           </div>
          <CardTitle className="text-3xl font-headline text-foreground">WhiteSpace</CardTitle>
          <CardDescription className="text-muted-foreground pt-1">
            Enter your 4-digit PIN to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="flex justify-center">
              <PinInput onComplete={handlePinComplete} disabled={isLoading} />
            </div>
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive">
                <AlertTitle className="font-semibold">Login Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full text-base py-3 h-auto" disabled={isLoading || pin.length !== 4}>
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
