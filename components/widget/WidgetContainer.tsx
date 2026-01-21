"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UploadCloud, Lock, CheckCircle2, AlertCircle, Video, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type Step = "UPLOAD" | "ANALYZING" | "PREVIEW" | "GENERATING" | "LOCKED_RESULT" | "LEAD_FORM" | "RESULT";

export default function WidgetContainer() {
    const [step, setStep] = useState<Step>("UPLOAD");
    const [image, setImage] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

    // Scanning Animation Variants
    const scanVariants = {
        initial: { top: "0%" },
        animate: {
            top: "100%",
            transition: {
                repeat: Infinity,
                repeatType: "mirror" as const,
                duration: 1.5,
                ease: "linear"
            }
        }
    };

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
                            className="flex flex-col items-center justify-center h-full space-y-8"
                        >
                            <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-2xl border border-primary/20 bg-black">
                                {image ? (
                                    <img src={URL.createObjectURL(image)} alt="Analyzing" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <div className="w-full h-full bg-muted" />
                                )}

                                {/* Scanning Effect */}
                                <motion.div
                                    variants={scanVariants}
                                    initial="initial"
                                    animate="animate"
                                    className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_20px_2px_rgba(42,157,143,0.8)] z-10"
                                />
                                <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]" />

                                {/* Overlay Data */}
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[10px] font-mono text-primary-foreground/80">
                                    <span>FACE_ID: DETECTING</span>
                                    <span>CONFIDENCE: 99.8%</span>
                                </div>
                            </div>
                            <div className="space-y-3 text-center max-w-xs mx-auto">
                                <h3 className="font-heading font-bold text-xl">Escaneando Rostro...</h3>
                                <Progress value={66} className="h-2" />
                                <p className="text-xs text-muted-foreground animate-pulse">Detectando puntos de referencia biométricos</p>
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
                            <Card className="bg-gradient-to-br from-background to-secondary/20 border-border shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-primary flex items-center gap-2 text-lg">
                                        <CheckCircle2 className="w-5 h-5" /> Análisis Completado
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-4 bg-background/50 rounded-lg border border-border/50 text-sm leading-relaxed text-muted-foreground">
                                        {analysisResult?.analysis || "Estructura facial analizada con éxito. Compatible con carillas de porcelana y diseño de sonrisa digital."}
                                    </div>
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
                                        toast.error("Error generando simulación.");
                                        setStep("PREVIEW");
                                    }
                                }}
                                className="w-full text-lg h-14 shadow-xl hover:shadow-primary/25 transition-all font-bold rounded-xl"
                            >
                                ✨ Generar Nueva Sonrisa
                            </Button>
                        </motion.div>
                    )}

                    {/* GENERATING STEP */}
                    {step === "GENERATING" && (
                        <motion.div
                            key="generating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full space-y-8"
                        >
                            <div className="relative">
                                {/* Double Spinner */}
                                <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
                                <div className="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-primary animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="font-heading font-bold text-2xl bg-gradient-to-r from-primary to-teal-600 bg-clip-text text-transparent">Diseñando Sonrisa</h3>
                                <p className="text-sm text-muted-foreground animate-pulse">Aplicando principios de estética dental...</p>
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
                            <div className="aspect-square bg-muted rounded-2xl overflow-hidden relative border border-border/50 group shadow-inner">
                                {generatedImage ? (
                                    <div className="w-full h-full relative">
                                        <img src={generatedImage} alt="Generated Smile" className="w-full h-full object-cover blur-xl scale-110" />
                                        <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-destructive">Error de imagen</div>
                                )}

                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center">
                                    <div className="p-4 bg-background rounded-full shadow-2xl border border-primary/10">
                                        <Lock className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-2xl text-foreground drop-shadow-sm">Resultado Listo</h3>
                                        <p className="text-sm text-muted-foreground font-medium">Ingresa tus datos para desbloquear tu <br /> Simulación HD.</p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => setStep("LEAD_FORM")}
                                className="w-full text-lg h-12 font-bold rounded-xl"
                                variant="default"
                            >
                                Desbloquear Ahora
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
