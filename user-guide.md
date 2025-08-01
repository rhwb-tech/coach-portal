# RHWB Connect Coach Portal - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication & Access](#authentication--access)
3. [Navigation Overview](#navigation-overview)
4. [Know Your Runner](#know-your-runner)
5. [RHWB Connect](#rhwb-connect)
6. [Runner Metrics Dashboard](#runner-metrics-dashboard)
7. [Small Council (Admin Only)](#small-council-admin-only)
8. [Help & Support](#help--support)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Overview
RHWB Connect is an all-in-one portal built to empower RHWB Coaches with streamlined tools for managing runners, monitoring performance metrics, and handling administrative tasks efficiently. The platform is designed to replace fragmented Google Sheets workflows and enhance overall productivity through a more structured and intuitive experience.

The portal will continue to add more features. If you have a feature request, use the feedback option to let us know. You can also report bugs and data issues using the same feedback form.

RHWB Connect consists of multiple modules. The modules and their functionality is detailed below.

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Authorized RHWB email address

### First Time Setup
1. Navigate to the RHWB Connect portal
2. Enter your authorized email address
3. Check your email for the magic link
4. Click the magic link to authenticate
5. You'll be automatically logged in and redirected to the portal

## Authentication & Access

### Magic Link Authentication
RHWB Connect uses secure magic link authentication:

1. **Enter Email**: Input your RHWB-registered email address
2. **Check Email**: Look for an email from RHWB Connect with your magic link
3. **Click Link**: Click the link in the email to automatically log in
4. **Remember Me**: Check this option to stay logged in on your device

### Authorization Requirements
- Only email addresses registered in the RHWB system can access the portal
- If you receive an "unauthorized" error, contact RHWB support to verify your email is registered
- Your role (Coach/Admin) determines which features you can access

### Email Override (Development/Testing)
For testing purposes, you can append `?email=your-email@domain.com` to the URL to override authentication.

## Navigation Overview

The portal features a responsive sidebar navigation with multiple modules:

### Main Navigation Items
1. **Know Your Runner** 📊 - Primary runner management interface
2. **OneRHWB** 🏃 - Comprehensive database of all runners from the last 14 seasons
3. **Runner Metrics** 📈 - Performance analytics and metrics tracking
4. **Small Council** 🛡️ - Administrative functions (Admin access only)

### Navigation Tips
- Click the hamburger menu (☰) to open/close the sidebar
- Current section is highlighted in blue
- Navigation remembers your last visited section
- Mobile-responsive design adapts to smaller screens

## Know Your Runner

You will see the list of all runners you are managing in this current season. Comprehensive runner profiles with detailed information including family members, club history, onboarding surveys, and coach notes. The notes you enter here are directly saved against the runner profile for future reference. The runner will not see these notes.

A green star will denote there is a note present for that runner. Click on it to expand the notes section.

You can click on three dots for any runner related action. To transfer a runner, you can select the option. You will be presented with options to choose which program to transfer the runner to. Optionally you can also add a comment and save it. The runner will show as Pending Transfer status. Once he/she is moved in Final Surge, the status of the runner will change and they will no longer appear in your cohort.

You can also defer a runner to the following season if there are extenuating circumstances. The runner will be removed from your list.

### Main Features

#### Runner List & Filtering
- **Distance Filter**: Filter runners by race distance (5K, 10K, Half Marathon, Marathon, All)
- **Search**: Find specific runners by name using the search bar
- **Sorting**: Runners are automatically sorted by program and name

#### Runner Information Cards
Each runner card displays:
- **Runner Name**: Full name and program distance
- **Star Icon**: 
  - ⭐ Green star = Has coach notes
  - ☆ Gray star = No notes yet
- **Dropdown Menu**: Access to runner actions (Transfer, Defer)
- **Expandable Details**: Click to view comprehensive runner information

#### Runner Details Sections
When you click on a runner, you'll see expandable sections:

1. **Runner Bio** 📝
   - Personal information and background
   - Contact details and emergency contacts

2. **Family Members** 👥
   - Family member information
   - Ages and relationships

3. **Club History** 🏃
   - Previous seasons and programs
   - Completion status and performance

4. **Coach Notes** 📋
   - Add, edit, and manage private coach notes
   - Time-stamped entries with coach attribution
   - Notes are private to coaching staff

5. **Onboarding Survey** 📋
   - Responses from runner's initial survey
   - Goals, experience level, and preferences

### Runner Actions

#### Adding Coach Notes
1. Click the star icon (⭐) next to a runner's name
2. The notes modal will open
3. Add your note in the text area
4. Click "Save Note" to store
5. Notes are automatically timestamped and attributed to you

#### Transfer Runner
1. Click the three-dot menu next to a runner
2. Select "Transfer Runner"
3. Choose the target program (5K, 10K, Half Marathon, Marathon)
4. Add optional comments explaining the transfer reason
5. Confirm the transfer request
6. Request will be submitted to Small Council for approval

#### Defer Runner
1. Click the three-dot menu next to a runner
2. Select "Defer Runner"
3. Add optional comments explaining the deferral reason
4. Confirm the defer request
5. Request will be submitted to Small Council for approval

### Tips for Effective Use
- Use coach notes to track runner progress, concerns, or observations
- Transfer runners when they're ready for a different distance challenge
- Defer runners who need to pause their training for personal reasons
- Regularly review runner bios and history to provide personalized coaching

## OneRHWB

This is a comprehensive database of all the runners from the last 14 seasons. Find runners by name or email and access their complete history and household information. Based on their street address in the profile we group them as as a family.

## Runner Metrics Dashboard

Track and manage runners' meso scores and qualitative input here. At the end of every meso, the data will be refreshed from Final Surge to provide you with runners' activity statistics Any information you saved here will reflect in the Pulse dashboard that the runners will be viewing.

### Key Features

#### Filtering & Search
- **Distance Filter**: View metrics for specific race distances
- **Mesocycle Filter**: Filter by training phases/mesocycles
- **Runner Search**: Find specific runners quickly
- **Real-time Filtering**: Results update instantly as you type

#### Metrics Display
Each runner card shows:
- **Completion Rate**: Visual ring showing training completion percentage
- **Recent Scores**: Latest performance metrics
- **Trend Indicators**: Progress tracking over time
- **Color-coded Status**: Visual indicators for performance levels

#### Performance Scoring
- **Score Ranges**: 1.0 - 5.0 scale
- **Color Coding**:
  - 🔴 Red: 1.0-2.0 (Needs attention)
  - 🟡 Yellow: 2.1-3.5 (Improving)
  - 🟢 Green: 3.6-5.0 (Excellent)

#### Data Management
- **Edit Mode**: Click edit icon to modify runner data
- **Save Changes**: Updates are saved automatically
- **Data Validation**: System prevents invalid entries

### Using Metrics Effectively
1. **Regular Monitoring**: Check metrics weekly to identify trends
2. **Early Intervention**: Address low scores promptly
3. **Celebrate Success**: Acknowledge high performers
4. **Data-Driven Decisions**: Use metrics to guide coaching strategies

## Small Council (Admin Only)

Administrative interface for managing transfer and deferral requests.

### Access Requirements
- Admin role required
- If you don't see this option, you don't have admin permissions

### Request Management

#### Transfer Requests
- **View Requests**: See all pending transfer requests
- **Runner Details**: Review current and requested programs
- **Comments**: Read coaching rationale for transfers
- **Actions**: Approve or deny requests
- **Status Tracking**: Monitor request history

#### Deferral Requests
- **Defer Management**: Handle runner deferral requests
- **Reason Review**: Understand why runners need to defer
- **Decision Making**: Approve or deny based on circumstances
- **Communication**: Coordinate with coaches on decisions

#### Request Processing
1. **Review Details**: Examine runner information and request rationale
2. **Consider Impact**: Assess effect on training groups and logistics
3. **Make Decision**: Approve or deny based on RHWB policies
4. **Communicate**: Ensure coaches and runners are informed of decisions

### Administrative Best Practices
- Process requests promptly to minimize disruption
- Maintain consistent decision-making criteria
- Document decisions for future reference
- Communicate decisions clearly to all stakeholders

## Help & Support

### In-App Help Features

#### User Guide
- Access comprehensive help documentation
- Search for specific topics
- Step-by-step instructions for all features

#### Feedback System
1. Click the help menu in the top navigation
2. Select "Send Feedback"
3. Choose feedback type:
   - Bug Report
   - Feature Request
   - General Feedback
4. Describe your issue or suggestion
5. Submit for review by the development team

### Getting Additional Help

#### Technical Issues
- Check your internet connection
- Clear browser cache and cookies
- Try a different browser
- Contact RHWB technical support

#### Access Problems
- Verify your email is registered with RHWB
- Check spam folder for magic links
- Contact RHWB support to verify account status

#### Training Questions
- Consult with fellow coaches
- Review RHWB training documentation
- Contact program coordinators

## Troubleshooting

### Common Issues & Solutions

#### "Email Not Authorized" Error
**Problem**: You receive an error when trying to log in
**Solution**: 
- Verify you're using the correct email address
- Contact RHWB support to confirm your email is registered
- Try using the exact email format provided by RHWB

#### Magic Link Not Working
**Problem**: Clicking the magic link doesn't log you in
**Solution**:
- Check if the link has expired (links expire after a short time)
- Request a new magic link
- Ensure you're clicking the link in the same browser where you requested it

#### Page Not Loading or Slow Performance
**Problem**: Portal loads slowly or doesn't load completely
**Solution**:
- Check your internet connection
- Clear browser cache and cookies
- Try incognito/private browsing mode
- Use a different browser

#### Runner Data Not Updating
**Problem**: Changes to runner information aren't saving
**Solution**:
- Ensure you have a stable internet connection
- Try refreshing the page
- Check if you have appropriate permissions for the action
- Contact support if the issue persists

#### Mobile Display Issues
**Problem**: Portal doesn't display correctly on mobile devices
**Solution**:
- Use landscape orientation for better visibility
- Zoom out if content appears too large
- Use the hamburger menu for navigation
- Consider using a tablet or desktop for optimal experience

### Browser Compatibility
- **Recommended**: Chrome, Firefox, Safari (latest versions)
- **Minimum**: Any modern browser with JavaScript enabled
- **Not Supported**: Internet Explorer

### Performance Tips
- Close unnecessary browser tabs
- Ensure stable internet connection
- Use wired connection when possible for better stability
- Clear browser cache periodically

### Contact Information
For technical support or questions not covered in this guide:
- Email: tech@rhwb.org
- Subject Line: "RHWB Connect Support Request"
- Include: Your name, email, and detailed description of the issue

---

*This user guide is updated regularly. For the latest version and updates, check the in-app help section.*

**Version**: 1.0  
**Last Updated**: January 2025  
**Compatible with**: RHWB Connect Coach Portal v0.1.0