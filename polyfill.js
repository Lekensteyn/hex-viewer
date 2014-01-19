if (!''.repeat) {
    // ECMAScript 6
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat
    String.prototype.repeat = function (count) {
        // cast to int
        count = Math.floor(count);

        if (count < 0) {
            throw new RangeError('repeat count must be non-negative');
        } else if (count > Infinity) {
            throw new RangeError('repeat count must be less than infinity');
        }
        return new Array(count + 1).join(this);
    };
}
