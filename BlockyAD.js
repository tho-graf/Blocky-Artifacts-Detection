var NRImage = (function () {
    function NRImage(src) {
        var _this = this;
        this.threshold = 10;
        this.image = new Image();
        this.image.onload = (function () { return _this.imageReady(); });
        this.image.src = src;
    }
    NRImage.prototype.imageReady = function () {
        this.width = this.image.width;
        this.height = this.image.height;
        // create HTML Elements
        this.canvas_in = document.createElement("canvas");
        this.canvas_out = document.createElement("canvas");
        //set size for canvas and css.
        this.canvas_in.height = this.canvas_out.height = this.height;
        this.canvas_in.width = this.canvas_out.width = this.width;
        this.canvas_in.style.height = this.canvas_out.style.height = this.height + "px";
        this.canvas_in.style.width = this.canvas_out.style.width = this.width + "px";
        //input canvas (set image)
        document.body.appendChild(this.canvas_in);
        this.ctx_in = this.canvas_in.getContext("2d");
        this.ctx_in.drawImage(this.image, 0, 0, this.width, this.height);
        this.imagedata_in = this.ctx_in.getImageData(0, 0, this.width, this.height);
        this.pixels_in = this.imagedata_in.data;
        //output canvas (manipulate later)
        document.body.appendChild(this.canvas_out);
        this.ctx_out = this.canvas_out.getContext("2d");
        this.imagedata_out = this.ctx_out.createImageData(this.width, this.height);
        this.pixels_out = this.imagedata_out.data;
        this.generateSilder();
        this.pixels_lum = new Uint8ClampedArray(this.width * this.height);
        this.pixels_result = new Uint8ClampedArray(this.width * this.height);
        //calculate luminance for all pixels (rgba -> +4)
        for (var i = 0; i < this.pixels_in.length; i += 4) {
            this.pixels_lum[i / 4] = this.getLuminance(this.pixels_in[i], this.pixels_in[i + 1], this.pixels_in[i + 2]);
        }
        this.update();
    };
    NRImage.prototype.generateSilder = function () {
        var _this = this;
        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "40";
        this.slider.value = "10";
        this.slider.oninput = function (event) { return _this.changeThresholdCallback(event); };
        document.body.appendChild(this.slider);
    };
    NRImage.prototype.changeThresholdCallback = function (event) {
        this.threshold = parseInt(event.target.value);
        //value is a string -- if we don't parse it to int, it lagging heavily (30ms instead of 3ms)
        //this.threshold = (event.target as any).value;
        this.update();
    };
    NRImage.prototype.detectBlocks = function () {
        //let start: number = new Date().valueOf();
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var index = this.coordinatesToIndex(x, y);
                this.pixels_result[index] = (this.checkVertical(x, y) || this.checkHorizontal(x, y)) ? 255 : 0;
            }
        }
        //let end: number = new Date().valueOf();
        //let secondsElapsed: number = (end - start) / 1000;
        //console.log(secondsElapsed);
    };
    NRImage.prototype.checkVertical = function (x, y) {
        if (y < 2)
            return false;
        if (y == this.height - 1)
            return false;
        var a = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x, y + 1)) - (this.getLuminanceVal(x, y - 1) - this.getLuminanceVal(x, y));
        var b = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x, y + 1)) - (this.getLuminanceVal(x, y + 1) - this.getLuminanceVal(x, y - 2));
        return (a >= this.threshold) && (b >= this.threshold);
    };
    NRImage.prototype.checkHorizontal = function (x, y) {
        if (x < 2)
            return false;
        if (x == this.width - 1)
            return false;
        var c = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x + 1, y)) - (this.getLuminanceVal(x - 1, y) - this.getLuminanceVal(x, y));
        var d = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x + 1, y)) - (this.getLuminanceVal(x + 1, y) - this.getLuminanceVal(x - 2, y));
        return (c >= this.threshold) && (d >= this.threshold);
    };
    NRImage.prototype.getLuminance = function (red, green, blue) {
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    NRImage.prototype.getLuminanceVal = function (x, y) {
        return this.pixels_lum[this.coordinatesToIndex(x, y)];
    };
    NRImage.prototype.coordinatesToIndex = function (x, y) {
        return x + (y * this.width);
    };
    NRImage.prototype.update = function () {
        this.detectBlocks();
        //step over pixels. (rgba -> +4)
        for (var i = 0; i < this.pixels_out.length; i += 4) {
            this.pixels_out[i] = this.pixels_out[i + 1] = this.pixels_out[i + 2] = this.pixels_result[i / 4];
            //no opacity
            this.pixels_out[i + 3] = 255;
        }
        this.ctx_out.putImageData(this.imagedata_out, 0, 0);
    };
    return NRImage;
}());
var img = new NRImage('.\\imgs\\compressed.png');
//# sourceMappingURL=BlockyAD.js.map