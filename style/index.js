/*
    style/index.js -- webpack/bundler entry point for Sandor's styles.

    Named by `"styleModule": "style/index.js"` in package.json.

    Importing a .css file from JavaScript is not standard JavaScript -- it is a
    bundler convention. Webpack sees the import, runs the CSS through its
    loaders, and arranges for it to be injected into the page at runtime. This
    is how a prebuilt labextension ships its styles inside its JS bundle rather
    than as a separate stylesheet the server has to serve.

    package.json also lists this file under `"sideEffects"`, which tells webpack
    "do not tree-shake this away just because nothing imports a named binding
    from it" -- the import IS the effect.

    Real rules go in base.css. See the long comment at the top of that file.
*/
import './base.css';
