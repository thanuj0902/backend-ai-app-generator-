export default function Home() {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Runtime Deployment</h1>
      <p>App runtime and deployment orchestration service.</p>

      <h2>API Endpoints</h2>
      <ul>
        <li><code>POST /api/deploy</code> - Create a deployment</li>
        <li><code>GET /api/deploy</code> - Get deployment(s)</li>
        <li><code>POST /api/deploy/status</code> - Update deployment status</li>
        <li><code>GET /api/deploy/status</code> - Check deployment status</li>
        <li><code>POST /api/deploy/retry</code> - Retry a failed deployment</li>
        <li><code>GET /api/deploy/retry</code> - Get retry history</li>
        <li><code>GET /api/preview</code> - Get preview URL</li>
        <li><code>POST /api/preview</code> - Activate preview</li>
        <li><code>GET /api/subdomain</code> - Resolve/check subdomain</li>
        <li><code>POST /api/subdomain</code> - Assign subdomain</li>
      </ul>
    </div>
  );
}
