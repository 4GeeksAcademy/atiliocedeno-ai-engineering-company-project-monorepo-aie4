# HealthCore public HTML website

These are the retained static copies of the public bilingual HealthCore pages, kept as a comparison/evaluation source and for compatibility. The current public routes are implemented by the existing components in `uis/talent-pipeline-tracker/`; this static copy is independent, has no backend or patient-data persistence, and remains runnable without replacing the Next.js app.

## Pages and local server

From the repository root:

```bash
npm run serve:website
```

Open <http://localhost:4173/> to review the retained static version. The Node.js server maps `/`, `/en`, `/care-request`, and `/en/care-request` to the Spanish/English landing and care-request pages. Historical `.html` page names and the local `style.css` and `validation.js` assets are also served. It only serves an explicit allowlist from this directory; it does not replace the Next.js public routes or deployment configuration. Set `PORT` to override the default port; `HOST` can select a different bind address.

The pages use Tailwind's browser CDN, so their utility styling requires network access. Form validation and clinic selection remain in the existing vanilla JavaScript; this static site does not submit to or persist data in the HealthCore API.

## Existing files

- `index.html`, `index.en.html` — Spanish and English landing pages.
- `aplication.html`, `aplication.en.html` — Spanish and English care-request forms.
- `style.css`, `validation.js` — shared styles and existing form behavior.

Business content follows the protected repository context. Do not add internal operational data or protected patient information to this public site.
