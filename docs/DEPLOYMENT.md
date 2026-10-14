# Runtime deployment

The approved direction is one verified EC2 host for AI CMO, Admin Operations, Council and private Brain, managed by https://github.com/Profit-Rise-Consulting/Backend. Company knowledge stays in https://github.com/Profit-Rise-Consulting/Brain.

Build and publish the executable in CI. The host pulls its reviewed digest; it does not run `npm install`, clone application source, or build at startup.

Backend injects runtime config, provider/memory secret files, profiles, private session volume and signed Cloudflare Access identity. Corporate memory is retrieved over read-scoped internal MCP, never baked into the image.

Defaults disable paid execution and external company-data disclosure. Enable only after identity, usage policy, model/key availability, source approval, actual vector recall and owner consent are qualified. A keyless mock test is not a paid model qualification.

`service/server.mjs` binds on `0.0.0.0:4730` inside Docker and serves assets plus `/api/councils` and its event stream. The host exposes no public origin port; Cloudflare Tunnel routes `council.profitriseco.com`. Access guards API execution, and Node verifies issuer/audience/signature and approved users independently.

The legacy S3 template/uploader are retained only for historical review and are not the active deployment path. `npm run deploy:production` refuses standalone production deployment. B2 publishes an image; Backend controls activation.

Before upgrade, drain active councils, preserve state and exact evidence/source/profile revisions, and verify that restarting preserves partial runs without automatically billing another run. Host consolidation additionally requires actual capacity, independent DB backups/restores, app isolation, tested candidate origins, and explicit retirement of old tunnel revisions.
