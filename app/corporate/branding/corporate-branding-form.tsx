'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Upload, Palette, Globe, Loader2, Type, Building2,
    Share2, MapPin, Settings, Image, Save, ChevronDown, ChevronUp,
    Instagram, Facebook, Linkedin, Twitter, Youtube, MessageCircle,
    Eye, X as XIcon
} from 'lucide-react'

interface CorporateBrandingFormProps {
    initialData: Record<string, any>
    canEdit: boolean
}

interface SectionProps {
    title: string
    subtitle?: string
    icon: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
    onSave?: () => void
    loading?: boolean
    canEdit?: boolean
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

function Section({ title, subtitle, icon, children, defaultOpen = false, onSave, loading, canEdit = true }: SectionProps) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-xl text-gray-600">{icon}</div>
                    <div className="text-left">
                        <h2 className="text-base font-bold text-gray-900">{title}</h2>
                        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-gray-50">
                    <div className="pt-5 space-y-4">
                        {children}
                    </div>
                    {canEdit && onSave && (
                        <button
                            onClick={onSave}
                            disabled={loading}
                            className="mt-5 w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

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

function ColorField({ label, value, onChange, disabled }: {
    label: string; value: string; onChange: (v: string) => void; disabled?: boolean
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
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

            {/* Drop zone */}
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

            {/* Manual URL input */}
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

export function CorporateBrandingForm({ initialData, canEdit }: CorporateBrandingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const frontendConfig = (initialData.frontend_config || {}) as Record<string, any>
    const disabled = !canEdit
    const companyId = initialData.id || ''

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
    const [loginBgUrl, setLoginBgUrl] = useState(frontendConfig.portal?.login_background_url || '')
    const [loginWelcomeText, setLoginWelcomeText] = useState(frontendConfig.portal?.login_welcome_text || '')
    const [sidebarStyle, setSidebarStyle] = useState(frontendConfig.portal?.sidebar_style || 'light')
    const [borderRadius, setBorderRadius] = useState(frontendConfig.portal?.border_radius || 'rounded')
    const [poweredByVisible, setPoweredByVisible] = useState(frontendConfig.portal?.powered_by_visible !== false)

    // --- Save handler (uses corporate API) ---
    const saveFields = async (fields: Record<string, any>) => {
        if (!canEdit) return
        setLoading(true)
        try {
            const res = await fetch('/api/corporate/company-branding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
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

    // --- Login Preview Component ---
    const LoginPreview = () => (
        <div className="bg-gray-100 rounded-3xl p-6 mb-8 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Vista previa de tu Login</span>
            </div>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 flex aspect-video max-w-3xl mx-auto">
                {/* Left: Cover */}
                <div className="w-1/2 relative bg-gray-900 overflow-hidden">
                    {coverImageUrl ? (
                        <img src={coverImageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 opacity-60" />
                    )}
                    <div className="absolute bottom-10 left-10 right-10 text-white">
                        <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: fontHeading }}>
                            {loginWelcomeText || 'Bienvenido'}
                        </h3>
                        <p className="text-sm opacity-80" style={{ fontFamily: fontBody }}>
                            Accede a tu cuenta corporativa.
                        </p>
                    </div>
                </div>
                {/* Right: Form */}
                <div className="w-1/2 flex flex-col items-center justify-center p-8 relative" style={{ backgroundColor: loginBgColor }}>
                    {logoUrl ? (
                        <img src={logoUrl} alt="" className="h-10 object-contain mb-6" />
                    ) : (
                        <Building2 className="w-10 h-10 text-gray-300 mb-6" />
                    )}
                    <div className="w-full space-y-3">
                        <div className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 w-full" />
                        <div className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 w-full" />
                        <div className="h-10 rounded-xl w-full flex items-center justify-center text-white text-sm font-bold shadow-sm" style={{ backgroundColor: primaryColor }}>
                            Entrar
                        </div>
                    </div>
                    {poweredByVisible && (
                        <p className="absolute bottom-4 text-[8px] text-gray-400">Powered by <b>Blukastor</b></p>
                    )}
                </div>
            </div>
        </div>
    )

    // --- Preview card ---
    const PreviewCard = () => (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vista previa del portal</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Mini sidebar preview */}
                <div className="flex h-32">
                    <div className="w-16 flex flex-col items-center py-3 gap-2" style={{ backgroundColor: primaryColor }}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/20" />
                        ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs">
                                {initialData.name?.charAt(0) || 'B'}
                            </div>
                        )}
                        <div className="space-y-1.5 mt-1">
                            <div className="w-6 h-1 bg-white/40 rounded" />
                            <div className="w-6 h-1 bg-white/20 rounded" />
                            <div className="w-6 h-1 bg-white/20 rounded" />
                        </div>
                    </div>
                    <div className="flex-1 p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                            <div className="h-2 w-16 bg-gray-200 rounded" style={{ fontFamily: fontHeading }} />
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            <div className="h-10 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }} />
                            <div className="h-10 rounded-lg" style={{ backgroundColor: `${secondaryColor}15` }} />
                            <div className="h-10 rounded-lg" style={{ backgroundColor: `${accentColor}15` }} />
                        </div>
                        <div className="mt-2 flex gap-1">
                            <div className="h-3 rounded px-2 text-white text-[6px] font-bold flex items-center" style={{ backgroundColor: primaryColor }}>Button</div>
                            <div className="h-3 rounded px-2 text-[6px] font-bold flex items-center border" style={{ borderColor: secondaryColor, color: secondaryColor }}>Link</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-4">
            <LoginPreview />
            <PreviewCard />

            {/* ── 1. Logos ── */}
            <Section
                title="Logos e Imágenes"
                subtitle="Arrastra tus logos o pega una URL directamente"
                icon={<Image className="w-5 h-5" />}
                defaultOpen={true}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({
                    logo_url: logoUrl, logo_dark_url: logoDarkUrl, logo_icon_url: logoIconUrl,
                    favicon_url: faviconUrl, cover_image_url: coverImageUrl, cover_image_mobile_url: coverImageMobileUrl,
                })}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ImageUploadField label="Logo Principal" value={logoUrl} onChange={setLogoUrl} assetType="logo" companyId={companyId} hint="Fondo claro — formato horizontal" disabled={disabled} />
                    <ImageUploadField label="Logo Oscuro" value={logoDarkUrl} onChange={setLogoDarkUrl} assetType="logo_dark" companyId={companyId} hint="Para fondos oscuros / dark mode" disabled={disabled} />
                    <ImageUploadField label="Isotipo / Ícono" value={logoIconUrl} onChange={setLogoIconUrl} assetType="icon" companyId={companyId} hint="Versión cuadrada para avatares · 512×512px" disabled={disabled} />
                    <ImageUploadField label="Favicon" value={faviconUrl} onChange={setFaviconUrl} assetType="favicon" companyId={companyId} hint="Ícono del navegador — 32×32px o 64×64px" disabled={disabled} />
                </div>

                <div className="mt-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">📐 Dimensiones recomendadas para portadas</p>
                    <p className="text-xs text-indigo-600">Desktop: <strong>1200×1600px</strong> (Vertical/Cuadrada) · Mobile: <strong>768×1024px</strong> (Vertical)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <ImageUploadField label="Portada Desktop" value={coverImageUrl} onChange={setCoverImageUrl} assetType="cover" companyId={companyId} hint="1200×1600px · Lado izquierdo del login" disabled={disabled} />
                    <ImageUploadField label="Portada Mobile" value={coverImageMobileUrl} onChange={setCoverImageMobileUrl} assetType="cover_mobile" companyId={companyId} hint="768×1024px · Se muestra en dispositivos móviles" disabled={disabled} />
                </div>
            </Section>

            {/* ── 2. Colores ── */}
            <Section
                title="Paleta de Colores"
                subtitle="Define los colores de tu marca que se aplicarán en todo el portal"
                icon={<Palette className="w-5 h-5" />}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({ primary_color: primaryColor, secondary_color: secondaryColor, accent_color: accentColor, login_bg_color: loginBgColor })}
            >
                <div className="flex rounded-xl overflow-hidden h-10 mb-2">
                    <div className="flex-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>Primario</div>
                    <div className="flex-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: secondaryColor }}>Secundario</div>
                    <div className="flex-1 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: accentColor }}>Acento</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorField label="Color Primario" value={primaryColor} onChange={setPrimaryColor} disabled={disabled} />
                    <ColorField label="Color Secundario" value={secondaryColor} onChange={setSecondaryColor} disabled={disabled} />
                    <ColorField label="Color de Acento" value={accentColor} onChange={setAccentColor} disabled={disabled} />
                    <ColorField label="Fondo Formulario Login" value={loginBgColor} onChange={setLoginBgColor} disabled={disabled} />
                </div>
            </Section>

            {/* ── 3. Tipografía ── */}
            <Section
                title="Tipografía"
                subtitle="Selecciona las fuentes de Google Fonts para tu portal de clientes"
                icon={<Type className="w-5 h-5" />}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({ font_heading: fontHeading, font_body: fontBody })}
            >
                {/* Dynamic Google Fonts loader */}
                <link
                    rel="stylesheet"
                    href={`https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(f => `family=${f.value.replace(/ /g, '+')}:wght@400;600;700`).join('&')}&display=swap`}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fuente de Títulos</label>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fuente de Cuerpo</label>
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

                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl mt-2">
                    <p className="text-xs text-amber-700">
                        <strong>💡 Tip:</strong> Las fuentes seleccionadas se aplicarán automáticamente al portal de clientes de tu empresa al guardar.
                    </p>
                </div>
            </Section>

            {/* ── 4. Identidad Corporativa ── */}
            <Section
                title="Identidad Corporativa"
                subtitle="Misión, visión, valores y descripción de tu empresa"
                icon={<Building2 className="w-5 h-5" />}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({ tagline, description, mission, vision, values_text: valuesText })}
            >
                <InputField label="Tagline / Slogan" value={tagline} onChange={setTagline} placeholder="Tu frase que define la marca" disabled={disabled} />
                <TextareaField label="Descripción de la Empresa" value={description} onChange={setDescription} placeholder="Breve descripción de lo que hace la empresa..." rows={3} disabled={disabled} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextareaField label="Misión" value={mission} onChange={setMission} placeholder="¿Cuál es la misión de la empresa?" rows={3} disabled={disabled} />
                    <TextareaField label="Visión" value={vision} onChange={setVision} placeholder="¿Cuál es la visión de la empresa?" rows={3} disabled={disabled} />
                </div>
                <TextareaField label="Valores" value={valuesText} onChange={setValuesText} placeholder="Valores fundamentales de la empresa (separados por comas)" rows={3} disabled={disabled} />
            </Section>

            {/* ── 5. Redes Sociales & Web ── */}
            <Section
                title="Presencia Web & Redes Sociales"
                subtitle="Links a tus perfiles en redes sociales"
                icon={<Share2 className="w-5 h-5" />}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({
                    website_url: websiteUrl,
                    social_instagram: socialInstagram, social_facebook: socialFacebook,
                    social_linkedin: socialLinkedin, social_twitter: socialTwitter,
                    social_youtube: socialYoutube, social_tiktok: socialTiktok,
                    social_whatsapp: socialWhatsapp,
                })}
            >
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
            </Section>

            {/* ── 6. Datos Corporativos ── */}
            <Section
                title="Datos Corporativos"
                subtitle="Información legal y de ubicación"
                icon={<MapPin className="w-5 h-5" />}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({ country, address, tax_id: taxId, timezone, locale })}
            >
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
            </Section>

            {/* ── 7. Personalización del Portal ── */}
            <Section
                title="Personalización del Portal de Clientes"
                subtitle="Controla cómo se ven las pantallas de tu portal de clientes"
                icon={<Settings className="w-5 h-5" />}
                loading={loading}
                canEdit={canEdit}
                onSave={() => saveFields({
                    frontend_config: {
                        portal: {
                            login_welcome_text: loginWelcomeText,
                            sidebar_style: sidebarStyle,
                            border_radius: borderRadius,
                            powered_by_visible: poweredByVisible,
                        }
                    }
                })}
            >
                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl mb-1">
                    <p className="text-xs text-blue-700">
                        <strong>ℹ️ Fondo de login:</strong> Se utiliza la <strong>Imagen de Portada</strong> configurada en la sección "Logos e Imágenes" como fondo de la pantalla de login.
                    </p>
                </div>
                <InputField label="Texto de Bienvenida (Login)" value={loginWelcomeText} onChange={setLoginWelcomeText} placeholder="Bienvenido al portal de Mi Empresa" disabled={disabled} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estilo del Sidebar</label>
                        <select
                            value={sidebarStyle}
                            onChange={(e) => setSidebarStyle(e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                        >
                            <option value="light">Claro</option>
                            <option value="dark">Oscuro</option>
                            <option value="branded">Con color de marca</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Redondez de Bordes</label>
                        <select
                            value={borderRadius}
                            onChange={(e) => setBorderRadius(e.target.value)}
                            disabled={disabled}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm disabled:bg-gray-50 disabled:text-gray-500"
                        >
                            <option value="sharp">Angulares (sharp)</option>
                            <option value="rounded">Redondeados (rounded)</option>
                            <option value="pill">Muy redondeados (pill)</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="powered-by-corp"
                        checked={poweredByVisible}
                        onChange={(e) => setPoweredByVisible(e.target.checked)}
                        disabled={disabled}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <label htmlFor="powered-by-corp" className="text-sm font-semibold text-gray-700">
                        Mostrar &quot;Powered by Blukastor&quot; en el portal de clientes
                    </label>
                </div>
            </Section>

            {/* ── 8. Dominio (read-only for corporate admins) ── */}
            <Section
                title="Dominio Personalizado"
                subtitle="Configurado por el equipo de Blukastor"
                icon={<Globe className="w-5 h-5" />}
                canEdit={false}
            >
                <InputField
                    label="Dominio"
                    value={initialData.custom_domain || ''}
                    onChange={() => { }}
                    placeholder="No configurado"
                    hint="El dominio personalizado solo puede ser configurado por el equipo de Blukastor. Contacta a soporte para cambiarlo."
                    disabled={true}
                />
            </Section>
        </div>
    )
}
