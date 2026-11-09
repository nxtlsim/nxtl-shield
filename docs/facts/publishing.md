# Publishing facts (verified 2026-11-09)

## GitHub
- Connected identity (cursor-github `get_me`): **nxtlsim** (user id 347597548), 15 public repos.
- Existing repos include trip-data-budget, travel-connection-check, esim-compatibility-check, team-data-planner, awesome-esim, travel-data-usage-calculator, nxtl-webhook-starter, nxtl-esim-sdk, esim-iot-backup-guides and nxtl-balance-alerts. All have 0 stars.
- `nxtlsim/nxtl-shield` does NOT exist: the connector says scm_repo_not_accessible, and https://github.com/nxtlsim/nxtl-shield returns 404.
- The cursor-github connector has **no create-repo and no commit/push tools**. The `gh` CLI on the box is **not logged in**.
- **BLOCKER:** to publish, the user creates an empty repo `nxtlsim/nxtl-shield`, or a Cursor cloud agent with repo write access pushes the code.
- Pages method used by the existing tools is the **classic branch deploy** from `main` `/docs`. esim-compatibility-check shows "pages build and deployment" (dynamic) workflow runs on main.
  - Expected URL: https://nxtlsim.github.io/nxtl-shield/ (not live yet).
- PWA pattern from the existing repos: `docs/index.html`, `docs/manifest.json` (id "./", display standalone) and `docs/sw.js`. Use relative paths, because the site is served under the /nxtl-shield/ subpath.

## Hugging Face
- HF MCP `hf_whoami`: user **nxtlsim**, admin of org **nxtl-esim**.
  - The OAuth scopes include contribute-repos, but the token expires 2026-11-09T23:54Z. Converted: 2026-11-10 01:54 Kyiv time (UTC+2).
  - **No upload/write tool is exposed** through the MCP.
- `hf` CLI 2.4.0 is **not logged in**. /workspace/hf/spaces-build/publish.sh requires HF_TOKEN.
- The nxtl-esim org has 4 Spaces. Static examples:
  - trip-data-budget (RUNNING, https://nxtl-esim-trip-data-budget.static.hf.space)
  - team-data-planner
  - esim-compatibility-check
- HF docs (spaces-overview):
  - "Static Spaces are free for everyone. Gradio and Docker Spaces run on compute and require a paid plan to create: PRO for personal accounts, Team or Enterprise for organizations."
  - CPU Basic: 2 vCPU, 16 GB RAM, 50 GB non-persistent disk.
  - Outbound traffic only on ports 80, 443 and 8080. Free Spaces sleep when unused.
  - Static Spaces support `app_build_command`.
  - An MCP badge needs a Gradio Space with `launch(mcp_server=True)`.
- Consequences:
  - Only a **static** Shield Space can be published free.
  - A Gradio MCP server and a ClamAV Docker backend on HF need a paid plan. That is a BLOCKER under "do not purchase".
  - Even if allowed, ClamAV RAM (3–4 GiB) would fit within 16 GB.

## Firefox add-on
- A signed XPI needs an AMO account and API key (see platform-facts.md). Status: not available.

## Chrome Web Store / Edge Add-ons
- A developer account is required. The Chrome Web Store developer registration fee is UNVERIFIED (not fetched this run). Do not register.
- Until then, the realistic distribution is an unpacked or "Load unpacked" developer install, with GitHub Release zips once a repo exists.
