var HexViewer = (function (id) {
    'use strict';
    /* note: change in CSS too */
    var COLUMNS = 16;

    /* prefs */
    var autoCenter = true;

    // .hex-viewer
    // + .bits-n-bytes
    //   + .hexasc
    //     + .hex
    //     + .asc
    //   + .bits
    // + .annotations
    var container = document.getElementById(id);
    var bnbPanel = document.createElement('div');
    var hexascPanel = document.createElement('div');
    var hexPanel = document.createElement('div');
    var bitPanel = document.createElement('div');
    var ascPanel = document.createElement('div');
    var annoPanel = document.createElement('div');
    container.className = 'hex-viewer';
    bnbPanel.className = 'bits-n-bytes';
    hexascPanel.className = 'hexasc';
    hexPanel.className = 'hex';
    ascPanel.className = 'asc';
    bitPanel.className = 'bits';
    annoPanel.className = 'annotations';

    [hexPanel, ascPanel].forEach(function (panel) {
        hexascPanel.appendChild(panel);
    });
    [hexascPanel, bitPanel].forEach(function (panel) {
        bnbPanel.appendChild(panel);
    });
    [bnbPanel, annoPanel].forEach(function (panel) {
        container.appendChild(panel);
    });

    // ByteView of the data buffer
    var byteView;
    // contains HTMLElements for the hex and ascii boxes
    var hexBoxes = [];
    var ascBoxes = [];

    // contains HTMLElements for annotations
    var annoLines = [];
    // annotations object
    var annotations;

    function annosIntoView() {
        var elms = annoPanel.querySelectorAll('.hover-before, .hover, .hover-after');
        console.log(elms.length);
        if (elms.length) {
            centerElement(elms[0], elms[elms.length - 1]);
        }
    }
    function bytesIntoView(begin, end) {
        begin = Math.min(ascBoxes.length - 1, begin);
        end = Math.min(ascBoxes.length - 1, end);
        centerElement(ascBoxes[begin], ascBoxes[end]);
    }

    function hiliteAnnotBits(annots, begin_i, end_i) {
        var annot_i = begin_i;
        var beginByte = Math.floor(annots[begin_i].offset / 8);
        var endByte = Math.ceil((annots[end_i].offset + annots[end_i].length) / 8);
        endByte = Math.min(endByte, byteView.byteLength);

        bitPanel.innerHTML = '';
        var bitFragment = document.createDocumentFragment();
        var in_slice = false, slice = -1;
        for (var b = beginByte; b < endByte; ++b) {
            var byteData = byteView[b];
            for (var bi = 7; bi >= 0; --bi) {
                if (8 * b + (7 - bi) == annots[annot_i].offset) {
                    in_slice = true;
                    ++slice;
                }

                var bitBox = document.createElement('span');
                if (in_slice) {
                    bitBox.className = slice % 2 ? 'odd' : 'even';
                }
                bitBox.textContent = byteData & (1 << bi) ? 1 : 0;
                bitFragment.appendChild(bitBox);

                // check following bit
                var endBit = annots[annot_i].offset + annots[annot_i].length;
                if (in_slice && 8 * b + (8 - bi) == endBit) {
                    in_slice = false;
                    if (annot_i < end_i) {
                        ++annot_i;
                    }
                }
            }
        }

        bitPanel.appendChild(bitFragment);
    }

    // highlight the bytes that share a bit with the slice (if the annotation
    // falls outside the slice, extend the slice)
    function hiliteBits(offset_bit, bits, baseCls) {
        var byteRange;

        if (!baseCls)
            baseCls = 'hover';

        var annots;
        // indexes of annotation elements just before or after selection
        var prev_anno_i = -1, next_anno_i = end + 1;
        if (annotations) {
            annots = annotations.getAnnotations();
            // annotation indexes
            var i, begin = Infinity, end = annots.length - 1;
            // find begin of annotations
            for (i = 0; i < annots.length; ++i) {
                // if the annotation starts in this slice
                if (annots[i].offset >= offset_bit) {
                    prev_anno_i = i - 1;
                    next_anno_i = prev_anno_i + 1;
                    // check if annotation is actually in the slice (i.e. if the
                    // annotation starts before the end of the slice)
                    if (annots[i].offset < offset_bit + bits) {
                        begin = i;
                    }
                    break;
                }
            }
            // if there are annotations in range, find the end
            if (begin <= end) {
                for (; i < annots.length; ++i) {
                    // if the annotation ends past the end
                    if (annots[i].offset + annots[i].length > offset_bit + bits) {
                        // end is last annotation that is contained in slice
                        end = i - 1;
                        next_anno_i = i;
                        break;
                    }
                }
                offset_bit = annots[begin].offset;
                bits = annots[end].offset - offset_bit + annots[end].length;

                // TODO: consider marking on hover too
                if (baseCls === 'selected') {
                    hiliteAnnotBits(annots, begin, end);
                }
            }

            // mark previous, "selected" and next annotations
            if (prev_anno_i >= 0) {
                annoLines[prev_anno_i].classList.add(baseCls + '-before');
            }
            for (i = begin; i <= end; ++i) {
                annoLines[i].classList.add(baseCls);
            }
            if (next_anno_i < annots.length) {
                annoLines[next_anno_i].classList.add(baseCls + '-after');
            }
        }

        // selected bits range
        hiliteBytesBits(offset_bit, bits, baseCls);

        // mark bytes before and after selection
        if (annotations) {
            var annot;
            if (prev_anno_i >= 0) {
                annot = annots[prev_anno_i];
                hiliteBytesBits(annot.offset, annot.length, baseCls + '-before');
            }
            if (next_anno_i < annots.length) {
                annot = annots[next_anno_i];
                hiliteBytesBits(annot.offset, annot.length, baseCls + '-after');
            }
        }
    }

    function hiliteBytesBits(offset_bit, bits, className) {
        var begin = offset_bit / 8;
        // annotations may be longer than the bytes
        var end_bit = Math.min(8 * ascBoxes.length, offset_bit + bits);

        if (offset_bit >= end_bit) {
            return;
        }

        if (offset_bit % 8) {
            begin = Math.floor(begin);
            ascBoxes[begin].classList.add('partial');
            hexBoxes[begin].classList.add('partial');
        }

        for (var byte_no = begin; byte_no < end_bit / 8; ++byte_no) {
            ascBoxes[byte_no].classList.add(className);
            hexBoxes[byte_no].classList.add(className);
        }

        if (end_bit % 8) {
            var end = Math.floor(end_bit / 8);
            ascBoxes[end].classList.add('partial');
            hexBoxes[end].classList.add('partial');
        }
    }

    // returns begin byte and length (in bytes) of the element (byte in boxes or
    // annotations). null if the elm element is invalid.
    function findElmBytes(src_boxes, elm) {
        if (src_boxes) {
            var byte_no = src_boxes.indexOf(elm);
            if (byte_no == -1) {
                return null;
            }
            // find first annotation that contains (part of) this byte
            if (annotations) {
                var annots = annotations.getAnnotations();
                for (var i = 0; i < annots.length; ++i) {
                    var annot = annots[i];
                    var abegin = annot.offset;
                    var aend = abegin + annot.length;
                    if (8 * byte_no < aend && abegin < 8 * (byte_no + 1)) {
                        var range = Annotations.annot_to_byterange(annot);
                        return [range[0], range[1] - range[0]];
                    }
                }
            }

            // fallback to the whole byte
            return [byte_no, 1];
        } else {
            if (!elm.classList.contains('line')) {
                return null;
            }
            var begin = Math.floor(elm.dataset.offset / 8);
            var len = elm.dataset.byteEnd - elm.dataset.byteStart;
            return [begin, len];
        }
    }

    // generated listener callback to highlight boxes and annotations
    function addSelecter(src_boxes) {
        return function (ev) {
            var byteInfo = findElmBytes(src_boxes, ev.target);
            if (!byteInfo) {
                return;
            }
            hiliteBits(8 * byteInfo[0], 8 * byteInfo[1]);
            if (autoCenter) {
                if (src_boxes) { // bytes
                    annosIntoView();
                } else { // annotations
                    bytesIntoView(byteInfo[0], byteInfo[0] + byteInfo[1]);
                }
            }
        };
    }

    function clearSelecter() {
        removeSelectionClasses('hover');
    }

    function removeSelectionClasses(base) {
        [base, base + '-before', base + '-after'].forEach(function (className) {
            var affected = container.getElementsByClassName(className);
            for (var i = affected.length - 1; i >= 0; --i) {
                var classList = affected[i].classList;
                // HACK: drop 'partial' if (1) the class to be removed is the
                // selection or (2) the class to be removed is not the selection
                // and the box is not part of a selection
                if (base === 'selected' || !classList.contains('selected')) {
                    classList.remove('partial');
                }
                classList.remove(className);
            }
        });
    }

    function togglePermSelect(boxes) {
        return function (ev) {
            var byteInfo = findElmBytes(boxes, ev.target);
            if (!byteInfo) {
                return;
            }
            var isSelected = ev.target.classList.contains('selected');
            removeSelectionClasses('selected');
            if (!isSelected) {
                hiliteBits(8 * byteInfo[0], 8 * byteInfo[1], 'selected');
                if (boxes) { // bytes
                    annosIntoView();
                } else { // annotations
                    bytesIntoView(byteInfo[0], byteInfo[0] + byteInfo[1]);
                }
                autoCenter = false;
            } else {
                // TODO: if 'partial' is kept, then the refresh is not needed
                hiliteBits(8 * byteInfo[0], 8 * byteInfo[1], 'hover');
                // no selection, no bits to highlight
                bitPanel.innerHTML = '';
                // no selection - feel free to center!
                autoCenter = true;
            }
        };
    }

    hexPanel.addEventListener('mouseover', addSelecter(hexBoxes));
    ascPanel.addEventListener('mouseover', addSelecter(ascBoxes));
    annoPanel.addEventListener('mouseover', addSelecter(null));
    hexPanel.addEventListener('mouseout', clearSelecter);
    ascPanel.addEventListener('mouseout', clearSelecter);
    annoPanel.addEventListener('mouseout', clearSelecter);
    hexPanel.addEventListener('click', togglePermSelect(hexBoxes));
    ascPanel.addEventListener('click', togglePermSelect(ascBoxes));
    annoPanel.addEventListener('click', togglePermSelect(null));

    function to_ascii(b) {
        if (b >= 0x20 && b < 0x7F) {
            return String.fromCharCode(b);
        }
        // not a printable ASCII character, ignore.
        return '.';
    }

    // center elements on screen if not already visible. elm and bottomElm must
    // have the same parent, elm must be located before bottomElm.
    function centerElement(elm, bottomElm) {
        var par = elm.parentNode;
        if (!bottomElm) bottomElm = elm;
        var parRect = par.getBoundingClientRect();
        var topRect = elm.getBoundingClientRect();
        var botRect = bottomElm.getBoundingClientRect();

        var topDiff = topRect.top - parRect.top;
        var botDiff = botRect.bottom - parRect.bottom;
        // topDiff is negative if element is clipped at top by its parent
        if (topDiff < 0) {
            // so scroll up a little bit (remove the diff)
            par.scrollTop += topDiff;
        } else if (botDiff > 0) {
            // botDiff is positive if the element bottom gets past its parent
            // bottom, so scroll down
            par.scrollTop += botDiff;
        }
    }

    // Loads an ArrayBuffer into the page (hex, ascii)
    function loadData(buffer) {
        // bytes per line
        byteView = new Uint8Array(buffer);

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

            var byteRange = Annotations.annot_to_byterange(annot);
            line.dataset.byteStart = byteRange[0];
            line.dataset.byteEnd = byteRange[1];

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
