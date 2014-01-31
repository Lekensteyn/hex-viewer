# Hex Viewer
Binary file viewer for modern browsers. Presents a hexadecimal and ASCII
representation of a binary file. It is also possible to add annotations for
bits which are shown on-screen.

It was created for the purpose of reading binary data, dumped from the Embedded
Controller (EC) RAM (using [`ectool`][1]). The supported "annotations file" is
currently in a custom format, based on the ACPI `Field` function. An example can
be found in the [Lekensteyn/acpi-stuff][2] repository.

Other formats can easily be supported, see the source of [annotations.js].

See [TODO] for problems.

# License
Copyright (C) 2014 Peter Wu <lekensteyn@gmail.com>

This project ("hex-viewer") is licensed under the MIT license. See the LICENSE
file for more details.

 [1]: https://www.coreboot.org/Ectool
 [2]: https://github.com/Lekensteyn/acpi-stuff/blob/master/Clevo-B7130/Clevo_B7130-EC_RAM.txt
