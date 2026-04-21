// Cloudflare Worker — proxy mot PTS (SE) och Numpac (FI)

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
  const country = url.searchParams.get('c') || 'se'

  if (!n) {
    return new Response(JSON.stringify({ error: 'Saknar parameter ?n=76-1720020' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  if (country === 'fi') {
    return await lookupFinnish(n)
  } else {
    return await lookupSwedish(n)
  }
}

async function lookupSwedish(n) {
  const ptsUrl = 'https://data.pts.se/v1/operator/' + n
  try {
    const resp = await fetch(ptsUrl, { headers: { 'Accept': 'application/json' } })
    const body = await resp.text()
    return new Response(body, {
      status: resp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
}

async function lookupFinnish(n) {
  // n = "045-7202436" format
  const parts = n.split('-')
  if (parts.length < 2) {
    return new Response(JSON.stringify({ error: 'Felaktigt format, förväntar prefix-suffix' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
  const prefix = parts[0]
  const suffix = parts.slice(1).join('')

  const numpacUrl = 'https://www.siirretytnumerot.fi/NumberQueryServlet' +
    '?clientLanguage=se&numberPrefix=' + encodeURIComponent(prefix) +
    '&numberSuffix=' + encodeURIComponent(suffix)

  try {
    const resp = await fetch(numpacUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.siirretytnumerot.fi/'
      }
    })
    const html = await resp.text()

    // Parsa operatörsnamnet ur HTML-svaret
    // Numpac returnerar t.ex: <td>Elisa Oyj</td> i resultattabellen
    const match = html.match(/Operatör[^<]*<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)
      || html.match(/<td[^>]*>([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ\s]+(?:Oy|Ab|Oyj|AS|Ltd)[^<]*)<\/td>/i)
      || html.match(/operator[^>]*>([^<]{3,50})<\/[^>]+>/i)

    if (match && match[1].trim()) {
      const operator = match[1].trim()
      return new Response(JSON.stringify([{ number: prefix + '-' + suffix, name: operator }]), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // Om vi inte kan parsa, returnera HTML-längd som debug
    return new Response(JSON.stringify({
      number: prefix + '-' + suffix,
      name: null,
      debug: 'Kunde inte parsa svar, html-längd: ' + html.length
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
}
