'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Upload, Palette, Globe, Loader2, Type, Building2,
    Share2, MapPin, Settings, Image, Save, ChevronDown, ChevronUp,
    Instagram, Facebook, Linkedin, Twitter, Youtube, MessageCircle
} from 'lucide-react'

interface BrandingFormProps {
    companyId: string
    initialData: Record<string, any>
}

interface SectionProps {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
    onSave: () => void
    loading: boolean
}

function Section({ title, icon, children, defaultOpen = false, onSave, loading }: SectionProps) {
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
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
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
                        Guardar {title}
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
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
            </div>
        </div>
    )
}

function LogoPreview({ url, name, size = 'md' }: { url: string; name: string; size?: 'sm' | 'md' }) {
    const sizeClass = size === 'sm' ? 'w-16 h-16' : 'w-24 h-24'
    return url ? (
        <div className={`${sizeClass} rounded-xl overflow-hidden border border-gray-200 flex-shrink-0`}>
            <img src={url} alt={name} className="w-full h-full object-contain bg-gray-50" />
        </div>
    ) : (
        <div className={`${sizeClass} rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black ${size === 'sm' ? 'text-xl' : 'text-3xl'} flex-shrink-0`}>
            {name?.charAt(0)?.toUpperCase() || '?'}
        </div>
    )
}

export function BrandingForm({ companyId, initialData }: BrandingFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const frontendConfig = (initialData.frontend_config || {}) as Record<string, any>

    // --- State for all sections ---
    // Logos
    const [logoUrl, setLogoUrl] = useState(initialData.logo_url || '')
    const [logoDarkUrl, setLogoDarkUrl] = useState(initialData.logo_dark_url || '')
    const [logoIconUrl, setLogoIconUrl] = useState(initialData.logo_icon_url || '')
    const [faviconUrl, setFaviconUrl] = useState(initialData.favicon_url || '')
    const [coverImageUrl, setCoverImageUrl] = useState(initialData.cover_image_url || '')

    // Colors
    const [primaryColor, setPrimaryColor] = useState(initialData.primary_color || '#6366f1')
    const [secondaryColor, setSecondaryColor] = useState(initialData.secondary_color || '#8b5cf6')
    const [accentColor, setAccentColor] = useState(initialData.accent_color || '#f59e0b')

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
    const [customDomain, setCustomDomain] = useState(initialData.custom_domain || '')
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

    // --- Save handler ---
    const saveFields = async (fields: Record<string, any>) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/companies/${companyId}/branding`, {
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

    return (
        <div className="space-y-4">
            {/* ── 1. Logos ── */}
            <Section
                title="Logos e Imágenes"
                icon={<Image className="w-5 h-5" />}
                defaultOpen={true}
                loading={loading}
                onSave={() => saveFields({
                    logo_url: logoUrl,
                    logo_dark_url: logoDarkUrl,
                    logo_icon_url: logoIconUrl,
                    favicon_url: faviconUrl,
                    cover_image_url: coverImageUrl,
                })}
            >
                <div className="flex items-start gap-6 mb-4">
                    <LogoPreview url={logoUrl} name={initialData.name} />
                    <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">
                            Este logo aparecerá en el portal corporativo, login, sidebar y comunicaciones.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Logo Principal (URL)" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." hint="Fondo claro — formato horizontal recomendado" />
                    <InputField label="Logo Oscuro (URL)" value={logoDarkUrl} onChange={setLogoDarkUrl} placeholder="https://..." hint="Para fondos oscuros / dark mode" />
                    <InputField label="Isotipo / Ícono (URL)" value={logoIconUrl} onChange={setLogoIconUrl} placeholder="https://..." hint="Versión cuadrada para avatares y favicon" />
                    <InputField label="Favicon (URL)" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://..." hint="Ícono del navegador — 32x32 o .ico" />
                </div>
                <InputField label="Imagen de Portada (URL)" value={coverImageUrl} onChange={setCoverImageUrl} placeholder="https://..." hint="Usada en headers, banners y fondo de login" />
            </Section>

            {/* ── 2. Colores ── */}
            <Section
                title="Paleta de Colores"
                icon={<Palette className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({ primary_color: primaryColor, secondary_color: secondaryColor, accent_color: accentColor })}
            >
                {/* Preview bar */}
                <div className="flex rounded-xl overflow-hidden h-10 mb-2">
                    <div className="flex-1" style={{ backgroundColor: primaryColor }} />
                    <div className="flex-1" style={{ backgroundColor: secondaryColor }} />
                    <div className="flex-1" style={{ backgroundColor: accentColor }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ColorField label="Color Primario" value={primaryColor} onChange={setPrimaryColor} />
                    <ColorField label="Color Secundario" value={secondaryColor} onChange={setSecondaryColor} />
                    <ColorField label="Color de Acento" value={accentColor} onChange={setAccentColor} />
                </div>
            </Section>

            {/* ── 3. Tipografía ── */}
            <Section
                title="Tipografía"
                icon={<Type className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({ font_heading: fontHeading, font_body: fontBody })}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <InputField label="Fuente de Títulos" value={fontHeading} onChange={setFontHeading} placeholder="Inter" hint="Google Fonts: Inter, Poppins, Outfit, etc." />
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-lg font-bold" style={{ fontFamily: fontHeading }}>Vista previa de título</p>
                        </div>
                    </div>
                    <div>
                        <InputField label="Fuente de Cuerpo" value={fontBody} onChange={setFontBody} placeholder="Inter" hint="Google Fonts: Inter, Roboto, Open Sans, etc." />
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm" style={{ fontFamily: fontBody }}>Vista previa del texto de cuerpo con esta fuente.</p>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── 4. Identidad Corporativa ── */}
            <Section
                title="Identidad Corporativa"
                icon={<Building2 className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({ tagline, description, mission, vision, values_text: valuesText })}
            >
                <InputField label="Tagline / Slogan" value={tagline} onChange={setTagline} placeholder="Tu frase que define la marca" />
                <TextareaField label="Descripción de la Empresa" value={description} onChange={setDescription} placeholder="Breve descripción de lo que hace la empresa..." rows={3} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextareaField label="Misión" value={mission} onChange={setMission} placeholder="¿Cuál es la misión de la empresa?" rows={3} />
                    <TextareaField label="Visión" value={vision} onChange={setVision} placeholder="¿Cuál es la visión de la empresa?" rows={3} />
                </div>
                <TextareaField label="Valores" value={valuesText} onChange={setValuesText} placeholder="Valores fundamentales de la empresa (separados por comas o en líneas)" rows={3} />
            </Section>

            {/* ── 5. Redes Sociales & Web ── */}
            <Section
                title="Presencia Web & Redes Sociales"
                icon={<Share2 className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({
                    website_url: websiteUrl,
                    social_instagram: socialInstagram,
                    social_facebook: socialFacebook,
                    social_linkedin: socialLinkedin,
                    social_twitter: socialTwitter,
                    social_youtube: socialYoutube,
                    social_tiktok: socialTiktok,
                    social_whatsapp: socialWhatsapp,
                })}
            >
                <InputField label="Sitio Web" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://www.miempresa.com" type="url" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                        <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0" />
                        <InputField label="Instagram" value={socialInstagram} onChange={setSocialInstagram} placeholder="@miempresa o URL" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Facebook className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <InputField label="Facebook" value={socialFacebook} onChange={setSocialFacebook} placeholder="URL de la página" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Linkedin className="w-5 h-5 text-blue-700 flex-shrink-0" />
                        <InputField label="LinkedIn" value={socialLinkedin} onChange={setSocialLinkedin} placeholder="URL del perfil" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Twitter className="w-5 h-5 text-gray-900 flex-shrink-0" />
                        <InputField label="X (Twitter)" value={socialTwitter} onChange={setSocialTwitter} placeholder="@miempresa" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Youtube className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <InputField label="YouTube" value={socialYoutube} onChange={setSocialYoutube} placeholder="URL del canal" />
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-900 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.25a8.28 8.28 0 004.85 1.55V7.37a4.83 4.83 0 01-1.09-.68z" /></svg>
                        <InputField label="TikTok" value={socialTiktok} onChange={setSocialTiktok} placeholder="@miempresa" />
                    </div>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <InputField label="WhatsApp" value={socialWhatsapp} onChange={setSocialWhatsapp} placeholder="+56912345678" />
                    </div>
                </div>
            </Section>

            {/* ── 6. Datos Corporativos ── */}
            <Section
                title="Datos Corporativos"
                icon={<MapPin className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({ country, address, tax_id: taxId, timezone, locale })}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="País" value={country} onChange={setCountry} placeholder="Chile" />
                    <InputField label="RUT / Tax ID" value={taxId} onChange={setTaxId} placeholder="76.123.456-7" />
                </div>
                <InputField label="Dirección" value={address} onChange={setAddress} placeholder="Av. Principal 123, Santiago, Chile" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zona Horaria</label>
                        <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
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
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
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
                title="Personalización del Portal"
                icon={<Settings className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({
                    frontend_config: {
                        portal: {
                            login_background_url: loginBgUrl,
                            login_welcome_text: loginWelcomeText,
                            sidebar_style: sidebarStyle,
                            border_radius: borderRadius,
                            powered_by_visible: poweredByVisible,
                        }
                    }
                })}
            >
                <InputField label="Imagen de Fondo del Login (URL)" value={loginBgUrl} onChange={setLoginBgUrl} placeholder="https://..." hint="Imagen de fondo para la pantalla de login corporativo" />
                <InputField label="Texto de Bienvenida (Login)" value={loginWelcomeText} onChange={setLoginWelcomeText} placeholder="Bienvenido al portal de Mi Empresa" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estilo del Sidebar</label>
                        <select
                            value={sidebarStyle}
                            onChange={(e) => setSidebarStyle(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
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
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
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
                        id="powered-by"
                        checked={poweredByVisible}
                        onChange={(e) => setPoweredByVisible(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="powered-by" className="text-sm font-semibold text-gray-700">
                        Mostrar &quot;Powered by Blukastor&quot; en el portal
                    </label>
                </div>
            </Section>

            {/* ── 8. Dominio Personalizado ── */}
            <Section
                title="Dominio Personalizado"
                icon={<Globe className="w-5 h-5" />}
                loading={loading}
                onSave={() => saveFields({ custom_domain: customDomain })}
            >
                <InputField
                    label="Dominio"
                    value={customDomain}
                    onChange={setCustomDomain}
                    placeholder="app.miempresa.com"
                    hint="Configura un CNAME en tu DNS apuntando a: blukastor.app"
                />
            </Section>
        </div>
    )
}
