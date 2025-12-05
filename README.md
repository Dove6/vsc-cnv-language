# CNV Language - VS Code Extensions

The `cnv-language` extension deciphers CNV scripts from point-and-click games by Aidem Media on sight!

## Features

- Every opened CNV file is automatically deciphered. The process can be undone. If there is any problem with deciphering, you can always re-open the file to try again.
- Basic highlighting is provided for comments, strings, control flow keywords etc.
- Debug messages from the extension are written to an output channel named "CNV".

## Known Issues

- If a file gets deciphered shortly after VSCode starts up, it may not get marked as dirty.

## Ackonwledgements

This projects depends on the [`reksio-formats`](https://www.npmjs.com/package/reksio-formats) package.
The package is a part of the reimplementation of the PiKlib/BlooMoo engine Reksio games run on: https://github.com/ReksioEngine/ReksioEngine

## Release Notes

### 0.0.6

- [Fix extension not working due to missing dependencies](https://github.com/Dove6/vsc-cnv-language/commit/dbf84fd380d70bf3b2dc55b92d7084295dedf528)

### 0.0.5

- [Switch text encoding library to iconv-lite](https://github.com/Dove6/vsc-cnv-language/commit/5aa0cb414d14ca982a544c67e86d34aa6a01abf9)

### 0.0.4

- [Modify deciphering algorithm to be aware of CP1250 encoding](https://github.com/Dove6/vsc-cnv-language/commit/9c4c53d73117e353bb7cd630afb80bcdab8e0b81)

### 0.0.3

- [Add license](https://github.com/Dove6/vsc-cnv-language/commit/0878b8e1bc9ce19f153af45e2da32b3ffe281bda)

### 0.0.2

- [Provide basic syntax highlighting rules](https://github.com/Dove6/vsc-cnv-language/commit/101cb639df5498690c77f3f4a776cfa8e3a7e177)
