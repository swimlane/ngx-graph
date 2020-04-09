export function Step(context, t) {
  this._context = context;
  this._t = t;
}

Step.prototype = {
  areaStart() {
    this._line = 0;
  },
  areaEnd() {
    this._line = NaN;
  },
  lineStart() {
    this._x = this._y = NaN;
    this._point = 0;
  },
  lineEnd() {
    if (0 < this._t && this._t < 1 && this._point === 2) this._context.lineTo(this._x, this._y);
    if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
    // tslint:disable-next-line: ban-comma-operator
    if (this._line >= 0) (this._t = 1 - this._t), (this._line = 1 - this._line);
  },
  point(x, y) {
    x = +x;
    y = +y;
    switch (this._point) {
      case 0:
        this._point = 1;
        this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y);
        break;
      case 1:
        this._point = 2; // proceed
      default: {
        let xN;
        let yN;
        let mYb;
        let mYa;
        if (this._t <= 0) {
          xN = Math.abs(x - this._x) * 0.25;
          yN = Math.abs(y - this._y) * 0.25;
          mYb = this._y < y ? this._y + yN : this._y - yN;
          mYa = this._y > y ? y + yN : y - yN;

          this._context.quadraticCurveTo(this._x, this._y, this._x, mYb);
          this._context.lineTo(this._x, mYa);
          this._context.quadraticCurveTo(this._x, y, this._x + xN, y);
          this._context.lineTo(x - xN, y);
        } else {
          const x1 = this._x * (1 - this._t) + x * this._t;

          xN = Math.abs(x - x1) * 0.25;
          yN = Math.abs(y - this._y) * 0.25;
          mYb = this._y < y ? this._y + yN : this._y - yN;
          mYa = this._y > y ? y + yN : y - yN;

          this._context.quadraticCurveTo(x1, this._y, x1, mYb);
          this._context.lineTo(x1, mYa);
          this._context.quadraticCurveTo(x1, y, x1 + xN, y);
          this._context.lineTo(x - xN, y);
        }
        break;
      }
    }
    // tslint:disable-next-line: ban-comma-operator
    (this._x = x), (this._y = y);
  }
};

export const stepRound = function (context) {
  return new Step(context, 0.5);
};

export const stepRoundBefore = function (context) {
  return new Step(context, 0);
};

export const stepRoundAfter = function (context) {
  return new Step(context, 1);
};
