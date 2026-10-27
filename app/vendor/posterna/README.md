# Vendored Posterna packages

Posterna is not on npm yet, so these are `pnpm pack` tarballs of
`@posterna/core`, `@posterna/directory` and `@posterna/next`
0.1.0-alpha.0, built from posternahq/posterna commit `4e269a0`.

`package.json` depends on them with `file:` paths, and its `overrides`
make `@posterna/next`'s own dependency on core (and core's on directory)
resolve to these files instead of the registry.

To update: in the posterna repository run `pnpm build`, then `pnpm pack`
in each of the three packages; copy the tarballs here; run `npm install`
in `app/`; and check that `rm -rf node_modules && npm ci` still works.
npm 11's `npm install` can drop optional `@emnapi/*` entries from
`package-lock.json` that `npm ci` (and Railway's build) still requires. If
`npm ci` fails on them, start from the previous lockfile and add only the
new `@posterna/*` entries and their dependencies.

Once the packages are on npm, depend on the registry versions and delete
this folder and the `overrides` block.

SHA-256:

```
7090c8674d8a75f58226a7d6eaf18bd99305c0e063aa9d0e4e176257267822f8  posterna-core-0.1.0-alpha.0.tgz
ae3fa36cdde805a7a17a79835fa1a9c321320ddeb801b20880603f7d13c5f5ca  posterna-directory-0.1.0-alpha.0.tgz
e944e13cad7e2ae3a844f62d925e0893827070fcca8f9757d676adb58f1ad003  posterna-next-0.1.0-alpha.0.tgz
```
