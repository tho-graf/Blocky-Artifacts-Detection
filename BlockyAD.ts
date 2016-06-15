class NRImage {
    width: number;
    height: number;
    threshold: number;
    image: HTMLImageElement;
    pixels_lum: Uint8ClampedArray;
    pixels_result: Uint8ClampedArray;

    slider: HTMLInputElement;

    canvas_in: HTMLCanvasElement;
    imagedata_in: ImageData;
    ctx_in: CanvasRenderingContext2D;
    pixels_in: Uint8ClampedArray;

    canvas_out: HTMLCanvasElement;
    imagedata_out: ImageData;
    ctx_out: CanvasRenderingContext2D;
    pixels_out: Uint8ClampedArray;
    canvasDiv: HTMLDivElement;
    upload: HTMLInputElement;
    sliderValue: HTMLSpanElement;

    constructor(src: string) {
        this.threshold = 10;
        this.image = new Image();
        this.image.onload = (() => this.imageReady());
        this.image.src = src;
    }

    imageReady() {
        document.body.innerHTML = '';

        this.width      = this.image.width;
        this.height     = this.image.height;

        // create HTML Elements
        this.canvas_in  = document.createElement("canvas");
        this.canvas_out = document.createElement("canvas");
        this.canvasDiv = document.createElement("div");

        //set size for canvas and css.
        this.canvas_in.height   = this.canvas_out.height    = this.height;
        this.canvas_in.width    = this.canvas_out.width     = this.width;
        this.canvas_in.style.height     = this.canvas_out.style.height  = this.height + "px";
        this.canvas_in.style.width      = this.canvas_out.style.width   = this.width + "px";


        //input canvas (set image)
        this.canvasDiv.appendChild(this.canvas_in);
        this.ctx_in     = this.canvas_in.getContext("2d");
        this.ctx_in.drawImage(this.image, 0, 0, this.width, this.height);
        this.imagedata_in = this.ctx_in.getImageData(0,0,this.width, this.height);
        this.pixels_in  = this.imagedata_in.data;

        //output canvas (manipulate later)
        this.canvasDiv.appendChild(this.canvas_out);
        this.ctx_out    = this.canvas_out.getContext("2d");
        this.imagedata_out = this.ctx_out.createImageData(this.width, this.height);
        this.pixels_out = this.imagedata_out.data;

        document.body.appendChild(this.canvasDiv);

        this.generateSilder();
        this.generateUpload();

        this.pixels_lum = new Uint8ClampedArray(this.width*this.height);
        this.pixels_result = new Uint8ClampedArray(this.width*this.height);

        //calculate luminance for all pixels (rgba -> +4)
        for (var i = 0; i < this.pixels_in.length; i += 4) {
            this.pixels_lum[i/4] = this.getLuminance(this.pixels_in[i], this.pixels_in[i+1], this.pixels_in[i+2])
        }
        this.detectBlockiness(this.threshold);
    }

    generateSilder() {
        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.min = "0";
        this.slider.max = "40";
        this.slider.value = "10";

        this.slider.oninput = (event) => this.changeThresholdCallback(event);
        this.sliderValue = document.createElement("span");
        this.sliderValue.innerHTML = String(this.threshold);
        document.body.appendChild(this.slider);
        document.body.appendChild(this.sliderValue);

    }

    generateUpload() {
        this.upload = document.createElement("input");
        this.upload.type = "file";
        this.upload.id = "imgFile";
        document.body.appendChild(this.upload);
        this.upload.addEventListener("change", ((imgRef) => {
            return function () {
                if (!this.files[0].type.match(/image.*/)) {
                    throw "File Type must be an image";
                }
                let reader: FileReader = new FileReader();
                reader.onload = (e: any) => {
                    imgRef.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        })(this.image));

    }

    changeThresholdCallback(event: any) {
        this.threshold = parseInt(event.target.value);
        this.sliderValue.innerHTML = event.target.value;
        //value is a string -- if we don't parse it to int, it lagging heavily (30ms instead of 3ms)
        //this.threshold = (event.target as any).value;
        this.detectBlockiness(this.threshold);
    }

    detectHardTransitions(threshold: number): Uint8ClampedArray {
        //let start: number = new Date().valueOf();

        var result: Uint8ClampedArray = new Uint8ClampedArray(this.width*this.height);

        for (var y = 0; y < this.height ; y++) {
            for (var x = 0; x < this.width; x++) {
                let index = this.coordinatesToIndex(x, y);
                result[index] = (this.checkVertical(x, y, threshold) || this.checkHorizontal(x, y, threshold)) ? 255 : 0;
            }
        }

        return result;

        //let end: number = new Date().valueOf();
        //let secondsElapsed: number = (end - start) / 1000;
        //console.log(secondsElapsed);
    }

    checkVertical(x: number, y: number, threshold: number): boolean{
        if (y < 2)
            return false;
        if (y == this.height-1)
            return false;

        let a: number = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x, y+1)) - (this.getLuminanceVal(x, y-1) - this.getLuminanceVal(x, y));
        let b: number = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x, y+1)) - (this.getLuminanceVal(x, y+1) - this.getLuminanceVal(x, y-2));

        return (a >= threshold) && (b >= threshold);
    }

    checkHorizontal(x: number, y: number, threshold: number): boolean{
        if (x < 2)
            return false;
        if (x == this.width-1)
            return false;

        let c: number = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x+1, y)) - (this.getLuminanceVal(x-1, y) - this.getLuminanceVal(x, y));
        let d: number = (this.getLuminanceVal(x, y) - this.getLuminanceVal(x+1, y)) - (this.getLuminanceVal(x+1, y) - this.getLuminanceVal(x-2, y));

        return (c >= threshold) && (d >= threshold);
    }

    getLuminance(red: number, green: number, blue: number): number {
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }

    getLuminanceVal(x: number, y: number): number {
        return this.pixels_lum[this.coordinatesToIndex(x, y)];
    }

    coordinatesToIndex(x: number, y: number): number{
        return x + (y * this.width);
    }

    detectBlockiness(threshold: number) {
        var result_edges: Uint8ClampedArray;
        var result_casual: Uint8ClampedArray;

        var result: Uint8ClampedArray;

        //result_edges = this.detectHardTransitions(1000);
        //result_casual = this.detectHardTransitions(this.threshold);

        result = this.detectHardTransitions(this.threshold);

        //step over pixels. (rgba -> +4)
        for (var i = 0; i < this.pixels_out.length; i += 4) {

            //let value = (result_casual[i/4] && !result_edges[i/4]) ? 255 : 0;
            let value = result[i/4];

            this.pixels_out[i] = this.pixels_out[i+1] = this.pixels_out[i+2] = value;
            //no opacity
            this.pixels_out[i+3] = 255;

        }

        this.ctx_out.putImageData(this.imagedata_out, 0, 0);
    }

}


var img = new NRImage('.\\imgs\\compressed.png');