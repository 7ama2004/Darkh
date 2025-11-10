# Flashcard Parser Feature

## Overview

The flashcard parser allows you to extract flashcard blocks from your notes into separate flashcard files, maintaining bidirectional links between the source and flashcard notes.

## Usage

1. **Configure flashcard folder**: Go to Settings → Darkh SRS and set your flashcard folder (e.g., "flashcards")

2. **Create flashcard blocks in your notes** using this format:

```markdown
start

What is the capital of France?

s; Paris e;

What is 2 + 2?

s; 4 e;

end
```

3. **Run the command**: Open the command palette (Ctrl/Cmd+P) and run "Parse flashcards in current note"

4. **Result**: 
   - A new flashcard file is created in your flashcard folder
   - The original block is replaced with a link: `[[flashcards/flashcard-20251110-143022.md]] ^fc-20251110-143022-0`
   - The flashcard file contains a source link at the top: `[[source-note#^fc-20251110-143022-0]]`

## Format Rules

- **Markers**: `start` and `end` must be on their own line (whitespace is trimmed)
- **Content**: Everything between `start` and `end` is extracted, including questions and answers with `s;` and `e;` delimiters
- **Multiple blocks**: You can have multiple `start...end` blocks in a single note
- **Nesting**: Nested blocks are NOT supported and will throw an error

## Examples

### Single Block

```markdown
# My Notes

Some content here.

start

What is the chemical formula for water?

s; H2O e;

end

More content here.
```

After running the command, this becomes:

```markdown
# My Notes

Some content here.

[[flashcards/flashcard-20251110-143022.md]] ^fc-20251110-143022-0

More content here.
```

### Multiple Blocks

```markdown
# Physics Notes

start

What is the speed of light?

s; 299,792,458 m/s e;

end

Some notes in between.

start

Who discovered gravity?

s; Isaac Newton e;

end
```

After running the command:
- Creates `flashcard-20251110-143022-0.md`
- Creates `flashcard-20251110-143022-1.md`
- Both blocks replaced with their respective links

## Flashcard File Format

Each created flashcard file contains YAML frontmatter with SRS scheduling data:

```markdown
---
sr: true
ease: 2.5
interval: 0
reps: 0
lapses: 0
due: 2025-11-10
---
[[source-note#^fc-20251110-143022-0]]

What is the chemical formula for water?

s; H2O e;
```

The YAML frontmatter marks the file as an SRS flashcard with initial scheduling state:
- **sr: true** - Marks this as a spaced repetition card
- **ease: 2.5** - Initial ease factor (from plugin settings)
- **interval: 0** - Days until next review (0 = new card)
- **reps: 0** - Number of successful reviews so far
- **lapses: 0** - Number of times marked as "Again"
- **due: YYYY-MM-DD** - Due date (set to today for immediate review)

The source link allows you to quickly navigate back to the original context in your notes.

## Error Handling

The parser will show an error if:
- Flashcard folder is not configured
- `start` without matching `end`
- `end` without matching `start`
- Nested `start` markers
- File creation fails

## Tips

- Review and organize your flashcards before parsing
- Use meaningful content around your flashcard blocks for context
- The flashcard folder will be created automatically if it doesn't exist
- You can edit flashcards after creation - they're just regular markdown files
- Created flashcards are automatically marked as due for review today
- When you open a created flashcard, review mode will activate automatically (if enabled in settings)
- Use the "Go to next note" command to cycle through all due flashcards

