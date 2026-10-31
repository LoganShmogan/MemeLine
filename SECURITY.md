# Security Policy

MemeLine is maintained by **Save Point Limited**.

## Reporting a problem

If you find a security issue in MemeLine (the site, the apps or this repository), please email **[support@savepoint.co.nz](mailto:support@savepoint.co.nz)** with the subject line "Security: MemeLine". **Do not** open a public GitHub issue for it.

Please include what you found, how to reproduce it, what an attacker could do with it, and your contact details if you'd like us to follow up. We will acknowledge your report within 2 working days and keep you updated until it is fixed.

## Secrets

Nothing secret belongs in this repository:

- Firebase and other app settings go in `app/.env.local` (git-ignored). Firebase web config values are public by design; access is controlled by Firebase security rules and App Check, not by hiding them.
- Firebase service-account keys, Expo/EAS tokens and signing keystores must never be committed. `.gitignore` excludes `.env*`, `*.key`, `*.pem`, `*.jks` and `*service-account*.json`.
- The legacy Pi app's `data/` folder (database, downloaded media, TikTok cookies) is git-ignored.

## If a secret leaks

| Secret | What to do |
|---|---|
| Firebase service-account key | Google Cloud console → IAM → Service accounts → delete the key and create a new one |
| Expo / EAS access token | expo.dev → Account settings → Access tokens: revoke it |
| TikTok cookies used by the downloader | Sign out of TikTok in that browser to invalidate the session |
