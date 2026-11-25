'use client';

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Upload, FileText, ChevronRight, AlertCircle, CheckCircle, TrendingUp, Zap } from 'lucide-react';

const LinkedinIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);
import type { LinkedInAnalysis } from '@/app/api/linkedin/analyze/route';

type InputMode = 'pdf' | 'text';

function ScoreRing({ score, label, size = 'md' }: { score: number; label: string; size?: 'sm' | 'md' | 'lg' }) {
  const radius = size === 'lg' ? 54 : size === 'md' ? 38 : 28;
  const stroke = size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const svgSize = (radius + stroke) * 2;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontWeight="bold"
          fontSize={size === 'lg' ? 18 : size === 'md' ? 13 : 10}
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {score}
        </text>
      </svg>
      <span className="text-xs text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-semibold text-slate-700">{score}/100</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function LinkedInPage() {
  const [mode, setMode] = useState<InputMode>('pdf');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<LinkedInAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pdf')) {
        toast('Please upload a PDF file', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.pdf')) {
      setSelectedFile(file);
    } else {
      toast('Please drop a PDF file', 'error');
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);

    try {
      let res: Response;

      if (mode === 'pdf') {
        if (!selectedFile) { toast('Please select a PDF file', 'error'); setLoading(false); return; }
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await fetch('/api/linkedin/analyze', { method: 'POST', body: formData });
      } else {
        if (!textInput.trim()) { toast('Please paste your profile text', 'error'); setLoading(false); return; }
        res = await fetch('/api/linkedin/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textInput }),
        });
      }

      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
        toast('Analysis complete!', 'success');
      } else {
        toast(data.error || 'Analysis failed', 'error');
      }
    } catch {
      toast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <LinkedinIcon size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">LinkedIn Profile Analyzer</h1>
          <p className="text-slate-500 text-sm">Get AI-powered feedback to strengthen your LinkedIn presence</p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setMode('pdf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'pdf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload size={15} /> Upload PDF
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'text' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <FileText size={15} /> Paste Text
          </button>
        </div>

        {mode === 'pdf' ? (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                selectedFile ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              {selectedFile ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-blue-600" />
                  </div>
                  <p className="font-semibold text-slate-800">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB — Click to change</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Upload size={24} className="text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-700">Drop your LinkedIn PDF here</p>
                  <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                </>
              )}
            </div>

            {/* How-to instruction */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">📋 How to get your LinkedIn PDF:</p>
              <ol className="text-sm text-blue-700 space-y-1 list-none">
                {['Go to your LinkedIn profile page', 'Click the "More" button (···) below your name', 'Select "Save to PDF"', 'Upload the downloaded PDF above'].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Paste your LinkedIn profile content</label>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Paste your LinkedIn About section, experience, skills, and education here..."
                className="w-full border border-slate-200 rounded-xl p-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 resize-none custom-scrollbar"
                rows={10}
              />
              <p className="text-xs text-slate-400 mt-1">{textInput.length} characters — more detail = better analysis</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          isLoading={loading}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-medium"
          size="lg"
        >
          {loading ? 'Analyzing your profile...' : 'Analyze Profile'}
        </Button>
      </Card>

      {/* Results */}
      {analysis && (
        <div className="space-y-6 animate-fade-in">
          {/* Overall Score + Summary */}
          <Card gradientBorder>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="shrink-0">
                <ScoreRing score={analysis.score} label="Profile Strength" size="lg" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Profile Assessment</h2>
                <p className="text-slate-600 leading-relaxed">{analysis.summary}</p>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <ScoreRing score={analysis.headline_score} label="Headline" size="sm" />
                  <ScoreRing score={analysis.about_score} label="About" size="sm" />
                  <ScoreRing score={analysis.experience_score} label="Experience" size="sm" />
                  <ScoreRing score={analysis.skills_score} label="Skills" size="sm" />
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score Breakdown */}
            <Card>
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-600" /> Score Breakdown
              </h3>
              <div className="space-y-4">
                <ScoreBar label="Headline / Title" score={analysis.headline_score} />
                <ScoreBar label="About / Summary" score={analysis.about_score} />
                <ScoreBar label="Work Experience" score={analysis.experience_score} />
                <ScoreBar label="Skills Section" score={analysis.skills_score} />
                <ScoreBar label="Profile Completeness" score={analysis.completeness_score} />
              </div>
            </Card>

            {/* Strengths & Missing Sections */}
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600" /> Strengths
                </h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500 mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" /> Missing / Weak Sections
                </h3>
                {analysis.missing_sections.length === 0 ? (
                  <p className="text-sm text-emerald-600">No major sections missing! 🎉</p>
                ) : (
                  <ul className="space-y-2">
                    {analysis.missing_sections.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-amber-500 mt-0.5">⚠</span> {s}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {/* Top Improvements */}
          <Card>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Zap size={16} className="text-blue-600" /> Top 5 Improvements
            </h3>
            <ol className="space-y-3">
              {analysis.improvements.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm text-slate-700">{tip}</span>
                  <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1 ml-auto" />
                </li>
              ))}
            </ol>
          </Card>

          {/* Keyword Gaps */}
          <Card>
            <h3 className="font-semibold text-slate-800 mb-3">🔑 Keyword Gaps</h3>
            <p className="text-sm text-slate-500 mb-4">Add these missing keywords to improve recruiter visibility and ATS ranking:</p>
            <div className="flex flex-wrap gap-2">
              {analysis.keyword_gaps.map((kw, i) => (
                <span key={i} className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-full font-medium">
                  + {kw}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
