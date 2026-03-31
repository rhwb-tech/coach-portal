import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchNPSScores } from '../services/cloudSqlService';
import { MessageSquare } from 'lucide-react';

const selectedSeason = 'Season 15';

export default function CoachBenchmark() {
  const [surveyData, setSurveyData] = useState([]);
  const [npsData, setNpsData] = useState([]);
  const [rlbData, setRlbData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [liteRow, setLiteRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'coach', dir: 'asc' });
  const [expandedCoach, setExpandedCoach] = useState(null); // coach name
  const [commentsCache, setCommentsCache] = useState({});   // { coachName: { coach: [], rhwb: [], loading: false } }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [surveyResult, npsResult, rlbResult, categoryResult] = await Promise.all([
          supabase
            .from('v_survey_response_rate')
            .select('coach, respondents, runners_count, response_rate_percent')
            .eq('season', selectedSeason),
          (async () => {
            let rows = await fetchNPSScores();
            if (!rows || rows.length === 0) {
              const { data } = await supabase.from('v_nps_scores').select('*');
              rows = data || [];
            }
            return rows;
          })(),
          supabase
            .from('mv_coach_metrics')
            .select('coach, meso, meso_no, runners_left_behind_count, runs_with_comments, runs_with_no_comments, runner_count')
            .eq('season', selectedSeason)
            .order('coach')
            .order('meso'),
          supabase
            .from('v_comment_category_counts')
            .select('coach, category, count')
            .eq('season', selectedSeason)
        ]);

        setSurveyData(surveyResult.data || []);
        setNpsData((npsResult || []).filter(d => d.season === selectedSeason && d.runner_status === 'All'));
        setRlbData(rlbResult.data || []);
        setCategoryData(categoryResult.data || []);

        // Lite runners (no coach assigned)
        const [liteRunnersRes, liteRespondentsRes] = await Promise.all([
          supabase
            .from('runner_season_info')
            .select('email_id')
            .eq('season', selectedSeason)
            .eq('segment', 'Lite'),
          supabase
            .from('nps_survey_responses')
            .select('rhwb_recommendation')
            .eq('season', selectedSeason)
            .is('coach_email', null)
        ]);
        const liteRunners     = (liteRunnersRes.data || []).length;
        const liteResponses   = liteRespondentsRes.data || [];
        const liteRespondents = liteResponses.length;

        // Compute RHWB NPS from individual rhwb_recommendation scores
        const scores = liteResponses.map(r => Number(r.rhwb_recommendation)).filter(s => !isNaN(s));
        const promoters  = scores.filter(s => s >= 9).length;
        const detractors = scores.filter(s => s <= 6).length;
        const liteRhwbNps = scores.length > 0 ? Math.round(((promoters - detractors) / scores.length) * 100) : null;

        setLiteRow({
          coach: 'Lite (No Coach)',
          respondents: liteRespondents,
          runners_count: liteRunners,
          response_rate: liteRunners > 0 ? Math.round((liteRespondents / liteRunners) * 100) : null,
          coach_nps: null, rhwb_nps: liteRhwbNps, feedback_ratio: null,
        });
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build RLB map: coach -> { meso -> count }
  const rlbMap = useMemo(() => {
    const map = {};
    for (const row of rlbData) {
      if (!map[row.coach]) map[row.coach] = {};
      map[row.coach][row.meso] = Number(row.runners_left_behind_count) || 0;
    }
    return map;
  }, [rlbData]);

  // Build feedback ratio map: coach -> ratio (0-100)
  const feedbackRatioMap = useMemo(() => {
    const totals = {};
    for (const row of rlbData) {
      if (!totals[row.coach]) totals[row.coach] = { with: 0, without: 0 };
      totals[row.coach].with    += Number(row.runs_with_comments)    || 0;
      totals[row.coach].without += Number(row.runs_with_no_comments) || 0;
    }
    const map = {};
    for (const [coach, t] of Object.entries(totals)) {
      const total = t.with + t.without;
      map[coach] = total > 0 ? Math.round((t.with / total) * 100) : null;
    }
    return map;
  }, [rlbData]);

  // Build coach name -> email map from rlbData
  const coachEmailMap = useMemo(() => {
    const map = {};
    for (const row of rlbData) {
      if (row.coach && row.email_id) map[row.coach] = row.email_id;
    }
    return map;
  }, [rlbData]);

  const toggleComments = useCallback(async (coachName) => {
    // Collapse if already open
    if (expandedCoach === coachName) { setExpandedCoach(null); return; }
    setExpandedCoach(coachName);
    // Return if already cached
    if (commentsCache[coachName]) return;
    // Mark loading
    setCommentsCache(prev => ({ ...prev, [coachName]: { coach: [], rhwb: [], loading: true } }));
    try {
      // Resolve coach email from v_rhwb_roles by exact name match
      const { data: roleData } = await supabase
        .from('v_rhwb_roles')
        .select('email_id')
        .eq('full_name', coachName)
        .maybeSingle();
      const email = roleData?.email_id || null;

      let q = supabase
        .from('nps_survey_responses')
        .select('comments, rhwb_comments')
        .eq('season', selectedSeason);
      if (email) q = q.ilike('coach_email', email);
      else q = q.is('coach_email', null);
      const { data } = await q;
      const rows = data || [];
      setCommentsCache(prev => ({
        ...prev,
        [coachName]: {
          loading: false,
          coach: rows.map(r => r.comments).filter(Boolean),
          rhwb:  rows.map(r => r.rhwb_comments).filter(Boolean),
        }
      }));
    } catch {
      setCommentsCache(prev => ({ ...prev, [coachName]: { coach: [], rhwb: [], loading: false } }));
    }
  }, [expandedCoach, commentsCache]);

  // Build runner count sparkline data: coach -> [{ meso_no, count }] sorted by meso_no
  const runnerSparkMap = useMemo(() => {
    const map = {};
    for (const row of rlbData) {
      if (!map[row.coach]) map[row.coach] = {};
      const mesoNo = Number(row.meso_no);
      map[row.coach][mesoNo] = (map[row.coach][mesoNo] || 0) + (Number(row.runner_count) || 0);
    }
    const result = {};
    for (const [coach, mesoMap] of Object.entries(map)) {
      result[coach] = Object.entries(mesoMap)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([mesoNo, count]) => ({ meso: Number(mesoNo), count }));
    }
    return result;
  }, [rlbData]);

  // Build category map: coach -> { category -> count }
  const CATEGORY_COLORS = {
    'Technical Feedback':      '#10B981',
    'Acknowledgement':         '#EF4444',
    'Positive Feedback':       '#F59E0B',
    'General':                 '#8B5CF6',
    'Motivation & Encouragement': '#3B82F6',
  };
  const CATEGORY_ORDER = [
    'Technical Feedback',
    'Acknowledgement',
    'Positive Feedback',
    'General',
    'Motivation & Encouragement',
  ];

  const categoryMap = useMemo(() => {
    const map = {};
    for (const row of categoryData) {
      if (!map[row.coach]) map[row.coach] = {};
      map[row.coach][row.category] = Number(row.count) || 0;
    }
    return map;
  }, [categoryData]);

  // Determine all meso numbers present across all coaches
  const allMesos = useMemo(() => {
    const mesoSet = new Set(rlbData.map(r => r.meso));
    return [...mesoSet].sort((a, b) => Number(a) - Number(b));
  }, [rlbData]);

  const tableData = useMemo(() => {
    const coachMap = {};

    for (const row of surveyData) {
      coachMap[row.coach] = {
        coach: row.coach,
        respondents: Number(row.respondents) || 0,
        runners_count: Number(row.runners_count) || 0,
        response_rate: Number(row.response_rate_percent) || 0,
        coachNpsSum: null,
        rhwbNpsSum: null,
        npsWeight: 0,
        npsRespondents: 0,
      };
    }

    // Weighted NPS across programs; also accumulate NPS-derived respondent count
    // (total_responses from 'All' rows includes Cloud Run data, unlike v_survey_response_rate)
    for (const row of npsData) {
      const name = row.coach;
      if (!coachMap[name]) {
        coachMap[name] = {
          coach: name,
          respondents: 0,
          runners_count: 0,
          response_rate: 0,
          coachNpsSum: null,
          rhwbNpsSum: null,
          npsWeight: 0,
          npsRespondents: 0,
        };
      }
      const w = Number(row.total_responses) || 1;
      const c = coachMap[name];
      c.coachNpsSum = (c.coachNpsSum ?? 0) + Number(row.reco_nps) * w;
      c.rhwbNpsSum = (c.rhwbNpsSum ?? 0) + Number(row.rhwb_reco_nps) * w;
      c.npsWeight += w;
      c.npsRespondents += w;
    }

    return Object.values(coachMap)
      .map(c => {
        // Prefer NPS-derived respondent count (includes Cloud Run data)
        const respondents = c.npsRespondents > 0 ? c.npsRespondents : c.respondents;
        const runners_count = c.runners_count;
        const response_rate = runners_count > 0 && respondents > 0
          ? Math.round((respondents / runners_count) * 100)
          : c.response_rate;
        return {
          coach: c.coach,
          respondents,
          runners_count,
          response_rate,
          coach_nps: c.npsWeight > 0 ? Math.round(c.coachNpsSum / c.npsWeight) : null,
          rhwb_nps: c.npsWeight > 0 ? Math.round(c.rhwbNpsSum / c.npsWeight) : null,
        };
      })
      .sort((a, b) => a.coach.localeCompare(b.coach));
  }, [surveyData, npsData]);

  const sortedTableData = useMemo(() => {
    const { key, dir } = sortConfig;
    const enriched = tableData.map(row => ({
      ...row,
      feedback_ratio: feedbackRatioMap[row.coach] ?? null,
    }));
    return enriched.sort((a, b) => {
      const av = a[key] ?? null;
      const bv = b[key] ?? null;
      // nulls always last
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return dir === 'asc' ? cmp : -cmp;
    });
  }, [tableData, sortConfig, feedbackRatioMap]);

  const footerData = useMemo(() => {
    // Respondents + runners: sum from tableData
    const totalRespondents = tableData.reduce((s, r) => s + (r.respondents || 0), 0);
    const totalRunners     = tableData.reduce((s, r) => s + (r.runners_count || 0), 0);
    const responseRate = totalRunners > 0 ? Math.round((totalRespondents / totalRunners) * 100) : null;

    // NPS: weighted across all npsData rows (true dataset-level NPS, not average of coaches)
    let coachNpsSum = 0, rhwbNpsSum = 0, npsWeight = 0;
    for (const row of npsData) {
      const w = Number(row.total_responses) || 1;
      coachNpsSum += Number(row.reco_nps) * w;
      rhwbNpsSum  += Number(row.rhwb_reco_nps) * w;
      npsWeight   += w;
    }
    const coachNps = npsWeight > 0 ? Math.round(coachNpsSum / npsWeight) : null;
    const rhwbNps  = npsWeight > 0 ? Math.round(rhwbNpsSum  / npsWeight) : null;

    // Feedback ratio: sum raw runs across all coaches/mesos
    let withComments = 0, withoutComments = 0;
    for (const row of rlbData) {
      withComments    += Number(row.runs_with_comments)    || 0;
      withoutComments += Number(row.runs_with_no_comments) || 0;
    }
    const feedbackRatio = (withComments + withoutComments) > 0
      ? Math.round((withComments / (withComments + withoutComments)) * 100)
      : null;

    // RLB per meso: sum across all coaches
    const rlbByMeso = {};
    for (const mesoMap of Object.values(rlbMap)) {
      for (const [meso, count] of Object.entries(mesoMap)) {
        rlbByMeso[meso] = (rlbByMeso[meso] || 0) + count;
      }
    }

    // Category totals across all coaches
    const catTotals = {};
    for (const cats of Object.values(categoryMap)) {
      for (const cat of CATEGORY_ORDER) {
        catTotals[cat] = (catTotals[cat] || 0) + (cats[cat] || 0);
      }
    }
    const catTotal = CATEGORY_ORDER.reduce((s, c) => s + (catTotals[c] || 0), 0);

    return { totalRespondents, totalRunners, responseRate, coachNps, rhwbNps, feedbackRatio, rlbByMeso, catTotals, catTotal };
  }, [tableData, npsData, rlbData, rlbMap, categoryMap]);

  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'coach' ? 'asc' : 'desc' }
    );
  };

  const SortIcon = ({ colKey }) => {
    if (sortConfig.key !== colKey) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  const npsCellClass = (score) => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score > 80)  return 'bg-green-800 text-white font-semibold';
    if (score > 50)  return 'bg-green-100 text-green-800 font-semibold';
    if (score >= 0)  return 'bg-orange-100 text-orange-800 font-semibold';
    return 'bg-pink-100 text-pink-800 font-semibold';
  };

  const rateCellClass = (rate) => {
    if (rate === null || rate === undefined || rate === 0) return 'text-gray-400';
    if (rate > 95)  return 'bg-green-800 text-white font-semibold';
    if (rate >= 70) return 'bg-green-100 text-green-800 font-semibold';
    if (rate >= 40) return 'bg-orange-100 text-orange-800 font-semibold';
    return 'bg-pink-100 text-pink-800 font-semibold';
  };

  const feedbackRatioCellClass = (ratio) => {
    if (ratio === null || ratio === undefined) return 'text-gray-400';
    if (ratio > 95)  return 'bg-green-800 text-white font-semibold';
    if (ratio >= 75) return 'bg-green-100 text-green-800 font-semibold';
    if (ratio >= 50) return 'bg-orange-100 text-orange-800 font-semibold';
    return 'bg-pink-100 text-pink-800 font-semibold';
  };

  const rlbBlockClass = (count) => {
    if (count === 0) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const Sparkline = ({ points }) => {
    if (!points || points.length < 2) {
      return <span className="text-gray-400 text-xs">—</span>;
    }
    const W = 72, H = 24, PAD = 2;
    const counts = points.map(p => p.count);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const range = max - min || 1;
    const xs = points.map((_, i) => PAD + (i / (points.length - 1)) * (W - PAD * 2));
    const ys = points.map(p => H - PAD - ((p.count - min) / range) * (H - PAD * 2));
    const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    return (
      <svg width={W} height={H} className="overflow-visible">
        <polyline
          points={polyline}
          fill="none"
          stroke="#6366F1"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={xs[i]} cy={ys[i]} r="2" fill="#6366F1">
            <title>M{p.meso}: {p.count}</title>
          </circle>
        ))}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">RHWB Coach Performance Benchmark</h1>
          <p className="text-sm text-gray-500 mt-1">{selectedSeason} — Coach KPIs Overview</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-auto max-h-[calc(100vh-180px)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                {[
                  { key: 'coach',         label: 'Coach',          align: 'left'   },
                  { key: 'respondents',   label: 'Respondents',    align: 'center' },
                  { key: 'runners_count', label: 'Total Runners',  align: 'center' },
                  { key: null,            label: 'Runners / Meso', align: 'center' },
                  { key: 'response_rate', label: 'Response Rate',  align: 'center' },
                  { key: 'coach_nps',     label: 'Coach NPS',      align: 'center' },
                  { key: 'rhwb_nps',      label: 'RHWB NPS',       align: 'center' },
                  { key: 'feedback_ratio', label: 'Feedback Ratio', align: 'center' },
                  { key: null,            label: 'Runners Left Behind', align: 'center' },
                  { key: null,            label: 'Comment Categories',  align: 'center' },
                ].map(({ key, label, align }) => {
                  const sortable = !!key;
                  return (
                    <th
                      key={label}
                      onClick={sortable ? () => handleSort(key) : undefined}
                      className={`px-4 py-3 font-semibold text-gray-700 text-${align} ${sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}
                    >
                      {label}{sortable && <SortIcon colKey={key} />}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedTableData.map((row, i) => {
                const coachRlb = rlbMap[row.coach] || {};
                const feedbackRatio = feedbackRatioMap[row.coach] ?? null;
                const coachCats = categoryMap[row.coach] || {};
                const catTotal = CATEGORY_ORDER.reduce((s, c) => s + (coachCats[c] || 0), 0);
                return (
                  <React.Fragment key={row.coach}>
                  <tr className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-900 font-medium">{row.coach}</td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {row.respondents > 0 ? row.respondents : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {row.runners_count > 0 ? row.runners_count : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Sparkline points={runnerSparkMap[row.coach] || []} />
                    </td>
                    <td className={`px-4 py-3 text-center ${rateCellClass(row.response_rate)}`}>
                      {row.response_rate > 0 ? `${row.response_rate}%` : '—'}
                    </td>
                    <td className={`px-4 py-3 ${npsCellClass(row.coach_nps)}`}>
                      <div className="flex items-center justify-center gap-1">
                        <span>{row.coach_nps !== null ? row.coach_nps : '—'}</span>
                        <button onClick={() => toggleComments(row.coach)} title="View qualitative feedback" className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
                          <MessageSquare className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${npsCellClass(row.rhwb_nps)}`}>
                      <div className="flex items-center justify-center gap-1">
                        <span>{row.rhwb_nps !== null ? row.rhwb_nps : '—'}</span>
                        <button onClick={() => toggleComments(row.coach)} title="View qualitative feedback" className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
                          <MessageSquare className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-center ${feedbackRatioCellClass(feedbackRatio)}`}>
                      {feedbackRatio !== null ? `${feedbackRatio}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {allMesos.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          {allMesos.map(meso => {
                            const count = coachRlb[meso] ?? null;
                            return (
                              <div
                                key={meso}
                                className={`flex items-center justify-center rounded w-7 h-7 text-xs font-semibold ${count !== null ? rlbBlockClass(count) : 'bg-gray-100 text-gray-400'}`}
                                title={`Meso ${meso}: ${count !== null ? count : 'no data'}`}
                              >
                                {count !== null ? count : '—'}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {catTotal === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <div className="flex h-4 rounded overflow-hidden w-full min-w-24">
                          {CATEGORY_ORDER.map(cat => {
                            const count = coachCats[cat] || 0;
                            if (count === 0) return null;
                            const pct = (count / catTotal) * 100;
                            return (
                              <div
                                key={cat}
                                style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                                title={`${cat}: ${count} (${Math.round(pct)}%)`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedCoach === row.coach && (() => {
                    const cached = commentsCache[row.coach];
                    return (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan={10} className="px-6 py-4">
                          {cached?.loading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                              Loading feedback…
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Coach Qualitative Feedback</div>
                                {(cached?.coach || []).length === 0 ? (
                                  <p className="text-sm text-gray-400 italic">No comments.</p>
                                ) : (
                                  <ul className="space-y-2">
                                    {cached.coach.map((c, idx) => (
                                      <li key={idx} className="text-sm text-gray-700 border-l-2 border-blue-300 pl-3 py-0.5">{c}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">RHWB Qualitative Feedback</div>
                                {(cached?.rhwb || []).length === 0 ? (
                                  <p className="text-sm text-gray-400 italic">No comments.</p>
                                ) : (
                                  <ul className="space-y-2">
                                    {cached.rhwb.map((c, idx) => (
                                      <li key={idx} className="text-sm text-gray-700 border-l-2 border-green-300 pl-3 py-0.5">{c}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })()}
                  </React.Fragment>
                );
              })}
              {liteRow && (() => {
                const rate = liteRow.response_rate;
                return (
                  <tr className="bg-blue-50 border-t border-blue-200 italic">
                    <td className="px-4 py-3 text-gray-700 font-medium">{liteRow.coach}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{liteRow.respondents > 0 ? liteRow.respondents : '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{liteRow.runners_count > 0 ? liteRow.runners_count : '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-400">—</td>
                    <td className={`px-4 py-3 text-center ${rate !== null ? rateCellClass(rate) : 'text-gray-400'}`}>
                      {rate !== null ? `${rate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">—</td>
                    <td className={`px-4 py-3 text-center ${liteRow.rhwb_nps !== null ? npsCellClass(liteRow.rhwb_nps) : 'text-gray-400'}`}>
                      {liteRow.rhwb_nps !== null ? liteRow.rhwb_nps : '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">—</td>
                    <td className="px-4 py-3 text-center text-gray-400">—</td>
                    <td className="px-4 py-3 text-center text-gray-400">—</td>
                  </tr>
                );
              })()}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-gray-800 sticky bottom-0 z-10">
                <td className="px-4 py-3 text-gray-900">Total / Average</td>
                <td className="px-4 py-3 text-center">{footerData.totalRespondents || '—'}</td>
                <td className="px-4 py-3 text-center">{footerData.totalRunners || '—'}</td>
                <td className="px-4 py-3 text-center text-gray-400 text-xs">—</td>
                <td className={`px-4 py-3 text-center ${rateCellClass(footerData.responseRate)}`}>
                  {footerData.responseRate !== null ? `${footerData.responseRate}%` : '—'}
                </td>
                <td className={`px-4 py-3 text-center ${npsCellClass(footerData.coachNps)}`}>
                  {footerData.coachNps !== null ? footerData.coachNps : '—'}
                </td>
                <td className={`px-4 py-3 text-center ${npsCellClass(footerData.rhwbNps)}`}>
                  {footerData.rhwbNps !== null ? footerData.rhwbNps : '—'}
                </td>
                <td className={`px-4 py-3 text-center ${feedbackRatioCellClass(footerData.feedbackRatio)}`}>
                  {footerData.feedbackRatio !== null ? `${footerData.feedbackRatio}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-center">
                    {allMesos.map(meso => {
                      const count = footerData.rlbByMeso[meso] ?? null;
                      return (
                        <div
                          key={meso}
                          className={`flex items-center justify-center rounded w-7 h-7 text-xs font-semibold ${count !== null ? rlbBlockClass(count) : 'bg-gray-100 text-gray-400'}`}
                          title={`Meso ${meso}: ${count ?? 'no data'}`}
                        >
                          {count !== null ? count : '—'}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {footerData.catTotal === 0 ? (
                    <span className="text-gray-400 text-xs">—</span>
                  ) : (
                    <div className="flex h-4 rounded overflow-hidden w-full min-w-24">
                      {CATEGORY_ORDER.map(cat => {
                        const count = footerData.catTotals[cat] || 0;
                        if (count === 0) return null;
                        const pct = (count / footerData.catTotal) * 100;
                        return (
                          <div
                            key={cat}
                            style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat] }}
                            title={`${cat}: ${count} (${Math.round(pct)}%)`}
                          />
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
          {tableData.length === 0 && (
            <div className="text-center py-12 text-gray-500">No data available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
