'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle, X, ArrowRightLeft } from 'lucide-react'
import { createTransaction } from '@/lib/actions/finance'
import { parseReceiptText } from '@/lib/utils/receiptParser'
import { toast } from 'sonner'
import { CURRENCIES, getExchangeRate, formatCurrency } from '@/lib/utils/currency'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface ReceiptUploadProps {
    companyId: string
    userId: string
    companyCurrency: string
}

type Step = 'upload' | 'processing' | 'review'

export function ReceiptUpload({ companyId, userId, companyCurrency }: ReceiptUploadProps) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<Step>('upload')
    const [dragActive, setDragActive] = useState(false)
    const [progress, setProgress] = useState(0)
    const [progressLabel, setProgressLabel] = useState('')
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Extracted data
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState('')
    const [vendor, setVendor] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'income' | 'expense'>('expense')
    const [category, setCategory] = useState('')

    // Multi-currency state
    const [currency, setCurrency] = useState(companyCurrency)
    const [exchangeRate, setExchangeRate] = useState<number>(1)
    const [fetchingRate, setFetchingRate] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetForm = useCallback(() => {
        setStep('upload')
        setProgress(0)
        setProgressLabel('')
        setPreviewUrl(null)
        setReceiptUrl(null)
        setAmount('')
        setDate('')
        setVendor('')
        setDescription('')
        setType('expense')
        setCategory('')
        setCurrency(companyCurrency)
        setExchangeRate(1)
    }, [companyCurrency])

    // Update currency state if prop changes (and form is reset)
    useEffect(() => {
        if (!open) setCurrency(companyCurrency)
    }, [companyCurrency, open])

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

    const handleFile = useCallback(async (file: File) => {
        setStep('processing')
        setProgress(10)
        setProgressLabel(t('receipt.preparingFile'))

        try {
            let imageForOcr: string | null = null

            // For PDFs, skip client-side conversion — Gemini handles PDFs natively
            if (file.type === 'application/pdf') {
                // No preview for PDFs (Gemini processes the raw PDF server-side)
                imageForOcr = null
            } else {
                // Direct image — create a preview URL
                imageForOcr = URL.createObjectURL(file)
            }

            setPreviewUrl(imageForOcr)
            setProgress(20)

            // Upload file to storage + Gemini Vision extraction
            setProgressLabel(t('receipt.uploadingAnalyzing'))
            const uploadFormData = new FormData()
            uploadFormData.append('file', file)
            uploadFormData.append('companyId', companyId)

            const uploadRes = await fetch('/api/ocr', {
                method: 'POST',
                body: uploadFormData
            })

            if (!uploadRes.ok) {
                const errorData = await uploadRes.json().catch(() => ({}))
                throw new Error(errorData.error || `Upload failed (${uploadRes.status})`)
            }

            const uploadData = await uploadRes.json()
            setReceiptUrl(uploadData.receiptUrl)

            // Use receipt URL as preview if we don't have one (PDF case)
            if (!imageForOcr && uploadData.receiptUrl) {
                setPreviewUrl(uploadData.receiptUrl)
            }

            setProgress(70)

            // Check if Gemini Vision extracted data successfully
            const geminiData = uploadData.extractedData
            const geminiHasAmount = geminiData && geminiData.amount && geminiData.amount > 0

            if (geminiHasAmount) {
                // Gemini Vision succeeded — use AI-extracted data
                console.log('[OCR] Gemini Vision data:', geminiData)
                setProgressLabel(t('receipt.aiExtracted'))

                setAmount(String(geminiData.amount))
                if (geminiData.date) setDate(geminiData.date)
                if (geminiData.vendor) setVendor(geminiData.vendor)
                if (geminiData.description) setDescription(geminiData.description)
                if (geminiData.type) setType(geminiData.type)
                if (geminiData.currency && geminiData.currency !== currency) {
                    setCurrency(geminiData.currency)
                }
            } else if (imageForOcr) {
                // Fallback: Run Tesseract.js OCR client-side (only for images, not PDFs)
                console.log('[OCR] Gemini did not extract amount, falling back to Tesseract...')
                setProgressLabel(t('receipt.ocrRunning'))

                const Tesseract = (await import('tesseract.js')).default

                const result = await Tesseract.recognize(
                    imageForOcr,
                    'spa+eng', // Spanish + English
                    {
                        logger: (m: any) => {
                            if (m.status === 'recognizing text') {
                                setProgress(70 + Math.round((m.progress || 0) * 20))
                            }
                        }
                    }
                )

                setProgressLabel(t('receipt.analyzingData'))

                const ocrText = result.data.text
                console.log('[OCR] Tesseract text:', ocrText)

                // Parse the extracted text with improved regex
                const parsed = parseReceiptText(ocrText)
                console.log('[OCR] Parsed data:', parsed)

                if (parsed.total) setAmount(String(parsed.total))
                if (parsed.date) setDate(parsed.date)
                if (parsed.vendor) setVendor(parsed.vendor)
                if (parsed.description) setDescription(parsed.description)
            } else {
                // PDF with no Gemini data — user will need to fill in manually
                console.log('[OCR] No data extracted from PDF, user must fill manually')
                setProgressLabel(t('receipt.noAutoExtract'))
            }

            // Auto-detect today if no date was found
            if (!date) {
                setDate(new Date().toISOString().split('T')[0])
            }

            setProgress(100)
            setProgressLabel(t('receipt.ready'))
            setStep('review')

        } catch (error) {
            console.error('Receipt processing error:', error)
            toast.error(t('receipt.processError'))
            setStep('upload')
        }
    }, [companyId, currency, date])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragActive(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleSave = async () => {
        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('companyId', companyId)
            formData.append('contactId', userId)

            // Standard fields
            formData.append('date', date)
            formData.append('category', category)
            formData.append('description', description || vendor || '')
            formData.append('type', type)
            if (receiptUrl) formData.append('media_url', receiptUrl)

            // Multi-currency fields
            formData.append('currency', currency)
            formData.append('originalAmount', amount)
            formData.append('exchangeRate', exchangeRate.toString())

            // Base currency amount
            formData.append('amount', convertedAmount.toString())

            const result = await createTransaction(formData)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(t('receipt.transactionCreated'))
                setOpen(false)
                resetForm()
            }
        } catch (error) {
            toast.error(t('receipt.saveError'))
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    {t('receipt.uploadReceipt')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'upload' && t('receipt.uploadReceipt')}
                        {step === 'processing' && t('receipt.processingReceipt')}
                        {step === 'review' && t('receipt.reviewExtracted')}
                    </DialogTitle>
                </DialogHeader>

                {/* STEP 1: Upload */}
                {step === 'upload' && (
                    <div
                        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium mb-2">
                            {t('receipt.dragDrop')}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('receipt.clickBrowse')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {t('receipt.supportedFormats')}
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFile(file)
                            }}
                        />
                    </div>
                )}

                {/* STEP 2: Processing */}
                {step === 'processing' && (
                    <div className="space-y-6 py-4">
                        {previewUrl ? (
                            <div className="relative rounded-lg overflow-hidden border max-h-48">
                                <img src={previewUrl} alt={t('receipt.previewAlt')} className="w-full h-48 object-contain bg-gray-50" />
                            </div>
                        ) : (
                            <div className="relative rounded-lg overflow-hidden border h-32 bg-gray-50 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <FileImage className="h-10 w-10" />
                                <span className="text-sm">{t('receipt.processingPdf')}</span>
                            </div>
                        )}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className={progress > 90 ? 'text-green-600 font-medium' : ''}>{progressLabel}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                        </div>
                    </div>
                )}

                {/* STEP 3: Review & Edit */}
                {step === 'review' && (
                    <div className="space-y-4">
                        {previewUrl && (
                            <div className="rounded-lg overflow-hidden border max-h-40">
                                <img src={previewUrl} alt={t('receipt.receiptAlt')} className="w-full h-40 object-contain bg-gray-50" />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Type selector */}
                            <div className="col-span-2">
                                <Label>{t('receipt.transactionType')} *</Label>
                                <div className="flex gap-2 mt-1">
                                    <Button
                                        type="button"
                                        variant={type === 'expense' ? 'default' : 'outline'}
                                        className={type === 'expense' ? 'bg-red-600 hover:bg-red-700 flex-1' : 'flex-1'}
                                        onClick={() => setType('expense')}
                                    >
                                        {t('common.expense')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={type === 'income' ? 'default' : 'outline'}
                                        className={type === 'income' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                                        onClick={() => setType('income')}
                                    >
                                        {t('common.income')}
                                    </Button>
                                </div>
                            </div>

                            {/* Amount & Currency in mixed grid */}
                            <div className="col-span-2 grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="receipt-amount">{t('common.amount')} *</Label>
                                    <Input
                                        id="receipt-amount"
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>{t('common.currency')}</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder={t('common.currency')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CURRENCIES.map(c => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    {c.code}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Conversion Preview */}
                            {currency !== companyCurrency && (
                                <div className="col-span-2 text-sm bg-blue-50 text-blue-800 p-2 rounded flex flex-col gap-1 border border-blue-100">
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

                            {/* Date */}
                            <div>
                                <Label htmlFor="receipt-date">{t('transaction.dateLabel')} *</Label>
                                <Input
                                    id="receipt-date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <Label htmlFor="receipt-category">{t('transaction.categoryLabel')} *</Label>
                                <select
                                    id="receipt-category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mt-1"
                                >
                                    <option value="">{t('receipt.selectCategory')}</option>
                                    <option value="Renta">{t('receipt.catRent')}</option>
                                    <option value="Servicios">{t('receipt.catServices')}</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Nómina">{t('receipt.catPayroll')}</option>
                                    <option value="Software">Software</option>
                                    <option value="Comida">{t('receipt.catFood')}</option>
                                    <option value="Transporte">{t('receipt.catTransport')}</option>
                                    <option value="Equipamiento">{t('receipt.catEquipment')}</option>
                                    <option value="Ventas">{t('receipt.catSales')}</option>
                                    <option value="Consultoría">{t('receipt.catConsulting')}</option>
                                    <option value="Otros">{t('receipt.catOther')}  </option>
                                </select>
                            </div>

                            {/* Vendor */}
                            <div>
                                <Label htmlFor="receipt-vendor">{t('receipt.vendor')}</Label>
                                <Input
                                    id="receipt-vendor"
                                    value={vendor}
                                    onChange={(e) => setVendor(e.target.value)}
                                    placeholder={t('receipt.vendorPlaceholder')}
                                    className="mt-1"
                                />
                            </div>

                            {/* Description */}
                            <div className="col-span-2">
                                <Label htmlFor="receipt-desc">{t('transaction.descriptionLabel')}</Label>
                                <Input
                                    id="receipt-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={t('receipt.optionalNotes')}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={resetForm}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={loading || !amount || !date || !category}
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.saving')}</>
                                ) : (
                                    <><CheckCircle2 className="mr-2 h-4 w-4" /> {t('transaction.save')}</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

