import { supabase } from './supabaseClient';

const EDGE_FUNCTION_NAME = 'get-coach-portal-data';

async function callEdgeFunction(operation, params = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // No active session (e.g. email override mode) — skip Cloud SQL calls gracefully
    console.warn(`Cloud SQL (${operation}): skipped — no active auth session`);
    return null;
  }

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: { operation, ...params },
  });

  if (error) {
    console.error(`Edge function error (${operation}):`, error);
    throw error;
  }

  return data;
}

export async function fetchQualScores(season, meso = null, coachEmail = null) {
  try {
    const params = { season };
    if (meso) params.meso = meso;
    if (coachEmail) params.coach_email = coachEmail;

    const result = await callEdgeFunction('get-qual-scores', params);
    return result?.data || [];
  } catch (error) {
    console.error('Failed to fetch qual scores from Cloud SQL:', error);
    return [];
  }
}

export async function upsertQualScore(emailId, season, meso, qualScore) {
  try {
    const result = await callEdgeFunction('upsert-qual-score', {
      email_id: emailId,
      season,
      meso,
      qual_score: qualScore,
    });
    return result?.success || false;
  } catch (error) {
    console.error('Failed to upsert qual score to Cloud SQL:', error);
    throw error;
  }
}

export async function fetchActionComments(actionRequestIds) {
  try {
    if (!actionRequestIds || actionRequestIds.length === 0) return [];

    const result = await callEdgeFunction('get-action-comments', {
      action_request_ids: actionRequestIds,
    });
    return result?.data || [];
  } catch (error) {
    console.error('Failed to fetch action comments from Cloud SQL:', error);
    return [];
  }
}

export async function upsertActionComment(actionRequestId, runnerEmailId, season, comment, actionType) {
  try {
    const result = await callEdgeFunction('upsert-action-comment', {
      action_request_id: actionRequestId,
      runner_email_id: runnerEmailId,
      season,
      comment,
      action_type: actionType,
    });
    return result?.success || false;
  } catch (error) {
    console.error('Failed to upsert action comment to Cloud SQL:', error);
    throw error;
  }
}
