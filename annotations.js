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
    };

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
    var infoPatt = /^([\w ]{4}), *(\d+), *(?:\/\/ byte 0x[\da-f]+ +bit \d+ +(.+) *)?$/i;
    var offsetPatt = /^Offset *\((0x[\da-f]+)\),/i;

    string.split('\n').forEach(function (line) {
        // skip empty lines
        if (!line)
            return;

        var info = infoPatt.exec(line);
        if (!info) {
            var offsetInfo = offsetPatt.exec(line);
            if (!offsetInfo)
                throw 'Unrecognized line: ' + line;
            offset += parseInt(offsetInfo[1]);
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
/* vim: set sw=4 et ts=4: */
