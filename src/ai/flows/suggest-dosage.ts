
'use server';

/**
 * @fileOverview Provides AI-powered dosage suggestions for pool chemicals.
 *
 * - suggestDosage - A function that suggests chlorine or pH- dosages for a pool.
 * - SuggestDosageInput - The input type for the suggestDosage function.
 * - SuggestDosageOutput - The return type for the suggestDosage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDosageInputSchema = z.object({
  poolLength: z.number().describe('The length of the pool in meters.'),
  poolWidth: z.number().describe('The width of the pool in meters.'),
  poolAverageDepth: z
    .number()
    .describe('The average depth of the pool in meters.'),
  currentChlorine: z
    .number()
    .describe('The current chlorine level in mg/l.'),
  currentPH: z.number().describe('The current pH level.'),
  targetChlorine: z.number().default(1.25).describe('The target chlorine level in mg/l.'),
  targetPH: z.number().default(7.3).describe('The target pH level.'),
});
export type SuggestDosageInput = z.infer<typeof SuggestDosageInputSchema>;

const SuggestDosageOutputSchema = z.object({
  chlorineDosageSuggestion: z
    .string()
    .describe('Suggested dosage for chlorine, with a disclaimer.'),
  phMinusDosageSuggestion: z
    .string()
    .describe('Suggested dosage for pH-, with a disclaimer.'),
});
export type SuggestDosageOutput = z.infer<typeof SuggestDosageOutputSchema>;

export async function suggestDosage(input: SuggestDosageInput): Promise<SuggestDosageOutput> {
  return suggestDosageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDosagePrompt',
  input: {schema: SuggestDosageInputSchema},
  output: {schema: SuggestDosageOutputSchema},
  prompt: `Given the pool dimensions and current water parameters, provide suggestions for adjusting chlorine and pH levels.

Pool Dimensions:
- Length: {{poolLength}} meters
- Width: {{poolWidth}} meters
- Average Depth: {{poolAverageDepth}} meters

Current Water Parameters:
- Chlorine: {{currentChlorine}} mg/l
- pH: {{currentPH}}

Target Water Parameters:
- Target Chlorine: {{targetChlorine}} mg/l
- Target pH: {{targetPH}}

Instructions:
1. Calculate the pool volume in cubic meters (length * width * average depth).
2. Provide a chlorine dosage suggestion to reach the target chlorine level ({{targetChlorine}} mg/l) from the current level ({{currentChlorine}} mg/l).
   - Include the approximate amount of granular dichlor or liquid chlorine needed for a 1 mg/l increase per 10 cubic meters, as outlined in the knowledge base.
3. Provide a pH- dosage suggestion to reach the target pH level ({{targetPH}}) from the current level ({{currentPH}}).
   - Include the approximate amount of pH- granular (or equivalent product) needed to decrease pH by 0.1 units per 10 cubic meters, as outlined in the knowledge base.
4. Include a disclaimer stating that all dosages must be calibrated to the specific products used.

Output Format:
{
  "chlorineDosageSuggestion": "Chlorine dosage suggestion, including disclaimer.",
  "phMinusDosageSuggestion": "pH minus dosage suggestion, including disclaimer."
}

Knowledge Base:
- Approximately 150g of granular dichlor or 100ml of liquid chlorine increase chlorine by 1 mg/l per 10 cubic meters.
- Approximately 100g of pH- granular (or powder equivalent) reduce pH by 0.1 units for 10 cubic meters.
`,
});

const suggestDosageFlow = ai.defineFlow(
  {
    name: 'suggestDosageFlow',
    inputSchema: SuggestDosageInputSchema,
    outputSchema: SuggestDosageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
