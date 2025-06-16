
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
    .describe('Suggested dosage for chlorine, with a disclaimer, in Italian.'),
  phMinusDosageSuggestion: z
    .string()
    .describe('Suggested dosage for pH-, with a disclaimer, in Italian.'),
});
export type SuggestDosageOutput = z.infer<typeof SuggestDosageOutputSchema>;

export async function suggestDosage(input: SuggestDosageInput): Promise<SuggestDosageOutput> {
  return suggestDosageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDosagePrompt',
  input: {schema: SuggestDosageInputSchema},
  output: {schema: SuggestDosageOutputSchema},
  prompt: `Dati le dimensioni della piscina e i parametri attuali dell'acqua, fornisci suggerimenti per regolare i livelli di cloro e pH.
Per favore, fornisci tutti i suggerimenti e le descrizioni in lingua italiana.

Dimensioni Piscina:
- Lunghezza: {{poolLength}} metri
- Larghezza: {{poolWidth}} metri
- Profondità Media: {{poolAverageDepth}} metri

Parametri Attuali Acqua:
- Cloro: {{currentChlorine}} mg/l
- pH: {{currentPH}}

Parametri Acqua Desiderati:
-Cloro Desiderato: {{targetChlorine}} mg/l
-pH Desiderato: {{targetPH}}

Istruzioni:
1. Calcola il volume della piscina in metri cubi (lunghezza * larghezza * profondità media).
2. Fornisci un suggerimento di dosaggio del cloro per raggiungere il livello di cloro desiderato ({{targetChlorine}} mg/l) dal livello attuale ({{currentChlorine}} mg/l).
   - Includi la quantità approssimativa di dicloro granulare o cloro liquido necessaria per un aumento di 1 mg/l per 10 metri cubi, come descritto nella base di conoscenza.
3. Fornisci un suggerimento di dosaggio del pH- per raggiungere il livello di pH desiderato ({{targetPH}}) dal livello attuale ({{currentPH}}).
   - Includi la quantità approssimativa di pH- granulare (o prodotto equivalente) necessaria per diminuire di 0,1 unità di pH per 10 metri cubi, come descritto nella base di conoscenza.
4. Includi un'avvertenza che dichiari che tutti i dosaggi devono essere calibrati in base ai prodotti specifici utilizzati.

Formato Output (in italiano):
{
  "chlorineDosageSuggestion": "Suggerimento per il dosaggio del cloro, inclusa l'avvertenza.",
  "phMinusDosageSuggestion": "Suggerimento per il dosaggio del pH-, inclusa l'avvertenza."
}

Base di Conoscenza:
- Approssimativamente 150g di dicloro granulare o 100ml di cloro liquido aumentano il cloro di 1 mg/l per 10 metri cubi.
- Approssimativamente 200g di pH- granulare (o prodotto equivalente in polvere) riducono il pH di 0,1 unità per 10 metri cubi.
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
