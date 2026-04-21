// Cloudflare Worker — CORS-proxy mot PTS API
// Klistra in denna kod på: https://workers.cloudflare.com → Create Worker

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const url = new URL(request.url)
  const n = url.searchParams.get('n')

  if (!n) {
    return new Response(JSON.stringify({ error: 'Saknar parameter ?n=76-1720020' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  const ptsUrl = 'https://data.pts.se/v1/operator/' + n

  try {
    const resp = await fetch(ptsUrl, {
      headers: { 'Accept': 'application/json' }
    })
    const body = await resp.text()
    return new Response(body, {
      status: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
}
