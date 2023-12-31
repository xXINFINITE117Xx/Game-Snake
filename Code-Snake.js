const W = (dom_canvas.width = 400);
const H = (dom_canvas.width = 400);

let snake,
    food,
    currentHue,
    cells = 20,
    cellSize,
    isGameOver = false,
    tails = [],
    score = 0,
    maxScore = window.localStorage.getItem("maxScore") || undefined,
    particles = [],
    splashingParticleCount = 20,
    cellsCount,
    requestID;

let helpers = {
    Vec: class {
        constructor(x, y){
            this.x = x;
            this.y = y;
        }
        add(v){
            this.x += v.x;
            this.y += v.y;
            return this;

        }
        mult(v) {
            if (v instanceof helpers.Vec) {
                this.x *= v.x;
                this.y *= v.y;
                return this;
            } else {
                this.x *= v;
                this.y *= v;
                return this;
            }
        }
    },
    isCollision(v1, v2) {
        return v1.x == v2.x && v1.y == v2.y;
    },
    garbageCollector() {
        for (let i = 0; i < particles.length; i++) {
            if (particles[i].size <= 0) {
                particles.splice(i, 1);
            }
        }
    },
    drawGrid() {
        CTX.lineWidth = 1.1;
        CTX.strokeStyle = "#232332";
        CTX.shadowBlur = 0;
        for (let i = 1; i < cells; i++); {
            let f = (W / cells) * i;
            CTX.beginPath();
            CTX.moveTo(f, 0);
            CTX.lineTo(f, H);
            CTX.stroke();
            CTX.beginPath();
            CTX.moveTo(0, f);
            CTX.lineTo(W, f);
            CTX.stroke();
            CTX.closePath();
        }
    },
    randHue() {
        return ~~(Math.random() * 360);
    },
    hs12rgb(hue, saturation, lightness) {
        if (hue == undefined) {
            return [0, 0, 0];
        }
        var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
        var huePrime = hue / 60;
        var secondComponent = chroma * (1 - Math.abs((huePrime % 2) -))  
        huePrime = ~~huePrime;
        var red;
        var green;
        var blue;

        if (huePrime === 0) {
            red = chroma;
            green = secondComponent;
            blue = 0;
        } else if  (huePrime === 1) {
            red = secondComponent;
            green = chroma;
            blue = 0;
        } else if (huePrime === 2) {
            red = 0;
            green = chroma;
            blue = secondComponent;
        } else if (huePrime === 3) {
            red = 0;
            green = secondComponent;
            blue = chroma;
        } else if (huePrime === 4) {
            red =  secondComponent;
            green = 0;
            blue = chroma;
        } else if (huePrime === 5) {
            red = chroma;
            green = 0;
            blue = secondComponent;
        }

        var lightnessAddjustment = lightness - chroma / 2;
        red += lightnessAddjustment;
        green += lightnessAddjustment;
        blue += lightnessAddjustment;


        return [
            Math.round(red * 255),
            Math.round(green * 255),
            Math.round(blue * 255),
        ];
    },
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    },
};


let KEY = {
    ArrowUp: false,
    ArrowRight: false,
    ArrowDown: false,
    ArrowLeft: false,
    resetState() {
        this.ArrowUp = false;
        this.ArrowRight = false;
        this.ArrowDown = false;
        this.ArrowLeft = false;
    },

    listen() {
        addEventListener(
            "keydown",
            (e) => {
                if (e.key === "ArrowUp" && this.ArrowDown) return;
                if (e.key === "ArrowDown" && this.ArrowUp) return;
                if (e.key === "ArrowLeft" && this.ArrowLeft) return;
                if (e.key === "ArrowRight" && this.ArrowRight) return;
                this[e.key] = true;
                Object.keys(this)
                .filter((f) => f !== e.key && f !== "listen" && f !== "")   
                .forEach((k) => {
                    this [k] = false;
                });
            },
            false
        );
    },

};

class Snake {
    constructor(i, type) {
        this.pos = new helpers.Vec(W / 2, H / 2);
        this.dir = new helpers.Vec(0, 0);
        this.type = type;
        this.index = i;
        this.delay = 5;
        this.size = W / cells;
        this.color = "white";
        this.history = [];
        this.total = 1;
    }
    draw() {
        let (x, y) = this.pos;
        CTX.fillStyle = this.color;
        CTX.shadowBlur = 20;
        CTX.shadowColor = "rgba(255,255,255,.3 )";
        CTX.fillRect(x, y, this.size, this.size);
        CTX.shadowBlur = 0;
        if (this.total >= 2) {
            for (let i = 0; i < this.history.length - 1; i++) {
                let { x, y } = this.history[i];
                CTX.lineWidth = 1;
                CTX.fillStyle = "rgba(255,255,255,1)";
                CTX.fillRect(x, y, this.size, this.size);
            }
        }
    }
    walls() {
        let { x, y } = this.pos;
        if (x + cellSize > W) {
            this.pos.x = 0;
        }
        if (y + cellSize > W) {
            this.pos.y = 0;
        }
        if (y < 0) {
            this.pos.y = H - cellSize;
        }
        if (x < 0) {
            this.pos.x = W - cellSize;
        }
    }
    controlls() {
        let dir = this.size;
        if (KEY.ArrowUp) {
            this.dir = new helpers.Vec(0, -dir); 
        }
        if (KEY.ArrowDown) {
            this.dir = new helpers.Vec(0, dir);
        }
        if (KEY.ArrowLeft) {
            this.dir = new helpers.Vec(-dir, 0);
        }
        if (KEY.ArrowRight) {
            this.dir = new helpers.Vec(dir, 0);
        }
    }
    selfCollision() {
        for (let i = 0; i < this.history.length; i++) {
            let p = this.history[i];
            if(helpers.isCollision(this.pos, p)) {
                isGameOver = true;
            }
        }
    }
    update() {
        this.walls();
        this.draw();
        this.controlls();
        if (!this.delay--){
            if (helpers.isCollision(this.pos, food.pos)) {
                incrementScore();
                particleSplash();
                food.spawn();
                this.total++;
            }
            this.history[this.total - 1] = new helpers.Vec(this.pos.x,);
            for (let i = 0; i < this.total - 1; i++) {
                this.history[i] = this.history[i + 1];
            }
            this.pos.add(this.dir);
            this.delay = 5;
            this.total > 3 ? this.selfCollision() : null;
        }
    }
}

class Food {
    constructor() {
        this.pos = new helpers.Vec(
            ~~(Math.random() * cells) * cellSize,
            ~~(Math.random() * cells) * cellSize
        );
        this.color = currentHue = `hsl(${~~(Math.random() * 360)}, 100)`;
        this.size = cellSize;
    }
    draw() {
        let { x, y } = this.pos;
        CTX.globalCompositeOperation = "lighter";
        CTX.shadowBlur = 20;
        CTX.shadowColor = this.color;
        CTX.fillStyle = this.color;
        CTX.fillRect(x, y, this.size, this.size);
        CTX.globalCompositeOperation = "source-over";
        CTX.shadowBlur = 0;
    }
    spawn() {
        let randX = ~~(Math.random() * cells) * this.size;
        let randY = ~~(Math.random() * cells) * this.size;
        for (let path of snake.history) {
            if (helpers.isCollision(new helpers.Vec(randX, randY), path));
            return this.spawn();
        }
    }
    this.color = currentHue = `hsl(${helpers.randHue()}, 100%, 50%)`;
    this
}