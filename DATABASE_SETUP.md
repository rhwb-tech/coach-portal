# Database Setup Guide

## Installation

1. Install the required database dependencies:
```bash
npm install pg mysql2
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Type (postgres or mysql)
DB_TYPE=postgres

# Database Host
DB_HOST=localhost

# Database Port
DB_PORT=5432

# Database Name
DB_NAME=your_database_name

# Database User
DB_USER=your_username

# Database Password
DB_PASSWORD=your_password

# For MySQL, use:
# DB_TYPE=mysql
# DB_PORT=3306
```

## Database Configuration

### PostgreSQL Setup
1. Install PostgreSQL if not already installed
2. Create a database and user
3. Set the environment variables for PostgreSQL
4. The application will use the `pg` library to connect

### MySQL Setup
1. Install MySQL if not already installed
2. Create a database and user
3. Set the environment variables for MySQL
4. The application will use the `mysql2` library to connect

## Database Schema

The application expects the following tables:

### rhwb_coach_input
- `email_id` (primary key)
- `meso`
- `coach`
- `coach_email`
- `season_phase`
- `race_distance`
- `planned_strength_trains`
- `completed_strength_trains`
- `planned_distance`
- `completed_distance`
- `st_score`
- `mileage_score`
- `meso_score`
- `meso_score_override`
- `meso_qual_score`
- `season`
- `planned_cross_trains`
- `completed_cross_trains`
- `planned_walks`
- `completed_walks`
- `planned_walk_distance`
- `completed_walk_distance`
- `planned_long_runs`
- `completed_long_runs`
- `planned_lr_distance`
- `completed_lr_distance`

### runner_season_info
- `email_id` (primary key)
- `season_no`
- `coach`

## Testing the Connection

1. Start the application: `npm start`
2. Check the browser console for connection messages
3. The application will log successful database connections

## Troubleshooting

### Common Issues:
1. **Connection refused**: Check if database server is running
2. **Authentication failed**: Verify username and password
3. **Database not found**: Ensure database exists
4. **Permission denied**: Check user permissions

### Debug Mode:
Set `NODE_ENV=development` to see detailed database logs.

## Security Notes

1. Never commit `.env` files to version control
2. Use strong passwords for database users
3. Limit database user permissions to only necessary operations
4. Consider using connection pooling for production 