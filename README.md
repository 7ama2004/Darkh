# Darkh SRS

A file-based spaced repetition system for Obsidian. All scheduling data is stored in YAML frontmatter—no external database required.

## Features

- **File-based storage**: All review data stored in YAML frontmatter
- **Flexible cloze syntax**: Supports both inline (`s;text;`) and multiline cloze blocks
- **Review View**: Customizable highlight color for hiding answer regions with smooth reveal
- **Two workflows**:
  - **Ad-hoc review**: Review any single note on demand
  - **Session review**: Queue-based review of all due cards
- **SM-2 algorithm**: Proven spaced repetition scheduling
- **Configurable hotkeys**: Customize keyboard shortcuts for all review actions
- **Customizable appearance**: Choose your own highlight color for hidden clozes
- **Mobile-friendly**: Large touch targets and bottom-anchored toolbar
- **Minimal UI**: Clean, distraction-free interface

## Installation

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `<vault>/.obsidian/plugins/darkh-srs/`
3. Copy the three files into that folder
4. Reload Obsidian
5. Enable "Darkh SRS" in Settings → Community plugins

### Development Installation

1. Clone this repo into `<vault>/.obsidian/plugins/darkh-srs/`
2. Run `npm install` to install dependencies
3. Run `npm run dev` to watch for changes
4. Reload Obsidian and enable the plugin

## Usage

### Setting Up

1. Open Settings → Darkh SRS
2. Configure your **flashcard folder** (e.g., `flashcards/`)
3. Optionally customize the **hidden cloze color** to your preference
4. Optionally toggle **auto-enable review mode** (on by default)
5. Optionally adjust scheduler parameters and hotkeys

### Creating Flashcards

Create markdown files in your flashcard folder. Use cloze syntax to mark answers:

#### Inline Cloze

```markdown
The s;Mitochondria; is the powerhouse of the cell.
```

#### Multiline Cloze

```markdown
What are the main components of the CNS?

s;
1. The Brain
2. The Spinal Cord
e;
```

### Reviewing Cards

#### Ad-hoc Review

1. Open any flashcard note
2. Run command: **Toggle review view** (Ctrl/Cmd+P)
3. Click **Reveal Next** to show each cloze
4. Rate with **Again**, **Hard**, **Good**, or **Easy**

#### Session Review

1. Run command: **Start review session**
2. All due cards will be queued
3. Review each card in sequence
4. Session auto-advances after each rating

### Hotkeys

The plugin provides commands that only work when Review View is active. You can assign your own keyboard shortcuts through **Settings → Hotkeys**:

- **Reveal next cloze**: Show the next hidden answer
- **Rate card as 'Again'**: Mark card as failed (review in 1 day)
- **Rate card as 'Hard'**: Mark with minimal progress
- **Rate card as 'Good'**: Standard SM-2 progression
- **Rate card as 'Easy'**: Boosted progression

**Suggested hotkey assignments:**
- Space for "Reveal next cloze"
- 1, 2, 3, 4 for the rating commands

Commands automatically enable/disable based on whether Review View is active and which actions are currently available.

## YAML Frontmatter

The plugin stores scheduling data in your notes:

```yaml
---
sr: true
due: 2025-11-09
interval: 7
ease: 2.5
reps: 3
lapses: 0
last_review: 2025-11-02
---
```

- **due**: Next review date (ISO format)
- **interval**: Days until next review
- **ease**: SM-2 ease factor
- **reps**: Successful repetitions
- **lapses**: Times marked "Again"
- **last_review**: Last review date

## Scheduling Algorithm

Uses a modified SM-2 algorithm:

- **Again**: Reset progress, review in 1 day
- **Hard**: Minimal interval increase (1.2x)
- **Good**: Standard SM-2 progression
- **Easy**: Boosted interval (1.3x ease factor)

## Mobile Support

The plugin is fully compatible with mobile:

- Bottom-anchored toolbar for thumb reach
- Large touch-friendly buttons
- Progress banner instead of status bar
- Responsive design

## Tips

- Keep your flashcard folder organized with subfolders
- Use meaningful file names for easy identification
- Flashcards with scheduling data automatically open in Review View (can be disabled in settings)
- You can edit notes while in Review View
- Clozes update automatically as you type
- Cards with no clozes can still be rated

## Troubleshooting

### No cards showing in session

- Check that flashcard folder is configured correctly
- Verify folder path exists in your vault
- Ensure notes have cloze syntax (`s;` and `e;`)

### Hotkeys not working

- Verify you've assigned hotkeys in **Settings → Hotkeys** (search for "Darkh")
- Confirm Review View is active (toolbar should be visible)
- Rating commands only work when all clozes are revealed
- Reveal command only works when unrevealed clozes remain

### Frontmatter not saving

- Check file permissions
- Verify note is not read-only
- Look for errors in Developer Console (Ctrl+Shift+I)

## Development

### Building

```bash
npm install
npm run build
```

### Watching for changes

```bash
npm run dev
```

### Project Structure

```
src/
  main.ts                      # Plugin entry point
  settings.ts                  # Settings and settings tab
  types.ts                     # TypeScript interfaces
  scheduler.ts                 # SM-2 algorithm
  cloze-parser.ts             # Cloze syntax parser
  yaml-service.ts             # YAML frontmatter I/O
  insight-discovery.ts        # Find due notes
  session-manager.ts          # Queue management
  review-view-controller.ts   # CodeMirror 6 integration
  hotkey-manager.ts           # Hotkey commands
  ui/
    review-toolbar.ts         # Toolbar component
    session-progress.ts       # Progress indicator
    utils.ts                  # UI utilities
```

## Privacy

This plugin:
- ✅ Operates entirely offline
- ✅ Stores all data in your vault
- ✅ Does not collect telemetry
- ✅ Does not make network requests
- ✅ Does not access files outside your vault

## License

MIT License - see LICENSE file for details.

## Contributing

Issues and pull requests welcome! Please ensure:
- Code follows existing style
- All TypeScript compiles without errors
- Manual testing on desktop and mobile

## Credits

Built with:
- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [CodeMirror 6](https://codemirror.net/)
- [js-yaml](https://github.com/nodeca/js-yaml)

Inspired by spaced repetition systems like Anki and the Obsidian community.
