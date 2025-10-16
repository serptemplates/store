# XNXX Video Downloader - Permissions Justification

This document provides a detailed justification for each permission requested in the XNXX Video Downloader extension manifest.

## Used Permissions

### 1. downloads
**Justification**: Required for downloading XNXX videos to the user's computer.
**Usage**:
- `background-enhanced.js:60` - Chrome downloads API call to cancel downloads
- `background-enhanced.js:357` - Chrome downloads API call to initiate file downloads
- `background-enhanced.js:446, 455, 459` - Event listeners for download state changes and progress monitoring
- `popup.js:210` - Search for downloads by ID to get progress information

### 2. activeTab
**Justification**: Required to interact with the currently active tab for video detection and URL extraction.
**Usage**:
- Used implicitly through `chrome.tabs.query({active: true, currentWindow: true})` calls
- Enables access to the current tab's content without explicit API calls
- Required for content script communication on active tab

### 3. storage
**Justification**: Required to store user activation status and license information.
**Usage**:
- `auth.js` - `saveActivation` stores activation status (isActivated, licenseKey, email)
- `auth.js` - `checkActivationStatus` retrieves activation state on popup load

### 4. notifications
**Justification**: Required to show user notifications about download status and errors.
**Usage**:
- `background-enhanced.js:477` - Creates notifications using chrome.notifications.create()
- Used for download completion and error notifications

### 5. contextMenus
**Justification**: Required to add "Download XNXX Video" option to the browser's right-click context menu.
**Usage**:
- `background-enhanced.js:10` - Creates context menu item with chrome.contextMenus.create()
- `background-enhanced.js:23` - Handles context menu clicks with chrome.contextMenus.onClicked
- Context menu is scoped to XNXX domains only

### 6. tabs
**Justification**: Required for tab communication, management, and opening new tabs.
**Usage**:
- `popup.js:30, 44, 265` - Tab queries, content script communication, creating new tabs
- `background-enhanced.js:25, 319, 325, 493` - Tab messaging and content script communication

## Host Permissions

### Used Host Permissions
- Host permissions would be declared in the manifest.json file for XNXX domains

## Recommended to Delete (Unused Permissions)

### scripting
**Status**: UNUSED (if declared)
**Reason**: No chrome.scripting API calls were found in the codebase. The extension uses statically declared content scripts in the manifest instead of dynamic script injection.
**Recommendation**: Remove this permission if declared to follow the principle of least privilege.
