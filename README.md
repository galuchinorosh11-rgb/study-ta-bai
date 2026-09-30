# Study ta BAI — Upload. Review. Test.

AI-powered study app: upload notes (PDF/DOCX/TXT) or paste them, load to AI,
then pick a study style — Multiple choice, True/False, Mixed test, Review mode,
Enumeration, Identification, Flashcards, Speed round, or the Soul Knight pixel
dungeon crawler. Dark mode included. Gemini runs through a same-origin PHP proxy
so the API key never reaches the browser.

## Run locally (XAMPP)

1. Copy this folder to `C:\xampp\htdocs\study`
2. Start Apache in the XAMPP Control Panel
3. Copy `config.example.php` to `config.php` and paste your Gemini key
   (get one at https://aistudio.google.com/apikey)
4. Open `http://localhost/study/`

## Deploy to a PHP host

> GitHub Pages **cannot** run this app (it serves static files only, and
> `api.php` needs PHP). Push the code to GitHub for safekeeping, then host it
> on any PHP host (cPanel shared hosting, InfinityFree, 000webhost, a VPS…).

1. Upload everything **except** `config.php`
2. On the server, copy `config.example.php` to `config.php` and paste the key
3. Needs PHP 7.4+ with `curl` and `mbstring` (standard on virtually all hosts)

## Notes

- Test files are AI-generated; quota errors (429) mean the free Gemini tier
  needs ~1 minute to refill — the app retries once automatically.
- `?v=N` query strings on assets are cache-busters; bump them when editing
  CSS/JS so browsers fetch the new files.
