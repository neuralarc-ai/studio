// Recommend project resources based on project type.
'use server';

/**
 * @fileOverview Recommends tools, case studies, and reference links for a given project type.
 *
 * - recommendProjectResources - A function that handles the project resource recommendation process.
 * - RecommendProjectResourcesInput - The input type for the recommendProjectResources function.
 * - RecommendProjectResourcesOutput - The return type for the recommendProjectResources function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendProjectResourcesInputSchema = z.object({
  projectType: z
    .string()
    .describe('The type of the project (e.g., web app, mobile app, data analysis).'),
});
export type RecommendProjectResourcesInput = z.infer<typeof RecommendProjectResourcesInputSchema>;

const RecommendProjectResourcesOutputSchema = z.object({
  suggestedTools: z.array(z.string()).describe('A list of tools recommended for the project.'),
  caseStudies: z
    .array(z.string())
    .describe('A list of relevant case studies for the project, described as a title and description.'),
  referenceLinks: z
    .array(z.string())
    .describe('A list of reference links (URLs) relevant to the project.'),
  promptExamples: z.array(z.string()).describe('A list of prompt examples relevant to the project.'),
});
export type RecommendProjectResourcesOutput = z.infer<typeof RecommendProjectResourcesOutputSchema>;

export async function recommendProjectResources(
  input: RecommendProjectResourcesInput
): Promise<RecommendProjectResourcesOutput> {
  return recommendProjectResourcesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendProjectResourcesPrompt',
  input: {schema: RecommendProjectResourcesInputSchema},
  output: {schema: RecommendProjectResourcesOutputSchema},
  prompt: `You are an AI assistant helping users find resources for their projects.

  Based on the project type, recommend relevant tools, case studies, reference links, and prompt examples.

  Project Type: {{{projectType}}}

  Format your output as a JSON object with the following keys:
  - suggestedTools: A list of tools recommended for the project.
  - caseStudies: A list of relevant case studies for the project, described as a title and description.
  - referenceLinks: A list of reference links (URLs) relevant to the project.
  - promptExamples: A list of prompt examples relevant to the project.
  `,
});

const recommendProjectResourcesFlow = ai.defineFlow(
  {
    name: 'recommendProjectResourcesFlow',
    inputSchema: RecommendProjectResourcesInputSchema,
    outputSchema: RecommendProjectResourcesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
