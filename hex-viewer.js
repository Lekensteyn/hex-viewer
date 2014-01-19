var HexViewer = (function (id) {
    'use strict';
    /* note: change in CSS too */
    var COLUMNS = 16;

    var container = document.getElementById(id);
    var hexascPanel = document.createElement('div');
    var hexPanel = document.createElement('div');
    var ascPanel = document.createElement('div');
    var annoPanel = document.createElement('div');
    container.className = 'hex-viewer';
    hexascPanel.className = 'hexasc';
    hexPanel.className = 'hex';
    ascPanel.className = 'asc';
    annoPanel.className = 'annotations';

    [hexPanel, ascPanel].forEach(function (panel) {
        hexascPanel.appendChild(panel);
    });
    [hexascPanel, annoPanel].forEach(function (panel) {
        container.appendChild(panel);
    });

    // contains HTMLElements for the hex and ascii boxes
    var hexBoxes = [];
    var ascBoxes = [];
    var selectedBytes = [];

    // contains HTMLElements for annotations
    var annoLines = [];
    // annotations object
    var annotations;

    // boxes_one contains the event source element
    function addSelecter(src_boxes) {
        return function (ev) {
            var byte_no = src_boxes.indexOf(ev.target);
            if (byte_no == -1) {
                return;
            }
            hiliteBits(8 * byte_no, 8);
        };
    }

    // highlight the bytes that share a bit with the slice (if the annotation
    // falls outside the slice, extend the slice)
    function hiliteBits(offset_bit, bits) {
        var startByte, endByte;
        var end_bit = offset_bit + bits;
        if (annotations) {
            var annots = annotations.getAnnotations();
            // annotation indexes
            var i, begin = Infinity, end = annots.length - 1;
            // find begin of annotations
            for (i = 0; i < annots.length; ++i) {
                // if end of annotation lays in the slice (after begin of slice)
                if (annots[i].offset + annots[i].length > offset_bit) {
                    // check if annotation is actually in the slice (i.e. if the
                    // annotation starts before the end of the slice)
                    if (annots[i].offset < end_bit) {
                        begin = i;
                    }
                    break;
                }
            }
            // if there are annotations in range, find the end
            if (begin <= end) {
                for (; i < annots.length; ++i) {
                    if (annots[i].offset >= end_bit) {
                        // end is last annotation that is contained in slice
                        end = i - 1;
                        break;
                    }
                }
                offset_bit = annots[begin].offset;
                end_bit = annots[end].offset + annots[end].length;
            }
            for (i = begin; i <= end; ++i) {
                annoLines[i].classList.add('hover');
            }
        }

        startByte = Math.floor(offset_bit / 8);
        endByte = Math.ceil(end_bit / 8) - 1;
        for (var byte_no = startByte; byte_no <= endByte; ++byte_no) {
            ascBoxes[byte_no].classList.add('hover');
            hexBoxes[byte_no].classList.add('hover');
        }
    }

    function clearSelecter() {
        var affected = container.getElementsByClassName('hover');
        for (var i = affected.length - 1; i >= 0; --i) {
            affected[i].classList.remove('hover');
        }
    }

    function togglePermSelect(boxes) {
        return function (ev) {
            var byte_no = boxes.indexOf(ev.target);
            if (byte_no == -1) {
                return;
            }
            var sel_i = selectedBytes.indexOf(byte_no);
            var action;
            if (sel_i == -1) { // not selected before
                selectedBytes.push(byte_no);
                action = 'add';
            } else {
                selectedBytes.splice(sel_i, 1);
                action = 'remove';
            }
            hexBoxes[byte_no].classList[action]('selected');
            ascBoxes[byte_no].classList[action]('selected');
        };
    }

    hexPanel.addEventListener('mouseover', addSelecter(hexBoxes));
    ascPanel.addEventListener('mouseover', addSelecter(ascBoxes));
    annoPanel.addEventListener('mouseover', function (ev) {
        // mega-dumb quick-n-dirty impl.
        var line = ev.target;
        if (!line.classList.contains('line')) {
            return;
        }
        var begin = Math.floor(line.dataset.offset / 8) * 8;
        // byteEnd is the last exclusive byte
        var len = line.dataset.byteEnd - line.dataset.byteStart + 1;
        hiliteBits(8 * line.dataset.byteStart, 8 * len);
    });
    hexPanel.addEventListener('mouseout', clearSelecter);
    ascPanel.addEventListener('mouseout', clearSelecter);
    annoPanel.addEventListener('mouseout', clearSelecter);
    hexPanel.addEventListener('click', togglePermSelect(hexBoxes));
    ascPanel.addEventListener('click', togglePermSelect(ascBoxes));

    function to_ascii(b) {
        if (b >= 0x20 && b < 0x7F) {
            return String.fromCharCode(b);
        }
        // not a printable ASCII character, ignore.
        return '.';
    }

    // Loads an ArrayBuffer into the page (hex, ascii)
    function loadData(buffer) {
        // bytes per line
        var byteView = new Uint8Array(buffer);

        hexPanel.innerHTML = '';
        ascPanel.innerHTML = '';
        // cannot simply overwrite array as addSelector encapsulated it
        hexBoxes.splice(0, hexBoxes.length);
        ascBoxes.splice(0, ascBoxes.length);

        // appending directly slows down
        var hexFragment = document.createDocumentFragment();
        var ascFragment = document.createDocumentFragment();

        // length of biggest line number (in hex)
        //var lineno_length = byteView.byteLength.toString(16).length;
        var lineno_length = 7; // hard-coded 8 (including colon) in CSS
        var lineno_pad = '0'.repeat(lineno_length);

        for (var i = 0; i < byteView.byteLength; i += COLUMNS) {
            var hexLine = document.createElement('div');
            var ascLine = document.createElement('div');
            hexLine.className = 'line';
            ascLine.className = 'line';
            hexLine.dataset.lineNo =
                (lineno_pad + i.toString(16)).substr(-lineno_length);

            var cols = Math.min(COLUMNS, byteView.byteLength - i);
            for (var j = 0; j < cols; ++j) {
                var hexBox = document.createElement('span');
                var ascBox = document.createElement('span');

                var b = byteView[i + j];
                hexBox.textContent = ('0' + b.toString(16)).substr(-2);
                ascBox.textContent = to_ascii(b);

                hexBoxes.push(hexBox);
                ascBoxes.push(ascBox);

                hexLine.appendChild(hexBox);
                ascLine.appendChild(ascBox);
            }
            hexFragment.appendChild(hexLine);
            ascFragment.appendChild(ascLine);
        }

        hexPanel.appendChild(hexFragment);
        ascPanel.appendChild(ascFragment);
    }

    function handleFilePicker(id) {
        var fileInput = document.getElementById(id);
        fileInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                handleFile(this.files[0]);
            }
        });

        function handleFile(file) {
            var reader = new FileReader();
            reader.onload = function () {
                loadData(this.result);
            };
            reader.readAsArrayBuffer(file);
        }
    }

    /* annotations related stuff */

    // annots is an Annotations instance
    function setAnnotations(annots) {
        annotations = annots;

        annoPanel.innerHTML = '';
        annoLines = [];

        var annFragment = document.createDocumentFragment();
        annots.getAnnotations().forEach(function (annot) {
            var line = document.createElement('div');
            line.className = 'line';

            line.dataset.offset = annot.offset;
            line.dataset.length = annot.length;

            line.dataset.byteStart = Math.floor(annot.offset / 8);
            var lastBit = annot.offset + annot.length;
            // last byte including the annotation
            line.dataset.byteEnd = Math.ceil(lastBit / 8) - 1;

            line.textContent = annot.name + ': ' + annot.desc;

            annoLines.push(line);
            annFragment.appendChild(line);
        });

        annoPanel.appendChild(annFragment);
    }

    // exports
    this.loadData = loadData;
    this.handleFilePicker = handleFilePicker;
    this.setAnnotations = setAnnotations;
});
/* vim: set sw=4 et ts=4: */
