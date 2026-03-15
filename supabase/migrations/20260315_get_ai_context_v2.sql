-- ============================================================================
-- get_ai_context_v2: Enriched AI context for web app agents
-- ============================================================================
-- Supports optional project scoping (p_project_id)
-- Returns: contact, user_context, company, entities, goals, financial_summary, history
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_ai_context_v2(
    p_contact_id UUID,
    p_company_id UUID,
    p_project_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_contact JSONB;
    v_user_context JSONB;
    v_company JSONB;
    v_company_context JSONB;
    v_entities JSONB;
    v_goals JSONB;
    v_financial_summary JSONB;
    v_history JSONB;
    v_project_scope JSONB;
BEGIN
    -- 1. Contact info
    SELECT to_jsonb(c.*) INTO v_contact
    FROM wa.contacts c
    WHERE c.id = p_contact_id;

    -- 2. User context (profile, personal_finance, business_context, etc.)
    SELECT to_jsonb(uc.*) INTO v_user_context
    FROM public.user_context uc
    WHERE uc.contact_id = p_contact_id
    LIMIT 1;

    -- 3. Company (tenant) info
    -- Note: companies table uses 'name' (not 'company_name') and has no 'industry' column
    SELECT jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'company_name', c.name,
        'company_kind', c.company_kind,
        'currency', c.currency
    ) INTO v_company
    FROM public.companies c
    WHERE c.id = p_company_id;

    -- 4. Company context (for project if scoped, otherwise tenant)
    IF p_project_id IS NOT NULL THEN
        SELECT to_jsonb(cc.*) INTO v_company_context
        FROM public.company_context cc
        WHERE cc.company_id = p_project_id;
    END IF;

    -- 5. Entities (user's companies/projects/families)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'entity_id', ucl.company_id,
        'entity_name', comp.name,
        'entity_kind', COALESCE(comp.company_kind, 'other'),
        'relation', ucl.relation,
        'verified', COALESCE(ucl.verified, false)
    )), '[]'::jsonb) INTO v_entities
    FROM public.user_company_links ucl
    JOIN public.companies comp ON comp.id = ucl.company_id
    WHERE ucl.contact_id = p_contact_id;

    -- 6. Goals (scoped to project if provided, otherwise all)
    IF p_project_id IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(to_jsonb(g.*)), '[]'::jsonb) INTO v_goals
        FROM public.goals g
        WHERE g.contact_id = p_contact_id
        AND (
            (g.scope = 'company' AND g.user_company_id = p_project_id)
            OR g.scope = 'personal'
        )
        AND g.status != 'archived';
    ELSE
        SELECT COALESCE(jsonb_agg(to_jsonb(g.*)), '[]'::jsonb) INTO v_goals
        FROM public.goals g
        WHERE g.contact_id = p_contact_id
        AND g.context_company_id = p_company_id
        AND g.status != 'archived';
    END IF;

    -- 7. Financial summary
    IF p_project_id IS NOT NULL THEN
        -- Project-scoped: transactions for this project
        SELECT jsonb_build_object(
            'has_transactions', EXISTS(
                SELECT 1 FROM public.financial_transactions ft
                WHERE ft.contact_id = p_contact_id
                AND ft.user_company_id = p_project_id
                LIMIT 1
            ),
            'recent_transactions', COALESCE((
                SELECT jsonb_agg(to_jsonb(ft.*))
                FROM (
                    SELECT * FROM public.financial_transactions ft
                    WHERE ft.contact_id = p_contact_id
                    AND ft.user_company_id = p_project_id
                    ORDER BY ft.date DESC
                    LIMIT 20
                ) ft
            ), '[]'::jsonb),
            'summary_30d', COALESCE((
                SELECT jsonb_build_object(
                    'total_income', SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END),
                    'total_expense', SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END),
                    'net', SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END),
                    'count', COUNT(*)
                )
                FROM public.financial_transactions ft
                WHERE ft.contact_id = p_contact_id
                AND ft.user_company_id = p_project_id
                AND ft.date >= (CURRENT_DATE - INTERVAL '30 days')::date
            ), '{"total_income":0,"total_expense":0,"net":0,"count":0}'::jsonb)
        ) INTO v_financial_summary;
    ELSE
        -- Global: personal + all entities
        SELECT jsonb_build_object(
            'has_transactions', EXISTS(
                SELECT 1 FROM public.financial_transactions ft
                WHERE ft.contact_id = p_contact_id
                AND ft.context_company_id = p_company_id
                LIMIT 1
            ),
            'recent_transactions', COALESCE((
                SELECT jsonb_agg(to_jsonb(ft.*))
                FROM (
                    SELECT * FROM public.financial_transactions ft
                    WHERE ft.contact_id = p_contact_id
                    AND ft.context_company_id = p_company_id
                    ORDER BY ft.date DESC
                    LIMIT 20
                ) ft
            ), '[]'::jsonb),
            'summary_30d_personal', COALESCE((
                SELECT jsonb_build_object(
                    'total_income', SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END),
                    'total_expense', SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END),
                    'net', SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END),
                    'count', COUNT(*)
                )
                FROM public.financial_transactions ft
                WHERE ft.contact_id = p_contact_id
                AND ft.context_company_id = p_company_id
                AND ft.scope = 'personal'
                AND ft.date >= (CURRENT_DATE - INTERVAL '30 days')::date
            ), '{"total_income":0,"total_expense":0,"net":0,"count":0}'::jsonb)
        ) INTO v_financial_summary;
    END IF;

    -- 8. Recent chat history (last 20 messages)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'role', m.role,
        'content', m.content,
        'created_at', m.created_at
    ) ORDER BY m.created_at ASC), '[]'::jsonb) INTO v_history
    FROM (
        SELECT role, content, created_at
        FROM public.ai_chat_memory
        WHERE contact_id = p_contact_id
        AND instance_company_id = p_company_id
        ORDER BY created_at DESC
        LIMIT 20
    ) m;

    -- 9. Project scope (if specified)
    IF p_project_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'kind', COALESCE(c.company_kind, 'project'),
            'role', (
                SELECT ucl.relation
                FROM public.user_company_links ucl
                WHERE ucl.contact_id = p_contact_id
                AND ucl.company_id = p_project_id
                LIMIT 1
            )
        ) INTO v_project_scope
        FROM public.companies c
        WHERE c.id = p_project_id;
    END IF;

    -- Build final result
    result := jsonb_build_object(
        'contact', COALESCE(v_contact, '{}'::jsonb),
        'user_context', COALESCE(v_user_context, '{}'::jsonb),
        'company', COALESCE(v_company, '{}'::jsonb),
        'company_context', COALESCE(v_company_context, '{}'::jsonb),
        'entities', COALESCE(v_entities, '[]'::jsonb),
        'goals', COALESCE(v_goals, '[]'::jsonb),
        'financial_summary', COALESCE(v_financial_summary, '{}'::jsonb),
        'history', COALESCE(v_history, '[]'::jsonb),
        'project_scope', v_project_scope
    );

    RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_ai_context_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_context_v2 TO service_role;
