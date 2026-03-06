import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Check, X, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AiMentionsList({ mentions = [], totalMentions = 0 }) {
  return (
    <Card className="bg-white shadow-2xl border-2 border-indigo-200">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="flex items-center gap-2 text-xl text-slate-900">
          <MessageCircle className="w-6 h-6 text-indigo-600" />
          AI Search Query Results
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Tested across {mentions.length} AI-powered search queries
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {mentions.map((mention, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md",
                mention.appears 
                  ? "bg-green-50 border-green-200" 
                  : "bg-red-50 border-red-200"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                mention.appears ? "bg-green-100" : "bg-red-100"
              )}>
                {mention.appears ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <X className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 mb-2">
                  "{mention.query}"
                </p>
                {mention.rank && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold">
                      <Award className="w-3 h-3 mr-1" />
                      Rank #{mention.rank}
                    </Badge>
                    {mention.confidence && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        {mention.confidence}% confidence
                      </Badge>
                    )}
                  </div>
                )}
                {mention.snippet && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 bg-white p-2 rounded border border-green-200">
                    {mention.snippet}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {totalMentions === 0 && mentions.length > 0 && (
          <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800 font-medium">
              💡 No AI mentions detected – your business needs optimization for AI discovery. Add local keywords, FAQ content, and structured data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}