# Security Specification - Intervalo Escola de Teatro

## Data Invariants
1. A user cannot modify another user's role.
2. A user can only see their own private data (like bank details).
3. A student cannot create or modify classes.
4. A professor can only see classes they are assigned to (if we implement that filtering).
5. Only Gestores can create or delete users and classes.

## The Dirty Dozen Payloads

1. **Identity Theft**: Attempting to create a user with a different `uid` than the authenticated one.
2. **Privilege Escalation**: An "Aluno" trying to update their role to "Gestor".
3. **Shadow Field Injection**: Adding an `isAdmin: true` field to a user document.
4. **Data Scraping**: Attempting to list all users as an "Aluno".
5. **Unauthorized Class Creation**: An "Aluno" trying to create a document in `/classes`.
6. **Class Tampering**: A "Professor" trying to change the `isActive` status of a class they don't teach.
7. **Bypassing Validation**: Sending a class document without a `type` field.
8. **ID Poisoning**: Creating a user with a document ID that is 2KB long.
9. **Relational Sync Failure**: Creating a class with a `teacherId` that doesn't exist.
10. **State Shortcut**: Changing a class from `isActive: true` to `isActive: false` without providing an `inactivationReason` (if required).
11. **Timestamp Spoofing**: Sending a client-side `updatedAt` instead of `request.time`.
12. **PII Leak**: A non-admin user trying to `get` the document of a Professor to see their `bankAccount`.

## The Test Runner (Mock)
A `firestore.rules.test.ts` would verify these scenarios by simulating different roles and verifying `PERMISSION_DENIED`.
