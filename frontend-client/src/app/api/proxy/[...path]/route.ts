'use server'

const DEFAULT_TARGET = 'http://172.200.210.225:4000/api'

const backendBaseUrl =
  process.env.BACKEND_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_TARGET

async function proxyRequest(request: Request, params: { path?: string[] }) {
  const path = params.path?.join('/') ?? ''
  const url = new URL(request.url)
  const targetUrl = `${backendBaseUrl}/${path}${url.search}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  const init: RequestInit = {
    method: request.method,
    headers,
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.text(),
    redirect: 'follow',
  }

  try {
    const response = await fetch(targetUrl, init)
    const responseBody = await response.arrayBuffer()
    const responseHeaders = new Headers(response.headers)

    return new Response(responseBody, {
      status: response.status,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(
      JSON.stringify({ message: 'Proxy request failed', error: String(error) }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function GET(request: Request, ctx: { params: { path?: string[] } }) {
  return proxyRequest(request, ctx.params)
}

export async function POST(
  request: Request,
  ctx: { params: { path?: string[] } }
) {
  return proxyRequest(request, ctx.params)
}

export async function PUT(request: Request, ctx: { params: { path?: string[] } }) {
  return proxyRequest(request, ctx.params)
}

export async function PATCH(
  request: Request,
  ctx: { params: { path?: string[] } }
) {
  return proxyRequest(request, ctx.params)
}

export async function DELETE(
  request: Request,
  ctx: { params: { path?: string[] } }
) {
  return proxyRequest(request, ctx.params)
}
