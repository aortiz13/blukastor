import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { Shield } from 'lucide-react'

export default function AdminSettingsPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gray-100 rounded-2xl">
                    <Shield className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración</h1>
                    <p className="text-gray-500 mt-0.5">Administra tu cuenta y seguridad</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <ChangePasswordForm />
            </div>
        </div>
    )
}
