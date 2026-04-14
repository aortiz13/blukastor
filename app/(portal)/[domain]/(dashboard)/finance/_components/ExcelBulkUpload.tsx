'use client'

import { useState, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileSpreadsheet, Upload, Loader2, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createBulkTransactions } from '@/lib/actions/finance'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface ExcelBulkUploadProps {
    companyId: string
    userId: string
    companyCurrency: string
}

type Step = 'upload' | 'mapping' | 'review'

interface ExcelRow {
    [key: string]: any
}

interface MappedRow {
    id: number
    date: string
    amount: number
    type: 'income' | 'expense'
    description: string
    category: string
    selected: boolean
    errors: string[]
    raw: ExcelRow
}

type AppField = 'date' | 'amount' | 'type' | 'description' | 'category' | 'skip'

const getAppFields = (t: (key: string) => string): { value: AppField; label: string; required: boolean }[] => [
    { value: 'date', label: t('excel.fieldDate'), required: true },
    { value: 'amount', label: t('excel.fieldAmount'), required: true },
    { value: 'type', label: t('excel.fieldType'), required: true },
    { value: 'description', label: t('excel.fieldDescription'), required: false },
    { value: 'category', label: t('excel.fieldCategory'), required: false },
    { value: 'skip', label: t('excel.fieldSkip'), required: false },
]

// Smart column name detection
const COLUMN_HINTS: Record<AppField, RegExp> = {
    date: /^(fecha|date|dia|day|f\.|fch)$/i,
    amount: /^(monto|amount|valor|value|total|importe|precio|price|suma|cant|cantidad)$/i,
    type: /^(tipo|type|ingreso.*egreso|income.*expense|clase|movimiento|concepto\s*tipo)$/i,
    description: /^(detalle|detail|descripci[oó]n|description|desc|concepto|nota|notes|observaci[oó]n|item|referencia|ref)$/i,
    category: /^(categor[ií]a|category|cat|rubro|cuenta|clasificaci[oó]n|area|[áa]rea)$/i,
    skip: /^$/,
}

const TYPE_INCOME_HINTS = /^(ingreso|income|entrada|cobro|venta|cr[eé]dito|credit|in|i|\+)$/i
const TYPE_EXPENSE_HINTS = /^(egreso|expense|salida|gasto|pago|d[eé]bito|debit|out|e|\-)$/i

const CATEGORIES = [
    'Renta', 'Servicios', 'Marketing', 'Nómina', 'Software',
    'Comida', 'Transporte', 'Equipamiento', 'Ventas', 'Consultoría', 'Otros'
]

export function ExcelBulkUpload({ companyId, userId, companyCurrency }: ExcelBulkUploadProps) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<Step>('upload')
    const [dragActive, setDragActive] = useState(false)
    const [loading, setLoading] = useState(false)

    // Excel data
    const [headers, setHeaders] = useState<string[]>([])
    const [rows, setRows] = useState<ExcelRow[]>([])
    const [columnMapping, setColumnMapping] = useState<Record<string, AppField>>({})
    const [mappedRows, setMappedRows] = useState<MappedRow[]>([])
    const [fileName, setFileName] = useState('')

    const fileInputRef = useRef<HTMLInputElement>(null)

    const resetForm = useCallback(() => {
        setStep('upload')
        setHeaders([])
        setRows([])
        setColumnMapping({})
        setMappedRows([])
        setFileName('')
        setLoading(false)
    }, [])

    // ─── Step 1: Parse Excel ───
    const handleFile = useCallback(async (file: File) => {
        try {
            setFileName(file.name)
            const arrayBuffer = await file.arrayBuffer()
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

            // Use the first sheet
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]

            // Convert to JSON with headers
            const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' })

            if (jsonData.length === 0) {
                toast.error(t('excel.emptyFile'))
                return
            }

            // Extract headers from first row keys
            const detectedHeaders = Object.keys(jsonData[0])
            setHeaders(detectedHeaders)
            setRows(jsonData)

            // Auto-detect column mapping
            const autoMapping: Record<string, AppField> = {}
            detectedHeaders.forEach(header => {
                const normalized = header.trim()
                for (const [field, regex] of Object.entries(COLUMN_HINTS)) {
                    if (field === 'skip') continue
                    if (regex.test(normalized)) {
                        // Don't double-map
                        const alreadyMapped = Object.values(autoMapping).includes(field as AppField)
                        if (!alreadyMapped) {
                            autoMapping[header] = field as AppField
                        }
                        break
                    }
                }
                if (!autoMapping[header]) {
                    autoMapping[header] = 'skip'
                }
            })

            setColumnMapping(autoMapping)
            setStep('mapping')
        } catch (error) {
            console.error('Excel parse error:', error)
            toast.error(t('excel.readError'))
        }
    }, [])

    // ─── Step 2 → 3: Apply mapping and generate preview rows ───
    const applyMapping = useCallback(() => {
        const dateCol = Object.entries(columnMapping).find(([, v]) => v === 'date')?.[0]
        const amountCol = Object.entries(columnMapping).find(([, v]) => v === 'amount')?.[0]
        const typeCol = Object.entries(columnMapping).find(([, v]) => v === 'type')?.[0]
        const descCol = Object.entries(columnMapping).find(([, v]) => v === 'description')?.[0]
        const catCol = Object.entries(columnMapping).find(([, v]) => v === 'category')?.[0]

        if (!dateCol || !amountCol) {
            toast.error(t('excel.mustMapRequired'))
            return
        }

        const mapped: MappedRow[] = rows.map((row, idx) => {
            const errors: string[] = []

            // Parse date
            let parsedDate = ''
            const rawDate = row[dateCol]
            if (rawDate instanceof Date) {
                parsedDate = rawDate.toISOString().split('T')[0]
            } else if (typeof rawDate === 'string') {
                const dateStr = rawDate.trim()
                // Try YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    parsedDate = dateStr
                }
                // Try DD/MM/YYYY or DD-MM-YYYY
                else {
                    const m = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
                    if (m) {
                        parsedDate = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
                    }
                }
            } else if (typeof rawDate === 'number') {
                // Excel serial date number
                const excelDate = XLSX.SSF.parse_date_code(rawDate)
                if (excelDate) {
                    parsedDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
                }
            }
            if (!parsedDate) errors.push(t('excel.invalidDate'))

            // Parse amount
            let parsedAmount = 0
            const rawAmount = row[amountCol]
            if (typeof rawAmount === 'number') {
                parsedAmount = Math.abs(rawAmount)
            } else if (typeof rawAmount === 'string') {
                const cleaned = rawAmount.replace(/[$,\s]/g, '').replace(/\./g, (m: string, offset: number, str: string) => {
                    // Keep last dot as decimal if followed by 2 digits at end
                    const remaining = str.substring(offset + 1)
                    return /^\d{2}$/.test(remaining) ? '.' : ''
                })
                parsedAmount = Math.abs(parseFloat(cleaned)) || 0
            }
            if (parsedAmount <= 0) errors.push(t('excel.invalidAmount'))

            // Parse type
            let parsedType: 'income' | 'expense' = 'expense'
            if (typeCol) {
                const rawType = String(row[typeCol]).trim()
                if (TYPE_INCOME_HINTS.test(rawType)) {
                    parsedType = 'income'
                } else if (TYPE_EXPENSE_HINTS.test(rawType)) {
                    parsedType = 'expense'
                } else if (rawType) {
                    // Partial match
                    if (/ingreso|income/i.test(rawType)) parsedType = 'income'
                    else parsedType = 'expense'
                }
            } else {
                // If no type column and amount was negative, treat as expense
                const origAmount = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount).replace(/[$,\s]/g, ''))
                parsedType = origAmount < 0 ? 'expense' : 'income'
            }

            // Description
            const parsedDesc = descCol ? String(row[descCol]).trim() : ''

            // Category
            const parsedCat = catCol ? String(row[catCol]).trim() : ''

            return {
                id: idx,
                date: parsedDate,
                amount: parsedAmount,
                type: parsedType,
                description: parsedDesc,
                category: parsedCat,
                selected: errors.length === 0,
                errors,
                raw: row,
            }
        }).filter(r => {
            // Filter out rows that look like totals/headers/empty
            if (r.amount === 0 && !r.date && !r.description) return false
            const rawStr = Object.values(r.raw).join(' ').toLowerCase()
            if (/^total\b/.test(rawStr) || /^saldo\b/.test(rawStr)) return false
            return true
        })

        setMappedRows(mapped)
        setStep('review')
    }, [columnMapping, rows])

    // ─── Step 3: Import selected rows ───
    const handleImport = async () => {
        const selected = mappedRows.filter(r => r.selected && r.errors.length === 0)
        if (selected.length === 0) {
            toast.error(t('excel.noValidRows'))
            return
        }

        setLoading(true)
        try {
            const transactions = selected.map(r => ({
                amount: r.amount,
                date: r.date,
                type: r.type,
                description: r.description,
                category: r.category || 'Otros',
                currency: companyCurrency,
            }))

            const result = await createBulkTransactions(companyId, userId, transactions)

            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(`¡${selected.length} ${t('excel.importSuccess')}`)
                setOpen(false)
                resetForm()
            }
        } catch (error) {
            toast.error(t('excel.importError'))
        }
        setLoading(false)
    }

    const toggleRow = (id: number) => {
        setMappedRows(prev => prev.map(r =>
            r.id === id ? { ...r, selected: !r.selected } : r
        ))
    }

    const toggleAll = (selected: boolean) => {
        setMappedRows(prev => prev.map(r =>
            r.errors.length === 0 ? { ...r, selected } : r
        ))
    }

    const selectedCount = mappedRows.filter(r => r.selected && r.errors.length === 0).length
    const validCount = mappedRows.filter(r => r.errors.length === 0).length
    const errorCount = mappedRows.filter(r => r.errors.length > 0).length

    const requiredMapped = ['date', 'amount'].every(field =>
        Object.values(columnMapping).includes(field as AppField)
    )

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {t('excel.importTitle')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === 'upload' && (
                            <><FileSpreadsheet className="h-5 w-5" /> {t('excel.importFromExcel')}</>
                        )}
                        {step === 'mapping' && (
                            <><FileSpreadsheet className="h-5 w-5" /> {t('excel.mapColumns')}</>
                        )}
                        {step === 'review' && (
                            <><CheckCircle2 className="h-5 w-5" /> {t('excel.reviewApprove')}</>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {/* ─── STEP 1: Upload ─── */}
                {step === 'upload' && (
                    <div className="space-y-4">
                        <div
                            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={(e) => {
                                e.preventDefault()
                                setDragActive(false)
                                const file = e.dataTransfer.files[0]
                                if (file) handleFile(file)
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium mb-2">
                                {t('excel.dragDropExcel')}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('excel.clickToBrowse')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t('excel.supportedFormats')}
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFile(file)
                                }}
                            />
                        </div>

                        <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg border border-blue-100">
                            <p className="font-medium mb-1">{t('excel.expectedFormat')}</p>
                            <p>{t('excel.expectedFormatDesc')}</p>
                        </div>
                    </div>
                )}

                {/* ─── STEP 2: Column Mapping ─── */}
                {step === 'mapping' && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-3 border">
                            <p className="text-sm text-muted-foreground">
                                <strong>{fileName}</strong> — {rows.length} {t('excel.rowsDetected')}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium">{t('excel.assignColumns')}</p>

                            {headers.map(header => (
                                <div key={header} className="flex items-center gap-3 p-2 rounded-lg border bg-white">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{header}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {t('excel.example')}: {String(rows[0]?.[header] ?? '').substring(0, 40)}
                                        </p>
                                    </div>
                                    <div className="text-muted-foreground text-xs">→</div>
                                    <Select
                                        value={columnMapping[header] || 'skip'}
                                        onValueChange={(val) => setColumnMapping(prev => ({ ...prev, [header]: val as AppField }))}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAppFields(t).map(f => (
                                                <SelectItem key={f.value} value={f.value}>
                                                    {f.label} {f.required && '*'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        {!requiredMapped && (
                            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {t('excel.mustMapRequired')}
                            </div>
                        )}

                        <div className="flex gap-2 justify-between pt-2">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                <ChevronLeft className="mr-1 h-4 w-4" /> {t('common.back')}
                            </Button>
                            <Button onClick={applyMapping} disabled={!requiredMapped}>
                                {t('common.continue')} <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ─── STEP 3: Review & Approve ─── */}
                {step === 'review' && (
                    <div className="space-y-4">
                        {/* Stats bar */}
                        <div className="flex items-center gap-4 text-sm">
                            <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200">
                                ✓ {selectedCount} {t('excel.selected')}
                            </span>
                            <span className="bg-gray-50 text-gray-600 px-2 py-1 rounded border">
                                {validCount} {t('excel.valid')}
                            </span>
                            {errorCount > 0 && (
                                <span className="bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
                                    ✗ {errorCount} {t('excel.withErrors')}
                                </span>
                            )}
                            <div className="flex-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAll(true)}
                                className="text-xs"
                            >
                                {t('excel.selectAll')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAll(false)}
                                className="text-xs"
                            >
                                {t('excel.deselectAll')}
                            </Button>
                        </div>

                        {/* Table */}
                        <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedCount === validCount && validCount > 0}
                                                onChange={(e) => toggleAll(e.target.checked)}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className="p-2 text-left">{t('table.date')}</th>
                                        <th className="p-2 text-right">{t('table.amount')}</th>
                                        <th className="p-2 text-center">{t('table.type')}</th>
                                        <th className="p-2 text-left">{t('table.description')}</th>
                                        <th className="p-2 text-left">{t('table.category')}</th>
                                        <th className="p-2 text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappedRows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className={`border-t transition-colors ${
                                                row.errors.length > 0
                                                    ? 'bg-red-50/50 opacity-60'
                                                    : row.selected
                                                        ? 'bg-white hover:bg-gray-50'
                                                        : 'bg-gray-50/50 opacity-50'
                                            }`}
                                        >
                                            <td className="p-2">
                                                <input
                                                    type="checkbox"
                                                    checked={row.selected}
                                                    disabled={row.errors.length > 0}
                                                    onChange={() => toggleRow(row.id)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="p-2 font-mono text-xs">{row.date || '—'}</td>
                                            <td className="p-2 text-right font-mono font-medium">
                                                {row.amount > 0
                                                    ? new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: companyCurrency
                                                    }).format(row.amount)
                                                    : '—'
                                                }
                                            </td>
                                            <td className="p-2 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    row.type === 'income'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {row.type === 'income' ? t('common.income') : t('common.expense')}
                                                </span>
                                            </td>
                                            <td className="p-2 max-w-[200px] truncate" title={row.description}>
                                                {row.description || '—'}
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    value={row.category}
                                                    onChange={(e) => {
                                                        setMappedRows(prev => prev.map(r =>
                                                            r.id === row.id ? { ...r, category: e.target.value } : r
                                                        ))
                                                    }}
                                                    className="text-xs border rounded px-1 py-0.5 bg-transparent w-full"
                                                >
                                                    <option value="">{t('excel.noCategory')}</option>
                                                    {CATEGORIES.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2 text-center">
                                                {row.errors.length > 0 && (
                                                    <span title={row.errors.join(', ')}>
                                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 justify-between pt-2">
                            <Button variant="outline" onClick={() => setStep('mapping')}>
                                <ChevronLeft className="mr-1 h-4 w-4" /> {t('excel.editMapping')}
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={resetForm}>
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={loading || selectedCount === 0}
                                    className="min-w-[180px]"
                                >
                                    {loading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('excel.importing')}</>
                                    ) : (
                                        <><CheckCircle2 className="mr-2 h-4 w-4" /> {t('excel.importCount').replace('{count}', String(selectedCount))}</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
