# Video Player with Interactive Transcript - Codebase Research

**Date**: October 1, 2025  
**Project**: Virals - Video transcription platform  
**Repository**: prateek041/virals  
**Branch**: main

## Research Question

How to implement an interactive video player that loads videos from Supabase API and allows clicking on transcript words to seek to specific timestamps, given the existing codebase infrastructure.

## Summary

The codebase already has a solid foundation for video management and transcript handling through Supabase integration and Deepgram transcription services. The video data structure supports timestamped words in the format `{"end":1.7930769,"word":"cuban","start":1.314923,"confidence":0.87236464}`, and all necessary API endpoints exist. The main implementation requires creating interactive UI components that leverage the existing infrastructure.

## Detailed Findings

### Current Video Data Structure

**Video Database Schema** (`lib/types/video.ts`):

- `Video` interface with key fields:
  - `storage_path`: Path to video file in Supabase Storage
  - `transcript_text`: Full transcript as text (JSONB)
  - `transcript_data_full`: Complete Deepgram response with timestamped words (JSONB)
  - `status`: Video processing status ("uploaded" | "transcribing" | "transcribed" | "error")

**Deepgram Transcript Format**:

```typescript
interface DeepgramTranscript {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
          punctuated_word?: string;
        }>;
      }>;
    }>;
  };
}
```

### Existing Video API Infrastructure

**Video Actions** (`app/actions/videos.ts`):

- `getVideoById(id: string)`: Fetches video data with authentication checks
- `getVideoPublicUrl(storagePath: string)`: Gets public URL from Supabase Storage for video playback
- `updateTranscript()`: Updates transcript data with timestamped words
- `transcribeVideo()`: Initiates Deepgram transcription process

**Authentication & Access Control**:

- All video operations require user authentication
- Videos are scoped to user projects for security
- Public URLs are generated on-demand for authenticated users

### Current Video UI Components

**VideoDetail Component** (`components/videos/video-detail.tsx`):

- Displays video metadata (filename, project, creation date, status)
- Shows transcript text with copy/download functionality
- Status indicators with appropriate icons and badges
- **Missing**: No actual video player element

**TranscriptManager Component** (`components/videos/transcript-manager.tsx`):

- Handles transcript viewing and editing modes
- Supports multiple transcript formats (Deepgram, plain text, JSON)
- Provides transcript export functionality
- **Missing**: No word-level interactivity or time synchronization

**Video Pages** (`app/videos/[id]/page.tsx`):

- Server-side video fetching with error handling
- Integrates with VideoDetail component
- Navigation breadcrumbs and loading states

### Current Implementation Gaps

1. **No Video Player**: Currently only shows metadata, no actual video playback
2. **No Interactive Transcript**: Transcript is displayed as plain text only
3. **No Time Synchronization**: No connection between video playback and transcript position
4. **No Seeking Functionality**: Cannot click words to jump to specific timestamps

## Implementation Architecture

### Required New Components

#### 1. Interactive Video Player Component

**File**: `components/videos/interactive-video-player.tsx`

```typescript
interface InteractiveVideoPlayerProps {
  video: Video;
  publicUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
}
```

**Responsibilities**:

- HTML5 video element with controls
- Time update event handling
- Programmatic seeking capability
- Loading states and error handling

#### 2. Interactive Transcript Component

**File**: `components/videos/interactive-transcript.tsx`

```typescript
interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface InteractiveTranscriptProps {
  words: Word[];
  currentTime: number;
  onWordClick: (startTime: number) => void;
  highlightCurrentWord?: boolean;
}
```

**Responsibilities**:

- Parse `transcript_data_full` to extract words array
- Render clickable word spans
- Highlight current word based on video time
- Handle word click events for seeking

#### 3. Video Player Container

**File**: `components/videos/video-player-with-transcript.tsx`

```typescript
interface VideoPlayerWithTranscriptProps {
  video: Video;
}
```

**Responsibilities**:

- Coordinate video player and transcript components
- Manage state synchronization
- Handle video URL fetching
- Error boundary for video loading issues

### Data Access Patterns

#### Extracting Timestamped Words

```typescript
const getTranscriptWords = (transcriptData: any): Word[] => {
  if (!transcriptData?.results?.channels?.[0]?.alternatives?.[0]?.words) {
    return [];
  }
  return transcriptData.results.channels[0].alternatives[0].words;
};
```

#### Video URL Generation

```typescript
// Use existing action
const result = await getVideoPublicUrl(video.storage_path);
if (result.success) {
  const videoUrl = result.data.publicUrl;
}
```

### Integration Points

#### Update Video Detail Page

**File**: `app/videos/[id]/page.tsx`

- Replace current VideoDetail usage with VideoPlayerWithTranscript
- Maintain existing error handling and navigation

#### Update Video Detail Component

**File**: `components/videos/video-detail.tsx`

- Remove transcript display section
- Focus on metadata display only
- Or integrate new player components directly

### Technical Implementation Details

#### Time Synchronization Logic

```typescript
const findCurrentWord = (words: Word[], currentTime: number): number => {
  return words.findIndex(
    (word) => currentTime >= word.start && currentTime <= word.end
  );
};
```

#### Word Click Handler

```typescript
const handleWordClick = (startTime: number) => {
  if (videoRef.current) {
    videoRef.current.currentTime = startTime;
  }
};
```

#### Video Time Update Handler

```typescript
const handleTimeUpdate = () => {
  if (videoRef.current) {
    setCurrentTime(videoRef.current.currentTime);
  }
};
```

### Performance Considerations

1. **Large Transcripts**: Consider virtualizing transcript for videos with thousands of words
2. **Video Loading**: Implement progressive loading and buffering indicators
3. **Word Highlighting**: Use efficient DOM updates, consider CSS-based highlighting
4. **Memory Usage**: Clean up video elements and event listeners properly

### Styling Considerations

1. **Word Highlighting**: Use CSS classes for current word highlighting
2. **Clickable Indicators**: Visual cues for interactive transcript words
3. **Responsive Design**: Ensure video player works on mobile devices
4. **Accessibility**: Proper ARIA labels and keyboard navigation

## Existing Infrastructure Advantages

1. **Authentication**: Complete user auth system already implemented
2. **Video Storage**: Supabase Storage integration with public URL generation
3. **Transcript Processing**: Deepgram integration with proper data structure
4. **Error Handling**: Robust error states and loading patterns
5. **Type Safety**: Full TypeScript coverage with proper interfaces
6. **Server Actions**: Next.js server actions for secure data fetching

## Implementation Steps

1. **Create Interactive Video Player Component**

   - HTML5 video with controls
   - Time update and seeking functionality
   - Error states and loading indicators

2. **Create Interactive Transcript Component**

   - Parse Deepgram words array
   - Clickable word spans
   - Current word highlighting

3. **Create Container Component**

   - Combine player and transcript
   - Manage state synchronization
   - Handle video URL fetching

4. **Update Video Detail Page**

   - Integrate new components
   - Maintain existing navigation and error handling

5. **Styling and Polish**
   - Responsive design
   - Accessibility improvements
   - Performance optimizations

## Code References

- `lib/types/video.ts:71-88` - DeepgramTranscript interface with words array
- `app/actions/videos.ts:138-167` - getVideoPublicUrl function for video URLs
- `app/actions/videos.ts:470-507` - getVideoById function for video data
- `components/videos/video-detail.tsx:87-111` - Current transcript text parsing
- `components/videos/transcript-manager.tsx:40-70` - Existing transcript handling
- `app/videos/[id]/page.tsx:25-40` - Current video page implementation

## Related Components

- `components/ui/button.tsx` - UI button component for controls
- `components/ui/card.tsx` - Card layout for video player container
- `components/ui/badge.tsx` - Status badges for video state
- `lib/supabase/client.ts` - Supabase client configuration
- `middleware.ts` - Route protection and authentication

This research provides a complete foundation for implementing the interactive video player with clickable transcript functionality while leveraging all existing infrastructure and maintaining the current codebase patterns.
