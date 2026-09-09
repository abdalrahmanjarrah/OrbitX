# Realtime Study Platform - Firestore Security Rules Audit Spec

This document details the Zero-Trust security assertions, invariants, and threat vectors identified during the deep-dive audit of the Firestore Security Rules for this platform.

---

## 1. Core Data Invariants & Zero-Trust Assertions

1. **Identity & Privilege Separation (Anti-Escalation)**
   - Only admins from the verified list (`lumafashionhq@gmail.com`, `abdalrahmanjarrah94@gmail.com`) can set their role as `admin` or perform administrative writes.
   - Standard users cannot modify their own `role`, `banned`, or other sensitive flag parameters.

2. **Progression Security (Anti-Cheat)**
   - Users are strictly forbidden from modifying their own `xp`, `level`, and `coins` arbitrarily.
   - Positive XP increases must be strictly bounded per-operation (e.g., `<= 200 XP`).
   - Levels must be mathematically anchored to XP: `level == floor(xp / 1000) + 1` (or checked with bounds of `level * 1000 > xp && (level - 1) * 1000 <= xp`).
   - Positive currency/coin updates must be bounded per-operation (e.g., `<= 100 coins`).

3. **Room Integrity (Anti-Hijack & Spectator Protection)**
   - Spectators or non-active room participants are strictly forbidden from writing messages or typing signals inside a study room.
   - Non-creators cannot modify room configuration parameters (e.g., `creatorId`, `name`, `task`, `maxParticipants`, or `timerDuration`).
   - Room timers can only be updated by active participants of that room.

4. **Challenge Integrity (Anti-Spoofing)**
   - A player cannot update the progress of other players.
   - Challenge updates are constrained to a strict status change flow (e.g., pending -> accepted/declined, active -> completed).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads represent attacks designed to break identity, integrity, and progression logic on the client-side. Our security rules must reject them with `PERMISSION_DENIED`.

### Payload 1: Privilege Escalation (Self-Assigned Admin Role)
- **Target Path**: `users/attacker_uid` (Create or Update)
- **Malicious Payload**:
  ```json
  {
    "uid": "attacker_uid",
    "displayName": "Hacker",
    "email": "hacker@gmail.com",
    "photoURL": "https://example.com/hacker.png",
    "level": 1,
    "xp": 0,
    "role": "admin",
    "hearts": 3
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Unless the user is authenticated as one of the bootstrap admins, they cannot assign themselves the 'admin' role).

### Payload 2: Level Manipulation (Setting Max Level)
- **Target Path**: `users/attacker_uid` (Update)
- **Malicious Payload**:
  ```json
  {
    "level": 100
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Level changes are rejected unless XP is also incremented proportionally).

### Payload 3: Instant 1,000,000 XP Injection
- **Target Path**: `users/attacker_uid` (Update)
- **Malicious Payload**:
  ```json
  {
    "xp": 1000000
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Positive XP increment is capped at 200 per operation).

### Payload 4: Self-Unbanning Exploits
- **Target Path**: `users/attacker_uid` (Update)
- **Malicious Payload**:
  ```json
  {
    "banned": false
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Only genuine admins can modify the `banned` field).

### Payload 5: Infinite Coins Hack
- **Target Path**: `users/attacker_uid` (Update)
- **Malicious Payload**:
  ```json
  {
    "coins": 999999
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Direct unbounded coin modification is restricted).

### Payload 6: Room Hijacking (Taking Creator Role)
- **Target Path**: `rooms/room_123` (Update)
- **Malicious Payload**:
  ```json
  {
    "creatorId": "attacker_uid",
    "creatorName": "Malicious Attacker"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Non-creators/non-hosts cannot change the `creatorId` or room metadata).

### Payload 7: Spectator Writing Spam
- **Target Path**: `rooms/room_123/messages/msg_999` (Create)
- **Malicious Payload**:
  ```json
  {
    "text": "Spam message!",
    "userId": "attacker_uid",
    "userName": "Spammer",
    "timestamp": "request.time",
    "type": "text"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Fails because `attacker_uid` is not present in `rooms/room_123.participants`).

### Payload 8: Direct Leaderboard Manipulation (Arbitrary Fleet XP)
- **Target Path**: `fleets/fleet_abc` (Update)
- **Malicious Payload**:
  ```json
  {
    "xp": 9999999
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Fleet members cannot increment XP by more than 200 at a time).

### Payload 9: Spoofing Opponent's Challenge Progress
- **Target Path**: `challenges/challenge_456` (Update)
- **Malicious Payload**:
  ```json
  {
    "progressPlayer2": 5000000
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (A player is only allowed to increment their own progress parameter: `progressPlayer1` for challenger, `progressPlayer2` for challenged).

### Payload 10: Unauthorized Admin Advices Posting
- **Target Path**: `advices/advice_789` (Create)
- **Malicious Payload**:
  ```json
  {
    "text": "Phishing advice message...",
    "adminId": "attacker_uid",
    "timestamp": "request.time"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Only verified admins can write to `/advices`).

### Payload 11: Modifying Global Chat Profile Photos
- **Target Path**: `global_chat/message_456` (Update)
- **Malicious Payload**:
  ```json
  {
    "text": "Overwritten spam!",
    "userPhoto": "https://attacker.com/profile.png"
  }
  ```
- **Expected Outcome**: `PERMISSION_DENIED` (Non-authors cannot modify message fields, and authors can only update their `userPhoto` field, not `text`).

### Payload 12: Private Ticket Read / Write Abuse
- **Target Path**: `support_tickets/ticket_111` (Read / Write)
- **Expected Outcome**: `PERMISSION_DENIED` (Only verified admins can access target support tickets).

---

## 3. Test Runner Specification

```typescript
// firestore.rules.test.ts - Conceptual outline of tests verifying the Dirty Dozen

import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { setDoc, updateDoc, addDoc } from 'firebase/firestore';

describe('Realtime Study Platform - Rules Unit Tests', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'realtime-study-platform-test',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('Payload 1: Should block privilege escalation', async () => {
    const context = testEnv.authenticatedContext('attacker_uid');
    const db = context.firestore();
    await assertFails(
      setDoc(doc(db, 'users', 'attacker_uid'), {
        uid: 'attacker_uid',
        displayName: 'Hacker',
        email: 'hacker@gmail.com',
        photoURL: 'https://example.com/hacker.png',
        level: 1,
        xp: 0,
        role: 'admin',
        hearts: 3
      })
    );
  });

  // Additional unit tests matching all Payload tests...
});
```
