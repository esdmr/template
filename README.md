# Template Project
[![GitHub workflow](https://img.shields.io/github/workflow/status/esdmr/template/CI/master?label=test&labelColor=0F0F0F&logo=github)][workflow]
[![Codecov coverage](https://img.shields.io/codecov/c/gh/esdmr/template/master?labelColor=0F0F0F&logo=CodeCov&logoColor=FF66B0)][codecov]
[![NodeJS version](https://img.shields.io/badge/node-≥16-005C9A?labelColor=0F0F0F&logo=node.js&logoColor=00B834)][node]
[![pnpm version](https://img.shields.io/badge/pnpm-6-005C9A?labelColor=0F0F0F&logo=pnpm)][pnpm]
[![License](https://img.shields.io/github/license/esdmr/template?labelColor=0F0F0F&color=005C9A)][license]

[workflow]: https://github.com/esdmr/template/actions/workflows/ci.yml
[codecov]: https://codecov.io/gh/esdmr/template
[node]: https://nodejs.org/en/download/current
[pnpm]: https://pnpm.io
[license]: https://github.com/esdmr/template/blob/master/LICENSE

This is a template for TypeScript projects.
Further information at [the wiki](https://github.com/esdmr/template/wiki).

## Install from source

This project requires [Node.JS][node] version 16 minimum. Ensure that you have
installed the correct version of Node.JS by running `node --version`.

This project recommends [pnpm][pnpm] version 6. Ensure that you have installed
the correct version of pnpm by running `pnpm --version`.

The following snippet will download, install, and build the source from GitHub:

```sh
git clone https://github.com/esdmr/template.git
cd template
pnpm install
pnpm run build
```

## Online documentation

Available at [The GitHub Pages](https://esdmr.github.io/template/).

## Building the documentation locally

The following snippet will build the documentation at `build/docs/`:

```sh
pnpm run api
```

## License

See [License][license].
