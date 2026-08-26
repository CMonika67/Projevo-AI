import React, { useState } from 'react';
import { ScreenType } from '../types';

interface ProjectDiscoveryViewProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectProject: (title: string, stack: string[]) => void;
}

interface ProjectCard {
  id: string;
  title: string;
  domain: string;
  description: string;
  matchScore: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  techStack: string[];
  estimatedWeeks: number;
  highlight: string;
}

export const ProjectDiscoveryView: React.FC<ProjectDiscoveryViewProps> = ({
  onNavigate,
  onSelectProject,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const projects: ProjectCard[] = [
    {
      id: 'p1',
      title: 'AI Healthcare Assistant',
      domain: 'Healthcare / AI',
      description: 'Clinical symptom triage and medical entity recognition pipeline with HIPAA compliance checker.',
      matchScore: 88,
      difficulty: 'Intermediate',
      techStack: ['Python', 'FastAPI', 'PyTorch', 'Pandas'],
      estimatedWeeks: 4,
      highlight: 'Currently Selected'
    },
    {
      id: 'p2',
      title: 'Distributed Smart Grid Monitor',
      domain: 'IoT / Cloud',
      description: 'Real-time telemetry stream analyzer with anomaly detection on edge smart meters.',
      matchScore: 82,
      difficulty: 'Advanced',
      techStack: ['Python', 'Kafka', 'Docker', 'TimeScaleDB'],
      estimatedWeeks: 6,
      highlight: 'High Industry Demand'
    },
    {
      id: 'p3',
      title: 'Decentralized Micro-Grant Escrow',
      domain: 'Finance / Web3',
      description: 'Smart contract milestone validator with automated disbursement upon oracle approval.',
      matchScore: 76,
      difficulty: 'Intermediate',
      techStack: ['Solidity', 'React', 'TypeScript', 'Ethers.js'],
      estimatedWeeks: 5,
      highlight: 'Trending Capstone'
    },
    {
      id: 'p4',
      title: 'Autonomous Drone Obstacle Vision',
      domain: 'AI / ML',
      description: 'Low-latency YOLOv8 object bounding and path planning for robotic spatial awareness.',
      matchScore: 91,
      difficulty: 'Advanced',
      techStack: ['OpenCV', 'PyTorch', 'C++', 'ROS2'],
      estimatedWeeks: 8,
      highlight: 'Top Research Pick'
    },
    {
      id: 'p5',
      title: 'Zero-Knowledge Auth Gateway',
      domain: 'Cybersecurity',
      description: 'Privacy-preserving credential authentication with rate-limiting and brute-force mitigation.',
      matchScore: 84,
      difficulty: 'Intermediate',
      techStack: ['Rust', 'WebAssembly', 'Node.js'],
      estimatedWeeks: 4,
      highlight: 'Security Focused'
    },
    {
      id: 'p6',
      title: 'Student Peer Code Review Bot',
      domain: 'Web Development',
      description: 'GitHub Action plugin analyzing PR style guides, AST complexity, and cyclomatic score.',
      matchScore: 89,
      difficulty: 'Beginner',
      techStack: ['TypeScript', 'Node.js', 'GitHub API'],
      estimatedWeeks: 3,
      highlight: 'Fast Starter'
    }
  ];

  const filtered = projects.filter((p) => {
    const matchesFilter = selectedFilter === 'All' || p.domain.toLowerCase().includes(selectedFilter.toLowerCase());
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-[12px] font-bold font-['Inter'] text-[#176B5B] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
        <h1 className="text-[28px] md:text-[38px] font-bold font-['Manrope'] text-[#005144]">
          Project Discovery
        </h1>
        <p className="text-[16px] text-[#3F4945] font-['Manrope'] mt-1">
          Explore curated, interview-ready capstone engineering projects matched to your skill profile.
        </p>
      </div>

      {/* Search & Domain Filter Bar */}
      <div className="bg-white rounded-2xl p-4 md:p-6 bento-shadow border border-[#BEC9C4]/40 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-3 text-[#6F7975] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects or technologies..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl text-[14px] font-['Manrope'] focus:outline-none focus:ring-2 focus:ring-[#005144]"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {['All', 'AI / ML', 'Healthcare', 'IoT', 'Finance', 'Cybersecurity', 'Web'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold font-['Inter'] transition-all cursor-pointer ${
                selectedFilter === filter
                  ? 'bg-[#005144] text-white shadow-xs'
                  : 'bg-[#F5F4EF] text-[#3F4945] hover:bg-[#D6E6E0]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((proj) => (
          <div
            key={proj.id}
            className="bg-white rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/40 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="px-2.5 py-1 bg-[#D6E6E0] text-[#005144] text-[11px] font-bold font-['Inter'] rounded-full">
                  {proj.domain}
                </span>
                <div className="flex items-center gap-1 text-[#005144] font-bold text-[14px]">
                  <span className="material-symbols-outlined text-[16px] filled">bolt</span>
                  <span>{proj.matchScore}% Match</span>
                </div>
              </div>

              <h3 className="text-[19px] font-bold font-['Manrope'] text-[#005144] mb-2">
                {proj.title}
              </h3>
              <p className="text-[13px] text-[#3F4945] font-['Manrope'] mb-4 leading-relaxed line-clamp-2">
                {proj.description}
              </p>
            </div>

            <div className="pt-4 border-t border-[#BEC9C4]/30 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {proj.techStack.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-[#FAF9F4] text-[#53615D] text-[11px] font-medium font-mono rounded border border-[#BEC9C4]/40"
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-[12px] text-[#6F7975] font-['Inter']">
                <span>Est: {proj.estimatedWeeks} weeks</span>
                <span
                  className={`font-bold ${
                    proj.difficulty === 'Beginner'
                      ? 'text-[#2E8B70]'
                      : proj.difficulty === 'Intermediate'
                      ? 'text-[#D6A84F]'
                      : 'text-[#D95F59]'
                  }`}
                >
                  {proj.difficulty}
                </span>
              </div>

              <button
                onClick={() => {
                  onSelectProject(proj.title, proj.techStack);
                  onNavigate('dashboard');
                }}
                className="w-full py-2.5 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[13px] font-bold font-['Inter'] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Select as Main Project</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
