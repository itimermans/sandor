// ============================================================================
// src/index.ts -- the entry point of the Sandor JupyterLab frontend extension.
//
// WHAT THIS FILE IS
// -----------------
// This is the *only* file JupyterLab actually looks at when it loads Sandor's
// browser half. `package.json` says `"main": "lib/index.js"`, and `lib/` is
// where TypeScript compiles `src/` to. So: browser loads lib/index.js, which
// is the compiled form of this file.
//
// Everything else in `src/` exists because this file (directly or indirectly)
// imports it. Nothing runs unless it is reachable from here.
//
// NOTE FOR SOMEONE COMING FROM C/C++/PYTHON
// -----------------------------------------
// TypeScript is JavaScript plus a type system. The types are *erased* at build
// time -- they are checked by the compiler (`tsc`) and then thrown away. The
// browser only ever sees plain JavaScript. There is no runtime type checking,
// no templates being instantiated, nothing like a C++ header. A `.d.ts` file
// is the closest analogue to a header, and it too vanishes at runtime.
//
// Compare:
//   Python `import x from y`     ->  TS `import { x } from 'y';`
//   Python module-level code     ->  TS module-level code (runs once on import)
//   C++ `struct` literal         ->  TS object literal `{ a: 1, b: 2 }`
//
// SANDOR DESIGN CONTEXT
// ---------------------
// Per DESIGN.md D15, this TypeScript layer must stay THIN. Real logic belongs
// in Python. Anything that touches a JupyterLab core API should eventually be
// confined to a small adapter module so that a JupyterLab 5 migration is "fix
// the adapter", not "rewrite the extension".
//
// Per DESIGN.md D6, nothing here may ever be *required* to run a notebook. A
// Sandor notebook must stay valid and runnable with this extension uninstalled.
// ============================================================================

import {
  // `JupyterFrontEnd` is the application object -- the single top-level handle
  // to the running JupyterLab instance. Think of it as `app` in a GUI toolkit:
  // it owns the shell (the layout), the command registry, the service manager
  // (which talks to the server), and so on.
  JupyterFrontEnd,
  // `JupyterFrontEndPlugin<T>` is the *shape* an extension must have. It is a
  // TypeScript interface -- a compile-time contract, not a base class. We do
  // not inherit from it; we just declare an object that matches it. The `<T>`
  // is the type this plugin *provides* to other plugins. We provide nothing,
  // hence `<void>`.
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

// The settings registry: JupyterLab's central store for user-editable plugin
// settings. Its *shape* is described by `schema/plugin.json` in this repo.
// The leading `I` is a JupyterLab convention meaning "interface".
import { ISettingRegistry } from '@jupyterlab/settingregistry';

// Our own small helper for calling the Python server extension over HTTP.
// The `./` prefix means "a file in this same directory" (src/request.ts), as
// opposed to a package from node_modules.
import { requestAPI } from './request';

/**
 * The message logged to the browser console when the plugin activates.
 *
 * Kept as a named constant for one concrete reason: `ui-tests/tests/sandor.spec.ts`
 * asserts on this exact string. If you change the literal here without changing
 * it there, the Playwright/Galata UI test fails. Keeping the two in sync is a
 * manual job for now -- the test file cannot import from `src/` because it runs
 * against the *built, installed* extension, not the source tree.
 */
const ACTIVATION_MESSAGE = 'JupyterLab extension sandor is activated!';

/**
 * The plugin descriptor for the Sandor extension.
 *
 * This is a plain object literal, not a class instance. JupyterLab's plugin
 * system is data-driven: you hand it a description of your plugin and it calls
 * you back. There is no inheritance anywhere in the picture.
 *
 * The `: JupyterFrontEndPlugin<void>` annotation is the TypeScript equivalent
 * of declaring a variable's type in C++. It makes the compiler verify that this
 * object has exactly the fields the plugin system expects, with the right types.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  /**
   * Globally unique plugin identifier, by convention `<npm-package>:<plugin-name>`.
   *
   * This string is load-bearing in three separate places:
   *   1. JupyterLab's dependency graph uses it to order plugin activation.
   *   2. The settings registry keys settings by it -- `settingRegistry.load(plugin.id)`
   *      below looks up `schema/plugin.json` under this exact name.
   *   3. Users disable a plugin by this id (`jupyter labextension disable sandor:plugin`).
   */
  id: 'sandor:plugin',

  /** Human-readable blurb, shown in the Extension Manager UI. */
  description:
    'A supercharged JupyterLab environment for vehicle test data analysis',

  /**
   * `true` = activate as soon as JupyterLab starts, without waiting for another
   * plugin to ask for us.
   *
   * The alternative (`false`) is for plugins that only exist to *provide* a
   * service to other plugins; those stay dormant until something requires them.
   * Sandor does work on its own, so it starts eagerly.
   */
  autoStart: true,

  /**
   * Dependency injection, JupyterLab style.
   *
   * `requires: [X, Y]`  -- hard dependencies. JupyterLab guarantees they are
   *                        activated first and passes them to `activate`. If
   *                        one is missing, our plugin never activates at all.
   * `optional: [X]`     -- soft dependencies. Passed if available, `null` if not.
   *
   * `ISettingRegistry` is `optional` because Sandor should still load in a
   * stripped-down deployment that has no settings system. The consequence is
   * that `settingRegistry` below is typed `ISettingRegistry | null` and the
   * compiler *forces* us to handle the null case. That union type is exactly
   * why the `if (settingRegistry)` guard exists -- it is not defensive style,
   * it is a compile error if omitted.
   */
  optional: [ISettingRegistry],

  /**
   * The activation function -- our `main()`.
   *
   * JupyterLab calls this once, at startup, after every dependency listed above
   * has been resolved. The arguments arrive in the order:
   *   1. the application object, always first;
   *   2. then each entry of `requires`, in order;
   *   3. then each entry of `optional`, in order.
   *
   * This is positional, not by name. Reordering `optional` above without
   * reordering the parameters here would silently pass the wrong object.
   */
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ) => {
    // Proof of life. Visible in the browser's developer console
    // (F12 -> Console). This is currently the whole acceptance test for M0:
    // change something, rebuild, reload, see the change.
    console.log(ACTIVATION_MESSAGE);

    // ---- Settings -------------------------------------------------------
    // Guard required by the `| null` in the parameter type -- see `optional` above.
    if (settingRegistry) {
      // `.load()` returns a Promise. A Promise is JavaScript's single-threaded
      // answer to "this will finish later": there is exactly one thread, so a
      // Promise never means "another thread is working on it" -- it means "the
      // event loop will call your callback when the result is ready".
      //
      //   .then(fn)   -- run `fn` on success, with the result
      //   .catch(fn)  -- run `fn` on failure, with the error
      //
      // Nothing blocks. `activate` returns long before these callbacks fire.
      // Roughly: `asyncio.Future` in Python, with `.then` instead of `await`.
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          // `.composite` is the merged view: schema defaults overlaid with the
          // user's overrides from Settings -> Advanced Settings Editor.
          console.log('sandor settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for sandor.', reason);
        });
    }

    // ---- Server extension handshake -------------------------------------
    // Calls `GET /sandor/hello`, served by the Python half in `sandor/routes.py`.
    //
    // This is the frontend <-> server link from DESIGN.md D9-i: the browser
    // talking to the *server* process (long-lived, one per JupyterLab, knows
    // about files and global config), NOT to the kernel (per-notebook, holds
    // the user's live variables). Choosing the wrong one of those two is one of
    // the easiest architectural mistakes to make in this project -- the routing
    // rule is in D9.
    //
    // `<any>` is a type argument saying "I don't know the response shape yet".
    // It disables type checking for the result. Fine for a scaffold handshake;
    // real endpoints should declare a proper interface instead.
    requestAPI<any>('hello', app.serviceManager.serverSettings)
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        // The overwhelmingly common cause of landing here: the Python package
        // is installed but the *server extension* is not enabled, so JupyterLab
        // serves the frontend fine and 404s the API. Check with:
        //   uv run jupyter server extension list
        console.error(
          `The sandor server extension appears to be missing.\n${reason}`
        );
      });
  }
};

// `export default` marks the one value this module hands out when imported
// without braces (`import plugin from './index'`). JupyterLab's plugin loader
// looks for exactly this: the default export of the package `main`, being
// either one plugin object or an array of them.
export default plugin;
