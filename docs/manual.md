# Group Audio Call Implementation Manual (Optimized)

## 1. Current State: Group Audio Call Feature

### Backend (`backend/Controller/webSocket.js` and dependencies)
- **Call Initiation:**
  - `start_audio_call` event: Notifies all group members except the initiator.
  - Uses `call_notification` to alert group members.
  - Call record is created in DB (see `userCon.js` and `models/call.js`).
- **Call Signaling:**
  - Uses socket.io rooms for signaling (`join-room`, `offer`, `answer`, `ice-candidate`).
- **Call End/Leave:**
  - `end_audio_call` event: Notifies others when a user leaves.
  - `user-left` event: Used when a user disconnects.
- **Call Denial:**
  - `audio_call_denied` event: Notifies initiator if a user denies, but not all participants.
- **No explicit logic for removing a user from a group call.**

### Frontend (`audio-call-dialog2.component.ts` and dependencies)
- **Popup for incoming call:**
  - Shows accept/reject for each group member.
- **Participant List:**
  - UI shows participants, but not always live-updated.
- **Mute Feature:**
  - Users can mute/unmute themselves.
- **No UI for removing a user from the call.**
- **No clear notification to all when a user rejects or leaves.**

---

## 1. Optimized Step-by-Step Plan

### Step 1: Ensure All Group Members Receive Call Notification
- **Backend:**
  - Confirm `start_audio_call` emits `call_notification` to all group members except initiator.
  - Use a single DB query to fetch all socket IDs for group members.
  - Avoid redundant DB calls inside loops.
  - **Files:** `backend/Controller/webSocket.js`, `backend/Controller/userCon.js`, `backend/models/call.js`
- **Frontend:**
  - Ensure the popup is shown to all notified users.
  - Use a single event handler for incoming group call notifications.
  - **Files:** `frontend/src/app/pages/chat/audio-call-dialog2/audio-call-dialog2.component.ts`, `frontend/src/app/services/socket.service.ts`

---

### Step 2: Notify All When a User Rejects the Call
- **Backend:**
  - Update `audio_call_denied` to emit to all active participants (not just initiator).
  - Use a single DB query to get all socket IDs for participants.
  - Mark the user as "denied" in the call record (add a `denied` array if not present).
  - **Files:** `backend/Controller/webSocket.js`, `backend/models/call.js`
- **Frontend:**
  - Remove the rejecting user from the participant list in the UI for all.
  - Show a notification: "User X declined the call."
  - Use a single function to update the UI for all participants.
  - **Files:** `frontend/src/app/pages/chat/audio-call-dialog2/audio-call-dialog2.component.ts`, `.html`, `frontend/src/app/services/socket.service.ts`

---

### Step 3: Notify All When a User Ends/Leaves the Call
- **Backend:**
  - On `end_audio_call`, emit a `user-left` event to all remaining participants.
  - Mark the user as "left" in the call record (add a `left` array if not present).
  - Use efficient DB updates (e.g., `$addToSet`).
  - **Files:** `backend/Controller/webSocket.js`, `backend/models/call.js`
- **Frontend:**
  - Remove the user from the participant list in the UI for all.
  - If the initiator ends, emit a single event to end the call for all.
  - Use a single handler for user leave events.
  - **Files:** `frontend/src/app/pages/chat/audio-call-dialog2/audio-call-dialog2.component.ts`, `.html`, `frontend/src/app/services/socket.service.ts`

---

### Step 4: Live Participant List with Mute Feature
- **Backend:**
  - Maintain a live list of active participants in memory (or cache).
  - Emit the updated list on join/leave/mute.
  - **File:** `backend/Controller/webSocket.js`
- **Frontend:**
  - Display the live participant list.
  - Add a mute/unmute button for each user (self-mute only).
  - When a user mutes/unmutes, update their status in the UI and optionally notify others.
  - **Files:** `frontend/src/app/pages/chat/audio-call-dialog2/audio-call-dialog2.component.ts`, `.html`

---

### Step 5: Remove Specific User from Call
- **Backend:**
  - Add a `remove_user_from_call` event.
  - On trigger, update the call record, emit a removal event to the removed user and all others.
  - Use efficient DB updates and avoid redundant queries.
  - **Files:** `backend/Controller/webSocket.js`, `backend/models/call.js`
- **Frontend:**
  - Show a "Remove" button for initiator/admin.
  - On removal, close call UI for removed user, update list for others.
  - Use a single handler for removal events.
  - **Files:** `frontend/src/app/pages/chat/audio-call-dialog2/audio-call-dialog2.component.ts`, `.html`, `frontend/src/app/services/socket.service.ts`

---

## 2. General Optimization Tips
- **Backend:**
  - Minimize DB queries by fetching all needed data in one go.
  - Use socket.io rooms for efficient broadcasting.
  - Use `$addToSet` and `$pull` for array updates in MongoDB.
- **Frontend:**
  - Use Angular's change detection efficiently (e.g., `ChangeDetectorRef.detectChanges()` only when needed).
  - Centralize socket event handling in the service.
  - Use Angular's OnPush strategy for performance if possible.

---

## 3. Summary Table

| Step | Backend Files | Frontend Files | Optimization Focus |
|------|--------------|---------------|-------------------|
| 1. Call Notification | webSocket.js, userCon.js, call.js | audio-call-dialog2.component.ts, socket.service.ts | Batch DB queries, efficient emit |
| 2. User Rejects | webSocket.js, call.js | audio-call-dialog2.component.ts, .html, socket.service.ts | Batch updates, single UI handler |
| 3. User Ends/Leaves | webSocket.js, call.js | audio-call-dialog2.component.ts, .html, socket.service.ts | Live updates, efficient emit |
| 4. Participant List/Mute | webSocket.js | audio-call-dialog2.component.ts, .html | Live list, minimal UI updates |
| 5. Remove User | webSocket.js, call.js | audio-call-dialog2.component.ts, .html, socket.service.ts | Efficient removal, single handler |

---

**Refer to:**
- `backend/Controller/webSocket.js` for socket logic
- `frontend/src/app/pages/chat/audio-call-dialog2/audio-call-dialog2.component.ts` for call UI logic
- `frontend/src/app/services/socket.service.ts` for socket communication 

---

## Group Audio Call: Improved End/Leave Logic (2024-xx-xx)

### Problem
Previously, when any user clicked "End Call" in a group audio call, the call ended for all participants. This was not the desired behavior.

### Solution
- When a user clicks "End Call," only that user leaves the call. The call continues for the remaining participants.
- Only when the last participant leaves (or optionally, if the host/initiator clicks a special "End Call for All" button), the call ends for everyone.

### Backend Changes
- On `user-left-group-call`, remove the user from the participant list for the call.
- If the list is not empty after removal, do not emit any global end event.
- If the list is empty (last user left), emit `end_group_call` to the room and mark the call as ended in the DB.
- (Optional) If the initiator emits `force_end_group_call`, emit `end_group_call` to all, clear the participant list, and mark the call as ended.

### Frontend Changes
- When a user clicks "End Call":
  - Emit `user-left-group-call` with `call_id` and `user_id`.
  - Locally clean up streams and close the dialog only for that user.
- Listen for `end_group_call`:
  - If received, all clients clean up and close the dialog (for the last user or if the host force-ends).
- Listen for `user_joined_call` with an empty list:
  - If received, close the dialog (already discussed).

### Summary Table
| Action                | Frontend Emits                | Backend Handles                | Backend Emits         | Frontend Handles         |
|-----------------------|-------------------------------|-------------------------------|----------------------|-------------------------|
| User leaves call      | user-left-group-call          | handleUserLeft                | user_joined_call     | update participant list |
| Last user leaves      | user-left-group-call          | handleUserLeft (list empty)   | end_group_call       | handleDisconnect        |
| Host ends for all (*) | force_end_group_call          | (custom logic)                | end_group_call       | handleDisconnect        |

(*) Optional feature 