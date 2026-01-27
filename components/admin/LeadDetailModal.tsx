"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, User, ImageIcon, MonitorPlay, Download, Share2 } from "lucide-react";
import Image from "next/image";
import { BeforeAfterSlider } from "@/components/widget/BeforeAfterSlider";
import { Button } from "@/components/ui/button";

interface LeadDetailModalProps {
    lead: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
    if (!lead) return null;

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            contacted: "bg-blue-100 text-blue-800 border-blue-200",
            converted: "bg-green-100 text-green-800 border-green-200",
            rejected: "bg-red-100 text-red-800 border-red-200"
        };

        const labels: Record<string, string> = {
            pending: "Pendiente",
            contacted: "Contactado",
            converted: "Convertido",
            rejected: "Rechazado"
        };

        return (
            <Badge variant="outline" className={`${styles[status] || styles.pending} text-sm px-3 py-1`}>
                {labels[status] || status}
            </Badge>
        );
    };

    // Find linked generation (prioritize image)
    const generation = lead.generations?.find((g: any) => g.type === 'image');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] sm:h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
                <div className="p-6 border-b flex-none bg-background">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <User className="text-primary w-6 h-6" />
                                {lead.name}
                            </DialogTitle>
                            <DialogDescription>
                                Solicitud recibida el {new Date(lead.created_at).toLocaleDateString()}
                            </DialogDescription>
                        </div>
                        <StatusBadge status={lead.status} />
                    </DialogHeader>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
                    {/* Left Column: Details */}
                    <div className="col-span-12 md:col-span-5 border-r bg-muted/10 p-6 space-y-6 overflow-y-auto">

                        {/* Contact Card */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                Contacto
                            </h3>
                            <div className="bg-card rounded-lg border shadow-sm p-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs text-muted-foreground font-medium">Correo Electrónico</p>
                                        <a href={`mailto:${lead.email}`} className="text-sm font-semibold hover:underline truncate block">
                                            {lead.email}
                                        </a>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Teléfono</p>
                                        <a href={`tel:${lead.phone}`} className="text-sm font-semibold hover:underline">
                                            {lead.phone}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                Acciones Rápidas
                            </h3>
                            <div className="grid gap-2">
                                <Button className="w-full bg-green-600 hover:bg-green-700 font-bold" size="lg">
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Contactar por WhatsApp
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="w-full">
                                        Marcar Contactado
                                    </Button>
                                    <Button variant="secondary" className="w-full">
                                        Archivar
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Visual Result */}
                    <div className="col-span-12 md:col-span-7 bg-zinc-950 p-0 relative flex flex-col justify-center items-center overflow-hidden">
                        {generation ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <div className="relative h-full w-full p-4 flex items-center justify-center">
                                    <div className="relative h-full w-full max-w-[400px] aspect-[9/16]">
                                        {generation.input_path && generation.input_path !== 'unknown' ? (
                                            <BeforeAfterSlider
                                                beforeImage={generation.input_path}
                                                afterImage={generation.output_path}
                                            />
                                        ) : (
                                            <img
                                                src={generation.output_path}
                                                alt="Generated Smile"
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-6 right-6 flex gap-2 z-10">
                                    <Button size="icon" variant="secondary" className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md transition-all">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground p-8">
                                <MonitorPlay className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>Sin visualización disponible</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
