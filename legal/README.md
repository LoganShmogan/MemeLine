# Memeline legal documents

- [privacy-policy.md](privacy-policy.md)
- [terms-of-use.md](terms-of-use.md)
- [community-guidelines.md](community-guidelines.md)

These are the source text for the public pages the app links to (see
`app/src/constants/legal.ts`). Both app stores need a public privacy policy
URL, and Apple requires apps with user-generated content to have terms
that ban objectionable content, a way to report posts and block users,
and prompt action on reports.

**They are drafts written without legal review.** Before launch:

1. Have a New Zealand lawyer review them. That matters most for the
   liability cap in the Terms and for overseas users' privacy rights
   (GDPR, CCPA).
2. Fill in every `[TODO: ...]`: effective date, registered address,
   contact email, Firestore region.
3. Confirm Save Point can commit to reviewing reports within 24 hours
   (Community Guidelines).
4. Publish them at the URLs in `app/src/constants/legal.ts`, or change
   those URLs.
5. Keep the documents in step with the app. For example, the privacy
   policy says account deletion happens in the app, so that has to be
   built along with discussions.
