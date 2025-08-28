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
      from rhwb_meso_scores  a inner join rhwb_coaches b
            on a.coach = b.coach
      where season = $1 and b.email_id =  $2 and category = 'Personal' 
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
      console.log('🔍 MESOCYCLE_CHART_DEBUG - SQL Query:', `
      SELECT 
        meso,
        COUNT(*) as athlete_count,
        ROUND(AVG(
          CASE 
            WHEN meso_score_override IS NOT NULL THEN meso_score_override::decimal
            ELSE meso_score
          END
        ), 2) as avg_score
      FROM rhwb_coach_input rci
      WHERE coach_email = $1 
        AND season = $2
        AND meso IS NOT NULL
      GROUP BY meso
      ORDER BY meso;
    `);
      console.log('🔍 MESOCYCLE_CHART_DEBUG - Parameters: [coachEmail, seasonName] (see insightsService logs for actual values)');
      console.log('🔍 MESOCYCLE_CHART_DEBUG - Raw data received:', data);
      
      // Sort data by meso to ensure correct order (handling text values like "Meso 1", "Meso 2")
      const sortedData = [...data].sort((a, b) => {
        // Extract the number from "Meso X" format
        const aNum = parseInt(a.meso.replace(/\D/g, ''));
        const bNum = parseInt(b.meso.replace(/\D/g, ''));
        return aNum - bNum;
      });
      
      console.log('🔍 MESOCYCLE_CHART_DEBUG - Sorted data:', sortedData);
      
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
      
      console.log('🔍 MESOCYCLE_CHART_DEBUG - Final chart data:', result);
      
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

  distanceDistribution: {
    id: 'distanceDistribution',
    title: 'Race Distance Distribution',
    description: 'Distribution of athletes by race distance',
    type: CHART_TYPES.PIE,
    sql: `
      SELECT 
        race_distance,
        COUNT(*) as athlete_count
      FROM rhwb_coach_input rci
      WHERE coach_email = $1 
        AND season = $2
        AND race_distance IS NOT NULL
      GROUP BY race_distance
      ORDER BY athlete_count DESC;
    `,
    dataTransform: (data) => ({
      labels: data.map(row => row.race_distance),
      datasets: [{
        data: data.map(row => parseInt(row.athlete_count) || 0),
        backgroundColor: COLOR_PALETTES.gradient,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    }),
    options: {
      plugins: {
        legend: {
          position: 'right'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed * 100) / total).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      }
    },
    responsive: {
      aspectRatio: {
        sm: 1,
        md: 1.2,
        lg: 1.5
      }
    }
  },

  strengthVsMileage: {
    id: 'strengthVsMileage',
    title: 'Strength vs Mileage Completion',
    description: 'Comparison of strength training and mileage completion',
    type: CHART_TYPES.BAR,
    sql: `
      SELECT 
        'Strength Training' as category,
        ROUND(AVG(
          CASE 
            WHEN planned_strength_trains = 0 THEN 0
            ELSE (completed_strength_trains * 100.0) / planned_strength_trains
          END
        ), 1) as completion_rate
      FROM rhwb_coach_input
      WHERE coach_email = $1 AND season = $2
      
      UNION ALL
      
      SELECT 
        'Mileage' as category,
        ROUND(AVG(
          CASE 
            WHEN planned_distance = 0 THEN 0
            ELSE (completed_distance * 100.0) / planned_distance
          END
        ), 1) as completion_rate
      FROM rhwb_coach_input
      WHERE coach_email = $1 AND season = $2;
    `,
    dataTransform: (data) => ({
      labels: data.map(row => row.category),
      datasets: [{
        label: 'Completion Rate (%)',
        data: data.map(row => parseFloat(row.completion_rate) || 0),
        backgroundColor: [COLOR_PALETTES.performance[0], COLOR_PALETTES.performance[1]],
        borderColor: [COLOR_PALETTES.performance[0], COLOR_PALETTES.performance[1]],
        borderWidth: 1,
        borderRadius: 4
      }]
    }),
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed.y}%`;
            }
          }
        }
      }
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
  id: 'athleteDetails',
  title: 'Athlete Details',
  description: 'Comprehensive athlete performance data',
  sql: `
    SELECT 
      rci.runner_name,
      rci.race_distance,
      rci.meso,
      rci.planned_strength_trains,
      rci.completed_strength_trains,
      rci.planned_distance,
      rci.completed_distance,
      ROUND(
        CASE 
          WHEN (rci.planned_strength_trains + rci.planned_distance) = 0 THEN 0
          ELSE ((rci.completed_strength_trains + rci.completed_distance) * 100.0) / 
               (rci.planned_strength_trains + rci.planned_distance)
        END, 1
      ) as completion_rate,
      CASE 
        WHEN rci.meso_score_override IS NOT NULL THEN rci.meso_score_override
        ELSE rci.meso_score
      END as final_score,
      rci.meso_qual_score,
      rci.season_phase
    FROM rhwb_coach_input rci
    WHERE rci.coach_email = $1 
      AND rci.season = $2
      AND rci.runner_name IS NOT NULL
    ORDER BY completion_rate DESC, final_score DESC;
  `,
  columns: [
    { key: 'runner_name', label: 'Athlete Name', sortable: true },
    { key: 'race_distance', label: 'Distance', sortable: true },
    { key: 'meso', label: 'Meso', sortable: true },
    { key: 'planned_strength_trains', label: 'Strength Planned', sortable: true },
    { key: 'completed_strength_trains', label: 'Strength Completed', sortable: true },
    { key: 'planned_distance', label: 'Mileage Planned', sortable: true },
    { key: 'completed_distance', label: 'Mileage Completed', sortable: true },
    { key: 'completion_rate', label: 'Completion %', sortable: true, format: 'percentage' },
    { key: 'final_score', label: 'Score', sortable: true, format: 'decimal' },
    { key: 'season_phase', label: 'Phase', sortable: true }
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