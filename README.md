# temp-client-s3

Testing install size reduction on @aws-sdk/client-s3

## Package sizes

### v0.1.0

The version v0.1.0 added in [#6](https://github.com/trivikr/temp-client-s3/pull/6)
contains source code of **@aws-sdk/client-s3@3.28.0**

```console
name:          @trivikr-test/client-s3
version:       0.1.0
package size:  1.6 MB
unpacked size: 10.2 MB
total files:   806
```

### v0.2.0

The version v0.2.0 added in [#7](https://github.com/trivikr/temp-client-s3/pull/7)
publishes only files in dist folders.

```console
version:       0.2.0
package size:  616.3 kB
unpacked size: 7.1 MB
total files:   670
```

### v0.2.1

The version v0.2.1 added in [#9](https://github.com/trivikr/temp-client-s3/pull/9)
removed comments from transpiled files.

```console
version:       0.2.1
package size:  549.6 kB
unpacked size: 6.3 MB
total files:   670
```
