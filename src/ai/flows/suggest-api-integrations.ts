'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting API integration guides and code snippets based on the API key.
 *
 * - suggestApiIntegrations - A function that takes an API key name and value and suggests integration guides.
 * - SuggestApiIntegrationsInput - The input type for the suggestApiIntegrations function.
 * - SuggestApiIntegrationsOutput - The return type for the suggestApiIntegrations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestApiIntegrationsInputSchema = z.object({
  keyName: z.string().describe('The name of the API key.'),
  keyValue: z.string().describe('The value of the API key.'),
});
export type SuggestApiIntegrationsInput = z.infer<typeof SuggestApiIntegrationsInputSchema>;

const SuggestApiIntegrationsOutputSchema = z.object({
  apiType: z.string().describe('The type of API detected (e.g., Stripe, OpenAI).'),
  integrationGuide: z.string().describe('A guide or code snippet for integrating with the API.'),
});
export type SuggestApiIntegrationsOutput = z.infer<typeof SuggestApiIntegrationsOutputSchema>;

export async function suggestApiIntegrations(input: SuggestApiIntegrationsInput): Promise<SuggestApiIntegrationsOutput> {
  return suggestApiIntegrationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestApiIntegrationsPrompt',
  input: {schema: SuggestApiIntegrationsInputSchema},
  output: {schema: SuggestApiIntegrationsOutputSchema},
  prompt: `You are an expert in API integrations. Given the name and value of an API key, you will determine the type of API and provide a relevant integration guide or code snippet.

API Key Name: {{{keyName}}}
API Key Value: {{{keyValue}}}

Based on this information, suggest the API type and an integration guide in the output schema format.`,
});

const suggestApiIntegrationsFlow = ai.defineFlow(
  {
    name: 'suggestApiIntegrationsFlow',
    inputSchema: SuggestApiIntegrationsInputSchema,
    outputSchema: SuggestApiIntegrationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
