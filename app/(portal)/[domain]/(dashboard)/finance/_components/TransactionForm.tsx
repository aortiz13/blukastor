'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, ArrowRightLeft } from "lucide-react"
import { createTransaction, getProjects } from '@/lib/actions/finance'
import { toast } from 'sonner'
import { CURRENCIES, getExchangeRate, formatCurrency } from '@/lib/utils/currency'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface TransactionFormProps {
    companyId: string
    userId: string
    companyCurrency: string
}

export function TransactionForm({ companyId, userId, companyCurrency }: TransactionFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
    const { t } = useTranslation()

    // Multi-currency state
    const [currency, setCurrency] = useState(companyCurrency)
    const [amount, setAmount] = useState('')
    const [exchangeRate, setExchangeRate] = useState<number>(1)
    const [fetchingRate, setFetchingRate] = useState(false)

    useEffect(() => {
        if (open) {
            getProjects(companyId).then(setProjects)
            setCurrency(companyCurrency)
            setExchangeRate(1)
            setAmount('')
        }
    }, [open, companyId, companyCurrency])

    // Fetch exchange rate when currency changes
    useEffect(() => {
        if (currency === companyCurrency) {
            setExchangeRate(1)
            return
        }

        async function fetchRate() {
            setFetchingRate(true)
            const rate = await getExchangeRate(currency, companyCurrency)
            if (rate) {
                setExchangeRate(rate)
            } else {
                toast.error(t('transaction.exchangeRateError'))
            }
            setFetchingRate(false)
        }

        fetchRate()
    }, [currency, companyCurrency])

    const convertedAmount = amount ? Number(amount) * exchangeRate : 0

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        formData.append('companyId', companyId)
        formData.append('contactId', userId)

        // Append multi-currency fields
        formData.append('currency', currency)
        formData.append('originalAmount', amount)
        formData.append('exchangeRate', exchangeRate.toString())

        // This 'amount' field is what the backend expects for the base currency value
        formData.set('amount', convertedAmount.toString())

        const result = await createTransaction(formData)
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success(t('transaction.addedSuccess'))
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('transaction.addTrigger')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('transaction.addTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('transaction.addDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="companyId" value={companyId} />

                        {/* Type & Project */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">{t('common.type')}</Label>
                                <Select name="type" required defaultValue="expense">
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('transaction.selectType')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="income">{t('common.income')}</SelectItem>
                                        <SelectItem value="expense">{t('common.expense')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="projectId">Proyecto</Label>
                                <Select name="projectId" defaultValue="none">
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('transaction.selectProject')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('transaction.generalNoProject')}</SelectItem>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Amount & Currency */}
                        <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                            <div className="grid grid-cols-5 gap-2 items-end">
                                <div className="col-span-2 space-y-2">
                                    <Label>{t('common.amount')}</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        className="bg-white"
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label>{t('common.currency')}</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={t('common.currency')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map(c => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    {c.code} - {c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Conversion Preview */}
                            {currency !== companyCurrency && (
                                <div className="text-sm bg-blue-50 text-blue-800 p-2 rounded flex flex-col gap-1 border border-blue-100">
                                    <div className="flex items-center gap-2 font-medium">
                                        <ArrowRightLeft className="w-3 h-3" />
                                        <span>{t('transaction.conversionPreview')}</span>
                                        {fetchingRate && <Loader2 className="w-3 h-3 animate-spin" />}
                                    </div>
                                    <div className="flex justify-between items-center text-xs opacity-90">
                                        <span>{t('transaction.rate')}: 1 {currency} = {exchangeRate.toFixed(4)} {companyCurrency}</span>
                                    </div>
                                    <div className="font-bold text-lg border-t border-blue-200 pt-1 mt-1">
                                        ≈ {formatCurrency(convertedAmount, companyCurrency)}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="date" className="text-right">{t('transaction.dateLabel')}</Label>
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                className="col-span-3"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {/* Category */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">{t('transaction.categoryLabel')}</Label>
                            <Input
                                id="category"
                                name="category"
                                placeholder={t('transaction.categoryPlaceholder')}
                                className="col-span-3"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">{t('transaction.descriptionLabel')}</Label>
                            <Input
                                id="description"
                                name="description"
                                placeholder={t('transaction.descPlaceholder')}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || fetchingRate}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? t('common.saving') : t('transaction.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
