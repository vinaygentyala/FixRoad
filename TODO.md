# FixMyRoad implementation outcomes

- [ ] Reporter can choose **Open Camera** or upload JPG, JPEG, PNG, or WebP; camera permission is requested only on click, live preview and **Capture Photo** are available, retake/confirm and preview work, streams stop on capture/cancel/unmount, unsupported cameras and denied permissions show a helpful error, and invalid type/size uploads are rejected.
- [ ] Camera-captured and uploaded images use the same AI analysis and report-submission workflow, with loading, success, and failure states.
- [ ] AI assesses visible pothole evidence and returns structured pothole confirmation, High/Medium/Low or uncertain review state, explanation, and manual-review flag without random or fixed priority behavior.
- [ ] Image priority is primary; location-specific weather is fetched from the reporter-entered location, stored with source and assessment time, and can influence the recommendation only through transparent configured rules; unavailable weather never blocks submission or gets claimed as verified.
- [ ] Reports preserve only the reporter’s submitted photo, exact location text, landmark, description, ticket ID, and system timestamp, while AI and weather are separate metadata; reporter and officer views share persisted data.
- [ ] Officer dashboard has no High Priority Season banner, alert, card, or duplicate seasonal notification; operational report management, status changes, assignment, and role permissions remain.
- [ ] Officer report details show the original photo/location/description plus clearly labeled AI and weather context, and authorized officers can correct priority with a recorded reason.
- [ ] Reporter and officer role-specific navigation remains unique and complete; status and officer updates persist and appear in reporter history.
- [ ] Build, typecheck, and targeted behavior checks pass; remaining camera/AI/weather configuration and persistence limitations are documented.
