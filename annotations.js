var Annotations = function (annots) {
    'use strict';
    /**
     * Annotations JSON format:
     * {
     *  "offset":   int,    // offset in bits
     *  "length:    int,    // length in bits
     *  "name":     string, // short name (4 bytes, not ness. uniq.)
     *  "desc":     string  // description / comment
     * }
     */

    // turn of validation if it is too expensive
    var validate = true;
    if (validate) {
        var offset = 0;
        annots.forEach(function (annot) {
            if (typeof annot != 'object' ||
                typeof annot.offset != 'number' ||
                typeof annot.length != 'number' ||
                typeof annot.name != 'string' ||
                typeof annot.desc != 'string') {
                throw 'Invalid types';
            }
            if (annot.offset < offset || !isFinite(annot.offset)) {
                throw 'Invalid offset: ' + annot.offset;
            }
            if (annot.length < 0 || !isFinite(annot.length)) {
                throw 'Length must be positive: ' + annot.length;
            }
            offset += annot.length;
        });
    }

    // must not be expensive!
    function getAnnotations() {
        // XXX: make immutable?
        return annots;
    }

    // exports
    this.getAnnotations = getAnnotations;
};

/**
 * Returns an Annotations instance from a string created using the 'fieldsize'
 * program.
 */
Annotations.loadFieldsizeFormat = function (string) {
    var annots = [];
    // offset in bits
    var offset = 0;
    // [ name, size, desc ]
    var infoPatt = /^\s*([\w ]{4}), *(\d+)(?:, *(?:\/\/ byte 0x[\da-f]+ +bit \d+ +(.+))?)? *$/i;
    var offsetPatt = /^\s*Offset *\((0x[\da-f]+)\),/i;

    string.split('\n').forEach(function (line) {
        // skip empty lines
        if (!line)
            return;

        var info = infoPatt.exec(line);
        if (!info) {
            var offsetInfo = offsetPatt.exec(line);
            if (!offsetInfo)
                throw 'Unrecognized line: ' + line;
            offset = 8 * parseInt(offsetInfo[1], 16);
            return;
        }
        annots.push({
            offset: offset,
            length: 1 * info[2],
            name: info[1],
            desc: info[3] || ''
        });
        offset += 1 * info[2];
    });

    return new Annotations(annots);
};

/**
 * Returns an array with the first and last (exclusive) byte that gets occupied
 * by this annotation.
 */
Annotations.bits_to_byterange = function (bit_begin, bit_end) {
    var begin = Math.floor(bit_begin / 8);
    var end = Math.ceil(bit_end / 8);
    return [begin, end];
};
Annotations.annot_to_byterange = function (annot) {
    var len = annot.offset + annot.length;
    return Annotations.bits_to_byterange(annot.offset, len);
};
/* vim: set sw=4 et ts=4: */
