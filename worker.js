addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    // استخراج الـ target من الرابط
    const url = new URL(request.url);
    let target = url.searchParams.get('target');

    // فحص وجود الـ target
    if (!target) {
      return new Response(
        JSON.stringify({ error: 'No target URL provided. Use ?target=<url>' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // تنظيف وتأمين الـ target
    target = decodeURIComponent(target);
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    // التحقق من صحة الـ URL
    const urlPattern = /^(https?):\/\/([a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]+)$/;
    if (!urlPattern.test(target)) {
      return new Response(
        JSON.stringify({ error: 'Invalid target URL' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // إعدادات الـ Headers للطلب
    const headers = new Headers({
      'User-Agent':
        request.headers.get('User-Agent') ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'X-Proxy-Source': 'super-proxy-ahmed',
    });

    // إعدادات الـ fetch
    const fetchOptions = {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
      redirect: 'follow',
      cf: {
        cacheEverything: false,
        cacheTtl: 0,
      },
    };

    // تنفيذ الطلب مع Streaming
    const response = await fetch(target, fetchOptions);

    // التحقق من حالة الرد
    if (response.status >= 400) {
      return new Response(
        JSON.stringify({
          error: `Request failed with status ${response.status}`,
          statusText: response.statusText,
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // إعدادات الـ Streaming
    const { readable, writable } = new TransformStream({
      highWaterMark: 1024 * 1024 * 10, // 10 ميجا بافر
    });

    response.body.pipeTo(writable).catch(err => {
      console.error('Stream error:', err);
    });

    // إعدادات Headers للرد
    const responseHeaders = new Headers({
      'Content-Type':
        response.headers.get('Content-Type') || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD',
      'Access-Control-Allow-Headers': '*',
      'Cache-Control': 'no-cache',
      'X-Proxy-Version': '1.0.0',
    });

    // إضافة Content-Length لو موجود
    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    return new Response(readable, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: `Internal server error: ${error.message}`,
        target: target || 'unknown',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      }
    );
  }
}
