var HexViewer = (function (id) {
    'use strict';
    /* note: change in CSS too */
    var COLUMNS = 16;

    /* prefs */
    var autoCenter = true;

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

    // contains HTMLElements for annotations
    var annoLines = [];
    // annotations object
    var annotations;

    function annosIntoView() {
        ['hover-before' ,'hover', 'hover-after'].some(function (className) {
            var elms = annoPanel.getElementsByClassName(className);
            if (elms.length) {
                centerElement(elms[0]);
            }
            // stop once an centerable element is found
            return elms.length > 0;
        });
    }

    // boxes_one contains the event source element
    function addSelecter(src_boxes) {
        return function (ev) {
            var byte_no = src_boxes.indexOf(ev.target);
            if (byte_no == -1) {
                return;
            }
            hiliteBits(8 * byte_no, 8);
            if (autoCenter) {
                annosIntoView();
            }
        };
    }

    // highlight the bytes that share a bit with the slice (if the annotation
    // falls outside the slice, extend the slice)
    function hiliteBits(offset_bit, bits, baseCls) {
        var byteRange;
        var end_bit = offset_bit + bits;

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
                // if end of annotation lays in the slice (after begin of slice)
                if (annots[i].offset + annots[i].length > offset_bit) {
                    prev_anno_i = i - 1;
                    next_anno_i = prev_anno_i + 1;
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
                        next_anno_i = i;
                        break;
                    }
                }
                offset_bit = annots[begin].offset;
                end_bit = annots[end].offset + annots[end].length;
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

        byteRange = Annotations.bits_to_byterange(offset_bit, end_bit);
        hiliteByteRange(byteRange[0], byteRange[1], baseCls);

        // mark bytes before and after selection
        if (annotations) {
            if (prev_anno_i >= 0) {
                byteRange = Annotations.annot_to_byterange(annots[prev_anno_i]);
                hiliteByteRange(byteRange[0], byteRange[1], baseCls + '-before');
            }
            if (next_anno_i < annots.length) {
                byteRange = Annotations.annot_to_byterange(annots[next_anno_i]);
                hiliteByteRange(byteRange[0], byteRange[1], baseCls + '-after');
            }
        }
    }

    function hiliteByteRange(begin, end, className) {
        // annotations may be longer than the bytes
        end = Math.min(ascBoxes.length, end);
        for (var byte_no = begin; byte_no < end; ++byte_no) {
            ascBoxes[byte_no].classList.add(className);
            hexBoxes[byte_no].classList.add(className);
        }
    }

    function clearSelecter() {
        removeSelectionClasses('hover');
    }

    function removeSelectionClasses(base) {
        [base, base + '-before', base + '-after'].forEach(function (className) {
            var affected = container.getElementsByClassName(className);
            for (var i = affected.length - 1; i >= 0; --i) {
                affected[i].classList.remove(className);
            }
        });
    }

    function togglePermSelect(boxes) {
        return function (ev) {
            var byte_no = boxes.indexOf(ev.target);
            if (byte_no == -1) {
                return;
            }
            var isSelected = boxes[byte_no].classList.contains('selected');
            removeSelectionClasses('selected');
            if (!isSelected) {
                hiliteBits(8 * byte_no, 8, 'selected');
                annosIntoView();
                autoCenter = false;
            } else {
                // no selection - feel free to center!
                autoCenter = true;
            }
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
        var len = line.dataset.byteEnd - line.dataset.byteStart;
        hiliteBits(8 * line.dataset.byteStart, 8 * len);
        if (autoCenter) {
            var begin_i = Math.min(ascBoxes.length - 1, begin);
            centerElement(ascBoxes[begin_i]);
        }
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

    // center an element on screen if not already visible
    function centerElement(elm) {
        if (elm.previousSibling)
            elm = elm.previousSibling;
        elm.scrollIntoView();
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
