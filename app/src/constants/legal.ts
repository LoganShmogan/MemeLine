/**
 * Public pages for the documents in legal/ at the repo root. The stores
 * need the privacy policy at a public URL, so these are hosted rather than
 * bundled. They must be published at these addresses before release.
 */
export const LegalUrls = {
  privacy: 'https://savepoint.cc/memeline/privacy',
  terms: 'https://savepoint.cc/memeline/terms',
  guidelines: 'https://savepoint.cc/memeline/community-guidelines',
} as const;

export const Company = {
  name: 'Save Point Limited',
  site: 'https://savepoint.cc',
} as const;
