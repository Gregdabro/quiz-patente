# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quiz Patente is a React + Vite application for Italian driving license (patente) exam preparation. It's a mobile-first PWA with iOS 12 compatibility, featuring quiz practice, terminology learning, error tracking, and staged immersion learning.

**Tech Stack:** React 19, Vite 8, React Router 7, localStorage for persistence

**Key Features:**
- Quiz practice across 25 topics (7,144 total questions)
- Dictionary with 140+ entries for Italian traffic terminology
- Error tracking and focused practice
- Statistics and progress tracking
- Immersion mode with staged learning (3 stages per chunk)

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Dictionary data scripts
node scripts/analyze-dictionary.js              # Analyze question frequency and bias
node scripts/scaffold-entries.js --type logic   # Generate entry templates
node scripts/validate-entries.js                # Validate entries.json schema
node scripts/link-questions.js --dry-run         # Link entries to questions (preview)
node scripts/link-questions.js                   # Apply question linking
```

## Architecture

### Data Layer

**Question Data Structure:**
- `src/data/questions/topic_1.json` through `topic_25.json` - 7,144 total questions
- Each question: `{ id, topic_id, text, text_ru, image, comment, answer }`
- `src/data/topics.json` - Topic metadata (25 topics with counts and images)

**Dictionary Data Structure:**
- `src/data/dictionary/entries.json` - 140+ terminology entries
- Entry schema: `{ id, term, term_ru, type, priority, topics, definition, quiz_hint, examples, related_question_ids }`
- Entry types: `term`, `phrase`, `logic_trigger`, `concept`
- Priority levels: 1 (high) → 2 (medium) → 3 (low)

**Storage Keys (localStorage):**
- `qp_progress` - Quiz progress per topic: `{ "1": { lastRun, correct, total, bestScore, runs } }`
- `qp_errors` - Error counter: `{ "questionId": count }`
- `qp_dictionary` - Dictionary progress: `{ "entryId": { seen, practiced } }`
- `qp_immersion_vocab` - Global learned vocabulary: `{ "entryId": true }`
- `qp_immersion_progress` - Chunk progress: `{ "topicId": { "chunkIndex": { s1, s2, quiz } } }`

### Service Layer

**Core Services:**
- `questionsService.js` - Load questions by topic, chunk, entry, or all; session picking
- `dictionaryService.js` - Load dictionary entries, search, progress tracking
- `errorsService.js` - Error counter management (increment/decrement)
- `progressService.js` - Quiz progress and statistics
- `immersionService.js` - Immersion mode: chunk data, stage progress, vocabulary

**Service Pattern:**
- All services use dynamic imports for JSON files (`import.meta.glob`)
- Functions are async for data loading, sync for in-memory operations
- Phase 2 planned: Replace localStorage with API calls (`fetch('/api/...')`)

### Hook Layer

**Core Hooks:**
- `useQuiz.js` - Main quiz logic: question loading, answering, results, session management
- `useDictionary.js` - Dictionary state: loading, filtering, search, progress
- `useImmersion.js` - Immersion mode: chunk selection, stage progression
- `useProgress.js` - Progress statistics across all topics
- `useTopics.js` - Topic metadata and filtering
- `useErrorTopics.js` - Error analysis by topic
- `useSwipe.js` - Touch gesture handling (mobile)

**Hook Pattern:**
- Accept configuration options as parameters
- Return state, callbacks, and loading/error states
- Use `useCallback` for stable function references
- Use `useMemo` for expensive computations

### Component Layer

**Page Components:**
- `HomePage.jsx` - Topic selection grid with progress indicators
- `QuizPage.jsx` - Quiz interface with question cards and pagination
- `DictionaryPage.jsx` - Dictionary with search, filters, and study modes
- `ErrorsPage.jsx` - Error review by topic
- `StatsPage.jsx` - Overall statistics and progress visualization
- `ImmersionPage.jsx` - Chunk selection for immersion mode
- `ImmersionStudyPage.jsx` - 3-stage learning flow (Study 1 → Study 2 → Quiz)

**Feature Components:**
- `quiz/` - QuestionCard, QuizPagination, ResultScreen, CommentAccordion
- `dictionary/` - DictionaryEntryCard, StudyCard, SearchBar, TypeFilter, TopicFilter, ModeToggle
- `immersion/` - ChunkCard, StageProgress, FlashCard, StudySegment
- `layout/` - AppHeader, BottomNav, TopicCard
- `ui/` - Button, Card, Icon, Spinner, SlideTransition, ConfirmationModal

**Component Pattern:**
- Functional components with hooks
- Props interface documented in JSDoc comments
- BEM CSS naming convention
- Mobile-first responsive design

### Routing

**Route Structure:**
```
/                          → HomePage
/quiz/:topicId            → QuizPage (topicId: "1"-"25" | "all" | "errors" | "errors:N" | "dict:entryId")
/errors                    → ErrorsPage
/stats                     → StatsPage
/dictionary                → DictionaryPage
/immersion/:topicId        → ImmersionPage (chunk selection)
/immersion/:topicId/:chunkIndex → ImmersionStudyPage (3-stage learning)
```

**Special topicId Patterns:**
- `"all"` - Random questions from all topics
- `"errors"` - Only questions with errors
- `"errors:N"` - Errors for specific topic N
- `"dict:entryId"` - Questions related to dictionary entry
- `"immersion:topicId:chunkIndex"` - Sequential chunk for immersion mode

## Key Architectural Decisions

### iOS 12 Compatibility

**Browser Support:** iOS Safari 12+, Safari 12+, Chrome 92+

**Implementation:**
- Vite legacy plugin with polyfills
- No CSS Grid gap (use margins instead)
- No `gap` in flexbox (use margins)
- No `transform: rotateY` (use max-height transitions)
- Diacritic normalization: `.normalize('NFD').replace(/[̀-ͯ]/g, '')`
- Touch scrolling: `-webkit-overflow-scrolling: touch`

### Performance Optimizations

**Question Loading:**
- Dynamic imports with `import.meta.glob`
- Batch loading (5 topics at a time for all questions)
- In-memory caching in services
- Session size limited to 30 questions

**Dictionary:**
- Single JSON file loaded once per session
- Client-side filtering and search (no server calls)
- Debounced search input (300ms)

**Rendering:**
- `React.memo` for list items
- `useMemo` for filtered lists
- `useCallback` for event handlers

### Data Flow Patterns

**Quiz Flow:**
1. User selects topic → `useQuiz(topicId)` loads questions
2. `questionsService` loads topic data → `pickSessionQuestions` shuffles and slices
3. User answers → `answer()` updates state and error counters
4. Session complete → `finish()` saves progress and marks immersion stages

**Dictionary Flow:**
1. `useDictionary` loads all entries on mount
2. Filters applied in memory (type, topic, search)
3. User expands card → `markSeen()` updates localStorage
4. User practices → `markPracticed()` updates progress

**Immersion Flow:**
1. User selects topic → `ImmersionPage` shows chunks
2. User selects chunk → `ImmersionStudyPage` loads 3 stages
3. Stage 1: Study logic_trigger + term cards (12 cards)
4. Stage 2: Study phrase + concept cards (8 cards)
5. Stage 3: Quiz on chunk questions (20 questions)
6. Complete → `markStageComplete()` unlocks next chunk

## CSS Architecture

**File Structure:**
- `global.css` - Reset, base styles, variables
- `layout.css` - App shell, navigation, grid layouts
- `components.css` - Reusable component styles
- `pages.css` - Page-specific styles

**Naming Convention:**
- BEM: `.block__element--modifier`
- Feature prefixes: `.dict-`, `.quiz-`, `.immersion-`, `.stats-`
- Utility classes: `.text-center`, `.flex-center`, `.hidden`

**Mobile-First:**
- Base styles for mobile (320px+)
- Media queries for tablet (768px+) and desktop (1024px+)
- Touch-friendly tap targets (44px minimum)

## Dictionary Development Workflow

When working on dictionary entries, follow this process:

1. **Generate candidates:** `node scripts/analyze-dictionary.js --bias-only`
2. **Create scaffolds:** `node scripts/scaffold-entries.js --type logic --min-bias 25`
3. **Fill entries manually:** Edit scaffold JSON with definitions and hints
4. **Validate:** `node scripts/validate-entries.js` (must pass with 0 CRITICAL)
5. **Link questions:** `node scripts/link-questions.js --dry-run` then apply
6. **Test:** Verify entries appear in DictionaryPage and link correctly

**Entry Quality Rules:**
- `definition.ru`: 80+ chars, explain mechanism + legal context
- `quiz_hint.ru`: 60+ chars, specific advice + pattern
- `examples`: At least 1 real question with answer and comment
- `related_question_ids`: Minimum 3 questions (auto-linked by script)

**See Also:** `DICTIONARY_SCALING_SKILL.md` for detailed scaling workflow

## Common Patterns

### Service Function Pattern

```javascript
// Async data loading
export async function loadSomething(id) {
  const path = '../data/something_' + id + '.json';
  const module = await import(path);
  return module.default || module;
}

// Sync in-memory operations
export function filterSomething(items, criteria) {
  return items.filter(item => matches(item, criteria));
}
```

### Hook Pattern

```javascript
export default function useFeature(options = {}) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then(data => {
        if (cancelled) return;
        setState(data);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dependencies]);

  const callback = useCallback((arg) => {
    // Stable callback
  }, [dependencies]);

  return { state, loading, error, callback };
}
```

### Component Pattern

```javascript
/**
 * ComponentName - Brief description
 *
 * @param {Object} props
 * @param {Type} props.propName - Description
 * @returns {JSX.Element}
 */
export default function ComponentName({ propName, onAction }) {
  const [localState, setLocalState] = useState(null);

  const handleClick = useCallback(() => {
    onAction(localState);
  }, [localState, onAction]);

  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
}
```

## Testing Strategy

**Manual Testing Checklist:**
- Quiz flow: answer questions, navigate, finish session
- Dictionary: search, filter, expand cards, mark practiced
- Errors: view errors, practice, verify counter updates
- Immersion: complete 3-stage flow, verify chunk unlocking
- Mobile: test on iOS Safari 12+ and Android Chrome
- Performance: check load times on 3G connection

**Browser Testing:**
- iOS Safari 12+ (primary target)
- Safari 12+ (desktop)
- Chrome 92+ (Android and desktop)

## Deployment

**Build Process:**
```bash
npm run build
# Outputs to dist/ directory
# Optimized for iOS 12 with polyfills
```

**Hosting:**
- Vercel (configured in `vercel.json`)
- Static site build (no server-side rendering)
- PWA-ready (add manifest for full PWA support)

## Important Notes

**Phase 2 Backend Migration:**
- All services currently use localStorage
- Planned migration to API endpoints
- Service functions will be replaced with `fetch('/api/...')`
- Data schemas will remain the same

**Data Updates:**
- Question data: Update `src/data/questions/topic_*.json` files
- Dictionary entries: Use scripts workflow (see above)
- Topic metadata: Update `src/data/topics.json`

**Performance Considerations:**
- Keep session size at 30 questions
- Dictionary entries under 500 for optimal performance
- Use `React.memo` for list items with 50+ items
- Debounce search inputs and scroll handlers

**Accessibility:**
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast color ratios
