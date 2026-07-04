# VBT Sports Camp — iOS Deployment Guide

> **Last updated:** July 4, 2026
> **Bundle ID:** `com.mitrixo.vbtsportscamp`
> **Team ID:** `5NBF6H2RRL`
> **Apple ID:** `michaelmitry13@gmail.com`

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Bump the Version](#3-bump-the-version)
4. [Build & Deploy via Ionic Appflow](#4-build--deploy-via-ionic-appflow)
5. [Submit to App Store](#5-submit-to-app-store)
6. [Troubleshooting](#6-troubleshooting)
7. [Key Files Reference](#7-key-files-reference)
8. [Certificate & Signing (If Expired)](#8-certificate--signing-if-expired)

---

## 1. Prerequisites

These are **already set up** and should not need to change unless certificates expire.

| Item | Location / Value |
|------|-----------------|
| Apple Developer Account | https://developer.apple.com (michaelmitry13@gmail.com) |
| App Store Connect | https://appstoreconnect.apple.com |
| Ionic Appflow Dashboard | https://dashboard.ionicframework.com |
| Firebase Console | https://console.firebase.google.com (project: `crm-production`) |
| GitHub Repo | https://github.com/michaelmagdy15/VBTCAMP2026 |
| Distribution Certificate (.p12) | `ios/signing/ios_distribution.p12` (password: `123456`) |
| Provisioning Profile | Uploaded to Appflow as **"VBT App Store"** signing profile |
| GoogleService-Info.plist | `ios/App/App/GoogleService-Info.plist` (registered in Xcode project) |
| App-specific password | `uaqz-iluo-urwb-weyr` (for Appflow → App Store Connect delivery) |

---

## 2. Pre-Deployment Checklist

Before every new release, verify these items:

- [ ] **Web app builds locally** — Run `npm run build` and confirm no errors
- [ ] **`GoogleService-Info.plist`** exists at `ios/App/App/GoogleService-Info.plist`
- [ ] **`Info.plist`** exists at `ios/App/App/Info.plist`
- [ ] **Bundle ID** matches everywhere:
  - `capacitor.config.json` → `"appId": "com.mitrixo.vbtsportscamp"`
  - `ios/App/App.xcodeproj/project.pbxproj` → `PRODUCT_BUNDLE_IDENTIFIER = com.mitrixo.vbtsportscamp`
- [ ] **Version is bumped** (see Section 3)
- [ ] **All changes are committed and pushed** to `main` branch on GitHub

---

## 3. Bump the Version

Apple requires a **unique version + build number** for every upload. You must increment at least one of them.

### Files to update:

#### A. `package.json` (root)
```json
"version": "1.3.0"
```

#### B. `ios/App/App.xcodeproj/project.pbxproj`
Search for `MARKETING_VERSION` (appears **twice** — once for Debug, once for Release):
```
MARKETING_VERSION = 1.3;
```

Search for `CURRENT_PROJECT_VERSION` (appears **twice**) and increment the build number:
```
CURRENT_PROJECT_VERSION = 2;
```

> **Tip:** `MARKETING_VERSION` is what users see (e.g., "1.3"). `CURRENT_PROJECT_VERSION` is the build number (e.g., "2"). If you keep the same marketing version, you MUST increment the build number.

---

## 4. Build & Deploy via Ionic Appflow

### Step 1: Push code to GitHub
```bash
git add -A
git commit -m "chore: bump version to X.Y for release"
git push origin main
```

### Step 2: Trigger a build in Appflow
1. Go to **[Ionic Appflow Dashboard](https://dashboard.ionicframework.com)**
2. Select your **VBTCAMP2026** app
3. Click **"New Build"**
4. Select:
   - **Commit:** The latest one you just pushed
   - **Platform:** iOS
   - **Build Type:** App Store
   - **Signing Profile:** VBT App Store
   - **Destination:** vbt_portal *(auto-deploys to App Store Connect when build finishes)*
5. Click **Build**

### Step 3: Wait for completion
- Build takes ~5-8 minutes
- If the destination is selected, the binary will auto-upload to App Store Connect
- You'll see a **green checkmark** when done

### Step 4: Wait for Apple processing
- After Appflow shows success, Apple takes **5-15 minutes** to process the binary
- You'll receive an email from Apple when processing completes
- The build will appear in **TestFlight** with status "Ready to Test"

---

## 5. Submit to App Store

Once the build appears in App Store Connect:

### A. Link the build
1. Go to **App Store Connect** → Your App → **Distribution** tab
2. Click on the version under "iOS App" (left sidebar)
3. Scroll to the **Build** section
4. Click **"+"** and select the new build
5. Click **Done**

### B. Fill in required fields
- **App Description** and **Promotional Text**
- **Screenshots** (if not already uploaded)
- **Keywords**

### C. App Review Information
- Check **"Sign-in required"**
- Provide test credentials:
  - **Username:** `michael mitry` (or the email if login requires email)
  - **Password:** `vbt2026`
- Add reviewer notes explaining what the app does

### D. Export Compliance
- Select **"None of the algorithms mentioned above"** (the app only uses standard HTTPS)
- To skip this popup forever, add this to `ios/App/App/Info.plist`:
  ```xml
  <key>ITSAppUsesNonExemptEncryption</key>
  <false/>
  ```

### E. Submit for Review
1. Click **Save**
2. Click **Add for Review** → **Submit to App Review**
3. Apple review typically takes **24-48 hours**

---

## 6. Troubleshooting

### Build fails with "Failed to connect to github.com"
**Cause:** Temporary network issue on Appflow's build servers.
**Fix:** Just retry the build. This is not a code issue.

### App crashes on launch — `[FIRApp configure]` crash
**Cause:** `GoogleService-Info.plist` is missing from the iOS app bundle.
**Fix:** Ensure:
1. The file exists at `ios/App/App/GoogleService-Info.plist`
2. It is registered in `project.pbxproj` (in PBXBuildFile, PBXFileReference, PBXGroup children, and PBXResourcesBuildPhase)
3. The PBXFileReference path is just `GoogleService-Info.plist` (NOT `App/GoogleService-Info.plist`)
4. The `.gitignore` has the exception `!ios/App/App/GoogleService-Info.plist`

### Build fails with "Build input file cannot be found"
**Cause:** The file path in `project.pbxproj` is wrong.
**Fix:** Check the PBXFileReference for the file. The `path` should be relative to the PBXGroup it belongs to, NOT include the group's own path. For files inside the `App` group, use just the filename.

### "MARKETING_VERSION" or build number conflict
**Cause:** Apple rejects duplicate version+build combinations.
**Fix:** Increment `CURRENT_PROJECT_VERSION` in both Debug and Release configurations in `project.pbxproj`.

### Certificate expired
**See Section 8** for how to regenerate certificates and provisioning profiles.

---

## 7. Key Files Reference

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Capacitor config — source of truth for bundle ID and app name |
| `ios/App/App.xcodeproj/project.pbxproj` | Xcode project — version numbers, signing, file references |
| `ios/App/App/Info.plist` | iOS app metadata (uses variables from pbxproj) |
| `ios/App/App/GoogleService-Info.plist` | Firebase config for iOS (required for FCM push notifications) |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | App icon (1024x1024 PNG) |
| `.gitignore` | Must have exceptions for `Info.plist` and `GoogleService-Info.plist` |
| `package.json` | npm version (keep in sync with iOS marketing version) |

---

## 8. Certificate & Signing (If Expired)

Distribution certificates are valid for **1 year**. If yours expires, follow these steps:

### Step 1: Generate a new CSR on Windows
```bash
# Using Git's OpenSSL
"C:\Program Files\Git\usr\bin\openssl.exe" genrsa -out ios/signing/private_key.key 2048
"C:\Program Files\Git\usr\bin\openssl.exe" req -new -key ios/signing/private_key.key -out ios/signing/certificate.csr -subj "/emailAddress=michaelmitry13@gmail.com/CN=Michael Mitry/C=EG"
```

### Step 2: Create certificate on Apple Developer Portal
1. Go to https://developer.apple.com → Certificates
2. Click **"+"** → Select **"iOS Distribution (App Store and Ad Hoc)"**
3. Upload the `certificate.csr` file
4. Download the resulting `.cer` file

### Step 3: Convert to .p12
```bash
"C:\Program Files\Git\usr\bin\openssl.exe" x509 -in ios_distribution.cer -inform DER -out ios/signing/certificate.pem -outform PEM
"C:\Program Files\Git\usr\bin\openssl.exe" pkcs12 -export -out ios/signing/ios_distribution.p12 -inkey ios/signing/private_key.key -in ios/signing/certificate.pem -password pass:123456
```

### Step 4: Update provisioning profile
1. Go to Apple Developer Portal → Profiles
2. Edit the **"com.mitrixo.vbtsportscamp AppStore"** profile
3. Select the new certificate
4. Download the updated `.mobileprovision` file

### Step 5: Upload to Appflow
1. Go to Ionic Appflow → Build → Signing Certificates
2. Edit the **"VBT App Store"** profile
3. Upload the new `.p12` and `.mobileprovision` files
4. Password: `123456`

---

## Quick Deploy Cheat Sheet

```bash
# 1. Make your code changes, then:

# 2. Bump version in package.json and project.pbxproj
#    (edit MARKETING_VERSION and/or CURRENT_PROJECT_VERSION)

# 3. Commit and push
git add -A
git commit -m "release: v1.X - description of changes"
git push origin main

# 4. Go to Ionic Appflow → New Build
#    Platform: iOS | Type: App Store | Profile: VBT App Store | Destination: vbt_portal

# 5. Wait for green checkmark (~8 min build + ~10 min Apple processing)

# 6. Go to App Store Connect → Link build → Submit for Review
```

---

*This guide was created based on the full deployment setup completed on July 3-4, 2026.*
