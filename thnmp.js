<?php
header("Content-Type: application/javascript; charset=utf-8");
//header('Cache-Control: public');
$modify_time = filemtime(__FILE__);
header('Last-Modified: ' . gmdate("D, d M Y H:i:s", $modify_time) . " GMT");

/* LIBRARIES */
require_once('lib/setting.php');	/* 	 for handling all settings */
require_once('lib/light-i18n.php');	/* i18n for controls */
include_once('lib/Minifier.php');	/* JShrink minifyer */

/* SETTINGS */
/* Paths */
$staticUrl = '//static.thenmap.net';
//$thenmapUrl = '//www.thenmap.net';
$thenmapUrl = '//' . $_SERVER['HTTP_HOST'] . '/' . dirname($_SERVER['PHP_SELF']);

/* Languages*/
$languages = array( 'available'    => array ('sv','en','fi','fr','de','es','ru','it','nl','pl','zh','pt','ar','ja','fa','no','he','tr','da','uk','ca','id','hu','vi','ko','et','cs','hi','sr','bg'),
					//Languages with large Wikipedias. Other languages will require extensive local translations
					"fallback"     => 'sv',
					"type"         => Setting::LANGUAGE,
					);

/* Maps */
$maps = array(	"available"    => array ('europe-ortho',
										 'africa-laea',
										 'world-robinson',
										 'world-mollweide',
										 'europe-caucasus-lcc'
										),
				"aliases"      => array ('europe'    => 'europe-ortho',
										 'world'     => 'world-robinson',
 										 'robinson'  => 'world-robinson',
 										 'mollweide' => 'world-mollweide',
										 'africa'    => 'africa-laea',
										 'europe-caucasus' => 'europe-caucasus-lcc',
										),
				"fallback"     => 'world-robinson',
			);

/* Print controlbar (pause/play-button etc)? */
$printControlbar = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$printControlbar->set( filter_input(INPUT_GET,"controls",FILTER_SANITIZE_STRING) );

/* Initiate automatically? Then all the end user need is to include the script, no js code at all */
$autoInit = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "true" ) );
$autoInit->set( filter_input(INPUT_GET,"autoinit",FILTER_SANITIZE_STRING) );

/* Debug mode? */
$debugMode = new Setting( array( "type" => Setting::BOOLEAN , "fallback" => "false" ) );
$debugMode->set( filter_input(INPUT_GET,"debug",FILTER_SANITIZE_STRING) /*|| "localhost" === $_SERVER["HTTP_HOST"]*/);

/* Interface language */
$interfaceLanguage = new Setting( $languages );
$interfaceLanguage->set( filter_input(INPUT_GET,"lang",FILTER_SANITIZE_STRING) );
$_SESSION['lang'] = $interfaceLanguage->get();

/* Map language */ 
$mapLanguage = new Setting( $languages );
/* If no map language given, but lang is explicitly set, use lang */
if ( $_GET["lang"] && !$_GET["mlang"] ) {
	$mapLanguage->set( $interfaceLanguage->get() );
} else {
	$mapLanguage->set( filter_input(INPUT_GET,"mlang",FILTER_SANITIZE_STRING) );
}
/* Map type */
$map = new Setting( $maps );
$map->set( filter_input(INPUT_GET,"map",FILTER_SANITIZE_STRING) );

$svgFile = $thenmapUrl . '/maps/' . $map->get() . '/' . $map->get() . '.svg';
$mapsVersion = filemtime($svgFile);
$cacheHash = md5($mapsVersion);

/* Dates */
$firstYear     = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 1946 ) );
$firstYear->set( filter_input(INPUT_GET,"fYear",FILTER_SANITIZE_STRING) );

$lastYear      = new Setting ( array ( "type" => Setting::YEAR, "fallback" => 2014 ) );
$lastYear->set( filter_input(INPUT_GET,'lYear',FILTER_SANITIZE_STRING) );

$startingYear  = new Setting ( array ( 'type' => Setting::YEAR, "fallback" => 1965 ) );
$startingYear->set( filter_input(INPUT_GET,'sYear',FILTER_SANITIZE_STRING) );

$dateOffset    = new Setting ( array ( 'fallback' => '07-01') );
$dateOffset->set( filter_input(INPUT_GET,'offset',FILTER_SANITIZE_STRING) );

if ( $lastYear <= $firstYear ) {
	$lastYear = $firstYear+1;
}

if ( $startingYear < $firstYear ) {
	$startingYear = $firstYear;
}

if ($startingYear > $lastYear ) {
	$startingYear = $lastYear;
}

/* Data sets */
$dataCss = new Setting ( array ( "type" => Setting::STRING ) );
$dataCss->set( filter_input(INPUT_GET,"dataCss",FILTER_SANITIZE_STRING) );

/***********************************************************************************************/
/* Start buffer */
/***********************************************************************************************/
ob_start();

/***********************************************************************************************/
/************************************* JAVASCRIPT OUTPUT STARTS HERE ***************************/
/***********************************************************************************************/

/* include dragdealer */
echo (file_get_contents('js/dragdealer.js'));
/* include cross browser console.log in debug mode */
if ( $debugMode->get() ) {
	echo (file_get_contents('js/consolelog.js'));
}
?>

/**********************************************************************************************************************/
var Thenmap = {

	/* DATA    */
	paths: <?php
		$file = 'maps/' . $map->get() . '/' . $map->get() . '-' . $mapLanguage->get() . '.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	flags: <?php
		$file = 'maps/' . $map->get(). '/' . $map->get() . '-flags.json';
		if ( $c = file_get_contents($file) ) {
			echo ($c);
		} else {
			echo '{}';
		}
	?>,
	
	currentYear:	<?php echo $startingYear->get(); ?>,
	startingYear:	<?php echo $startingYear->get(); ?>,
	firstYear:		<?php echo $firstYear->get(); ?>,
	lastYear:		<?php echo $lastYear->get(); ?>,
	
	isPlaying:	false,
	timeline: false,	//dragdealer object
	timer: false,		//timer for autoplay

	section: false,// root element

	timelineHandle:false,	//element
	svg:false,		//element
	mapcontainer: false, //element
	
	callback: false,	// extra callback function for animation (normally for updating custom buttons, etc)
						// Will be called like this: callback(currentYear)
						
	textPropName: false,
	
	init: function(e,callback) {
		var self = this;
		this.section = document.getElementById(e);
		if (callback) {
			this.callback = callback;
		}
		/* Check if we will be able to use textContent for updating text in dragdealer handle. IE<9 only understands innerText */
		self.textPropName = this.section.textContent === undefined ? 'innerText' : 'textContent';
		
		/* Polluting the environment a bit here, for our own convenience. Sorry for that. */
		/* Adding a global getElementsByClassName function*/
		if (!document.getElementsByClassName) {
			document.getElementsByClassName=function(cn) {
				var allT=document.getElementsByTagName('*'), allCN=[], i=0, a;
				while(a=allT[i++]) {
					a.className==cn ? allCN[allCN.length]=a : null;
				}
				return allCN
			}
		}

		/* Create map container, if it does not already exist */
		this.mapcontainer = document.getElementById('thenmap-map-container');
		if ( !(this.mapcontainer) ) {
			this.mapcontainer = document.createElement('div');
			this.mapcontainer.id = 'thenmap-map-container';
			this.mapcontainer.className = 'loading';

	
			var ajaxloader  = document.createElement('div');
			ajaxloader.className = 'ajaxloader';

			var unsupported = document.createComment("[if lte IE 8]><i><?php echo(L::nosupport);?></i><![endif]");
			
			this.mapcontainer.appendChild(ajaxloader);
			this.mapcontainer.appendChild(unsupported);
			this.section.appendChild(this.mapcontainer);
		}
		/* Create slider bar, if it do not already exist */
		var sliderElement = document.getElementById('thenmap-slider');
		if ( !(sliderElement) ) {
			sliderElement = document.createElement('div');
			sliderElement.id = 'thenmap-slider';
			sliderElement.className = 'dragdealer';

			this.timelineHandle = document.createElement('div');
			this.timelineHandle.className = 'handle';

			sliderElement.appendChild(this.timelineHandle);
			this.section.appendChild(sliderElement);
		} else {
			this.timelineHandle = sliderElement.getElementsByClassName("handle")[0];
		}

		/* LOAD SVG IMAGE */
		/* Fetch file */
		//this.ajax.get("<?php echo "$svgFile?v=$cacheHash"; ?>", function(data) { //	equivalent of $.get("url", function(data) {
		var xhr = this.createCORSRequest('<?php echo "$svgFile?v=$cacheHash"; ?>');
		if (!xhr) {
			this.debug("No CORS support");
		}
		xhr.onload = function() {
			var data = xhr.responseText;

			// Extract the SVG tag from the reply
			var tmp =  document.createElement('div');
			tmp.innerHTML = data;
			var svg = tmp.getElementsByTagName('svg')[0];

			// Add attributes
			svg.id = "thenmap-map";
			svg.preserveAspectRatio = "xMinYMin slice";

			/* Append image */
			self.svg = self.mapcontainer.appendChild(svg);

			/* Fix clipping problems in IE, by explicitly setting max-width */
//			var bBox = self.svg.getBBox();
//			if (bBox.width) {
//				self.svg.style["max-width"] = Math.min(bBox.width,1080) + "px";
//			}

			/*Cache path styles and elements for performance*/
			for (var pid in self.paths) {
				var elem = document.getElementById(pid);
				if (elem) {
					self.paths[pid]["e"] = elem;
				} else {
					self.debug("Error caching path "+pid+", map is probably not up to date with data file");
					delete self.paths[pid];
				}
			}

			self.mapcontainer.className = "";
			self.initTimeline('thenmap-slider');
						
			self.loadJQueryAndQtip();

		};//		}, 'xml');//END loading svg
		
		xhr.send();

		return this;
	},

	playTimeline: function() {
		var self = this;
		this.timer = setInterval(function() {
			if ( self.currentYear < self.lastYear ) {
				self.timeline.setStep((self.currentYear++)-self.firstYear+2);
			} else {
				self.stopTimeline();
			}
		}, 500); // Set animation speed
		this.isPlaying = true;
	<?php 
	if ( $printControlbar->get() ) { ?>
		this.playButton.val("<?php echo(L::controlbar_pause); ?>");
		<?php } ?>
	},
	stopTimeline: function() {
		if (this.isPlaying) {
			clearInterval(this.timer);
			this.isPlaying = false;
		}
	<?php 
	if ( $printControlbar->get() ) { ?>
		this.playButton.val("<?php echo(L::controlbar_play); ?>");
		<?php } ?>
	},
	moveLeft: function() {
		if (this.currentYear > this.firstYear){
			this.timeline.setStep((this.currentYear--)-this.firstYear);
		}
	},
	moveRight: function() {
		if (this.currentYear < this.lastYear) {
			this.timeline.setStep((this.currentYear++)-this.firstYear+2);
		}
	},
	moveToStart: function() {
		this.stopTimeline();
		this.timeline.setStep(0);
		this.currentYear = this.firstYear;
	},
	moveToEnd: function() {
		this.stopTimeline();
		this.timeline.setStep(this.timeline.steps);
		this.currentYear = this.lastYear;
	},
	togglePlayPause: function() {
			this.isPlaying ? this.stopTimeline() : this.playTimeline();
	},
	/* Callback function for updating the map  */
	printMap: function (){
		
		// Set year to container
        this.svg.setAttribute("class", "y"+this.currentYear); //.className does not work for svg in Chrome

		// Offset date
		var yy = this.currentYear+"-<?php echo $dateOffset->get(); ?>";
		
		//Loop through paths
		// Skip JQuery for performance
		for (var pid in this.paths) {

			var unknown = true;

			//Loop though nations, or until we found a nation that need this path
			i = this.paths[pid].length;
			while(i-- && unknown){
				if ( (this.paths[pid][i].f <= yy) && (yy <= this.paths[pid][i].t) ) {
                    this.paths[pid]["e"].setAttribute("class", this.paths[pid][i].c); //.className does not work for svg in Chrome
					this.paths[pid]["e"].style.visibility = "visible";
					unknown = false;
				}
			}
			if (unknown) {
				if ("undefined" === typeof(this.paths[pid]["e"])) {
					self.debug( "pid "+pid+" has no corresponding path. This should never happen.");
				} else {
					this.paths[pid]["e"].style.visibility = "hidden";
				}
			}
		}

	},
	animationCallback: function(x) {
	},
	initTimeline: function (elementId) {
		var self = this;
		var yearSpan = this.lastYear - this.firstYear;
		this.timeline = new Dragdealer(document.getElementById(elementId), this.timelineHandle, {
			x: 1 - (this.lastYear - this.startingYear) / yearSpan, // Set selected position
			snap: true,
			steps: yearSpan+1, // Number of steps
			animationCallback: function(x) {
				// Update handle and map
				self.currentYear = self.firstYear + x * yearSpan; // Get selected year
				self.timelineHandle[self.textPropName] = self.currentYear;

				//Don't render the map on every step if we still have a long way to go
				var distance = Math.floor(this.steps * Math.abs(this.value.target-this.value.current));

				if (distance > 30) {
					/* 31-: Only print every tenth map*/
					if ( distance % 10 === 0 ) {
						self.printMap();
					}
				} else if (distance > 12) {
					/* 13-30: Only print every fifth map*/
					if ( distance % 5 === 0 ) {
						self.printMap();
					}
				} else if (distance > 3) {
					/* 4 - 12: Only print every third map */

					if ( distance % 3 == 0 ) {
						self.printMap();
					}
				} else {
					/* 0 - 4: Print every map */
					self.printMap();
				}
				if (self.callback) {
					self.callback(self.currentYear);
				}
			},
			callback: function(x) {
			//Called at the end, but then anomationCallback will already have been called
//				self.printMap();
//				if (self.callback) {
//					self.callback(self.currentYear);
//				}
			}
		});
	},
	buildControlbar: function() {	/* CREATE HTML MARKUP */	
			/* Create control bar, if asked */
	<?php 
		if ( $printControlbar->get() ) { ?>
		var self = this;
		var controlbar = $('<menu/>', {
			class: 'controlbar'
		});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-rewind',
			title: '<?php echo(L::controlbar_rewindtitle); ?>',
			value: '⏮',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveToStart(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepback',
			title: '<?php echo(L::controlbar_stepbacktitle); ?>',
			value: '◂',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveLeft(self)});
		self.playButton = $('<input/>', {
			type: 'button',
			id: 'thenmap-play',
			value: '<?php echo(L::controlbar_play); ?>',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.togglePlayPause(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-stepforward',
			title: '<?php echo(L::controlbar_stepforwardtitle); ?>',
			value: '▸',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveRight(self)});
		$('<input/>', {
			type: 'button',
			id: 'thenmap-gotoend',
			title: '<?php echo(L::controlbar_gotoendtitle); ?>',
			value: '⏭',
			class: 'control'
		}).appendTo(controlbar).click(function(){self.moveToEnd(self)});

		$(self.section).append(controlbar);
	
	<?php } ?>
	},
	loadJQueryAndQtip: function() {
		var self = this;
		if ("undefined" === typeof(jQuery)) {
			self.debug("loading jQuery...");
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo "js/jquery.min.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/jquery/1.10.2/jquery.min.js";
			} ?>', function () {
				self.debug("done");
				self.loadQtip();
			});
		} else {
			self.loadQtip();
		}
	},
	loadQtip: function() { /* LOADER FOR QTIP */
		var self = this;
		this.buildControlbar(); //Build controlbar here, just for now (as we have JQuery)
				// Keyboard commands
		$(window).keydown(function(e){
			if(e.which === 37){
				self.moveLeft();
				return false;
			} else if(e.which === 39){
				self.moveRight();
				return false;
			} else if(e.which === 35){
				self.moveToEnd();
				return false;
			} else if(e.which === 36){
				self.moveToStart();
				return false;
			} else if(e.which === 8){
				self.togglePlayPause();
				return false;
			}
		});

		if ("undefined" === typeof($.qtip)) {
			LazyLoad.js('<?php
			if ( $debugMode->get() ) {
				echo "js/jquery.qtip.min.js";
			} else {
				echo "//cdnjs.cloudflare.com/ajax/libs/qtip2/2.1.1/basic/jquery.qtip.min.js";
			} ?>', function () {
				self.attachQtip();
			});
		} else {
			self.attachQtip();
		}
	},
	attachQtip: function() {
		var	nations = $(this.svg).find("g.nations > *");
		var self = this;
		$(nations).qtip({ 
			prerender: false,
			content: {
				text: function(event, api) {
					pid = api.target[0].id;
					i = self.paths[pid].length;
					while(i--){
						var yy = self.currentYear+"-<?php echo $dateOffset->get(); ?>";
						if ( (self.paths[pid][i].f <= yy) && (yy <= self.paths[pid][i].t) ) {
							var s = "<h3>"+self.paths[pid][i].n+"</h3>";
							var q;
							if ( q = self.paths[pid][i].q ) {
								if (self.flags[q]) {
									s += '<a href="//commons.wikimedia.org/wiki/File:'+self.flags[q].n+'" target="_blank"><img class="flag" width="40" src="//upload.wikimedia.org/wikipedia/commons/thumb/'+self.flags[q].i+'/'+self.flags[q].n+'/80px-'+self.flags[q].n+self.flags[q].s+'"/></a>';
								}
							}
							if ( (typeof nationDescriptions !== "undefined") && nationDescriptions[q] ) {
								s += '<p>'+nationDescriptions[q]+'</p>';
							}
							return s;
						}
					}

				}
			},
			position: {
				target: 'mouse', // Use the mouse position as the position origin
				adjust: {
					mouse: false, //Follow the mouse?
					x: -40,
					y: 15
				},
				corner: {
					tooltip: 'bottomMiddle'
				},
				effect: false,
			},
			hide: {
				fixed: true, // Let the user mouse into the tip
				delay: 140 // So that users can mouse into tooltop
			},
			show: {
		         solo: true
			}
		});
	},
	createCORSRequest: function(url) {
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// XHR for Chrome/Firefox/Opera/Safari.
			xhr.open('GET', url, true);
		} else if (typeof XDomainRequest != "undefined") {
			// XDomainRequest for IE.
			xhr = new XDomainRequest();
			xhr.open('GET', url);
		} else {
			// CORS not supported.
			xhr = null;
		}
		return xhr;
	},
	svgSupported: function() {
		return !! document.createElementNS &&
			   !! document.createElementNS(SVG.ns,'svg').createSVGRect
	},
	debug: function(mes) {
		<?php
		if ( $debugMode->get() ) { ?>
		console.log(mes + "\nIn function:"+arguments.callee.caller.name);
		<?php } ?>
	
	}

};

(function() {
	/* Add lazyloader to load js and css */
	<?php echo (file_get_contents('js/lazyload.js')); ?>
<?php
	/* ADD THENMAP CSS */
	if ( $debugMode->get() ) { ?>
		LazyLoad.css("<?php echo $thenmapUrl; ?>/css/default.css?c<?php echo $cacheHash; ?>");
<?php	
	} else { ?>
		LazyLoad.css("<?php echo $thenmapUrl; ?>/css/default.min.css?c<?php echo $cacheHash; ?>");
<?php
	} ?>
	
	/* Add IE specific stylesheet */
	/* alternative approach: http://stackoverflow.com/questions/2041495/create-dynamic-inline-stylesheet */
	/*      var el= document.createElement('style'); */
	/*      el.type= "text/css";*/ 
	/*     if(el.styleSheet) { el.styleSheet.... = ...};//IE only */
	if (document.styleSheets[0].addImport) {
		 document.styleSheets[0].addImport("//www.thenmap.net/css/ie.css");
	}

	/* ADD PREDEFINED DATA CSS, IF ANY.  */
	<?php
	if ( $val = $dataCss->get() ) {
		$CssUrl = '"'.$thenmapUrl . '/css/' . $val . ".css?c" . $cacheHash . '"'
	 ?>
	LazyLoad.css("<?php echo $thenmapUrl; ?>/css/<?php echo $val; ?>.css?c<?php echo $cacheHash; ?>");
	<?php } ?>

	/* SHOULD WE AUTOLOAD EVERYTHING FOR THE USER? */
	<?php
	if ($autoInit->get() ) { ?>
		Thenmap.init("thenmap");
	<?php } ?>
})();

<?php
/* Minify and send content */
if ( $debugMode->get() ) {
	echo('console.log("Running in debug mode");');
	echo("//".$debugMode->get());
	echo ob_get_clean();
} else {
	echo JShrink\Minifier::minify(ob_get_clean());
}
?>
