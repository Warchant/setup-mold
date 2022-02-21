# setup-mold javascript action

Github Action to install mold (https://github.com/rui314/mold) in PATH or as `/usr/bin/ld`.

Supports only Linux runners.

## Inputs

## `version`

**Required** Release version. Default `"1.1.0"`. List of versions can be found in [versions-manifest.json](./versions-manifest.json)

## `make_default`

**Required** If true, will setup mold as `/usr/bin/ld`. Default `false`.

## Example usage

```yaml
uses: warchant/setup-mold@v1
with:
  version: v1.0.3
  make_default: true
```