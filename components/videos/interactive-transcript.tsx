"use client";

import { useMemo, useState, useEffect, memo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, EyeOff } from "lucide-react";

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

interface InteractiveTranscriptProps {
  transcriptData: any; // Raw transcript data from Deepgram
  currentTime: number;
  onWordClick: (startTime: number) => void;
  highlightCurrentWord?: boolean;
  className?: string;
}

export const InteractiveTranscript = memo(function InteractiveTranscript({
  transcriptData,
  currentTime,
  onWordClick,
  highlightCurrentWord = true,
  className,
}: InteractiveTranscriptProps) {
  const [showConfidence, setShowConfidence] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Extract words array from transcript data (transcript_data_full is directly an array of words)
  const words = useMemo((): Word[] => {
    if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
      return [];
    }
    return transcriptData;
  }, [transcriptData]);

  // Find current word based on video time with debouncing for performance
  useEffect(() => {
    if (!highlightCurrentWord || words.length === 0) {
      setCurrentWordIndex(-1);
      return;
    }

    const timeoutId = setTimeout(() => {
      const index = words.findIndex(
        (word) => currentTime >= word.start && currentTime <= word.end
      );
      setCurrentWordIndex(index);

      // Auto-scroll to current word
      if (index >= 0 && transcriptRef.current) {
        const wordElement = transcriptRef.current.querySelector(
          `[data-word-index="${index}"]`
        );
        if (wordElement) {
          wordElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    }, 50); // Small debounce to avoid excessive updates

    return () => clearTimeout(timeoutId);
  }, [currentTime, words, highlightCurrentWord]);

  const handleWordClick = useCallback(
    (word: Word) => {
      onWordClick(word.start);
    },
    [onWordClick]
  );

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return "text-green-600";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number): string => {
    if (confidence >= 0.9) return "High";
    if (confidence >= 0.7) return "Medium";
    return "Low";
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (words.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Interactive Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="mb-2">No interactive transcript available</p>
            <p className="text-sm">
              Transcript needs to include timestamped words for interactive
              features.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Interactive Transcript
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfidence(!showConfidence)}
            >
              {showConfidence ? (
                <EyeOff className="h-4 w-4 mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              {showConfidence ? "Hide Confidence" : "Show Confidence"}
            </Button>
            <Badge variant="outline" className="text-xs">
              {words.length} words
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
            <p>
              <strong>Click any word</strong> to jump to that timestamp in the
              video.
              {highlightCurrentWord && (
                <span> The current word is highlighted as you watch.</span>
              )}
            </p>
          </div>

          {/* Transcript */}
          <div ref={transcriptRef} className="leading-relaxed">
            {words.map((word, index) => {
              const isCurrentWord =
                highlightCurrentWord && index === currentWordIndex;
              const displayWord = word.punctuated_word || word.word;

              return (
                <span
                  key={index}
                  className="inline-block mr-1 mb-1"
                  data-word-index={index}
                >
                  <button
                    onClick={() => handleWordClick(word)}
                    className={`
                      inline-flex items-center gap-1 px-1.5 py-1 rounded text-sm
                      transition-all duration-200 hover:bg-primary/10 hover:text-primary
                      cursor-pointer border-0 bg-transparent focus:outline-none
                      focus:ring-2 focus:ring-primary/50 focus:bg-primary/10
                      ${
                        isCurrentWord
                          ? "bg-primary text-primary-foreground font-medium shadow-sm scale-105"
                          : "hover:bg-primary/5 hover:scale-105"
                      }
                    `}
                    title={`Jump to ${formatTime(
                      word.start
                    )} - Confidence: ${Math.round(word.confidence * 100)}%`}
                    aria-label={`Jump to timestamp ${formatTime(
                      word.start
                    )}, word: ${displayWord}`}
                  >
                    <span>{displayWord}</span>
                    {showConfidence && (
                      <Badge
                        variant="outline"
                        className={`text-xs ml-1 ${getConfidenceColor(
                          word.confidence
                        )}`}
                      >
                        {getConfidenceBadge(word.confidence)}
                      </Badge>
                    )}
                  </button>
                </span>
              );
            })}
          </div>

          {/* Transcript Statistics */}
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Words:</span>
                <div className="font-medium">{words.length}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <div className="font-medium">
                  {words.length > 0
                    ? formatTime(words[words.length - 1].end)
                    : "0:00"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Avg Confidence:</span>
                <div className="font-medium">
                  {words.length > 0
                    ? Math.round(
                        (words.reduce((sum, word) => sum + word.confidence, 0) /
                          words.length) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Current Time:</span>
                <div className="font-medium">{formatTime(currentTime)}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
