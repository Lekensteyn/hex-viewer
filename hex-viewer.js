var HexViewer = (function (id) {
    'use strict';
    /* note: change in CSS too */
    const COLUMNS = 16;

    var container = document.getElementById(id);
    var hexPanel = document.createElement('div');
    var ascPanel = document.createElement('div');
    var annoPanel = document.createElement('div');
    container.className = 'hex-viewer';
    hexPanel.className = 'hex';
    ascPanel.className = 'asc';
    annoPanel.className = 'annotations';
    [hexPanel, ascPanel, annoPanel].forEach(function (panel) {
        container.appendChild(panel);
    });

    // contains HTMLElements for the hex and ascii boxes
    var hexBoxes = [];
    var ascBoxes = [];
    var selectedBytes = [];

    // boxes_one contains the event source element
    function addSelecter(targetContainer, boxes_one, boxes_two) {
        return function (ev) {
            var byte_no = boxes_one.indexOf(ev.target);
            if (byte_no == -1) {
                return;
            }
            boxes_two[byte_no].classList.add('hover');
        };
    }

    function clearSelecter(target) {
        return function () {
            var affected = target.getElementsByClassName('hover');
            for (var i = affected.length - 1; i >= 0; --i) {
                affected[i].classList.remove('hover');
            }
        };
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

    hexPanel.addEventListener('mouseover',
        addSelecter(ascPanel, hexBoxes, ascBoxes));
    ascPanel.addEventListener('mouseover',
        addSelecter(hexPanel, ascBoxes, hexBoxes));
    hexPanel.addEventListener('mouseout', clearSelecter(ascPanel));
    ascPanel.addEventListener('mouseout', clearSelecter(hexPanel));
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
        annoPanel.innerHTML = '';

        // appending directly slows down
        var hexFragment = document.createDocumentFragment();
        var ascFragment = document.createDocumentFragment();

        // length of biggest line number (in hex)
        //var lineno_length = byteView.byteLength.toString(16).length;
        var lineno_length = 7; // hard-coded 8 (including colon) in CSS
        var lineno_pad = ' '.repeat(lineno_length);

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

    // exports
    this.loadData = loadData;
});
/* vim: set sw=4 et ts=4: */
