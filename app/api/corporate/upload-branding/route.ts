import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Upload a branding asset (logo, favicon, cover, etc.) to Supabase Storage.
 * POST /api/corporate/upload-branding
 * Body: FormData with 'file' field and 'companyId' + 'type' (logo, logo_dark, icon, favicon, cover)
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify admin access
        const { data: admins } = await supabase
            .from('admin_profiles')
            .select('company_id, role, scope')
            .eq('auth_user_id', user.id)

        if (!admins || admins.length === 0) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const companyId = formData.get('companyId') as string | null
        const assetType = formData.get('type') as string || 'logo'

        if (!file || !companyId) {
            return NextResponse.json({ error: 'Missing file or companyId' }, { status: 400 })
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG, ICO' }, { status: 400 })
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 })
        }

        // Generate file path: branding-assets/{companyId}/{type}_{timestamp}.{ext}
        const ext = file.name.split('.').pop() || 'png'
        const timestamp = Date.now()
        const filePath = `${companyId}/${assetType}_${timestamp}.${ext}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('branding-assets')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true,
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('branding-assets')
            .getPublicUrl(filePath)

        return NextResponse.json({
            success: true,
            url: publicUrl,
            path: filePath,
        })
    } catch (error: any) {
        console.error('Error in POST /api/corporate/upload-branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
