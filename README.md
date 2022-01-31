# setup-mold javascript action

Github Action to intall mold (https://github.com/rui314/mold) in PATH or as /usr/bin/ld.

## Inputs

## `version`

**Required** Release version. Default `"v1.0.3"`.

## `default`

**Required** If true, will setup mold as /usr/bin/ld. Default `false`.

## Example usage

```yaml
uses: warchant/setup-mold@v1
with:
  version: v1.0.3
  default: true
```