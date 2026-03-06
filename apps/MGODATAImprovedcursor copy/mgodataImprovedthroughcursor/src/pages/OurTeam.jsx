
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MarketingHeader from '../components/MarketingHeader';

const teamMembers = [
  {
    name: 'Brandon Liao',
    role: 'Co-Founder & CEO',
    image: 'https://i.pravatar.cc/150?img=12',
    bio: 'Former product lead at a top-tier SaaS company, Brandon specializes in AI automation and local search algorithms. He\'s obsessed with building tools that save business owners time.',
    linkedin: '#'
  },
  {
    name: 'Marsel Sabirdjanov',
    role: 'Co-Founder & CTO',
    image: 'https://i.pravatar.cc/150?img=33',
    bio: 'With a background in digital marketing and agency operations, Marsel understands the pain points of managing multiple clients. He\'s driven to help businesses scale visibility without scaling headcount.',
    linkedin: '#'
  }
];

const OurTeamPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <MarketingHeader />

      {/* Hero Section */}
      <div className="py-20 pt-32">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 mb-6">
              Meet the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                AGS Team
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Built by entrepreneurs who understand the power of local visibility
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-12 text-white mb-16 shadow-xl">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-indigo-100">
              At AGS, we believe every business deserves to be found by customers searching locally. We've built the first truly AI-native platform for local visibility optimization. Our goal is to help businesses dominate AI answers, Maps, and Search—automatically.
            </p>
          </div>

          {/* Team Members */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            {teamMembers.map((member, index) => (
              <Card key={index} className="bg-white border-slate-200 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="pt-8">
                  <div className="text-center mb-6">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-indigo-100"
                    />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{member.name}</h3>
                    <p className="text-indigo-600 font-medium mb-4">{member.role}</p>
                    <div className="flex items-center justify-center gap-4">
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="rounded-full">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </a>
                      {/* Placeholder for mail, can be expanded later */}
                      <Button variant="outline" size="icon" className="rounded-full">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-slate-600 text-center">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Vision Section */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200 shadow-lg">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Vision</h2>
              <div className="space-y-4 text-slate-600 text-lg">
                <p>
                  We're building the operating system for local businesses in the AI era. A future where every business—no matter how small—can compete on visibility, trust, and customer experience.
                </p>
                <p>
                  Our founders saw firsthand how businesses struggled to appear in Google Maps, answer engines like ChatGPT, and local search results. Traditional SEO agencies charged thousands but delivered slow, manual processes. We knew there had to be a better way.
                </p>
                <p>
                  Today, AGS helps hundreds of businesses automate their local presence, scale with AI-driven insights, and dominate their markets.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OurTeamPage;
