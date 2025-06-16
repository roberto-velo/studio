
'use server';

/**
 * @fileOverview Fornisce suggerimenti di dosaggio basati sull'IA per prodotti chimici per piscine.
 *
 * - suggestDosage - Una funzione che suggerisce i dosaggi di cloro o pH- per una piscina.
 * - SuggestDosageInput - Il tipo di input per la funzione suggestDosage.
 * - SuggestDosageOutput - Il tipo di ritorno per la funzione suggestDosage.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDosageInputSchema = z.object({
  poolLength: z.number().describe('La lunghezza della piscina in metri.'),
  poolWidth: z.number().describe('La larghezza della piscina in metri.'),
  poolAverageDepth: z
    .number()
    .describe('La profondità media della piscina in metri.'),
  trattamentoPiscina: z.enum(["cloro", "sale", "ossigeno", "bromo"]).describe("Il tipo di trattamento della piscina (es. cloro, sale, ossigeno, bromo)."),
  currentChlorine: z
    .number()
    .describe('Il livello attuale di cloro in mg/l.'),
  currentPH: z.number().describe('Il livello attuale di pH.'),
  targetChlorine: z.number().default(1.25).describe('Il livello di cloro desiderato in mg/l.'),
  targetPH: z.number().default(7.3).describe('Il livello di pH desiderato.'),
});
export type SuggestDosageInput = z.infer<typeof SuggestDosageInputSchema>;

const SuggestDosageOutputSchema = z.object({
  chlorineDosageSuggestion: z
    .string()
    .describe('Dosaggio suggerito per il cloro, con un disclaimer.'),
  phMinusDosageSuggestion: z
    .string()
    .describe('Dosaggio suggerito per il pH-, con un disclaimer.'),
});
export type SuggestDosageOutput = z.infer<typeof SuggestDosageOutputSchema>;

export async function suggestDosage(input: SuggestDosageInput): Promise<SuggestDosageOutput> {
  return suggestDosageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDosagePrompt',
  input: {schema: SuggestDosageInputSchema},
  output: {schema: SuggestDosageOutputSchema},
  prompt: `Date le dimensioni della piscina, il tipo di trattamento e i parametri attuali dell'acqua, fornire suggerimenti in italiano per regolare i livelli di cloro e pH.

Dimensioni Piscina:
- Lunghezza: {{poolLength}} metri
- Larghezza: {{poolWidth}} metri
- Profondità Media: {{poolAverageDepth}} metri

Tipo di Trattamento: {{trattamentoPiscina}}

Parametri Acqua Attuali:
- Cloro: {{currentChlorine}} mg/l
- pH: {{currentPH}}

Parametri Acqua Desiderati:
- Cloro Desiderato: {{targetChlorine}} mg/l
- pH Desiderato: {{targetPH}}

Istruzioni:
1. Calcola il volume della piscina in metri cubi (lunghezza * larghezza * profondità media).
2. Fornisci un suggerimento di dosaggio del cloro per raggiungere il livello di cloro desiderato ({{targetChlorine}} mg/l) dal livello attuale ({{currentChlorine}} mg/l).
   - Includi la quantità approssimativa di dicloro granulare o cloro liquido necessaria per un aumento di 1 mg/l per 10 metri cubi, come indicato nella base di conoscenza. Questo suggerimento è particolarmente rilevante per i trattamenti a base di cloro. Per altri tipi di trattamento, menziona che questo valore potrebbe non essere direttamente applicabile o che dovrebbero essere seguite le istruzioni specifiche del prodotto.
3. Fornisci un suggerimento di dosaggio di pH- per raggiungere il livello di pH desiderato ({{targetPH}}) dal livello attuale ({{currentPH}}).
   - Includi la quantità approssimativa di pH- granulare (o prodotto equivalente) necessaria per diminuire il pH di 0,1 unità per 10 metri cubi, come indicato nella base di conoscenza.
4. Includi un disclaimer che affermi che tutti i dosaggi devono essere calibrati in base ai prodotti specifici utilizzati e al tipo di trattamento. Il disclaimer deve essere in italiano.

Formato Output (le chiavi devono rimanere in inglese, i valori devono essere in italiano):
{
  "chlorineDosageSuggestion": "Suggerimento dosaggio cloro in italiano, incluso disclaimer.",
  "phMinusDosageSuggestion": "Suggerimento dosaggio pH minus in italiano, incluso disclaimer."
}

Base di Conoscenza:
- Circa 150g di dicloro granulare o 100ml di cloro liquido aumentano il cloro di 1 mg/l per 10 metri cubi.
- Circa 200g di pH- granulare (o polvere equivalente) riducono il pH di 0,1 unità per 10 metri cubi.
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

    