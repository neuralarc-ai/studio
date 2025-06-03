
'use client';

import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  inputClassName?: string;
}

export function PinInput({ length = 4, onComplete, disabled, inputClassName }: PinInputProps) {
  const [pin, setPin] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Take only the last digit if multiple are pasted
    setPin(newPin);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(digit => digit !== '')) {
      onComplete(newPin.join(''));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, ''); // Remove non-digits
    if (pastedData.length === length) {
      const newPin = pastedData.split('');
      setPin(newPin);
      onComplete(newPin.join(''));
      inputRefs.current[length -1]?.focus();
    }
  };

  return (
    <div className="flex space-x-2" onPaste={handlePaste}>
      {pin.map((digit, index) => (
        <Input
          key={index}
          ref={el => (inputRefs.current[index] = el)}
          type="password" // Changed from text to password
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          disabled={disabled}
          className={cn(
            "w-12 h-14 md:w-16 md:h-16 text-center text-2xl md:text-3xl font-bold font-code rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary",
            "bg-card border-input-border text-foreground placeholder-muted-foreground",
            inputClassName
          )}
          aria-label={`PIN digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
