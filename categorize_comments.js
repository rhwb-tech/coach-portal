#!/usr/bin/env node

/**
 * RHWB Comments Categorization Script
 *
 * Reads uncategorized coach comments from Cloud SQL (via Cloud Run),
 * applies categorization logic, and writes categories back to Cloud SQL.
 *
 * Categories:
 * 1. Acknowledgement - One or two word comments
 * 2. Technical Feedback - Contains running technique terms
 * 3. Motivation & Encouragement - Contains encouragement terms
 * 4. Positive Feedback - Contains positive terms
 * 5. General - All other comments
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load environment variables
require('dotenv').config();

const cloudRunUrl = process.env.CLOUD_RUN_URL;
const cloudRunApiKey = process.env.CLOUD_RUN_API_KEY;

if (!cloudRunUrl || !cloudRunApiKey) {
  console.error('❌ Missing Cloud Run environment variables (CLOUD_RUN_URL, CLOUD_RUN_API_KEY). Please check your .env file.');
  process.exit(1);
}

// Supabase client is still needed to fetch coach list
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function callCloudRun(endpoint, body) {
  const resp = await fetch(`${cloudRunUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': cloudRunApiKey,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloud Run ${endpoint} error ${resp.status}: ${text}`);
  }
  return resp.json();
}

/**
 * Categorize a comment based on the Python logic from comments_categorization.py
 * @param {string} comment - The comment text to categorize
 * @returns {string} - The category name
 */
function categorizeComment(comment) {
  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    return 'General';
  }

  // Rule 1: One or two word comments are Acknowledgement
  // Remove HTML tags, emojis, and other non-word characters before counting words
  const cleanComment = comment.replace(/&lt;.*?&gt;|&nbsp;|&amp;#\d+;|\W+/g, ' ');
  const words = cleanComment.split(' ').filter(word => word.trim().length > 0);
  
  if (words.length <= 2) {
    return 'Acknowledgement';
  }

  // Convert to lowercase for case-insensitive matching
  const commentLower = comment.toLowerCase();

  // Rule 2: Technical Feedback - contains running technique terms
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
 * Fetch coach email list from Supabase rhwb_coaches.
 * @returns {string[]} Array of coach email addresses
 */
async function fetchCoachEmails() {
  if (!supabase) {
    throw new Error('Supabase client not configured — set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
  }
  const { data, error } = await supabase.from('rhwb_coaches').select('email_id');
  if (error) throw error;
  return (data || []).map(c => c.email_id).filter(Boolean);
}

/**
 * Extract uncategorized coach comments from Cloud SQL via Cloud Run.
 * @returns {Array} Array of comment objects with workout_key, comment_text, comment_user
 */
async function extractComments() {
  console.log('📊 Fetching coach email list from Supabase...');
  const coachEmails = await fetchCoachEmails();
  console.log(`  Found ${coachEmails.length} coach email(s)`);

  console.log('📊 Extracting uncategorized coach comments from Cloud SQL...');
  try {
    const result = await callCloudRun('/get-uncategorized-comments', { coach_emails: coachEmails });
    const rows = result.data || [];
    console.log(`✅ Successfully extracted ${rows.length} uncategorized coach comments`);
    return rows.map(item => ({
      workout_key: item.workout_key,
      comment_text: (item.comment_text || '').trim(),
      comment_user: item.comment_user,
    }));
  } catch (error) {
    console.error('❌ Error extracting comments:', error.message);
    throw error;
  }
}

/**
 * Categorize all comments and provide analysis
 * @param {Array} comments - Array of comment objects
 * @returns {Object} Analysis results with categorized comments
 */
function categorizeAllComments(comments) {
  console.log('🔄 Applying categorization logic to all comments...');

  const categorizedComments = comments.map(comment => ({
    ...comment,
    category: categorizeComment(comment.comment_text)
  }));

  // Calculate category distribution
  const categoryStats = {};
  categorizedComments.forEach(comment => {
    categoryStats[comment.category] = (categoryStats[comment.category] || 0) + 1;
  });

  const totalComments = categorizedComments.length;

  console.log('\n📈 CATEGORIZATION ANALYSIS COMPLETE');
  console.log('=' .repeat(50));
  console.log(`Total Comments Processed: ${totalComments}`);
  console.log('\nCategory Distribution:');

  // Sort categories by count (descending)
  const sortedCategories = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a);

  sortedCategories.forEach(([category, count]) => {
    const percentage = ((count / totalComments) * 100).toFixed(2);
    console.log(`  ${category}: ${count} (${percentage}%)`);
  });

  return {
    categorizedComments,
    categoryStats,
    totalComments
  };
}

/**
 * Display sample comments for each category
 * @param {Object} analysis - Analysis results from categorizeAllComments
 */
function displaySampleComments(analysis) {
  const { categorizedComments } = analysis;
  
  console.log('\n📝 SAMPLE COMMENTS BY CATEGORY');
  console.log('=' .repeat(50));

  // Group comments by category
  const commentsByCategory = {};
  categorizedComments.forEach(comment => {
    if (!commentsByCategory[comment.category]) {
      commentsByCategory[comment.category] = [];
    }
    commentsByCategory[comment.category].push(comment);
  });

  // Display 3 examples from each category
  Object.entries(commentsByCategory).forEach(([category, comments]) => {
    console.log(`\n${category} (${comments.length} total):`);
    
    const samples = comments.slice(0, 3);
    samples.forEach((comment, index) => {
      let displayText = comment.comment_text;
      if (displayText.length > 100) {
        displayText = displayText.substring(0, 100) + '...';
      }
      console.log(`  ${index + 1}. "${displayText}"`);
    });
    
    if (comments.length > 3) {
      console.log(`  ... and ${comments.length - 3} more`);
    }
  });
}

/**
 * Get user confirmation before proceeding with database updates
 * @returns {Promise<boolean>} User's confirmation
 */
function getUserConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n⚠️  IMPORTANT: REVIEW REQUIRED');
    console.log('=' .repeat(50));
    console.log('Please review the categorization results above.');
    console.log('Do you want to proceed with updating the database? (y/N): ');

    rl.question('', (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

/**
 * Update Cloud SQL with categorized results via Cloud Run.
 * @param {Array} categorizedComments - Array of comments with categories
 * @returns {Promise<void>}
 */
async function updateDatabase(categorizedComments) {
  console.log('\n🔄 Updating Cloud SQL with categorization results via Cloud Run...');

  try {
    const batchSize = 100;
    let totalUpdated = 0;

    for (let i = 0; i < categorizedComments.length; i += batchSize) {
      const batch = categorizedComments.slice(i, i + batchSize);
      const updates = batch.map(c => ({
        workout_key: c.workout_key,
        comment_user: c.comment_user,
        category: c.category,
      }));

      const result = await callCloudRun('/categorize-activity-comments', { updates });
      totalUpdated += result.updated || 0;
      console.log(`  Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(categorizedComments.length / batchSize)} (${totalUpdated} updated so far)`);
    }

    console.log('\n✅ DATABASE UPDATE COMPLETE');
    console.log('='.repeat(50));
    console.log(`Successfully updated: ${totalUpdated} comments`);

    return { successCount: totalUpdated, errorCount: 0 };
  } catch (error) {
    console.error('❌ Error during database update:', error.message);
    throw error;
  }
}

/**
 * Verify categorization by checking how many comments remain uncategorized.
 * @param {string[]} coachEmails
 * @returns {Promise<void>}
 */
async function verifyCategorizationResults(coachEmails) {
  console.log('\n🔍 Verifying categorization results...');

  try {
    const result = await callCloudRun('/get-uncategorized-comments', { coach_emails: coachEmails });
    const remaining = (result.data || []).length;

    console.log('\n📊 FINAL CATEGORIZATION VERIFICATION');
    console.log('='.repeat(50));
    console.log(`Remaining uncategorized coach comments: ${remaining}`);

    if (remaining === 0) {
      console.log('\n✅ All coach comments have been categorized!');
    } else {
      console.log(`\n⚠️  ${remaining} comment(s) could not be categorized — review manually.`);
    }
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

/**
 * Main function to orchestrate the categorization process
 */
async function main() {
  try {
    console.log('🚀 RHWB Comments Categorization Tool');
    console.log('='.repeat(50));

    // Step 1: Extract uncategorized comments from Cloud SQL
    const comments = await extractComments();

    if (comments.length === 0) {
      console.log('ℹ️  No uncategorized comments found.');
      return;
    }

    // Step 2: Categorize all comments
    const analysis = categorizeAllComments(comments);

    // Step 3: Display sample comments by category
    displaySampleComments(analysis);

    // Step 4: Update Cloud SQL with categories
    console.log('\n⚠️  PROCEEDING WITH DATABASE UPDATE (User has pre-approved)');
    await updateDatabase(analysis.categorizedComments);

    // Step 5: Final verification
    const coachEmails = await fetchCoachEmails();
    await verifyCategorizationResults(coachEmails);

    console.log('\n🎉 Comments categorization completed successfully!');

  } catch (error) {
    console.error('\n❌ CATEGORIZATION FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  categorizeComment,
  extractComments,
  categorizeAllComments
};