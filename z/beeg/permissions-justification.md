# Beeg Video Downloader - Permissions Justification

This document provides a detailed justification for each permission requested in the Beeg Video Downloader extension manifest.

## Used Permissions

### 1. downloads
**Justification**: Required for downloading Beeg videos to the user's computer.
**Usage**:
- `background-enhanced.js:59` - Chrome downloads API call to cancel downloads
- `background-enhanced.js:285` - Chrome downloads API call to initiate file downloads
- `background-enhanced.js:395` - Event listener for download state changes and progress monitoring
- `popup.js:228` - Search for downloads by ID to get progress information

### 2. activeTab
**Justification**: Required to interact with the currently active tab for video detection and URL validation.
**Usage**:
- `popup.js:30-33` - Gets current active tab to check if it's a Beeg page
- `background-enhanced.js:80, 247` - Gets active tab for video download coordination
- Multiple `chrome.tabs.sendMessage` calls to communicate with content scripts on active tab

### 3. storage
**Justification**: Required to store user activation status and license information.
**Usage**:
- `auth.js` - `saveActivation` stores activation status (isActivated, licenseKey, email)
- `auth.js` - `checkActivationStatus` retrieves activation state on popup load

### 4. notifications
**Justification**: Required to show user notifications about download status and errors.
**Usage**:
- `background-enhanced.js:426` - Creates notifications using chrome.notifications.create()
- Used at lines 399-401, 406, 447-450, 454-457 for:
  - Download completion notifications
  - Download failure notifications
  - No video found notifications
  - Wrong site notifications

### 5. contextMenus
**Justification**: Required to add "Download Beeg Video" option to the browser's right-click context menu.
**Usage**:
- `background-enhanced.js:10-18` - Creates context menu item with chrome.contextMenus.create()
- `background-enhanced.js:22-30` - Handles context menu clicks with chrome.contextMenus.onClicked
- Context menu is scoped to Beeg.com pages only

### 6. tabs
**Justification**: Required for tab communication, management, and opening new tabs.
**Usage**:
- `popup.js:30, 288` - Tab queries and creating new tabs for history page
- `background-enhanced.js:24, 80, 86, 138, 247, 253, 442` - Tab queries and sending messages to content scripts

## Host Permissions

### Used Host Permissions
- `https://beeg.com/*` - Primary Beeg domain for content script injection and video extraction
- `https://www.beeg.com/*` - WWW variant of Beeg domain
- `https://store.externulls.com/*` - License verification service
- `https://video.beeg.com/*` - Beeg video content delivery domain

## Recommended to Delete (Unused Permissions)

### scripting
**Status**: UNUSED
**Location**: `manifest.json:13`
**Reason**: The extension declares the scripting permission but does not implement any chrome.scripting API calls. No programmatic script injection functionality exists in the codebase. The extension uses content scripts instead, which are declared in the manifest and don't require the scripting permission.
**Recommendation**: Remove this permission to follow the principle of least privilege.
