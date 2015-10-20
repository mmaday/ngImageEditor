
(function( angular ){

'use strict';



var app = angular.module( 'ngImageEditor', [] );



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




app.directive( 'ngImageEditor', ['$q', function( $q ){

  var getImageSize = function( currentImg ){

    var img = new Image(),
        div = document.createElement('div'),
        deferred = $q.defer(),
        $body = angular.element( document.body );

    img.crossOrigin = 'use-credentials';

    div.style.cssText = 'width:0px;height:0px;overflow:hidden;';

    img.onload = function(){

      var width, height;

      width = img.width;
      height = img.height;

      div.parentNode.removeChild( div );

      deferred.resolve({width:width,height:height});
    };

    div.appendChild( img );
    img.src = angular.isString( currentImg )? currentImg:currentImg.src;
    $body.append( div );

    return deferred.promise;
  };


  return {

    scope:{
      imgSrc:"=",
      ngImageEditor:"=",
      onImgChange:"&",
      enabledResizeSelector:"=",
      enabledResizeAspectLock: '=',
      enabledResizeCircle: '=',
      imgSelected:"=",
      imgProps: '=',
      rotateDegrees: '='
    },

    template: '<div ng-mousemove="move( $event )" ng-mouseup="cancel( $event )" unselectable="on">' +
      '<img unselectable="on" style="opacity:0;user-drag: none;width:100%;height:100%;" crossorigin="use-credentials" ng-src="{{imgSrc}}" ng-mousedown="$event.preventDefault()" />' +
      '<canvas width="100%" height="100%" style="position:absolute;top:0px;left:0px;"></canvas>' +
      '<div ng-image-selected enabled-resize-aspect-lock="enabledResizeAspectLock" enabled-resize-circle="enabledResizeCircle"></div>' +
      '</div>',

    /**
    * @param {Scope} $scope
    * @param {jqlite|jQuery} $element
    * @param {Attribute} $attrs
    */
    controller:[ '$scope', '$element', '$attrs', function( $scope, $element, $attrs ){

      var canvas, $canvas, overlay, img, imgSize, $body;

      $element.css({
        'position': 'relative',
        'user-drag':'none'
      }).attr('unselectable','on');

      $canvas = $element.find( 'canvas' );
      canvas = $canvas[0];
      overlay = new Overlay( canvas );
      img = $element.find( 'img' )[0];
      //img.crossOrigin = "use-credentials";
      $body = angular.element( document.body );

      var watcher = {

        /**
        * @param {String} src
        */
        imgSrc:function( src ){

          var promise = getImageSize( src );

          promise.then(function( size ){
            imgSize = size;

            if (imgSize && $scope.enabledResizeAspectLock && $scope.imgSelected.height !== $scope.imgSelected.width) {
              $scope.resizeSelected($scope.imgSelected.top, $scope.imgSelected.left, $scope.imgSelected.width, $scope.imgSelected.height);
              // console.log('balanceSquare', img, $scope.imgSelected);
            }
            overlay.refreshAndRender(img, $scope.imgSelected, imgSize, $scope.enabledResizeCircle, $scope.rotateDegrees);
            if (imgSize && overlay.canvas_) {
              angular.extend($scope.imgProps || {}, imgSize, {
                canvasHeight: overlay.canvas_.height,
                canvasWidth: overlay.canvas_.width,
                heightRate: overlay.heightRate,
                widthRate: overlay.widthRate
              });
            }
            $scope.onImgChange();
            //console.log( overlay.toDataURL( "image/png" , $scope.selected ) );
          });

        },

        /**
        * @param {Object} selected
        */
        selected:function( selected ){

          if ($scope.dragEvent === null && imgSize) {
            overlay.refreshAndRender(img, selected, imgSize, $scope.enabledResizeCircle, $scope.rotateDegrees);
          }
        },

        rotateDegrees: function(degrees) {
          if (imgSize) {
            overlay.refreshAndRender(img, $scope.imgSelected, imgSize, $scope.enabledResizeCircle, degrees);
          }
        }
      };

      $scope.$watch( 'imgSrc', watcher.imgSrc);
      $scope.$watch('rotateDegrees', watcher.rotateDegrees);
      $scope.$watchCollection('imgSelected', watcher.selected);


      angular.extend( $scope, {

        /**
        * @param {Event} $event
        */
        move : function( $event ){

          var dragEvent = $scope.dragEvent,
              resizeStartEvent = $scope.resizeStartEvent,
              selected = $scope.imgSelected,
              maxY = $element[0].clientHeight - selected.height,
              maxX = $element[0].clientWidth - selected.width,
              top, left;

          if ( dragEvent ) {

            //console.log( $event );
            top = selected.top - ( dragEvent.clientY -  $event.clientY );
            left = selected.left - ( dragEvent.clientX - $event.clientX );

            selected.top = top < 0 ? 0 :
                           top > maxY ? maxY : top;
            selected.left = left < 0 ? 0 :
                            left > maxX ? maxX : left;

            overlay.refreshAndRender(img, selected, imgSize, $scope.enabledResizeCircle, $scope.rotateDegrees);

            $scope.dragEvent = $event;

          } else if ( resizeStartEvent ) {

            this.onResizeSelected( $event );
          }
        },

        /**
        * @param {Event} $event
        */
        onResizeSelected:function( $event ){

            var resizeStartEvent = $scope.resizeStartEvent,
                y = resizeStartEvent.clientY - $event.clientY,
                x = resizeStartEvent.clientX - $event.clientX,
                resizeDirection = $scope.resizeDirection,
                aspectLock = $scope.enabledResizeAspectLock,
                selected = $scope.selected,
                absY, absX, maxXY,
                lastTop, lastLeft, lastHeight, lastWidth;

            if (aspectLock) {
              absY = Math.abs(y);
              absX = Math.abs(x);

              switch (resizeDirection) {
              case 'nw':
                maxXY = absY > absX ? y : x;
                lastTop = selected.top - maxXY;
                lastLeft = selected.left - maxXY;
                lastWidth = selected.width + maxXY;
                lastHeight = selected.height + maxXY;
                break;

              case 'ne':
                maxXY = absY > absX ? (y * -1) : x;
                lastTop = selected.top + maxXY;
                lastLeft = selected.left;
                lastWidth = selected.width - maxXY;
                lastHeight = selected.height - maxXY;
                break;

              case 'sw':
                maxXY = absY > absX ? (y * -1) : x;
                lastTop = selected.top;
                lastLeft = selected.left - maxXY;
                lastHeight = selected.height + maxXY;
                lastWidth = selected.width + maxXY;
                break;

              case 'se':
                maxXY = absY > absX ? y : x;
                lastTop = selected.top;
                lastLeft = selected.left;
                lastWidth = selected.width - maxXY;
                lastHeight = selected.height - maxXY;
                break;
              }

              // console.log('absY', absY, 'absX', absX, 'y', y, 'x', x, 'maxXY', maxXY, 'height', lastHeight, 'width', lastWidth);
            } else {
              switch (resizeDirection) {
              case 'nw':
                lastTop = selected.top - y;
                lastLeft = selected.left - x;
                lastWidth = selected.width + x;
                lastHeight = selected.height + y;
                break;

              case 'ne':
                lastTop = selected.top - y;
                lastLeft = selected.left;
                lastWidth = selected.width - x;
                lastHeight = selected.height + y;
                break;

              case 'sw':
                lastTop = selected.top;
                lastLeft = selected.left - x;
                lastHeight = selected.height - y;
                lastWidth = selected.width + x;
                break;

              case 'se':
                lastTop = selected.top;
                lastLeft = selected.left;
                lastWidth = selected.width - x;
                lastHeight = selected.height - y;
                break;

              case 'tr':
                lastTop = selected.top - y;
                lastHeight = selected.height + y;
                lastLeft = selected.left;
                lastWidth = selected.width;
                break;

              case 'br':
                lastTop = selected.top;
                lastHeight = selected.height - y;
                lastLeft = selected.left;
                lastWidth = selected.width;
                break;

              case 'lc':
                lastTop = selected.top;
                lastHeight = selected.height;
                lastLeft = selected.left - x;
                lastWidth = selected.width + x;
                break;

              case 'rc':
                lastTop = selected.top;
                lastHeight = selected.height;
                lastLeft = selected.left;
                lastWidth = selected.width - x;
                break;
              }
            }

            this.resizeSelected( lastTop, lastLeft, lastWidth, lastHeight );
            $scope.resizeStartEvent = $event;

        },

        /**
        * @param {Number} top
        * @param {Number} left
        * @param {Number} width
        * @param {Number} height
        */
        resizeSelected:function( top, left, width, height ){
          
         var  selected = $scope.imgSelected,
              maxY = $element[0].clientHeight - selected.top,
              maxX = $element[0].clientWidth - selected.left;

          selected.top = top > 0 ?
            (top < selected.top + selected.height ? top : selected.top) : 0;
          selected.left = left > 0 ?
            (left < selected.left + selected.width ? left : selected.left) : 0;
          if ($scope.enabledResizeAspectLock) {
            var maxXY;
            if (width > maxX || height > maxY) {
              maxXY = Math.max(Math.min(maxX, maxY), 1);
              selected.height = maxXY;
              selected.width = maxXY;
            } else {
              maxXY = Math.max(Math.min(width, height), 1);
              selected.width = maxXY;
              selected.height = maxXY;
            }
          } else {
            selected.width = width <= maxX ? Math.max(width, 1) : maxX;
            selected.height = height <= maxY ? Math.max(height, 1) : maxY;
          }
        },

        cancel :function(){
          $scope.dragEvent = null;
          $scope.resizeStartEvent = null;
        },

        ngImageEditor:{

          /**
          * @param {String} type
          * @return String
          */
          toDataURL:function( type ){

            var imageType = type ? type : 'image/png';

            return overlay.toDataURL( imageType , $scope.imgSelected );

          },

          refresh:function(){

            overlay.refreshAndRender(img, $scope.imgSelected, imgSize, $scope.enabledResizeCircle, $scope.rotateDegrees);
          }
        }
      });

      $body.on( "mouseup", function(){

        $scope.cancel();
      });

    }]
  };


}]);

app.directive( 'ngImageSelected', function(){

  return {
    require:'^ngImageEditor',
    imgSelected: '=',
    enabledResizeAspectLock: '=',
    enabledResizeCircle: '=',
    template: '<div style="box-sizing:border-box;background:rgba(255, 255, 255, 0.1);border:2px dashed #eaeaea;cursor:all-scroll;position:absolute;" ng-style="{width:imgSelected.width + \'px\', height:imgSelected.height + \'px\', left:imgSelected.left + \'px\', top:imgSelected.top + \'px\', \'border-radius\':(enabledResizeCircle ? \'50%\' : 0)}" ng-mousedown="dragEvent=$event;$event.preventDefault()">' +
      '<div ng-show="enabledResizeSelector" ng-mousedown="onResizeBlock( $event, \'nw\' )" class="image-edit-resize" style="cursor: nw-resize;" ng-style="{top: (enabledResizeCircle ? \'20%\' : \'-4px\'), left: (enabledResizeCircle ? \'7%\' : \'-4px\')}"></div>' +
      '<div ng-show="enabledResizeSelector" ng-mousedown="onResizeBlock( $event, \'ne\' )" class="image-edit-resize" style="cursor: ne-resize;" ng-style="{top: (enabledResizeCircle ? \'20%\' : \'-4px\'), right: (enabledResizeCircle ? \'7%\' : \'-4px\')}"></div>' +
      '<div ng-show="enabledResizeSelector" ng-mousedown="onResizeBlock( $event, \'sw\' )" class="image-edit-resize" style="cursor: sw-resize;" ng-style="{bottom: (enabledResizeCircle ? \'20%\' : \'-4px\'), left: (enabledResizeCircle ? \'7%\' : \'-4px\')}"></div>' +
      '<div ng-show="enabledResizeSelector" ng-mousedown="onResizeBlock( $event, \'se\' )" class="image-edit-resize" style="cursor: se-resize; " ng-style="{bottom: (enabledResizeCircle ? \'20%\' : \'-4px\'), right: (enabledResizeCircle ? \'7%\' : \'-4px\')}"></div>' +
      '<div ng-show="enabledResizeSelector" ng-hide="enabledResizeAspectLock" ng-mousedown="onResizeBlock( $event, \'tr\' )" class="image-edit-resize" style="top: -4px;right: 49%; cursor: row-resize;"></div>' +
      '<div ng-show="enabledResizeSelector" ng-hide="enabledResizeAspectLock" ng-mousedown="onResizeBlock( $event, \'br\' )" class="image-edit-resize" style="bottom: -4px;right: 49%; cursor: row-resize;"></div>' +
      '<div ng-show="enabledResizeSelector" ng-hide="enabledResizeAspectLock" ng-mousedown="onResizeBlock( $event, \'lc\' )" class="image-edit-resize" style="bottom: 49%;left: -4px; cursor: col-resize;;"></div>' +
      '<div ng-show="enabledResizeSelector" ng-hide="enabledResizeAspectLock" ng-mousedown="onResizeBlock( $event, \'rc\' )" class="image-edit-resize" style="bottom: 49%;right: -4px; cursor: col-resize;"></div>' +
      '<style type="text/css">.image-edit-resize { width: 8px;height: 8px;background: rgba(225, 225, 225, 0.8);position: absolute; }.image-edit-resize:hover { width: 10px; height: 10px;}</style></div>',
    replace:true,

    /**
    * @param {Scope} scope
    * @param {jqlite|jQuery} $element
    * @param {Attribute} attrs
    */
    link:function( scope, $element, attrs ){

      angular.extend( scope, {
        /**
        * @param {Event} event
        * @param {String} direction
        */
        onResizeBlock:function( event , direction){

          event.preventDefault();
          event.stopPropagation();

          this.resizeStartEvent = event;
          this.resizeDirection = direction;

        }

      });
    },

    /**
     * @param {Scope} scope
     * @param {jqlite|jQuery} $element
     * @param {Attribute} attrs
     */
    controller: ['$scope',
      function ($scope) { // jshint ignore:line
        if ($scope.enabledResizeCircle && !$scope.enabledResizeAspectLock) {
          throw 'Cannot use enabledResizeCircle without enabledResizeAspectLock!';
        }
      }
    ]
  };

});




})( angular );
