# Termination and Retest Logic Implementation

## Overview
This document describes the comprehensive termination and retest system implemented for the College Coding Platform's strict contest mode.

## Key Features Implemented

### 1. **Attempt Tracking** 
- Each contest participation now includes:
  - `attempt_number`: Tracks original (1) and retest attempts (2, 3, etc.)
  - `is_active_attempt`: Boolean flag marking the current active attempt
  - `original_attempt_id`: Reference to the original terminated attempt (for retests)

### 2. **Fullscreen Exit Handling**
- **First Attempt**: Student exits fullscreen → Attempt is **LOCKED** (not terminated)
  - Progress, code, answers, and remaining time are **preserved**
  - Student must wait for admin to restore/activate retest
  
- **Retest Attempt**: Student exits fullscreen → Attempt is **TERMINATED** 
  - No further retest opportunities for this question set
  - Attempt is marked `AUTO_TERMINATED` permanently

### 3. **Terminated Attempt Preservation**
When a student's attempt is terminated:
- ✅ Attempt record remains in database with `auto_terminated: True`
- ✅ All progress, answers, code snapshots are preserved
- ✅ Stored in `contest_participants` collection for admin/history purposes
- ✅ Accessible to admins via leaderboard and analytics

### 4. **Retest Activation Flow**

#### Admin Action: Restore / Activate Retest
1. Admin clicks "Restore / Activate Retest" on locked student record
2. Backend creates **NEW participant record** with:
   - `attempt_number: 2` (or higher)
   - `is_active_attempt: True`
   - `status: IN_PROGRESS`
   - Fresh `assigned_mcq_ids` for new questions

#### Question Selection Logic
- **Exclude previous questions**: Questions from the terminated attempt are excluded
- **Random selection**: New questions randomly selected from remaining pool
- **Example**: 40-question pool, student had 20 in first attempt → Select 20 from remaining 20
- **Shuffle**: New question set is shuffled for randomized order
- **Persistence**: All selection logic handled by backend/database (NOT localStorage)

#### Frontend State Transition
1. Student is notified retest is available
2. Student must **enter fullscreen** before starting retest
3. Fresh arena session begins with:
   - New question set
   - Reset progress counters (score, problems_solved, mcqs_correct = 0)
   - Reset answers and code
   - New timer (full duration)
   - New current_question pointer

### 5. **Backend Implementation**

#### Modified Files

**`server/routes/contests.py`**
- Updated `get_or_assign_student_mcqs()`:
  - Added `attempt_number` parameter for tracking
  - Added `exclude_previous_ids` parameter for retest
  - Selects only unused questions for retests
  
- Updated `get_contest_details()`:
  - Now fetches active attempt first
  - Checks for available retest attempts
  - Returns `is_retest_available` and `retest_info` in response
  
- Updated `join_contest()`:
  - Added `attempt_number` and `is_active_attempt` to participant records

**`server/routes/admin.py`**
- Updated `restore_contest_access()`:
  - Marks original attempt as terminated
  - Creates new retest attempt with fresh questions
  - Excludes previously assigned questions
  - Notifies student of retest activation

#### Database Schema Changes
```python
contest_participants collection:
{
  "attempt_number": 1,              # Original = 1, Retests = 2, 3, etc.
  "is_active_attempt": true,        # Current active attempt
  "original_attempt_id": "ObjectId", # Reference to terminated attempt (for retests)
  "assigned_mcq_ids": [...],        # Questions for THIS attempt only
  "status": "IN_PROGRESS",          # "IN_PROGRESS" | "LOCKED" | "AUTO_TERMINATED" | "SUBMITTED"
  "auto_terminated": false,          # True if terminated
  "terminated_at": DateTime,         # When attempt was terminated
  "termination_reason": "...",       # Why attempt was terminated
  "locked_at": DateTime,            # When attempt was locked (fullscreen exit)
  "lock_reason": "...",             # Why attempt was locked
  "locked_remaining_seconds": 300   # Time remaining when locked
}

contest_assigned_questions collection:
{
  "contest_id": "ObjectId",
  "user_id": "ObjectId",
  "student_id": "...",
  "question_ids": [...],            # MCQ IDs assigned for this attempt
  "attempt_number": 1,              # 1 for original, 2+ for retests
  "assigned_at": DateTime
}
```

### 6. **Frontend Implementation**

#### Modified Files

**`client/src/pages/student/ContestArena.jsx`**

1. **New State**: `retestInfo` to store retest details
2. **New Mode**: `'retest_available'` to show retest activation UI
3. **New Handler**: `handleStartRetest()` 
   - Requests fullscreen
   - Fetches latest contest with retest details
   - Initializes fresh arena state
   - Resets all progress counters

4. **Updated Fullscreen Exit Handler**:
   ```javascript
   // First attempt: Lock (allow restore)
   if (isFirstAttempt) {
     triggerLock('Exited fullscreen contest mode')
   }
   
   // Retest attempt: Terminate (no restore)
   if (isRetestAttempt) {
     triggerTermination('EXIT_FULLSCREEN_RETEST', 'Exited fullscreen during retest')
   }
   ```

5. **Updated `fetchContestDetails()`**:
   - Checks `is_retest_available` flag
   - Automatically transitions to 'retest_available' mode if retest ready
   - Stores `retest_info` for retest button

6. **New UI Screen**: Retest Available
   - Shows retest activation message
   - Displays attempt number (#2, #3, etc.)
   - Emphasizes fullscreen requirement
   - Start/Cancel buttons

### 7. **Admin Interface**

#### Participant Management
- Admin dashboard shows participant status:
  - `LOCKED` - Awaiting admin action
  - `AUTO_TERMINATED` - Terminated attempt (preserved for history)
  - `IN_PROGRESS` - Active attempt
  - `SUBMITTED` - Completed

#### Restore/Retest Action
- For locked participants, admin has button: "Restore / Activate Retest"
- Clicking creates new retest with fresh questions
- Student is notified and can start retest

#### Leaderboard & Reports
- All attempts (original + retests) are tracked separately
- Admins can view:
  - Terminated attempts and reasons
  - Retest attempts and their results
  - Student history across all attempts
  - Anti-cheat logs for each attempt

### 8. **API Endpoints**

#### GET `/contests/<contest_id>`
Returns contest details with retest availability:
```json
{
  "contest": {
    "is_locked": false,
    "is_retest_available": true,
    "retest_info": {
      "participant_id": "ObjectId",
      "attempt_number": 2,
      "status": "IN_PROGRESS"
    }
  }
}
```

#### POST `/contests/<contest_id>/restore/<participant_id>`
Admin action to activate retest. Creates new participant with:
- Fresh `attempt_number` (incremented)
- New `assigned_mcq_ids` (excluding previous)
- `is_active_attempt: True`
- `status: IN_PROGRESS`

#### POST `/contests/<contest_id>/lock`
Student action when exiting fullscreen (first attempt only).
Updates participant status to `LOCKED`.

#### POST `/contests/<contest_id>/terminate`
Student action for rule violations or fullscreen exit on retest.
Updates participant with `auto_terminated: True`.

### 9. **Security & Data Integrity**

✅ **Backend-Driven**: All question selection handled by server/database
✅ **No localStorage**: Question sets NOT stored in browser
✅ **Immutable Records**: Terminated attempts cannot be modified
✅ **Audit Trail**: All events logged in `anti_cheat_logs`
✅ **Persistent State**: No state loss on page reload
✅ **Single Active Attempt**: Only one `is_active_attempt: True` per student per contest

### 10. **Workflow Example**

```
SCENARIO: Student exits fullscreen during contest

Step 1: Student pressed Alt+Tab → Fullscreen exits
  └─ Frontend detects fullscreen change
  └─ Calls triggerLock() → POST /contests/{id}/lock
  └─ Participant status changes to LOCKED
  └─ Student sees locked screen: "Awaiting admin..."

Step 2: Admin clicks "Activate Retest" button
  └─ POST /contests/{id}/restore/{participant_id}
  └─ Backend marks original as AUTO_TERMINATED
  └─ Backend creates new participant record
  └─ New attempt gets 20 fresh questions (excluding first 20)
  └─ Student notified: "Retest activated"

Step 3: Student enters fullscreen and clicks "Start Retest"
  └─ handleStartRetest() called
  └─ Fetches latest contest details
  └─ Initializes fresh arena with new questions
  └─ Mode switches to 'arena'
  └─ Timer starts (full duration)

Step 4: Student works on retest
  └─ Different questions than before
  └─ Fresh score counter
  └─ If fullscreen exits → Attempt TERMINATED (no more restores)

Step 5: Student submits or times out
  └─ Retest results recorded
  └─ Admin can compare both attempts
```

### 11. **Testing Checklist**

- [ ] **Fullscreen Exit (First Attempt)**
  - Exit fullscreen → Attempt locks
  - Check `contest_participants.status == "LOCKED"`
  - Verify remaining time preserved
  - Student sees locked screen

- [ ] **Admin Retest Activation**
  - Admin clicks restore → New participant created
  - Check `attempt_number` incremented
  - Verify new `assigned_mcq_ids` generated
  - Original attempt marked `auto_terminated: True`

- [ ] **Retest Question Selection**
  - Verify new questions ≠ old questions
  - Check all new questions from remaining pool
  - Confirm shuffle applied
  - Test with small pool (edge cases)

- [ ] **Retest Fullscreen Exit**
  - Exit fullscreen on retest → Terminated (not locked)
  - Check `auto_terminated: True`
  - Verify no "Check Status" option shown

- [ ] **Retest Submission**
  - Submit retest → Results recorded separately
  - Admin can view both attempts
  - Leaderboard shows appropriate attempt

- [ ] **Database Integrity**
  - Verify no data loss on failures
  - Check indexes on `attempt_number`
  - Test with many retests (3+)
  - Verify audit trail complete

### 12. **Performance Considerations**

- **Index Creation**: Added index on `contest_participants.is_active_attempt`
- **Question Selection**: Random.sample() uses optimal algorithm
- **Database Query**: Only fetches active attempt (single query)
- **Pagination**: Unchanged, works with multiple attempts per student

### 13. **Future Enhancements**

- Allow multiple retest activations per contest (if needed)
- Weighted question difficulty for retests
- Time bonus for retests
- Admin dashboard showing retest statistics
- Student analytics comparing all attempts

---

**Implementation Date**: August 2026  
**Status**: ✅ Complete and Ready for Testing
