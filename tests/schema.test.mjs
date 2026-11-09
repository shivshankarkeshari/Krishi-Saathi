import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
test('migrations apply cleanly and uniqueness prevents duplicated cases/events', () => {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync('drizzle/' + file, 'utf8'));
  db.prepare("INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?)").run('a', 'w', 'ref', '{}', 1, 'now', 'key');
  assert.throws(() => db.prepare("INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?)").run('b', 'w', 'ref2', '{}', 1, 'now', 'key'));
  db.prepare("INSERT INTO events(id, workspace, case_id, revision, kind, actor, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('event1', 'w', 'a', 1, 'created', 'worker', 'note', 'now');
  assert.throws(() => db.prepare("INSERT INTO events(id, workspace, case_id, revision, kind, actor, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('event2', 'w', 'a', 1, 'created', 'worker', 'note', 'now'));
  db.close();
});
