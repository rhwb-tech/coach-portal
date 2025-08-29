import { CHART_TYPES, COLOR_PALETTES } from '../utils/constants';

/**
 * Chart Configuration System
 * 
 * Each chart is defined with:
 * - id: unique identifier
 * - title: display title
 * - type: chart type (bar, line, pie, etc.)
 * - sql: SQL query to fetch data
 * - dataTransform: function to transform SQL results for chart
 * - options: chart-specific options
 * - responsive: responsive configuration
 */

export const CHART_CONFIGS = {
  athleteCompletion: {
    id: 'athleteCompletion',
    title: 'Athlete Scores',
    description: 'Cumulative Meso Score at the end of Mesocycle',
    type: CHART_TYPES.BAR,
    sql: `
      select a.coach, initcap(full_name) as runner_name, cumulative_score 
      from v_rhwb_meso_scores  a inner join rhwb_coaches b
            on a.coach = b.coach
      where season = $1 and b.email_id =  $2 and meso = $3 and category = 'Personal' 
      order by cumulative_score desc
    `,
    dataTransform: (data) => ({
      labels: data.map(row => row.runner_name),
      datasets: [{
        label: 'Cumulative Score',
        data: data.map(row => parseFloat(row.cumulative_score) || 0),
        backgroundColor: COLOR_PALETTES.performance[0],
        borderColor: COLOR_PALETTES.performance[0],
        borderWidth: 1,
        borderRadius: 4
      }]
    }),
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cumulative Meso Score'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Runner Name'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y}%`;
            }
          }
        }
      }
    },
    responsive: {
      aspectRatio: {
        sm: 1,
        md: 1.5,
        lg: 2
      }
    }
  },

  mesocycleProgress: {
    id: 'mesocycleProgress',
    title: 'Mesocycle Progress',
    description: 'Progress tracking across mesocycles',
    type: CHART_TYPES.LINE,
    sql: `
      SELECT 
        meso,
        COUNT(*) as athlete_count,
        ROUND(AVG(
          CASE 
            WHEN meso_score_override IS NOT NULL and meso_score_override != ''  THEN meso_score_override::decimal
            ELSE meso_score
          END
        ), 2) as avg_score
      FROM rhwb_coach_input rci
      WHERE coach_email = $1 
        AND season = $2
        AND meso IS NOT NULL
      GROUP BY meso
      ORDER BY meso;
    `,
    dataTransform: (data) => {
      
      // Sort data by meso to ensure correct order (handling text values like "Meso 1", "Meso 2")
      const sortedData = [...data].sort((a, b) => {
        // Extract the number from "Meso X" format
        const aNum = parseInt(a.meso.replace(/\D/g, ''));
        const bNum = parseInt(b.meso.replace(/\D/g, ''));
        return aNum - bNum;
      });
      
      
      const result = {
        labels: sortedData.map(row => row.meso),
        datasets: [
          {
            label: 'Average Score',
            data: sortedData.map(row => parseFloat(row.avg_score) || 0),
            borderColor: COLOR_PALETTES.primary[0],
            backgroundColor: COLOR_PALETTES.primary[0] + '20',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Athlete Count',
            data: sortedData.map(row => parseInt(row.athlete_count) || 0),
            borderColor: COLOR_PALETTES.primary[1],
            backgroundColor: COLOR_PALETTES.primary[1] + '20',
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      };
      
      
      return result;
    },
    options: {
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          max: 5,
          title: {
            display: true,
            text: 'Average Score'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Athlete Count'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    },
    responsive: {
      aspectRatio: {
        sm: 1,
        md: 1.8,
        lg: 2.2
      }
    }
  },

  feedbackRatio: {
    id: 'feedbackRatio',
    title: 'Feedback Ratio',
    description: 'Coach feedback ratio compared to average and target',
    type: 'BULLET_CHART',
    sql: `
      SELECT
        season,
        coach,
        email_id AS coach_email,
        meso,
        (runs_with_comments::numeric
          / NULLIF((runs_with_comments + runs_with_no_comments), 0)) * 100 AS feedback_ratio
      FROM coach_metrics
      WHERE season = $1 AND email_id = $2 AND meso = $3
    `,
    avgSql: `
      SELECT
        avg(runs_with_comments::numeric
          / NULLIF((runs_with_comments + runs_with_no_comments), 0)) * 100  AS total_avg_feedback_ratio,
        80::numeric AS target_ratio
      FROM coach_metrics
      WHERE season = $1 AND meso = $2
    `,
    dataTransform: (data, avgData) => {
      
      const coachData = data[0];
      const averageData = avgData?.[0];
      
      const result = {
        coachPercentage: parseFloat(coachData?.feedback_ratio || 0),
        averagePercentage: parseFloat(averageData?.total_avg_feedback_ratio || 0),
        target: parseFloat(averageData?.target_ratio || 80)
      };
      
      
      return result;
    },
    responsive: {
      aspectRatio: {
        sm: 1.2,
        md: 1.5,
        lg: 1.8
      }
    }
  },

  runnersLeftBehind: {
    id: 'runnersLeftBehind',
    title: 'Runners Left Behind',
    description: 'Runners that did not receive adequate feedback',
    type: 'RUNNER_LIST',
    sql: `
      SELECT runner_name 
      FROM coach_rlb 
      WHERE season = $1 AND coach_email = $2 AND meso = $3
    `,
    dataTransform: (data) => {
      return {
        runners: data.map(row => row.runner_name),
        count: data.length
      };
    },
    responsive: {
      aspectRatio: {
        sm: 1.2,
        md: 1.5,
        lg: 1.8
      }
    }
  }
};

// Default table configuration
export const TABLE_CONFIG = {
  id: 'runnerSurveyResults',
  title: 'Runner Survey Results',
  description: 'Survey responses and feedback from runners',
  sql: `
    SELECT program, are_you_a_new_or_return_runner_to_rhwb, race_type,
    feedback_quality, communication, relationship, recommendation, comments, rhwb_effectiveness, 
    rhwb_knowledge_depth, rhwb_recommendation, rhwb_comments
    FROM v_survey_results 
    WHERE season = $1 AND coach_email = $2;
  `,
  columns: [
    { key: 'program', label: 'Program', sortable: true },
    { key: 'are_you_a_new_or_return_runner_to_rhwb', label: 'New/Return Runner', sortable: true },
    { key: 'race_type', label: 'Race Type', sortable: true },
    { key: 'feedback_quality', label: 'Feedback Quality', sortable: true },
    { key: 'communication', label: 'Communication', sortable: true },
    { key: 'relationship', label: 'Relationship', sortable: true },
    { key: 'recommendation', label: 'Recommendation', sortable: true },
    { key: 'comments', label: 'Comments', sortable: false },
    { key: 'rhwb_effectiveness', label: 'RHWB Effectiveness', sortable: true },
    { key: 'rhwb_knowledge_depth', label: 'RHWB Knowledge Depth', sortable: true },
    { key: 'rhwb_recommendation', label: 'RHWB Recommendation', sortable: true },
    { key: 'rhwb_comments', label: 'RHWB Comments', sortable: false }
  ]
};

// Function to get chart config by ID
export const getChartConfig = (chartId) => {
  return CHART_CONFIGS[chartId] || null;
};

// Function to get all chart configs
export const getAllChartConfigs = () => {
  return Object.values(CHART_CONFIGS);
};

// Function to get table config
export const getTableConfig = () => {
  return TABLE_CONFIG;
};