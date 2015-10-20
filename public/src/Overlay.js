
/**
* @class
* @param {Canvas} canvas
*/
var Overlay = function( canvas ){

  // master canvas that is visible
  this.canvas_ = canvas;
  this.ctx_ = canvas.getContext('2d');
  // canvas with b&w background
  this.bgCanvas_ = document.createElement('canvas');
  this.bgCtx_ = this.bgCanvas_.getContext('2d');
  this.bgDegrees_ = null;
  // selection canvas
  this.blockCanvas_ = document.createElement('canvas');
  this.blockCtx_ = this.blockCanvas_.getContext('2d');
  this.blockDegrees_ = null;
  // copy canvas for toDataURL()
  this.copyCanvas_ = null;
  this.copyCtx_ = null;
};

angular.extend( Overlay.prototype, {

  refresh:function(){

    var canvas = this.canvas_,
        parent = canvas.parentNode;

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;

  },

  converterToGray_:function(){

    var ctx = this.ctx_,
        canvas = this.canvas_,
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height),
        data = imgData.data,
        dataSize = data.length;

        for (var i = 0; i < dataSize ; i=i+4) {
          // var r = data[i] ;
          // var g = data[i + 1];
          // var b = data[i + 2];
          var brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];

          data[i] = brightness;
          data[i + 1] = brightness;
          data[i + 2] = brightness;
        }
        ctx.putImageData(imgData, 0, 0);
  },

  /**
   * @param {Canvas} canvas
   * @param {Context} ctx
   * @param {Image} img
   * @param {Integer} Number of degrees (e.g. 270)
   */
  drawBackground: function (canvas, ctx, img, degrees) {
    //console.log( img.clientWidth );
    if (this.bgCanvas_.width !== canvas.width || this.bgCanvas_.height !== canvas.height || this.bgDegrees_ !== degrees) {
      this.bgCanvas_.width = canvas.width;
      this.bgCanvas_.height = canvas.height;
      this.drawRotated(this.bgCanvas_, this.bgCtx_, img, degrees);
      this.converterToGray_(this.bgCanvas_, this.bgCtx_);
      this.bgDegrees_ = degrees;
    }
    ctx.drawImage(this.bgCanvas_, 0, 0, canvas.width, canvas.height);
    // ctx.drawImage(img, 0, 0, width, height);
  },

  /**
   * @param {Canvas} canvas
   * @param {Context} ctx
   * @param {Image} img
   * @param {Number} startLeft
   * @param {Number} startTop
   * @param {Number} imageWidth
   * @param {Number} imageHeight
   * @param {Number} blockWidth
   * @param {Number} blockHeight
   * @param {boolean} circle whether to draw a circle
   */
  drawImageBlock: function (canvas, ctx, img, startLeft, startTop, imageWidth, imageHeight, blockWidth, blockHeight, circle, degrees) {
    var width = canvas.width,
      height = canvas.height,
      rateW = blockWidth / width,
      rateH = blockHeight / height,
      imgLeft = startLeft / (width) * imageWidth,
      imgTop = startTop / (height) * imageHeight,
      endImgWidth = imageWidth * rateW,
      endImgHeight = imageHeight * rateH;

    if (this.blockCanvas_.width !== imageWidth || this.blockCanvas_.height !== imageHeight || this.blockDegrees_ !== degrees) {
      this.blockCanvas_.width = imageWidth;
      this.blockCanvas_.height = imageHeight;
      this.drawRotated(this.blockCanvas_, this.blockCtx_, img, degrees);
      this.blockDegrees_ = degrees;
    }

    // draw circle - http://stackoverflow.com/questions/8609739/how-to-get-a-non-rectangular-shape-using-getimagedata
    if (circle) {
      ctx.beginPath();
      ctx.arc(startLeft + (blockWidth / 2), startTop + (blockWidth / 2), blockWidth / 2, 0, Math.PI * 2, true);

      ctx.clip();
    }
    ctx.drawImage(this.blockCanvas_, imgLeft, imgTop, endImgWidth, endImgHeight, startLeft, startTop, blockWidth, blockHeight);
  },

  /**
   * @param {Canvas} canvas
   * @param {Context} ctx
   * @param {Image} img
   * @param {Integer} Number of degrees (e.g. 270)
   */
  drawRotated: function (canvas, ctx, img, degrees) {
    var width = canvas.width,
      height = canvas.height;

    if (degrees !== 0) {
      ctx.save();
      // move to the center of the canvas
      ctx.translate(width / 2, height / 2);
      ctx.rotate(degrees * Math.PI / 180);
      // draw it up and to the left by half the width
      // and height of the image
      ctx.drawImage(img, -(width / 2), -(height / 2), width, height);
      // and restore the co-ords to how they were when we began
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, width, height);
    }
  },


  /**
   * @param {Image} img
   * @param {Object} selected
   * @param {Object} imageSize
   * @param {Boolean} circle whether to draw a circle
   * @param {Number} degrees Degrees to rotate (e.g. 270)
   */
  render: function (img, selected, imageSize, circle, degrees) {
    this.widthRate = imageSize.width / this.canvas_.width;
    this.heightRate = imageSize.height / this.canvas_.height;

    //console.log( img.clientWidth );
    // this.drawRotated(this.canvas_, this.ctx_, img, degrees);
    // ctx.drawImage(img, 0, 0, width, height);

    // this.converterToGray_();
    this.drawBackground(this.canvas_, this.ctx_, img, degrees);

    //console.log( selected, widthRate, widthRate * selected.width, imageSize.width, imageSize.height );

    this.drawImageBlock(this.canvas_, this.ctx_, img, selected.left, selected.top, imageSize.width, imageSize.height, selected.width, selected.height, circle, degrees);
  },

  /**
   * @param {Image} img
   * @param {Object} selected
   * @param {Object} imageSize
   * @param {Number} degrees Degrees to rotate (e.g. 270)
   */
  refreshAndRender: function (img, selected, imageSize, circle, degrees) {
    var rotateDegrees = angular.isNumber(degrees) ? degrees : 0;
    this.refresh();
    this.render(img, selected, imageSize, circle, rotateDegrees);
  },

  /**
  * @param {String} type
  * @param {Object} selected
  * @return String
  */
  toDataURL:function( type, selected ){
    var canvas = this.canvas_,
      copyCanvas = this.copyCanvas_,
      ctx = this.copyCtx_;

    if (!copyCanvas) {
      copyCanvas = this.copyCanvas_ = document.createElement('canvas');
      ctx = this.copyCtx_ = copyCanvas.getContext('2d');
    }

    copyCanvas.width = selected.width;
    copyCanvas.height = selected.height;

    //this.drawImageBlock( copyCanvas, ctx, canvas, selected.left, selected.top, canvas.width, canvas.height, selected.width, selected.height );
    ctx.drawImage(canvas, selected.left, selected.top, selected.width, selected.height, 0, 0, selected.width, selected.height);

    return copyCanvas.toDataURL(type);

  }

});


