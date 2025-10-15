# XVideos Video Downloader - Permissions Justification

This document provides a detailed justification for each permission requested in the XVideos Video Downloader extension manifest.

## Used Permissions

### 1. downloads
**Justification**: Required for downloading XVideos content to the user's computer.
**Usage**:
- `background-enhanced.js:63` - Chrome downloads API call to cancel downloads
- `background-enhanced.js:390` - Chrome downloads API call to initiate file downloads
- `background-enhanced.js:479, 488, 492` - Event listeners for download state changes and progress monitoring
- `popup.js:226` - Search for downloads by ID to get progress information

### 2. activeTab
**Justification**: Required to interact with the currently active tab for video detection and URL extraction.
**Usage**:
- Used implicitly through `chrome.tabs.query({active: true, currentWindow: true})` calls
- `popup.js:30` - Gets current active tab
- `background-enhanced.js:352` - Gets active tab for video operations

### 3. storage
**Justification**: Required to store user activation status and license information.
**Usage**:
- `auth.js` - `saveActivation` stores activation status (isActivated, licenseKey, email)
- `auth.js` - `checkActivationStatus` retrieves activation state on popup load

### 4. notifications
**Justification**: Required to show user notifications about download status and errors.
**Usage**:
- `background-enhanced.js:510` - Creates notifications using chrome.notifications.create()
- Used for download completion and error notifications

### 5. contextMenus
**Justification**: Required to add "Download XVideos Video" option to the browser's right-click context menu.
**Usage**:
- `background-enhanced.js:10` - Creates context menu item with chrome.contextMenus.create()
- `background-enhanced.js:26` - Handles context menu clicks with chrome.contextMenus.onClicked
- Context menu is scoped to XVideos domains only

### 6. tabs
**Justification**: Required for tab communication, management, and opening new tabs.
**Usage**:
- `popup.js:30, 44, 281` - Tab queries, content script communication, creating new tabs
- `background-enhanced.js:28, 352, 358, 526` - Tab messaging and content script communication

## Host Permissions

### Used Host Permissions
- Host permissions would be declared in the manifest.json file for XVideos domains

## Recommended to Delete (Unused Permissions)

### scripting
**Status**: UNUSED
**Reason**: No chrome.scripting API calls were found in the codebase. The extension uses statically declared content scripts in the manifest instead of dynamic script injection.
**Recommendation**: Remove this permission to follow the principle of least privilege.
