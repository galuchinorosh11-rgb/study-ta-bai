<?php
// Study ta BAI — AI proxy. Browser talks same-origin to this file;
// the Gemini key never leaves the server. Force-AI: no offline fallback here.
header('Content-Type: application/json; charset=utf-8');

define('GEMINI_MODELS', ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest']);

function fail($msg) { echo json_encode(['ok' => false, 'error' => $msg]); exit; }
function done($data) { $data['ok'] = true; echo json_encode($data); exit; }

// API key lives in config.php (NOT committed to git — see config.example.php).
// On first run the file below is created from the bundled key automatically.
if (!file_exists(__DIR__ . '/config.php')) {
    @copy(__DIR__ . '/config.example.php', __DIR__ . '/config.php');
}
if (file_exists(__DIR__ . '/config.php')) require_once __DIR__ . '/config.php';
if (!defined('GEMINI_KEY') || GEMINI_KEY === 'PUT-YOUR-GEMINI-KEY-HERE' || GEMINI_KEY === '') {
    fail('Server is missing its Gemini API key — copy config.example.php to config.php and add the key');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST only');
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) fail('Bad JSON body');
$action = $in['action'] ?? '';

/* ---------- helpers ---------- */
function sample_doc($text, $max) {
    $text = trim(preg_replace('/\s+/u', ' ', (string)$text));
    if (mb_strlen($text) <= $max) return $text;
    $parts = 5; $chunk = (int)($max / $parts); $out = [];
    $len = mb_strlen($text);
    for ($i = 0; $i < $parts; $i++) {
        $start = (int)($i * ($len - $chunk) / ($parts - 1));
        $c = mb_substr($text, $start, $chunk);
        if ($i > 0) $c = preg_replace('/^[^\.]+\.\s/u', '', $c);
        $out[] = $c;
    }
    return implode("\n…\n", $out);
}

function gemini_text($prompt, $budget, $temp, &$usedModel) {
    $lastErr = 'AI unreachable';
    $tried = 0;
    foreach (GEMINI_MODELS as $m) {
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $tried++;
            $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . $m . ':generateContent');
            $payload = json_encode([
                'contents' => [['parts' => [['text' => $prompt]]]],
                'generationConfig' => [
                    'temperature' => $temp,
                    'maxOutputTokens' => $budget,
                    'responseMimeType' => 'application/json'
                ]
            ]);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . GEMINI_KEY],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_CONNECTTIMEOUT => 10,
            ]);
            $resp = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $errno = curl_errno($ch);
            curl_close($ch);
            if ($errno) { $lastErr = "Gemini $m timed out"; break; } // hung route: jump to next model
            if ($code === 503 || $code === 429) {
                $lastErr = "busy ($code)";
                // Exponential backoff: 3s, 6s, 9s... don't hammer quota.
                // After last try we exit loop and report a friendly message below.
                usleep(min(3000000 * $tried, 9000000));
                continue;
            }
            if ($code === 404) { $lastErr = "Gemini $m busy ($code)"; break; }
            if ($code === 401 || $code === 403) fail('Gemini key rejected (' . $code . ') — check the API key');
            if ($code !== 200) {
                $msg = '';
                $ej = json_decode((string)$resp, true);
                if (is_array($ej) && isset($ej['error']['message'])) $msg = ': ' . mb_substr($ej['error']['message'], 0, 160);
                fail('Gemini ' . $code . $msg);
            }
            $j = json_decode((string)$resp, true);
            $t = '';
            if (isset($j['candidates'][0]['content']['parts']) && is_array($j['candidates'][0]['content']['parts'])) {
                foreach ($j['candidates'][0]['content']['parts'] as $p) $t .= $p['text'] ?? '';
            }
            if ($t === '') {
                $reason = $j['candidates'][0]['finishReason'] ?? 'NO_CANDIDATES';
                $block = isset($j['promptFeedback']['blockReason']) ? ' ' . $j['promptFeedback']['blockReason'] : '';
                fail('AI returned nothing (' . $reason . $block . ')');
            }
            $usedModel = $m;
            return $t;
        }
    }
    if (strpos($lastErr, 'busy (429)') !== false || strpos($lastErr, 'busy (503)') !== false)
        fail('AI is rate-limited right now — free quota refills in ~1 min. Wait a bit, then press Start again.');
    fail($lastErr);
}

function looks_broken($s) {
    if (mb_strpos($s, '�') !== false) return true;
    $s = (string)$s;
    preg_match_all('/[a-zA-Z]{3,} [a-zA-Z](?=\s|$)/', $s, $m1);
    $adj = 0;
    foreach ($m1[0] as $m) { if (!preg_match('/^[aAdDI0-9]$/', mb_substr($m, -1))) $adj++; }
    preg_match_all('/(?:^|\s)[a-zA-Z] [a-zA-Z]{3,}/', $s, $m2);
    foreach ($m2[0] as $m) { $c = trim($m)[0] ?? ''; if (!preg_match('/^[aAdDI0-9]$/', $c)) $adj++; }
    $singles = 0;
    foreach (preg_split('/\s+/', $s) as $t) {
        $c = preg_replace('/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/', '', $t);
        if (mb_strlen($c) === 1 && !preg_match('/^[aAdDI0-9]$/', $c)) $singles++;
    }
    return $singles >= 3 || $adj >= 2;
}

function validate_exam($arr) {
    $out = [];
    if (!is_array($arr)) return $out;
    foreach ($arr as $q) {
        if (!is_array($q) || empty($q['question'])) continue;
        $kind = $q['kind'] ?? 'mcq';
        if (!in_array($kind, ['mcq', 'tf', 'enum', 'ident', 'flash'], true)) $kind = 'mcq';
        $question = trim((string)$q['question']);
        if ($question === '' || looks_broken($question)) continue;
        if ($kind === 'enum') {
            $answers = [];
            if (isset($q['answers']) && is_array($q['answers'])) {
                foreach ($q['answers'] as $o) {
                    $o = trim((string)$o);
                    if ($o !== '' && !looks_broken($o)) $answers[] = mb_substr($o, 0, 120);
                    if (count($answers) >= 6) break;
                }
            }
            if (count($answers) < 2) continue;
            $out[] = ['kind' => 'enum', 'question' => $question, 'answers' => array_values($answers),
                'answer' => implode('; ', $answers),
                'explanation' => isset($q['explanation']) && $q['explanation'] !== '' ? (string)$q['explanation'] : 'AI-generated from your notes.'];
            continue;
        }
        if ($kind === 'ident') {
            if (empty($q['answer'])) continue;
            $answer = trim((string)$q['answer']);
            if ($answer === '' || looks_broken($answer)) continue;
            $alts = [];
            if (isset($q['alternates']) && is_array($q['alternates'])) {
                foreach ($q['alternates'] as $o) {
                    $o = trim((string)$o);
                    if ($o !== '' && mb_strtolower($o) !== mb_strtolower($answer)) $alts[] = mb_substr($o, 0, 120);
                    if (count($alts) >= 4) break;
                }
            }
            $out[] = ['kind' => 'ident', 'question' => $question, 'answer' => mb_substr($answer, 0, 120),
                'alternates' => array_values($alts),
                'explanation' => isset($q['explanation']) && $q['explanation'] !== '' ? (string)$q['explanation'] : 'AI-generated from your notes.'];
            continue;
        }
        if ($kind === 'flash') {
            if (empty($q['answer'])) continue;
            $answer = trim((string)$q['answer']);
            if ($answer === '' || looks_broken($answer)) continue;
            $out[] = ['kind' => 'flash', 'question' => mb_substr($question, 0, 200), 'answer' => mb_substr($answer, 0, 300),
                'explanation' => isset($q['explanation']) ? (string)$q['explanation'] : ''];
            continue;
        }
        if (empty($q['answer'])) continue;
        $answer = trim((string)$q['answer']);
        if ($answer === '' || looks_broken($answer)) continue;
        if ($kind === 'tf') { $options = ['True', 'False']; }
        else {
            $options = [];
            if (isset($q['options']) && is_array($q['options'])) {
                foreach ($q['options'] as $o) { $o = trim((string)$o); if ($o !== '') $options[] = $o; }
            }
            $has = false;
            foreach ($options as $o) if (mb_strtolower($o) === mb_strtolower($answer)) { $has = true; break; }
            if (!$has) $options[] = $answer;
            $seen = []; $uniq = [];
            foreach ($options as $o) { $k = mb_strtolower($o); if (!isset($seen[$k])) { $seen[$k] = 1; $uniq[] = $o; } }
            $options = array_values(array_filter($uniq, function ($o) { return !looks_broken($o); }));
            if (count($options) < 3) continue;
            shuffle($options);
            $options = array_slice($options, 0, 4);
            $has = false;
            foreach ($options as $o) if (mb_strtolower($o) === mb_strtolower($answer)) { $has = true; break; }
            if (!$has) $options[0] = $answer;
        }
        $out[] = [
            'kind' => $kind,
            'question' => $question,
            'options' => array_values($options),
            'answer' => $answer,
            'source' => isset($q['source']) ? (string)$q['source'] : '',
            'explanation' => isset($q['explanation']) && $q['explanation'] !== '' ? (string)$q['explanation'] : 'AI-generated from your notes.'
        ];
    }
    return $out;
}

function validate_review($d) {
    if (!is_array($d)) fail('AI returned non-JSON');
    $lessons = [];
    if (isset($d['lessons']) && is_array($d['lessons'])) {
        foreach (array_slice($d['lessons'], 0, 8) as $l) {
            if (!is_array($l) || (empty($l['title']) && empty($l['simple']))) continue;
            $pts = [];
            if (isset($l['points']) && is_array($l['points'])) {
                foreach ($l['points'] as $p) {
                    $p = mb_substr(trim((string)$p), 0, 220);
                    if ($p !== '' && !looks_broken($p)) $pts[] = $p;
                    if (count($pts) >= 5) break;
                }
            }
            $les = [
                'title' => mb_substr(trim((string)($l['title'] ?? 'Key lesson')), 0, 120),
                'simple' => mb_substr(trim((string)($l['simple'] ?? '')), 0, 600),
                'points' => $pts,
                'why' => mb_substr(trim((string)($l['why'] ?? '')), 0, 220)
            ];
            if (!looks_broken($les['title'])) $lessons[] = $les;
        }
    }
    $terms = [];
    if (isset($d['terms']) && is_array($d['terms'])) {
        foreach (array_slice($d['terms'], 0, 14) as $x) {
            if (!is_array($x) || empty($x['term']) || empty($x['meaning'])) continue;
            $t = ['term' => mb_substr(trim((string)$x['term']), 0, 60),
                  'meaning' => mb_substr(trim((string)$x['meaning']), 0, 140)];
            if (!looks_broken($t['term'])) $terms[] = $t;
        }
    }
    $tips = [];
    if (isset($d['tips']) && is_array($d['tips'])) {
        foreach ($d['tips'] as $s) {
            $s = mb_substr(trim((string)$s), 0, 220);
            if ($s !== '') $tips[] = $s;
            if (count($tips) >= 6) break;
        }
    }
    if (!count($lessons)) fail('AI returned an empty guide');
    return ['title' => mb_substr(trim((string)($d['title'] ?? 'Study Guide')), 0, 120),
            'lessons' => $lessons, 'terms' => $terms, 'tips' => $tips];
}

/* ---------- actions ---------- */
if ($action === 'prepare') {
    // FAST pre-analysis: validates quota early, extracts outline, lets the
    // choose-screen open instantly afterwards. Small budget = 3-6s response.
    $notes = sample_doc($in['notes'] ?? '', 6000);
    if (mb_strlen(trim($notes)) < 200) fail('Too little text — add a few paragraphs');
    $prompt = "Skim the STUDY NOTES and return a tiny outline.\n"
        . 'Return STRICT JSON ONLY, no markdown: {"title":"short title (max 8 words)","bullets":["key point 1","key point 2","key point 3","key point 4","key point 5"],"terms":["term 1","term 2","term 3","term 4","term 5","term 6"]}' . "\n\nSTUDY NOTES:\n" . $notes;
    $used = '';
    $text = gemini_text($prompt, 900, 0.3, $used);
    $a = strpos($text, '{'); $b = strrpos($text, '}');
    if ($a === false || $b === false || $b <= $a) fail('AI returned non-JSON');
    $p = json_decode(substr($text, $a, $b - $a + 1), true);
    if (!is_array($p)) fail('AI returned non-JSON');
    $bullets = [];
    if (isset($p['bullets']) && is_array($p['bullets'])) {
        foreach ($p['bullets'] as $s) {
            $s = mb_substr(trim((string)$s), 0, 160);
            if ($s !== '') $bullets[] = $s;
            if (count($bullets) >= 5) break;
        }
    }
    $terms = [];
    if (isset($p['terms']) && is_array($p['terms'])) {
        foreach ($p['terms'] as $s) {
            $s = mb_substr(trim((string)$s), 0, 60);
            if ($s !== '') $terms[] = $s;
            if (count($terms) >= 8) break;
        }
    }
    $words = str_word_count(trim(preg_replace('/\s+/u', ' ', (string)($in['notes'] ?? ''))));
    done(['prep' => [
        'title' => mb_substr(trim((string)($p['title'] ?? 'Your material')), 0, 80),
        'bullets' => $bullets, 'terms' => $terms,
    ], 'chars' => mb_strlen($in['notes'] ?? ''), 'words' => $words, 'model' => $used]);
}

if ($action === 'exam') {
    $kind = $in['kind'] ?? 'mixed';
    if (!in_array($kind, ['mcq', 'tf', 'mixed', 'enum', 'ident', 'flash'], true)) $kind = 'mixed';
    $n = max(1, min(25, (int)($in['n'] ?? 10)));
    $diff = $in['difficulty'] ?? 'easy';
    if (!in_array($diff, ['easy', 'medium', 'hard'], true)) $diff = 'easy';
    $notes = sample_doc($in['notes'] ?? '', 12000);
    if (mb_strlen(trim($notes)) < 200) fail('Too little text — add a few paragraphs');
    if ($kind === 'flash') $n = max(8, min(14, $n));
    $need = min($n + ($kind === 'mixed' ? 2 : 4), 28);
    if ($kind === 'enum') {
        $prompt = 'You are a strict but fair exam writer. From the STUDY NOTES below, write EXACTLY ' . $need . ' ENUMERATION questions at ' . $diff . " level. Each question asks the student to LIST a complete set of items (2-5 items: parts, types, steps, causes, examples).\n"
            . "- Every question must be fully understandable ON ITS OWN, without seeing the notes.\n"
            . "- Use only facts stated in the notes. Each explanation is 1-2 sentences AND quotes the supporting idea.\n"
            . 'Return STRICT JSON ONLY, no markdown: [{"kind":"enum","question":"Enumerate the ...","answers":["item 1","item 2","item 3"],"explanation":"..."}]' . "\n\nSTUDY NOTES (sampled from start, middle and end of the full document):\n" . $notes;
        $budget = min(1200 + $need * 150, 5000);
    } elseif ($kind === 'ident') {
        $prompt = 'You are a strict but fair exam writer. From the STUDY NOTES below, write EXACTLY ' . $need . ' IDENTIFICATION questions at ' . $diff . ' level. Each gives clues/a description and the student answers with the exact term, person, place, or value.' . "\n"
            . "- Every question must be fully understandable ON ITS OWN, without seeing the notes.\n"
            . "- Answers are short (1-4 words). Include 1-2 accepted alternate spellings/wordings in alternates when natural.\n"
            . "- Use only facts stated in the notes. Each explanation is 1-2 sentences AND quotes the supporting idea.\n"
            . 'Return STRICT JSON ONLY, no markdown: [{"kind":"ident","question":"What pigment captures light in leaves?","answer":"Chlorophyll","alternates":[],"explanation":"..."}]' . "\n\nSTUDY NOTES (sampled from start, middle and end of the full document):\n" . $notes;
        $budget = min(1200 + $need * 150, 5000);
    } elseif ($kind === 'flash') {
        $prompt = 'From the STUDY NOTES below, make ' . $n . ' FLASHCARDS covering the whole notes from start to end. Front = short prompt/term (max 12 words), back = the answer in one short sentence.' . "\n"
            . "- Use only facts stated in the notes.\n"
            . 'Return STRICT JSON ONLY, no markdown: [{"kind":"flash","question":"front text","answer":"back text"}]' . "\n\nSTUDY NOTES:\n" . $notes;
        $budget = min(800 + $n * 80, 2000);
    } else {
    $typeDesc = $kind === 'mcq' ? 'multiple choice with 4 options each'
        : ($kind === 'tf' ? 'true/false' : 'mixed multiple choice (about half) and true/false (about half)');
    $prompt = 'You are a strict but fair exam writer. From the STUDY NOTES below, write EXACTLY ' . $need . ' ' . $typeDesc . ' questions at ' . $diff . ' level. Count carefully — return all ' . $need . ".\n"
        . "Quality rules:\n"
        . "- Every question must be fully understandable ON ITS OWN, without seeing the notes.\n"
        . "- Test real understanding, not trivia: definitions, causes, processes, numbers with meaning.\n"
        . '- MCQ: exactly 4 options, all the same kind (all terms, all numbers, all phrases). Wrong options must be plausible but clearly wrong to someone who studied. Never use "all of the above" or joke options.' . "\n"
        . "- True/False: a single clear factual statement, answerable from the notes, not a trick of wording.\n"
        . "- Each explanation is 1-2 sentences AND quotes the supporting idea from the notes.\n"
        . "- Use only facts stated in the notes.\n"
        . 'Return STRICT JSON ONLY, no markdown, no commentary: [{"kind":"mcq","question":"...","options":["...","...","...","..."],"answer":"...","explanation":"..."},{"kind":"tf","question":"...","options":["True","False"],"answer":"True","explanation":"..."}]' . "\n\nSTUDY NOTES (sampled from start, middle and end of the full document):\n" . $notes;
    $budget = min(1200 + $need * 150, 5000);
    }
    $used = '';
    $text = gemini_text($prompt, $budget, 0.4, $used);
    $a = strpos($text, '['); $b = strrpos($text, ']');
    if ($a === false || $b === false || $b <= $a) fail('AI returned non-JSON');
    $qs = validate_exam(json_decode(substr($text, $a, $b - $a + 1), true));
    if ($kind === 'mixed') {
        $qs = array_values(array_filter($qs, function ($q) { return $q['kind'] === 'mcq' || $q['kind'] === 'tf'; }));
    } else {
        $qs = array_values(array_filter($qs, function ($q) use ($kind) { return $q['kind'] === $kind; }));
    }
    if (!count($qs)) fail('AI returned no usable questions');
    $qs = array_slice($qs, 0, $n);
    done(['questions' => $qs, 'short' => max(0, $n - count($qs)), 'model' => $used]);
}

if ($action === 'hooks') {
    $items = $in['items'] ?? [];
    if (!is_array($items) || !count($items)) fail('Nothing to review');
    $items = array_slice($items, 0, 12);
    $lines = [];
    foreach ($items as $i => $it) {
        if (!is_array($it)) continue;
        $q = mb_substr(trim((string)($it['question'] ?? '')), 0, 300);
        $a = mb_substr(trim((string)($it['answer'] ?? '')), 0, 160);
        if ($q === '' || $a === '') continue;
        $lines[] = ((int)$i + 1) . '. Q: ' . $q . ' | Correct answer: ' . $a;
    }
    if (!count($lines)) fail('Nothing to review');
    $n = count($lines);
    $prompt = 'For each numbered item below, write ONE short memory hook (max 18 words) that helps a student remember the correct answer next time. One plain sentence each, no numbering in the output.' . "\n"
        . 'Return STRICT JSON ONLY, no markdown: exactly ' . $n . ' strings like ["hook 1","hook 2",...]' . "\n\n" . implode("\n", $lines);
    $used = '';
    $text = gemini_text($prompt, min(400 + $n * 80, 1500), 0.5, $used);
    $a = strpos($text, '['); $b = strrpos($text, ']');
    if ($a === false || $b === false || $b <= $a) fail('AI returned non-JSON');
    $arr = json_decode(substr($text, $a, $b - $a + 1), true);
    if (!is_array($arr)) fail('AI returned non-JSON');
    $out = [];
    foreach ($arr as $s) {
        $s = mb_substr(trim((string)$s), 0, 180);
        if ($s !== '') $out[] = $s;
        if (count($out) >= $n) break;
    }
    if (!count($out)) fail('AI returned nothing usable');
    done(['hooks' => $out, 'model' => $used]);
}

if ($action === 'review') {
    $notes = sample_doc($in['notes'] ?? '', 12000);
    if (mb_strlen(trim($notes)) < 200) fail('Too little text for a guide — add a few paragraphs');
    $prompt = "You are a friendly tutor. Read the STUDY NOTES and write a study guide a student can learn from in 10 minutes.\n"
        . "Rules: use ONLY facts in the notes. Explain like the student is smart but new to the topic. Keep each point short.\n"
        . 'Return STRICT JSON ONLY, no markdown: {"title":"...","lessons":[{"title":"...","simple":"2-3 sentence plain explanation","points":["key fact 1","key fact 2","key fact 3"],"why":"why this matters in 1 sentence"}],"terms":[{"term":"...","meaning":"short plain meaning (max 15 words)"}],"tips":["exam tip 1","exam tip 2","exam tip 3"]}' . "\n"
        . "Write 3-6 lessons covering the whole notes from start to end, 6-12 key terms, 3-5 exam tips.\n\nSTUDY NOTES:\n" . $notes;
    $used = '';
    $text = gemini_text($prompt, 3500, 0.5, $used);
    $a = strpos($text, '{'); $b = strrpos($text, '}');
    if ($a === false || $b === false || $b <= $a) fail('AI returned non-JSON');
    $guide = validate_review(json_decode(substr($text, $a, $b - $a + 1), true));
    $guide['model'] = $used;
    done(['guide' => $guide, 'model' => $used]);
}

if ($action === 'test') {
    $used = '';
    $text = gemini_text('Reply with exactly: OK', 500, 0.0, $used);
    done(['reply' => mb_substr($text, 0, 200), 'model' => $used]);
}

fail('Unknown action');
