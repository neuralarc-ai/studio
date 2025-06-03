
'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PinInput } from '@/components/common/pin-input';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/auth-context';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function PinVerificationModal({ isOpen, onClose, onVerified }: PinVerificationModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { verifyPin, user } = useAuth();

  const handleSubmit = useCallback(async (currentPin: string) => {
    if (currentPin.length !== 4) {
      setError('PIN must be 4 digits.');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    const success = await verifyPin(currentPin); 

    setIsLoading(false);
    if (success) {
      onVerified();
      onClose();
      setPin(''); 
    } else {
      setError('Invalid PIN. Verification failed.');
      setPin(''); 
    }
  }, [verifyPin, onVerified, onClose]);

  const handlePinComplete = useCallback((completedPin: string) => {
    setPin(completedPin);
    setError(null);
    if (completedPin.length === 4 && !isLoading) {
      handleSubmit(completedPin);
    }
  }, [handleSubmit, isLoading]);
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onClose();
      setPin('');
      setError(null);
      setIsLoading(false);
    }
  };

  // Added for button click submission if user prefers
  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length === 4) {
        handleSubmit(pin);
    } else {
        setError('PIN must be 4 digits.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-foreground flex items-center">
            <ShieldAlert className="mr-2 h-6 w-6 text-primary" />
            Verify Access
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {user && user.isAdmin 
              ? "Administrator, for security, please re-enter your 4-digit PIN to access the API Repository."
              : "For security, please re-enter your 4-digit PIN to access the API Repository."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <div className="py-4 space-y-4">
            <div className="flex justify-center">
              <PinInput onComplete={handlePinComplete} disabled={isLoading} />
            </div>
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading || pin.length !== 4}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify PIN
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
