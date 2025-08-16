# Group Audio Call Feature Change Manual

## Purpose
Add robust group audio calling to the existing audio call system, ensuring correct UI, logic, and socket event handling for both caller and callee, and maintaining compatibility with single calls.

---

## Planned/Actual Changes

### Frontend
- **audio-call-dialog2.component.ts / .html**
  - Show caller name and group name in popup for group calls (incoming/outgoing).
  - Remove "calling" label after answering.
  - Ensure proper cleanup (close dialog, stop microphone) after decline for both caller and callee.
  - Use group name from conversation data for group calls.
- **chat.component.ts**
  - Ensure incoming call notification passes group name for group calls.
- **chat-content.component.ts**
  - Ensure outgoing call triggers group call logic and passes group name.
- **socket.service.ts**
  - No major changes, but ensure all group call events are handled.

### Backend
- **webSocket.js**
  - On `call_notification` for group calls, include group name and emit to all group members except caller.
  - Ensure `end_audio_call` and related events clean up for all group members.
- **userCon.js**
  - Ensure call records for group calls are created/updated with group info.

### Testing
- Test single and group calls for both caller and callee.
- Test UI for incoming and outgoing calls.
- Test cleanup after decline.

---

## Dependencies
- All changes must be compatible with both single and group calls.
- The same audio call dialog component is used for both caller and callee.

---

## Notes
- Review this file before/after each change to ensure all dependencies are respected and no bugs are introduced.

---

## Backend Change Plan (2024-xx-xx)

### webSocket.js
- On `call_notification` for group calls, include `groupName` in the payload.
- Extract group name from the conversation (DB or in-memory) and add as `groupName`.
- Ensure only group members (except the caller) receive the notification.
- On `start_call`, store group name in the call record for group calls.
- Pass group name through the event chain so it's available for notifications and frontend dialogs.
- On `end_audio_call`, `audio_call_accepted`, `audio_call_denied`, ensure cleanup and notification for all group members, not just caller/callee.
- Always include `groupName` and `conv_participant` in all relevant call events for group calls.

### userCon.js
- When creating a call record for a group, store the group name in the call data.
- If not present in the request, fetch group name from the conversation model.

### Model Changes (if needed)
- Add a `groupName` field to the call schema/model if not present.

### Testing
- Incoming and outgoing group calls: group name appears in all notifications and dialogs.
- Decline/End: all group members are notified and UI is cleaned up.
- Single call flow remains unaffected.

### Integration Points
- Frontend expects `groupName` in all call-related events for group calls.
- All socket events must be compatible with both single and group calls.
- No breaking changes for single call logic.

---
