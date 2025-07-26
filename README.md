# Coach Portal - Athletes Metrics Dashboard

A modern React application for coaches to manage and track athletes' performance metrics, training progress, and provide personalized feedback.

## Features

- **Athlete Management**: View and manage multiple athletes in a clean, card-based interface
- **Performance Tracking**: Monitor strength training, mileage, and completion rates
- **Metric Scoring**: Visual score rings with color-coded performance indicators
- **Coach Notes**: Add personalized feedback and qualitative assessments
- **Override Scores**: Manually adjust metric scores when needed
- **Search & Filter**: Find athletes quickly and filter by race distance and training cycles
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful, customizable icons
- **Create React App** - Zero-configuration build tool

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coach-portal
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (one-way operation)

## Project Structure

```
coach-portal/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   └── CoachDashboard.js
│   ├── App.js
│   ├── index.js
│   ├── index.css
│   └── reportWebVitals.js
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Features Overview

### Dashboard Header
- Displays total number of athletes
- Shows current training week
- Clean, modern design with gradient branding

### Filtering System
- **Race Distance**: Filter by 5K, 10K, Half Marathon, or Marathon
- **Mesocycle**: Filter by training cycles (Meso 1-4)
- **Search**: Real-time search by athlete name

### Athlete Cards
Each athlete card displays:
- **Profile**: Name and avatar initials
- **Completion Rate**: Visual progress bar with color coding
- **Metric Score**: Circular progress ring (0-5 scale)
- **Training Metrics**: Strength and mileage (planned vs completed)
- **Coach Controls**: Edit override scores and notes

### Color Coding System
- **Green (4.5+)**: Excellent performance
- **Yellow (3.5-4.4)**: Good performance
- **Orange (2.5-3.4)**: Needs improvement
- **Red (<2.5)**: Requires attention

## Data Structure

The application currently uses mock data with the following structure:

```javascript
{
  id: number,
  name: string,
  avatar: string,
  strengthPlanned: number,
  strengthCompleted: number,
  mileagePlanned: number,
  mileageCompleted: number,
  metricScore: number,
  overrideScore: number | null,
  qualitativeScore: string,
  completionRate: number
}
```

## Future Enhancements

- Database integration for persistent data storage
- User authentication and role-based access
- Real-time updates and notifications
- Advanced analytics and reporting
- Export functionality for reports
- Mobile app version

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team. 