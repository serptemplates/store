# XHamster Video Downloader - Permissions Justification

This document provides a detailed justification for each permission requested in the XHamster Video Downloader extension manifest.

## Used Permissions

### 1. downloads
**Justification**: Required for downloading XHamster videos to the user's computer.
**Usage**:
- `background-enhanced.js:69` - Chrome downloads API call to cancel downloads
- `background-enhanced.js:375` - Chrome downloads API call to initiate file downloads
- `background-enhanced.js:464, 473, 477` - Event listeners for download state changes and progress monitoring
- `popup.js:210` - Search for downloads by ID to get progress information

### 2. activeTab
**Justification**: Required to interact with the currently active tab for video detection and URL extraction.
**Usage**:
- `popup.js:30-33` - Gets current active tab to check if it's an XHamster page
- `background-enhanced.js:337` - Gets active tab for video download operations
- Used implicitly through `chrome.tabs.query({active: true, currentWindow: true})` calls

### 3. storage
**Justification**: Required to store user activation status and license information.
**Usage**:
- `auth.js` - `saveActivation` stores activation status (isActivated, licenseKey, email)
- `auth.js` - `checkActivationStatus` retrieves activation state on popup load

### 4. notifications
**Justification**: Required to show user notifications about download status and errors.
**Usage**:
- `background-enhanced.js:495` - Creates notifications using chrome.notifications.create()
- Used for download status notifications and user feedback

### 5. contextMenus
**Justification**: Required to add "Download XHamster Video" option to the browser's right-click context menu.
**Usage**:
- `background-enhanced.js:10` - Creates context menu item with chrome.contextMenus.create()
- `background-enhanced.js:32` - Handles context menu clicks with chrome.contextMenus.onClicked
- Context menu is scoped to XHamster domains only

### 6. tabs
**Justification**: Required for tab communication and management.
**Usage**:
- `popup.js:44, 265` - Sending messages to content scripts, creating new tabs
- `background-enhanced.js:34, 343, 511` - Tab messaging and content script communication

## Host Permissions

### Used Host Permissions
- `https://xhamster.com/*` - Primary XHamster domain
- `https://*.xhamster.com/*` - XHamster subdomains
- `https://xhamster.one/*`, `https://*.xhamster.one/*` - Alternative XHamster domains
- `https://xhamster.desi/*`, `https://*.xhamster.desi/*` - Regional XHamster domains
- `https://xhms.pro/*`, `https://*.xhms.pro/*` - XHamster mirror domains
- `https://xhamster2.com/*`, `https://xhamster11.com/*`, `https://xhamster20.com/*`, `https://xhamster26.com/*` - Numbered XHamster mirrors
- `https://xhamster20.desi/*` - Regional numbered domain
- `https://xhday.com/*`, `https://*.xhday.com/*` - XHamster day domains
- `https://xhvid.com/*`, `https://*.xhvid.com/*` - XHamster video domains
- `https://*.xhcdn.com/*` - XHamster CDN for content delivery

## Recommended to Delete (Unused Permissions)

### scripting
**Status**: UNUSED
**Location**: `manifest.json:13`
**Reason**: The extension declares the scripting permission but does not implement any chrome.scripting API calls. The extension uses statically declared content scripts in the manifest instead of dynamic script injection.
**Recommendation**: Remove this permission to follow the principle of least privilege.
