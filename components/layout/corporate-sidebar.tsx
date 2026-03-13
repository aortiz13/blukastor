'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    FileText,
    ShieldAlert,
    CreditCard,
    TrendingUp,
    LogOut,
    Menu,
    X,
    Building2,
    ChevronDown,
    Palette,
    Bot,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface MemberPermissions {
    modules: string[] // array of module keys: 'dashboard', 'users', 'compliance', 'escalation', 'memberships', 'finance', 'branding', 'agents'
}

interface CorporateSidebarProps {
    companyName: string
    companyId: string
    logoUrl?: string | null
    primaryColor?: string
    isSuperAdmin?: boolean
    availableCompanies?: { id: string; name: string }[]
    userRole?: string
    userPermissions?: MemberPermissions | null
}

const corporateNavigation: { name: string; href: string; icon: any; moduleKey: string }[] = [
    { name: 'Dashboard', href: '/corporate/dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
    { name: 'Usuarios', href: '/corporate/users', icon: Users, moduleKey: 'users' },
    { name: 'Cumplimiento (T&C)', href: '/corporate/compliance', icon: FileText, moduleKey: 'compliance' },
    { name: 'Escalamiento Manual', href: '/corporate/escalation', icon: ShieldAlert, moduleKey: 'escalation' },
    { name: 'Membresías', href: '/corporate/memberships', icon: CreditCard, moduleKey: 'memberships' },
    { name: 'Finanzas Globales', href: '/corporate/finance', icon: TrendingUp, moduleKey: 'finance' },
    { name: 'Branding', href: '/corporate/branding', icon: Palette, moduleKey: 'branding' },
    { name: 'Agentes', href: '/corporate/agents', icon: Bot, moduleKey: 'agents' },
]

export function CorporateSidebar({
    companyName,
    companyId,
    logoUrl,
    primaryColor = '#6366f1',
    isSuperAdmin = false,
    availableCompanies = [],
    userRole,
    userPermissions = null,
}: CorporateSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const supabase = createClient()

    // Filter navigation based on member permissions
    const isMember = userRole === 'member' && userPermissions
    const filteredNavigation = corporateNavigation.filter(item => {
        // Admins and super admins see everything
        if (!isMember) return true
        // Members: check if their module key is in the allowed list
        return userPermissions.modules.includes(item.moduleKey)
    })

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/corporate/login')
    }

    const handleCompanySwitch = (newCompanyId: string) => {
        // Reload with company parameter
        const url = new URL(window.location.href)
        url.searchParams.set('company', newCompanyId)
        window.location.href = url.toString()
    }

    return (
        <>
            {/* Mobile Header */}
            <header className="lg:hidden h-16 border-b bg-white flex items-center justify-between px-4 sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {logoUrl ? (
                            <img src={logoUrl} alt={companyName} className="w-full h-full object-contain rounded-lg" />
                        ) : (
                            <span className="text-white font-bold text-lg">{companyName.charAt(0)}</span>
                        )}
                    </div>
                    <span className="font-bold text-xl tracking-tight">{companyName} <span className="text-gray-400 font-normal text-sm">Portal</span></span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Main Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col h-full",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Desktop Branding */}
                <div className="hidden lg:flex flex-col p-8 pb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                            style={{
                                backgroundColor: primaryColor,
                                boxShadow: `0 10px 15px -3px ${primaryColor}20`,
                            }}
                        >
                            {logoUrl ? (
                                <img src={logoUrl} alt={companyName} className="w-full h-full object-contain rounded-xl" />
                            ) : (
                                <span className="text-white font-bold text-xl">{companyName.charAt(0)}</span>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-xl tracking-tight leading-none">{companyName}</span>
                            <span className="text-gray-400 text-xs mt-1 uppercase tracking-widest font-semibold">Portal Corporativo</span>
                        </div>
                    </div>
                </div>

                {/* Super Admin Company Picker */}
                {isSuperAdmin && availableCompanies.length > 1 && (
                    <div className="px-4 mb-2">
                        <button
                            onClick={() => setIsCompanyPickerOpen(!isCompanyPickerOpen)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 text-sm font-medium text-purple-700 hover:from-purple-100 hover:to-indigo-100 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Building2 size={16} />
                                <span className="truncate max-w-[140px]">{companyName}</span>
                            </div>
                            <ChevronDown size={16} className={cn("transition-transform", isCompanyPickerOpen ? "rotate-180" : "")} />
                        </button>
                        {isCompanyPickerOpen && (
                            <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                                {availableCompanies.map((company) => (
                                    <button
                                        key={company.id}
                                        onClick={() => {
                                            handleCompanySwitch(company.id)
                                            setIsCompanyPickerOpen(false)
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50",
                                            company.id === companyId ? "bg-gray-50 text-black" : "text-gray-600"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {company.name.charAt(0)}
                                            </div>
                                            {company.name}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1 px-4 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {filteredNavigation.map((item) => {
                        const isActive = mounted && pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "text-white shadow-lg"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                )}
                                style={isActive ? {
                                    backgroundColor: primaryColor,
                                    boxShadow: `0 10px 15px -3px ${primaryColor}30`,
                                } : undefined}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <item.icon size={20} className={cn(
                                    "transition-colors",
                                    isActive ? "text-white" : "text-gray-400 group-hover:text-black"
                                )} />
                                <span className="font-medium text-sm">{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-50" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer Section */}
                <div className="p-4 mt-auto">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        {isSuperAdmin && (
                            <Link
                                href="/admin/dashboard"
                                className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-600 hover:bg-white rounded-xl transition-all duration-200 group text-sm font-medium mb-1"
                            >
                                <LayoutDashboard size={18} className="text-gray-400" />
                                <span>Panel Super Admin</span>
                            </Link>
                        )}
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                        >
                            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                            <span className="font-bold text-sm">Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </>
    )
}
