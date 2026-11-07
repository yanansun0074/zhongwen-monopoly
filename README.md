# 中文大富翁 · Zhongwen Monopoly

A colorful, reusable Chinese classroom board game.

## Play

Open https://yanansun0074.github.io/zhongwen-monopoly/ or download this repository and open `index.html` in a modern browser. No installation required.

- Add students or teams and choose animal avatars.
- Roll the dice: a centered animation reveals the result, then the explorer hops one tile at a time.
- The teacher marks spoken answers correct to award the tile’s money.
- Use + / − to adjust money. Remove explorers individually or clear the roster with confirmation.
- Edit lesson changes the nineteen questions, rewards, and optional teacher hints. Import/export lessons for reuse.
- New game resets money and positions while keeping the class and lesson.
- Numbers are displayed in Chinese characters. Reward inputs accept Chinese characters or digits.

Student names, lesson edits, and game progress stay in the current browser’s local storage. They are not sent to GitHub or shared across devices. Export lessons for backup.

## Source and hosting

`index.html`, `style.css`, and `app.js` contain the app. `dice-frames.js` embeds the original PNG frames from the teacher-supplied dice.lottie animation for offline playback. No build step or external runtime dependencies are required.

GitHub Pages serves the `main` branch from the repository root. Syntax check: `node --check app.js`.
