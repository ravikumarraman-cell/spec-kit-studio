# Local Connector

The connector is the explicit boundary between the browser workspace and repositories on your machine. It listens only on loopback, confines paths to configured roots, and asks for confirmation before consequential actions.

## Configure from a source checkout

Create `.env.local` in the directory where you start the connector.

### macOS and Linux

```env
STUDIO_ALLOWED_ROOTS="/absolute/path/to/your/repos"
STUDIO_CONNECTOR_TOKEN="use-a-long-random-value"
STUDIO_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

### Windows

Use forward slashes in drive paths:

```env
STUDIO_ALLOWED_ROOTS="C:/Users/your-name/studio-repositories"
STUDIO_CONNECTOR_TOKEN="use-a-long-random-value"
STUDIO_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

Start it with:

```bash
npm run connector
```

## Install without cloning Studio

A deployed Studio site can serve a versioned standalone package:

```bash
npm install --global https://github.com/rraviku2_uhg/spec-kit-studio/raw/refs/heads/main/public/downloads/spec-kit-studio-local-connector-0.1.20.tgz
spec-kit-studio-connector
```

The same commands work in Windows PowerShell and macOS/Linux terminals.

## Security boundaries

- Set `STUDIO_ALLOWED_ROOTS` to the narrowest useful parent directory.
- Use a long random connector token.
- Keep `.env.local` private and uncommitted.
- In production connector mode, use exact HTTPS origins and a token of at least 32 bytes.
- Treat every write, worktree, check, installation, agent action, and optional
  PR publication as an operator decision.
- GitHub PR publication is available only at completed developer delivery, via
  the existing local `gh` sign-in, after a clean feature branch has already
  been committed and pushed. The connector never creates a hidden commit,
  pushes, merges, or deploys.
- In GovCloud or DoD mode, set the same `STUDIO_DEPLOYMENT_MODE` as the
  application and `STUDIO_CONNECTOR_EXTERNAL_AGENT_EGRESS=disabled`; the
  connector blocks external coding-agent egress until an approved in-boundary
  adapter exists.

## Canonical references

- [Full connector capabilities and protocol](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/local-connector.md)
- [Local connector guide](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/local-connector.md)
- [Regulated deployment](https://github.com/rraviku2_uhg/spec-kit-studio/blob/main/docs/regulated-deployment.md)

---

[Project site](https://rraviku2-uhg.github.io/spec-kit-studio/#boundaries) · [[Home]] · [[Security and Trust]] · [[FAQ]]
