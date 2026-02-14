#!/usr/bin/env node

/**
 * Debug Script - Analyze Uncategorized Comments
 * 
 * This script specifically looks at comments that should have been categorized 
 * but weren't, to understand why the UPDATE statements might have failed.
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables  
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Categorization function (exact copy from the categorization script)
 */
function categorizeComment(comment) {
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return 'General';
  }

  // Rule 1: One or two word comments are Acknowledgement
  const cleanComment = comment.replace(/&lt;.*?&gt;|&nbsp;|&amp;#\d+;|\W+/g, ' ');
  const words = cleanComment.split(' ').filter(word => word.trim().length > 0);
  
  if (words.length <= 2) {
    return 'Acknowledgement';
  }

  // Convert to lowercase for case-insensitive matching
  const commentLower = comment.toLowerCase();

  // Rule 2: Technical Feedback
  const technicalTerms = [
    'hr', 'heart rate', 'cadence', 'pace', 'stride', 'form',
    'technique', 'split', 'tempo', 'speed', 'distance', 'km',
    'miles', 'elevation', 'intervals', 'recovery', 'metrics'
  ];

  if (technicalTerms.some(term => commentLower.includes(term))) {
    return 'Technical Feedback';
  }

  // Rule 3: Motivation & Encouragement
  const encouragementTerms = [
    'great job', 'well done', 'keep it up', 'good work',
    'awesome', 'amazing', 'proud', 'impressed', 'keep going',
    'encouraging', 'motivating', 'fantastic', 'excellent',
    'wonderful', 'superb', 'terrific', 'bravo', 'kudos'
  ];

  if (encouragementTerms.some(term => commentLower.includes(term))) {
    return 'Motivation & Encouragement';
  }

  // Rule 4: Positive Feedback
  const positiveTerms = [
    'good', 'nice', 'great', 'love', 'enjoy', 'happy', 'impressive',
    'perfect', 'well', 'congrats', 'congratulations', 'thumbs up'
  ];

  if (positiveTerms.some(term => commentLower.includes(term))) {
    return 'Positive Feedback';
  }

  // Rule 5: If none of the above, it's General
  return 'General';
}

/**
 * Debug uncategorized comments
 */
async function debugUncategorizedComments() {
  try {
    console.log('🔍 DEBUGGING UNCATEGORIZED COMMENTS');
    console.log('=' .repeat(60));

    // Get all comments from coaches that aren't categorized
    const { data: coaches } = await supabase
      .from('rhwb_coaches')
      .select('email_id');

    const coachEmails = new Set(coaches.map(coach => coach.email_id));

    const { data: allComments } = await supabase
      .from('rhwb_activities_comments')
      .select('workout_key, comment_text, comment_user, category')
      .in('comment_user', Array.from(coachEmails))
      .not('comment_text', 'is', null);

    // Filter to valid, uncategorized comments
    const uncategorizedComments = allComments.filter(comment => 
      comment.comment_text && 
      comment.comment_text.trim() &&
      (!comment.category || comment.category === '' || comment.category === null)
    );

    console.log(`Found ${uncategorizedComments.length} uncategorized comments from coaches`);
    console.log('\n🧪 TESTING CATEGORIZATION ON UNCATEGORIZED COMMENTS:');
    console.log('-' .repeat(60));

    // Test categorization on first 10 uncategorized comments
    const testSample = uncategorizedComments.slice(0, 10);

    testSample.forEach((comment, index) => {
      const predictedCategory = categorizeComment(comment.comment_text);
      console.log(`\n${index + 1}. Comment: "${comment.comment_text}"`);
      console.log(`   Predicted Category: ${predictedCategory}`);
      console.log(`   Current Category: ${comment.category || 'NULL'}`);
      console.log(`   Workout Key: ${comment.workout_key}`);
      console.log(`   Comment User: ${comment.comment_user}`);
    });

    // Now let's try to manually execute one update to see what happens
    console.log('\n🔧 TESTING MANUAL UPDATE ON ONE COMMENT:');
    console.log('-' .repeat(60));

    if (testSample.length > 0) {
      const testComment = testSample[0];
      const predictedCategory = categorizeComment(testComment.comment_text);
      
      console.log(`Attempting to update comment: "${testComment.comment_text}"`);
      console.log(`Setting category to: ${predictedCategory}`);
      
      const { data, error } = await supabase
        .from('rhwb_activities_comments')
        .update({ category: predictedCategory })
        .eq('workout_key', testComment.workout_key)
        .eq('comment_text', testComment.comment_text)
        .select();

      if (error) {
        console.log(`❌ Update failed: ${error.message}`);
        console.log(`Error code: ${error.code}`);
        console.log(`Error details:`, error.details);
        console.log(`Error hint:`, error.hint);
      } else {
        console.log(`✅ Update successful! Affected rows: ${data.length}`);
        if (data.length > 0) {
          console.log(`Updated record:`, data[0]);
        }
      }

      // Let's also try with just workout_key to see if that works
      console.log('\n🔧 TESTING UPDATE WITH JUST WORKOUT_KEY:');
      const { data: data2, error: error2 } = await supabase
        .from('rhwb_activities_comments')
        .update({ category: predictedCategory })
        .eq('workout_key', testComment.workout_key)
        .select();

      if (error2) {
        console.log(`❌ Update with workout_key only failed: ${error2.message}`);
      } else {
        console.log(`✅ Update with workout_key only successful! Affected rows: ${data2.length}`);
      }
    }

    // Check for potential duplicates or issues
    console.log('\n🔍 CHECKING FOR POTENTIAL ISSUES:');
    console.log('-' .repeat(60));

    // Check for duplicate workout_keys with different comment_text
    const workoutKeyCounts = {};
    uncategorizedComments.forEach(comment => {
      if (!workoutKeyCounts[comment.workout_key]) {
        workoutKeyCounts[comment.workout_key] = [];
      }
      workoutKeyCounts[comment.workout_key].push(comment.comment_text);
    });

    const duplicateWorkoutKeys = Object.entries(workoutKeyCounts)
      .filter(([, texts]) => texts.length > 1);

    if (duplicateWorkoutKeys.length > 0) {
      console.log(`Found ${duplicateWorkoutKeys.length} workout keys with multiple comments:`);
      duplicateWorkoutKeys.slice(0, 3).forEach(([key, texts]) => {
        console.log(`  Workout Key: ${key}`);
        texts.forEach((text, i) => {
          console.log(`    Comment ${i + 1}: "${text.substring(0, 50)}..."`);
        });
      });
    } else {
      console.log('No duplicate workout keys found among uncategorized comments');
    }

    // Check for unusual characters in comment text
    console.log('\n🔍 CHECKING FOR UNUSUAL CHARACTERS:');
    const unusualChars = uncategorizedComments.filter(comment => 
      comment.comment_text.includes('&') || 
      comment.comment_text.includes('<') || 
      comment.comment_text.includes('>') ||
      comment.comment_text.includes('&#')
    );

    console.log(`Found ${unusualChars.length} comments with HTML entities or special characters`);
    if (unusualChars.length > 0) {
      unusualChars.slice(0, 3).forEach((comment, i) => {
        console.log(`  ${i + 1}. "${comment.comment_text}"`);
      });
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
}

// Run the debug script
if (require.main === module) {
  debugUncategorizedComments();
}