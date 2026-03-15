


/**
 * Parses OCR-extracted text from receipts to find structured financial data.
 * Handles Spanish and English receipt formats.
 * Used as FALLBACK when Gemini Vision extraction is unavailable.
 */
export function parseReceiptText(text: string): {
    total: number | null
    date: string | null
    vendor: string | null
    description: string
} {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    return {
        total: extractTotal(text),
        date: extractDate(text),
        vendor: extractVendor(lines),
        description: buildDescription(lines)
    }
}

function extractTotal(text: string): number | null {
    // Normalize whitespace for better matching
    const normalized = text.replace(/\s+/g, ' ')
    
    const candidates: { value: number; priority: number }[] = []

    // PRIORITY 1: Labeled totals (highest priority)
    // Covers: Total, Monto Total, Gran Total, A Pagar, Importe Total, Amount Due, 
    // Valor Total, Cobro Total, Total a Pagar, Neto, Net, Monto, Valor
    const labeledPatterns = [
        /(?:total\s*(?:a\s*pagar|general|final|neto)?|monto\s*total|gran\s*total|amount\s*due|importe\s*(?:total)?|cobro\s*total|valor\s*(?:total|neto)?|a\s*pagar|neto|net)\s*[:\s]*\$?\s*([\d.,]+)/gi,
    ]

    for (const pattern of labeledPatterns) {
        let match
        while ((match = pattern.exec(normalized)) !== null) {
            const num = parseAmount(match[1])
            if (num && num > 0) {
                candidates.push({ value: num, priority: 3 })
            }
        }
    }

    // PRIORITY 2: Currency symbol patterns — "$12,345.67" or "RD$ 1,234.56"
    const currencyPatterns = [
        /(?:RD|US|AR|MX)?\$\s*([\d.,]+)/gi,
        /(?:Q|L|S\/\.?|Bs\.?|C\$|₡)\s*([\d.,]+)/gi, // Other Latam currencies
    ]

    for (const pattern of currencyPatterns) {
        let match
        while ((match = pattern.exec(text)) !== null) {
            const num = parseAmount(match[1])
            if (num && num > 0) {
                candidates.push({ value: num, priority: 2 })
            }
        }
    }

    // PRIORITY 3: Standalone amounts at end of line (common in receipt item lists)
    const standalonePattern = /(?:^|\s)([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))\s*$/gm
    let match
    while ((match = standalonePattern.exec(text)) !== null) {
        const num = parseAmount(match[1])
        if (num && num > 0) {
            candidates.push({ value: num, priority: 1 })
        }
    }

    if (candidates.length === 0) return null

    // Sort by priority (descending), then by value (descending) within same priority
    // The logic: labeled totals > currency amounts > standalone numbers
    // Within labeled totals, pick the largest (likely the grand total vs subtotal)
    candidates.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority
        return b.value - a.value
    })

    return candidates[0].value
}

function parseAmount(raw: string): number | null {
    const cleaned = raw.trim()
    if (!cleaned) return null

    // If last separator is comma and has 2 digits after → "12.345,67" format (Latin America/Europe)
    if (/,\d{2}$/.test(cleaned)) {
        const normalized = cleaned.replace(/\./g, '').replace(',', '.')
        const num = parseFloat(normalized)
        return isNaN(num) ? null : num
    }

    // If last separator is period and has 2 digits after → "12,345.67" format (US)
    if (/\.\d{2}$/.test(cleaned)) {
        const normalized = cleaned.replace(/,/g, '')
        const num = parseFloat(normalized)
        return isNaN(num) ? null : num
    }

    // Handle "12.345" (thousands separator only, no decimals) — common in Latam
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
        const normalized = cleaned.replace(/\./g, '')
        const num = parseFloat(normalized)
        return isNaN(num) ? null : num
    }

    // Handle "12,345" (thousands separator only, no decimals)
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
        const normalized = cleaned.replace(/,/g, '')
        const num = parseFloat(normalized)
        return isNaN(num) ? null : num
    }

    // Simple number
    const normalized = cleaned.replace(/,/g, '')
    const num = parseFloat(normalized)
    return isNaN(num) ? null : num
}

function buildDescription(lines: string[]): string {
    // Filter out lines that are purely numbers, dates, or IDs to get meaningful description
    const meaningfulLines = lines.filter(line => {
        // Skip lines that are just numbers/amounts
        if (/^[\d.,\s$]+$/.test(line)) return false
        // Skip very short lines (often noise from OCR)
        if (line.length < 4) return false
        // Skip RUT/NIT/RFC type identifiers
        if (/^(rut|nit|rfc|cuit|rnc)\s*[:\s]/i.test(line)) return false
        return true
    })
    
    return meaningfulLines.slice(0, 4).join(' | ').substring(0, 200)
}

function extractDate(text: string): string | null {
    // DD/MM/YYYY or DD-MM-YYYY
    let match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
    if (match) {
        const [, day, month, year] = match
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // YYYY-MM-DD (ISO format)
    match = text.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
        return match[0]
    }

    // "10 Feb 2026" or "10 de Febrero 2026"
    const months: Record<string, string> = {
        'ene': '01', 'jan': '01', 'enero': '01', 'january': '01',
        'feb': '02', 'febrero': '02', 'february': '02',
        'mar': '03', 'marzo': '03', 'march': '03',
        'abr': '04', 'apr': '04', 'abril': '04', 'april': '04',
        'may': '05', 'mayo': '05',
        'jun': '06', 'junio': '06', 'june': '06',
        'jul': '07', 'julio': '07', 'july': '07',
        'ago': '08', 'aug': '08', 'agosto': '08', 'august': '08',
        'sep': '09', 'sept': '09', 'septiembre': '09', 'september': '09',
        'oct': '10', 'octubre': '10', 'october': '10',
        'nov': '11', 'noviembre': '11', 'november': '11',
        'dic': '12', 'dec': '12', 'diciembre': '12', 'december': '12',
    }

    const monthPattern = Object.keys(months).join('|')
    const textDateRegex = new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthPattern})\\.?\\s*(\\d{4})`, 'i')
    match = text.match(textDateRegex)
    if (match) {
        const day = match[1].padStart(2, '0')
        const monthStr = months[match[2].toLowerCase()]
        const year = match[3]
        if (monthStr) return `${year}-${monthStr}-${day}`
    }

    return null
}

function extractVendor(lines: string[]): string | null {
    // First non-empty line is usually the vendor/store name
    for (const line of lines.slice(0, 3)) {
        // Skip lines that are mostly numbers, dates, or very short
        if (line.length < 3) continue
        if (/^\d+[\s\/\-]/.test(line)) continue
        if (/^(rut|nit|rfc|cuit|rnc|fecha|date|hora|time|folio|boleta|factura|ticket|recibo|comprobante)/i.test(line)) continue
        return line.substring(0, 100)
    }
    return null
}
