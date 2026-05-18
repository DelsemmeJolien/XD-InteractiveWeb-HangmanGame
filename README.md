# XD-InteractiveWeb-HangmanGame
# XD HANGMAN - POSE EDITION
 
A browser-based hangman game where you guess letters using body poses instead of a keyboard. Built with HTML, CSS, and JavaScript, using [Teachable Machine](https://teachablemachine.withgoogle.com/) for real-time pose detection via webcam.

The word list is themed around UX/Digital Experience Design vocabulary (e.g. *EMPATHY*, *WIREFRAME*, *PROTOTYPE*).

---

 ## How It Works

 The game uses your webcam and a trained Teachable Machine pose model to detect five poses:

| Right arm out → | Move cursor right |
| Left arm out ← | Move cursor left |
| Both arms up ↑ | Move cursor up |
| Both arms down ↓ | Move cursor down |
| Arms beside body (neutral) | Select the current letter |

Before each game, a tutorial screen walks you through each pose. Hold the correct pose for 2 seconds to confirm it and advance to the next step. Once all five poses are completed, the game starts.
 
---

## Known Limitations
 
- Pose detection accuracy depends on lighting and camera angle. Make sure you are well-lit and your full upper body is visible.
- The model was trained for a specific person/environment results may vary for others.
- The game currently has one fixed word (`EMPATHY`).

---

## Course Context
 
Built as a project for the XD (Digital Experience Design) programme.