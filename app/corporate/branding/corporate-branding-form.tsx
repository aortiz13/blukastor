'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Upload, Palette, Globe, Loader2, Type, Building2,
    Share2, MapPin, Settings, Image, Save,
    Instagram, Facebook, Linkedin, Twitter, Youtube, MessageCircle,
    Eye, X as XIcon, Lock
} from 'lucide-react'

interface CorporateBrandingFormProps {
    initialData: Record<string, any>
    canEdit: boolean
    saveEndpoint?: string
    companyIdOverride?: string
    isSuperAdmin?: boolean
    mode?: 'corporate' | 'project' | 'portal'
}

const GOOGLE_FONTS: { value: string; category: string }[] = [
    // Sans-serif
    { value: 'Inter', category: 'Sans-serif' },
    { value: 'Roboto', category: 'Sans-serif' },
    { value: 'Open Sans', category: 'Sans-serif' },
    { value: 'Lato', category: 'Sans-serif' },
    { value: 'Montserrat', category: 'Sans-serif' },
    { value: 'Poppins', category: 'Sans-serif' },
    { value: 'Outfit', category: 'Sans-serif' },
    { value: 'Nunito', category: 'Sans-serif' },
    { value: 'Nunito Sans', category: 'Sans-serif' },
    { value: 'Raleway', category: 'Sans-serif' },
    { value: 'Work Sans', category: 'Sans-serif' },
    { value: 'DM Sans', category: 'Sans-serif' },
    { value: 'Plus Jakarta Sans', category: 'Sans-serif' },
    { value: 'Manrope', category: 'Sans-serif' },
    { value: 'Figtree', category: 'Sans-serif' },
    { value: 'Source Sans 3', category: 'Sans-serif' },
    { value: 'Mulish', category: 'Sans-serif' },
    { value: 'Cabin', category: 'Sans-serif' },
    { value: 'Quicksand', category: 'Sans-serif' },
    { value: 'Barlow', category: 'Sans-serif' },
    { value: 'Rubik', category: 'Sans-serif' },
    { value: 'Lexend', category: 'Sans-serif' },
    { value: 'Sora', category: 'Sans-serif' },
    { value: 'Space Grotesk', category: 'Sans-serif' },
    // Serif
    { value: 'Playfair Display', category: 'Serif' },
    { value: 'Merriweather', category: 'Serif' },
    { value: 'Lora', category: 'Serif' },
    { value: 'PT Serif', category: 'Serif' },
    { value: 'Libre Baskerville', category: 'Serif' },
    { value: 'EB Garamond', category: 'Serif' },
    { value: 'Crimson Text', category: 'Serif' },
    { value: 'Source Serif 4', category: 'Serif' },
    // Display
    { value: 'Bebas Neue', category: 'Display' },
    { value: 'Oswald', category: 'Display' },
    { value: 'Cormorant Garamond', category: 'Display' },
    { value: 'Abril Fatface', category: 'Display' },
    // Monospace
    { value: 'JetBrains Mono', category: 'Monospace' },
    { value: 'Fira Code', category: 'Monospace' },
    { value: 'IBM Plex Mono', category: 'Monospace' },
]

// ─── Reusable Field Components ──────────────────────────────────────

function InputField({ label, value, onChange, placeholder, type = 'text', hint, disabled }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string; disabled?: boolean
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
            />
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    )
}

function TextareaField({ label, value, onChange, placeholder, rows = 3, disabled }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
        </div>
    )
}

function ColorField({ label, value, onChange, disabled, hint }: {
    label: string; value: string; onChange: (v: string) => void; disabled?: boolean; hint?: string
}) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">{label}</label>
                {hint && (
                    <div className="relative group">
                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center cursor-help text-gray-400 hover:bg-indigo-100 hover:text-indigo-500 transition-colors">
                            <span className="text-[10px] font-bold leading-none">i</span>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                            {hint}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                        </div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer disabled:opacity-50"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition disabled:bg-gray-50 disabled:text-gray-500"
                />
            </div>
        </div>
    )
}

function ImageUploadField({ label, value, onChange, assetType, companyId, hint, disabled }: {
    label: string
    value: string
    onChange: (v: string) => void
    assetType: string
    companyId: string
    hint?: string
    disabled?: boolean
}) {
    const [uploading, setUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = useCallback(async (file: File) => {
        if (disabled) return
        const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon']
        if (!allowed.includes(file.type)) {
            alert('Formato no soportado. Usa PNG, JPG, GIF, WebP o SVG.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 5MB.')
            return
        }
        setUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('companyId', companyId)
            fd.append('type', assetType)
            const res = await fetch('/api/corporate/upload-branding', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onChange(data.url)
        } catch (err: any) {
            alert(`Error subiendo: ${err.message}`)
        } finally {
            setUploading(false)
        }
    }, [disabled, companyId, assetType, onChange])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (disabled) return
        const file = e.dataTransfer.files?.[0]
        if (file) handleUpload(file)
    }, [disabled, handleUpload])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        if (!disabled) setIsDragging(true)
    }, [disabled])

    const handleDragLeave = useCallback(() => setIsDragging(false), [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleUpload(file)
        e.target.value = '' // reset
    }, [handleUpload])

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !disabled && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging
                    ? 'border-indigo-400 bg-indigo-50/50 scale-[1.01]'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {uploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-semibold">Subiendo...</span>
                        </div>
                    </div>
                )}

                {value ? (
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
                            <img src={value} alt={label} className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-xs text-gray-500 truncate">{value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Arrastra otra imagen o haz clic para reemplazar</p>
                        </div>
                        {!disabled && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onChange('') }}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition"
                                title="Eliminar"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="py-2">
                        <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-sm text-gray-500 font-medium">Arrastra tu imagen aquí</p>
                        <p className="text-xs text-gray-400 mt-0.5">o haz clic para seleccionar · PNG, JPG, SVG · Max 5MB</p>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            <div className="mt-2">
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="O pega una URL: https://..."
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-xs text-gray-600 disabled:bg-gray-50 disabled:text-gray-400"
                />
            </div>
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    )
}

// ─── Save Button ────────────────────────────────────────────────────

function SaveButton({ onClick, loading, canEdit }: { onClick: () => void; loading: boolean; canEdit: boolean }) {
    if (!canEdit) return null
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="mt-6 w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
        </button>
    )
}

// ─── Tab definitions ────────────────────────────────────────────────

type TabId = 'logos' | 'colors' | 'typography' | 'identity' | 'social' | 'config'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'logos', label: 'Logos', icon: <Image className="w-4 h-4" /> },
    { id: 'colors', label: 'Colores', icon: <Palette className="w-4 h-4" /> },
    { id: 'typography', label: 'Tipografía', icon: <Type className="w-4 h-4" /> },
    { id: 'identity', label: 'Identidad', icon: <Building2 className="w-4 h-4" /> },
    { id: 'social', label: 'Redes', icon: <Share2 className="w-4 h-4" /> },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-4 h-4" /> },
]

const PROJECT_TABS: TabId[] = ['logos', 'colors', 'typography', 'identity', 'social']

// ─── Main Component ─────────────────────────────────────────────────

export function CorporateBrandingForm({ initialData, canEdit, saveEndpoint, companyIdOverride, isSuperAdmin = false, mode = 'corporate' }: CorporateBrandingFormProps) {
    const isProjectMode = mode === 'project'
    const isPortalMode = mode === 'portal'
    const hidePreview = isProjectMode || isPortalMode
    const visibleTabs = (isProjectMode || isPortalMode) ? TABS.filter(t => PROJECT_TABS.includes(t.id)) : TABS
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>('logos')
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
    const frontendConfig = (initialData.frontend_config || {}) as Record<string, any>
    const disabled = !canEdit
    const companyId = companyIdOverride || initialData.id || ''

    // --- State for all sections ---
    // Logos
    const [logoUrl, setLogoUrl] = useState(initialData.logo_url || '')
    const [logoDarkUrl, setLogoDarkUrl] = useState(initialData.logo_dark_url || '')
    const [logoIconUrl, setLogoIconUrl] = useState(initialData.logo_icon_url || '')
    const [faviconUrl, setFaviconUrl] = useState(initialData.favicon_url || '')
    const [coverImageUrl, setCoverImageUrl] = useState(initialData.cover_image_url || '')
    const [coverImageMobileUrl, setCoverImageMobileUrl] = useState(initialData.cover_image_mobile_url || '')

    // Colors
    const [primaryColor, setPrimaryColor] = useState(initialData.primary_color || '#6366f1')
    const [secondaryColor, setSecondaryColor] = useState(initialData.secondary_color || '#8b5cf6')
    const [accentColor, setAccentColor] = useState(initialData.accent_color || '#f59e0b')
    const [loginBgColor, setLoginBgColor] = useState(initialData.login_bg_color || '#ffffff')

    // Typography
    const [fontHeading, setFontHeading] = useState(initialData.font_heading || 'Inter')
    const [fontBody, setFontBody] = useState(initialData.font_body || 'Inter')

    // Identity
    const [tagline, setTagline] = useState(initialData.tagline || '')
    const [description, setDescription] = useState(initialData.description || '')
    const [mission, setMission] = useState(initialData.mission || '')
    const [vision, setVision] = useState(initialData.vision || '')
    const [valuesText, setValuesText] = useState(initialData.values_text || '')

    // Web & Social
    const [websiteUrl, setWebsiteUrl] = useState(initialData.website_url || '')
    const [socialInstagram, setSocialInstagram] = useState(initialData.social_instagram || '')
    const [socialFacebook, setSocialFacebook] = useState(initialData.social_facebook || '')
    const [socialLinkedin, setSocialLinkedin] = useState(initialData.social_linkedin || '')
    const [socialTwitter, setSocialTwitter] = useState(initialData.social_twitter || '')
    const [socialYoutube, setSocialYoutube] = useState(initialData.social_youtube || '')
    const [socialTiktok, setSocialTiktok] = useState(initialData.social_tiktok || '')
    const [socialWhatsapp, setSocialWhatsapp] = useState(initialData.social_whatsapp || '')

    // Corporate Data
    const [country, setCountry] = useState(initialData.country || '')
    const [address, setAddress] = useState(initialData.address || '')
    const [taxId, setTaxId] = useState(initialData.tax_id || '')
    const [timezone, setTimezone] = useState(initialData.timezone || 'America/Santiago')
    const [locale, setLocale] = useState(initialData.locale || 'es')

    // Portal customization (from frontend_config)
    const [loginWelcomeText, setLoginWelcomeText] = useState(frontendConfig.portal?.login_welcome_text || '')
    const sidebarStyle = frontendConfig.portal?.sidebar_style || 'light'
    const borderRadius = frontendConfig.portal?.border_radius || 'rounded'
    const [poweredByVisible, setPoweredByVisible] = useState(frontendConfig.portal?.powered_by_visible !== false)

    // --- Save handler (uses corporate API) ---
    const saveFields = async (fields: Record<string, any>) => {
        if (!canEdit) return
        setLoading(true)
        try {
            const endpoint = saveEndpoint || '/api/corporate/company-branding'
            const payload = companyId ? { ...fields, companyId } : fields
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            router.refresh()
            alert('Guardado exitosamente')
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    // ─── Preview Panels ─────────────────────────────────────────────

    // Tiny SVG icons matching the actual Lucide icons in the portal sidebar
    const miniIcon = (d: string, active = false) => (
        <svg className="w-[10px] h-[10px] shrink-0" viewBox="0 0 24 24" fill="none" stroke={active ? 'white' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
        </svg>
    )
    const PREVIEW_NAV = [
        { label: 'Finanzas', iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
        { label: 'Agentes Virtuales', iconPath: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
        { label: 'Proyectos', iconPath: 'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2' },
        { label: 'Mis Equipos', iconPath: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
        { label: 'Metas', iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z' },
        { label: 'Contenido', iconPath: 'M9 18l6-6-6-6' },
    ]
    const PREVIEW_BOTTOM_NAV = [
        { label: 'Mi Perfil', iconPath: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
        { label: 'Ajustes', iconPath: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
    ]

    const LoginPreviewDesktop = () => (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 flex aspect-[16/10]">
            {/* Left: Cover */}
            <div className="w-1/2 relative bg-gray-900 overflow-hidden">
                {coverImageUrl ? (
                    <img src={coverImageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 opacity-60" />
                )}
            </div>
            {/* Right: Form */}
            <div className="w-1/2 flex flex-col items-center justify-center p-4 relative" style={{ backgroundColor: loginBgColor }}>
                {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-6 object-contain mb-2" />
                ) : (
                    <Building2 className="w-6 h-6 text-gray-300 mb-2" />
                )}
                <h3 className="text-[10px] font-bold text-gray-800 mb-0.5 text-center" style={{ fontFamily: fontHeading }}>
                    {loginWelcomeText || 'Bienvenido'}
                </h3>
                <p className="text-[7px] text-gray-400 mb-2 text-center" style={{ fontFamily: fontBody }}>
                    Accede a tu cuenta corporativa.
                </p>
                <div className="w-full space-y-1.5">
                    <div className="h-5 rounded-lg border border-gray-200 bg-gray-50/50 w-full" />
                    <div className="h-5 rounded-lg border border-gray-200 bg-gray-50/50 w-full" />
                    <div className="h-5 rounded-lg w-full flex items-center justify-center text-white text-[8px] font-bold shadow-sm" style={{ backgroundColor: primaryColor }}>
                        Entrar
                    </div>
                </div>
                {poweredByVisible && (
                    <p className="absolute bottom-1.5 text-[6px] text-gray-400">Powered by <b>Blukastor</b></p>
                )}
            </div>
        </div>
    )

    const LoginPreviewMobile = () => (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 mx-auto" style={{ maxWidth: 180 }}>
            <div className="relative h-20 bg-gray-900 overflow-hidden">
                {(coverImageMobileUrl || coverImageUrl) ? (
                    <img src={coverImageMobileUrl || coverImageUrl} alt="" className="w-full h-full object-cover opacity-70" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 opacity-60" />
                )}
            </div>
            <div className="flex flex-col items-center p-3 relative" style={{ backgroundColor: loginBgColor }}>
                {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-5 object-contain mb-1.5" />
                ) : (
                    <Building2 className="w-5 h-5 text-gray-300 mb-1.5" />
                )}
                <h3 className="text-[9px] font-bold text-gray-800 mb-0.5 text-center" style={{ fontFamily: fontHeading }}>
                    {loginWelcomeText || 'Bienvenido'}
                </h3>
                <p className="text-[6px] text-gray-400 mb-1.5 text-center" style={{ fontFamily: fontBody }}>
                    Accede a tu cuenta.
                </p>
                <div className="w-full space-y-1">
                    <div className="h-4 rounded-md border border-gray-200 bg-gray-50/50 w-full" />
                    <div className="h-4 rounded-md border border-gray-200 bg-gray-50/50 w-full" />
                    <div className="h-4 rounded-md w-full flex items-center justify-center text-white text-[7px] font-bold" style={{ backgroundColor: primaryColor }}>
                        Entrar
                    </div>
                </div>
                {poweredByVisible && (
                    <p className="mt-1.5 text-[5px] text-gray-400">Powered by <b>Blukastor</b></p>
                )}
            </div>
        </div>
    )

    const PortalPreviewDesktop = () => (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex" style={{ height: 280 }}>
                {/* Sidebar */}
                <div className="w-[140px] flex flex-col border-r border-gray-100 bg-white shrink-0">
                    {/* Logo + Name */}
                    <div className="p-2.5 flex items-center gap-2 border-b border-gray-50">
                        <div className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-[8px] font-bold text-gray-400">{initialData.name?.charAt(0) || 'B'}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-bold text-gray-900 truncate" style={{ fontFamily: fontHeading }}>{initialData.name || 'Empresa'}</p>
                            <p className="text-[5px] text-gray-400 uppercase tracking-wider">Blukastor Portal</p>
                        </div>
                    </div>
                    {/* Nav label */}
                    <div className="px-2.5 pt-2 pb-1">
                        <p className="text-[5px] font-bold text-gray-400 uppercase tracking-widest">Navegación</p>
                    </div>
                    {/* Nav Items */}
                    <div className="px-1.5 space-y-0.5 flex-1">
                        {PREVIEW_NAV.map((item, i) => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[7px] font-medium ${i === 0
                                    ? 'bg-gray-900 text-white'
                                    : 'text-gray-500'
                                    }`}
                            >
                                {miniIcon(item.iconPath, i === 0)}
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                    {/* Bottom */}
                    <div className="px-1.5 pb-2 border-t border-gray-100 pt-1.5 space-y-0.5">
                        {PREVIEW_BOTTOM_NAV.map(item => (
                            <div key={item.label} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[7px] font-medium text-gray-500">
                                {miniIcon(item.iconPath)}
                                <span>{item.label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[7px] font-medium text-red-400">
                            <svg className="w-[10px] h-[10px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                            </svg>
                            <span>Cerrar Sesión</span>
                        </div>
                    </div>
                </div>
                {/* Main Content Area */}
                <div className="flex-1 bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                        <div className="h-2 w-16 rounded" style={{ backgroundColor: `${primaryColor}30` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                        <div className="h-12 rounded-lg bg-white border border-gray-100 p-1.5">
                            <div className="h-1 w-8 rounded mb-1" style={{ backgroundColor: `${primaryColor}25` }} />
                            <div className="text-[9px] font-bold" style={{ color: primaryColor, fontFamily: fontHeading }}>$12.5k</div>
                        </div>
                        <div className="h-12 rounded-lg bg-white border border-gray-100 p-1.5">
                            <div className="h-1 w-6 rounded mb-1" style={{ backgroundColor: `${secondaryColor}25` }} />
                            <div className="text-[9px] font-bold" style={{ color: secondaryColor, fontFamily: fontHeading }}>284</div>
                        </div>
                        <div className="h-12 rounded-lg bg-white border border-gray-100 p-1.5">
                            <div className="h-1 w-7 rounded mb-1" style={{ backgroundColor: `${accentColor}25` }} />
                            <div className="text-[9px] font-bold" style={{ color: accentColor, fontFamily: fontHeading }}>97%</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-100 p-2">
                        <div className="h-1 w-10 bg-gray-200 rounded mb-1.5" />
                        <div className="space-y-1">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${primaryColor}20` }} />
                                <div className="h-1 flex-1 bg-gray-100 rounded" />
                                <div className="h-3 rounded px-1 text-white text-[5px] font-bold flex items-center" style={{ backgroundColor: primaryColor }}>Ver</div>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${secondaryColor}20` }} />
                                <div className="h-1 flex-1 bg-gray-100 rounded" />
                                <div className="h-3 rounded px-1 text-[5px] font-bold flex items-center border" style={{ borderColor: secondaryColor, color: secondaryColor }}>Ver</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const PortalPreviewMobile = () => (
        <div className="mx-auto" style={{ maxWidth: 180 }}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mobile Header */}
                <div className="flex items-center justify-between px-2.5 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                            {logoUrl ? (
                                <img src={logoUrl} alt="" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-[7px] font-bold text-gray-400">{initialData.name?.charAt(0) || 'B'}</span>
                            )}
                        </div>
                        <span className="text-[8px] font-bold text-gray-900" style={{ fontFamily: fontHeading }}>{initialData.name || 'Empresa'}</span>
                    </div>
                    <div className="w-4 h-4 flex flex-col justify-center gap-[2px] px-0.5">
                        <div className="h-[1px] w-full bg-gray-400" />
                        <div className="h-[1px] w-full bg-gray-400" />
                        <div className="h-[1px] w-3/4 bg-gray-400" />
                    </div>
                </div>
                {/* Mobile Content */}
                <div className="bg-gray-50 p-2.5" style={{ height: 180 }}>
                    <div className="flex items-center gap-1 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                        <div className="h-1.5 w-12 rounded" style={{ backgroundColor: `${primaryColor}30` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div className="h-10 rounded-lg bg-white border border-gray-100 p-1.5">
                            <div className="h-1 w-6 rounded mb-1" style={{ backgroundColor: `${primaryColor}25` }} />
                            <div className="text-[8px] font-bold" style={{ color: primaryColor, fontFamily: fontHeading }}>$12.5k</div>
                        </div>
                        <div className="h-10 rounded-lg bg-white border border-gray-100 p-1.5">
                            <div className="h-1 w-5 rounded mb-1" style={{ backgroundColor: `${secondaryColor}25` }} />
                            <div className="text-[8px] font-bold" style={{ color: secondaryColor, fontFamily: fontHeading }}>284</div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-100 p-1.5">
                        <div className="h-1 w-8 bg-gray-200 rounded mb-1" />
                        <div className="space-y-1">
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `${primaryColor}20` }} />
                                <div className="h-1 flex-1 bg-gray-100 rounded" />
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `${secondaryColor}20` }} />
                                <div className="h-1 flex-1 bg-gray-100 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    const TypographyPreview = () => (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Type className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipografía</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
                <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Títulos · {fontHeading}</p>
                    <p className="text-lg font-bold text-gray-900" style={{ fontFamily: fontHeading }}>
                        Título de ejemplo
                    </p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Cuerpo · {fontBody}</p>
                    <p className="text-xs text-gray-600 leading-relaxed" style={{ fontFamily: fontBody }}>
                        Este es un texto de ejemplo para visualizar cómo se verá el contenido del portal.
                    </p>
                </div>
            </div>
        </div>
    )

    const ColorSwatchPreview = () => (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Palette className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Paleta</span>
            </div>
            <div className="flex rounded-xl overflow-hidden h-12 shadow-sm">
                <div className="flex-1 flex items-end justify-center pb-1.5 text-white text-[9px] font-bold" style={{ backgroundColor: primaryColor }}>Primario</div>
                <div className="flex-1 flex items-end justify-center pb-1.5 text-white text-[9px] font-bold" style={{ backgroundColor: secondaryColor }}>Secundario</div>
                <div className="flex-1 flex items-end justify-center pb-1.5 text-white text-[9px] font-bold" style={{ backgroundColor: accentColor }}>Acento</div>
            </div>
        </div>
    )

    // ─── Tab Content Sections ───────────────────────────────────────

    const renderTabContent = () => {
        switch (activeTab) {
            case 'logos':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadField label="Logo Principal" value={logoUrl} onChange={setLogoUrl} assetType="logo" companyId={companyId} hint="Fondo claro — formato horizontal" disabled={disabled} />
                            <ImageUploadField label="Logo Oscuro" value={logoDarkUrl} onChange={setLogoDarkUrl} assetType="logo_dark" companyId={companyId} hint="Para fondos oscuros / dark mode" disabled={disabled} />
                            <ImageUploadField label="Isotipo / Ícono" value={logoIconUrl} onChange={setLogoIconUrl} assetType="icon" companyId={companyId} hint="Versión cuadrada para avatares · 512×512px" disabled={disabled} />
                            {!hidePreview && (
                                <ImageUploadField label="Favicon" value={faviconUrl} onChange={setFaviconUrl} assetType="favicon" companyId={companyId} hint="Ícono del navegador — 32×32px o 64×64px" disabled={disabled} />
                            )}
                        </div>

                        {!hidePreview && (<>
                        <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                            <p className="text-xs font-semibold text-indigo-700 mb-1">📐 Dimensiones recomendadas para portadas</p>
                            <p className="text-xs text-indigo-600">Desktop: <strong>1200×1600px</strong> (Vertical/Cuadrada) · Mobile: <strong>768×1024px</strong> (Vertical)</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ImageUploadField label="Portada Desktop" value={coverImageUrl} onChange={setCoverImageUrl} assetType="cover" companyId={companyId} hint="1200×1600px · Lado izquierdo del login" disabled={disabled} />
                            <ImageUploadField label="Portada Mobile" value={coverImageMobileUrl} onChange={setCoverImageMobileUrl} assetType="cover_mobile" companyId={companyId} hint="768×1024px · Se muestra en dispositivos móviles" disabled={disabled} />
                        </div>
                        </>)}

                        <SaveButton onClick={() => saveFields({
                            logo_url: logoUrl, logo_dark_url: logoDarkUrl, logo_icon_url: logoIconUrl,
                            ...(hidePreview ? {} : { favicon_url: faviconUrl, cover_image_url: coverImageUrl, cover_image_mobile_url: coverImageMobileUrl }),
                        })} loading={loading} canEdit={canEdit} />
                    </div>
                )

            case 'colors':
                return (
                    <div className="space-y-4">
                        <div className="flex rounded-xl overflow-hidden h-10">
                            <div className="flex-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>Primario</div>
                            <div className="flex-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: secondaryColor }}>Secundario</div>
                            <div className="flex-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accentColor }}>Acento</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <ColorField label="Color Primario" value={primaryColor} onChange={setPrimaryColor} disabled={disabled} hint={isProjectMode ? 'Color principal de la marca.' : 'Botones principales, enlaces activos, sidebar del portal y elementos destacados.'} />
                            <ColorField label="Color Secundario" value={secondaryColor} onChange={setSecondaryColor} disabled={disabled} hint="Bordes, botones secundarios, badges y elementos de apoyo visual." />
                            <ColorField label="Color de Acento" value={accentColor} onChange={setAccentColor} disabled={disabled} hint="Notificaciones, indicadores de estado, alertas y elementos que requieren atención." />
                            {!hidePreview && (
                                <ColorField label="Fondo Formulario Login" value={loginBgColor} onChange={setLoginBgColor} disabled={disabled} hint="Color de fondo del panel derecho en la pantalla de inicio de sesión del portal." />
                            )}
                        </div>

                        <SaveButton onClick={() => saveFields({ primary_color: primaryColor, secondary_color: secondaryColor, accent_color: accentColor, ...(hidePreview ? {} : { login_bg_color: loginBgColor }) })} loading={loading} canEdit={canEdit} />
                    </div>
                )

            case 'typography':
                return (
                    <div className="space-y-4">
                        <link
                            rel="stylesheet"
                            href={`https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(f => `family=${f.value.replace(/ /g, '+')}:wght@400;600;700`).join('&')}&display=swap`}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">Fuente de Títulos</label>
                                    <div className="relative group">
                                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center cursor-help text-gray-400 hover:bg-indigo-100 hover:text-indigo-500 transition-colors">
                                            <span className="text-[10px] font-bold leading-none">i</span>
                                        </div>
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                                            Títulos de páginas, encabezados de secciones, nombre de la empresa en el sidebar y textos destacados del portal.
                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                        </div>
                                    </div>
                                </div>
                                <select
                                    value={fontHeading}
                                    onChange={(e) => setFontHeading(e.target.value)}
                                    disabled={disabled}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                    style={{ fontFamily: fontHeading }}
                                >
                                    {GOOGLE_FONTS.map(f => (
                                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                            {f.value} — {f.category}
                                        </option>
                                    ))}
                                </select>
                                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-2xl font-bold text-gray-900" style={{ fontFamily: fontHeading }}>
                                        Título de ejemplo
                                    </p>
                                    <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: fontHeading }}>
                                        ABCDEFGHIJKLM abcdefghijklm 0123456789
                                    </p>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">Fuente de Cuerpo</label>
                                    <div className="relative group">
                                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center cursor-help text-gray-400 hover:bg-indigo-100 hover:text-indigo-500 transition-colors">
                                            <span className="text-[10px] font-bold leading-none">i</span>
                                        </div>
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                                            Texto general del portal: descripciones, párrafos, etiquetas de formularios, tablas, navegación y todo el contenido del cuerpo.
                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                        </div>
                                    </div>
                                </div>
                                <select
                                    value={fontBody}
                                    onChange={(e) => setFontBody(e.target.value)}
                                    disabled={disabled}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                    style={{ fontFamily: fontBody }}
                                >
                                    {GOOGLE_FONTS.map(f => (
                                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                            {f.value} — {f.category}
                                        </option>
                                    ))}
                                </select>
                                <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: fontBody }}>
                                        Este es un texto de ejemplo para visualizar cómo se verá el contenido del portal con esta fuente seleccionada.
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: fontBody }}>
                                        ABCDEFGHIJKLM abcdefghijklm 0123456789
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                            <p className="text-xs text-amber-700">
                                <strong>💡 Tip:</strong> {isProjectMode
                                    ? 'Las fuentes seleccionadas definen la identidad tipográfica de tu marca.'
                                    : 'Las fuentes seleccionadas se aplicarán automáticamente al portal de clientes de tu empresa al guardar.'
                                }
                            </p>
                        </div>

                        <SaveButton onClick={() => saveFields({ font_heading: fontHeading, font_body: fontBody })} loading={loading} canEdit={canEdit} />
                    </div>
                )

            case 'identity':
                return (
                    <div className="space-y-4">
                        <InputField label="Tagline / Slogan" value={tagline} onChange={setTagline} placeholder="Tu frase que define la marca" disabled={disabled} />
                        <TextareaField label="Descripción de la Empresa" value={description} onChange={setDescription} placeholder="Breve descripción de lo que hace la empresa..." rows={3} disabled={disabled} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <TextareaField label="Misión" value={mission} onChange={setMission} placeholder="¿Cuál es la misión de la empresa?" rows={3} disabled={disabled} />
                            <TextareaField label="Visión" value={vision} onChange={setVision} placeholder="¿Cuál es la visión de la empresa?" rows={3} disabled={disabled} />
                        </div>
                        <TextareaField label="Valores" value={valuesText} onChange={setValuesText} placeholder="Valores fundamentales de la empresa (separados por comas)" rows={3} disabled={disabled} />

                        <SaveButton onClick={() => saveFields({ tagline, description, mission, vision, values_text: valuesText })} loading={loading} canEdit={canEdit} />
                    </div>
                )

            case 'social':
                return (
                    <div className="space-y-4">
                        <InputField label="Sitio Web" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://www.miempresa.com" type="url" disabled={disabled} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="flex items-center gap-2">
                                <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0" />
                                <InputField label="Instagram" value={socialInstagram} onChange={setSocialInstagram} placeholder="@miempresa o URL" disabled={disabled} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Facebook className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <InputField label="Facebook" value={socialFacebook} onChange={setSocialFacebook} placeholder="URL de la página" disabled={disabled} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Linkedin className="w-5 h-5 text-blue-700 flex-shrink-0" />
                                <InputField label="LinkedIn" value={socialLinkedin} onChange={setSocialLinkedin} placeholder="URL del perfil" disabled={disabled} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Twitter className="w-5 h-5 text-gray-900 flex-shrink-0" />
                                <InputField label="X (Twitter)" value={socialTwitter} onChange={setSocialTwitter} placeholder="@miempresa" disabled={disabled} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Youtube className="w-5 h-5 text-red-600 flex-shrink-0" />
                                <InputField label="YouTube" value={socialYoutube} onChange={setSocialYoutube} placeholder="URL del canal" disabled={disabled} />
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-900 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.25a8.28 8.28 0 004.85 1.55V7.37a4.83 4.83 0 01-1.09-.68z" /></svg>
                                <InputField label="TikTok" value={socialTiktok} onChange={setSocialTiktok} placeholder="@miempresa" disabled={disabled} />
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <InputField label="WhatsApp" value={socialWhatsapp} onChange={setSocialWhatsapp} placeholder="+56912345678" disabled={disabled} />
                            </div>
                        </div>

                        <SaveButton onClick={() => saveFields({
                            website_url: websiteUrl,
                            social_instagram: socialInstagram, social_facebook: socialFacebook,
                            social_linkedin: socialLinkedin, social_twitter: socialTwitter,
                            social_youtube: socialYoutube, social_tiktok: socialTiktok,
                            social_whatsapp: socialWhatsapp,
                        })} loading={loading} canEdit={canEdit} />
                    </div>
                )

            case 'config':
                return (
                    <div className="space-y-6">
                        {/* ── Datos Corporativos ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-bold text-gray-700">Datos Corporativos</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="País" value={country} onChange={setCountry} placeholder="Chile" disabled={disabled} />
                                <InputField label="RUT / Tax ID" value={taxId} onChange={setTaxId} placeholder="76.123.456-7" disabled={disabled} />
                            </div>
                            <InputField label="Dirección" value={address} onChange={setAddress} placeholder="Av. Principal 123, Santiago, Chile" disabled={disabled} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zona Horaria</label>
                                    <select
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        disabled={disabled}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                    >
                                        <option value="America/Santiago">America/Santiago (GMT-3/-4)</option>
                                        <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (GMT-3)</option>
                                        <option value="America/Bogota">America/Bogota (GMT-5)</option>
                                        <option value="America/Mexico_City">America/Mexico_City (GMT-6)</option>
                                        <option value="America/New_York">America/New_York (GMT-5/-4)</option>
                                        <option value="America/Los_Angeles">America/Los_Angeles (GMT-8/-7)</option>
                                        <option value="Europe/Madrid">Europe/Madrid (GMT+1/+2)</option>
                                        <option value="Europe/London">Europe/London (GMT/+1)</option>
                                        <option value="UTC">UTC</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Idioma</label>
                                    <select
                                        value={locale}
                                        onChange={(e) => setLocale(e.target.value)}
                                        disabled={disabled}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                                    >
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                        <option value="pt">Português</option>
                                        <option value="fr">Français</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* ── Portal Settings ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Settings className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-bold text-gray-700">Portal de Clientes</span>
                            </div>
                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                <p className="text-xs text-blue-700">
                                    <strong>ℹ️ Fondo de login:</strong> Se utiliza la <strong>Imagen de Portada</strong> configurada en la sección &quot;Logos&quot; como fondo de la pantalla de login.
                                </p>
                            </div>
                            <InputField label="Texto de Bienvenida (Login)" value={loginWelcomeText} onChange={setLoginWelcomeText} placeholder="Bienvenido al portal de Mi Empresa" disabled={disabled} />
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="powered-by-corp"
                                    checked={poweredByVisible}
                                    onChange={(e) => setPoweredByVisible(e.target.checked)}
                                    disabled={disabled || !isSuperAdmin}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <label htmlFor="powered-by-corp" className="text-sm font-semibold text-gray-700">
                                    Mostrar &quot;Powered by Blukastor&quot; en el portal de clientes
                                </label>
                                {!isSuperAdmin && (
                                    <div className="relative group">
                                        <Lock className="w-4 h-4 text-amber-500 cursor-help" />
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-gray-900 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                                            Solo el equipo de Blukastor puede modificar esta opción. Contacta a soporte para desactivar la marca de agua.
                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Domain (read-only) */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-bold text-gray-700">Dominio Personalizado</span>
                            </div>
                            <InputField
                                label="Dominio"
                                value={initialData.custom_domain || ''}
                                onChange={() => { }}
                                placeholder="No configurado"
                                hint="El dominio personalizado solo puede ser configurado por el equipo de Blukastor. Contacta a soporte para cambiarlo."
                                disabled={true}
                            />
                        </div>

                        <SaveButton onClick={() => saveFields({
                            country, address, tax_id: taxId, timezone, locale,
                            frontend_config: {
                                portal: {
                                    login_welcome_text: loginWelcomeText,
                                    sidebar_style: sidebarStyle,
                                    border_radius: borderRadius,
                                    powered_by_visible: poweredByVisible,
                                }
                            }
                        })} loading={loading} canEdit={canEdit} />
                    </div>
                )
        }
    }

    // ─── Main Render ────────────────────────────────────────────────

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* ── LEFT COLUMN: Tabs + Form ── */}
            <div className={hidePreview ? 'flex-1 min-w-0' : 'flex-1 min-w-0 lg:max-w-[62%]'}>
                {/* Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {visibleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/40'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Preview Toggle — corporate mode only */}
                {!hidePreview && (
                    <div className="lg:hidden mb-4">
                        <button
                            onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-600 transition"
                        >
                            <Eye className="w-4 h-4" />
                            {mobilePreviewOpen ? 'Ocultar vista previa' : 'Ver vista previa'}
                        </button>
                        {mobilePreviewOpen && (
                            <div className="mt-3 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 p-4 space-y-5">
                                <LoginPreviewDesktop />
                                <PortalPreviewDesktop />
                                {(activeTab === 'typography') && <TypographyPreview />}
                                {(activeTab === 'colors') && <ColorSwatchPreview />}
                            </div>
                        )}
                    </div>
                )}

                {/* Active Tab Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                            {TABS.find(t => t.id === activeTab)?.icon}
                        </div>
                        <h2 className="text-base font-bold text-gray-900">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </h2>
                    </div>
                    {renderTabContent()}
                </div>
            </div>

            {/* ── RIGHT COLUMN: Sticky Preview — corporate mode only ── */}
            {!hidePreview && (
            <div className="hidden lg:block lg:w-[38%]">
                <div className="sticky top-0 space-y-4">
                    <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 p-5">
                        {/* Header with toggle */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vista previa en vivo</span>
                            </div>
                            <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
                                <button
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${previewMode === 'desktop'
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    🖥 Desktop
                                </button>
                                <button
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${previewMode === 'mobile'
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    📱 Mobile
                                </button>
                            </div>
                        </div>

                        {/* Login Preview */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-3 h-3 text-gray-400" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Login</span>
                            </div>
                            {previewMode === 'desktop' ? <LoginPreviewDesktop /> : <LoginPreviewMobile />}
                        </div>

                        {/* Portal Preview */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-3 h-3 text-gray-400" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Portal</span>
                            </div>
                            {previewMode === 'desktop' ? <PortalPreviewDesktop /> : <PortalPreviewMobile />}
                        </div>
                    </div>

                    {/* Contextual preview based on active tab */}
                    {activeTab === 'typography' && (
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 p-5">
                            <TypographyPreview />
                        </div>
                    )}
                    {activeTab === 'colors' && (
                        <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 p-5">
                            <ColorSwatchPreview />
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    )
}
