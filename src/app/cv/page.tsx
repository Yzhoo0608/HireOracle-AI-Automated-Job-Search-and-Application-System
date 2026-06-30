'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileUpload } from '@/components/ui/FileUpload';
import { useToast } from '@/components/ui/Toast';
import type { CVProfile } from '@/lib/types';
import { Mail, Phone, Briefcase, GraduationCap, Award } from 'lucide-react';

export default function CVPage() {
  const [profile, setProfile] = useState<CVProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/cv/profile');
      const data = await res.json();
      if (data.success && data.data) {
        setProfile(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/cv/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.data);
        toast('CV uploaded and parsed successfully!', 'success');
      } else {
        toast(data.error || 'Failed to upload CV', 'error');
      }
    } catch (error) {
      toast('An error occurred during upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-400">Loading profile...</div>;
  }

  if (!profile || uploading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Upload your CV</h1>
          <p className="text-slate-400">Let our AI analyze your CV to find the perfect job matches.</p>
        </div>
        
        {uploading ? (
          <Card className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-semibold text-white mb-2">Analyzing your CV</h3>
            <p className="text-slate-400 text-center max-w-sm">
              Our AI is extracting your skills, experience, and education to build your profile...
            </p>
          </Card>
        ) : (
          <FileUpload onUpload={handleUpload} />
        )}
      </div>
    );
  }

  const { structured_data } = profile;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Your AI Profile</h1>
        <button 
          onClick={() => setProfile(null)}
          className="text-sm text-primary hover:text-primary/80"
        >
          Re-upload CV
        </button>
      </div>

      <Card gradientBorder className="overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/10 blur-3xl -mr-20 -mt-20 rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-4xl font-bold text-white shadow-inner">
            {structured_data.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">{structured_data.name}</h2>
            <p className="text-slate-300 leading-relaxed max-w-2xl mb-6">{structured_data.summary}</p>
            
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              {structured_data.email && (
                <div className="flex items-center gap-2"><Mail size={16} className="text-primary" /> {structured_data.email}</div>
              )}
              {structured_data.phone && (
                <div className="flex items-center gap-2"><Phone size={16} className="text-secondary" /> {structured_data.phone}</div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Briefcase size={20} /></div>
              <h3 className="text-xl font-semibold text-white">Experience</h3>
            </div>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
              {structured_data.experience.map((exp, idx) => (
                <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 bg-slate-800 text-slate-400 group-hover:text-primary group-hover:bg-slate-700 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors">
                    <span className="w-2 h-2 bg-current rounded-full"></span>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors">
                    <div className="flex flex-col mb-1">
                      <span className="text-primary font-medium">{exp.role}</span>
                      <span className="text-slate-300 font-medium text-sm">{exp.company}</span>
                    </div>
                    <time className="block text-xs text-slate-500 font-mono mb-3">{exp.duration}</time>
                    <p className="text-sm text-slate-400 leading-relaxed">{exp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Core Skills</h3>
            <div className="flex flex-wrap gap-2">
              {structured_data.skills.map((skill, idx) => (
                <Badge key={idx} variant="info">{skill}</Badge>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><GraduationCap size={18} /></div>
              <h3 className="text-lg font-semibold text-white">Education</h3>
            </div>
            <div className="space-y-4">
              {structured_data.education.map((edu, idx) => (
                <div key={idx} className="pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                  <h4 className="font-medium text-slate-200">{edu.degree}</h4>
                  <p className="text-sm text-slate-400">{edu.institution}</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{edu.year}</p>
                </div>
              ))}
            </div>
          </Card>

          {structured_data.certifications && structured_data.certifications.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400"><Award size={18} /></div>
                <h3 className="text-lg font-semibold text-white">Certifications</h3>
              </div>
              <ul className="space-y-2">
                {structured_data.certifications.map((cert, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {cert}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
