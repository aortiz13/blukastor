"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                toast.success("¡Cuenta creada exitosamente!");
                router.push("/admin/dashboard");
            } else {
                // Email confirmation might be required
                toast.success("¡Cuenta creada! Por favor revisa tu correo para confirmar.");
                router.push("/login");
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al registrarse");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md shadow-lg border-border/50">
                <CardHeader className="space-y-1">
                    <Link href="/login" className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Volver al Login
                    </Link>
                    <CardTitle className="text-2xl font-bold text-center">Registro Admin</CardTitle>
                    <CardDescription className="text-center">
                        Crea una nueva cuenta de administrador
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nombre@ejemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                                minLength={6}
                            />
                            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                        </div>
                        <Button type="submit" className="w-full h-11 font-bold" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                                </>
                            ) : (
                                "Crear Cuenta"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
