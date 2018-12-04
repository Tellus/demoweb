L.Control.Dialog = L.Control.extend({
  options: {
    size: [ 300, 300 ],
    minSize: [ 100, 100 ],
    maxSize: [ 350, 350 ],
    anchor: [ 250, 250 ],
    position: 'topleft',
    initOpen: true
  },

  initialize: function (options){
    L.setOptions(this, options);

    this._attributions = {};
  },

  onAdd: function (map){

    this._initLayout();
    this._map = map;

    this.update();

    if(!this.options.initOpen){
      this.close();
    }

    return this._container;
  },

  open: function(){
    if(!this._map){
      return;
    }
    this._container.style.visibility = '';

    this._map.fire('dialog:opened', this);

    return this;
  },

  close: function(){
    this._container.style.visibility = 'hidden';

    this._map.fire('dialog:closed', this);
    return this;
  },

  destroy: function(){
    if(!this._map){ return this; }

    this.removeFrom(this._map);

    if (this.onRemove) {
			this.onRemove(this._map);
		}

    this._map.fire('dialog:destroyed', this);
    return this;
  },

  setLocation: function(location){
    location = location || [ 250, 250 ];

    this.options.anchor[0] = 0;
    this.options.anchor[1] = 0;
    this._oldMousePos.x = 0;
    this._oldMousePos.y = 0;

    this._move(location[1], location[0]);

    return this;
  },

  lock: function(){
    this._grabberNode.style.visibility = 'hidden';
    this._closeNode.style.visibility = 'hidden';

    this._map.fire('dialog:locked', this);
    return this;
  },

  unlock: function(){
    this._grabberNode.style.visibility = '';
    this._closeNode.style.visibility = '';

    this._map.fire('dialog:unlocked', this);
    return this;
  },

  freeze: function(){
    this._grabberNode.style.visibility = 'hidden';

    this._map.fire('dialog:frozen', this);
    return this;
  },

  unfreeze : function(){
    this._grabberNode.style.visibility = '';

    this._map.fire('dialog:unfrozen', this);
    return this;
  },

  setContent: function(content){
    this._content = content;
    this.update();
    return this;
  },

  getContent: function(){
    return this._content;
  },

  getElement: function(){
    return this._container;
  },

  update: function(){
    if (!this._map) { return; }

    this._container.style.visibility = 'hidden';

    this._updateContent();
    this._updateLayout();

    this._container.style.visibility = '';
    this._map.fire('dialog:updated', this);

  },

  _initLayout: function(){
    var className = 'leaflet-control-dialog',
    container = this._container = L.DomUtil.create('div', className);

    container.style['min-width'] = '400px';
      
    container.style.top = this.options.anchor[0] + 'px';
    container.style.left = this.options.anchor[1] + 'px';

    var stop = L.DomEvent.stopPropagation;
    L.DomEvent
        .on(container, 'click', stop)
        .on(container, 'mousedown', stop)
        .on(container, 'touchstart', stop)
        .on(container, 'dblclick', stop)
        .on(container, 'mousewheel', stop)
        .on(container, 'contextmenu', stop)
        .on(container, 'MozMousePixelScroll', stop);

    var innerContainer = this._innerContainer = L.DomUtil.create('div', className + '-inner');

    var grabberNode = this._grabberNode = L.DomUtil.create('div', className + '-grabber itspx1-dialog-grabber');
    grabberNode.id = "itspx1-dialog-grabber";  
    var grabberHeader = L.DomUtil.create('div', 'itspx1-dialog-header');
    grabberHeader.textContent = "Travel Times";
    grabberNode.appendChild(grabberHeader);

    L.DomEvent.on(grabberNode, 'mousedown', this._handleMoveStart, this);

    var closeNode = this._closeNode = L.DomUtil.create('div', className + '-close');
    var closeIcon = L.DomUtil.create('i', 'fa fa-times itspx1-close');
    closeNode.appendChild(closeIcon);
    L.DomEvent.on(closeNode, 'click', this._handleClose, this);

    var contentNode = this._contentNode = L.DomUtil.create('div', className + "-contents");

    container.appendChild(innerContainer);

    innerContainer.appendChild(contentNode);
    innerContainer.appendChild(grabberNode);
    innerContainer.appendChild(closeNode);

    this._oldMousePos = { x: 0, y: 0 };

  },

  _handleClose: function(){
    this.close();
  },

  _handleMoveStart: function(e){
    this._oldMousePos.x = e.clientX;
    this._oldMousePos.y = e.clientY;

    L.DomEvent.on(this._map, 'mousemove', this._handleMouseMove, this);
    L.DomEvent.on(this._map, 'mouseup', this._handleMouseUp, this);

    this._map.fire('dialog:movestart', this);
    this._moving = true;
  },

  _handleMouseMove: function(e){
    var diffX = e.originalEvent.clientX - this._oldMousePos.x,
      diffY = e.originalEvent.clientY - this._oldMousePos.y;

      // this helps prevent accidental highlighting on drag:
    if(e.originalEvent.stopPropagation){ e.originalEvent.stopPropagation(); }
    if(e.originalEvent.preventDefault){ e.originalEvent.preventDefault(); }

    if(this._moving){
      this._move(diffX, diffY);
    }
  },

  _handleMouseUp: function(){
    L.DomEvent.off(this._map, 'mousemove', this._handleMouseMove, this);
    L.DomEvent.off(this._map, 'mouseup', this._handleMouseUp, this);

    if(this._moving){
      this._moving = false;
      this._map.fire('dialog:moveend', this);
    }
  },

  _move: function(diffX, diffY){
    var newY = this.options.anchor[0] + diffY;
    var newX = this.options.anchor[1] + diffX;

    this.options.anchor[0] = newY;
    this.options.anchor[1] = newX;

    this._container.style.top = this.options.anchor[0] + 'px';
    this._container.style.left = this.options.anchor[1] + 'px';

    this._map.fire('dialog:moving', this);

    this._oldMousePos.y += diffY;
    this._oldMousePos.x += diffX;
  },

  _updateContent: function(){

    if(!this._content){ return; }

    var node = this._contentNode;
    var content = (typeof this._content === 'function') ? this._content(this) : this._content;

    if(typeof content === 'string'){
      node.innerHTML = content;
    }
    else{
      while(node.hasChildNodes()){
        node.removeChild(node.firstChild);
      }
      node.appendChild(content);
    }

  },

  _updateLayout: function(){

    this._container.style.top = this.options.anchor[0] + 'px';
    this._container.style.left = this.options.anchor[1] + 'px';

  }

});

L.control.dialog = function (options) {
  return new L.Control.Dialog(options);
};
