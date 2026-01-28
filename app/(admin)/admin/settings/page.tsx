import EmbedConfigurator from "@/components/admin/embed/EmbedConfigurator";

export default function SettingsPage() {
    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-3xl font-heading font-bold text-foreground">Configuración</h2>
                <div className="flex items-center gap-3">
                    <EmbedConfigurator />
                </div>
            </div>
        </div>
    );
}

