# IdeaEditor documentation site

This directory contains the [Docusaurus](https://docusaurus.io/) site published to GitHub Pages.

From the **repository root**:

```bash
cd website && npm ci    # first time
npm run docs:dev        # or: cd website && npm start
```

Production build:

```bash
npm run docs:build
```

Deployment runs via [`.github/workflows/deploy-docs.yml`](../.github/workflows/deploy-docs.yml) on push to `master` or `main`. Enable **Settings → Pages → GitHub Actions** on the GitHub repository.
