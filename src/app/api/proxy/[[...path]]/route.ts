export const runtime = 'nodejs';

function getBackendBaseUrl(): string {
  const url = process.env.BACKEND_URL || '';
  if (!url) {
    throw new Error('BACKEND_URL is not configured');
  }
  return url.replace(/\/$/, '');
}

function buildTargetUrl(req: Request): string {
  const backendBase = getBackendBaseUrl();
  const url = new URL(req.url);
  const strippedPath = url.pathname.replace(/^\/api\/proxy/, '') || '/';
  const search = url.search || '';
  return `${backendBase}${strippedPath}${search}`;
}

async function proxyRequest(method: string, req: Request) {
  try {
    const targetUrl = buildTargetUrl(req);

    // Copy headers, override Host and set API key
    const outgoingHeaders = new Headers();
    req.headers.forEach((value, key) => {
      if (['host', 'connection', 'content-length'].includes(key.toLowerCase())) return;
      if (key.toLowerCase() === 'cookie') return; // do not forward browser cookies
      outgoingHeaders.set(key, value);
    });

    const apiKey = process.env.BACKEND_API_KEY;
    if (apiKey) {
      outgoingHeaders.set('x-api-key', apiKey);
    }

    const contentType = req.headers.get('content-type');
    if (contentType) {
      outgoingHeaders.set('content-type', contentType);
    }

    const hasBody = !['GET', 'HEAD'].includes(method.toUpperCase());
    const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

    const response = await fetch(targetUrl, {
      method,
      headers: outgoingHeaders,
      body,
    });

    const respHeaders = new Headers(response.headers);
    ['transfer-encoding', 'connection', 'content-encoding'].forEach(h => respHeaders.delete(h));

    if (response.body) {
      return new Response(response.body, {
        status: response.status,
        headers: respHeaders,
      });
    }

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Proxy Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET(req: Request) {
  return proxyRequest('GET', req);
}

export async function POST(req: Request) {
  return proxyRequest('POST', req);
}

export async function PUT(req: Request) {
  return proxyRequest('PUT', req);
}

export async function PATCH(req: Request) {
  return proxyRequest('PATCH', req);
}

export async function DELETE(req: Request) {
  return proxyRequest('DELETE', req);
}

export async function OPTIONS(req: Request) {
  // Provide permissive preflight for same-origin requests
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': req.headers.get('access-control-request-headers') || '*',
    },
  });
}
