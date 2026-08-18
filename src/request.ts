// ============================================================================
// src/request.ts -- the browser's telephone line to Sandor's Python server half.
//
// WHERE THIS SITS IN THE ARCHITECTURE
// -----------------------------------
// Sandor spans three separate operating-system processes (see WORKFLOW.md §1):
//
//   [ Browser ]  <--HTTP/WebSocket-->  [ jupyter_server ]  <--ZMQ-->  [ Kernel ]
//    this file                          sandor/routes.py              (ipykernel)
//
// The browser can NEVER talk to the kernel directly. Every message is relayed
// by the server. This file implements the left-hand arrow only: browser -> server.
//
// DESIGN.md D9 gives the rule for deciding which backend to call:
//   * needs the user's LIVE variables (a DataFrame they just loaded)
//         -> kernel comms, not this file
//   * global config, file listings, anything file-level or cross-notebook
//         -> the server extension, i.e. this file
//
// WHY NOT JUST USE `fetch()`?
// ---------------------------
// `fetch` is the browser's built-in HTTP function, and it would *almost* work.
// The two things it does not do for you:
//   1. XSRF/authentication tokens. Jupyter rejects unauthenticated API calls,
//      and the token lives in JupyterLab's page config, not in a cookie you can
//      rely on. `ServerConnection.makeRequest` attaches it.
//   2. The base URL. A JupyterLab served behind a proxy at
//      `https://hub.example.org/user/inigo/` needs every API path prefixed with
//      that. Hard-coding `/sandor/hello` breaks on JupyterHub and Binder.
//      `serverSettings.baseUrl` carries the correct prefix.
// ============================================================================

// `URLExt` -- JupyterLab's URL helpers. `URLExt.join` is to URLs what
// `os.path.join`/`pathlib` is to filesystem paths: it handles the slashes so
// you do not end up with `.../lab//sandor/hello` or `.../labsandor/hello`.
import { URLExt } from '@jupyterlab/coreutils';

// `ServerConnection` -- the layer that knows how to reach *this* Jupyter server:
// its base URL, its auth token, its WebSocket factory.
import { ServerConnection } from '@jupyterlab/services';

/**
 * Call an endpoint of the Sandor server extension.
 *
 * `export` makes this visible to other modules -- without it the function is
 * private to this file. There is no `public`/`private` keyword at module scope
 * in JavaScript; exported or not exported is the whole visibility model.
 *
 * `async` means this function returns a Promise. `await` inside it suspends
 * *this function* until the awaited Promise settles, while the single JS thread
 * goes off and does other work. Same mental model as Python's async/await.
 *
 * The `<T>` is a generic type parameter -- a C++ template parameter, checked at
 * compile time and then erased. It lets the caller say what shape they expect
 * back (`requestAPI<IHelloResponse>('hello', ...)`) and get a typed result.
 * IMPORTANT: this is a *promise* to the compiler, not a runtime check. Nothing
 * validates that the server actually sent that shape.
 *
 * @param endPoint      Path under the `/sandor/` namespace, e.g. `'hello'`.
 * @param serverSettings Connection details, from `app.serviceManager.serverSettings`.
 * @param init          Standard `fetch` options: method, headers, body, ...
 *                      Defaults to `{}`, which means a plain GET.
 * @returns The response body, parsed as JSON.
 */
export async function requestAPI<T>(
  endPoint: string,
  serverSettings: ServerConnection.ISettings,
  init: RequestInit = {}
): Promise<T> {
  // Build the full URL. `'sandor'` here must match the namespace registered in
  // `sandor/routes.py` (`url_path_join(base_url, "sandor", "hello")`). These two
  // strings are coupled across the language boundary with nothing enforcing it,
  // so a typo shows up only as a 404 at runtime.
  const requestUrl = URLExt.join(
    serverSettings.baseUrl,
    'sandor', // our server extension's API namespace
    endPoint
  );

  // `let` = reassignable variable; `const` = bound once (like a C++ `const`
  // reference -- the binding is fixed, but the object's own fields may still be
  // mutated). Prefer `const` unless reassignment is genuinely needed.
  let response: Response;
  try {
    // Fires the actual HTTP request, with auth and XSRF handled for us.
    response = await ServerConnection.makeRequest(
      requestUrl,
      init,
      serverSettings
    );
  } catch (error) {
    // We land here only for *transport* failures -- server down, DNS failure,
    // connection dropped. An HTTP 500 is a perfectly successful transport and
    // does NOT throw here; it is handled by the `response.ok` check below.
    // (This is the one genuinely surprising thing about `fetch` semantics.)
    throw new ServerConnection.NetworkError(error as any);
  }

  // Read the body as raw text first, rather than calling `response.json()`.
  // Deliberate: a body can legitimately be empty (HTTP 204), and it may be a
  // non-JSON error page from a proxy. `.json()` would throw on both. Reading
  // text and parsing by hand lets us degrade gracefully.
  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      // Not JSON. Keep `data` as the raw string and carry on -- the caller may
      // still get something useful out of it, and the status check below will
      // surface a real error if there is one.
      //
      // The parse error itself is logged too: without it, a proxy returning an
      // HTML error page reads as a mystifying "Not a JSON response body" with
      // no clue as to what arrived instead.
      console.log('Not a JSON response body.', response, error);
    }
  }

  // `response.ok` is true for status 200-299. Anything else is an application-
  // level error that the transport delivered just fine.
  if (!response.ok) {
    // Jupyter error bodies conventionally carry a `message` field. Fall back to
    // the whole body when they do not. (`a || b` yields `a` unless `a` is falsy
    // -- undefined, null, 0, '', NaN, false -- in which case it yields `b`.)
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  // The cast to `T` is implicit: the declared return type is `Promise<T>` and
  // `data` is `any`, so the compiler accepts it without complaint. Again --
  // an unverified assertion, not a check.
  return data;
}
