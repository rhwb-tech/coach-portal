import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Validate user JWT
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401)
    }

    const userEmail = user.email
    if (!userEmail) {
      return jsonResponse({ error: 'No email in token' }, 401)
    }

    // 2. Parse request body
    const body = await req.json()
    const { operation } = body

    if (!operation) {
      return jsonResponse({ error: 'operation is required' }, 400)
    }

    // 3. Service client for privileged queries (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Verify role via v_rhwb_roles
    const { data: roleData } = await supabase
      .from('v_rhwb_roles')
      .select('role, full_name')
      .eq('email_id', userEmail.toLowerCase())
      .single()

    if (!roleData) {
      return jsonResponse({ error: 'User not authorized' }, 403)
    }

    const role = roleData.role?.toLowerCase()
    if (role !== 'coach' && role !== 'admin') {
      return jsonResponse({ error: 'Insufficient permissions' }, 403)
    }

    // Cloud Run config
    const cloudRunUrl = Deno.env.get('CLOUD_RUN_URL')!
    const cloudRunApiKey = Deno.env.get('CLOUD_RUN_API_KEY')!

    // Helper: map email_ids to runner_ids
    async function mapEmailsToRunnerIds(emails: string[]): Promise<Record<string, string>> {
      if (emails.length === 0) return {}
      const { data: profiles } = await supabase
        .from('runners_profile')
        .select('email_id, runner_id')
        .in('email_id', emails)
      const map: Record<string, string> = {}
      for (const p of (profiles || [])) {
        if (p.runner_id) map[p.email_id] = p.runner_id
      }
      return map
    }

    // Helper: call Cloud Run
    async function callCloudRun(endpoint: string, payload: object) {
      const resp = await fetch(`${cloudRunUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': cloudRunApiKey,
        },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        const text = await resp.text()
        console.error(`Cloud Run ${endpoint} error:`, resp.status, text)
        return null
      }
      return await resp.json()
    }

    // === Operation: get-qual-scores ===
    if (operation === 'get-qual-scores') {
      const { season, meso, coach_email } = body
      if (!season) {
        return jsonResponse({ error: 'season is required' }, 400)
      }

      // Determine which coach email to use (admin can query for other coaches)
      const effectiveCoachEmail = (role === 'admin' && coach_email) ? coach_email : userEmail

      // Get assigned runners from rhwb_coach_input for this coach + season
      const { data: coachInputData } = await supabase
        .from('rhwb_coach_input')
        .select('email_id')
        .eq('coach_email', effectiveCoachEmail)
        .eq('season', season)

      const runnerEmails = [...new Set((coachInputData || []).map((r: { email_id: string }) => r.email_id))]
      if (runnerEmails.length === 0) {
        return jsonResponse({ data: [] })
      }

      // Map emails -> runner_ids
      const emailToRunnerId = await mapEmailsToRunnerIds(runnerEmails)
      const runnerIds = Object.values(emailToRunnerId)
      if (runnerIds.length === 0) {
        return jsonResponse({ data: [] })
      }

      // Call Cloud Run
      console.log('[get-qual-scores] calling Cloud Run with', JSON.stringify({ runner_ids: runnerIds, season, meso }))
      const result = await callCloudRun('/get-qual-scores-by-coach', {
        runner_ids: runnerIds,
        season,
        ...(meso ? { meso } : {}),
      })
      console.log('[get-qual-scores] Cloud Run result', JSON.stringify(result))

      if (!result) {
        console.error('[get-qual-scores] Cloud Run returned null — endpoint may not exist or errored')
        return jsonResponse({ data: [], error: 'Failed to fetch qual scores' })
      }

      // Build reverse map: runner_id -> email_id
      const runnerIdToEmail: Record<string, string> = {}
      for (const [email, rid] of Object.entries(emailToRunnerId)) {
        runnerIdToEmail[rid] = email
      }

      // Enrich results with email_id for frontend matching
      const enrichedData = (result.data || []).map((row: { runner_id: string; meso: string; qual_score: string }) => ({
        ...row,
        email_id: runnerIdToEmail[row.runner_id] || null,
      }))

      return jsonResponse({ data: enrichedData })
    }

    // === Operation: get-action-comments ===
    if (operation === 'get-action-comments') {
      const { action_request_ids } = body

      if (!action_request_ids || !Array.isArray(action_request_ids) || action_request_ids.length === 0) {
        return jsonResponse({ error: 'action_request_ids array is required' }, 400)
      }

      // For coaches: verify they own these action requests
      if (role === 'coach') {
        const { data: requests } = await supabase
          .from('rhwb_action_requests')
          .select('id, requestor_email_id')
          .in('id', action_request_ids)

        const authorizedIds = (requests || [])
          .filter((r: { requestor_email_id: string }) =>
            r.requestor_email_id?.toLowerCase() === userEmail.toLowerCase()
          )
          .map((r: { id: number }) => r.id)

        if (authorizedIds.length === 0) {
          return jsonResponse({ data: [] })
        }

        const result = await callCloudRun('/get-action-comments', {
          action_request_ids: authorizedIds,
        })

        return jsonResponse({ data: result?.data || [] })
      }

      // Admin: can access all
      const result = await callCloudRun('/get-action-comments', { action_request_ids })
      return jsonResponse({ data: result?.data || [] })
    }

    // === Operation: upsert-qual-score ===
    if (operation === 'upsert-qual-score') {
      const { email_id, season, meso, qual_score } = body
      if (!email_id || !season || !meso || qual_score === undefined || qual_score === null) {
        return jsonResponse({ error: 'email_id, season, meso, and qual_score are required' }, 400)
      }

      // Verify coach has access to this runner
      if (role === 'coach') {
        const { data: access } = await supabase
          .from('rhwb_coach_input')
          .select('email_id')
          .eq('coach_email', userEmail)
          .eq('season', season)
          .eq('email_id', email_id)
          .limit(1)

        if (!access || access.length === 0) {
          return jsonResponse({ error: 'Not authorized for this runner' }, 403)
        }
      }

      // Map email -> runner_id
      const emailMap = await mapEmailsToRunnerIds([email_id])
      const runnerId = emailMap[email_id]
      if (!runnerId) {
        return jsonResponse({ error: 'Could not resolve runner_id for email' }, 400)
      }

      const result = await callCloudRun('/upsert-qual-score', {
        runner_id: runnerId,
        season,
        meso,
        qual_score,
        source_table: 'coach_portal',
      })

      if (!result) {
        return jsonResponse({ error: 'Failed to upsert qual score' }, 500)
      }

      return jsonResponse({ success: true })
    }

    // === Operation: upsert-action-comment ===
    if (operation === 'upsert-action-comment') {
      const { action_request_id, runner_email_id, season, comment, action_type } = body
      if (!action_request_id || !runner_email_id || !season || !comment || !action_type) {
        return jsonResponse({
          error: 'action_request_id, runner_email_id, season, comment, and action_type are required'
        }, 400)
      }

      // Map runner and requestor emails to runner_ids
      const emailMap = await mapEmailsToRunnerIds([runner_email_id, userEmail])
      const runnerId = emailMap[runner_email_id]
      const requestorId = emailMap[userEmail]

      if (!runnerId || !requestorId) {
        return jsonResponse({ error: 'Could not resolve runner_id(s)' }, 400)
      }

      const result = await callCloudRun('/upsert-action-comment', {
        action_request_id,
        runner_id: runnerId,
        requestor_id: requestorId,
        season,
        comment,
        action_type,
      })

      if (!result) {
        return jsonResponse({ error: 'Failed to upsert action comment' }, 500)
      }

      return jsonResponse({ success: true })
    }

    // === Operation: get-comment-categories ===
    if (operation === 'get-comment-categories') {
      const { season_no, meso, coach_email } = body

      if (season_no === undefined || season_no === null) {
        return jsonResponse({ error: 'season_no is required' }, 400)
      }

      const effectiveCoachEmail = (role === 'admin' && coach_email) ? coach_email : userEmail

      const result = await callCloudRun('/get-activity-comment-categories', {
        coach_email: effectiveCoachEmail,
        season_no,
        ...(meso ? { meso } : {}),
      })

      return jsonResponse({ data: result?.data || [] })
    }

    // === Operation: get-feedback-metrics ===
    if (operation === 'get-feedback-metrics') {
      const { season, season_no, meso, coach_email } = body

      if (!season || season_no === undefined || season_no === null) {
        return jsonResponse({ error: 'season and season_no are required' }, 400)
      }

      const effectiveCoachEmail = (role === 'admin' && coach_email) ? coach_email : userEmail

      const { data: coachInputData } = await supabase
        .from('rhwb_coach_input')
        .select('email_id')
        .eq('coach_email', effectiveCoachEmail)
        .eq('season', season)

      const runnerEmails = [...new Set((coachInputData || []).map((r: { email_id: string }) => r.email_id))]
      if (runnerEmails.length === 0) {
        return jsonResponse({ data: { runs_with_comments: 0 } })
      }

      const emailToRunnerId = await mapEmailsToRunnerIds(runnerEmails)
      const runnerIds = Object.values(emailToRunnerId)
      if (runnerIds.length === 0) {
        return jsonResponse({ data: { runs_with_comments: 0 } })
      }

      const result = await callCloudRun('/get-feedback-metrics', {
        runner_ids: runnerIds,
        season_no,
        ...(meso ? { meso } : {}),
      })

      return jsonResponse({ data: result?.data || { runs_with_comments: 0 } })
    }

    // === Operation: get-nps-scores ===
    if (operation === 'get-nps-scores') {
      let query = supabase.from('v_nps_scores').select('*')

      // Coaches only see their own data; admins see all
      if (role === 'coach') {
        query = query.eq('coach', roleData.full_name)
      }

      const { data: npsData, error: npsError } = await query
      if (npsError) {
        console.error('[get-nps-scores] error:', npsError)
        return jsonResponse({ error: 'Failed to fetch NPS scores' }, 500)
      }

      // Fetch Season 15 additional data from rhwbsurvey_season15 (wide-format, Cloud SQL)
      const s15Result = await callCloudRun('/get-rhwbsurvey-s15-nps', {})
      const s15Extra: any[] = s15Result?.data || []

      let finalData: any[]

      if (s15Extra.length === 0) {
        finalData = npsData || []
      } else {
        // Filter Cloud Run rows by coach if needed
        const filteredS15Extra = role === 'coach'
          ? s15Extra.filter((r: any) => r.coach === roleData.full_name)
          : s15Extra

        // Separate Season 15 New/Return rows from everything else
        const nonS15 = (npsData || []).filter((r: any) => r.season !== 'Season 15')
        const s15Supabase = (npsData || []).filter((r: any) => r.season === 'Season 15')

        // Weighted NPS merge: combined_nps = (nps1*t1 + nps2*t2) / (t1+t2)
        function mergeNpsRows(r1: any, r2: any): any {
          const t1 = Number(r1.total_responses) || 0
          const t2 = Number(r2.total_responses) || 0
          const total = t1 + t2
          if (total === 0) return r1
          const metrics = ['feedback_nps', 'comms_nps', 'rel_nps', 'reco_nps', 'rhwb_comms_nps', 'rhwb_knowledge_nps', 'rhwb_reco_nps']
          const combined: any = { ...r1, total_responses: total }
          for (const m of metrics) {
            const v1 = r1[m] != null ? Number(r1[m]) : null
            const v2 = r2[m] != null ? Number(r2[m]) : null
            if (v1 === null && v2 === null) combined[m] = null
            else if (v1 === null) combined[m] = Math.round(v2!)
            else if (v2 === null) combined[m] = Math.round(v1)
            else combined[m] = Math.round((v1 * t1 + v2 * t2) / total)
          }
          return combined
        }

        // Recompute 'All' as weighted NPS across New+Return (matches individual-response calculation)
        function computeAllRows(newReturnRows: any[]): any[] {
          const groupMap = new Map<string, any[]>()
          for (const row of newReturnRows) {
            const key = `${row.season}||${row.program}||${row.coach}`
            if (!groupMap.has(key)) groupMap.set(key, [])
            groupMap.get(key)!.push(row)
          }
          const allRows: any[] = []
          const metrics = ['feedback_nps', 'comms_nps', 'rel_nps', 'reco_nps', 'rhwb_comms_nps', 'rhwb_knowledge_nps', 'rhwb_reco_nps']
          for (const [key, rows] of groupMap) {
            const [season, program, coach] = key.split('||')
            const totalResponses = rows.reduce((s: number, r: any) => s + Number(r.total_responses || 0), 0)
            const allRow: any = {
              season, season_phase: rows[0].season_phase, program, coach,
              runner_status: 'All',
              total_responses: totalResponses
            }
            for (const m of metrics) {
              const valid = rows.filter((r: any) => r[m] != null)
              if (valid.length === 0) {
                allRow[m] = null
              } else {
                // Weighted average: each row's NPS weighted by its response count
                const weightedSum = valid.reduce((s: number, r: any) => s + Number(r[m]) * Number(r.total_responses || 0), 0)
                const totalWeight = valid.reduce((s: number, r: any) => s + Number(r.total_responses || 0), 0)
                allRow[m] = totalWeight === 0 ? null : Math.round(weightedSum / totalWeight)
              }
            }
            allRows.push(allRow)
          }
          return allRows
        }

        // Build merged Season 15 New/Return map
        const s15Map = new Map<string, any>()
        for (const row of s15Supabase.filter((r: any) => r.runner_status !== 'All')) {
          s15Map.set(`${row.program}||${row.coach}||${row.runner_status}`, row)
        }
        for (const row of filteredS15Extra) {
          const key = `${row.program}||${row.coach}||${row.runner_status}`
          s15Map.set(key, s15Map.has(key) ? mergeNpsRows(s15Map.get(key), row) : row)
        }

        const mergedS15NewReturn = Array.from(s15Map.values())
        const mergedS15All = computeAllRows(mergedS15NewReturn)

        finalData = [...nonS15, ...mergedS15NewReturn, ...mergedS15All]
      }

      return jsonResponse({ data: finalData })
    }

    return jsonResponse({ error: `Unknown operation: ${operation}` }, 400)

  } catch (error) {
    console.error('Edge Function error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
