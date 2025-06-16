
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { suggestDosage, type SuggestDosageOutput } from '@/ai/flows/suggest-dosage';
import { Loader2, Ruler, Thermometer, Calculator, Target, TestTube2, Atom, Droplets, Zap, Sparkles as SaltIcon, Lightbulb, Waves, AlertTriangle } from 'lucide-react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";


const formSchema = z.object({
  poolLength: z.coerce.number().positive({ message: "La lunghezza deve essere positiva." }),
  poolWidth: z.coerce.number().positive({ message: "La larghezza deve essere positiva." }),
  poolAverageDepth: z.coerce.number().positive({ message: "La profondità media deve essere positiva." }),
  waterTemperature: z.coerce.number().optional(),
  currentChlorine: z.coerce.number().min(0, { message: "Il cloro non può essere negativo." }),
  currentPH: z.coerce.number().min(0, { message: "Il pH non può essere negativo." }).max(14, { message: "Il pH deve essere compreso tra 0 e 14." }),
  currentRedox: z.coerce.number().optional(),
  currentSalt: z.coerce.number().min(0, { message: "Il sale non può essere negativo." }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CalculatedValues {
  surfaceArea?: number;
  volumeM3?: number;
  volumeLiters?: number;
  requiredSaltTotal?: number;
  saltToAdd?: number;
}

export default function PoolPalApp() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dosageSuggestions, setDosageSuggestions] = useState<SuggestDosageOutput | null>(null);
  const [calculatedValues, setCalculatedValues] = useState<CalculatedValues>({});
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      poolLength: undefined,
      poolWidth: undefined,
      poolAverageDepth: undefined,
      waterTemperature: undefined,
      currentChlorine: undefined,
      currentPH: undefined,
      currentRedox: undefined,
      currentSalt: undefined,
    }
  });

  const { watch, formState: { errors } } = form;

  const watchedValues = watch();

  useEffect(() => {
    const { poolLength, poolWidth, poolAverageDepth, currentSalt } = watchedValues;
    let newCalculations: CalculatedValues = {};

    if (poolLength && poolWidth && poolLength > 0 && poolWidth > 0) {
      const surface = poolLength * poolWidth;
      newCalculations.surfaceArea = parseFloat(surface.toFixed(2));

      if (poolAverageDepth && poolAverageDepth > 0) {
        const volume = surface * poolAverageDepth;
        newCalculations.volumeM3 = parseFloat(volume.toFixed(2));
        newCalculations.volumeLiters = parseFloat((volume * 1000).toFixed(2));
        newCalculations.requiredSaltTotal = parseFloat((newCalculations.volumeM3 * 4).toFixed(2)); // 4 kg/m³
      } else {
        newCalculations.volumeM3 = undefined;
        newCalculations.volumeLiters = undefined;
        newCalculations.requiredSaltTotal = undefined;
      }
      
      if (typeof currentSalt === 'number' && currentSalt >= 0 && newCalculations.requiredSaltTotal !== undefined) {
        newCalculations.saltToAdd = parseFloat(Math.max(0, newCalculations.requiredSaltTotal - currentSalt).toFixed(2));
      } else if (newCalculations.requiredSaltTotal !== undefined){
        newCalculations.saltToAdd = newCalculations.requiredSaltTotal;
      } else {
         newCalculations.saltToAdd = undefined;
      }
    } else {
        newCalculations.surfaceArea = undefined;
        newCalculations.volumeM3 = undefined;
        newCalculations.volumeLiters = undefined;
        newCalculations.requiredSaltTotal = undefined;
        newCalculations.saltToAdd = undefined;
    }
    setCalculatedValues(prev => ({ ...prev, ...newCalculations }));
  }, [watchedValues.poolLength, watchedValues.poolWidth, watchedValues.poolAverageDepth, watchedValues.currentSalt]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setDosageSuggestions(null);
    try {
      const aiInput = {
        poolLength: data.poolLength,
        poolWidth: data.poolWidth,
        poolAverageDepth: data.poolAverageDepth,
        currentChlorine: data.currentChlorine,
        currentPH: data.currentPH,
        targetChlorine: 1.25, 
        targetPH: 7.3,      
      };
      const result = await suggestDosage(aiInput);
      setDosageSuggestions(result);
    } catch (error) {
      console.error("Errore nell'ottenere suggerimenti di dosaggio:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile ottenere suggerimenti sul dosaggio. Riprova.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const idealValues = [
    { parameter: "Cloro", value: "1.0 – 1.5 mg/l", icon: <Atom className="w-4 h-4 text-accent" /> },
    { parameter: "pH", value: "7.2 – 7.4", icon: <Droplets className="w-4 h-4 text-accent" /> },
    { parameter: "Redox", value: "750 – 800 mV", icon: <Zap className="w-4 h-4 text-accent" /> },
    { parameter: "Sale (per sistemi a sale)", value: "4 kg/m³", icon: <SaltIcon className="w-4 h-4 text-accent" /> },
  ];

  const renderFormField = (name: keyof FormValues, label: string, icon: React.ReactNode, placeholder?: string, type: string = "number", step: string = "0.1") => (
    <div className="space-y-1">
      <Label htmlFor={name} className="flex items-center gap-2 text-sm" suppressHydrationWarning={true}>
        {icon} {label}
      </Label>
      <Input
        id={name}
        type={type}
        step={step}
        placeholder={placeholder}
        {...form.register(name)}
        className={errors[name] ? 'border-destructive' : ''}
        aria-invalid={errors[name] ? "true" : "false"}
      />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <header className="text-center py-6">
        <h1 
          className="font-headline text-4xl font-bold text-primary flex items-center justify-center gap-2"
          suppressHydrationWarning={true}
        >
          <Waves className="w-10 h-10" /> Pool Pal
        </h1>
        <p 
          className="text-muted-foreground"
          suppressHydrationWarning={true}
        >
          Il tuo assistente intelligente per la chimica della piscina.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/10">
              <CardTitle className="font-headline flex items-center gap-2 text-xl"><Ruler className="w-6 h-6 text-primary" />Dimensioni Piscina & Temperatura</CardTitle>
              <CardDescription>Inserisci le misure della tua piscina.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFormField("poolLength", "Lunghezza (m)", <Ruler className="w-4 h-4" />, "es., 10")}
              {renderFormField("poolWidth", "Larghezza (m)", <Ruler className="w-4 h-4" />, "es., 5")}
              {renderFormField("poolAverageDepth", "Prof. Media (m)", <Ruler className="w-4 h-4" />, "es., 1.5")}
              {renderFormField("waterTemperature", "Temp. Acqua (°C) (Opzionale)", <Thermometer className="w-4 h-4" />, "es., 25")}
            </CardContent>
          </Card>

          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="bg-accent/10">
              <CardTitle className="font-headline flex items-center gap-2 text-xl"><Calculator className="w-6 h-6 text-accent" />Calcoli & <Target className="w-6 h-6 text-accent"/>Valori Ideali</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><strong>Area Superficie:</strong> {calculatedValues.surfaceArea ?? 'N/A'} m²</div>
                  <div><strong>Volume:</strong> {calculatedValues.volumeM3 ?? 'N/A'} m³ ({calculatedValues.volumeLiters ?? 'N/A'} L)</div>
                  <div><strong>Sale Totale Richiesto (per 4kg/m³):</strong> {calculatedValues.requiredSaltTotal ?? 'N/A'} kg</div>
              </div>
              <Separator />
              <h4 className="font-semibold text-md">Parametri Acqua Ideali:</h4>
              <ul className="space-y-1 text-sm">
                {idealValues.map(item => (
                  <li key={item.parameter} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <span className="flex items-center gap-2">{item.icon} {item.parameter}</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="bg-primary/10">
              <CardTitle className="font-headline flex items-center gap-2 text-xl"><TestTube2 className="w-6 h-6 text-primary" />Analisi Acqua Attuale</CardTitle>
              <CardDescription>Inserisci i valori del tuo ultimo test dell'acqua.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFormField("currentChlorine", "Cloro Libero (mg/l)", <Atom className="w-4 h-4" />, "es., 0.5")}
              {renderFormField("currentPH", "pH", <Droplets className="w-4 h-4" />, "es., 7.8")}
              {renderFormField("currentRedox", "Redox (mV) (Opzionale)", <Zap className="w-4 h-4" />, "es., 650")}
              {renderFormField("currentSalt", "Sale Attuale (kg) (Opzionale, per elettrolisi)", <SaltIcon className="w-4 h-4" />, "es., 50")}
            </CardContent>
            <CardFooter className="p-6">
              <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                Calcola & Ottieni Suggerimenti Dosaggio
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {(dosageSuggestions || (calculatedValues.volumeM3 && typeof watchedValues.currentSalt === 'number') || (calculatedValues.volumeM3 && watchedValues.currentSalt === undefined && calculatedValues.saltToAdd !== undefined) ) && (
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-accent/10">
            <CardTitle className="font-headline flex items-center gap-2 text-xl"><Lightbulb className="w-6 h-6 text-accent" />Suggerimenti Dosaggio</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {dosageSuggestions?.chlorineDosageSuggestion && (
              <div className="p-3 border rounded-md bg-background">
                <h4 className="font-semibold flex items-center gap-2"><Atom className="w-5 h-5 text-primary" />Dosaggio Cloro:</h4>
                <p className="text-sm whitespace-pre-line">{dosageSuggestions.chlorineDosageSuggestion}</p>
              </div>
            )}
            {dosageSuggestions?.phMinusDosageSuggestion && (
              <div className="p-3 border rounded-md bg-background">
                <h4 className="font-semibold flex items-center gap-2"><Droplets className="w-5 h-5 text-primary" />Dosaggio pH Minus:</h4>
                <p className="text-sm whitespace-pre-line">{dosageSuggestions.phMinusDosageSuggestion}</p>
              </div>
            )}
            {typeof calculatedValues.saltToAdd === 'number' && calculatedValues.saltToAdd >= 0 && calculatedValues.volumeM3 !== undefined && (
                 <div className="p-3 border rounded-md bg-background">
                    <h4 className="font-semibold flex items-center gap-2"><SaltIcon className="w-5 h-5 text-primary" />Sale da Aggiungere (per sistemi a sale):</h4>
                    <p className="text-sm">Devi aggiungere circa <strong>{calculatedValues.saltToAdd.toFixed(2)} kg</strong> di sale per raggiungere l'obiettivo di 4 kg/m³.</p>
                    {typeof watchedValues.currentSalt !== 'number' && <p className="text-xs text-muted-foreground">Questo presuppone 0kg di sale attuale poiché non è stato fornito alcun valore.</p>}
                 </div>
            )}
            
            <Alert variant="default" className="border-primary/50 bg-primary/5">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-primary">Avviso Importante</AlertTitle>
                <AlertDescription className="text-sm">
                Tutti i suggerimenti di dosaggio sono approssimazioni. Calibra sempre i dosaggi in base ai prodotti specifici che utilizzi e ripeti il test dei parametri dell'acqua dopo l'applicazione. Consulta le istruzioni del prodotto per un dosaggio preciso.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground">
        {currentYear !== null ? (
          <p suppressHydrationWarning={true}>&copy; {currentYear} Pool Pal. Tuffati in un'acqua perfettamente bilanciata!</p>
        ) : (
          <p suppressHydrationWarning={true}>&copy; Pool Pal. Tuffati in un'acqua perfettamente bilanciata!</p>
        )}
      </footer>
    </div>
  );
}
