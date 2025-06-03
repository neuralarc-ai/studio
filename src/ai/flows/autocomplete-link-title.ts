'use server';

/**
 * @fileOverview Autocompletes the title of a link using AI.
 *
 * - autocompleteLinkTitle - A function that handles the autocompletion of a link title.
 * - AutocompleteLinkTitleInput - The input type for the autocompleteLinkTitle function.
 * - AutocompleteLinkTitleOutput - The return type for the autocompleteLinkTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutocompleteLinkTitleInputSchema = z.object({
  link: z.string().url().describe('The link to autocomplete the title for.'),
});
export type AutocompleteLinkTitleInput = z.infer<typeof AutocompleteLinkTitleInputSchema>;

const AutocompleteLinkTitleOutputSchema = z.object({
  title: z.string().describe('The autocompleted title for the link.'),
});
export type AutocompleteLinkTitleOutput = z.infer<typeof AutocompleteLinkTitleOutputSchema>;

export async function autocompleteLinkTitle(input: AutocompleteLinkTitleInput): Promise<AutocompleteLinkTitleOutput> {
  return autocompleteLinkTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'autocompleteLinkTitlePrompt',
  input: {schema: AutocompleteLinkTitleInputSchema},
  output: {schema: AutocompleteLinkTitleOutputSchema},
  prompt: `You are a title autocompletion service. Given a link, you will return a concise and descriptive title for the link.

Link: {{{link}}}

Title: `,
});

const autocompleteLinkTitleFlow = ai.defineFlow(
  {
    name: 'autocompleteLinkTitleFlow',
    inputSchema: AutocompleteLinkTitleInputSchema,
    outputSchema: AutocompleteLinkTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
