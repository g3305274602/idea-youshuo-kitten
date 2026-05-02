---
description: A description of your rule
---

This is a Cursor rules file (.cursorrules) specifically designed for the React + SpacetimeDB (TypeScript) development environment. This set of rules combines our previous work on Identity drift fixing, efficient View queries, and Neo-brutalist/Cosmic visual guidelines.

You can copy the following content directly into the .cursorrules file in your project's root directory.

React + SpacetimeDB Development Guidelines (YouTalk Exclusive)

1. Core Architectural Principles

- Stable Soul (AccountId): Always prioritize using accountId (or Email) for data ownership determination. Identity is only considered the current "access key" and will change with device changes.

- Subscription Over Lazy-loading: For "user personal data" (such as favorites, private messages, and emails), the useTable subscription should be maintained after login. Disconnection during page transitions is strictly prohibited to prevent UI flickering or blanking. - Backend View Optimization: All `spacetimedb.view` instances must utilize btree indexes for `.filter()`. Full table scans using `.iter()` on large tables within the View are prohibited.

2. SpacetimeDB TypeScript Specification (Backend)

- Table Definition:

- Fields involved in queries (such as `authorAccountId`, `senderEmail`) must be appended with `.index("btree")`.

- Sensitive data tables must have `public: false` set, and authorization filtering must be implemented through the view.

- Reducer Security:

- Before executing an update action, it is necessary to check if the target exists and if `ctx.sender` has the necessary permissions.

- The login Reducer (`login_account`) must include a conflictProfile check to prevent system crashes (Fatal Errors) caused by Identity unique constraint conflicts.

- Timestamp Handling:

- When interacting with the frontend, consistently use the Timestamp type and call `.toDate()` in the UI layer.

- The `identity` key in SpacetimeDB is not a stable primary key value and should not be used for matching or similar activities. Do not use it for any identity, information, or comparison activities. Currently, I only intend to use it for checking if a login has expired.

3. React Component Specifications (Frontend)

- Hooks Usage:

- useTable must be placed at the top level of the component.

- Use useMemo to handle complex list filtering (such as capsuleChatThreads), and ensure that dependencies contain all relevant table rows.

- Identity Management:

- Follow the "Keyring" logic: After successful login, store (Email -> Token) in localStorage's

STBD_MAILBOX_KEYS.

- When a CONFLICT_IDENTITY error occurs, automatically clear the Token and call window.location.reload().

- Security Checks:

- When reading currentMessage or userProfile properties, you must use the optional chain ?. (e.g., currentMessage?.recipientEmail) to prevent crashes during data synchronization.

4. UI/UX Visual Specifications (Cosmic Neo-brutalism)

- Basic Styles:

- Borders: border-[3px] border-stone-900. - Shadow: Hard offset shadow `shadow-[4px_4px_0_0_#000]`.

- Button: Physical click feel with `active:translate-y-0.5`.

- Frosted Glass Effect:

- Pop-ups use `backdrop-blur-xl bg-white/90` or `bg-[#fffef7]`.

- Scrollbar uses `.custom-scrollbar` (thin, semi-transparent, trackless background).

- HTML Structure Safety:

- No Button Nesting: A `<button>` must never contain another `<button>`. If you need to place a button inside a card, change the outer container to a `div` and set `role="button"`.

5. Commonly Used Helper Functions

- Age Calculation: Always use UTC time to calculate age to avoid time zone traps.

- Email Normalization: `.trim().toLowerCase()` must be executed before all email comparisons.

6. Cursor Directive Suggestions

- When requesting "Refactor Pagination," ensure that the logic of `isMobileDetailView` includes the selected state of that pagination.

- When requesting "UI Enhancement," prioritize referencing the existing `border-stone-900` style in `SpacetimeMailboxApp.tsx`.

How to use this rule?

1. Auto-completion: When writing `useTable`, AI will automatically remind you whether you need to consider Identity drift.

2. Code Review: When you write nested buttons, Cursor will report an error according to rule 4.

3. Logic Generation: When you request the generation of a new Reducer, AI will automatically add pf permission checks and index suggestions.