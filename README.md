# Spaced Repetition Plugin for Obsidian

A file-based spaced repetition system that stores all scheduling data in YAML frontmatter. No external databases required.

## Features

- **File-based**: All scheduling data lives in YAML frontmatter
- **Flexible**: Use any markdown content as questions, highlight answers with `==...==`
- **Two review modes**:
  - **Ad-hoc review**: Open any flashcard file and review it
  - **Session review**: Review all due cards in sequence
- **SM-2 Algorithm**: Uses the SuperMemo 2 algorithm for intelligent scheduling
- **Live editing**: Edit your flashcards even while reviewing

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/spaced-repetition/` folder
2. Reload Obsidian
3. Enable the plugin in **Settings → Community plugins**

## Usage

### Creating Flashcards

Create a markdown file in your flashcard folder (default: `flashcards/`) with:

1. **YAML frontmatter** with scheduling data (auto-initialized on first review):
   ```yaml
   ---
   due: 2025-11-10
   interval: 2.5
   ease: 230
   created: 2025-11-09
   ---
   ```

2. **Free-form markdown content** as your question

3. **Highlighted answers** using `==...==` markers:
   ```markdown
   What's the difference between a process and a program?
   
   A program is just the file on disk.
   
   ==A **process** is that program in *action*.==
   ```

### Reviewing Flashcards

#### Ad-Hoc Review

1. Open any flashcard file
2. Run the command **"Start review (current file)"** from the command palette
3. The `==...==` highlights will be blurred
4. Click **"Reveal Next"** to reveal answers one by one
5. After all answers are revealed, click a feedback button:
   - **Again**: Review again tomorrow
   - **Hard**: Slightly harder interval
   - **Good**: Normal interval
   - **Easy**: Longer interval

#### Session Review

1. Run the command **"Start review session"** from the command palette
2. The plugin will find all cards where `due <= today`
3. Review each card in sequence
4. After clicking feedback, the next card automatically loads

### Settings

Configure the flashcard folder path in **Settings → Spaced Repetition**.

## How It Works

- The plugin uses CSS to blur `==...==` highlighted text during review
- When you provide feedback, it calculates new scheduling using the SM-2 algorithm
- All scheduling data is stored in the file's YAML frontmatter
- No external database or separate storage needed

## Commands

- **Start review (current file)**: Begin reviewing the currently open flashcard
- **Start review session**: Review all due cards in sequence
- **End current review**: Stop the current review session

## Technical Details

- Uses the SM-2 spaced repetition algorithm
- Minimum ease factor: 130
- Default ease factor: 250
- Intervals are calculated in days
- All data stored in YAML frontmatter (no external storage)
