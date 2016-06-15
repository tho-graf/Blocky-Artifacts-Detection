/**
 * @author Thomas Kempel
 */
var NRImage = (function () {
    function NRImage(src) {
        var _this = this;
        this.threshold = 10;
        this.image = new Image();
        this.image.onload = (function () { return _this.imageReady(); });
        this.image.src = src;
    }
    NRImage.prototype.imageReady = function () {
        document.body.innerHTML = '';
        this.width = this.image.width;
        this.height = this.image.height;
        // create HTML Elements
        this.canvas_in = document.createElement("canvas");
        this.canvas_out = document.createElement("canvas");
        this.canvasDiv = document.createElement("div");
        //set size for canvas and css.
        this.canvas_in.height = this.canvas_out.height = this.height;
        this.canvas_in.width = this.canvas_out.width = this.width;
        this.canvas_in.style.height = this.canvas_out.style.height = this.height + "px";
        this.canvas_in.style.width = this.canvas_out.style.width = this.width + "px";
        //input canvas (set image)
        this.canvasDiv.appendChild(this.canvas_in);
        this.ctx_in = this.canvas_in.getContext("2d");
        this.ctx_in.drawImage(this.image, 0, 0, this.width, this.height);
        this.imagedata_in = this.ctx_in.getImageData(0, 0, this.width, this.height);
        this.pixels_in = this.imagedata_in.data;
        //output canvas (manipulate later)
        this.canvasDiv.appendChild(this.canvas_out);
        this.ctx_out = this.canvas_out.getContext("2d");
        this.imagedata_out = this.ctx_out.createImageData(this.width, this.height);
        this.pixels_out = this.imagedata_out.data;
        document.body.appendChild(this.canvasDiv);
        this.generateSilder();
        this.generateUpload();
        this.pixels_lum = new Uint8ClampedArray(this.width * this.height);
        this.pixels_result = new Uint8ClampedArray(this.width * this.height);
        //calculate luminance for all pixels (rgba -> +4)
        for (var i = 0; i < this.pixels_in.length; i += 4) {
            this.pixels_lum[i / 4] = this.getLuminance(this.pixels_in[i], this.pixels_in[i + 1], this.pixels_in[i + 2]);
        }
        this.detectBlockiness(this.threshold);
    };
    NRImage.prototype.generateSilder = function () {
        var _this = this;
        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "40";
        this.slider.value = "10";
        this.slider.oninput = function (event) { return _this.changeThresholdCallback(event); };
        this.sliderValue = document.createElement("span");
        this.sliderValue.innerHTML = String(this.threshold);
        document.body.appendChild(this.slider);
        document.body.appendChild(this.sliderValue);
    };
    NRImage.prototype.generateUpload = function () {
        this.upload = document.createElement("input");
        this.upload.type = "file";
        this.upload.id = "imgFile";
        document.body.appendChild(this.upload);
        this.upload.addEventListener("change", (function (imgRef) {
            return function () {
                if (!this.files[0].type.match(/image.*/)) {
                    throw "File Type must be an image";
                }
                var reader = new FileReader();
                reader.onload = function (e) {
                    imgRef.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            };
        })(this.image));
    };
    NRImage.prototype.changeThresholdCallback = function (event) {
        this.threshold = parseInt(event.target.value);
        this.sliderValue.innerHTML = event.target.value;
        //value is a string -- if we don't parse it to int, it lagging heavily (30ms instead of 3ms)
        //this.threshold = (event.target as any).value;
        this.detectBlockiness(this.threshold);
    };
    NRImage.prototype.detectHardTransitions = function (threshold) {
        //let start: number = new Date().valueOf();
        var result = new Uint8ClampedArray(this.width * this.height);
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var index = this.coordinatesToIndex(x, y);
                result[index] = (this.checkVertical(x, y, threshold) || this.checkHorizontal(x, y, threshold)) ? 255 : 0;
            }
        }
        return result;
        //let end: number = new Date().valueOf();
        //let secondsElapsed: number = (end - start) / 1000;
        //console.log(secondsElapsed);
    };
    NRImage.prototype.checkVertical = function (x, y, threshold) {
        if (y < 2)
            return false;
        if (y == this.height - 1)
            return false;
        var a = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x, y + 1)) - (this.getLuminanceVal(x, y - 1) - this.getLuminanceVal(x, y));
        var b = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x, y + 1)) - (this.getLuminanceVal(x, y + 1) - this.getLuminanceVal(x, y - 2));
        return (a >= threshold) && (b >= threshold);
    };
    NRImage.prototype.checkHorizontal = function (x, y, threshold) {
        if (x < 2)
            return false;
        if (x == this.width - 1)
            return false;
        var c = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x + 1, y)) - (this.getLuminanceVal(x - 1, y) - this.getLuminanceVal(x, y));
        var d = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x + 1, y)) - (this.getLuminanceVal(x + 1, y) - this.getLuminanceVal(x - 2, y));
        return (c >= threshold) && (d >= threshold);
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
    NRImage.prototype.detectBlockiness = function (threshold) {
        var result_edges;
        var result_casual;
        var result;
        //result_edges = this.detectHardTransitions(1000);
        //result_casual = this.detectHardTransitions(this.threshold);
        result = this.detectHardTransitions(this.threshold);
        //step over pixels. (rgba -> +4)
        for (var i = 0; i < this.pixels_out.length; i += 4) {
            //let value = (result_casual[i/4] && !result_edges[i/4]) ? 255 : 0;
            var value = result[i / 4];
            this.pixels_out[i] = this.pixels_out[i + 1] = this.pixels_out[i + 2] = value;
            //no opacity
            this.pixels_out[i + 3] = 255;
        }
        this.ctx_out.putImageData(this.imagedata_out, 0, 0);
    };
    return NRImage;
}());
var img = new NRImage('.\\imgs\\compressed.png');
//# sourceMappingURL=BlockyAD.js.map