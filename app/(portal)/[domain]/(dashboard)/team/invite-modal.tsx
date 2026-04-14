'use client'

import { useState } from 'react'
import { inviteUserToProject, revokeInvite, removeMember } from '@/lib/actions/project-sharing'
import { UserPlus, Loader2, Trash2, XCircle, Globe } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SUPPORTED_LOCALES, Locale } from '@/lib/i18n/translations'
import { useTranslation } from '@/lib/i18n/useTranslation'

export function InviteMemberModal({ projectId }: { projectId: string }) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<'editor' | 'viewer'>('editor')
    const [language, setLanguage] = useState<Locale>('es')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [mode, setMode] = useState<'email' | 'link'>('email')
    const [inviteLink, setInviteLink] = useState('')

    // Import the new action here if not already imported at top
    // assuming it is exported from same file
    const { inviteUserToProject, createProjectInviteLink } = require('@/lib/actions/project-sharing')

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (mode === 'email') {
            const res = await inviteUserToProject(projectId, email, role)
            setLoading(false)
            if (res.error) {
                setError(res.error)
            } else {
                setIsOpen(false)
                setEmail('')
            }
        } else {
            // Generate link
            const res = await createProjectInviteLink(projectId, role)
            setLoading(false)
            if (res.error) {
                setError(res.error)
            } else {
                setInviteLink(`${window.location.origin}/invite/${res.token}`)
            }
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink)
        alert(t('invite.linkCopied'))
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm"
            >
                <UserPlus size={18} />
                <span>{t('invite.memberTitle')}</span>
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-2xl font-bold">{t('invite.memberTitle')}</h2>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircle size={24} />
                    </button>
                </div>
                <p className="text-gray-500 text-sm mb-6">{t('invite.manageAccess')}</p>

                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button
                        onClick={() => { setMode('email'); setError(''); setInviteLink('') }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${mode === 'email' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Email
                    </button>
                    <button
                        onClick={() => { setMode('link'); setError(''); setInviteLink('') }}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${mode === 'link' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t('invite.link')}
                    </button>
                </div>

                {/* Language Selector */}
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Globe size={12} /> {t('invite.guestLanguage')}
                    </label>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {SUPPORTED_LOCALES.map(loc => (
                            <button
                                key={loc.code}
                                type="button"
                                onClick={() => setLanguage(loc.code)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                                    language === loc.code ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <span>{loc.flag}</span>
                                <span>{loc.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {mode === 'email' ? (
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                                placeholder={t('invite.emailPlaceholder')}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('invite.role')}</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                            >
                                <option value="editor">{t('invite.roleEditor')}</option>
                                <option value="viewer">{t('invite.roleViewer')}</option>
                            </select>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {t('invite.sendInvite')}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{t('invite.linkRole')}</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                            >
                                <option value="editor">{t('invite.roleEditor')}</option>
                                <option value="viewer">{t('invite.roleViewer')}</option>
                            </select>
                        </div>

                        {inviteLink ? (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">{t('invite.linkGenerated')}</p>
                                <div className="text-sm text-blue-600 break-all font-mono bg-white p-2 rounded border border-blue-100">
                                    {inviteLink}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition"
                                >
                                    {t('invite.copyLink')}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleInvite}
                                disabled={loading}
                                className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {t('invite.generateLink')}
                            </button>
                        )}

                        {error && (
                            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)

    const handleRevoke = async () => {
        if (!confirm(t('invite.confirmRevoke'))) return
        setLoading(true)
        await revokeInvite(inviteId)
        setLoading(false)
    }

    return (
        <button
            onClick={handleRevoke}
            disabled={loading}
            className="text-xs font-bold text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 rounded-lg"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : t('common.cancel')}
        </button>
    )
}

export function RemoveMemberButton({ memberId }: { memberId: string }) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)

    const handleRemove = async () => {
        if (!confirm(t('invite.confirmRemove'))) return
        setLoading(true)
        await removeMember(memberId)
        setLoading(false)
    }

    return (
        <button
            onClick={handleRemove}
            disabled={loading}
            className="text-gray-300 hover:text-red-500 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
        </button>
    )
}
