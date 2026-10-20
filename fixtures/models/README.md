`expected-mappings.json` is the golden answer for the offline extractor on each sample PDF:
which template it should pick and which parameter values (in canonical units) it must find, on which page.
`tests/unit/extraction.test.ts` runs the real PDF.js text extraction on each PDF and checks against this file.
