# Eporner Video Downloader - Permissions Justification

This document provides a detailed justification for each permission requested in the Eporner Video Downloader extension manifest.

## Used Permissions

### 1. downloads
**Justification**: Required for downloading Eporner videos to the user's computer.
**Usage**:
- `background-enhanced.js:59` - Chrome downloads API call to cancel downloads
- `background-enhanced.js:285` - Chrome downloads API call to initiate file downloads
- `background-enhanced.js:395, 404, 408` - Event listeners for download state changes and progress monitoring
- `popup.js:228` - Search for downloads by ID to get progress information

### 2. activeTab
**Justification**: Required to interact with the currently active tab for video detection and URL extraction.
**Usage**:
- `popup.js:30-33` - Gets current active tab to check if it's an Eporner page
- `background-enhanced.js:80, 247` - Gets active tab for API requests and video downloads
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
- Used at lines 399-402, 406, 447-450, 454-457 for:
  - Download completion notifications
  - Download failure notifications
  - No video found notifications
  - Wrong site notifications

### 5. contextMenus
**Justification**: Required to add "Download Eporner Video" option to the browser's right-click context menu.
**Usage**:
- `background-enhanced.js:10` - Creates context menu item with chrome.contextMenus.create()
- `background-enhanced.js:22` - Handles context menu clicks with chrome.contextMenus.onClicked
- Context menu is scoped to Eporner.com pages only

### 6. tabs
**Justification**: Required for tab communication, management, and opening history page.
**Usage**:
- `popup.js:30, 44, 288` - Tab queries, sending messages to content scripts, creating new tabs
- `background-enhanced.js:24, 80, 86, 138, 247, 253, 442` - Tab queries and content script communication

## Host Permissions

### Used Host Permissions
- `https://eporner.com/*` - Primary Eporner domain for content script injection and video extraction
- `https://www.eporner.com/*` - WWW variant of Eporner domain (duplicated on lines 17 and 19)
- `https://store.externulls.com/*` - License verification service

## Recommended to Delete (Unused Permissions)

### scripting
**Status**: UNUSED
**Location**: `manifest.json:13`
**Reason**: The extension declares the scripting permission but does not implement any chrome.scripting API calls. The extension uses DOM manipulation to inject scripts (`inject.js`) through content scripts instead of using the chrome.scripting API for programmatic script injection.
**Recommendation**: Remove this permission to follow the principle of least privilege.

## Note on Host Permissions

The host permission `https://www.eporner.com/*` is declared twice (lines 17 and 19 in manifest.json). One of these duplicate entries should be removed for cleaner configuration.
