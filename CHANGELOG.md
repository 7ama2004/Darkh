# Changelog

All notable changes to the Darkh SRS plugin will be documented in this file.

## [1.0.0] - 2025-11-09

### Initial Release

#### Features

- **File-based spaced repetition system**
  - All scheduling data stored in YAML frontmatter
  - No external database required
  - Complete data portability

- **Cloze syntax support**
  - Inline clozes: `s;answer;`
  - Multiline clozes: `s;` ... `e;`
  - Automatic parsing and real-time updates

- **Review View**
  - CodeMirror 6 integration
  - Blur effect for hidden content
  - Smooth reveal transitions
  - Fully editable while reviewing

- **Two review workflows**
  - Ad-hoc review: Review any note on demand
  - Session review: Queue-based review of due cards
  - Session progress tracking

- **SM-2 scheduling algorithm**
  - Four rating options: Again, Hard, Good, Easy
  - Configurable ease factors and intervals
  - Intelligent card scheduling

- **Configurable hotkeys**
  - Customizable keyboard shortcuts
  - Space for reveal (default)
  - 1-4 for ratings (default)
  - Context-aware activation

- **Mobile optimization**
  - Bottom-anchored toolbar
  - Large touch targets
  - Responsive design
  - Mobile-specific progress indicator

- **User interface**
  - Minimal, clean design
  - Dark mode compatible
  - Subtle color coding for ratings
  - Accessibility features

#### Settings

- Flashcard folder configuration
- Initial ease factor (default: 2.5)
- Minimum ease factor (default: 1.3)
- Maximum interval cap (default: 365 days)
- Hotkey customization for all actions
- Mobile UI preferences

#### Commands

- Toggle review view
- Start review session
- End review session
- Reveal next cloze (hotkey)
- Rate as Again/Hard/Good/Easy (hotkeys)

#### Technical

- TypeScript with strict mode
- Modular architecture
- Comprehensive error handling
- No external network requests
- Fully offline operation

### Known Limitations

- Nested clozes are not supported
- Requires manual flashcard folder configuration
- Session state is not persisted across app restarts

### Future Considerations

- Statistics and analytics
- Custom scheduling algorithms
- Card templates
- Import/export functionality
- Tags-based filtering
- Advanced search and filtering

