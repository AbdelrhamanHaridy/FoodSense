/**
 * Plugin name
 */
 var name = 'googleMaps';

 /**
  * Default options
  */
 var defaults = {
     callback: false,
     center: false,
     key: false,
     options: {},
     points: [],
     responsive: false,
     zoom: false
 };
 
 /**
  * Resize event name
  */
 var resizeEvent = 'googleMapsWindowResized';
 
 /**
  * Timer used to prevent resize event firing too often
  */
 var resizeTimer = false;
 
 /**
  * Plugin constructor
  *
  * Assign the selected element to a property, set the plugin options with
  * default values where no values have been entered, and initialize the
  * plugin.
  */
 var Plugin = function (element, options) {
     this.element = element;
     this.options = $.extend({}, defaults, options);
     this._defaults = defaults;
     this._name = name;
     this._centered = false;
     this._zoomed = false;
 
     // Initialization
     this.init();
 };
 
 /**
  * Has the Google Maps API been loaded?
  *
  * This property is set to true to prevent the plugin from loading the
  * Google Maps API more than once.
  */
 Plugin.loaded = false;
 
 /**
  * Initialization
  *
  * Save any embedded styles and content so that they can be restored later,
  * then load the Google Maps API if it has not already been loaded and draw
  * the map.
  */
 Plugin.prototype.init = function () {
     this._styles = $(this.element).attr('style');
     this._content = $(this.element).html();
 
     this.load();
 };
 
 /**
  * Load Google Maps API and draw map
  *
  * If the Google Maps API has already been loaded, draw the map. If it has
  * not been loaded, load it now and then draw the map.
  */
 Plugin.prototype.load = function () {
     if (typeof google !== 'undefined' &&
         typeof google.maps !== 'undefined') {
         Plugin.loaded = true;
         return this.draw();
     }
 
     // If it does not already exist, create a global variable to hold the
     // list of maps to draw after the API has loaded.
     if (typeof window.googleMaps === 'undefined') {
         window.googleMaps = [];
     }
 
     // Append this map to the global list of maps to draw
     window.googleMaps.push(this);
 
     // If the API has already started loading, do not load it again. The
     // maps will be drawn by the global callback function.
     if (Plugin.loaded) {
         return;
     }
 
     var url = '//maps.googleapis.com/maps/api/js';
 
     // Append API parameters to the URL
     url = url + '?v=3.31';
     url = url + '&callback=googleMapsInit';
     url = url + '&key=' + this.options.key;
 
     // Load the API
     $.getScript(url);
 
     // Prevent the Google Maps API script from being downloaded by the
     // plugin more than once.
     Plugin.loaded = true;
 };
 
 /**
  * Draw map
  *
  * Create map and bounds instances, apply any additional native Google Maps
  * API options, and add the points to the map.
  */
 Plugin.prototype.draw = function () {
     var _this = this;
 
     // Create the map and bounds instances
     _this.map = new google.maps.Map(_this.element);
     _this.bounds = new google.maps.LatLngBounds();
 
     // Apply additional native Google Maps API options
     _this.map.setOptions(_this.options.options);
 
     // Add points to the map
     $.each(_this.options.points, function (index, point) {
         _this.insertPoint(point);
     });
 
     // Set the initial zoom and fit bounds
     _this.zoom();
 
     // If this is a responsive map, set the zoom and bounds again after the
     // window has been resized.
     if (_this.options.responsive) {
         $(window).on(resizeEvent, function () {
             _this.zoom();
         });
     }
 
     // Run callback
     if (_this.options.callback) {
         _this.options.callback(_this);
     }
 };
 
 /**
  * Set zoom and fit bounds
  *
  * Fit the map to the points. Then, set a custom zoom level and centre if
  * the options have been set. These have to run on bounds_changed to make
  * sure they take effect after the fitBounds method has been applied.
  */
 Plugin.prototype.zoom = function () {
     var _this = this;
     var location = _this.options.center;
     var zoom = _this.options.zoom;
 
     // Fit map to points
     _this.map.fitBounds(_this.bounds);
 
     // Set the centre of the map
     if (location && typeof location.lat !== 'undefined' &&
         typeof location.lng !== 'undefined') {
         _this.map.setCenter(location);
 
         _this.map.addListener('bounds_changed', function () {
             // Allow user to change centre and zoom by only re-zooming on
             // the first bounds_changed, which should be triggered by the
             // fitBounds method.
             if (_this._centered) {
                 return;
             }
 
             _this.map.setCenter(location);
             _this._centered = true;
         });
     }
 
     // Set the zoom level
     if (zoom) {
         _this.map.setZoom(zoom);
 
         _this.map.addListener('bounds_changed', function () {
             // Allow user to change centre and zoom by only re-zooming on
             // the first bounds_changed, which should be triggered by the
             // fitBounds method.
             if (_this._zoomed) {
                 return;
             }
 
             _this.map.setZoom(zoom);
             _this._zoomed = true;
         });
     }
 };
 
 /**
  * Insert map point
  *
  * Add a point to the map with the specified options and extend the bounds
  * of the map to include the new point.
  */
 Plugin.prototype.insertPoint = function (options) {
     var _this = this;
 
     // Fill in the gaps in the options with default values
     var point = $.extend({
         lat: false,
         lng: false,
         marker: false,
         title: false,
         infoWindow: false
     }, options);
 
     // No latitude or longitude? No point for you.
     if (!point.lat || !point.lng) {
         return;
     }
 
     // Location of point as LatLng instance
     var location = new google.maps.LatLng({
         lat: point.lat,
         lng: point.lng
     });
 
     // Extend bounds to include this location
     _this.bounds.extend(location);
 
     // No marker? Nothing more to do here.
     if (!point.marker) {
         return;
     }
 
     // Add marker at location
     var marker = new google.maps.Marker({
         map: _this.map,
         position: location
     });
 
     // If the marker option is a string, assume that it is the URL of a
     // custom marker image.
     if ($.type(point.marker) === 'string') {
         marker.setIcon(point.marker);
     }
 
     // Add a title to the marker?
     if (point.title) {
         marker.setTitle(point.title);
     }
 
     // Add an information window to the maker?
     if (point.infoWindow) {
         var info = new google.maps.InfoWindow({
             content: point.infoWindow
         });
 
         marker.addListener('click', function () {
             info.open(_this.map, marker);
         });
     }
 };
 
 /**
  * Remove map
  *
  * Safely remove the map from its container, restoring its original styles
  * and content. This instance is still available in the element's data.
  */
 Plugin.prototype.remove = function () {
     var wrap = $(this.element);
 
     wrap.html(this._content);
     wrap.attr('style', this._styles);
 };
 
 /**
  * Destroy map
  *
  * Remove the map, restore its styles and content, then destroy this
  * instance so the map data cannot be recovered.
  */
 Plugin.prototype.destroy = function () {
     this.remove();
     $.removeData(this.element, name);
 };
 
 /**
  * Add plugin method to jQuery
  *
  * Append the plugin method to jQuery with the plugin name as the method
  * name. This instantiates the plugin class for each of the collection of
  * elements generated by the jQuery selector.
  */
 $.fn[name] = function (options) {
     var _this = this;
 
     // Return instance(s)
     if (_this.options === 'instance') {
         var instances = [];
 
         _this.each(function () {
             instances.push($.data(_this, name));
         });
 
         if (instances.length === 1) {
             return instances[0];
         }
 
         return instances;
     }
 
     // Apply method to each item in the jQuery collection
     _this.each(function () {
         var instance = $.data(this, name);
 
         // Named commands
         if ($.type(options) === 'string') {
             if (typeof instance === 'undefined') {
                 return;
             }
 
             switch (options) {
                 case 'redraw':
                     return instance.draw();
                 case 'remove':
                     return instance.remove();
                 case 'destroy':
                     return instance.destroy();
                 default:
                     return;
             }
         }
 
 
         // If the element data does not include an instance of the plugin,
         // create a new one and add it to the element data.
         if ($.type(instance) == 'undefined') {
             instance = new Plugin(this, options);
             $.data(this, name, instance);
         }
     });
 
     // Return collection for method chaining
     return _this;
 };
 
 /**
  * Initialize map(s) after Google Maps API loaded
  *
  * If the Google Maps API is not available, it is downloaded with this
  * method as the callback to run as soon as the script is loaded. This will
  * draw any maps that need to be drawn.
  */
 window.googleMapsInit = function () {
     if (typeof window.googleMaps === 'undefined') {
         return;
     }
 
     $.each(window.googleMaps, function (index, instance) {
         instance.draw();
     });
 };
 
 /**
  * Trigger resize event
  *
  * Trigger an event when the window has finished resizing, not while it is
  * still being resized.
  */
 $(window).on('resize', function () {
     window.clearTimeout(resizeTimer);
 
     resizeTimer = setTimeout(function() {
         $(window).trigger(resizeEvent);
     }, 100);
 });