# temp-client-s3

Testing install size reduction on @aws-sdk/client-s3

## Package sizes

### v0.0.1

The version v0.0.1 added in [#1](https://github.com/trivikr/temp-client-s3/pull/1)
contains source code of **@aws-sdk/client-s3@3.31.0** with TypeScript ~4.3.5

```console
version:       0.0.1
package size:  718.9 kB
unpacked size: 8.1 MB
total files:   697
```

### v0.0.4

The version v0.0.4 contains following changes:

- move source files to src folder from [#2](https://github.com/trivikr/temp-client-s3/pull/2)
- use dist-_ instead of dist/_ for outDir from [#4](https://github.com/trivikr/temp-client-s3/pull/2)
- only publish files in dist-\* from [#5](https://github.com/trivikr/temp-client-s3/pull/2)

```console
version:       0.0.4
package size:  480.5 kB
unpacked size: 5.8 MB
total files:   564
```
