
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
  currentChlorine: z
    .number()
    .optional()
    .describe('Il livello attuale di cloro in mg/l (opzionale).'),
  currentPH: z.number().optional().describe('Il livello attuale di pH (opzionale).'),
  targetChlorine: z.number().default(1.25).describe('Il livello di cloro desiderato in mg/l.'),
  targetPH: z.number().default(7.3).describe('Il livello di pH desiderato.'),
});
export type SuggestDosageInput = z.infer<typeof SuggestDosageInputSchema>;

const SuggestDosageOutputSchema = z.object({
  chlorineDosageSuggestion: z
    .string()
    .optional()
    .describe('Dosaggio suggerito per il cloro, con un disclaimer (se il cloro attuale è fornito).'),
  phMinusDosageSuggestion: z
    .string()
    .optional()
    .describe('Dosaggio suggerito per il pH-, con un disclaimer (se il pH attuale è fornito).'),
});
export type SuggestDosageOutput = z.infer<typeof SuggestDosageOutputSchema>;

export async function suggestDosage(input: SuggestDosageInput): Promise<SuggestDosageOutput> {
  return suggestDosageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDosagePrompt',
  input: {schema: SuggestDosageInputSchema},
  output: {schema: SuggestDosageOutputSchema},
  prompt: `Date le dimensioni della piscina e i parametri attuali dell'acqua (se forniti), fornire suggerimenti in italiano per regolare i livelli di cloro e pH.

Dimensioni Piscina:
- Lunghezza: {{poolLength}} metri
- Larghezza: {{poolWidth}} metri
- Profondità Media: {{poolAverageDepth}} metri

Parametri Acqua Attuali (fornire suggerimenti solo se questi valori sono presenti):
{{#if currentChlorine}}
- Cloro Attuale: {{currentChlorine}} mg/l
{{/if}}
{{#if currentPH}}
- pH Attuale: {{currentPH}}
{{/if}}

Parametri Acqua Desiderati:
- Cloro Desiderato: {{targetChlorine}} mg/l
- pH Desiderato: {{targetPH}}

Istruzioni:
1. Calcola il volume della piscina in metri cubi (lunghezza * larghezza * profondità media). Questo è sempre necessario.
2. Se 'currentChlorine' è fornito, fornisci un suggerimento di dosaggio del cloro per raggiungere il livello di cloro desiderato ({{targetChlorine}} mg/l) dal livello attuale ({{currentChlorine}} mg/l).
   - Includi la quantità approssimativa di dicloro granulare (o cloro liquido equivalente) necessaria per un aumento di 1 mg/l per 10 metri cubi, come indicato nella base di conoscenza. Sottolinea che le quantità esatte possono variare a seconda del prodotto specifico e che è sempre necessario seguire le istruzioni del produttore. Includi il disclaimer nel suggerimento.
3. Se 'currentPH' è fornito, fornisci un suggerimento di dosaggio di pH- per raggiungere il livello di pH desiderato ({{targetPH}}) dal livello attuale ({{currentPH}}).
   - Includi la quantità approssimativa di pH- granulare (o prodotto equivalente) necessaria per diminuire il pH di 0,1 unità per 10 metri cubi, come indicato nella base di conoscenza. Includi il disclaimer nel suggerimento.
4. Fornisci 'chlorineDosageSuggestion' solo se 'currentChlorine' è stato fornito. Altrimenti, ometti 'chlorineDosageSuggestion' o impostalo a null nell'output JSON.
5. Fornisci 'phMinusDosageSuggestion' solo se 'currentPH' è stato fornito. Altrimenti, ometti 'phMinusDosageSuggestion' o impostalo a null nell'output JSON.
6. Tutti i suggerimenti e i disclaimer devono essere in italiano.

Formato Output Esempio (le chiavi devono rimanere in inglese, i valori devono essere in italiano; i campi dei suggerimenti sono opzionali):
{
  "chlorineDosageSuggestion": "Opzionale: Suggerimento dosaggio cloro in italiano, incluso disclaimer.",
  "phMinusDosageSuggestion": "Opzionale: Suggerimento dosaggio pH minus in italiano, incluso disclaimer."
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

