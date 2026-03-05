'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Upload, Palette, Globe, Loader2, Type, Building2,
    Share2, MapPin, Settings, Image, Save, ChevronDown, ChevronUp,
    Instagram, Facebook, Linkedin, Twitter, Youtube, MessageCircle,
    Eye, X as XIcon
} from 'lucide-react'

interface BrandingFormProps {
    companyId: string
    initialData: Record<string, any>
}

interface SectionProps {
    title: string
    subtitle?: string
    icon: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
    onSave: () => void
    loading: boolean
}

const GOOGLE_FONTS: { value: string; category: string }[] = [
    { value: 'Inter', category: 'Sans-serif' },
    { value: 'Roboto', category: 'Sans-serif' },
    { value: 'Open Sans', category: 'Sans-serif' },
    { value: 'Lato', category: 'Sans-serif' },
    { value: 'Montserrat', category: 'Sans-serif' },
    { value: 'Poppins', category: 'Sans-serif' },
    { value: 'Outfit', category: 'Sans-serif' },
    { value: 'Nunito', category: 'Sans-serif' },
    { value: 'Raleway', category: 'Sans-serif' },
    { value: 'DM Sans', category: 'Sans-serif' },
    { value: 'Playfair Display', category: 'Serif' },
    { value: 'Merriweather', category: 'Serif' },
    { value: 'Bebas Neue', category: 'Display' },
    { value: 'JetBrains Mono', category: 'Monospace' },
]

function Section({ title, subtitle, icon, children, defaultOpen = false, onSave, loading }: SectionProps) {
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
                    <button
                        onClick={onSave}
                        disabled={loading}
                        className="mt-5 w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar cambios
                    </button>
                </div>
            )}
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, type = 'text', hint }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
            />
            {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        </div>
    )
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm resize-none"
            />
        </div>
    )
}

function ColorField({ label, value, onChange }: {
    label: string; value: string; onChange: (v: string) => void
}) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <div className="flex gap-2">
                <input
                    type="color"
                    value={value || '#ffffff'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    placeholder="#FFFFFF"
                />
            </div>
        </div>
    )
}

function ImageUploadField({ label, value, onChange, assetType, companyId, hint }: {
    label: string
    value: string
    onChange: (v: string) => void
    assetType: string
    companyId: string
    hint?: string
}) {
    const [uploading, setUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = useCallback(async (file: File) => {
        const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon']
        if (!allowed.includes(file.type)) {
            alert('Formato no soportado. Usa PNG, JPG, GIF, WebP o SVG.')
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
    }, [companyId, assetType, onChange])

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
            <div
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f) }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'}`}
            >
                {uploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    </div>
                )}
                {value ? (
                    <div className="flex items-center gap-3">
                        <img src={value} alt="" className="w-12 h-12 rounded object-contain border border-gray-100" />
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-[10px] text-gray-400 truncate">{value}</p>
                            <p className="text-[10px] text-indigo-500 font-bold">Haz clic o arrastra para cambiar</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onChange('') }} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="py-1">
                        <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Haz clic o arrastra para subir</p>
                    </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }} className="hidden" />
            </div>
            {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
        </div>
    )
}

export default function BrandingForm({ companyId, initialData }: BrandingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const frontendConfig = initialData.frontend_config || {}

    // --- State Management ---
    const [logoUrl, setLogoUrl] = useState(initialData.logo_url || '')
    const [logoDarkUrl, setLogoDarkUrl] = useState(initialData.logo_dark_url || '')
    const [logoIconUrl, setLogoIconUrl] = useState(initialData.logo_icon_url || '')
    const [faviconUrl, setFaviconUrl] = useState(initialData.favicon_url || '')
    const [coverImageUrl, setCoverImageUrl] = useState(initialData.cover_image_url || '')
    const [coverImageMobileUrl, setCoverImageMobileUrl] = useState(initialData.cover_image_mobile_url || '')

    const [primaryColor, setPrimaryColor] = useState(initialData.primary_color || '#6366f1')
    const [secondaryColor, setSecondaryColor] = useState(initialData.secondary_color || '#8b5cf6')
    const [accentColor, setAccentColor] = useState(initialData.accent_color || '#f59e0b')
    const [loginBgColor, setLoginBgColor] = useState(initialData.login_bg_color || '#ffffff')

    const [fontHeading, setFontHeading] = useState(initialData.font_heading || 'Inter')
    const [fontBody, setFontBody] = useState(initialData.font_body || 'Inter')

    const [tagline, setTagline] = useState(initialData.tagline || '')
    const [description, setDescription] = useState(initialData.description || '')
    const [mission, setMission] = useState(initialData.mission || '')
    const [vision, setVision] = useState(initialData.vision || '')
    const [valuesText, setValuesText] = useState(initialData.values_text || '')

    const [websiteUrl, setWebsiteUrl] = useState(initialData.website_url || '')
    const [socialInstagram, setSocialInstagram] = useState(initialData.social_instagram || '')
    const [socialFacebook, setSocialFacebook] = useState(initialData.social_facebook || '')
    const [socialLinkedin, setSocialLinkedin] = useState(initialData.social_linkedin || '')
    const [socialTwitter, setSocialTwitter] = useState(initialData.social_twitter || '')
    const [socialYoutube, setSocialYoutube] = useState(initialData.social_youtube || '')
    const [socialTiktok, setSocialTiktok] = useState(initialData.social_tiktok || '')
    const [socialWhatsapp, setSocialWhatsapp] = useState(initialData.social_whatsapp || '')

    const [country, setCountry] = useState(initialData.country || '')
    const [address, setAddress] = useState(initialData.address || '')
    const [taxId, setTaxId] = useState(initialData.tax_id || '')
    const [timezone, setTimezone] = useState(initialData.timezone || 'America/Santiago')
    const [locale, setLocale] = useState(initialData.locale || 'es')

    const [loginWelcomeText, setLoginWelcomeText] = useState(frontendConfig.portal?.login_welcome_text || '')
    const [sidebarStyle, setSidebarStyle] = useState(frontendConfig.portal?.sidebar_style || 'light')
    const [borderRadius, setBorderRadius] = useState(frontendConfig.portal?.border_radius || 'rounded')
    const [poweredByVisible, setPoweredByVisible] = useState(frontendConfig.portal?.powered_by_visible !== false)
    const [customDomain, setCustomDomain] = useState(initialData.custom_domain || '')

    const saveFields = async (fields: Record<string, any>) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/branding`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Error guardando branding')
            }
            router.refresh()
            alert('Branding actualizado exitosamente')
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
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Previsualización de Login</span>
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
                    <h3 className="text-base font-bold text-gray-900 mb-6 text-center" style={{ fontFamily: fontHeading }}>
                        {loginWelcomeText || 'Bienvenido'}
                    </h3>
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

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <LoginPreview />

            <div className="grid grid-cols-1 gap-6">
                {/* 1. Logos */}
                <Section
                    title="Logos e Imágenes"
                    subtitle="Gestión de archivos visuales de la marca"
                    icon={<Image className="w-5 h-5" />}
                    defaultOpen={true}
                    loading={loading}
                    onSave={() => saveFields({
                        logo_url: logoUrl, logo_dark_url: logoDarkUrl, logo_icon_url: logoIconUrl,
                        favicon_url: faviconUrl, cover_image_url: coverImageUrl, cover_image_mobile_url: coverImageMobileUrl
                    })}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ImageUploadField label="Logo Principal" value={logoUrl} onChange={setLogoUrl} assetType="logo" companyId={companyId} hint="Fondo claro — horizontal" />
                        <ImageUploadField label="Logo Oscuro" value={logoDarkUrl} onChange={setLogoDarkUrl} assetType="logo_dark" companyId={companyId} hint="Para fondos oscuros" />
                        <ImageUploadField label="Isotipo / Ícono" value={logoIconUrl} onChange={setLogoIconUrl} assetType="icon" companyId={companyId} hint="Cuadrado · 512×512px" />
                        <ImageUploadField label="Favicon" value={faviconUrl} onChange={setFaviconUrl} assetType="favicon" companyId={companyId} hint="32×32px o 64×64px" />
                    </div>
                    <div className="mt-4 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mb-4">
                        <p className="text-xs font-semibold text-indigo-700 mb-1">📐 Dimensiones recomendadas para portadas</p>
                        <p className="text-xs text-indigo-600">Desktop: <strong>1200×1600px</strong> (Vertical/Cuadrada) · Mobile: <strong>768×1024px</strong> (Vertical)</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ImageUploadField label="Portada Desktop" value={coverImageUrl} onChange={setCoverImageUrl} assetType="cover" companyId={companyId} hint="1200×1600px · Lado izquierdo del login" />
                        <ImageUploadField label="Portada Mobile" value={coverImageMobileUrl} onChange={setCoverImageMobileUrl} assetType="cover_mobile" companyId={companyId} hint="768×1024px · Versión móvil" />
                    </div>
                </Section>

                {/* 2. Colores */}
                <Section
                    title="Paleta de Colores"
                    subtitle="Identidad cromática del portal"
                    icon={<Palette className="w-5 h-5" />}
                    loading={loading}
                    onSave={() => saveFields({ primary_color: primaryColor, secondary_color: secondaryColor, accent_color: accentColor, login_bg_color: loginBgColor })}
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <ColorField label="Primario" value={primaryColor} onChange={setPrimaryColor} />
                        <ColorField label="Secundario" value={secondaryColor} onChange={setSecondaryColor} />
                        <ColorField label="Acento" value={accentColor} onChange={setAccentColor} />
                        <ColorField label="Fondo Login (Form)" value={loginBgColor} onChange={setLoginBgColor} />
                    </div>
                </Section>

                {/* 3. Tipografía */}
                <Section
                    title="Tipografía"
                    subtitle="Fuentes de Google Fonts"
                    icon={<Type className="w-5 h-5" />}
                    loading={loading}
                    onSave={() => saveFields({ font_heading: fontHeading, font_body: fontBody })}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Títulos</label>
                            <select value={fontHeading} onChange={(e) => setFontHeading(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm">
                                {GOOGLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.value}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cuerpo</label>
                            <select value={fontBody} onChange={(e) => setFontBody(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm">
                                {GOOGLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.value}</option>)}
                            </select>
                        </div>
                    </div>
                </Section>

                {/* 4. Identidad */}
                <Section
                    title="Identidad Corporativa"
                    icon={<Building2 className="w-5 h-5" />}
                    loading={loading}
                    onSave={() => saveFields({ tagline, description, mission, vision, values_text: valuesText })}
                >
                    <InputField label="Tagline" value={tagline} onChange={setTagline} placeholder="Tu slogan..." />
                    <TextareaField label="Descripción" value={description} onChange={setDescription} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextareaField label="Misión" value={mission} onChange={setMission} />
                        <TextareaField label="Visión" value={vision} onChange={setVision} />
                    </div>
                    <TextareaField label="Valores" value={valuesText} onChange={setValuesText} />
                </Section>

                {/* 5. Redes Sociales */}
                <Section
                    title="Redes Sociales & Web"
                    icon={<Share2 className="w-5 h-5" />}
                    loading={loading}
                    onSave={() => saveFields({
                        website_url: websiteUrl, social_instagram: socialInstagram, social_facebook: socialFacebook,
                        social_linkedin: socialLinkedin, social_twitter: socialTwitter, social_youtube: socialYoutube,
                        social_tiktok: socialTiktok, social_whatsapp: socialWhatsapp
                    })}
                >
                    <InputField label="Sitio Web" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://..." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Instagram" value={socialInstagram} onChange={setSocialInstagram} />
                        <InputField label="Facebook" value={socialFacebook} onChange={setSocialFacebook} />
                        <InputField label="LinkedIn" value={socialLinkedin} onChange={setSocialLinkedin} />
                        <InputField label="X (Twitter)" value={socialTwitter} onChange={setSocialTwitter} />
                        <InputField label="WhatsApp" value={socialWhatsapp} onChange={setSocialWhatsapp} />
                    </div>
                </Section>

                {/* 7. Personalización del Portal */}
                <Section
                    title="Personalización del Portal"
                    icon={<Settings className="w-5 h-5" />}
                    loading={loading}
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
                    <InputField label="Texto de Bienvenida (Login)" value={loginWelcomeText} onChange={setLoginWelcomeText} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sidebar</label>
                            <select value={sidebarStyle} onChange={(e) => setSidebarStyle(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm">
                                <option value="light">Claro</option>
                                <option value="dark">Oscuro</option>
                                <option value="branded">Marca</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bordes</label>
                            <select value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm">
                                <option value="sharp">Sharp</option>
                                <option value="rounded">Rounded</option>
                                <option value="pill">Pill</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="powered-by-admin" checked={poweredByVisible} onChange={(e) => setPoweredByVisible(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                        <label htmlFor="powered-by-admin" className="text-sm font-semibold text-gray-700">Powered by Blukastor</label>
                    </div>
                </Section>

                {/* 8. Dominio */}
                <Section
                    title="Dominio Personalizado"
                    icon={<Globe className="w-5 h-5" />}
                    loading={loading}
                    onSave={() => saveFields({ custom_domain: customDomain })}
                >
                    <InputField label="Dominio" value={customDomain} onChange={setCustomDomain} placeholder="app.miempresa.com" hint="Apunta tu CNAME a blukastor.app" />
                </Section>
            </div>
        </div>
    )
}
