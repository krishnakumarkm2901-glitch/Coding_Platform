# 30-Minute Resolution Window Implementation - Summary

## Overview
Successfully implemented a complete 30-minute resolution window for locked contest attempts. When a student exits fullscreen on their first attempt, the attempt is LOCKED (not terminated) for 30 minutes, allowing administrators time to investigate and restore access by activating a retest.

## Key Features Implemented

### 1. Lock Instead of Terminate
- **First attempt fullscreen exit**: Transitions to LOCKED status (30-minute window)
- **Retest fullscreen exit**: Immediately terminates (instant failure)
- **Purpose**: Allows admin time to resolve issues before auto-termination

### 2. 30-Minute Resolution Window
- Lock timeout stored as: `lock_timeout_at = locked_at + 1800 seconds`
- Auto-expiration: Checked on each API call to `get_contest_details()`
- If window expires: Status automatically transitions to AUTO_TERMINATED
- Remaining time sent to frontend: `lock_timeout_remaining_seconds`

### 3. Admin Restore Workflow
- Admin can only restore LOCKED attempts (status validation)
- Admin can only restore within 30-minute window (timeout validation)
- Creates NEW attempt with fresh questions (excludes previous questions)
- Marks old attempt as AUTO_TERMINATED with reason "Resolved by admin - retest activated"
- Prevents duplicate retests (checks for existing active attempts)

### 4. Frontend Lock Display
- Countdown timer showing remaining minutes:seconds
- Visual warning when <5 minutes remain
- Auto-checks for admin restore every 5 seconds
- Shows "Resolution window expired" if time runs out
- Transitions to retest_available when admin activates retest
- Automatic redirect to terminated screen if lock expires

## Files Modified

### Backend: `/server/routes/contests.py`

#### Modified Endpoint: `lock_contest()` (Lines 583-707)
```python
POST /contests/<contest_id>/lock
Request: {
  "reason": "EXIT_FULLSCREEN",
  "detail": "Exited fullscreen contest mode",
  "remaining_seconds": <seconds left in contest>
}
Response: {
  "success": True,
  "message": "Contest attempt locked...",
  "is_locked": True,
  "lock_reason": "<reason>",
  "lock_timeout_minutes": 30
}
```

**Key Changes:**
- Calculates `lock_timeout_at = now + timedelta(seconds=1800)`
- Sets `resolution_window_active = True`
- Stores `locked_at`, `lock_reason`, `locked_remaining_seconds`
- Notifies student and all admins
- Targets only `is_active_attempt: True` to avoid multiple matches

#### Modified Endpoint: `get_contest_details()` (Lines 245-360)
**New Auto-Expiration Logic:**
- Checks if `status == "LOCKED"` AND `lock_timeout_at` exists
- If `now > lock_timeout_at`: Auto-terminates with reason "Lock resolution window (30 minutes) expired"
- Calculates `lock_timeout_remaining_seconds = max(0, (lock_timeout_at - now).total_seconds())`
- Detects retest availability from higher `attempt_number`
- Returns in response: `lock_timeout_remaining_seconds`

#### Modified Endpoint: `terminate_contest()` (Lines 554-605)
**Fixed Query Targeting:**
- Now targets only `is_active_attempt: True`
- Prevents accidentally terminating wrong attempt if multiple exist
- Sends notifications to student and admins

### Backend: `/server/routes/admin.py`

#### Rewritten Endpoint: `restore_contest_access()` (Lines 1565-1680)
```python
POST /admin/contests/<contest_id>/restore/<participant_id>
Response: {
  "success": True,
  "message": "Retest activated successfully with new question set",
  "new_participant_id": "<ObjectId>",
  "attempt_number": 2
}
```

**Key Changes:**
1. **Validation Layer:**
   - Verifies `status == "LOCKED"` (rejects other statuses with clear messages)
   - Checks `now <= lock_timeout_at` (rejects expired windows)
   - Auto-terminates if window expired (lazy termination on access attempt)

2. **Duplicate Prevention:**
   - Queries for existing active attempt with `attempt_number > current`
   - Returns 409 Conflict if retest already active
   - Prevents race conditions where admin creates multiple retests

3. **Retest Creation:**
   - Marks old attempt: `status: "AUTO_TERMINATED"`, `auto_terminated: True`
   - Creates NEW participant document with:
     - `attempt_number: current + 1`
     - `is_active_attempt: True`
     - Fresh `assigned_mcq_ids` via `get_or_assign_student_mcqs(..., exclude_previous_ids=...)`
     - `original_attempt_id: ObjectId(locked_attempt_id)` for history tracking
     - `status: "IN_PROGRESS"`
   - Logs event: `RETEST_ACTIVATED` in anti_cheat_logs

4. **Notifications:**
   - Student: "Retest Activated ✓ - Admin has activated your retest with a new set of questions"
   - Admins: Notification about retest being activated

### Frontend: `/client/src/pages/student/ContestArena.jsx`

#### New State Management
```javascript
const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
```

#### Updated: `fetchContestDetails()` function
- Now sets `setLockTimeRemaining(c.lock_timeout_remaining_seconds || 0)`
- Properly transitions between locked → retest_available → arena states

#### Updated: `handleFullscreenChange()` logic
- Existing logic is correct:
  - `attempt_number === 1` → calls `triggerLock()` (LOCKED)
  - `attempt_number > 1` → calls `triggerTermination()` (AUTO_TERMINATED)

#### New: Locked Screen UI (mode === 'locked')
**Features:**
- Large countdown timer: `MM:SS` format showing remaining lock time
- Blue timer box: "Resolution Window" label with visual styling
- Auto-check every 5 seconds for:
  - Admin restore (transitions to retest_available)
  - Window expiration (transitions to terminated)
- Warning message when <5 minutes remain
- Display: "Checking for admin restore every 5 seconds..."
- Reason display box explaining why attempt was locked
- "Back to Contests" link for navigation

**Key Behavior:**
- Timer counts down in real-time
- Auto-fetches status every 5 seconds to check for admin action
- Automatically transitions to retest_available if admin restores
- Automatically transitions to terminated if window expires

#### Existing: Retest Start UI (mode === 'retest_available')
- "Your Retest is Ready" modal
- Displays "Attempt #X" number
- Emphasizes fullscreen requirement
- "Start Retest" button triggers `handleStartRetest()`
- "Cancel" button returns to locked screen

## Database Schema Changes

### contest_participants Collection

**New Fields:**
```javascript
{
  // Lock-related fields (set on fullscreen exit of attempt #1)
  status: "LOCKED",  // OR "AUTO_TERMINATED" or "IN_PROGRESS"
  locked_at: DateTime,
  lock_timeout_at: DateTime,  // locked_at + 1800 seconds
  resolution_window_active: Boolean,
  lock_reason: String,
  locked_remaining_seconds: Number,
  
  // Termination tracking
  auto_terminated: Boolean,
  terminated_at: DateTime,
  termination_reason: String,
  
  // Retest linkage
  original_attempt_id: ObjectId,  // Tracks which locked attempt this retest was for
  
  // Attempt tracking (existing fields used more effectively)
  attempt_number: Number,  // 1 = first attempt, 2 = first retest, etc.
  is_active_attempt: Boolean,  // Only ONE active attempt per student per contest
  
  // Existing fields still used
  assigned_mcq_ids: [ObjectId],  // Unique per attempt
  codeSolutions: {},
  mcqAnswers: {},
  // ... other fields unchanged
}
```

## Complete Workflow

### Scenario 1: Normal Lock (First Attempt Exit)
```
1. Student joins contest
   → attempt_number: 1, is_active_attempt: True, status: "IN_PROGRESS"

2. Student exits fullscreen
   → Frontend detects attempt_number === 1
   → Calls POST /contests/{id}/lock
   → Backend: status: "LOCKED", lock_timeout_at: now+1800s

3. Frontend shows lock screen with countdown
   → Timer counts down from 30:00 to 0:00
   → Auto-checks every 5 seconds for changes

4a. Admin restores within window
   → Calls POST /admin/contests/{id}/restore/{participant_id}
   → Backend creates NEW attempt (attempt_number: 2, attempt 1 marked as AUTO_TERMINATED)
   → Frontend detects retest available
   → Shows "Your Retest is Ready" modal
   → Student starts retest with fresh questions
   → If student exits fullscreen again → IMMEDIATE termination

4b. Window expires without admin action
   → get_contest_details() detects now > lock_timeout_at
   → Backend auto-terminates: status: "AUTO_TERMINATED"
   → Frontend transitions to terminated screen
   → Shows: "Lock resolution window expired without admin action"
```

### Scenario 2: Retest Termination (Retest Exit)
```
1. Admin restores locked attempt → NEW attempt created (attempt_number: 2)
2. Student starts retest (fullscreen required)
3. Student exits fullscreen during retest
   → Frontend detects attempt_number > 1
   → Calls POST /contests/{id}/terminate
   → Backend: status: "AUTO_TERMINATED" immediately
   → Frontend shows: "Attempt Terminated" screen
   → Reason: "Exited fullscreen during retest attempt"
```

## Error Handling & Validation

### Lock Endpoint
- ✅ Invalid contest ID → 400 Bad Request
- ✅ Non-existent contest → Returns valid empty response (no error)
- ✅ Multiple attempts for same user → Only updates is_active_attempt: True

### Get Contest Details
- ✅ Auto-expires LOCKED attempts after 30 minutes
- ✅ Handles missing lock_timeout_at (gracefully skips expiration check)
- ✅ Detects both is_locked AND is_terminated correctly
- ✅ Retest availability calculated from attempt_number

### Restore Endpoint
- ✅ Validates status == "LOCKED" → 400 with actual status message
- ✅ Checks lock_timeout_at <= now → 403 window expired
- ✅ Prevents duplicate retests → 409 Conflict
- ✅ Proper ObjectId handling for all IDs
- ✅ Excludes previous questions from new retest

### Terminate Endpoint
- ✅ Targets is_active_attempt: True only
- ✅ Handles both fullscreen exits and other violations
- ✅ Notifies student and admins

## Testing Checklist

- [ ] **Fullscreen Exit on Attempt #1**
  - Expected: LOCKED status, not TERMINATED
  - Check: lock_timeout_at is set to now + 1800s
  - Check: resolution_window_active: True
  
- [ ] **Lock Display in Frontend**
  - Expected: Timer shows 30:00 and counts down
  - Expected: Auto-checks every 5 seconds
  - Expected: Warning appears at <5 minutes

- [ ] **Lock Expiration**
  - Setup: Create lock, wait 30+ minutes (or manually set clock forward)
  - Expected: get_contest_details() auto-terminates attempt
  - Expected: Frontend transitions to terminated screen

- [ ] **Admin Restore Within Window**
  - Setup: Student locked, call restore within 30 minutes
  - Expected: New attempt created with attempt_number: 2
  - Expected: Old attempt marked AUTO_TERMINATED
  - Expected: Student sees "Your Retest is Ready"
  - Expected: New attempt has different questions

- [ ] **Admin Restore After Expiration**
  - Setup: Student locked, wait 30+ minutes, then try restore
  - Expected: 403 Forbidden: "window has expired"
  - Expected: Attempt auto-terminated

- [ ] **Retest Fullscreen Exit**
  - Setup: Start retest, exit fullscreen
  - Expected: IMMEDIATE termination (no lock window)
  - Expected: Message: "Exited fullscreen during retest attempt"

- [ ] **Question Randomization**
  - Setup: Check question IDs in attempt #1 and attempt #2
  - Expected: attempt #2 has completely different questions
  - Expected: No overlap with attempt #1 questions

- [ ] **Notification System**
  - Lock: Student + Admins notified
  - Restore: Student + Admins notified
  - Termination: Student + Admins notified

## Implementation Highlights

✅ **Preserved Progress**: All code, answers, and remaining time saved during lock
✅ **30-Minute Window**: Exact timeout calculation and auto-expiration
✅ **Fresh Questions**: Randomized selection excludes previous attempt's questions
✅ **Admin Control**: Full validation and error handling for restore operation
✅ **Real-Time Updates**: Frontend timer and 5-second status checks
✅ **Secure**: ObjectId validation, proper query targeting, anti-cheat logging
✅ **User Feedback**: Clear status messages, countdown timer, status transitions
✅ **Backward Compatible**: Existing terminated status still works for other violations

## Potential Future Enhancements

1. **Admin Dashboard Integration**: Show list of locked participants with remaining time
2. **Batch Restore**: Admin can restore multiple locked attempts at once
3. **Configurable Window**: Allow admin to set lock duration (currently hardcoded 30 min)
4. **Detailed History**: Show lock/restore timeline in participant details
5. **Automatic Rules**: Auto-restore based on status page or offline detection
6. **Appeal System**: Students can appeal locks (requires admin review)
7. **Historical Analysis**: Track patterns of locks to identify technical vs. dishonest issues
