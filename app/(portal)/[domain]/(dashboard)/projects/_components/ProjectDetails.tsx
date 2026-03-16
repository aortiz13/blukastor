'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Building2, Globe, MapPin, FileText,
    Instagram, Facebook, Linkedin, Twitter, Youtube, MessageCircle,
    Sparkles, Eye
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface ProjectDetailsProps {
    project: any
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card className="border border-gray-100">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function DetailField({ label, value, emptyText }: { label: string; value?: string | null; icon?: React.ReactNode; emptyText: string }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            {value ? (
                <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
            ) : (
                <p className="text-sm text-gray-300 italic">{emptyText}</p>
            )}
        </div>
    )
}

function SocialLink({ label, url, icon }: { label: string; url?: string | null; icon: React.ReactNode }) {
    if (!url) return null
    return (
        <a
            href={url.startsWith('http') ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-sm text-gray-700"
        >
            {icon}
            <span className="truncate">{label}</span>
        </a>
    )
}

export function ProjectDetails({ project }: ProjectDetailsProps) {
    const { t } = useTranslation()

    const hasSocials = project.social_instagram || project.social_facebook || project.social_linkedin ||
        project.social_twitter || project.social_youtube || project.social_tiktok || project.social_whatsapp ||
        project.website_url

    const hasIdentity = project.tagline || project.description || project.mission || project.vision || project.values_text

    const hasCorporate = project.country || project.address || project.tax_id

    const isEmpty = !hasIdentity && !hasSocials && !hasCorporate

    return (
        <div className="space-y-6">
            {isEmpty && (
                <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                            <Sparkles className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">{t('projectDetails.completeDetails')}</h3>
                        <p className="text-sm text-gray-500 max-w-md mb-4">
                            {t('projectDetails.useChat')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-4 py-2 rounded-full font-medium">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t('projectDetails.clickChat')}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Identity */}
            {hasIdentity && (
                <DetailSection title={t('projectDetails.identity')} icon={<Building2 className="w-4 h-4 text-blue-500" />}>
                    <div className="space-y-4">
                        {project.tagline && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-blue-800 font-medium text-sm italic">"{project.tagline}"</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DetailField label={t('projectDetails.description')} value={project.description} emptyText={t('projectDetails.noInfo')} />
                            <DetailField label={t('projectDetails.mission')} value={project.mission} emptyText={t('projectDetails.noInfo')} />
                            <DetailField label={t('projectDetails.vision')} value={project.vision} emptyText={t('projectDetails.noInfo')} />
                            <DetailField label={t('projectDetails.values')} value={project.values_text} emptyText={t('projectDetails.noInfo')} />
                        </div>
                    </div>
                </DetailSection>
            )}

            {/* Social */}
            {hasSocials && (
                <DetailSection title={t('projectDetails.webSocial')} icon={<Globe className="w-4 h-4 text-green-500" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        <SocialLink label={project.website_url || t('projectDetails.website')} url={project.website_url} icon={<Globe className="w-4 h-4 text-gray-500" />} />
                        <SocialLink label="Instagram" url={project.social_instagram} icon={<Instagram className="w-4 h-4 text-pink-500" />} />
                        <SocialLink label="Facebook" url={project.social_facebook} icon={<Facebook className="w-4 h-4 text-blue-600" />} />
                        <SocialLink label="LinkedIn" url={project.social_linkedin} icon={<Linkedin className="w-4 h-4 text-blue-700" />} />
                        <SocialLink label="Twitter / X" url={project.social_twitter} icon={<Twitter className="w-4 h-4 text-gray-700" />} />
                        <SocialLink label="YouTube" url={project.social_youtube} icon={<Youtube className="w-4 h-4 text-red-500" />} />
                        <SocialLink label="WhatsApp" url={project.social_whatsapp} icon={<MessageCircle className="w-4 h-4 text-green-500" />} />
                    </div>
                </DetailSection>
            )}

            {/* Corporate */}
            {hasCorporate && (
                <DetailSection title={t('projectDetails.corporateInfo')} icon={<FileText className="w-4 h-4 text-purple-500" />}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DetailField label={t('projectDetails.country')} value={project.country} emptyText={t('projectDetails.noInfo')} />
                        <DetailField label={t('projectDetails.address')} value={project.address} emptyText={t('projectDetails.noInfo')} />
                        <DetailField label={t('projectDetails.taxId')} value={project.tax_id} emptyText={t('projectDetails.noInfo')} />
                    </div>
                </DetailSection>
            )}
        </div>
    )
}
