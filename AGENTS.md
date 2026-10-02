# Project architecture

- Local-first user data changes dispatch one shared browser event; the root sync coordinator debounces cloud backup and merges on sign-in or reconnect, preventing feature screens from duplicating synchronization logic.
- Scheduled reports use one protected public server route and a workspace-owned Gmail connection; report preferences and delivery history remain owner-scoped in the database.