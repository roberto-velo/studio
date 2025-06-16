
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Ruler, Thermometer, Calculator, Target, TestTube2, Atom, Droplets, Zap, Sparkles as SaltIcon, Lightbulb, Waves, AlertTriangleIcon } from 'lucide-react';

const formSchema = z.object({
  poolLength: z.coerce.number().positive({ message: "Length must be positive." }),
  poolWidth: z.coerce.number().positive({ message: "Width must be positive." }),
  poolAverageDepth: z.coerce.number().positive({ message: "Depth must be positive." }),
  waterTemperature: z.coerce.number().optional(),
  currentChlorine: z.coerce.number().min(0, { message: "Chlorine cannot be negative." }),
  currentPH: z.coerce.number().min(0, { message: "pH cannot be negative." }).max(14, { message: "pH must be between 0 and 14." }),
  currentRedox: z.coerce.number().optional(),
  currentSalt: z.coerce.number().min(0, { message: "Salt cannot be negative." }).optional(),
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
    mode: 'onChange', // Validate on change for reactive calculations
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

  const { watch, handleSubmit, formState: { errors } } = form;

  const watchedValues = watch();

  useEffect(() => {
    const { poolLength, poolWidth, poolAverageDepth, currentSalt } = watchedValues;
    let newCalculations: CalculatedValues = {};

    if (poolLength && poolWidth && poolLength > 0 && poolWidth > 0) {
      const surface = poolLength * poolWidth;
      newCalculations.surfaceArea = parseFloat(surface.toFixed(2));
      newCalculations.requiredSaltTotal = parseFloat((surface * 4).toFixed(2)); // 4 kg/m²

      if (poolAverageDepth && poolAverageDepth > 0) {
        const volume = surface * poolAverageDepth;
        newCalculations.volumeM3 = parseFloat(volume.toFixed(2));
        newCalculations.volumeLiters = parseFloat((volume * 1000).toFixed(2));
      }
      
      if (typeof currentSalt === 'number' && currentSalt >= 0 && newCalculations.requiredSaltTotal !== undefined) {
        newCalculations.saltToAdd = parseFloat(Math.max(0, newCalculations.requiredSaltTotal - currentSalt).toFixed(2));
      } else if (newCalculations.requiredSaltTotal !== undefined){
        newCalculations.saltToAdd = newCalculations.requiredSaltTotal; // If current salt not entered, suggest total
      }
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
        targetChlorine: 1.25, // Default ideal target
        targetPH: 7.3,      // Default ideal target
      };
      const result = await suggestDosage(aiInput);
      setDosageSuggestions(result);
    } catch (error) {
      console.error("Error getting dosage suggestions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get dosage suggestions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const idealValues = [
    { parameter: "Chlorine", value: "1.0 – 1.5 mg/l", icon: <Atom className="w-4 h-4 text-accent" /> },
    { parameter: "pH", value: "7.2 – 7.4", icon: <Droplets className="w-4 h-4 text-accent" /> },
    { parameter: "Redox", value: "750 – 800 mV", icon: <Zap className="w-4 h-4 text-accent" /> },
    { parameter: "Salt", value: "4 kg/m²", icon: <SaltIcon className="w-4 h-4 text-accent" /> },
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
          Your smart pool chemistry assistant.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-primary/10">
            <CardTitle className="font-headline flex items-center gap-2 text-xl"><Ruler className="w-6 h-6 text-primary" />Pool Dimensions & Temperature</CardTitle>
            <CardDescription>Enter your pool's measurements.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFormField("poolLength", "Length (m)", <Ruler className="w-4 h-4" />, "e.g., 10")}
            {renderFormField("poolWidth", "Width (m)", <Ruler className="w-4 h-4" />, "e.g., 5")}
            {renderFormField("poolAverageDepth", "Average Depth (m)", <Ruler className="w-4 h-4" />, "e.g., 1.5")}
            {renderFormField("waterTemperature", "Water Temp (°C) (Optional)", <Thermometer className="w-4 h-4" />, "e.g., 25")}
          </CardContent>
        </Card>

        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-accent/10">
            <CardTitle className="font-headline flex items-center gap-2 text-xl"><Calculator className="w-6 h-6 text-accent" />Calculations & <Target className="w-6 h-6 text-accent"/>Targets</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><strong>Surface Area:</strong> {calculatedValues.surfaceArea ?? 'N/A'} m²</div>
                <div><strong>Volume:</strong> {calculatedValues.volumeM3 ?? 'N/A'} m³ ({calculatedValues.volumeLiters ?? 'N/A'} L)</div>
                <div><strong>Total Salt Needed (for 4kg/m²):</strong> {calculatedValues.requiredSaltTotal ?? 'N/A'} kg</div>
            </div>
            <Separator />
            <h4 className="font-semibold text-md">Ideal Water Parameters:</h4>
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
            <CardTitle className="font-headline flex items-center gap-2 text-xl"><TestTube2 className="w-6 h-6 text-primary" />Current Water Analysis</CardTitle>
            <CardDescription>Enter values from your latest water test.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderFormField("currentChlorine", "Free Chlorine (mg/l)", <Atom className="w-4 h-4" />, "e.g., 0.5")}
            {renderFormField("currentPH", "pH", <Droplets className="w-4 h-4" />, "e.g., 7.8")}
            {renderFormField("currentRedox", "Redox (mV) (Optional)", <Zap className="w-4 h-4" />, "e.g., 650")}
            {renderFormField("currentSalt", "Current Salt (kg) (Optional)", <SaltIcon className="w-4 h-4" />, "e.g., 50")}
          </CardContent>
          <CardFooter className="p-6">
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
              Calculate & Get Dosage Suggestions
            </Button>
          </CardFooter>
        </Card>
      </form>

      {(dosageSuggestions || (calculatedValues.surfaceArea && typeof watchedValues.currentSalt === 'number') ) && (
        <Card className="shadow-lg overflow-hidden">
          <CardHeader className="bg-accent/10">
            <CardTitle className="font-headline flex items-center gap-2 text-xl"><Lightbulb className="w-6 h-6 text-accent" />Dosage Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {dosageSuggestions?.chlorineDosageSuggestion && (
              <div className="p-3 border rounded-md bg-background">
                <h4 className="font-semibold flex items-center gap-2"><Atom className="w-5 h-5 text-primary" />Chlorine Dosage:</h4>
                <p className="text-sm whitespace-pre-line">{dosageSuggestions.chlorineDosageSuggestion}</p>
              </div>
            )}
            {dosageSuggestions?.phMinusDosageSuggestion && (
              <div className="p-3 border rounded-md bg-background">
                <h4 className="font-semibold flex items-center gap-2"><Droplets className="w-5 h-5 text-primary" />pH Minus Dosage:</h4>
                <p className="text-sm whitespace-pre-line">{dosageSuggestions.phMinusDosageSuggestion}</p>
              </div>
            )}
            {typeof calculatedValues.saltToAdd === 'number' && calculatedValues.saltToAdd >= 0 && (
                 <div className="p-3 border rounded-md bg-background">
                    <h4 className="font-semibold flex items-center gap-2"><SaltIcon className="w-5 h-5 text-primary" />Salt to Add:</h4>
                    <p className="text-sm">You need to add approximately <strong>{calculatedValues.saltToAdd.toFixed(2)} kg</strong> of salt to reach the target of 4 kg/m².</p>
                    {typeof watchedValues.currentSalt !== 'number' && <p className="text-xs text-muted-foreground">This assumes 0kg current salt as no value was provided.</p>}
                 </div>
            )}
            
            <Alert variant="default" className="border-primary/50 bg-primary/5">
                <AlertTriangleIcon className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-primary">Important Disclaimer</AlertTitle>
                <AlertDescription className="text-sm">
                All dosage suggestions are approximations. Always calibrate dosages based on the specific products you are using and re-test water parameters after application. Consult product instructions for precise dosing.
                </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
      <footer className="text-center py-4 text-sm text-muted-foreground">
        {currentYear !== null ? (
          <p suppressHydrationWarning={true}>&copy; {currentYear} Pool Pal. Dive into perfect water chemistry!</p>
        ) : (
          <p suppressHydrationWarning={true}>&copy; Pool Pal. Dive into perfect water chemistry!</p>
        )}
      </footer>
    </div>
  );
}
