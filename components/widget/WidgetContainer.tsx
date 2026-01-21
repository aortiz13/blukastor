"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UploadCloud, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming you have this or standard input
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Step = "UPLOAD" | "ANALYZING" | "PREVIEW" | "GENERATING" | "LOCKED_RESULT" | "LEAD_FORM" | "RESULT";

export default function WidgetContainer() {
    const [step, setStep] = useState<Step>("UPLOAD");
    const [image, setImage] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleUpload = async (file: File) => {
        setImage(file);
        setStep("ANALYZING");

        try {
            const supabase = createClient();

            // 1. Upload to Storage
            const ext = file.name.split('.').pop();
            const filename = `${crypto.randomUUID()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, file);

            if (uploadError) throw uploadError;

            // 2. Call Analyze Face
            const { data: analysisData, error: analysisError } = await supabase.functions
                .invoke('analyze-face', {
                    body: { image_path: filename }
                });

            if (analysisError) throw analysisError;

            setAnalysisResult(analysisData);

            // Transition based on validity
            if (analysisData.valid) {
                setStep("PREVIEW");
            } else {
                alert(`Error: ${analysisData.reason || "Imagen no válida"}`);
                setStep("UPLOAD");
                setImage(null);
            }

        } catch (err) {
            console.error(err);
            alert("Ocurrió un error procesando la imagen. Revisa la consola.");
            setStep("UPLOAD");
            setImage(null);
        }
    };

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData);

        try {
            const supabase = createClient();
            const { error } = await supabase.from('leads').insert({
                name: data.name,
                email: data.email,
                phone: data.phone,
                survey_data: { analysis: analysisResult },
                status: 'pending'
            });

            if (error) throw error;

            setStep("RESULT");
        } catch (err) {
            console.error(err);
            alert("Error guardando datos. Intenta de nuevo.");
        }
    };

    return (
        <div className="relative min-h-[500px] w-full bg-card text-card-foreground flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-muted/40">
                <h1 className="text-lg font-bold text-primary tracking-tight">Smile Forward AI</h1>
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">V1.0</span>
            </div>

            <main className="flex-1 p-6 relative">
                <AnimatePresence mode="wait">
                    {/* UPLOAD STEP */}
                    {step === "UPLOAD" && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="h-full flex flex-col justify-center items-center text-center space-y-6"
                        >
                            <div className="p-10 border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/50 rounded-xl cursor-pointer transition-all w-full flex flex-col items-center gap-4 group"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
                                }}
                            >
                                <div className="p-4 bg-primary/10 rounded-full group-hover:scale-110 transition-transform duration-300">
                                    <UploadCloud className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-semibold text-foreground">Sube tu foto</p>
                                    <p className="text-sm text-muted-foreground">O arrastra y suelta aquí</p>
                                </div>
                                <input type="file" hidden onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xs text-balance">
                                Usa una foto frontal con buena iluminación para mejores resultados.
                            </p>
                        </motion.div>
                    )}

                    {/* ANALYZING STEP */}
                    {step === "ANALYZING" && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full space-y-6"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="font-semibold text-lg">Analizando Facciones</h3>
                                <p className="text-sm text-muted-foreground max-w-[200px]">Nuestra IA está mapeando tu estructura facial...</p>
                            </div>
                        </motion.div>
                    )}

                    {/* PREVIEW STEP */}
                    {step === "PREVIEW" && (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <Card className="bg-muted/30 border-none shadow-inner">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-primary flex items-center gap-2 text-base">
                                        <CheckCircle2 className="w-4 h-4" /> Análisis Exitoso
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {analysisResult?.analysis || "Facciones detectadas correctamente. Estamos listos para simular tu nueva sonrisa."}
                                    </p>
                                </CardContent>
                            </Card>

                            <Button
                                onClick={async () => {
                                    setStep("GENERATING");
                                    try {
                                        const supabase = createClient();
                                        if (!image) throw new Error("No image found");
                                        const ext = image.name.split('.').pop();
                                        const filename = `regen-${crypto.randomUUID()}.${ext}`;
                                        await supabase.storage.from('uploads').upload(filename, image);

                                        const { data, error } = await supabase.functions.invoke('generate-smile', {
                                            body: {
                                                image_path: filename,
                                                prompt_options: {}
                                            }
                                        });

                                        if (error) throw error;
                                        setGeneratedImage(data.public_url);
                                        setStep("LOCKED_RESULT");

                                    } catch (e) {
                                        console.error(e);
                                        alert("Error generando sonrisa.");
                                        setStep("PREVIEW");
                                    }
                                }}
                                className="w-full text-lg h-12 shadow-lg hover:shadow-primary/20 transition-all font-bold"
                            >
                                Generar Nueva Sonrisa ✨
                            </Button>
                        </motion.div>
                    )}

                    {/* GENERATING STEP */}
                    {step === "GENERATING" && (
                        <motion.div
                            key="generating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full space-y-6"
                        >
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="font-semibold text-lg bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">Diseñando Sonrisa</h3>
                                <p className="text-sm text-muted-foreground animate-pulse">Aplicando estética dental avanzada...</p>
                            </div>
                        </motion.div>
                    )}

                    {/* LOCKED RESULT */}
                    {step === "LOCKED_RESULT" && (
                        <motion.div
                            key="locked"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="aspect-square bg-muted rounded-xl overflow-hidden relative border border-border group">
                                {generatedImage ? (
                                    <div className="w-full h-full relative">
                                        <img src={generatedImage} alt="Generated Smile" className="w-full h-full object-cover blur-lg scale-110 transition-transform duration-[2s]" />
                                        <div className="absolute inset-0 bg-background/40 backdrop-blur-sm z-10" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-destructive">Error de imagen</div>
                                )}
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-4 text-center">
                                    <div className="p-3 bg-background/80 backdrop-blur rounded-full shadow-lg">
                                        <Lock className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground drop-shadow-sm">Resultado Listo</h3>
                                    <p className="text-sm text-muted-foreground max-w-[200px]">Desbloquea para ver tu transformación en HD</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setStep("LEAD_FORM")}
                                className="w-full text-lg h-12 font-bold"
                                variant="default"
                            >
                                Desbloquear Resultado
                            </Button>
                        </motion.div>
                    )}

                    {/* LEAD FORM */}
                    {step === "LEAD_FORM" && (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-5"
                        >
                            <div className="text-center space-y-1">
                                <h2 className="text-2xl font-bold text-primary">Casi listo</h2>
                                <p className="text-sm text-muted-foreground">Tus datos para enviarte la simulación.</p>
                            </div>

                            <form className="space-y-4" onSubmit={handleLeadSubmit}>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nombre completo</Label>
                                    <Input id="name" name="name" placeholder="Ej. Juan Pérez" required className="bg-background/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo electrónico</Label>
                                    <Input id="email" name="email" type="email" placeholder="juan@ejemplo.com" required className="bg-background/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
                                    <Input id="phone" name="phone" type="tel" placeholder="+56 9 ..." required className="bg-background/50" />
                                </div>

                                <div className="flex items-start space-x-2 pt-2">
                                    {/* Using standard checkbox for simplicity if shadcn checkbox not set up completely with logic, but prefer shadcn style wrapper */}
                                    <input type="checkbox" id="terms" required className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary" />
                                    <Label htmlFor="terms" className="text-xs text-muted-foreground leading-snug font-normal cursor-pointer">
                                        Acepto la política de privacidad y autorizo el procesamiento de mi imagen para fines de simulación dental.
                                    </Label>
                                </div>

                                <Button type="submit" className="w-full h-11 text-base font-bold mt-2">
                                    Ver Mi Sonrisa Ahora
                                </Button>
                            </form>
                        </motion.div>
                    )}

                    {/* FINAL RESULT */}
                    {step === "RESULT" && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 text-center"
                        >
                            <Card className="overflow-hidden border-primary/20 shadow-lg">
                                <div className="aspect-square bg-muted relative">
                                    {generatedImage && <img src={generatedImage} alt="New Smile" className="w-full h-full object-cover" />}
                                </div>
                                <CardContent className="pt-6">
                                    <h3 className="font-bold text-xl text-primary mb-1">¡Transformación Completa!</h3>
                                    <p className="text-xs text-muted-foreground">Hemos enviado una copia de alta calidad a tu correo.</p>
                                </CardContent>
                            </Card>

                            <div className="bg-secondary/30 p-5 rounded-xl border border-secondary">
                                <p className="text-sm font-semibold mb-3">¿Quieres verte en movimiento?</p>
                                <Button
                                    onClick={() => alert("¡Pronto! Generación de Video en desarrollo.")}
                                    variant="outline"
                                    className="w-full border-primary/20 text-primary hover:bg-primary/5"
                                >
                                    Generar Video (Beta)
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
