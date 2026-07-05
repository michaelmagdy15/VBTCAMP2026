## 2024-11-20 - [Complex Props React.memo]
**Learning:** Found that ScoreboardTab component was receiving many complex props (objects, functions) from App.js that were not referentially stable, causing React.memo to default back to re-rendering if a custom comparison function was not used.
**Action:** Implemented a custom comparison function in React.memo to explicitly check the stability of the required data properties to ensure the memoization works as intended.
