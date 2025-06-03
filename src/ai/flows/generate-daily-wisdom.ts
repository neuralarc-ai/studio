
'use server';
/**
 * @fileOverview Generates a daily piece of wisdom or a thought-provoking statement.
 *
 * - generateDailyWisdom - A function that returns a piece of wisdom.
 * - GenerateDailyWisdomOutput - The return type for the generateDailyWisdom function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDailyWisdomOutputSchema = z.object({
  wisdom: z.string().describe('A concise, impactful piece of wisdom or a thought-provoking statement, suitable for daily inspiration. It could be about creativity, problem-solving, productivity, or general life insights.'),
});
export type GenerateDailyWisdomOutput = z.infer<typeof GenerateDailyWisdomOutputSchema>;

export async function generateDailyWisdom(): Promise<GenerateDailyWisdomOutput> {
  return generateDailyWisdomFlow();
}

const prompt = ai.definePrompt({
  name: 'generateDailyWisdomPrompt',
  output: {schema: GenerateDailyWisdomOutputSchema},
  prompt: `You are an oracle of concise and profound daily insights.
Generate a single, unique piece of wisdom or a thought-provoking statement.
It should be impactful and inspiring, suitable for a user to see once a day.
The statement could be about creativity, problem-solving, productivity, general life insights, or a gentle challenge.
Make it well-written and memorable. Do not include any preamble or extra formatting, just the statement itself for the 'wisdom' field.
Avoid clichés if possible. Aim for originality or a fresh perspective on a known truth.
The output should be a single string for the 'wisdom' field. Ensure it is profound and well-composed.
Do not use markdown or any special characters like asterisks or quotes unless they are part of the wisdom itself.
Keep it to one or two sentences at most.
`,
});

const generateDailyWisdomFlow = ai.defineFlow(
  {
    name: 'generateDailyWisdomFlow',
    outputSchema: GenerateDailyWisdomOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
