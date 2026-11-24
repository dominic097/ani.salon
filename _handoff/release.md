# Èlor Studio release runbook

## Hosting and last verified release

The [public GitHub repository](https://github.com/dominic097/ani.salon) serves [elor.studio](https://elor.studio/) through GitHub Pages. Pages reads the root directory of `main`. The root `CNAME` contains `elor.studio`, and Pages enforces HTTPS. A push to `main` starts production publication.

| Evidence | Verified on November 24, 2026 |
| --- | --- |
| Production commit | `3620e9a35f317403e9adee1c8b4c0c648f7bc8fb` |
| Last known earlier release | `f3ef65076835b5226b72e300579ca46b29905f3d` |
| Pages workflow | [Successful build and deployment](https://github.com/dominic097/ani.salon/actions/runs/45419148077) |
| Pages build API | `built` for the production commit at 14:54:07 UTC |
| Public origin | HTTP 200 over HTTPS. Served HTML matches the committed `index.html` byte for byte. |

## Prepare and review a change

1. Start from a clean GitHub checkout and a fresh branch. Use a separate checkout if the current one contains work in progress.

   ```sh
   git clone https://github.com/dominic097/ani.salon.git
   cd ani.salon
   git fetch origin
   git switch -c codex/elor-qa-example origin/main
   ```

2. GitHub Pages publishes `index.html`, `assets/`, and other runtime files from the repository root. If the separate review checkout produces a `dist/` directory, carry over its reviewed runtime files to the matching root paths. Review additions and deletions and preserve the production `CNAME`.
3. Run `node _handoff/qa-site.mjs` when the handoff folder is present. Serve the candidate locally with `python3 -m http.server 8000 --bind 127.0.0.1`. Check the changed interactions at desktop and phone widths, keyboard navigation, reduced motion, and media loading. Use a separate QA preview for approval.
4. Review the exact candidate SHA, changed paths, and current production SHA. Retest if the candidate changes or if main advances.

   ```sh
   git status --short --branch
   git diff --stat origin/main...HEAD
   git diff --check origin/main...HEAD
   git diff --exit-code origin/main...HEAD -- CNAME
   git rev-parse HEAD origin/main
   ```

## Publish and verify

Publish the approved candidate after checking that the expected production SHA still matches GitHub main. Record that prior SHA as the rollback point. Where the approved procedure is a direct fast-forward, confirm ancestry and push the exact reviewed commit with an ordinary push. If main has advanced or branch protection requires a review, reconcile and reverify the new candidate before publishing.

```sh
release_sha=APPROVED_CANDIDATE_SHA
expected_main=REVIEWED_PRODUCTION_SHA
git fetch origin &&
  test "$(git rev-parse origin/main)" = "$expected_main" &&
  git merge-base --is-ancestor "$expected_main" "$release_sha" &&
  git push origin "$release_sha":refs/heads/main
```

1. Find the Pages workflow on `main` with the candidate head SHA. Wait for the deployment job to succeed. The Pages build API can report `built` while the workflow's deploy job is still running.

   ```sh
   gh run list --repo dominic097/ani.salon --branch main --limit 5 \
     --json databaseId,workflowName,headSha,status,conclusion,url
   gh api repos/dominic097/ani.salon/pages/builds/latest \
     --jq '{commit,status,updated_at,error:.error.message}'
   ```

2. Verify the public origin returns HTTP 200 and the expected bytes. Repeat the comparison for critical changed scripts, styles, and media.

   ```sh
   proof_dir=$(mktemp -d)
   git show "$release_sha":index.html > "$proof_dir/expected.html"
   curl -fsSLo "$proof_dir/live.html" -w '%{http_code} %{url_effective}\n' \
     "https://elor.studio/?release=$release_sha"
   cmp "$proof_dir/expected.html" "$proof_dir/live.html"
   ```

3. In a fresh browser session on the custom domain, check the changed visible behavior and review request failures. Record the SHA, workflow link, HTTP comparison, and browser outcome in the release notes.

## Roll back

1. Fetch the current main and create a rollback branch from it. Identify the exact release changes and the last known good SHA. For this release the earlier SHA is `f3ef65076835b5226b72e300579ca46b29905f3d`.
2. Prepare a reviewed revert of the release commits, or restore only the affected site paths from the known good tree on that branch. Review the diff so later unrelated fixes and the custom-domain `CNAME` are preserved. Use an ordinary forward commit on main for the approved rollback.
3. Rehearse on the local server or separate preview, then apply the same approval and post-deployment checks to the rollback commit. Main retains its history. Force pushes and resets of main are out of scope for this procedure.
