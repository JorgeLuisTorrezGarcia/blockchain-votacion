'use server'

import { NextRequest } from 'next/server'

const DEFAULT_TARGET = 'http://172.200.210.225:4000/api'

const backendBaseUrl =
  process.env.BACKEND_API_BASE_URL?.replace(/\/$/, '') ?? DEFAULT_TARGET

type RouteContext = { params: Promise<{ path: string[] }> }

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  const joinedPath = Array.isArray(path) ? path.join('/') : ''
  const url = new URL(request.url)
  const targetUrl = `${backendBaseUrl}/${joinedPath}${url.search}`

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

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}
