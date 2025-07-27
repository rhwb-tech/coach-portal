import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, User, Users, Clock, FileText, TrendingUp, Star, Phone, Mail, MapPin, MoreVertical, Edit3, ArrowRight } from 'lucide-react';

const KnowYourRunner = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedRunner, setExpandedRunner] = useState(null);
  const [expandedSection, setExpandedSection] = useState({});
  const [activeMenu, setActiveMenu] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(null);
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const [runnerNotes, setRunnerNotes] = useState({});

  const programs = ['Lite', '5K', '10K', 'Half Marathon', 'Full Marathon'];

  const runners = [
    {
      id: 1,
      name: "Sarah Chen",
      age: 28,
      avatar: "SC",
      level: "Full Marathon",
      location: "San Francisco, CA",
      program: "Full Marathon",
      coachNotes: "Strong endurance base, needs work on speed. Very dedicated athlete.",
      bio: {
        background: "Former college track athlete, now training for Boston Marathon",
        goals: "Sub-3:00 marathon, improve 5K PR",
        experience: "8 years competitive running",
        injuries: "Previous IT band issues (resolved)"
      },
      family: [
        { name: "Mike Chen", relation: "Spouse", contact: "mike.chen@email.com" },
        { name: "Emma Chen", relation: "Daughter", age: 12 }
      ],
      clubHistory: {
        joined: "January 2023",
        previousClubs: "University Track Team",
        achievements: ["Club 5K record holder", "2023 Boston Qualifier"],
        events: ["5K", "10K", "Half Marathon", "Marathon"]
      },
      onboarding: {
        motivation: "Train for Boston Marathon 2024",
        availability: "Early mornings, weekends",
        preferences: "Group training, track workouts",
        limitations: "No back-to-back hard days"
      },
      metrics: {
        currentPR: {
          "5K": "18:42",
          "10K": "38:15",
          "Half": "1:22:30",
          "Marathon": "2:58:12"
        },
        weeklyMileage: 65,
        recentRaces: [
          { event: "City Marathon", time: "2:58:12", date: "2024-03-15" },
          { event: "Spring 10K", time: "38:15", date: "2024-02-20" }
        ]
      }
    },
    {
      id: 2,
      name: "Marcus Johnson",
      age: 34,
      avatar: "MJ",
      level: "10K",
      location: "Austin, TX",
      program: "10K",
      coachNotes: "Great attitude, improving quickly. Consider half marathon program soon.",
      bio: {
        background: "Started running 3 years ago for fitness, now loves racing",
        goals: "First sub-20 5K, complete first half marathon",
        experience: "3 years recreational running",
        injuries: "None currently"
      },
      family: [
        { name: "Lisa Johnson", relation: "Wife", contact: "lisa.j@email.com" },
        { name: "Tyler Johnson", relation: "Son", age: 8 },
        { name: "Maya Johnson", relation: "Daughter", age: 6 }
      ],
      clubHistory: {
        joined: "March 2023",
        previousClubs: "Local gym running group",
        achievements: ["Most Improved Runner 2023"],
        events: ["5K", "10K"]
      },
      onboarding: {
        motivation: "Get faster and stay healthy",
        availability: "Evenings after work",
        preferences: "Variety in training, social aspect",
        limitations: "Limited morning availability"
      },
      metrics: {
        currentPR: {
          "5K": "21:35",
          "10K": "45:20",
          "Half": "N/A",
          "Marathon": "N/A"
        },
        weeklyMileage: 35,
        recentRaces: [
          { event: "Turkey Trot 5K", time: "21:35", date: "2023-11-23" },
          { event: "Summer Series 10K", time: "45:20", date: "2023-08-12" }
        ]
      }
    },
    {
      id: 3,
      name: "Elena Rodriguez",
      age: 22,
      avatar: "ER",
      level: "5K",
      location: "Denver, CO",
      program: "5K",
      coachNotes: "New runner, building base fitness. Very enthusiastic and coachable.",
      bio: {
        background: "New to running, recently graduated college",
        goals: "Complete first 5K race, build consistent running habit",
        experience: "6 months recreational running",
        injuries: "None"
      },
      family: [
        { name: "Carlos Rodriguez", relation: "Father", contact: "carlos.r@email.com" },
        { name: "Maria Rodriguez", relation: "Mother", contact: "maria.r@email.com" }
      ],
      clubHistory: {
        joined: "January 2024",
        previousClubs: "None",
        achievements: ["Completed Couch to 5K program"],
        events: ["5K"]
      },
      onboarding: {
        motivation: "Improve fitness and make friends",
        availability: "Flexible schedule",
        preferences: "Supportive group environment",
        limitations: "Building endurance"
      },
      metrics: {
        currentPR: {
          "5K": "28:45",
          "10K": "N/A",
          "Half": "N/A",
          "Marathon": "N/A"
        },
        weeklyMileage: 15,
        recentRaces: [
          { event: "Charity Fun Run 5K", time: "28:45", date: "2024-02-14" }
        ]
      }
    },
    {
      id: 4,
      name: "Alex Thompson",
      age: 31,
      avatar: "AT",
      level: "Half Marathon",
      location: "Seattle, WA",
      program: "Half Marathon",
      coachNotes: "",
      bio: {
        background: "Returning runner after 2-year break, former college swimmer",
        goals: "Complete first half marathon under 1:45",
        experience: "5 years running (with 2-year gap)",
        injuries: "None currently"
      },
      family: [
        { name: "Jordan Thompson", relation: "Partner", contact: "jordan.t@email.com" }
      ],
      clubHistory: {
        joined: "February 2024",
        previousClubs: "University Swimming Team",
        achievements: ["Consistent attendance award"],
        events: ["5K", "10K"]
      },
      onboarding: {
        motivation: "Get back into competitive shape",
        availability: "Lunch breaks and weekends",
        preferences: "Structured training plan",
        limitations: "Rebuilding endurance"
      },
      metrics: {
        currentPR: {
          "5K": "22:10",
          "10K": "47:30",
          "Half": "N/A",
          "Marathon": "N/A"
        },
        weeklyMileage: 25,
        recentRaces: [
          { event: "Comeback 5K", time: "22:10", date: "2024-03-01" }
        ]
      }
    }
  ];

  const filteredRunners = runners.filter(runner => {
    const matchesSearch = runner.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || runner.level.toLowerCase() === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const toggleRunnerExpansion = (runnerId) => {
    setExpandedRunner(expandedRunner === runnerId ? null : runnerId);
    setExpandedSection({});
  };

  const toggleSectionExpansion = (section) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getLevelColor = (level) => {
    switch(level.toLowerCase()) {
      case 'lite': return 'bg-gray-100 text-gray-800';
      case '5k': return 'bg-green-100 text-green-800';
      case '10k': return 'bg-blue-100 text-blue-800';
      case 'half marathon': return 'bg-orange-100 text-orange-800';
      case 'full marathon': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTransferProgram = (runnerId, newProgram) => {
    console.log(`Transferring runner ${runnerId} to ${newProgram} program`);
    setShowTransferModal(null);
    setConfirmTransfer(null);
    setActiveMenu(null);
  };

  const handleTransferClick = (runner, program) => {
    setShowTransferModal(null);
    setConfirmTransfer({ runner, program });
  };

  const confirmTransferAction = () => {
    if (confirmTransfer) {
      handleTransferProgram(confirmTransfer.runner.id, confirmTransfer.program);
    }
  };

  const handleNotesClick = (runnerId) => {
    if (expandedRunner !== runnerId) {
      setExpandedRunner(runnerId);
    }
    setExpandedSection(prev => ({
      ...prev,
      notes: true
    }));
  };

  const handleNotesChange = (runnerId, notes) => {
    setRunnerNotes(prev => ({
      ...prev,
      [runnerId]: notes
    }));
  };

  const TransferModal = ({ runner, onClose, onTransfer }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Transfer {runner.name}</h3>
        <p className="text-gray-600 mb-4">
          Current program: <span className="font-medium text-blue-600">{runner.program}</span>
        </p>
        <p className="text-sm text-gray-500 mb-4">Select a new program:</p>
        <div className="space-y-2 mb-6">
          {programs.filter(p => p !== runner.program).map(program => (
            <button
              key={program}
              onClick={() => onTransfer(runner, program)}
              className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center justify-between group"
            >
              <span className="font-medium">{program}</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const ConfirmModal = ({ runner, program, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Confirm Transfer</h3>
        <div className="mb-6">
          <p className="text-gray-700 mb-2">
            Are you sure you want to transfer <span className="font-semibold">{runner.name}</span>?
          </p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span>From:</span>
              <span className="font-medium text-gray-600">{runner.program}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span>To:</span>
              <span className="font-medium text-blue-600">{program}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );

  const SectionCard = ({ title, icon: Icon, children, sectionKey, isExpanded }) => (
    <div className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden">
      <button
        onClick={() => toggleSectionExpansion(sectionKey)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Know Your Runner</h1>
          <p className="text-gray-600 mt-1">Comprehensive profiles for your coaching cohort</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Distances</option>
              <option value="lite">Lite</option>
              <option value="5k">5K</option>
              <option value="10k">10K</option>
              <option value="half marathon">Half Marathon</option>
              <option value="marathon">Marathon</option>
              <option value="full marathon">Full Marathon</option>
            </select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search runners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredRunners.map(runner => (
            <div key={runner.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 relative transition-opacity duration-200 ${
              activeMenu && activeMenu !== runner.id ? 'opacity-30' : 'opacity-100'
            }`}>
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleRunnerExpansion(runner.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {runner.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{runner.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-600">Age {runner.age}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(runner.level)}`}>
                          {runner.level}
                        </span>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="w-3 h-3" />
                          {runner.location}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-gray-900">{runner.metrics.weeklyMileage} mi/week</div>
                      <div className="text-xs text-gray-500">Current Volume</div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotesClick(runner.id);
                      }}
                      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                      title={runner.coachNotes || runnerNotes[runner.id] ? "View coaching notes" : "Add coaching notes"}
                    >
                      <Star className={`w-5 h-5 ${
                        runner.coachNotes || runnerNotes[runner.id] 
                          ? "text-yellow-500 fill-current" 
                          : "text-gray-300"
                      }`} />
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === runner.id ? null : runner.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                      </button>
                      
                      {activeMenu === runner.id && (
                        <div className="fixed inset-0 bg-black bg-opacity-25 z-[9998]" onClick={() => setActiveMenu(null)} />
                      )}
                      {activeMenu === runner.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] min-w-48">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTransferModal(runner);
                              setActiveMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          >
                            <ArrowRight className="w-4 h-4 text-gray-500" />
                            Transfer Program
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {expandedRunner === runner.id ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>
              </div>

              {expandedRunner === runner.id && (
                <div className={`border-t border-gray-200 p-4 bg-gray-50 transition-opacity duration-200 ${
                  activeMenu && activeMenu !== runner.id ? 'opacity-30' : 'opacity-100'
                }`}>
                  <div className="space-y-3">
                    
                    <SectionCard 
                      title="Coach Notes" 
                      icon={Edit3} 
                      sectionKey="notes" 
                      isExpanded={expandedSection.notes}
                    >
                      <div className="mt-3">
                        <textarea
                          value={runnerNotes[runner.id] || runner.coachNotes || ''}
                          onChange={(e) => handleNotesChange(runner.id, e.target.value)}
                          placeholder="Add your coaching notes here..."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          Notes auto-save as you type
                        </div>
                      </div>
                    </SectionCard>
                    
                    <SectionCard 
                      title="Bio & Background" 
                      icon={User} 
                      sectionKey="bio" 
                      isExpanded={expandedSection.bio}
                    >
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Background</h4>
                          <p className="text-sm text-gray-600">{runner.bio.background}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Goals</h4>
                          <p className="text-sm text-gray-600">{runner.bio.goals}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Experience</h4>
                          <p className="text-sm text-gray-600">{runner.bio.experience}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Injuries/Notes</h4>
                          <p className="text-sm text-gray-600">{runner.bio.injuries}</p>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard 
                      title="Family Members" 
                      icon={Users} 
                      sectionKey="family" 
                      isExpanded={expandedSection.family}
                    >
                      <div className="space-y-3 mt-3">
                        {runner.family.map((member, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                            <div>
                              <div className="font-medium text-gray-900">{member.name}</div>
                              <div className="text-sm text-gray-600">{member.relation}{member.age && `, Age ${member.age}`}</div>
                            </div>
                            {member.contact && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{member.contact}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    <SectionCard 
                      title="Club History" 
                      icon={Clock} 
                      sectionKey="history" 
                      isExpanded={expandedSection.history}
                    >
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Joined</h4>
                          <p className="text-sm text-gray-600">{runner.clubHistory.joined}</p>
                          
                          <h4 className="font-medium text-gray-900 mb-2 mt-4">Previous Clubs</h4>
                          <p className="text-sm text-gray-600">{runner.clubHistory.previousClubs}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Achievements</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {runner.clubHistory.achievements.map((achievement, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Star className="w-3 h-3 text-yellow-500" />
                                {achievement}
                              </li>
                            ))}
                          </ul>
                          
                          <h4 className="font-medium text-gray-900 mb-2 mt-4">Events</h4>
                          <div className="flex flex-wrap gap-2">
                            {runner.clubHistory.events.map((event, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {event}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard 
                      title="Onboarding Survey" 
                      icon={FileText} 
                      sectionKey="onboarding" 
                      isExpanded={expandedSection.onboarding}
                    >
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Motivation</h4>
                          <p className="text-sm text-gray-600">{runner.onboarding.motivation}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Availability</h4>
                          <p className="text-sm text-gray-600">{runner.onboarding.availability}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Training Preferences</h4>
                          <p className="text-sm text-gray-600">{runner.onboarding.preferences}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Limitations</h4>
                          <p className="text-sm text-gray-600">{runner.onboarding.limitations}</p>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard 
                      title="Season Metrics & Performance" 
                      icon={TrendingUp} 
                      sectionKey="metrics" 
                      isExpanded={expandedSection.metrics}
                    >
                      <div className="space-y-4 mt-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Personal Records</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(runner.metrics.currentPR).map(([distance, time]) => (
                              <div key={distance} className="bg-white p-3 rounded-lg border border-gray-100 text-center">
                                <div className="text-lg font-bold text-blue-600">{time}</div>
                                <div className="text-sm text-gray-600">{distance}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Recent Races</h4>
                          <div className="space-y-2">
                            {runner.metrics.recentRaces.map((race, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                                <div>
                                  <div className="font-medium text-gray-900">{race.event}</div>
                                  <div className="text-sm text-gray-600">{new Date(race.date).toLocaleDateString()}</div>
                                </div>
                                <div className="text-lg font-bold text-green-600">{race.time}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">{runner.metrics.weeklyMileage}</div>
                              <div className="text-sm text-gray-600">Current Weekly Mileage</div>
                            </div>
                            <TrendingUp className="w-8 h-8 text-blue-500" />
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredRunners.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No runners found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {showTransferModal && (
        <TransferModal
          runner={showTransferModal}
          onClose={() => setShowTransferModal(null)}
          onTransfer={handleTransferClick}
        />
      )}

      {confirmTransfer && (
        <ConfirmModal
          runner={confirmTransfer.runner}
          program={confirmTransfer.program}
          onConfirm={confirmTransferAction}
          onCancel={() => setConfirmTransfer(null)}
        />
      )}


    </div>
  );
};

export default KnowYourRunner;