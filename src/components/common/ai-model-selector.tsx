'use client';

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIModel } from '@/types';
import { BrainCircuit } from 'lucide-react';

export function AiModelSelector() {
  const [selectedModel, setSelectedModel] = useState<AIModel>("OpenAI");

  // In a real app, this would likely interact with a context or state management
  // to change the AI model used for Genkit flows.
  const handleModelChange = (value: string) => {
    setSelectedModel(value as AIModel);
    // console.log("AI Model selected:", value);
    // Potentially call a function to update global AI configuration
  };

  return (
    <div className="flex items-center space-x-2">
      <BrainCircuit className="h-5 w-5 text-muted-foreground" />
      <Select value={selectedModel} onValueChange={handleModelChange}>
        <SelectTrigger className="w-[150px] h-9 text-xs bg-card border-border focus:ring-primary">
          <SelectValue placeholder="Select AI Model" />
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground border-border">
          <SelectItem value="OpenAI" className="text-xs">OpenAI</SelectItem>
          <SelectItem value="Gemini" className="text-xs">Gemini</SelectItem>
          <SelectItem value="DeepSeek" className="text-xs">DeepSeek</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
