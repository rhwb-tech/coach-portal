#!/usr/bin/env node

/**
 * Investigation Script - Analyze Categorization Results
 * 
 * This script investigates why some comments may not have been categorized
 * and provides detailed SQL statements and filtering logic analysis.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Generate the exact SQL update statements that would be used
 */
function generateSQLStatements(categorizedComments) {
  console.log('\n📝 EXACT SQL UPDATE STATEMENTS THAT WERE EXECUTED:');
  console.log('=' .repeat(80));
  
  // Show first 5 examples
  const examples = categorizedComments.slice(0, 5);
  
  examples.forEach((comment, index) => {
    console.log(`\n-- Update Statement ${index + 1}:`);
    console.log(`UPDATE rhwb_activities_comments`);
    console.log(`SET category = '${comment.category}'`);
    console.log(`WHERE workout_key = '${comment.workout_key}'`);
    console.log(`  AND comment_text = '${comment.comment_text.replace(/'/g, "''")}'`);
    console.log(`  AND comment_user = '${comment.comment_user}';`);
  });
  
  if (categorizedComments.length > 5) {
    console.log(`\n... and ${categorizedComments.length - 5} more similar UPDATE statements`);
  }
  
  console.log('\n📋 UPDATE PATTERN SUMMARY:');
  console.log(`Total UPDATE statements executed: ${categorizedComments.length}`);
  console.log('WHERE conditions used for each update:');
  console.log('  1. workout_key = [specific workout key]');
  console.log('  2. comment_text = [exact comment text match]');
  console.log('  3. comment_user = [coach email] (implicit from the filtering logic)');
}

/**
 * Analyze database state and filtering logic
 */
async function analyzeCategorizationResults() {
  try {
    console.log('🔍 ANALYZING CATEGORIZATION RESULTS AND FILTERING LOGIC');
    console.log('=' .repeat(80));

    // 1. Get total comments in rhwb_activities_comments
    console.log('\n1️⃣  TOTAL ROWS ANALYSIS:');
    console.log('-' .repeat(40));
    
    const { data: allComments, error: allCommentsError } = await supabase
      .from('rhwb_activities_comments')
      .select('workout_key, comment_text, comment_user, category');

    if (allCommentsError) {
      console.error('❌ Error fetching all comments:', allCommentsError);
      return;
    }

    console.log(`Total rows in rhwb_activities_comments: ${allComments.length}`);

    // 2. Get all coach emails
    const { data: coaches, error: coachesError } = await supabase
      .from('rhwb_coaches')
      .select('email_id, coach');

    if (coachesError) {
      console.error('❌ Error fetching coaches:', coachesError);
      return;
    }

    const coachEmails = new Set(coaches.map(coach => coach.email_id));
    console.log(`Total coach emails in rhwb_coaches table: ${coachEmails.size}`);

    // 3. Apply the exact filtering logic used in the categorization script
    console.log('\n2️⃣  FILTERING LOGIC ANALYSIS:');
    console.log('-' .repeat(40));
    console.log('Filtering criteria applied (same as in categorize_comments.js):');
    console.log('  ✅ comment_text must exist and not be empty');
    console.log('  ✅ comment_text must have content after trimming whitespace');
    console.log('  ✅ comment_user must be in the rhwb_coaches.email_id list');

    // Apply exact filtering logic
    const validComments = allComments.filter(comment => 
      comment.comment_text && 
      comment.comment_text.trim() &&
      coachEmails.has(comment.comment_user)
    );

    console.log(`\nFiltering Results:`);
    console.log(`  Comments with valid text: ${allComments.filter(c => c.comment_text && c.comment_text.trim()).length}`);
    console.log(`  Comments from valid coaches: ${allComments.filter(c => coachEmails.has(c.comment_user)).length}`);
    console.log(`  Comments meeting ALL criteria: ${validComments.length}`);

    // 4. Analyze categorization status
    console.log('\n3️⃣  CATEGORIZATION STATUS:');
    console.log('-' .repeat(40));

    const categorizedComments = validComments.filter(c => c.category !== null && c.category !== undefined && c.category !== '');
    const uncategorizedValidComments = validComments.filter(c => !c.category);

    console.log(`Valid comments that WERE categorized: ${categorizedComments.length}`);
    console.log(`Valid comments that were NOT categorized: ${uncategorizedValidComments.length}`);

    // 5. Show category distribution of what WAS categorized
    if (categorizedComments.length > 0) {
      console.log('\n4️⃣  CATEGORY DISTRIBUTION (SUCCESSFULLY CATEGORIZED):');
      console.log('-' .repeat(40));

      const categoryStats = {};
      categorizedComments.forEach(comment => {
        categoryStats[comment.category] = (categoryStats[comment.category] || 0) + 1;
      });

      const sortedCategories = Object.entries(categoryStats).sort(([,a], [,b]) => b - a);
      sortedCategories.forEach(([category, count]) => {
        const percentage = ((count / categorizedComments.length) * 100).toFixed(2);
        console.log(`  ${category}: ${count} (${percentage}%)`);
      });
    }

    // 6. Analyze WHY some comments weren't categorized
    console.log('\n5️⃣  ANALYSIS: WHY SOME COMMENTS WERE NOT CATEGORIZED');
    console.log('-' .repeat(40));

    // Comments that were excluded by filtering
    const excludedByEmptyText = allComments.filter(c => !c.comment_text || !c.comment_text.trim()).length;
    const excludedByInvalidCoach = allComments.filter(c => 
      c.comment_text && c.comment_text.trim() && !coachEmails.has(c.comment_user)
    ).length;

    console.log(`Comments excluded due to empty/null text: ${excludedByEmptyText}`);
    console.log(`Comments excluded due to non-coach user: ${excludedByInvalidCoach}`);
    console.log(`Comments that met criteria but weren't categorized: ${uncategorizedValidComments.length}`);

    // 7. Show examples of uncategorized but valid comments
    if (uncategorizedValidComments.length > 0) {
      console.log('\n6️⃣  SAMPLE UNCATEGORIZED COMMENTS (THAT SHOULD HAVE BEEN PROCESSED):');
      console.log('-' .repeat(40));

      const sampleUncategorized = uncategorizedValidComments.slice(0, 10);
      sampleUncategorized.forEach((comment, index) => {
        let displayText = comment.comment_text;
        if (displayText && displayText.length > 60) {
          displayText = displayText.substring(0, 60) + '...';
        }
        console.log(`  ${index + 1}. "${displayText}" (by: ${comment.comment_user})`);
      });

      if (uncategorizedValidComments.length > 10) {
        console.log(`  ... and ${uncategorizedValidComments.length - 10} more uncategorized comments`);
      }
    }

    // 8. Show examples of non-coach comments that were excluded
    const nonCoachComments = allComments.filter(c => 
      c.comment_text && c.comment_text.trim() && !coachEmails.has(c.comment_user)
    );

    if (nonCoachComments.length > 0) {
      console.log('\n7️⃣  SAMPLE COMMENTS EXCLUDED (NON-COACH USERS):');
      console.log('-' .repeat(40));

      const uniqueNonCoachUsers = [...new Set(nonCoachComments.map(c => c.comment_user))];
      console.log(`Unique non-coach comment users: ${uniqueNonCoachUsers.length}`);
      console.log(`Total comments from non-coach users: ${nonCoachComments.length}`);
      
      const sampleNonCoach = nonCoachComments.slice(0, 5);
      sampleNonCoach.forEach((comment, index) => {
        let displayText = comment.comment_text;
        if (displayText && displayText.length > 60) {
          displayText = displayText.substring(0, 60) + '...';
        }
        console.log(`  ${index + 1}. "${displayText}" (by: ${comment.comment_user})`);
      });
    }

    // 9. Generate SQL statements that were actually executed
    if (categorizedComments.length > 0) {
      generateSQLStatements(categorizedComments);
    }

    console.log('\n✅ ANALYSIS COMPLETE');
    console.log('=' .repeat(80));

    return {
      totalComments: allComments.length,
      totalCoaches: coachEmails.size,
      validComments: validComments.length,
      categorizedComments: categorizedComments.length,
      uncategorizedValidComments: uncategorizedValidComments.length,
      excludedByEmptyText,
      excludedByInvalidCoach,
      nonCoachComments: nonCoachComments.length
    };

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🔍 RHWB CATEGORIZATION INVESTIGATION TOOL');
    console.log('=' .repeat(80));

    const results = await analyzeCategorizationResults();

    console.log('\n📊 SUMMARY STATISTICS:');
    console.log('=' .repeat(80));
    console.log(`Total rows in database: ${results.totalComments}`);
    console.log(`Rows that met filtering criteria: ${results.validComments}`);
    console.log(`Rows successfully categorized: ${results.categorizedComments}`);
    console.log(`Rows eligible but not categorized: ${results.uncategorizedValidComments}`);
    console.log(`Rows excluded (empty text): ${results.excludedByEmptyText}`);
    console.log(`Rows excluded (non-coach user): ${results.excludedByInvalidCoach}`);

    const categorizationRate = ((results.categorizedComments / results.validComments) * 100).toFixed(2);
    console.log(`\nCategorization success rate: ${categorizationRate}% of eligible comments`);

    if (results.uncategorizedValidComments > 0) {
      console.log('\n⚠️  RECOMMENDATION:');
      console.log('There are eligible comments that were not categorized. Consider re-running the categorization script.');
    }

  } catch (error) {
    console.error('\n❌ INVESTIGATION FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}