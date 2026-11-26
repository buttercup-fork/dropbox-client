# Dropbox Client changelog

## v3.0.0
_2026-11-26_ (CodeKunde fork)

 * **New package name:** `@buttercup-fork/dropbox-client` on npm (import from it instead of `@buttercup/dropbox-client`), staged from GitHub Actions through trusted publishing with provenance (`publish.yml`, started by hand); the package name `@buttercup/dropbox-client` stays upstream's
 * **Breaking**: requires NodeJS 22+; CI runs on branch pushes only (Node 22 and 24). Uses the built-in `fetch` on every platform; `@buttercup/fetch` and `node-fetch` (and its deprecated `node-domexception`) are no longer dependencies
 * `prepare` script, so installing from a git URL builds `dist/`
 * Requests time out: uploads and downloads after 10 minutes (`contentTimeout`), every other request after 60 seconds (`timeout`); `0` turns a limit off. Requests other code makes through the client's `request` hook get the same limits (B-634)
 * Update dependencies: `layerr` 3; dev tooling (TypeScript 6, mocha 12, chai 6, sinon 22, rimraf 6), `npm audit` clean. `nyc` dropped (it never measured this ESM package)
 * **Bugfix**:
   * Paths/filenames are now normalised to NFC Unicode form before being sent to Dropbox, so vaults with diacritics in their filename (e.g. `sö.bcup`) can be opened on iOS, where the OS stores filenames in NFD form (buttercup/buttercup-mobile#147)
   * `putFileContents`'s query-string `arg` now uses the same ASCII-safe JSON escaping as the other content-endpoint requests, instead of raw `JSON.stringify`
   * `getDirectoryContents` follows the listing cursor (`list_folder/continue`) instead of stopping silently at 2000 entries; it fails after 1000 pages (B-633)
   * The error info `url` no longer carries the query string, where compatibility mode sends the access token (B-632)

## v2.2.0
_2023-11-11_

 * Update dependencies, `layerr`

## v2.1.2
_2023-07-16_

 * React-native entry point in `package.json`

## v2.1.1
_2023-04-24_

 * **Bugfix**:
   * "Illegal invocation" error thrown when used in browser (fetch)

## v2.1.0
_2023-02-08_

 * Switch `cross-fetch` to `@buttercup/fetch`

## v2.0.0
_2022-12-26_

 * **Major Release**
   * ESM-only release
   * `fetch` for requests, instead of `cowl`/`XMLHttpRequest`
   * Descriptive errors with properties

## v1.1.3
_2022-09-03_

 * Switch `compatPutCorsHack` for `compatCorsHack` for all methods
 * Deprecate `compatPutCorsHack`

## v1.1.2
_2022-09-03_

 * `compatPutCorsHack` compatibility option

## v1.1.1
_2022-08-31_

 * **Bugfix**:
   * `headers` mis-typed

## v1.1.0
_2022-08-31_

 * `headers` client option for custom headers

## v1.0.1
_2022-08-30_

 * **Bugfix**:
   * Add `compat` support for `putFileContents`

## v1.0.0
_2022-05-24_

 * Typescript
 * `DropboxClient` class replaces `createClient`
 * `DropboxClient#fs` replaces `createFsClient`

## v0.8.1
_2022-04-13_

 * GET method for `getFileContents`

## v0.8.0
_2022-04-12_

 * CORS/browser compatibility upgrade for all requests

## v0.7.3
_2022-01-30_

 * `cowl` upgrade for `Layerr` info pass-through

## v0.7.2
_2022-01-30_

 * **Bugfix**:
   * Revert `is-in-browser` for `cowl`

## v0.7.1
_2022-01-29_

 * **Bugfix**:
   * `cowl`: Handle `null` response headers in request error

## v0.7.0
_2021-11-20_

 * `createDirectory` method

## v0.6.0
_2021-11-01_

 * `generateAuthorisationURL` helper

## v0.5.0
_2020-08-29_

 * Upgrade `cowl` - remove `buffer` dependency

## v0.4.0
_2019-09-22_

 * `deleteFile` method
 * `unlink` fs method

## v0.3.3
_2019-09-15_

 * **Bugfix**:
   * ([#3](https://github.com/buttercup/dropbox-client/issues/3)) Unicode files would throw an error when using `getFileContents`

## v0.3.2
_2019-07-23_

 * Set `Content-Type` header to `application/octet-stream` only for PUT requests

## v0.3.1
_2019-07-22_

 * Upgrade `cowl` for better browser compatibility

## v0.3.0
_2019-07-19_

 * `cowl` upgrade for better error handling

## v0.2.1
_2019-07-17_

 * **Bugfix**:
   * Fix `URL` usage for `query` option in browser environments

## v0.2.0
_2019-07-16_

 * Replace `axios` with `cowl` for HTTP requests

## v0.1.1
_2018-11-15_

 * Initial release
