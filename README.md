# Plagx Cite Reference Check

*A free academic writing tool by Plagiarism Checker X.*

**Plagx Cite Reference Check is a free GitHub Action that checks your citations and reference lists on every push or pull request.** It reads the BibTeX or CSL-JSON file behind a thesis, paper, book or documentation, finds duplicate references, broken DOIs and missing details, and adds a correctly formatted APA 7 or MLA 9 reference list to the job summary.

- Finds **duplicate references** (same DOI, or same title and first author)
- Finds **invalid DOIs**, and optionally **DOIs that can't be found** online
- Warns about references with **no title, author or year**
- Shows problems as **annotations on the exact line** of your `.bib` file
- Adds the **formatted reference list, bibliography or works cited in APA 7 or MLA 9** to the job summary

Works with BibTeX/BibLaTeX (`.bib`) and CSL-JSON (`.json`, as exported by Zotero). Powered by [Plagx Cite](https://github.com/plagiarismcheckerx/plagx-cite).

**[Try the live demo →](https://plagiarismcheckerx.github.io/plagx-cite/)**

Developer downloads: [GitHub Marketplace](https://github.com/marketplace/actions/plagx-cite-reference-check) · [npm](https://www.npmjs.com/package/plagx-cite) · [Docker Hub](https://hub.docker.com/r/plagiarismcheckerx/plagx-cite) · [GitLab](https://gitlab.com/plagiarism-checker-x/plagx-cite) · [GitHub](https://github.com/plagiarismcheckerx/plagx-cite)

Need a quick citation online? Use the [free citation generator](https://plagiarismcheckerx.com/citation-generator?utm_source=plagx-cite-action).

> Plagx Cite is a free academic writing utility by Plagiarism Checker X. It is a citation generator and reference checker for APA and MLA reference lists. Plagiarism checking and AI-generated text detection are available in Plagiarism Checker X, linked at the end of this page.

## Usage

Create `.github/workflows/references.yml` in your repository:

```yaml
name: Check references
on: [push, pull_request]

jobs:
  references:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: plagiarismcheckerx/plagx-cite-action@v1
        with:
          files: '**/*.bib'
```

### All options

```yaml
      - uses: plagiarismcheckerx/plagx-cite-action@v1
        with:
          files: |
            thesis/references.bib
            data/library.json
          style: mla          # apa (default) or mla
          check-dois: true    # look up every DOI online (default: false)
          fail-on: warning    # error (default), warning or never
          summary: true       # add results to the job summary (default: true)
```

| Input | Default | Description |
|---|---|---|
| `files` | required | Reference files, separated by spaces or new lines. Wildcards such as `**/*.bib` work. |
| `style` | `apa` | Style of the formatted list in the job summary: `apa` or `mla`. |
| `check-dois` | `false` | Look up every DOI with Crossref / doi.org and report DOIs that can't be found. |
| `fail-on` | `error` | `error`: fail on duplicates and bad DOIs. `warning`: also on missing title, author or year. `never`: report only. |
| `summary` | `true` | Add the issues and the formatted reference list to the job summary. |

| Output | Description |
|---|---|
| `references` | Number of references checked |
| `errors` | Number of errors found |
| `warnings` | Number of warnings found |

## What a run shows

- Annotations such as `smith2020b: Possible duplicate (title match) of smith2020`, on the line where the entry starts
- A job summary with a table of problems and a collapsible, formatted reference list for each file

## Good to know

- Titles are used exactly as written. APA uses sentence case and MLA uses title case, so check capitalisation yourself.
- `check-dois` makes one request per DOI to free public services. No API key is needed.

## Development

The action runs the Plagx Cite library from `lib/` with no install step. To update it from a local copy of [plagx-cite](https://github.com/plagiarismcheckerx/plagx-cite):

```bash
npm run sync   # copies ../plagx-cite/src into lib/
npm test
```

<h2>Plagx Cite Reference Check - Free Citation & Reference Checker</h2>

<p>
 An open-source GitHub Action for students, researchers and developers.
 Check references, find duplicate citations and format bibliographies automatically.
 </p>

<p>
 Developed by Plagiarism Checker X.
 </p>

<p>
 Plagx Cite helps with source attribution; it does not detect plagiarism
 or AI-generated text. For full document checks, explore
 <a href="https://plagiarismcheckerx.com/?utm_source=plagx-cite-action">Plagiarism Checker X</a>
 and its
 <a href="https://plagiarismcheckerx.com/ai-content-detector?utm_source=plagx-cite-action">AI Content Detector</a>.
 </p>

## License

MIT © Plagiarism Checker X
