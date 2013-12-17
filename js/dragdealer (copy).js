/**
 * Dragdealer JS v0.9.5
 * http://code.ovidiu.ch/dragdealer-js
 *
 * Copyright (c) 2010, Ovidiu Chereches
 * MIT License
 * http://legal.ovidiu.ch/licenses/MIT
 */

// Patches:
// https://code.google.com/p/dragdealer/issues/detail?id=11
// https://code.google.com/p/dragdealer/issues/detail?id=10
//
// Removed all vertical functionality


/* Cursor */

var Cursor =
{
	x: 0,
	init: function(){
		this.setEvent('mouse');
		this.setEvent('touch');
	},
	setEvent: function(type){
		var moveHandler = document['on' + type + 'move'] || function(){};
		document['on' + type + 'move'] = function(e)
		{
			moveHandler(e);
			Cursor.refresh(e);
		}
	},
	refresh: function(e){
		if(!e){
			e = window.event;
		}
		if(e.type == 'mousemove'){
			this.set(e);
		} else if(e.touches){
			this.set(e.touches[0]);
		}
	},
	set: function(e){
		if(e.pageX)	{
			this.x = e.pageX;
		} else if(e.clientX) {
			this.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		}
	}
};
Cursor.init();

/* Position */

var Position =
{
	get: function(obj){
		var curleft = 0;
		if(obj.offsetParent){
			do {
				curleft += obj.offsetLeft;
			}
			while(obj = obj.offsetParent);
		}
		return curleft;
	}
};

/* Dragdealer */

var Dragdealer = function(wrapper, options){
	if(typeof(wrapper) == 'string')	{
		wrapper = document.getElementById(wrapper);
	}
	if(!wrapper){
		return;
	}
	var handle = wrapper.getElementsByTagName('div')[0];
	if(!handle || handle.className.search(/(^|\s)handle(\s|$)/) == -1){
		return;
	}
	this.init(wrapper, handle, options || {});
	this.setup();
};
Dragdealer.prototype =
{
	init: function(wrapper, handle, options)
	{
		this.wrapper = wrapper;
		this.handle = handle;
		this.options = options;
		
		this.disabled = this.getOption('disabled', false);
		this.slide = this.getOption('slide', true);
		this.steps = this.getOption('steps', 0);
		this.snap = this.getOption('snap', false);
		this.loose = this.getOption('loose', false);
		this.speed = this.getOption('speed', 10) / 100;
		this.xPrecision = this.getOption('xPrecision', 0);
		
		this.callback = options.callback || null;
		this.animationCallback = options.animationCallback || null;
		
		this.bounds = {
			left: options.left || 0, right: -(options.right || 0),
			x0: 0, x1: 0, xRange: 0,
		};
		this.value = {
			prev: [-1, -1],
			current: [options.x || 0, 0],
			target: [options.x || 0, 0]
		};
		this.offset = {
			wrapper: 0,
			mouse: 0,
			prev: -999999,
			current: 0,
			target: 0
		};
		this.change = 0;
		
		this.activity = false;
		this.dragging = false;
		this.tapping = false;
	},
    destroy : function(){
        clearInterval(this.interval);
        this.unBindAllEvents();
        this.wrapper = null;
        this.handle = null;
        this.options = null;
    },
    bindEvent: function (target, eventName, method, owner, eventId){
        var ev = null;
        if ((typeof owner === 'string') && (typeof eventId === 'undefined')) {
            eventId = owner;
            owner = null;
        }
        if(this.events[eventId || eventName]) {
            //console.log("ReBinding " + (eventId || eventName) + " is not allowed.");
            return this.events[eventId || eventName];
        }
        
        if(typeof method !== 'function' && target){
            return target[eventName];
        }
        if(target[eventName] && target[eventName].method && this.events[target[eventName].eventId]){
            return this.events[target[eventName].eventId];                        
        }
        ev = (function(self, method, original) {
            return function(e){
                var ret = null;
                if(original) {
                    ret = original(e);                                        
                }
                if(typeof method === 'function'){
                    return ret || method.call(self, e);    
                }                    
            }           
        })(
            owner || this,
            method,
            target[eventName]
        );
        ev.original = target[eventName];
        ev.target = target;
        ev.eventName = eventName;
        ev.eventId = eventId || eventName;
        this.events[ev.eventId]  = target[eventName] = ev;
        ev = null;
        return this.events[eventId || eventName];
    },
    unBindEvent : function(eventId){
        if(!this.events[eventId]) return;
        var ev = this.events[eventId];
        if(ev.target[ev.eventName] == ev){
            ev.target[ev.eventName] = ev.original;
        }            
        ev.original = null;
        ev.target = null;
        ev.eventName = null;
        this.events[eventId] = null;
        ev = null;
    },
    unBindAllEvents : function(){
        for(evnt in this.events){
            this.unBindEvent(evnt);
            delete this.events[evnt];
        }
    },    
	getOption: function(name, defaultValue){
		return this.options[name] !== undefined ? this.options[name] : defaultValue;
	},
	setup: function()
	{
		this.setWrapperOffset();
		this.setBoundsPadding();
		this.setBounds();
		this.setSteps();
		
		this.addListeners();
	},
	setWrapperOffset: function(){
		this.offset.wrapper = Position.get(this.wrapper);
	},
	setBoundsPadding: function()
	{
		if(!this.bounds.left && !this.bounds.right)	{
			this.bounds.left = Position.get(this.handle) - this.offset.wrapper;
			this.bounds.right = -this.bounds.left;
		}
	},
	setBounds: function(){
		this.bounds.x0 = this.bounds.left;
		this.bounds.x1 = this.wrapper.offsetWidth + this.bounds.right;
		this.bounds.xRange = (this.bounds.x1 - this.bounds.x0) - this.handle.offsetWidth;
				
		this.bounds.xStep = 1 / (this.xPrecision || Math.max(this.wrapper.offsetWidth, this.handle.offsetWidth));
	},
	setSteps: function(){
		if(this.steps > 1){
			this.stepRatios = [];
			for(var i = 0; i <= this.steps - 1; i++)
			{
				this.stepRatios[i] = i / (this.steps - 1);
			}
		}
	},
	addListeners: function()
	{
		//var self = this; <--Memory Leak Cause		
		this.wrapper.onselectstart = function () {
            return false;
        }
        
        this.unBindAllEvents();
        this.events = {};        
        
        this.handle.onmousedown = this.bindEvent(this.handle,"ontouchstart", function (e) {
            if (!this.stopDrags) {
                this.handleDownHandler(e);
            }
        },"handle.ontouchstart");
        this.wrapper.onmousedown = this.bindEvent(this.wrapper, "ontouchstart", function (e) {
            if (!this.stopDrags) {
                this.wrapperDownHandler(e);
            }
        }, "wrapper.ontouchstart");        
        //Binding to global Object such Document and Window can causes memory leak as well
        this.bindEvent(document,"onmouseup",this.documentUpHandler, "document.onmouseup");
        this.bindEvent(document,"ontouchend",this.documentUpHandler,"document.ontouchend");
        this.bindEvent(window,"onresize",this.documentResizeHandler, "window.onresize");
        
        this.bindEvent(this.wrapper,"mousemove", function (e) {
            this.activity = true;
        },"wrapper.mousemove");        
       
        this.bindEvent(this.wrapper,"onclick", function (e) {
                return !this.activity;
        },"wrapper.onclick");

        this.interval = setInterval(this.bindEvent({},"onanimate", this.animate), 25);
        this.animate(false, true);
	},
	handleDownHandler: function(e)
	{
    var self = this;
    this.interval = setInterval(function(){ self.animate() }, 25);
		this.activity = false;
		Cursor.refresh(e);
		
		this.preventDefaults(e, true);
		this.startDrag();
		this.cancelEvent(e);
	},
	wrapperDownHandler: function(e)
	{
		Cursor.refresh(e);
		
		this.preventDefaults(e, true);
		this.startTap();
	},
	documentUpHandler: function(e)
	{
		this.stopDrag();
		this.stopTap();
		//this.cancelEvent(e);
	},
	documentResizeHandler: function(e)
	{
		this.setWrapperOffset();
		this.setBounds();
		
		this.update();
	},
	enable: function()
	{
		this.disabled = false;
		this.handle.className = this.handle.className.replace(/\s?disabled/g, '');
	},
	disable: function()
	{
		this.disabled = true;
		this.handle.className += ' disabled';
	},
	setStep: function(x, snap)
	{
		this.setValue(
			this.steps && x > 1 ? (x - 1) / (this.steps - 1) : 0
		);
	},
	setValue: function(x, snap)
	{
		this.setTargetValue([x, 0]);
		if(snap){
			this.value.current[0] = this.value.target[0];
		}
	},
	startTap: function(target){
		if(this.disabled){
			return;
		}
		this.tapping = true;
		
		if(target === undefined){
			target = [
				Cursor.x - this.offset.wrapper - (this.handle.offsetWidth / 2),
				0
			];
		}
		this.setTargetOffset(target);
	},
	stopTap: function()
	{
		if(this.disabled || !this.tapping)
		{
			return;
		}
		this.tapping = false;
		
		this.setTargetValue(this.value.current);
		this.result();
	},
	startDrag: function()
	{
		if(this.disabled)
		{
			return;
		}
		this.offset.mouse = Cursor.x - Position.get(this.handle);
		
		this.dragging = true;
	},
	stopDrag: function()
	{
		if(this.disabled || !this.dragging)	{
			return;
		}
		this.dragging = false;
		
		var target = this.groupClone(this.value.current);
		if(this.slide){
			var ratioChange = this.change;
			target[0] += ratioChange * 4;
		}
		this.setTargetValue(target);
		this.result();
	},
	feedback: function()
	{
		var value = this.value.current;
		if(this.snap && this.steps > 1)	{
			value = [this.getClosestStep(value[0]),0];
		}
		if(value[0] !== this.value.prev[0])
		{
			if(typeof(this.animationCallback) == 'function'){
				this.animationCallback(value[0], 0);
			}
			this.value.prev[0] = value[0];
		}
	},
	result: function()
	{
		if(typeof(this.callback) == 'function')	{
			this.callback(this.value.target[0], 0);
		}
    
    if(typeof(this.interval) == 'number')
    {
      clearInterval(this.interval);
      delete this.interval;
    }
	},
	animate: function(direct, first)
	{
        if(!this.wrapper.parentNode || !this.handle.parentNode){
            this.destroy();
        }
		if(direct && !this.dragging)
		{
			return;
		}
		if(this.dragging)
		{
			var prevTarget = this.groupClone(this.value.target);
			
			var offset = [
				Cursor.x - this.offset.wrapper - this.offset.mouse,
				0
			];
			this.setTargetOffset(offset, this.loose);
			
			this.change = this.value.target[0] - prevTarget[0];
		}
		if(this.dragging || first){
			this.value.current[0] = this.value.target[0];
		}
		if(this.dragging || this.glide() || first){
			this.update();
			this.feedback();
		}
	},
	glide: function(){
		var diff = this.value.target[0] - this.value.current[0];
		if (!diff) {
			return false;
		}
		if( Math.abs(diff) > this.bounds.xStep ){
			this.value.current[0] += diff * this.speed;
		} else {
			this.value.current[0] = this.value.target[0];
		}
		return true;
	},
	update: function(){
		if(!this.snap){
			this.offset.current = this.getOffsetByRatio(this.value.current[0]);
		} else {
			this.offset.current = this.getOffsetByRatio(
				this.getClosestStep(this.value.current[0])
			);
		}
		this.show();
	},
	show: function()
	{
		if(! (this.offset.current == this.offset.prev))
		{
			this.handle.style.left = String(this.offset.current) + 'px';
			this.offset.prev = this.offset.current;
		}
	},
	setTargetValue: function(value, loose)
	{
		var target = loose ? this.getLooseValue(value) : this.getProperValue(value);
		
		this.value.target[0] = target[0];
		this.offset.target = this.getOffsetByRatio(target[0]);
	},
	setTargetOffset: function(offset, loose)
	{
		var value = this.getRatiosByOffsets(offset);
		var target = loose ? this.getLooseValue(value) : this.getProperValue(value);
		
		this.value.target[0] = target[0];
		this.offset.target = this.getOffsetByRatio(target[0]);
	},
	getLooseValue: function(value)
	{
		var proper = this.getProperValue(value);
		return [
			proper[0] + ((value[0] - proper[0]) / 4),
			0
		];
	},
	getProperValue: function(value)
	{
		var proper = this.groupClone(value);

		proper[0] = Math.max(proper[0], 0);
		proper[0] = Math.min(proper[0], 1);
		
		if((!this.dragging && !this.tapping) || this.snap){
			if(this.steps > 1)
			{
				proper = [this.getClosestStep(proper[0]),0];
			}
		}
		return proper;
	},
	getRatiosByOffsets: function(group){
		return [
			this.getRatioByOffset(group[0], this.bounds.xRange, this.bounds.x0),
			0
		];
	},
	getRatioByOffset: function(offset, range, padding){
		return range ? (offset - padding) / range : 0;
	},
	getOffsetByRatio: function(x){
		return Math.round(x * this.bounds.xRange) + this.bounds.x0;
	},
	getClosestStep: function(x)
	{
		var k = 0;
		var min = 1;
		for(var i = 0; i <= this.steps - 1; i++)
		{
			if(Math.abs(this.stepRatios[i] - x) < min)
			{
				min = Math.abs(this.stepRatios[i] - x);
				k = i;
			}
		}
		return this.stepRatios[k];
	},	
	groupClone: function(a)
	{
		return [a[0], 0];
	},
	preventDefaults: function(e, selection)
	{
		if(!e)
		{
			e = window.event;
		}
		if(e.preventDefault)
		{
			e.preventDefault();
		}
		e.returnValue = false;
		
		if(selection && document.selection)
		{
			document.selection.empty();
		}
	},
	cancelEvent: function(e)
	{
		if(!e)
		{
			e = window.event;
		}
		if(e.stopPropagation)
		{
			e.stopPropagation();
		}
		e.cancelBubble = true;
	}
};
