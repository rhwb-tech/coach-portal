#!/usr/bin/env node

/**
 * RHWB Comments Categorization Script
 * 
 * This script applies the categorization logic from comments_categorization.py
 * to comments in the rhwb_activities_comments table.
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

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
 * Extract comments from database using the provided SQL query
 * @returns {Array} Array of comment objects with workout_key and comment_text
 */
async function extractComments() {
  console.log('📊 Extracting coach comments from database...');
  
  try {
    // Use the exact SQL query specified: 
    // SELECT workout_key, comment_text 
    // FROM rhwb_activities_comments a 
    // INNER JOIN rhwb_coaches b ON a.comment_user = b.email_id
    
    const { data, error } = await supabase.rpc('get_coach_comments');

    if (error) {
      console.log('❌ RPC function not found, trying direct query approach...');
      
      // Try a different approach - get all comments and filter manually
      const { data: commentsData, error: commentsError } = await supabase
        .from('rhwb_activities_comments')
        .select('workout_key, comment_text, comment_user');

      if (commentsError) {
        console.error('❌ Comments query error:', commentsError);
        throw commentsError;
      }

      const { data: coachesData, error: coachesError } = await supabase
        .from('rhwb_coaches')
        .select('email_id');

      if (coachesError) {
        console.error('❌ Coaches query error:', coachesError);
        throw coachesError;
      }

      // Create a set of coach email IDs for faster lookup
      const coachEmails = new Set(coachesData.map(coach => coach.email_id));

      // Filter comments to only include those from coaches
      const validComments = commentsData.filter(comment => 
        comment.comment_text && 
        comment.comment_text.trim() &&
        coachEmails.has(comment.comment_user)
      );

      console.log(`✅ Successfully extracted ${validComments.length} coach comments from database`);
      return validComments.map(item => ({
        workout_key: item.workout_key,
        comment_text: item.comment_text.trim(),
        comment_user: item.comment_user
      }));
    }

    // If RPC function exists and works
    console.log(`✅ Successfully extracted ${data.length} coach comments from database`);
    return data.map(item => ({
      workout_key: item.workout_key,
      comment_text: item.comment_text.trim(),
      comment_user: item.comment_user
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
 * Create backup of the rhwb_activities_comments table
 * @returns {Promise<void>}
 */
async function createBackup() {
  console.log('\n💾 Creating backup of rhwb_activities_comments table...');
  
  try {
    // First, check if a category column already exists
    const { data: columnCheck, error: columnError } = await supabase.rpc('check_column_exists', {
      table_name: 'rhwb_activities_comments',
      column_name: 'category'
    });

    if (columnError) {
      console.log('❌ Column check RPC not found, using direct approach...');
    }

    // Get current timestamp for backup table name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupTableName = `rhwb_activities_comments_backup_${timestamp}`;

    // Create backup table with all data
    const { error: backupError } = await supabase.rpc('create_backup_table', {
      original_table: 'rhwb_activities_comments',
      backup_table: backupTableName
    });

    if (backupError) {
      console.log('❌ Backup RPC not found, using alternative backup approach...');
      
      // Alternative: Export current data to a local backup file
      const { data: backupData, error: exportError } = await supabase
        .from('rhwb_activities_comments')
        .select('*');

      if (exportError) {
        console.error('❌ Failed to export data for backup:', exportError);
        throw exportError;
      }

      // Save backup data to a local file
      const fs = require('fs');
      const backupFilename = `backup_rhwb_activities_comments_${timestamp}.json`;
      
      fs.writeFileSync(backupFilename, JSON.stringify(backupData, null, 2));
      console.log(`✅ Backup created: ${backupFilename} (${backupData.length} records)`);
      
      return { backupFile: backupFilename, recordCount: backupData.length };
    } else {
      console.log(`✅ Database backup table created: ${backupTableName}`);
      return { backupTable: backupTableName };
    }

  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    throw error;
  }
}

/**
 * Add category column to rhwb_activities_comments table if it doesn't exist
 * @returns {Promise<void>}
 */
async function ensureCategoryColumn() {
  console.log('\n🔧 Ensuring category column exists in rhwb_activities_comments table...');
  
  try {
    // Try adding the category column (will fail gracefully if it already exists)
    const { error } = await supabase.rpc('add_category_column');

    if (error) {
      console.log('❌ Add column RPC not found, using direct approach...');
      
      // Alternative approach: Try to query the column to see if it exists
      const { data, error: testError } = await supabase
        .from('rhwb_activities_comments')
        .select('category')
        .limit(1);

      if (testError) {
        if (testError.message.includes('column "category" does not exist')) {
          console.log('⚠️  Category column does not exist. Manual database schema update required.');
          console.log('Please run this SQL command in your Supabase dashboard:');
          console.log('ALTER TABLE rhwb_activities_comments ADD COLUMN category VARCHAR(50);');
          throw new Error('Category column missing - manual database update required');
        } else {
          console.error('❌ Error checking category column:', testError);
          throw testError;
        }
      } else {
        console.log('✅ Category column already exists');
      }
    } else {
      console.log('✅ Category column added successfully');
    }

  } catch (error) {
    console.error('❌ Error ensuring category column:', error.message);
    throw error;
  }
}

/**
 * Update database with categorized results
 * @param {Array} categorizedComments - Array of comments with categories
 * @returns {Promise<void>}
 */
async function updateDatabase(categorizedComments) {
  console.log('\n🔄 Updating database with categorization results...');

  try {
    // Note: The original request mentioned updating rhwb_activities table
    // but based on the query structure, we'll update rhwb_activities_comments
    // You may need to adjust this based on your actual schema
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < categorizedComments.length; i += batchSize) {
      batches.push(categorizedComments.slice(i, i + batchSize));
    }

    console.log(`Processing ${batches.length} batches of ${batchSize} comments each...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length}...`);

      for (const comment of batch) {
        try {
          // Update the rhwb_activities_comments table with the category
          const { error } = await supabase
            .from('rhwb_activities_comments')
            .update({ category: comment.category })
            .eq('workout_key', comment.workout_key)
            .eq('comment_text', comment.comment_text);

          if (error) {
            console.error(`❌ Error updating comment ${comment.workout_key}:`, error.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`❌ Exception updating comment ${comment.workout_key}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n✅ DATABASE UPDATE COMPLETE');
    console.log('=' .repeat(50));
    console.log(`Successfully updated: ${successCount} comments`);
    if (errorCount > 0) {
      console.log(`Failed to update: ${errorCount} comments`);
    }

    return { successCount, errorCount };

  } catch (error) {
    console.error('❌ Error during database update:', error.message);
    throw error;
  }
}

/**
 * Verify categorization results by querying the updated database
 * @returns {Promise<void>}
 */
async function verifyCategorizationResults() {
  console.log('\n🔍 Verifying categorization results...');
  
  try {
    // Get category distribution from the updated database
    const { data: categoryData, error } = await supabase
      .from('rhwb_activities_comments')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      console.error('❌ Error verifying results:', error);
      return;
    }

    // Calculate final category distribution
    const finalCategoryStats = {};
    categoryData.forEach(item => {
      finalCategoryStats[item.category] = (finalCategoryStats[item.category] || 0) + 1;
    });

    const totalCategorized = categoryData.length;

    console.log('\n📊 FINAL CATEGORIZATION VERIFICATION');
    console.log('=' .repeat(50));
    console.log(`Total Comments Categorized: ${totalCategorized}`);
    console.log('\nFinal Category Distribution:');

    // Sort categories by count (descending)
    const sortedFinalCategories = Object.entries(finalCategoryStats)
      .sort(([,a], [,b]) => b - a);

    sortedFinalCategories.forEach(([category, count]) => {
      const percentage = ((count / totalCategorized) * 100).toFixed(2);
      console.log(`  ✅ ${category}: ${count} (${percentage}%)`);
    });

    console.log('\n✅ Categorization verification completed successfully!');

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
    console.log('=' .repeat(50));

    // Step 1: Create backup of existing data
    const backupInfo = await createBackup();
    console.log('✅ Backup created successfully');

    // Step 2: Ensure category column exists
    await ensureCategoryColumn();
    console.log('✅ Database schema verified');

    // Step 3: Extract comments from database
    const comments = await extractComments();

    if (comments.length === 0) {
      console.log('ℹ️  No comments found to categorize.');
      return;
    }

    // Step 4: Categorize all comments
    const analysis = categorizeAllComments(comments);

    // Step 5: Display sample comments by category
    displaySampleComments(analysis);

    // Step 6: Update database (batch processing automatically applied)
    console.log('\n⚠️  PROCEEDING WITH DATABASE UPDATE (User has pre-approved)');
    console.log('Backup Information:', backupInfo);
    
    await updateDatabase(analysis.categorizedComments);

    // Step 7: Final verification
    await verifyCategorizationResults();

    console.log('\n🎉 Comments categorization completed successfully!');

  } catch (error) {
    console.error('\n❌ CATEGORIZATION FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('Category column missing')) {
      console.log('\n📝 MANUAL ACTION REQUIRED:');
      console.log('1. Add the category column to your database');
      console.log('2. Re-run this script');
    }
    
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