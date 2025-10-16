# TNAFlix Downloader - Permissions Justification

This document provides a detailed justification for each permission requested in the TNAFlix Downloader extension manifest.

## Used Permissions

### 1. downloads
**Justification**: Required for downloading TNAFlix videos to the user's computer.
**Usage**:
- `background-enhanced.js` - Chrome downloads API call to initiate file download
- Download progress monitoring and state change handling

### 2. activeTab
**Justification**: Required to interact with the currently active TNAFlix tab for video detection.
**Usage**:
- `popup.js` - Gets current active tab to check if it's a TNAFlix page
- Tab querying for content script communication

### 3. storage
**Justification**: Required to store user activation status, license information, and extension preferences.
**Usage**:
- `auth.js` - Stores/retrieves license activation data
- `popup.js` - Checks and sets activation status
- Extension settings and configuration storage

### 4. notifications
**Justification**: Required to show user notifications about download status and completion.
**Usage**:
- Download completion notifications
- Error notifications for failed downloads
- Status updates for user feedback

### 5. contextMenus
**Justification**: Required to add context menu options for downloading videos.
**Usage**:
- Right-click context menu on TNAFlix video pages
- Quick download options from context menu

### 6. tabs
**Justification**: Required for tab communication and management.
**Usage**:
- `popup.js` - Sends messages to content scripts in tabs
- Tab queries for getting active tabs
- Opening help documentation in new tabs

### 7. scripting
**Justification**: Required to dynamically inject content scripts when needed.
**Usage**:
- `popup.js` - Fallback mechanism to inject content script
- Dynamic script injection for video extraction

## Host Permissions

### Used Host Permissions
- `https://tnaflix.com/*` - Primary TNAFlix domain for content script injection
- `https://www.tnaflix.com/*` - WWW subdomain of TNAFlix
- `https://store.externulls.com/*` - License verification and authentication service

## Summary

This TNAFlix downloader extension utilizes all declared permissions for legitimate video downloading functionality:
- **downloads**: For downloading TNAFlix videos with progress tracking
- **activeTab**: For accessing current TNAFlix video pages
- **storage**: For authentication, license management, and user preferences
- **notifications**: For user feedback on download status
- **contextMenus**: For convenient right-click download options
- **tabs**: For tab management and content script communication
- **scripting**: For dynamic content script injection when needed

All permissions are necessary for this extension's TNAFlix video downloading capabilities and user experience features.